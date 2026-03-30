import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCIAUEznNiDHESrV1Qfe3XR9_80nzMeLrM",
  authDomain: "camping-41fde.firebaseapp.com",
  databaseURL: "https://camping-41fde-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "camping-41fde",
  storageBucket: "camping-41fde.firebasestorage.app",
  messagingSenderId: "716912113485",
  appId: "1:716912113485:web:030e1ad8a80975b6c3e904"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const itemsRef = ref(db, "items");
const checksRef = ref(db, "checks");

export function subscribeToItems(onData, onError) {
  return onValue(itemsRef, onData, onError);
}

export function subscribeToChecks(onData, onError) {
  return onValue(checksRef, onData, onError);
}

export function addItemToDb(item) {
  return push(itemsRef, item);
}

export function updateItemInDb(itemId, item) {
  return update(ref(db, `items/${itemId}`), item);
}

export function toggleFamilyCheck(itemId, familyIndex, currentValue) {
  const key = `${itemId}_${familyIndex}`;
  return update(checksRef, { [key]: !currentValue });
}

export function deleteItemFromDb(itemId, familyCount) {
  remove(ref(db, `items/${itemId}`));
  const checkReset = {};
  for (let fi = 0; fi < familyCount; fi += 1) {
    checkReset[`${itemId}_${fi}`] = null;
  }
  return update(checksRef, checkReset);
}

export function seedDefaultItems(defaultItems) {
  defaultItems.forEach((item) => push(itemsRef, item));
}
