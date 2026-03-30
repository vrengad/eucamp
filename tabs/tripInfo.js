import { subscribe, write } from "../firebase.js";
import { showToast } from "../components/toast.js";

let data = {};
let draft = {};
let isEditing = false;
let rerender = () => {};

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function initTripInfo(renderFn) {
  rerender = renderFn;
  subscribe("tripInfo", (snap) => {
    data = snap.val() || {};
    if (!isEditing) {
      draft = { ...data };
    }
    rerender();
  });
}

function viewField(label, value, options = {}) {
  const safe = esc(value || "");
  if (options.type === "link" && value) {
    return `<div class="detail-row"><div class="detail-label">${label}</div><a class="detail-link maps-link" href="${esc(value)}" target="_blank" rel="noopener noreferrer">📍 Open in Google Maps</a></div>`;
  }
  return `<div class="detail-row"><div class="detail-label">${label}</div><div class="detail-value">${safe || "—"}</div></div>`;
}

function renderViewMode() {
  return `
    <section class="card form-card">
      <div class="section-head">
        <h3>Shared Trip Info</h3>
        <button class="primary" data-role="edit">Edit</button>
      </div>
      <div class="details-list">
        ${viewField("Location", data.locationName)}
        ${viewField("Address", data.address)}
        ${viewField("Google Maps", data.mapsUrl, { type: "link" })}
        ${viewField("Start date", data.startDate)}
        ${viewField("End date", data.endDate)}
        ${viewField("Check-in", data.checkInTime)}
        ${viewField("Check-out", data.checkOutTime)}
        ${viewField("Booking details", data.bookingRef)}
        ${viewField("Notes", data.notes)}
      </div>
    </section>
  `;
}

function renderEditMode() {
  return `
    <section class="card form-card">
      <div class="section-head">
        <h3>Edit Trip Info</h3>
      </div>
      <form id="tripInfoForm" class="grid-form">
        <label>Location name<input name="locationName" value="${esc(draft.locationName)}" /></label>
        <label>Address<input name="address" value="${esc(draft.address)}" /></label>
        <label>Maps link<input name="mapsUrl" value="${esc(draft.mapsUrl)}" placeholder="https://maps.google.com/..." /></label>
        <label>Start date<input type="date" name="startDate" value="${esc(draft.startDate)}" /></label>
        <label>End date<input type="date" name="endDate" value="${esc(draft.endDate)}" /></label>
        <label>Check-in time<input type="time" name="checkInTime" value="${esc(draft.checkInTime)}" /></label>
        <label>Check-out time<input type="time" name="checkOutTime" value="${esc(draft.checkOutTime)}" /></label>
        <label>Booking details<input name="bookingRef" value="${esc(draft.bookingRef)}" /></label>
        <label class="full">Notes<textarea name="notes">${esc(draft.notes)}</textarea></label>
        <div class="full actions split-actions">
          <button class="btn" type="button" data-role="cancel">Cancel</button>
          <button class="primary" type="submit">Save</button>
        </div>
      </form>
    </section>
  `;
}

export function renderTripInfo(container) {
  container.innerHTML = isEditing ? renderEditMode() : renderViewMode();

  container.onclick = (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.role === "edit") {
      draft = { ...data };
      isEditing = true;
      rerender();
    }
    if (button.dataset.role === "cancel") {
      isEditing = false;
      draft = { ...data };
      rerender();
    }
  };

  const form = container.querySelector("#tripInfoForm");
  if (form) {
    form.onsubmit = async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      draft = Object.fromEntries(formData.entries());
      const payload = { ...draft, updatedAt: Date.now() };
      await write("tripInfo", payload);
      isEditing = false;
      showToast("Trip info saved");
    };
  }
}

export function tripInfoHeaderText() {
  return isEditing ? "Editing trip details" : "View trip details";
}
