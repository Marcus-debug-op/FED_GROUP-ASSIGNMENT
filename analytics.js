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

function money(n) {
  const x = safeNum(n, 0);
  return `$${x.toFixed(2)}`;
}

function pctChange(cur, prev) {
  const c = safeNum(cur, 0);
  const p = safeNum(prev, 0);
  if (p === 0) return null;
  return ((c - p) / p) * 100;
}

/* ---------------------------
   Chart instances
--------------------------- */
let salesChart;
let categoryChart;

/* ---------------------------
    Find current vendor stallId
--------------------------- */
function getCurrentStallId() {
  const keys = ["stallId", "vendorStallId", "selectedStallId", "currentStallId"];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  
  // sessionStorage
  for (const k of keys) {
    const v = sessionStorage.getItem(k);
    if (v && v.trim()) return v.trim();
  }
  
  return null;
}

/* ---------------------------
  date + buckets
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

function prevMonthKey(curMonthKey) {
  const [yy, mm] = curMonthKey.split("-").map(Number);
  const d = new Date(yy, mm - 1, 1);
  const p = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return monthKey(p);
}

/* ---------------------------
   Render Monthly Trend (LINE)
   shows REVENUE
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
        label: "Revenue ($)",
        data: values,
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => `Revenue: $${safeNum(context.raw, 0).toFixed(2)}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `$${value}`
          }
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
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
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
   Revenue + customer helpers
--------------------------- */
function calcStallRevenueFromOrder(orderObj, stallId) {
  const items = Array.isArray(orderObj?.items) ? orderObj.items : [];
  let total = 0;
  for (const it of items) {
    const itStall = it?.stallId || it?.StallID || null;
    if (stallId && itStall !== stallId) continue;
    const price = safeNum(it?.price, 0);
    const qty = safeNum(it?.qty, 1);
    total += price * qty;
  }
  return total;
}

function getCustomerKey(orderObj, docId) {
  return (
    orderObj?.userId ||
    orderObj?.uid ||
    orderObj?.customerId ||
    orderObj?.customerUID ||
    orderObj?.email ||
    orderObj?.customerEmail ||
    orderObj?.contactEmail ||
    orderObj?.contact?.email ||
    orderObj?.phone ||
    orderObj?.contact?.phone ||
    orderObj?.customerPhone ||
    orderObj?.customerName ||
    orderObj?.name ||
    `order:${docId}`
  );
}

/* ---------------------------
   Load analytics from orders
--------------------------- */
async function loadAnalyticsFromOrders() {
  // Get stallId first and show error if missing
  const stallId = getCurrentStallId();
  
  if (!stallId) {
    setText("statsDocLabel", "ERROR: NO STALL ID");
    setText("stallSubtitle", "⚠️ Cannot load analytics - vendor stall ID not found in localStorage/sessionStorage. Please log in again.");
    setText("kpiTotalRevenue", "$0.00");
    setText("kpiTotalOrders", "0");
    setText("kpiAvgOrderValue", "$0.00");
    setText("kpiTotalCustomers", "0");
    console.error("❌ STALL ID NOT FOUND. Check these keys:", ["stallId", "vendorStallId", "selectedStallId", "currentStallId"]);
    return;
  }

  setText("statsDocLabel", `DOC: ORDERS (Stall: ${stallId})`);

  const ordersSnap = await getDocs(collection(fs, "orders"));

  // Monthly trend (last 12)
  const monthlyOrders = {};
  const monthlyRevenue = {};

  for (const k of last12MonthKeys()) {
    monthlyOrders[k] = 0;
    monthlyRevenue[k] = 0;
  }

  // Current / previous month KPI buckets
  const now = new Date();
  const curMK = monthKey(now);
  const prevMK = prevMonthKey(curMK);

  let revenueCur = 0;
  let revenuePrev = 0;
  let ordersCur = 0;
  let ordersPrev = 0;

  const customersCur = new Set();
  const customersPrev = new Set();

  // Pie counts
  let pickupCount = 0;
  let deliveryCount = 0;
  let otherCount = 0;

  let usedCustomerFallback = false;

  // Track filtered vs total orders for debugging
  let totalOrdersInDB = 0;
  let filteredOrdersForStall = 0;

  for (const docSnap of ordersSnap.docs) {
    totalOrdersInDB++;
    const o = docSnap.data();

    // createdAt timestamp
    const createdAt =
      o.createdAt?.toDate ? o.createdAt.toDate()
      : o.timestamp?.toDate ? o.timestamp.toDate()
      : null;
    if (!createdAt) continue;

    // Strict stall filter - ALWAYS check stallId
    const topStall = o.stallId || o.StallID || null;
    const hasItemMatch = Array.isArray(o.items)
      ? o.items.some(it => (it?.stallId || it?.StallID) === stallId)
      : false;
    
    // match either top-level stallId OR have matching items
    if (topStall !== stallId && !hasItemMatch) {
      continue; // Skip this order - it's not from this stall
    }

    // order belongs to current stall
    filteredOrdersForStall++;

    // Revenue for this order (for this stall)
    const rev = calcStallRevenueFromOrder(o, stallId);

    // Monthly trend
    const mk = monthKey(createdAt);
    if (monthlyOrders[mk] !== undefined) monthlyOrders[mk] += 1;
    if (monthlyRevenue[mk] !== undefined) monthlyRevenue[mk] += rev;

    // KPI buckets (this month vs last month)
    const custKey = getCustomerKey(o, docSnap.id);
    if (String(custKey).startsWith("order:")) usedCustomerFallback = true;

    if (mk === curMK) {
      revenueCur += rev;
      ordersCur += 1;
      customersCur.add(String(custKey));
    } else if (mk === prevMK) {
      revenuePrev += rev;
      ordersPrev += 1;
      customersPrev.add(String(custKey));
    }

    // Delivery / pickup
    const methodRaw =
      o.collectionMethod ||
      o.method ||
      o.deliveryMethod ||
      o?.collection?.method ||
      "";
    const method = String(methodRaw).toLowerCase();
    if (method.includes("pickup") || method.includes("pick up") || method.includes("self")) pickupCount += 1;
    else if (method.includes("deliver")) deliveryCount += 1;
    else otherCount += 1;
  }

  // Check in browser console
  console.log("📊 ANALYTICS DEBUG:");
  console.log(`   Stall ID: ${stallId}`);
  console.log(`   Total orders in database: ${totalOrdersInDB}`);
  console.log(`   Orders for this stall: ${filteredOrdersForStall}`);
  console.log(`   Current month orders: ${ordersCur}`);
  console.log(`   Current month revenue: $${revenueCur.toFixed(2)}`);

  // Derived KPIs
  const aovCur = ordersCur ? (revenueCur / ordersCur) : 0;
  const aovPrev = ordersPrev ? (revenuePrev / ordersPrev) : 0;

  const custCurCount = customersCur.size;
  const custPrevCount = customersPrev.size;

  // --- Render KPI tiles ---
  setText("kpiTotalRevenue", money(revenueCur));
  {
    const p = pctChange(revenueCur, revenuePrev);
    if (p === null) setText("kpiTotalRevenueSub", "This month (no last month data)");
    else {
      const sign = p >= 0 ? "+" : "";
      setText("kpiTotalRevenueSub", `${sign}${p.toFixed(1)}% vs last month`);
    }
  }

  setText("kpiTotalOrders", String(ordersCur));
  {
    const p = pctChange(ordersCur, ordersPrev);
    if (p === null) setText("kpiTotalOrdersSub", "This month (no last month data)");
    else {
      const sign = p >= 0 ? "+" : "";
      setText("kpiTotalOrdersSub", `${sign}${p.toFixed(1)}% vs last month`);
    }
  }

  setText("kpiAvgOrderValue", money(aovCur));
  {
    const p = pctChange(aovCur, aovPrev);
    if (p === null) setText("kpiAvgOrderValueSub", "This month (no last month data)");
    else {
      const sign = p >= 0 ? "+" : "";
      setText("kpiAvgOrderValueSub", `${sign}${p.toFixed(1)}% vs last month`);
    }
  }

  setText("kpiTotalCustomers", String(custCurCount));
  {
    const p = pctChange(custCurCount, custPrevCount);
    if (p === null) setText("kpiTotalCustomersSub", "This month (no last month data)");
    else {
      const sign = p >= 0 ? "+" : "";
      setText("kpiTotalCustomersSub", `${sign}${p.toFixed(1)}% vs last month`);
    }
  }

  // if customer field is missing
  if (usedCustomerFallback) {
    const subtitle = document.getElementById("stallSubtitle");
    if (subtitle) {
      subtitle.textContent = "Analytics loaded from Firestore. (Customers = unique orders because no customerId/email found in order docs.)";
    }
  }

  // Charts
  renderSalesTrendFromMap(monthlyRevenue);
  renderPie(["Pickup", "Delivery", "Other"], [pickupCount, deliveryCount, otherCount]);
}

/* ---------------------------
   Start
--------------------------- */
loadAnalyticsFromOrders().catch(err => {
  console.error(err);
  setText("stallSubtitle", "Failed to load analytics from orders.");
});