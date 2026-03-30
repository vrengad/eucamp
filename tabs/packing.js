import { add, del, patch, subscribe } from "../firebase.js";
import { CAT_ICONS, FAMILIES, PACKING_CATEGORIES } from "../utils/constants.js";
import { openModal, closeModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";

const state = {
  items: {},
  checks: {},
  activeCategory: "All",
  search: "",
  connected: true
};

let rerender = () => {};

export function initPacking(renderFn) {
  rerender = renderFn;
  subscribe("packing/items", (snap) => {
    state.items = snap.val() || {};
    state.connected = true;
    rerender();
  }, () => {
    state.connected = false;
    rerender();
  });
  subscribe("packing/checks", (snap) => {
    state.checks = snap.val() || {};
    rerender();
  });
}

function itemRows() {
  const all = Object.entries(state.items).map(([id, data]) => ({ id, ...data }));
  const filtered = all.filter((item) => {
    const categoryMatch = state.activeCategory === "All" || item.category === state.activeCategory;
    const searchBlob = `${item.name} ${item.qty || ""} ${item.note || ""}`.toLowerCase();
    return categoryMatch && searchBlob.includes(state.search.toLowerCase());
  });

  const grouped = {};
  filtered.forEach((item) => {
    const key = item.category || "Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  if (!Object.keys(grouped).length) {
    return `<div class="empty">No packing items found.</div>`;
  }

  return Object.entries(grouped).map(([category, items]) => `
    <section class="card-section">
      <h3 class="section-title">${CAT_ICONS[category] || "📦"} ${category} <span class="muted">· ${items.length}</span></h3>
      <div class="card-list">
        ${items.map((item) => {
          const allDone = FAMILIES.every((family) => state.checks[item.id]?.[family.id]);
          return `<div class="item-row ${allDone ? "all-done" : ""}">
            <div class="item-main">
              <div class="item-name">${item.name}</div>
              <div class="item-meta">
                ${item.qty ? `<span class="badge">${item.qty}</span>` : ""}
                ${item.note ? `<span class="badge warn">⚠ ${item.note}</span>` : ""}
              </div>
            </div>
            <div class="item-actions">
              ${FAMILIES.map((family) => {
                const checked = !!state.checks[item.id]?.[family.id];
                return `<button class="family-btn" data-role="toggle-check" data-item-id="${item.id}" data-family-id="${family.id}" style="background:${checked ? family.color : family.bg};color:${checked ? "#fff" : family.color};">${checked ? "✓" : family.short}</button>`;
              }).join("")}
              <button class="mini-btn" data-role="edit-item" data-item-id="${item.id}">Edit</button>
              <button class="mini-btn danger" data-role="delete-item" data-item-id="${item.id}">Delete</button>
            </div>
          </div>`;
        }).join("")}
      </div>
    </section>
  `).join("");
}

function renderLegend() {
  return `<div class="legend">${FAMILIES.map((family) => `<div class="legend-item"><span class="legend-dot" style="background:${family.color}"></span>${family.name}</div>`).join("")}</div>`;
}

function progressCard() {
  const itemIds = Object.keys(state.items);
  const totalItems = itemIds.length || 1;
  const assigned = itemIds.filter((itemId) => FAMILIES.some((family) => !!state.checks[itemId]?.[family.id])).length;
  const pct = Math.round((assigned / totalItems) * 100);
  const fully = itemIds.filter((itemId) => FAMILIES.every((family) => !!state.checks[itemId]?.[family.id])).length;

  return `
    <div class="progress-card">
      <div class="progress-row"><strong>${assigned}</strong> of <strong>${itemIds.length}</strong> items assigned <span>${pct}%</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="stats-row">
        ${FAMILIES.map((family) => {
          const count = itemIds.filter((id) => state.checks[id]?.[family.id]).length;
          return `<div class="stat" style="background:${family.bg};color:${family.color}">${family.short}: ${count}</div>`;
        }).join("")}
        <div class="stat">All set: ${fully}</div>
      </div>
    </div>
  `;
}

function openItemModal(itemId) {
  const item = itemId ? state.items[itemId] : null;
  openModal({
    title: item ? "Edit packing item" : "Add packing item",
    submitLabel: item ? "Save" : "Add",
    bodyHtml: `
      <label>Item name *</label>
      <input name="name" required value="${item?.name || ""}" />
      <label>Category *</label>
      <select name="category" required>
        <option value="">Select category...</option>
        ${PACKING_CATEGORIES.map((cat) => `<option value="${cat}" ${item?.category === cat ? "selected" : ""}>${cat}</option>`).join("")}
      </select>
      <label>Quantity / detail</label>
      <input name="qty" value="${item?.qty || ""}" />
      <label>Notes</label>
      <input name="note" value="${item?.note || ""}" />
    `,
    onSubmit: async (formData) => {
      const payload = {
        name: (formData.get("name") || "").toString().trim(),
        category: (formData.get("category") || "").toString(),
        qty: (formData.get("qty") || "").toString().trim(),
        note: (formData.get("note") || "").toString().trim(),
        updatedAt: Date.now()
      };
      if (!payload.name || !payload.category) {
        showToast("Name and category are required");
        return;
      }
      if (itemId) {
        await patch(`packing/items/${itemId}`, payload);
        showToast("Item updated");
      } else {
        await add("packing/items", payload);
        showToast("Item added");
      }
      closeModal();
    }
  });
}

async function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const role = button.dataset.role;
  if (role === "add-item") {
    openItemModal();
  } else if (role === "edit-item") {
    openItemModal(button.dataset.itemId);
  } else if (role === "delete-item") {
    if (!window.confirm("Delete this item?")) return;
    const itemId = button.dataset.itemId;
    await del(`packing/items/${itemId}`);
    await del(`packing/checks/${itemId}`);
    showToast("Item deleted");
  } else if (role === "toggle-check") {
    const { itemId, familyId } = button.dataset;
    const current = !!state.checks[itemId]?.[familyId];
    await patch(`packing/checks/${itemId}`, { [familyId]: !current });
    showToast(!current ? "Assigned" : "Unassigned");
  }
}

export function renderPacking(container) {
  const categories = ["All", ...Array.from(new Set(Object.values(state.items).map((item) => item.category).filter(Boolean)))];
  container.innerHTML = `
    <section class="toolbar card">
      <input id="packingSearch" class="search" placeholder="Search items..." value="${state.search}" />
      <div class="chips">${categories.map((cat) => `<button class="chip ${cat === state.activeCategory ? "active" : ""}" data-role="cat" data-cat="${cat}">${cat === "All" ? "All" : `${CAT_ICONS[cat] || "📦"} ${cat}`}</button>`).join("")}</div>
      ${renderLegend()}
      ${progressCard()}
    </section>
    ${itemRows()}
    <button class="fab" data-role="add-item" aria-label="Add packing item">+</button>
  `;

  container.querySelectorAll('[data-role="cat"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeCategory = btn.dataset.cat;
      rerender();
    });
  });

  container.querySelector("#packingSearch").addEventListener("input", (event) => {
    state.search = event.target.value;
    rerender();
  });

  container.addEventListener("click", handleClick);
}

export function packingHeaderText() {
  const total = Object.keys(state.items).length;
  return `${FAMILIES.length} families · ${total} items · ${state.connected ? "Live" : "Offline"}`;
}
