const admin = require("firebase-admin");

const serviceAccount = require("./path/to/your-service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://exoduswebsite-e45a6-default-rtdb.firebaseio.com"
});

const userEmailToMakeAdmin = "dandan.yaari6@gmail.com"; // << YOUR ADMIN EMAIL

admin.auth().getUserByEmail(userEmailToMakeAdmin)
  .then((userRecord) => {
    console.log(`Successfully fetched user data: ${userRecord.toJSON()}`);
    return admin.database().ref("users/" + userRecord.uid).once("value").then((snapshot) => {
      const existing = snapshot.val() || {};

      return admin.database().ref("users/" + userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email || userEmailToMakeAdmin,
        username: existing.username || (userRecord.email ? userRecord.email.split("@")[0] : userRecord.uid),
        role: "admin",
        createdAt: existing.createdAt || Date.now(),
        updatedAt: Date.now()
      });
    });
  })
  .then(() => {
    console.log(`Successfully set Realtime Database role 'admin' for user ${userEmailToMakeAdmin}.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting custom claim:', error);
    process.exit(1);
  });
