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

async function createAuthAndDatabaseUser(email, password, username) {
  if (!email || !password || !username) {
    throw new Error("Usage: node scripts/create-auth-and-db-user.js email@example.com Password123 username");
  }

  const userRecord = await admin.auth().createUser({
    email: email,
    password: password
  });

  const payload = {
    uid: userRecord.uid,
    email: email,
    username: username,
    role: "pending",
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp()
  };

  await admin.database().ref("users/" + userRecord.uid).set(payload);

  console.log(JSON.stringify({
    uid: userRecord.uid,
    email: email,
    username: username,
    role: "pending"
  }, null, 2));
}

createAuthAndDatabaseUser(process.argv[2], process.argv[3], process.argv[4]).catch(function (error) {
  console.error(error.message || error);
  process.exit(1);
});
