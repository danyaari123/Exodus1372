document.addEventListener("DOMContentLoaded", function () {
  if (typeof firebase === "undefined" || typeof auth === "undefined" || typeof db === "undefined") {
    console.error("auth.js: Firebase is not available.");
    return;
  }

  var loginForm = document.getElementById("loginForm");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var errorMessage = document.getElementById("errorMessage");
  var logoutBtn = document.getElementById("logoutBtn");
  var homeBtn = document.getElementById("homeBtn");
  var forgotPasswordLink = document.getElementById("forgotPasswordLink");
  var resetMessage = document.getElementById("resetMessage");
  var usersRef = db.ref("users");

  function nowTimestamp() {
    return Date.now();
  }

  function clearUserState() {
    localStorage.removeItem("exodusUserRole");
    localStorage.removeItem("exodusUserUID");
    localStorage.removeItem("userDisplayName");
  }

  function getDefaultUsername(user) {
    if (!user || !user.email) {
      return "member";
    }

    return user.email.split("@")[0];
  }

  function setUserState(profile) {
    localStorage.setItem("exodusUserRole", profile.role);
    localStorage.setItem("exodusUserUID", profile.uid);
    localStorage.setItem("userDisplayName", profile.username);
  }

  function buildFallbackProfile(user) {
    return {
      uid: user.uid,
      email: user.email,
      username: getDefaultUsername(user),
      role: "pending"
    };
  }

  function syncUserProfile(user) {
    if (!user) {
      clearUserState();
      return Promise.resolve(null);
    }

    var userRef = usersRef.child(user.uid);

    return userRef.once("value").then(function (snapshot) {
      var profile = snapshot.val() || {};
      var nextProfile = {
        uid: user.uid,
        email: user.email,
        username: profile.username || profile.displayName || getDefaultUsername(user),
        role: profile.role || "pending"
      };

      var writeData = {
        uid: user.uid,
        email: user.email,
        username: nextProfile.username,
        role: nextProfile.role,
        updatedAt: nowTimestamp()
      };

      if (!snapshot.exists()) {
        writeData.createdAt = nowTimestamp();
      }

      return userRef.update(writeData).then(function () {
        setUserState(nextProfile);
        return nextProfile;
      });
    }).catch(function (error) {
      var fallbackProfile = buildFallbackProfile(user);

      console.error("auth.js: Realtime Database profile sync failed.", error);
      setUserState(fallbackProfile);
      return fallbackProfile;
    });
  }

  function handleSignedInUser(user, currentPage) {
    return syncUserProfile(user).then(function (profile) {
      if (profile.role === "pending") {
        if (errorMessage) {
          errorMessage.textContent = "Your account is pending approval.";
        }

        window.dispatchEvent(new CustomEvent("exodusUserRoleUpdated", {
          detail: profile
        }));

        if (currentPage !== "login.html" && currentPage !== "signup.html") {
          auth.signOut().finally(function () {
            window.location.href = "login.html";
          });
        }

        return profile;
      }

      window.dispatchEvent(new CustomEvent("exodusUserRoleUpdated", {
        detail: profile
      }));

      if (currentPage === "login.html" || currentPage === "signup.html") {
        window.location.href = "index.html";
      }

      return profile;
    }).catch(function (error) {
      console.error("auth.js: Failed to load user profile.", error);
      if (errorMessage) {
        errorMessage.textContent = "Logged in, but profile sync failed. Basic access only.";
      }
      return buildFallbackProfile(user);
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (errorMessage) {
        errorMessage.textContent = "";
      }

      if (resetMessage) {
        resetMessage.textContent = "";
      }

      auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(function (error) {
          if (errorMessage) {
            errorMessage.textContent = "Login failed: " + error.message;
          }
        });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      auth.signOut().then(function () {
        clearUserState();
        window.location.href = "login.html";
      }).catch(function (error) {
        console.error("auth.js: Logout failed.", error);
      });
    });
  }

  if (homeBtn) {
    homeBtn.addEventListener("click", function () {
      window.location.href = "../homepage/index.html";
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", function (event) {
      event.preventDefault();

      if (!emailInput || !emailInput.value) {
        if (resetMessage) {
          resetMessage.textContent = "Enter your email first.";
          resetMessage.className = "reset-message error";
        }
        return;
      }

      if (errorMessage) {
        errorMessage.textContent = "";
      }

      if (resetMessage) {
        resetMessage.textContent = "Sending reset email...";
        resetMessage.className = "reset-message";
      }

      auth.sendPasswordResetEmail(emailInput.value).then(function () {
        if (resetMessage) {
          resetMessage.textContent = "Password reset email sent.";
          resetMessage.className = "reset-message success";
        }
      }).catch(function (error) {
        if (resetMessage) {
          resetMessage.textContent = "Error: " + error.message;
          resetMessage.className = "reset-message error";
        }
      });
    });
  }

  auth.onAuthStateChanged(function (user) {
    var currentPage = window.location.pathname.split("/").pop() || "index.html";

    if (!user) {
      clearUserState();
      window.dispatchEvent(new CustomEvent("exodusUserRoleUpdated", {
        detail: { role: null, uid: null, username: null, email: null }
      }));

      if (currentPage !== "login.html") {
        window.location.href = "login.html";
      }
      return;
    }

    handleSignedInUser(user, currentPage);
  });
});
