import { add, del, patch, subscribe } from "../firebase.js";
import { FAMILIES } from "../utils/constants.js";
import { openModal, closeModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";

let events = {};
let rerender = () => {};
const deletingIds = new Set();

export function initSchedule(renderFn) {
  rerender = renderFn;
  subscribe("schedule", (snap) => {
    events = snap.val() || {};
    rerender();
  });
}

function sortedEvents() {
  return Object.entries(events)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));
}

function openEventModal(eventId) {
  const item = eventId ? events[eventId] : null;
  openModal({
    title: item ? "Edit schedule event" : "Add schedule event",
    submitLabel: item ? "Save" : "Add",
    bodyHtml: `
      <label>Title *</label>
      <input name="title" required value="${item?.title || ""}" />
      <label>Date *</label>
      <input type="date" name="date" required value="${item?.date || ""}" />
      <label>Time</label>
      <input type="time" name="time" value="${item?.time || ""}" />
      <label>Added by family</label>
      <select name="addedBy">
        ${FAMILIES.map((family) => `<option value="${family.id}" ${item?.addedBy === family.id ? "selected" : ""}>${family.name}</option>`).join("")}
      </select>
      <label>Notes</label>
      <textarea name="notes">${item?.notes || ""}</textarea>
    `,
    onSubmit: async (formData) => {
      const payload = {
        title: formData.get("title")?.toString().trim(),
        date: formData.get("date")?.toString(),
        time: formData.get("time")?.toString() || "",
        notes: formData.get("notes")?.toString().trim() || "",
        addedBy: formData.get("addedBy")?.toString(),
        updatedAt: Date.now()
      };
      if (!payload.title || !payload.date) {
        showToast("Title and date are required");
        return;
      }
      if (eventId) {
        await patch(`schedule/${eventId}`, payload);
      } else {
        await add("schedule", payload);
      }
      closeModal();
      showToast("Schedule saved");
    }
  });
}

export function renderSchedule(container) {
  const items = sortedEvents();
  container.innerHTML = `
    <section class="card">
      <h3>Schedule</h3>
      <p class="muted">Shared events for the trip.</p>
      <button class="primary" data-role="add">Add Event</button>
    </section>
    <section class="card-list">${items.length ? items.map((item) => {
      const by = FAMILIES.find((family) => family.id === item.addedBy)?.short || "?";
      return `<article class="item-row stacked">
        <div>
          <div class="item-name">${item.title}</div>
          <div class="muted">${item.date || ""} ${item.time || ""} · by ${by}</div>
          ${item.notes ? `<div class="item-note">${item.notes}</div>` : ""}
        </div>
        <div class="item-actions">
          <button class="mini-btn" data-role="edit" data-id="${item.id}">Edit</button>
          <button class="mini-btn danger" data-role="delete" data-id="${item.id}">Delete</button>
        </div>
      </article>`;
    }).join("") : `<div class="empty">No schedule events yet.</div>`}</section>
  `;

  container.onclick = async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    event.preventDefault();
    const role = button.dataset.role;
    if (role === "add") {
      openEventModal();
      return;
    }
    if (role === "edit") {
      openEventModal(button.dataset.id);
      return;
    }
    if (role === "delete") {
      const id = button.dataset.id;
      if (!id || deletingIds.has(id)) return;
      if (!window.confirm("Delete this event?")) return;
      deletingIds.add(id);
      try {
        await del(`schedule/${id}`);
        showToast("Event deleted");
      } finally {
        deletingIds.delete(id);
      }
    }
  };
  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const role = button.dataset.role;
    if (role === "add") openEventModal();
    if (role === "edit") openEventModal(button.dataset.id);
    if (role === "delete") {
      if (!window.confirm("Delete this event?")) return;
      await del(`schedule/${button.dataset.id}`);
      showToast("Event deleted");
    }
  });
}

export function scheduleHeaderText() {
  return `${Object.keys(events).length} events`;
}
