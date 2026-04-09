const admin = require("firebase-admin");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://exoduswebsite-e45a6-default-rtdb.firebaseio.com";
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

function nowTimestamp() {
  return Date.now();
}

async function createDatabaseUser(uid, email, username) {
  if (!uid || !email || !username) {
    throw new Error("Usage: node scripts/create-db-user.js UID email@example.com username");
  }

  const userRef = admin.database().ref("users/" + uid);
  const existingSnapshot = await userRef.once("value");
  const existing = existingSnapshot.val() || {};

  const payload = {
    uid: uid,
    email: email,
    username: username,
    role: existing.role || "pending",
    createdAt: existing.createdAt || nowTimestamp(),
    updatedAt: nowTimestamp()
  };

  await userRef.set(payload);
  console.log(JSON.stringify(payload, null, 2));
}

createDatabaseUser(process.argv[2], process.argv[3], process.argv[4]).catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
