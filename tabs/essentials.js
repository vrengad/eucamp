import { add, del, patch, subscribe } from "../firebase.js";
import { ESSENTIAL_GROUPS } from "../utils/constants.js";
import { openModal, closeModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";

let essentials = {};
let rerender = () => {};
const deletingIds = new Set();
const togglingIds = new Set();

export function initEssentials(renderFn) {
  rerender = renderFn;
  subscribe("essentials", (snap) => {
    essentials = snap.val() || {};
    rerender();
  });
}

function openEssentialModal(groupKey, itemId) {
  const item = itemId ? essentials[groupKey]?.[itemId] : null;
  openModal({
    title: itemId ? "Edit essential" : "Add essential reminder",
    submitLabel: itemId ? "Save" : "Add",
    bodyHtml: `
      <label>Reminder</label>
      <input name="text" required placeholder="e.g. Charge power banks" value="${item?.text || ""}" />
      ${itemId ? `<label><input type="checkbox" name="done" ${item?.done ? "checked" : ""} /> Mark as done</label>` : ""}
    `,
    onSubmit: async (formData) => {
      const text = formData.get("text")?.toString().trim();
      if (!text) return;
      const done = formData.get("done") === "on";
      const payload = { text, done, updatedAt: Date.now() };
      if (itemId) {
        await patch(`essentials/${groupKey}/${itemId}`, payload);
        showToast("Reminder updated");
      } else {
        await add(`essentials/${groupKey}`, { ...payload, done: false });
        showToast("Essential added");
      }
      closeModal();
    }
  });
}

function renderItem(groupKey, item) {
  const busyDeleteKey = `${groupKey}:${item.id}`;
  const busyToggleKey = `${busyDeleteKey}:toggle`;

  return `
    <article class="item-row stacked essentials-row">
      <div class="essentials-main">
        <label class="check-label">
          <input type="checkbox" data-role="toggle" data-group="${groupKey}" data-id="${item.id}" ${item.done ? "checked" : ""} ${togglingIds.has(busyToggleKey) ? "disabled" : ""} />
          <span class="item-name ${item.done ? "done-text" : ""}">${item.text}</span>
        </label>
        <button class="link-btn" data-role="edit" data-group="${groupKey}" data-id="${item.id}">Edit details</button>
      </div>
      <button class="mini-btn danger" data-role="delete" data-group="${groupKey}" data-id="${item.id}" ${deletingIds.has(busyDeleteKey) ? "disabled" : ""}>Delete</button>
    </article>
  `;
}

export function renderEssentials(container) {
  container.innerHTML = ESSENTIAL_GROUPS.map((group) => {
    const items = Object.entries(essentials[group.key] || {}).map(([id, data]) => ({ id, ...data }));
    return `
      <section class="card-section">
        <div class="section-head">
          <h3>${group.label}</h3>
          <button class="mini-btn" data-role="add" data-group="${group.key}">Add</button>
        </div>
        <div class="card-list">
          ${items.length ? items.map((item) => renderItem(group.key, item)).join("") : `<div class="empty">No reminders yet.</div>`}
        </div>
      </section>
    `;
  }).join("");

  container.onclick = async (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    event.preventDefault();

    const role = btn.dataset.role;
    const group = btn.dataset.group;
    const id = btn.dataset.id;

    if (role === "add") {
      openEssentialModal(group);
      return;
    }

    if (role === "edit") {
      openEssentialModal(group, id);
      return;
    }

    if (role === "delete") {
      const key = `${group}:${id}`;
      if (deletingIds.has(key)) return;
      if (!window.confirm("Delete this reminder?")) return;
      deletingIds.add(key);
      try {
        await del(`essentials/${group}/${id}`);
        showToast("Reminder deleted");
      } finally {
        deletingIds.delete(key);
      }
    }
  };

  container.onchange = async (event) => {
    const input = event.target.closest('input[data-role="toggle"]');
    if (!input) return;
    const group = input.dataset.group;
    const id = input.dataset.id;
    const key = `${group}:${id}:toggle`;
    if (togglingIds.has(key)) return;

    const done = input.checked;
    togglingIds.add(key);
    try {
      await patch(`essentials/${group}/${id}`, { done, updatedAt: Date.now() });
      showToast(done ? "Marked done" : "Marked undone");
    } finally {
      togglingIds.delete(key);
    }
  };
}

export function essentialsHeaderText() {
  const total = ESSENTIAL_GROUPS.reduce((sum, group) => sum + Object.keys(essentials[group.key] || {}).length, 0);
  return `${total} reminders`;
}
