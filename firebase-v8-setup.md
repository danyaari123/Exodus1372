# Firebase v8 Static Site Setup

This project now uses `Firebase Authentication + Realtime Database`, not Firestore.

## File structure

```text
docs/
  index.html
  login.html
  signup.html
  js/
    firebase-config.js
    firebase-examples.js
    auth.js
    signup.js
    calendar.js
scripts/
  firebase-admin-tools.js
firestore.rules.dev
firestore.rules
```

`firestore.rules.dev` and `firestore.rules` now contain Realtime Database rules JSON for easy copy/paste.

## Required CDN scripts

```html
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>

<script src="js/firebase-config.js"></script>
<script src="js/firebase-examples.js"></script>
```

## Initialization code

[firebase-config.js](c:\Users\User\Desktop\Exodus-main (1)\Exodus-main\Exodus\docs\js\firebase-config.js) now uses:

```js
var auth = firebase.auth();
var db = firebase.database();
```

If your Realtime Database URL in Firebase Console is different, update `databaseURL` in that file.

## Realtime Database structure

### `/users/{uid}`

```js
{
  uid: "abc123",
  email: "user@example.com",
  username: "mikey",
  role: "member",
  createdAt: 1710000000000,
  updatedAt: 1710000000000
}
```

### `/messages/{messageId}`

```js
{
  id: "-Oabc123",
  text: "Hello world",
  ownerId: "abc123",
  ownerEmail: "user@example.com",
  ownerUsername: "mikey",
  createdAt: 1710000000000
}
```

### `/events/{eventId}`

```js
{
  id: "-Oevent123",
  title: "Chapter Kickoff",
  description: "Bring your friends",
  date: "2026-05-10",
  startTime: "18:30",
  endTime: "20:00",
  location: "JCC",
  ownerId: "abc123",
  ownerEmail: "user@example.com",
  createdAt: 1710000000000,
  updatedAt: 1710000000000
}
```

## Firebase Console checklist

1. Create the Firebase project.
2. Add a Web App and use the config from [firebase-config.js](c:\Users\User\Desktop\Exodus-main (1)\Exodus-main\Exodus\docs\js\firebase-config.js).
3. Enable `Authentication > Sign-in method > Email/Password`.
4. Create `Realtime Database`.
5. In `Realtime Database > Rules`, paste either:
   `firestore.rules.dev` for open testing
   or `firestore.rules` for the secured version.
6. In `Authentication > Settings > Authorized domains`, add your GitHub Pages domain.

## Rules

Open dev rules for `Realtime Database > Rules`:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Secure rules for `Realtime Database > Rules`:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (auth.uid === $uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".validate": "newData.hasChildren(['uid', 'email', 'username', 'role']) && newData.child('uid').val() === $uid && newData.child('email').isString() && newData.child('username').isString() && ((root.child('users').child(auth.uid).child('role').val() === 'admin' && (newData.child('role').val() === 'member' || newData.child('role').val() === 'admin')) || (root.child('users').child(auth.uid).child('role').val() !== 'admin' && (((!data.exists()) && newData.child('role').val() === 'member') || (data.exists() && newData.child('role').val() === data.child('role').val()))))"
      }
    },
    "messages": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "events": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    }
  }
}
```

## Admin SDK script

Script path: [firebase-admin-tools.js](c:\Users\User\Desktop\Exodus-main (1)\Exodus-main\Exodus\scripts\firebase-admin-tools.js)

### Install

```powershell
npm install firebase-admin
```

### Set credentials

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\full\path\to\service-account.json"
$env:FIREBASE_DATABASE_URL="https://exoduswebsite-e45a6-default-rtdb.firebaseio.com"
```

### Commands

```powershell
node scripts/firebase-admin-tools.js list-users
node scripts/firebase-admin-tools.js create-user user@example.com password123
node scripts/firebase-admin-tools.js update-user USER_UID newemail@example.com newpassword123
node scripts/firebase-admin-tools.js set-role USER_UID admin
node scripts/firebase-admin-tools.js delete-collection messages
node scripts/firebase-admin-tools.js delete-collection events
node scripts/firebase-admin-tools.js delete-all-users
```

## Common mistakes

1. Creating `Firestore` instead of `Realtime Database`.
2. Forgetting to load `firebase-database.js`.
3. Leaving out `databaseURL` in `firebase-config.js`.
4. Pasting Realtime Database JSON rules into the Firestore rules screen, or vice versa.
5. Forgetting to add your GitHub Pages domain to authorized domains.
6. Creating an Auth user but never adding `/users/{uid}` or setting their `role`.
