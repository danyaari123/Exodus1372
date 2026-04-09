const admin = require("firebase-admin");

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "./service-account.json";
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://exoduswebsite-e45a6-default-rtdb.firebaseio.com";
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const auth = admin.auth();
const db = admin.database();

function nowTimestamp() {
  return Date.now();
}

async function listAllUsers() {
  let nextPageToken;
  var users = [];

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    users = users.concat(result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(JSON.stringify(users.map(function (user) {
    return {
      uid: user.uid,
      email: user.email || null,
      disabled: user.disabled,
      createdAt: user.metadata.creationTime,
      lastSignInAt: user.metadata.lastSignInTime || null
    };
  }), null, 2));
}

async function deleteAllUsers() {
  let nextPageToken;
  var uids = [];

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    result.users.forEach(function (user) {
      uids.push(user.uid);
    });
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  if (!uids.length) {
    console.log("No users found.");
    return;
  }

  const result = await auth.deleteUsers(uids);
  console.log(JSON.stringify(result, null, 2));
}

async function createUser(email, password) {
  const userRecord = await auth.createUser({
    email: email,
    password: password
  });

  await syncUserToDatabase(userRecord, "pending");

  console.log(JSON.stringify(userRecord.toJSON(), null, 2));
}

async function updateUser(uid, email, password) {
  const updates = {};

  if (email) {
    updates.email = email;
  }

  if (password) {
    updates.password = password;
  }

  const userRecord = await auth.updateUser(uid, updates);

  if (email) {
    await db.ref("users/" + uid + "/email").set(email);
    await db.ref("users/" + uid + "/updatedAt").set(nowTimestamp());
  }

  console.log(JSON.stringify(userRecord.toJSON(), null, 2));
}

async function setUserRole(uid, role) {
  const snapshot = await db.ref("users/" + uid).once("value");
  const existing = snapshot.val() || {};

  await db.ref("users/" + uid).set({
    uid: existing.uid || uid,
    email: existing.email || "",
    username: existing.username || (existing.email ? existing.email.split("@")[0] : uid),
    role: role,
    createdAt: existing.createdAt || nowTimestamp(),
    updatedAt: nowTimestamp()
  });

  console.log(JSON.stringify({ uid: uid, role: role }, null, 2));
}

async function syncUserToDatabase(userRecord, role) {
  const snapshot = await db.ref("users/" + userRecord.uid).once("value");
  const existing = snapshot.val() || {};

  await db.ref("users/" + userRecord.uid).set({
    uid: userRecord.uid,
    email: userRecord.email || existing.email || "",
    username: existing.username || (userRecord.email ? userRecord.email.split("@")[0] : userRecord.uid),
    role: role || existing.role || "pending",
    createdAt: existing.createdAt || nowTimestamp(),
    updatedAt: nowTimestamp()
  });
}

async function syncUserByEmail(email, role) {
  const userRecord = await auth.getUserByEmail(email);
  await syncUserToDatabase(userRecord, role || "pending");
  console.log(JSON.stringify({ uid: userRecord.uid, email: email, role: role || "pending" }, null, 2));
}

async function syncAllUsers(role) {
  let nextPageToken;
  const targetRole = role || "pending";

  do {
    const result = await auth.listUsers(1000, nextPageToken);
    for (const userRecord of result.users) {
      await syncUserToDatabase(userRecord, targetRole);
    }
    nextPageToken = result.pageToken;
  } while (nextPageToken);

  console.log(JSON.stringify({ synced: true, role: targetRole }, null, 2));
}

async function deleteCollection(collectionName) {
  await db.ref(collectionName).remove();
  console.log("Deleted collection:", collectionName);
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case "list-users":
      await listAllUsers();
      break;

    case "delete-all-users":
      await deleteAllUsers();
      break;

    case "create-user":
      await createUser(process.argv[3], process.argv[4]);
      break;

    case "update-user":
      await updateUser(process.argv[3], process.argv[4], process.argv[5]);
      break;

    case "delete-collection":
      await deleteCollection(process.argv[3]);
      break;

    case "set-role":
      await setUserRole(process.argv[3], process.argv[4]);
      break;

    case "sync-user-by-email":
      await syncUserByEmail(process.argv[3], process.argv[4]);
      break;

    case "sync-all-users":
      await syncAllUsers(process.argv[3]);
      break;

    default:
      console.log("Commands:");
      console.log("  node scripts/firebase-admin-tools.js list-users");
      console.log("  node scripts/firebase-admin-tools.js delete-all-users");
      console.log("  node scripts/firebase-admin-tools.js create-user email@example.com password123");
      console.log("  node scripts/firebase-admin-tools.js update-user UID newemail@example.com newpassword123");
      console.log("  node scripts/firebase-admin-tools.js set-role UID admin");
      console.log("  node scripts/firebase-admin-tools.js sync-user-by-email user@example.com pending");
      console.log("  node scripts/firebase-admin-tools.js sync-all-users pending");
      console.log("  node scripts/firebase-admin-tools.js delete-collection messages");
      console.log("  node scripts/firebase-admin-tools.js delete-collection events");
      process.exitCode = 1;
  }
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});
