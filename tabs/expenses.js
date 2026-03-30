import { add, del, patch, subscribe } from "../firebase.js";
import { FAMILIES } from "../utils/constants.js";
import { buildSettlement, summarizeExpenses } from "../utils/settlement.js";
import { openModal, closeModal } from "../components/modal.js";
import { showToast } from "../components/toast.js";

let entries = {};
let rerender = () => {};

export function initExpenses(renderFn) {
  rerender = renderFn;
  subscribe("expenses/entries", (snap) => {
    entries = snap.val() || {};
    rerender();
  });
}

function familyName(id) {
  return FAMILIES.find((family) => family.id === id)?.name || id;
}

function openExpenseModal(entryId) {
  const entry = entryId ? entries[entryId] : null;
  openModal({
    title: entry ? "Edit expense" : "Add expense",
    submitLabel: entry ? "Save" : "Add",
    bodyHtml: `
      <label>Title *</label>
      <input name="title" required value="${entry?.title || ""}" />
      <label>Amount *</label>
      <input type="number" step="0.01" min="0" name="amount" required value="${entry?.amount || ""}" />
      <label>Paid by *</label>
      <select name="paidBy">${FAMILIES.map((family) => `<option value="${family.id}" ${entry?.paidBy === family.id ? "selected" : ""}>${family.name}</option>`).join("")}</select>
      <label>Shared with</label>
      <div class="check-grid">${FAMILIES.map((family) => {
        const checked = entry ? (entry.sharedWith || []).includes(family.id) : true;
        return `<label><input type="checkbox" name="sharedWith" value="${family.id}" ${checked ? "checked" : ""}/> ${family.short}</label>`;
      }).join("")}</div>
      <label>Category</label>
      <input name="category" value="${entry?.category || ""}" placeholder="Food, Fuel, Stay..." />
      <label>Date</label>
      <input type="date" name="date" value="${entry?.date || ""}" />
      <label>Notes</label>
      <textarea name="notes">${entry?.notes || ""}</textarea>
    `,
    onSubmit: async (formData) => {
      const sharedWith = formData.getAll("sharedWith").map(String);
      const payload = {
        title: formData.get("title")?.toString().trim(),
        amount: Number(formData.get("amount")),
        paidBy: formData.get("paidBy")?.toString(),
        sharedWith: sharedWith.length ? sharedWith : FAMILIES.map((family) => family.id),
        category: formData.get("category")?.toString().trim() || "",
        date: formData.get("date")?.toString() || "",
        notes: formData.get("notes")?.toString().trim() || "",
        updatedAt: Date.now()
      };
      if (!payload.title || !Number.isFinite(payload.amount) || payload.amount <= 0) {
        showToast("Enter title and valid amount");
        return;
      }
      if (entryId) {
        await patch(`expenses/entries/${entryId}`, payload);
      } else {
        await add("expenses/entries", payload);
      }
      closeModal();
      showToast("Expense saved");
    }
  });
}

export function renderExpenses(container) {
  const list = Object.entries(entries).map(([id, data]) => ({ id, ...data }));
  list.sort((a, b) => `${b.date || ""}`.localeCompare(`${a.date || ""}`));

  const familyIds = FAMILIES.map((family) => family.id);
  const summary = summarizeExpenses(list, familyIds);
  const settlement = buildSettlement(summary.net);

  container.innerHTML = `
    <section class="card">
      <div class="section-head">
        <h3>Shared Expenses</h3>
        <button class="primary" data-role="add">Add Expense</button>
      </div>
      <div class="totals-grid">
        ${FAMILIES.map((family) => `<div class="stat">
          <strong>${family.short}</strong><br>
          Paid: €${summary.paidTotals[family.id].toFixed(2)}<br>
          Owes: €${summary.owedTotals[family.id].toFixed(2)}<br>
          Net: <strong>${summary.net[family.id] >= 0 ? "+" : ""}€${summary.net[family.id].toFixed(2)}</strong>
        </div>`).join("")}
      </div>
      <div class="settlement">
        <h4>Settlement summary</h4>
        ${settlement.length ? settlement.map((row) => `<div class="muted">${familyName(row.from)} pays ${familyName(row.to)}: <strong>€${row.amount.toFixed(2)}</strong></div>`).join("") : `<div class="muted">No settlement needed.</div>`}
      </div>
    </section>

    <section class="card-list">
      ${list.length ? list.map((entry) => `<article class="item-row stacked">
        <div>
          <div class="item-name">${entry.title} · €${Number(entry.amount || 0).toFixed(2)}</div>
          <div class="muted">${entry.date || "No date"} · Paid by ${familyName(entry.paidBy)} · ${entry.category || "Uncategorized"}</div>
          <div class="muted">Shared with: ${(entry.sharedWith || []).map(familyName).join(", ")}</div>
          ${entry.notes ? `<div class="item-note">${entry.notes}</div>` : ""}
        </div>
        <div class="item-actions">
          <button class="mini-btn" data-role="edit" data-id="${entry.id}">Edit</button>
          <button class="mini-btn danger" data-role="delete" data-id="${entry.id}">Delete</button>
        </div>
      </article>`).join("") : `<div class="empty">No expenses added yet.</div>`}
    </section>
  `;

  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const role = button.dataset.role;
    if (role === "add") openExpenseModal();
    if (role === "edit") openExpenseModal(button.dataset.id);
    if (role === "delete") {
      if (!window.confirm("Delete this expense?")) return;
      await del(`expenses/entries/${button.dataset.id}`);
      showToast("Expense deleted");
    }
  });
}

export function expensesHeaderText() {
  return `${Object.keys(entries).length} expenses`;
}
