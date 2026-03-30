import { add, addMany, del, patch, subscribe } from "../firebase.js";
import { CAT_ICONS, FAMILIES, PACKING_CATEGORIES } from "../utils/constants.js";
import { parseBulkPackingLines } from "../utils/bulkParser.js";
import { openModal, closeModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";

const state = {
  items: {},
  checks: {},
  activeCategory: "All",
  search: "",
  connected: true,
  quickCategory: PACKING_CATEGORIES[0],
  bulkOpen: false,
  bulkText: "",
  bulkFeedback: ""
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

function quickAddCard() {
  return `
    <section class="card">
      <div class="section-head">
        <h3>Quick Add</h3>
        <button class="mini-btn" data-role="toggle-bulk">${state.bulkOpen ? "Hide" : "Add many items"}</button>
      </div>
      <form id="quickAddForm" class="quick-add-grid">
        <input name="name" placeholder="Item name" required />
        <select name="category">
          ${PACKING_CATEGORIES.map((cat) => `<option value="${cat}" ${state.quickCategory === cat ? "selected" : ""}>${cat}</option>`).join("")}
        </select>
        <input name="qty" placeholder="Quantity / detail" />
        <input name="note" placeholder="Note" />
        <button class="primary" type="submit">Add</button>
      </form>
      ${state.bulkOpen ? `
        <div class="bulk-panel">
          <p class="muted">Paste one item per line. Optional format: <code>Name | Category | Qty | Note</code></p>
          <textarea id="bulkText" placeholder="Milk\nBread\nCurd\nMilk | Food | 2 bottles | buy before trip">${state.bulkText}</textarea>
          <div class="bulk-actions">
            <button class="mini-btn" data-role="preview-bulk">Preview</button>
            <button class="primary" data-role="save-bulk">Save valid lines</button>
          </div>
          ${state.bulkFeedback ? `<div class="muted">${state.bulkFeedback}</div>` : ""}
        </div>
      ` : ""}
    </section>
  `;
}

function openItemModal(itemId) {
  const item = itemId ? state.items[itemId] : null;
  openModal({
    title: "Edit packing item",
    submitLabel: "Save",
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
      await patch(`packing/items/${itemId}`, payload);
      showToast("Item updated");
      closeModal();
    }
  });
}

function parseBulk() {
  return parseBulkPackingLines(state.bulkText, state.quickCategory);
}

async function addQuickItem(formEl) {
  const formData = new FormData(formEl);
  const payload = {
    name: (formData.get("name") || "").toString().trim(),
    category: (formData.get("category") || state.quickCategory).toString(),
    qty: (formData.get("qty") || "").toString().trim(),
    note: (formData.get("note") || "").toString().trim(),
    updatedAt: Date.now()
  };

  if (!payload.name) {
    showToast("Item name is required");
    formEl.querySelector('input[name="name"]').focus();
    return;
  }

  state.quickCategory = payload.category;
  await add("packing/items", payload);
  showToast(`Added: ${payload.name}`);

  formEl.querySelector('input[name="name"]').value = "";
  formEl.querySelector('input[name="qty"]').value = "";
  formEl.querySelector('input[name="note"]').value = "";
  formEl.querySelector('select[name="category"]').value = state.quickCategory;
  formEl.querySelector('input[name="name"]').focus();
}

async function saveBulk() {
  const { valid, invalid } = parseBulk();
  if (!valid.length) {
    state.bulkFeedback = invalid.length ? `No valid lines. First error at line ${invalid[0].lineNo}.` : "Enter at least one line.";
    rerender();
    return;
  }

  await addMany("packing/items", valid.map((item) => ({ ...item, updatedAt: Date.now() })));
  state.bulkText = "";
  state.bulkFeedback = `Added ${valid.length} items${invalid.length ? ` · skipped ${invalid.length} invalid line(s)` : ""}.`;
  showToast(`Added ${valid.length} items`);
  rerender();
}

async function handleClick(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const role = button.dataset.role;

  if (role === "toggle-bulk") {
    state.bulkOpen = !state.bulkOpen;
    state.bulkFeedback = "";
    rerender();
    return;
  }

  if (role === "preview-bulk") {
    const { valid, invalid } = parseBulk();
    state.bulkFeedback = `Preview: ${valid.length} valid, ${invalid.length} invalid.`;
    rerender();
    return;
  }

  if (role === "save-bulk") {
    await saveBulk();
    return;
  }

  if (role === "edit-item") {
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
    ${quickAddCard()}
    <section class="toolbar card">
      <input id="packingSearch" class="search" placeholder="Search items..." value="${state.search}" />
      <div class="chips">${categories.map((cat) => `<button class="chip ${cat === state.activeCategory ? "active" : ""}" data-role="cat" data-cat="${cat}">${cat === "All" ? "All" : `${CAT_ICONS[cat] || "📦"} ${cat}`}</button>`).join("")}</div>
      ${renderLegend()}
      ${progressCard()}
    </section>
    ${itemRows()}
  `;

  container.querySelector("#packingSearch").addEventListener("input", (event) => {
    state.search = event.target.value;
    rerender();
  });

  const quickForm = container.querySelector("#quickAddForm");
  quickForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addQuickItem(quickForm);
  });

  quickForm.querySelector('select[name="category"]').addEventListener("change", (event) => {
    state.quickCategory = event.target.value;
  });

  const bulkText = container.querySelector("#bulkText");
  if (bulkText) {
    bulkText.addEventListener("input", (event) => {
      state.bulkText = event.target.value;
    });
  }

  container.onclick = async (event) => {
    const chip = event.target.closest('[data-role="cat"]');
    if (chip) {
      state.activeCategory = chip.dataset.cat;
      rerender();
      return;
    }
    await handleClick(event);
  };
}

export function packingHeaderText() {
  const total = Object.keys(state.items).length;
  return `${FAMILIES.length} families · ${total} items · ${state.connected ? "Live" : "Offline"}`;
}
