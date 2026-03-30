import {
  subscribeToItems,
  subscribeToChecks,
  addItemToDb,
  updateItemInDb,
  toggleFamilyCheck,
  deleteItemFromDb,
  seedDefaultItems
} from "./firebase.js";

const FAMILIES = ["KK VASU", "SRIDHAR VAISHU", "VEERA DURGA"];
const FAMILY_SHORT = ["KK", "SR", "VR"];
const FAMILY_COLORS = ["#2E7D32", "#1565C0", "#6A1B9A"];
const FAMILY_BG = ["#E8F5E9", "#E3F2FD", "#F3E5F5"];
const CAT_ICONS = {"Food":"🥗","Kitchen":"🍳","Kids":"🧸","Health":"💊","Clothing":"👕","Hygiene":"🧴","Camping Gear":"⛺","Sleeping":"🛏️","Furniture":"🪑","Electronics":"🔌"};

const DEFAULT_ITEMS = [
  {cat:"Food",name:"Curd",qty:"3",note:""},{cat:"Food",name:"Milk",qty:"",note:""},{cat:"Food",name:"Water",qty:"5 litres",note:""},{cat:"Food",name:"Eggs",qty:"30 + 10",note:""},{cat:"Food",name:"Mushroom",qty:"",note:""},{cat:"Food",name:"Nutella",qty:"",note:""},{cat:"Food",name:"Pindakaas",qty:"",note:""},{cat:"Food",name:"Kids curd",qty:"",note:""},{cat:"Food",name:"Bread",qty:"3",note:""},{cat:"Food",name:"Onion",qty:"",note:""},{cat:"Food",name:"Rice",qty:"3 kg",note:""},{cat:"Food",name:"Banana",qty:"",note:""},{cat:"Food",name:"Orange",qty:"",note:""},
  {cat:"Kitchen",name:"Cooling box",qty:"",note:""},{cat:"Kitchen",name:"Plates",qty:"",note:""},{cat:"Kitchen",name:"Cups",qty:"",note:""},{cat:"Kitchen",name:"Knife",qty:"",note:""},{cat:"Kitchen",name:"Chopping board",qty:"",note:""},{cat:"Kitchen",name:"Dish drainer / rack",qty:"",note:"Confirm wording"},{cat:"Kitchen",name:"Sponge",qty:"",note:""},{cat:"Kitchen",name:"House cleaning brush",qty:"",note:""},
  {cat:"Kids",name:"Toys",qty:"",note:""},
  {cat:"Health",name:"Medicine",qty:"",note:""},{cat:"Health",name:"Tablets",qty:"",note:""},{cat:"Health",name:"Bandage",qty:"",note:""},{cat:"Health",name:"Cotton",qty:"",note:""},{cat:"Health",name:"Nasal spray",qty:"",note:""},{cat:"Health",name:"Mosquito repellent",qty:"",note:""},
  {cat:"Clothing",name:"Umbrella",qty:"",note:""},{cat:"Clothing",name:"Rain cover / raincoat",qty:"",note:""},{cat:"Clothing",name:"Hairdryer",qty:"",note:""},{cat:"Clothing",name:"Dresses / clothes",qty:"",note:""},{cat:"Clothing",name:"Towels",qty:"",note:""},{cat:"Clothing",name:"Swimwear",qty:"",note:""},{cat:"Clothing",name:"Swimming gear",qty:"",note:""},{cat:"Clothing",name:"Bags for old clothes",qty:"",note:""},{cat:"Clothing",name:"Socks",qty:"",note:""},{cat:"Clothing",name:"Jackets",qty:"",note:""},{cat:"Clothing",name:"Head cover",qty:"",note:""},{cat:"Clothing",name:"Head cover (Wintersport)",qty:"",note:"Purchase item"},{cat:"Clothing",name:"Shoes",qty:"",note:""},{cat:"Clothing",name:"Crocs",qty:"",note:""},
  {cat:"Hygiene",name:"Wet tissue",qty:"",note:""},{cat:"Hygiene",name:"Wet toilet paper",qty:"",note:""},{cat:"Hygiene",name:"Bath items",qty:"",note:""},{cat:"Hygiene",name:"Lotion",qty:"",note:""},
  {cat:"Camping Gear",name:"Electric cables",qty:"",note:""},{cat:"Camping Gear",name:"Pump",qty:"",note:""},{cat:"Camping Gear",name:"Hammer",qty:"",note:""},{cat:"Camping Gear",name:"Gloves",qty:"",note:""},{cat:"Camping Gear",name:"Toilet box",qty:"",note:""},{cat:"Camping Gear",name:"Toilet paper",qty:"",note:""},{cat:"Camping Gear",name:"Dustbin cover",qty:"",note:""},{cat:"Camping Gear",name:"Inside mat",qty:"",note:""},{cat:"Camping Gear",name:"Outside mat",qty:"",note:""},
  {cat:"Sleeping",name:"Bed sheets",qty:"",note:""},{cat:"Sleeping",name:"Pillows",qty:"",note:""},
  {cat:"Furniture",name:"Chairs",qty:"",note:""},{cat:"Furniture",name:"Dressing case / basket",qty:"",note:"Confirm wording"},{cat:"Furniture",name:"Folding table",qty:"",note:""},
  {cat:"Electronics",name:"Bluetooth speaker",qty:"",note:""},{cat:"Electronics",name:"Lights",qty:"",note:""},{cat:"Electronics",name:"Heater",qty:"",note:""}
];

let allItems = {};
let checks = {};
let activeCategory = "All";
let itemsLoaded = false;
let editItemId = null;

const modalTitleEl = document.getElementById("modalTitle");
const saveItemBtnEl = document.getElementById("saveItemBtn");

document.getElementById("legend").innerHTML = FAMILIES.map((family, i) =>
  `<div class="legend-item"><div class="legend-dot" style="background:${FAMILY_COLORS[i]}"></div><span class="legend-name" style="color:${FAMILY_COLORS[i]}">${family}</span></div>`
).join("");

subscribeToItems((snap) => {
  if (!snap.exists() && !itemsLoaded) {
    seedDefaultItems(DEFAULT_ITEMS);
  }
  itemsLoaded = true;
  allItems = snap.val() || {};
  renderAll();
  document.getElementById("syncDot").className = "sync-dot";
  document.getElementById("syncLabel").textContent = "Live";
}, () => {
  document.getElementById("syncDot").className = "sync-dot offline";
  document.getElementById("syncLabel").textContent = "Offline";
});

subscribeToChecks((snap) => {
  checks = snap.val() || {};
  renderAll();
});

function renderAll() {
  renderTabs();
  renderItems();
  updateProgress();
}

function renderTabs() {
  const categories = ["All", ...Array.from(new Set(Object.values(allItems).map((item) => item.cat)))];
  document.getElementById("tabs").innerHTML = categories.map((cat) =>
    `<button class="tab${cat === activeCategory ? " active" : ""}" onclick="setCategory('${cat}')">${cat === "All" ? "All" : `${CAT_ICONS[cat] || "📦"} ${cat}`}</button>`
  ).join("");
}

window.setCategory = function setCategory(cat) {
  activeCategory = cat;
  renderAll();
};

window.toggleCheck = function toggleCheckHandler(itemId, familyIndex) {
  const currentValue = !!checks[`${itemId}_${familyIndex}`];
  toggleFamilyCheck(itemId, familyIndex, currentValue);
  showToast(!currentValue ? `✓ ${FAMILIES[familyIndex]} bringing this` : `${FAMILIES[familyIndex]} unchecked`);
};

window.deleteItem = function deleteItemHandler(itemId) {
  if (!confirm("Remove this item?")) {
    return;
  }

  deleteItemFromDb(itemId, FAMILIES.length);
  showToast("Item removed");
};

window.openEditModal = function openEditModal(itemId) {
  const item = allItems[itemId];
  if (!item) {
    return;
  }

  editItemId = itemId;
  modalTitleEl.textContent = "Edit item";
  saveItemBtnEl.textContent = "Save changes";

  document.getElementById("newName").value = item.name || "";
  document.getElementById("newCat").value = item.cat || "";
  document.getElementById("newQty").value = item.qty || "";
  document.getElementById("newNote").value = item.note || "";

  window.openModal();
};

function renderItems() {
  const itemArray = Object.entries(allItems).map(([id, data]) => ({ id, ...data }));
  const filtered = activeCategory === "All" ? itemArray : itemArray.filter((item) => item.cat === activeCategory);

  const grouped = {};
  filtered.forEach((item) => {
    if (!grouped[item.cat]) {
      grouped[item.cat] = [];
    }
    grouped[item.cat].push(item);
  });

  document.getElementById("itemCount").textContent = `3 families · ${itemArray.length} items`;

  const content = document.getElementById("content");
  if (!Object.keys(grouped).length) {
    content.innerHTML = `<div class="loading" style="height:120px;color:#aaa">No items — tap + to add one</div>`;
    return;
  }

  content.innerHTML = Object.entries(grouped).map(([cat, items]) =>
    `<div class="category-section">
      <div class="category-header">${CAT_ICONS[cat] || "📦"} ${cat} <span style="opacity:0.5;font-weight:400">· ${items.length}</span></div>
      <div class="items-card">${items.map((item) => {
        const familyChecks = FAMILIES.map((_, familyIndex) => !!checks[`${item.id}_${familyIndex}`]);
        const allDone = familyChecks.every(Boolean);

        return `<div class="item-row${allDone ? " all-done" : ""}">
          <div class="item-info">
            <div class="item-name">${item.name}</div>
            <div class="item-badges">
              ${item.qty ? `<span class="badge-qty">${item.qty}</span>` : ""}
              ${item.note ? `<span class="badge-note">⚠ ${item.note}</span>` : ""}
            </div>
          </div>
          <div class="family-checks">
            ${FAMILIES.map((_, familyIndex) => {
              const checked = familyChecks[familyIndex];
              return `<button class="family-btn" style="background:${checked ? FAMILY_COLORS[familyIndex] : FAMILY_BG[familyIndex]};color:${checked ? "#fff" : FAMILY_COLORS[familyIndex]}" onclick="toggleCheck('${item.id}',${familyIndex})">${checked ? "✓" : FAMILY_SHORT[familyIndex]}</button>`;
            }).join("")}
            <button class="action-btn edit-btn" onclick="openEditModal('${item.id}')">Edit</button>
            <button class="action-btn delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
          </div>
        </div>`;
      }).join("")}</div>
    </div>`
  ).join("");
}

function updateProgress() {
  const itemIds = Object.keys(allItems);
  const totalItems = itemIds.length;

  if (!totalItems) {
    return;
  }

  const assignedItems = itemIds.filter((id) => FAMILIES.some((_, familyIndex) => checks[`${id}_${familyIndex}`])).length;
  const percentage = Math.round((assignedItems / totalItems) * 100);

  document.getElementById("progressFill").style.width = `${percentage}%`;
  document.getElementById("progressText").textContent = `${assignedItems} of ${totalItems} items assigned`;
  document.getElementById("progressPct").textContent = `${percentage}%`;

  const fullyAssigned = itemIds.filter((id) => FAMILIES.every((_, familyIndex) => checks[`${id}_${familyIndex}`])).length;
  document.getElementById("footer").innerHTML =
    FAMILIES.map((_, familyIndex) => {
      const checkedCount = itemIds.filter((id) => checks[`${id}_${familyIndex}`]).length;
      return `<div class="stat-box" style="background:${FAMILY_BG[familyIndex]}"><div class="stat-num" style="color:${FAMILY_COLORS[familyIndex]}">${checkedCount}</div><div class="stat-label" style="color:${FAMILY_COLORS[familyIndex]}">${FAMILY_SHORT[familyIndex]}</div></div>`;
    }).join("") +
    `<div class="stat-box" style="background:#f5f5f5"><div class="stat-num" style="color:#444">${fullyAssigned}</div><div class="stat-label" style="color:#666">all set</div></div>`;
}

window.openModal = function openModal() {
  document.getElementById("modalOverlay").classList.add("open");
  setTimeout(() => document.getElementById("newName").focus(), 300);
};

window.closeModal = function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  ["newName", "newQty", "newNote"].forEach((id) => {
    document.getElementById(id).value = "";
    document.getElementById(id).style.borderColor = "";
  });
  document.getElementById("newCat").value = "";
  document.getElementById("newCat").style.borderColor = "";

  editItemId = null;
  modalTitleEl.textContent = "Add new item";
  saveItemBtnEl.textContent = "Add item";
};

window.handleOverlayClick = function handleOverlayClick(event) {
  if (event.target === document.getElementById("modalOverlay")) {
    window.closeModal();
  }
};

window.saveItem = function saveItem() {
  const nameEl = document.getElementById("newName");
  const catEl = document.getElementById("newCat");
  const qtyEl = document.getElementById("newQty");
  const noteEl = document.getElementById("newNote");

  const name = nameEl.value.trim();
  const cat = catEl.value;
  const qty = qtyEl.value.trim();
  const note = noteEl.value.trim();

  nameEl.style.borderColor = "";
  catEl.style.borderColor = "";

  if (!name) {
    nameEl.style.borderColor = "#e53935";
    return;
  }

  if (!cat) {
    catEl.style.borderColor = "#e53935";
    return;
  }

  if (editItemId) {
    updateItemInDb(editItemId, { name, cat, qty, note });
    showToast(`✓ "${name}" updated`);
  } else {
    addItemToDb({ name, cat, qty, note });
    activeCategory = "All";
    showToast(`✓ "${name}" added`);
  }

  window.closeModal();
};

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}
