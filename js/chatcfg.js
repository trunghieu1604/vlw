// Firebase Realtime Database config for online world chat
window.CHAT_CFG = {
  firebaseUrl: "https://vl-chat-2f4d0-default-rtdb.asia-southeast1.firebasedatabase.app",
  server: "",
  off: false,
  prod: true,
  local: false,
  sso: "",
  e9home: "",
  build: "20261014163000",
  mapBase: "",
  label: ""
};

window.getFirebaseDb = function() {
  if (typeof firebase === "undefined" || !window.CHAT_CFG || !CHAT_CFG.firebaseUrl) return null;
  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp({ databaseURL: CHAT_CFG.firebaseUrl });
    }
    return firebase.database();
  } catch (e) {
    console.warn("getFirebaseDb err:", e);
    return null;
  }
};
