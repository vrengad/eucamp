import { add, del, patch, subscribe } from "../firebase.js";
import { ESSENTIAL_GROUPS, FAMILIES } from "../utils/constants.js";
import { openModal, closeModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";

let essentials = {};
let rerender = () => {};

export function initEssentials(renderFn) {
  rerender = renderFn;
  subscribe("essentials", (snap) => {
    essentials = snap.val() || {};
    rerender();
  });
}

function openEssentialModal(groupKey) {
  openModal({
    title: "Add essential reminder",
    submitLabel: "Add",
    bodyHtml: `
      <label>Reminder</label>
      <input name="text" required placeholder="e.g. Charge power banks" />
    `,
    onSubmit: async (formData) => {
      const text = formData.get("text")?.toString().trim();
      if (!text) return;
      await add(`essentials/${groupKey}`, { text, doneByFamily: {}, updatedAt: Date.now() });
      closeModal();
      showToast("Essential added");
    }
  });
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
          ${items.length ? items.map((item) => `
            <article class="item-row stacked">
              <div>
                <div class="item-name">${item.text}</div>
                <div class="item-actions">
                  ${FAMILIES.map((family) => {
                    const checked = !!item.doneByFamily?.[family.id];
                    return `<button class="family-btn" data-role="toggle" data-group="${group.key}" data-id="${item.id}" data-family="${family.id}" style="background:${checked ? family.color : family.bg};color:${checked ? "#fff" : family.color};">${checked ? "✓" : family.short}</button>`;
                  }).join("")}
                </div>
              </div>
              <button class="mini-btn danger" data-role="delete" data-group="${group.key}" data-id="${item.id}">Delete</button>
            </article>
          `).join("") : `<div class="empty">No reminders yet.</div>`}
        </div>
      </section>
    `;
  }).join("");

  container.onclick = async (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    const role = btn.dataset.role;
    if (role === "add") {
      openEssentialModal(btn.dataset.group);
      return;
    }
    if (role === "delete") {
      if (!window.confirm("Delete this reminder?")) return;
      await del(`essentials/${btn.dataset.group}/${btn.dataset.id}`);
      showToast("Reminder deleted");
      return;
    }
    if (role === "toggle") {
      const path = `essentials/${btn.dataset.group}/${btn.dataset.id}/doneByFamily`;
      const item = essentials[btn.dataset.group]?.[btn.dataset.id] || {};
      const current = !!item.doneByFamily?.[btn.dataset.family];
      await patch(path, { [btn.dataset.family]: !current });
      showToast(!current ? "Marked done" : "Unchecked");
    }
  };
}

export function essentialsHeaderText() {
  const total = ESSENTIAL_GROUPS.reduce((sum, group) => sum + Object.keys(essentials[group.key] || {}).length, 0);
  return `${total} reminders`;
}
