var usersRef = db.ref("users");
var messagesRef = db.ref("messages");
var eventsRef = db.ref("events");

function getCurrentUserOrThrow() {
  var user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user.");
  }
  return user;
}

function nowTimestamp() {
  return Date.now();
}

function signUpUser(email, password, username) {
  return auth.createUserWithEmailAndPassword(email, password).then(function (userCredential) {
    var user = userCredential.user;

    return usersRef.child(user.uid).set({
      uid: user.uid,
      email: user.email,
      username: username || "",
      role: "pending",
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp()
    }).then(function () {
      return userCredential;
    });
  });
}

function loginUser(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

function logoutUser() {
  return auth.signOut();
}

function saveCurrentUserProfile(profileData) {
  var user = getCurrentUserOrThrow();

  return usersRef.child(user.uid).update({
    uid: user.uid,
    email: user.email,
    username: profileData.username || "",
    firstName: profileData.firstName || "",
    lastName: profileData.lastName || "",
    bio: profileData.bio || "",
    updatedAt: nowTimestamp()
  });
}

function createMessage(text) {
  var user = getCurrentUserOrThrow();
  var newRef = messagesRef.push();

  return newRef.set({
    id: newRef.key,
    text: text,
    ownerId: user.uid,
    ownerEmail: user.email,
    createdAt: nowTimestamp()
  });
}

function readMessages(callback) {
  var query = messagesRef.orderByChild("createdAt").limitToLast(50);
  var listener = query.on("value", function (snapshot) {
    var raw = snapshot.val() || {};
    var messages = Object.keys(raw).map(function (key) {
      return {
        id: key,
        data: raw[key]
      };
    }).sort(function (a, b) {
      return (b.data.createdAt || 0) - (a.data.createdAt || 0);
    });

    callback(messages);
  });

  return function () {
    query.off("value", listener);
  };
}

function deleteMessage(messageId) {
  return messagesRef.child(messageId).remove();
}

function createEvent(eventData) {
  var user = getCurrentUserOrThrow();
  var newRef = eventsRef.push();

  return newRef.set({
    id: newRef.key,
    title: eventData.title,
    description: eventData.description || "",
    date: eventData.date,
    startTime: eventData.startTime || "",
    endTime: eventData.endTime || "",
    location: eventData.location || "",
    ownerId: user.uid,
    ownerEmail: user.email,
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp()
  });
}

function readEvents(callback) {
  var query = eventsRef.orderByChild("date");
  var listener = query.on("value", function (snapshot) {
    var raw = snapshot.val() || {};
    var events = Object.keys(raw).map(function (key) {
      return {
        id: key,
        data: raw[key]
      };
    }).sort(function (a, b) {
      if ((a.data.date || "") === (b.data.date || "")) {
        return (a.data.startTime || "").localeCompare(b.data.startTime || "");
      }
      return (a.data.date || "").localeCompare(b.data.date || "");
    });

    callback(events);
  });

  return function () {
    query.off("value", listener);
  };
}

function deleteEvent(eventId) {
  return eventsRef.child(eventId).remove();
}

function deleteAllDocumentsInCollection(collectionName) {
  return db.ref(collectionName).remove();
}

function updateCurrentUserEmail(newEmail) {
  var user = getCurrentUserOrThrow();

  return user.updateEmail(newEmail).then(function () {
    return usersRef.child(user.uid).update({
      email: newEmail,
      updatedAt: nowTimestamp()
    });
  });
}

function updateCurrentUserPassword(newPassword) {
  var user = getCurrentUserOrThrow();
  return user.updatePassword(newPassword);
}

function updateCurrentUserProfileFields(fields) {
  var user = getCurrentUserOrThrow();
  fields.updatedAt = nowTimestamp();
  return usersRef.child(user.uid).update(fields);
}

window.exodusFirebase = {
  signUpUser: signUpUser,
  loginUser: loginUser,
  logoutUser: logoutUser,
  saveCurrentUserProfile: saveCurrentUserProfile,
  createMessage: createMessage,
  readMessages: readMessages,
  deleteMessage: deleteMessage,
  createEvent: createEvent,
  readEvents: readEvents,
  deleteEvent: deleteEvent,
  deleteAllDocumentsInCollection: deleteAllDocumentsInCollection,
  updateCurrentUserEmail: updateCurrentUserEmail,
  updateCurrentUserPassword: updateCurrentUserPassword,
  updateCurrentUserProfileFields: updateCurrentUserProfileFields
};
