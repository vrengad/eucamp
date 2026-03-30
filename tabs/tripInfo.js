import { subscribe, write } from "../firebase.js";
import { showToast } from "../components/toast.js";

let data = {};
let rerender = () => {};

export function initTripInfo(renderFn) {
  rerender = renderFn;
  subscribe("tripInfo", (snap) => {
    data = snap.val() || {};
    rerender();
  });
}

export function renderTripInfo(container) {
  container.innerHTML = `
    <section class="card form-card">
      <h3>Shared Trip Info</h3>
      <form id="tripInfoForm" class="grid-form">
        <label>Location name<input name="locationName" value="${data.locationName || ""}" /></label>
        <label>Address<input name="address" value="${data.address || ""}" /></label>
        <label>Maps link<input name="mapsUrl" value="${data.mapsUrl || ""}" placeholder="https://maps.google.com/..." /></label>
        <label>Start date<input type="date" name="startDate" value="${data.startDate || ""}" /></label>
        <label>End date<input type="date" name="endDate" value="${data.endDate || ""}" /></label>
        <label>Check-in time<input type="time" name="checkInTime" value="${data.checkInTime || ""}" /></label>
        <label>Check-out time<input type="time" name="checkOutTime" value="${data.checkOutTime || ""}" /></label>
        <label>Booking details<input name="bookingRef" value="${data.bookingRef || ""}" /></label>
        <label class="full">Notes<textarea name="notes">${data.notes || ""}</textarea></label>
        <div class="full actions"><button class="primary" type="submit">Save Trip Info</button></div>
      </form>
    </section>
  `;

  container.querySelector("#tripInfoForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData.entries());
    payload.updatedAt = Date.now();
    await write("tripInfo", payload);
    showToast("Trip info saved");
  });
}

export function tripInfoHeaderText() {
  return "Location, timings, booking, notes";
}
