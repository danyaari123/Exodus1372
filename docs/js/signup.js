document.addEventListener("DOMContentLoaded", function () {
  if (typeof firebase === "undefined" || typeof auth === "undefined" || typeof db === "undefined") {
    console.error("signup.js: Firebase is not available.");
    return;
  }

  var signupForm = document.getElementById("signupForm");
  var displayNameInput = document.getElementById("displayName");
  var emailInput = document.getElementById("email");
  var passwordInput = document.getElementById("password");
  var confirmPasswordInput = document.getElementById("confirmPassword");
  var signupErrorMessage = document.getElementById("signupErrorMessage");

  if (!signupForm) {
    return;
  }

  signupForm.addEventListener("submit", function (event) {
    event.preventDefault();

    var username = displayNameInput.value.trim();
    var email = emailInput.value.trim();
    var password = passwordInput.value;
    var confirmPassword = confirmPasswordInput.value;

    if (signupErrorMessage) {
      signupErrorMessage.textContent = "";
      signupErrorMessage.className = "error-message";
    }

    if (!username) {
      signupErrorMessage.textContent = "Display Name is required.";
      return;
    }

    if (password !== confirmPassword) {
      signupErrorMessage.textContent = "Passwords do not match.";
      return;
    }

    if (password.length < 6) {
      signupErrorMessage.textContent = "Password must be at least 6 characters long.";
      return;
    }

    auth.createUserWithEmailAndPassword(email, password)
      .then(function (userCredential) {
        var userRef = db.ref("users").child(userCredential.user.uid);

        return userRef.set({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: username,
          role: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now()
        }).then(function () {
          return userRef.once("value");
        });
      })
      .then(function (snapshot) {
        if (!snapshot.exists()) {
          throw new Error("Your account was created, but the profile could not be saved to the database.");
        }

        signupForm.reset();
        if (signupErrorMessage) {
          signupErrorMessage.textContent = "User created successfully. You must now wait for an admin to approve you before you can access Exodus's calendar and messaging system.";
          signupErrorMessage.className = "reset-message success";
        }
        setTimeout(function () {
          auth.signOut().then(function () {
            window.location.href = "login.html";
          });
        }, 1500);
      })
      .catch(function (error) {
        console.error("signup.js: Signup failed.", error);
        if (signupErrorMessage) {
          signupErrorMessage.textContent = "Signup Error: " + error.message;
        }
      });
  });
});
