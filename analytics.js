import { fs } from "./firebase-init.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/* ---------------------------
   Safe DOM helper
--------------------------- */
function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? "—";
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/* ---------------------------
   Chart instances
--------------------------- */
let salesChart;
let categoryChart;

/* ---------------------------
   Find current vendor stallId (best-effort)
--------------------------- */
function getCurrentStallId() {
  const keys = ["stallId", "vendorStallId", "selectedStallId", "currentStallId"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  return null;
}

/* ---------------------------
   Helpers: date + buckets
--------------------------- */
function monthKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function last12MonthKeys() {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 11; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(monthKey(x));
  }
  return out;
}

/* ---------------------------
   Render Monthly Trend (LINE)
--------------------------- */
function renderSalesTrendFromMap(dataMap) {
  const canvas = document.getElementById("salesLineChart");
  if (!canvas) return;

  if (salesChart) salesChart.destroy();

  const ctx = canvas.getContext("2d");

  const keys = last12MonthKeys();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const labels = keys.map(k => {
    const m = Number(k.split("-")[1]) - 1;
    return monthNames[m];
  });

  const values = keys.map(k => safeNum(dataMap[k], 0));

  salesChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Orders",
        data: values,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,   // ✅ FIX: prevents tall stretching
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

/* ---------------------------
   Render Pie + Legend
--------------------------- */
function renderPie(labels, values) {
  const canvas = document.getElementById("categoryPieChart");
  if (!canvas) return;

  if (categoryChart) categoryChart.destroy();

  const ctx = canvas.getContext("2d");

  categoryChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{ data: values }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,   // ✅ FIX: keeps pie sized in its box
      plugins: {
        legend: { display: false }
      }
    }
  });

  renderLegend(labels, values);
}

function renderLegend(labels, values) {
  const legend = document.getElementById("categoryLegend");
  if (!legend) return;

  legend.innerHTML = "";
  const total = values.reduce((a, b) => a + b, 0);

  const colors = categoryChart.data.datasets[0].backgroundColor || [];

  labels.forEach((label, i) => {
    const percent = total ? Math.round((values[i] / total) * 100) : 0;

    const row = document.createElement("div");
    row.className = "legend-row";

    const left = document.createElement("div");
    left.className = "legend-left";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.background = colors[i] || "#999";

    const name = document.createElement("span");
    name.className = "legend-name";
    name.textContent = label;

    left.append(dot, name);

    const right = document.createElement("span");
    right.className = "legend-percent";
    right.textContent = `${percent}%`;

    row.append(left, right);
    legend.appendChild(row);
  });
}

/* ---------------------------
   Load from orders
--------------------------- */
async function loadAnalyticsFromOrders() {
  setText("statsDocLabel", "DOC: ORDERS");

  const stallId = getCurrentStallId();
  const ordersSnap = await getDocs(collection(fs, "orders"));

  const monthly = {};
  for (const k of last12MonthKeys()) monthly[k] = 0;

  let pickupCount = 0;
  let deliveryCount = 0;
  let otherCount = 0;

  let ordersToday = 0;
  const now = new Date();
  const todayKey = `${monthKey(now)}-${String(now.getDate()).padStart(2, "0")}`;

  for (const docSnap of ordersSnap.docs) {
    const o = docSnap.data();

    // Stall filter (best-effort)
    if (stallId) {
      const topStall = o.stallId || o.StallID || null;
      const itemStall = Array.isArray(o.items) ? (o.items[0]?.stallId || o.items[0]?.StallID || null) : null;
      const matches = (topStall === stallId) || (itemStall === stallId);
      if (!matches) continue;
    }

    // createdAt timestamp
    const createdAt = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    if (!createdAt) continue;

    const mk = monthKey(createdAt);
    if (monthly[mk] !== undefined) monthly[mk] += 1;

    const dk = `${mk}-${String(createdAt.getDate()).padStart(2, "0")}`;
    if (dk === todayKey) ordersToday += 1;

    const method = (o.collection?.method || "").toLowerCase();
    if (method.includes("pickup") || method.includes("pick up")) pickupCount += 1;
    else if (method.includes("deliver")) deliveryCount += 1;
    else otherCount += 1;
  }

  setText("kpiOrdersToday", ordersToday);

  // Charts
  renderSalesTrendFromMap(monthly);
  renderPie(["Pickup", "Delivery", "Other"], [pickupCount, deliveryCount, otherCount]);
}

/* ---------------------------
   Start
--------------------------- */
loadAnalyticsFromOrders().catch(err => {
  console.error(err);
  setText("stallSubtitle", "Failed to load analytics from orders.");
});
