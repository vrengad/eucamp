import { initModal } from "./components/modal.js";
import { ensurePackingData } from "./firebase.js";
import { DEFAULT_PACKING_ITEMS } from "./utils/defaultItems.js";
import { FAMILIES } from "./utils/constants.js";
import { initPacking, packingHeaderText, renderPacking } from "./tabs/packing.js";
import { initTripInfo, renderTripInfo, tripInfoHeaderText, tripInfoLocationName } from "./tabs/tripInfo.js";
import { initSchedule, renderSchedule, scheduleHeaderText } from "./tabs/schedule.js";
import { initEssentials, renderEssentials, essentialsHeaderText } from "./tabs/essentials.js";
import { initExpenses, renderExpenses, expensesHeaderText } from "./tabs/expenses.js";

const tabs = [
  { id: "packing", label: "Packing", render: renderPacking, subtitle: packingHeaderText },
  { id: "tripInfo", label: "Trip Info", render: renderTripInfo, subtitle: tripInfoHeaderText },
  { id: "schedule", label: "Schedule", render: renderSchedule, subtitle: scheduleHeaderText },
  { id: "essentials", label: "Essentials", render: renderEssentials, subtitle: essentialsHeaderText },
  { id: "expenses", label: "Expenses", render: renderExpenses, subtitle: expensesHeaderText }
];

let activeTab = "packing";

const titleEl = document.getElementById("appTitle");
const subEl = document.getElementById("appSub");
const tabsEl = document.getElementById("tabs");
const contentEl = document.getElementById("content");

function renderApp() {
  const tab = tabs.find((x) => x.id === activeTab) || tabs[0];
  const locationName = tripInfoLocationName();
  const locationSuffix = locationName ? ` · 📍 ${locationName}` : "";
  titleEl.textContent = `🏕️ Family Trip Organizer · ${tab.label}${locationSuffix}`;
  subEl.textContent = tab.subtitle();

  tabsEl.innerHTML = tabs.map((item) => `
    <button class="top-tab ${item.id === activeTab ? "active" : ""}" data-tab="${item.id}">${item.label}</button>
  `).join("");

  tab.render(contentEl);

  tabsEl.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      renderApp();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

async function bootstrap() {
  initModal();
  await ensurePackingData({
    defaultItems: DEFAULT_PACKING_ITEMS,
    familyIds: FAMILIES.map((family) => family.id)
  });

  initPacking(renderApp);
  initTripInfo(renderApp);
  initSchedule(renderApp);
  initEssentials(renderApp);
  initExpenses(renderApp);

  renderApp();
}

bootstrap();
