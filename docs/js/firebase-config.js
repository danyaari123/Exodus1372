const firebaseConfig = {
  apiKey: "AIzaSyAmC5fw5AmRuOey_C7tKdzWVUC0uUdbD5Y",
  authDomain: "exoduswebsite-e45a6.firebaseapp.com",
  projectId: "exoduswebsite-e45a6",
  databaseURL: "https://exoduswebsite-e45a6-default-rtdb.firebaseio.com",
  storageBucket: "exoduswebsite-e45a6.firebasestorage.app",
  messagingSenderId: "330793261224",
  appId: "1:330793261224:web:96e294b47e11eaff190a9d"
};

if (typeof firebase === "undefined") {
  throw new Error("Firebase SDK scripts are missing. Load firebase-app.js before firebase-config.js.");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

var auth = firebase.auth();
var db = firebase.database();

window.firebaseConfig = firebaseConfig;
window.auth = auth;
window.db = db;
