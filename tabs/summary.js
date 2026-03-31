import { subscribe } from "../firebase.js";
import { FAMILIES, CAT_ICONS, ESSENTIAL_GROUPS } from "../utils/constants.js";
import { buildSettlement, summarizeExpenses } from "../utils/settlement.js";

let tripInfo = {};
let packingItems = {};
let packingChecks = {};
let scheduleEvents = {};
let essentials = {};
let expenses = {};
let rerender = () => {};

export function initSummary(renderFn) {
  rerender = renderFn;
  subscribe("tripInfo", (snap) => { tripInfo = snap.val() || {}; rerender(); });
  subscribe("packing/items", (snap) => { packingItems = snap.val() || {}; rerender(); });
  subscribe("packing/checks", (snap) => { packingChecks = snap.val() || {}; rerender(); });
  subscribe("schedule", (snap) => { scheduleEvents = snap.val() || {}; rerender(); });
  subscribe("essentials", (snap) => { essentials = snap.val() || {}; rerender(); });
  subscribe("expenses/entries", (snap) => { expenses = snap.val() || {}; rerender(); });
}

function esc(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderTripBlock() {
  const d = tripInfo;
  const hasMap = d.mapsUrl && d.mapsUrl.startsWith("http");
  return `
    <section class="summary-block">
      <h3>🏕️ Trip Info</h3>
      <div class="summary-grid">
        ${d.locationName ? `<div><strong>Location:</strong> ${esc(d.locationName)}</div>` : ""}
        ${d.address ? `<div><strong>Address:</strong> ${esc(d.address)}</div>` : ""}
        ${d.startDate || d.endDate ? `<div><strong>Dates:</strong> ${esc(d.startDate || "?")} → ${esc(d.endDate || "?")}</div>` : ""}
        ${d.checkInTime ? `<div><strong>Check-in:</strong> ${esc(d.checkInTime)}</div>` : ""}
        ${d.checkOutTime ? `<div><strong>Check-out:</strong> ${esc(d.checkOutTime)}</div>` : ""}
        ${d.bookingRef ? `<div><strong>Booking:</strong> ${esc(d.bookingRef)}</div>` : ""}
        ${hasMap ? `<div><a class="maps-link" href="${esc(d.mapsUrl)}" target="_blank" rel="noopener noreferrer">📍 Open in Google Maps</a></div>` : ""}
        ${d.notes ? `<div><strong>Notes:</strong> ${esc(d.notes)}</div>` : ""}
      </div>
    </section>
  `;
}

function renderScheduleBlock() {
  const items = Object.entries(scheduleEvents)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`));

  if (!items.length) return "";

  return `
    <section class="summary-block">
      <h3>📅 Schedule</h3>
      <div class="summary-list">
        ${items.map((ev) => {
          const by = FAMILIES.find((f) => f.id === ev.addedBy)?.short || "";
          return `<div class="summary-list-item">
            <strong>${esc(ev.title)}</strong>
            <span class="muted"> — ${ev.date || ""}${ev.time ? " " + ev.time : ""}${by ? " · " + by : ""}</span>
            ${ev.notes ? `<div class="muted">${esc(ev.notes)}</div>` : ""}
          </div>`;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPackingBlock() {
  const all = Object.entries(packingItems).map(([id, data]) => ({ id, ...data }));
  if (!all.length) return "";

  const grouped = {};
  all.forEach((item) => {
    const cat = item.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  return `
    <section class="summary-block">
      <h3>🎒 Packing</h3>
      ${Object.entries(grouped).map(([cat, items]) => `
        <div class="summary-cat">
          <h4>${CAT_ICONS[cat] || "📦"} ${cat} <span class="muted">· ${items.length}</span></h4>
          <div class="summary-list summary-list-columns">
            ${items.map((item) => {
              const assigned = FAMILIES.filter((f) => packingChecks[item.id]?.[f.id]).map((f) => f.short);
              return `<div class="summary-list-item">
                <span>${esc(item.name)}</span>
                ${item.qty ? `<span class="badge">${esc(item.qty)}</span>` : ""}
                ${assigned.length ? `<span class="badge">${assigned.join(", ")}</span>` : `<span class="badge warn">unassigned</span>`}
              </div>`;
            }).join("")}
          </div>
        </div>
      `).join("")}
    </section>
  `;
}

function renderEssentialsBlock() {
  const hasAny = ESSENTIAL_GROUPS.some((g) => Object.keys(essentials[g.key] || {}).length);
  if (!hasAny) return "";

  return `
    <section class="summary-block">
      <h3>✅ Essentials</h3>
      ${ESSENTIAL_GROUPS.map((group) => {
        const items = Object.entries(essentials[group.key] || {}).map(([id, d]) => ({ id, ...d }));
        if (!items.length) return "";
        return `
          <div class="summary-cat">
            <h4>${group.label}</h4>
            <div class="summary-list">
              ${items.map((item) => {
                const doneBy = FAMILIES.filter((f) => item.doneByFamily?.[f.id]).map((f) => f.short);
                return `<div class="summary-list-item">
                  <span>${esc(item.text)}</span>
                  ${doneBy.length ? `<span class="badge">${doneBy.join(", ")} ✓</span>` : `<span class="badge warn">pending</span>`}
                </div>`;
              }).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </section>
  `;
}

function renderExpensesBlock() {
  const list = Object.entries(expenses).map(([id, data]) => ({ id, ...data }));
  if (!list.length) return "";

  const familyIds = FAMILIES.map((f) => f.id);
  const summary = summarizeExpenses(list, familyIds);
  const settlement = buildSettlement(summary.net);

  return `
    <section class="summary-block">
      <h3>💰 Expenses</h3>
      <div class="summary-grid">
        ${FAMILIES.map((f) => `<div>
          <strong>${f.name}:</strong>
          Paid €${summary.paidTotals[f.id].toFixed(2)} ·
          Owes €${summary.owedTotals[f.id].toFixed(2)} ·
          Net ${summary.net[f.id] >= 0 ? "+" : ""}€${summary.net[f.id].toFixed(2)}
        </div>`).join("")}
      </div>
      ${settlement.length ? `
        <div class="summary-settlement">
          <strong>Settlement:</strong>
          ${settlement.map((row) => {
            const from = FAMILIES.find((f) => f.id === row.from)?.name || row.from;
            const to = FAMILIES.find((f) => f.id === row.to)?.name || row.to;
            return `<div>${from} → ${to}: <strong>€${row.amount.toFixed(2)}</strong></div>`;
          }).join("")}
        </div>
      ` : ""}
    </section>
  `;
}

export function renderSummary(container) {
  container.innerHTML = `
    <div class="summary-page" id="summaryContent">
      <div class="section-head">
        <h2 class="summary-title">Trip Summary</h2>
        <button class="primary no-print" data-role="print">🖨️ Print / PDF</button>
      </div>
      <div class="summary-layout">
        <div class="summary-layout-full">${renderTripBlock()}</div>
        ${renderScheduleBlock()}
        ${renderPackingBlock()}
        ${renderEssentialsBlock()}
        <div class="summary-layout-full">${renderExpensesBlock()}</div>
      </div>
    </div>
  `;

  container.onclick = (event) => {
    const btn = event.target.closest("button");
    if (btn?.dataset.role === "print") {
      window.print();
    }
  };
}

export function summaryHeaderText() {
  const itemCount = Object.keys(packingItems).length;
  const eventCount = Object.keys(scheduleEvents).length;
  return `${itemCount} items · ${eventCount} events`;
}
