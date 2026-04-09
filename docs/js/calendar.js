function formatTime12Hour(timeString24) {
  if (!timeString24 || typeof timeString24 !== "string" || !timeString24.includes(":")) {
    return "";
  }

  var parts = timeString24.split(":");
  var hours24 = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);

  if (isNaN(hours24) || isNaN(minutes)) {
    return timeString24;
  }

  var ampm = hours24 >= 12 ? "PM" : "AM";
  var hours12 = hours24 % 12;
  hours12 = hours12 || 12;

  return hours12 + ":" + String(minutes).padStart(2, "0") + " " + ampm;
}

document.addEventListener("DOMContentLoaded", function () {
  if (typeof firebase === "undefined" || typeof db === "undefined" || typeof auth === "undefined") {
    console.error("calendar.js: Firebase is not available.");
    return;
  }

  function getElem(id) {
    return document.getElementById(id);
  }

  var monthYearDisplay = getElem("monthYearDisplay");
  var calendarGrid = getElem("calendarGrid");
  var prevMonthBtn = getElem("prevMonthBtn");
  var nextMonthBtn = getElem("nextMonthBtn");
  var addEventBtn = getElem("addEventBtn");
  var eventModal = getElem("eventModal");
  var eventForm = getElem("eventForm");
  var eventModalTitle = getElem("eventModalTitle");
  var eventIdInput = getElem("eventId");
  var eventDateInput = getElem("eventDate");
  var eventTitleInput = getElem("eventTitle");
  var startTimeInput = getElem("startTime");
  var endTimeInput = getElem("endTime");
  var locationInput = getElem("location");
  var descriptionInput = getElem("description");
  var deleteEventBtn = getElem("deleteEventBtn");
  var saveEventBtn = getElem("saveEventBtn");
  var closeModalBtn = eventModal ? eventModal.querySelector(".close-btn") : null;

  var messagesList = getElem("messagesList");
  var messageForm = getElem("messageForm");
  var messageInput = getElem("messageInput");

  var adminPanel = getElem("adminPanel");
  var usersList = getElem("usersList");
  var adminStatus = getElem("adminStatus");

  var eventsRef = db.ref("events");
  var messagesRef = db.ref("messages");
  var usersRef = db.ref("users");

  var currentDate = new Date();
  var currentMonthEvents = [];
  var currentMonthHolidays = [];
  var currentUserProfile = null;
  var eventsQuery = null;
  var messagesQuery = null;
  var usersQuery = null;

  function nowTimestamp() {
    return Date.now();
  }

  function isAdmin() {
    return !!currentUserProfile && currentUserProfile.role === "admin";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function snapshotToArray(snapshot) {
    var raw = snapshot.val() || {};
    return Object.keys(raw).map(function (key) {
      return Object.assign({ id: key }, raw[key]);
    });
  }

  function clearRealtimeListeners() {
    if (eventsQuery) {
      eventsQuery.off();
      eventsQuery = null;
    }
    if (messagesQuery) {
      messagesQuery.off();
      messagesQuery = null;
    }
    if (usersQuery) {
      usersQuery.off();
      usersQuery = null;
    }
  }

  function showLoggedOutState() {
    clearRealtimeListeners();

    if (calendarGrid) {
      calendarGrid.innerHTML = "<p style='text-align:center;'>Please log in to view events.</p>";
    }
    if (messagesList) {
      messagesList.innerHTML = "<p style='text-align:center;'>Please log in to view messages.</p>";
    }
    if (usersList) {
      usersList.innerHTML = "<p style='text-align:center;'>Admin access required.</p>";
    }
    if (adminPanel) {
      adminPanel.style.display = "none";
    }
    if (addEventBtn) {
      addEventBtn.style.display = "none";
    }
    if (messageForm) {
      messageForm.style.display = "none";
    }
  }

  function initializeUIForRole() {
    if (addEventBtn) {
      addEventBtn.style.display = isAdmin() ? "inline-block" : "none";
    }

    if (messageForm) {
      messageForm.style.display = isAdmin() ? "block" : "none";
    }

    if (adminPanel) {
      adminPanel.style.display = isAdmin() ? "block" : "none";
    }

    if (adminStatus) {
      adminStatus.textContent = isAdmin()
        ? "You are signed in as an admin."
        : "Only admins can manage users, messages, and events.";
    }
  }

  function fetchJewishHolidays(year, month) {
    var hebcalMonth = month + 1;
    var url = "https://www.hebcal.com/hebcal?v=1&cfg=json&maj=on&year=" + year + "&month=" + hebcalMonth + "&lg=s";

    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("Hebcal request failed: " + response.status);
      }

      return response.json();
    }).then(function (data) {
      currentMonthHolidays = data && data.items ? data.items.map(function (item) {
        return {
          date: item.date,
          name: item.title
        };
      }) : [];
      renderCalendar(currentDate);
    }).catch(function () {
      currentMonthHolidays = [];
      renderCalendar(currentDate);
    });
  }

  function fetchAndListenForEvents(year, month) {
    if (!auth.currentUser) {
      showLoggedOutState();
      return;
    }

    if (eventsQuery) {
      eventsQuery.off();
    }

    var monthPadded = String(month + 1).padStart(2, "0");
    var firstDayOfMonthStr = year + "-" + monthPadded + "-01";
    var lastDayOfMonthStr = year + "-" + monthPadded + "-" + String(new Date(year, month + 1, 0).getDate()).padStart(2, "0");

    eventsQuery = eventsRef.orderByChild("date").startAt(firstDayOfMonthStr).endAt(lastDayOfMonthStr);
    eventsQuery.on("value", function (snapshot) {
      currentMonthEvents = snapshotToArray(snapshot).sort(function (a, b) {
        if ((a.date || "") === (b.date || "")) {
          return (a.startTime || "00:00").localeCompare(b.startTime || "00:00");
        }
        return (a.date || "").localeCompare(b.date || "");
      });
      renderCalendar(currentDate);
    }, function (error) {
      console.error("calendar.js: Failed to load events.", error);
      if (calendarGrid) {
        calendarGrid.innerHTML = "<p style='color:red;text-align:center;'>Error loading events.</p>";
      }
    });
  }

  function renderCalendar(dateToRender) {
    if (!calendarGrid || !monthYearDisplay) {
      return;
    }

    calendarGrid.innerHTML = "";

    var year = dateToRender.getFullYear();
    var month = dateToRender.getMonth();
    var todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    monthYearDisplay.textContent = dateToRender.toLocaleString("default", {
      month: "long",
      year: "numeric"
    });

    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(function (dayName) {
      var headerEl = document.createElement("div");
      headerEl.className = "calendar-day-header";
      headerEl.textContent = dayName;
      calendarGrid.appendChild(headerEl);
    });

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < firstDay; i += 1) {
      var emptyCell = document.createElement("div");
      emptyCell.className = "calendar-day other-month";
      calendarGrid.appendChild(emptyCell);
    }

    for (var day = 1; day <= daysInMonth; day += 1) {
      createDayCell(year, month, day, todayObj);
    }
  }

  function createDayCell(year, month, day, todayObj) {
    var dayCell = document.createElement("div");
    dayCell.className = "calendar-day";

    var dayDate = new Date(year, month, day);
    dayDate.setHours(0, 0, 0, 0);

    if (dayDate.getTime() === todayObj.getTime()) {
      dayCell.classList.add("current-day");
    }

    var dayNumberEl = document.createElement("span");
    dayNumberEl.className = "day-number";
    dayNumberEl.textContent = day;
    dayCell.appendChild(dayNumberEl);

    var cellDateStr = year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    var holidays = currentMonthHolidays.filter(function (holiday) {
      return holiday.date === cellDateStr;
    });
    var dayEvents = currentMonthEvents.filter(function (event) {
      return event.date === cellDateStr;
    });

    holidays.forEach(function (holiday) {
      var holidayEl = document.createElement("div");
      holidayEl.className = "holiday-name";
      holidayEl.textContent = holiday.name;
      dayCell.appendChild(holidayEl);
    });

    var eventListEl = document.createElement("div");
    eventListEl.className = "event-list";

    dayEvents.forEach(function (event) {
      var eventEl = document.createElement("div");
      var timeLabel = formatTime12Hour(event.startTime || "");
      if (event.endTime) {
        timeLabel += " - " + formatTime12Hour(event.endTime);
      }

      eventEl.className = "event-item";
      eventEl.innerHTML = "<span class='event-time'>" + escapeHtml(timeLabel) + "</span><span class='event-title'>" + escapeHtml(event.title || event.description || "Event") + "</span>";
      eventEl.addEventListener("click", function (clickEvent) {
        clickEvent.stopPropagation();
        openEventModal(event);
      });
      eventListEl.appendChild(eventEl);
    });

    dayCell.appendChild(eventListEl);

    if (isAdmin()) {
      dayCell.classList.add("uploader-clickable");
      dayCell.addEventListener("click", function (clickEvent) {
        if (clickEvent.target === dayCell || clickEvent.target === dayNumberEl) {
          openEventModal(null, cellDateStr);
        }
      });
    }

    calendarGrid.appendChild(dayCell);
  }

  function openEventModal(event, defaultDate) {
    if (!eventModal || !eventForm) {
      return;
    }

    var editable = isAdmin();
    eventForm.reset();
    eventIdInput.value = "";

    if (event) {
      eventModalTitle.textContent = editable ? "Edit Event" : "View Event";
      eventIdInput.value = event.id || "";
      eventDateInput.value = event.date || "";
      eventTitleInput.value = event.title || "";
      startTimeInput.value = event.startTime || "";
      endTimeInput.value = event.endTime || "";
      locationInput.value = event.location || "";
      descriptionInput.value = event.description || "";
    } else {
      eventModalTitle.textContent = "Add Event";
      eventDateInput.value = defaultDate || "";
      eventTitleInput.value = "";
      startTimeInput.value = "";
      endTimeInput.value = "";
      locationInput.value = "";
      descriptionInput.value = "";
    }

    eventDateInput.disabled = !editable;
    eventTitleInput.disabled = !editable;
    startTimeInput.disabled = !editable;
    endTimeInput.disabled = !editable;
    locationInput.disabled = !editable;
    descriptionInput.disabled = !editable;
    saveEventBtn.style.display = editable ? "inline-block" : "none";
    deleteEventBtn.style.display = editable && !!event ? "inline-block" : "none";
    eventModal.style.display = "block";
  }

  function closeEventModal() {
    if (eventModal) {
      eventModal.style.display = "none";
    }
  }

  function saveEvent(event) {
    event.preventDefault();

    if (!isAdmin()) {
      return;
    }

    var payload = {
      title: eventTitleInput.value.trim(),
      description: descriptionInput.value.trim(),
      date: eventDateInput.value,
      startTime: startTimeInput.value,
      endTime: endTimeInput.value || "",
      location: locationInput.value.trim(),
      ownerId: auth.currentUser.uid,
      ownerEmail: auth.currentUser.email,
      updatedAt: nowTimestamp()
    };

    if (!payload.title || !payload.date || !payload.startTime) {
      alert("Title, date, and start time are required.");
      return;
    }

    var currentEventId = eventIdInput.value;

    if (currentEventId) {
      eventsRef.child(currentEventId).update(payload).then(closeEventModal);
      return;
    }

    var newRef = eventsRef.push();
    payload.id = newRef.key;
    payload.createdAt = nowTimestamp();
    newRef.set(payload).then(closeEventModal);
  }

  function deleteCurrentEvent() {
    if (!isAdmin()) {
      return;
    }

    var currentEventId = eventIdInput.value;
    if (!currentEventId) {
      return;
    }

    if (!window.confirm("Delete this event?")) {
      return;
    }

    eventsRef.child(currentEventId).remove().then(closeEventModal);
  }

  function renderMessages(messages) {
    if (!messagesList) {
      return;
    }

    if (!messages.length) {
      messagesList.innerHTML = "<p>No messages yet.</p>";
      return;
    }

    messagesList.innerHTML = "";

    messages.forEach(function (message) {
      var item = document.createElement("div");
      item.className = "announcement-item";
      var timestamp = message.createdAt ? new Date(message.createdAt).toLocaleString() : "Just now";
      var deleteButtonHtml = isAdmin()
        ? "<button type='button' class='delete-message-btn' data-message-id='" + escapeHtml(message.id) + "'>Delete</button>"
        : "";

      item.innerHTML =
        "<div class='announcement-author'>" + escapeHtml(message.ownerUsername || message.ownerEmail || "User") + "</div>" +
        "<div class='announcement-timestamp'>" + escapeHtml(timestamp) + "</div>" +
        "<div class='announcement-message'>" + escapeHtml(message.text).replace(/\n/g, "<br>") + "</div>" +
        deleteButtonHtml;

      messagesList.appendChild(item);
    });

    if (isAdmin()) {
      var deleteButtons = messagesList.querySelectorAll(".delete-message-btn");
      Array.prototype.forEach.call(deleteButtons, function (button) {
        button.addEventListener("click", function () {
          var messageId = button.getAttribute("data-message-id");
          messagesRef.child(messageId).remove();
        });
      });
    }
  }

  function fetchAndListenForMessages() {
    if (!auth.currentUser) {
      showLoggedOutState();
      return;
    }

    if (messagesQuery) {
      messagesQuery.off();
    }

    messagesQuery = messagesRef.orderByChild("createdAt").limitToLast(30);
    messagesQuery.on("value", function (snapshot) {
      var messages = snapshotToArray(snapshot).sort(function (a, b) {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      renderMessages(messages);
    }, function (error) {
      console.error("calendar.js: Failed to load messages.", error);
      if (messagesList) {
        messagesList.innerHTML = "<p style='color:red;'>Error loading messages.</p>";
      }
    });
  }

  function postMessage() {
    if (!isAdmin()) {
      return;
    }

    var text = messageInput.value.trim();
    if (!text) {
      return;
    }

    var newRef = messagesRef.push();
    newRef.set({
      id: newRef.key,
      text: text,
      ownerId: auth.currentUser.uid,
      ownerEmail: auth.currentUser.email,
      ownerUsername: currentUserProfile ? currentUserProfile.username : "",
      createdAt: nowTimestamp()
    }).then(function () {
      messageInput.value = "";
    });
  }

  function renderUsers(users) {
    if (!usersList) {
      return;
    }

    if (!isAdmin()) {
      usersList.innerHTML = "<p style='text-align:center;'>Admin access required.</p>";
      return;
    }

    if (!users.length) {
      usersList.innerHTML = "<p>No users found.</p>";
      return;
    }

    usersList.innerHTML = "";

    users.forEach(function (userProfile) {
      var item = document.createElement("div");
      item.className = "announcement-item";
      item.innerHTML =
        "<div class='announcement-author'>" + escapeHtml(userProfile.username || userProfile.email || userProfile.uid) + "</div>" +
        "<div class='announcement-timestamp'>" + escapeHtml(userProfile.email || "") + "</div>" +
        "<div class='announcement-message'>Role: " + escapeHtml(userProfile.role || "member") + "</div>" +
        "<button type='button' class='toggle-admin-btn' data-user-id='" + escapeHtml(userProfile.uid) + "' data-next-role='" + escapeHtml(userProfile.role === "admin" ? "member" : "admin") + "'>" +
        (userProfile.role === "admin" ? "Remove Admin" : "Make Admin") +
        "</button>";
      usersList.appendChild(item);
    });

    var buttons = usersList.querySelectorAll(".toggle-admin-btn");
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener("click", function () {
        var userId = button.getAttribute("data-user-id");
        var nextRole = button.getAttribute("data-next-role");

        usersRef.child(userId).once("value").then(function (snapshot) {
          var currentUser = snapshot.val() || {};
          return usersRef.child(userId).update({
            uid: currentUser.uid || userId,
            email: currentUser.email || "",
            username: currentUser.username || (currentUser.email ? currentUser.email.split("@")[0] : userId),
            role: nextRole,
            updatedAt: nowTimestamp()
          });
        }).then(function () {
          if (adminStatus) {
            adminStatus.textContent = "Updated role for user " + userId + " to " + nextRole + ".";
          }
        }).catch(function (error) {
          console.error("calendar.js: Failed to update user role.", error);
          if (adminStatus) {
            adminStatus.textContent = "Failed to update role: " + error.message;
          }
        });
      });
    });
  }

  function fetchAndListenForUsers() {
    if (!isAdmin()) {
      if (usersQuery) {
        usersQuery.off();
        usersQuery = null;
      }
      renderUsers([]);
      return;
    }

    if (usersQuery) {
      usersQuery.off();
    }

    usersQuery = usersRef.orderByChild("email");
    usersQuery.on("value", function (snapshot) {
      var users = snapshotToArray(snapshot).sort(function (a, b) {
        return (a.email || "").localeCompare(b.email || "");
      });
      renderUsers(users);
    }, function (error) {
      console.error("calendar.js: Failed to load users.", error);
      if (usersList) {
        usersList.innerHTML = "<p style='color:red;'>Error loading users.</p>";
      }
    });
  }

  function refreshData() {
    if (!auth.currentUser) {
      showLoggedOutState();
      return;
    }

    initializeUIForRole();
    fetchAndListenForEvents(currentDate.getFullYear(), currentDate.getMonth());
    fetchAndListenForMessages();
    fetchAndListenForUsers();
    fetchJewishHolidays(currentDate.getFullYear(), currentDate.getMonth());
  }

  window.addEventListener("exodusUserRoleUpdated", function (event) {
    currentUserProfile = event.detail;
    refreshData();
  });

  if (eventForm) {
    eventForm.addEventListener("submit", saveEvent);
  }

  if (deleteEventBtn) {
    deleteEventBtn.addEventListener("click", deleteCurrentEvent);
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeEventModal);
  }

  window.addEventListener("click", function (event) {
    if (event.target === eventModal) {
      closeEventModal();
    }
  });

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", function () {
      currentDate.setMonth(currentDate.getMonth() - 1);
      fetchAndListenForEvents(currentDate.getFullYear(), currentDate.getMonth());
      fetchJewishHolidays(currentDate.getFullYear(), currentDate.getMonth());
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", function () {
      currentDate.setMonth(currentDate.getMonth() + 1);
      fetchAndListenForEvents(currentDate.getFullYear(), currentDate.getMonth());
      fetchJewishHolidays(currentDate.getFullYear(), currentDate.getMonth());
    });
  }

  if (addEventBtn) {
    addEventBtn.addEventListener("click", function () {
      if (!isAdmin()) {
        return;
      }

      var now = new Date();
      var defaultDate = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
      openEventModal(null, defaultDate);
    });
  }

  if (messageForm) {
    messageForm.addEventListener("submit", function (event) {
      event.preventDefault();
      postMessage();
    });
  }

  if (auth.currentUser) {
    usersRef.child(auth.currentUser.uid).once("value").then(function (snapshot) {
      currentUserProfile = snapshot.val();
      refreshData();
    }).catch(function () {
      currentUserProfile = null;
      refreshData();
    });
  } else {
    showLoggedOutState();
  }
});
