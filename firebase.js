import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update,
  push,
  remove,
  set,
  get
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

function dbRef(path) {
  return ref(db, path);
}

export function subscribe(path, onData, onError) {
  return onValue(dbRef(path), onData, onError);
}

export function add(path, payload) {
  return push(dbRef(path), payload);
}

export function addMany(path, payloads) {
  const parent = dbRef(path);
  const updates = {};
  payloads.forEach((payload) => {
    const itemRef = push(parent);
    updates[itemRef.key] = payload;
  });
  return update(parent, updates);
}

export function patch(path, payload) {
  return update(dbRef(path), payload);
}

export function write(path, payload) {
  return set(dbRef(path), payload);
}

export function del(path) {
  return remove(dbRef(path));
}

export async function read(path) {
  const snap = await get(dbRef(path));
  return snap.val();
}

export async function ensurePackingData({ defaultItems, familyIds }) {
  const newItems = await read("packing/items");
  if (newItems && Object.keys(newItems).length) {
    return;
  }

  const legacyItems = (await read("items")) || {};
  const legacyChecks = (await read("checks")) || {};

  if (Object.keys(legacyItems).length) {
    await write("packing/items", Object.fromEntries(
      Object.entries(legacyItems).map(([id, item]) => [id, {
        name: item.name || "",
        category: item.cat || item.category || "Other",
        qty: item.qty || "",
        note: item.note || "",
        updatedAt: Date.now()
      }])
    ));

    const migratedChecks = {};
    Object.keys(legacyChecks).forEach((compound) => {
      const [itemId, familyIndexRaw] = compound.split("_");
      const familyIndex = Number(familyIndexRaw);
      const familyId = familyIds[familyIndex];
      if (!familyId) return;
      if (!migratedChecks[itemId]) migratedChecks[itemId] = {};
      migratedChecks[itemId][familyId] = !!legacyChecks[compound];
    });
    await write("packing/checks", migratedChecks);
    return;
  }

  for (const item of defaultItems) {
    await add("packing/items", { ...item, updatedAt: Date.now() });
  }
}
