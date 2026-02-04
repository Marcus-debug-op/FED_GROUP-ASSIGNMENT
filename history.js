// Import FIRESTORE SDKs
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- YOUR CONFIG (must match navbar-init.js) ---
const firebaseConfig = {
  apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
  authDomain: "hawkerhub-64e2d.firebaseapp.com",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

// ✅ Reuse existing Firebase app if already initialized (prevents duplicate-app error)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

// ============== STATE ==============
let allOrders = [];

// ============== UTILS ==============
function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

function formatDate(createdAt) {
  let d = null;

  if (createdAt && typeof createdAt.toDate === "function") d = createdAt.toDate();
  else if (createdAt instanceof Date) d = createdAt;
  else d = new Date(createdAt);

  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// ============== UI NAV (MATCHES YOUR HTML IDS) ==============
function showList() {
  document.getElementById("listView")?.classList.remove("hidden");
  document.getElementById("detailView")?.classList.add("hidden");
}

function showDetail(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) {
    alert("Order details not found.");
    return;
  }

  document.getElementById("listView")?.classList.add("hidden");
  document.getElementById("detailView")?.classList.remove("hidden");

  const detailEl = document.getElementById("detailsBody");
  if (!detailEl) return;

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal) || 0;
  const ecoFee = Number(order.ecoFee) || 0;
  const discount = Number(order.discount) || 0;
  const total = Number(order.total) || 0;

  const promoRow = order.promoCode
    ? `
      <div class="detail-row">
        <span>Promo Code</span>
        <strong>${escapeHtml(order.promoCode)}</strong>
      </div>
    `
    : "";

  const discountRow = discount > 0
    ? `
      <div class="detail-row">
        <span>Discount</span>
        <strong>-${escapeHtml(formatMoney(discount))}</strong>
      </div>
    `
    : "";

  detailEl.innerHTML = `
    <div class="detail-header">
      <div>
        <h2>Order #${escapeHtml(order.orderNo || "---")}</h2>
        <div class="detail-meta">
          <span>${escapeHtml(formatDate(order.createdAt))}</span>
          <span class="pill">${escapeHtml(order.status || "Paid")}</span>
        </div>
      </div>
    </div>

    <div class="detail-items">
      ${items.map(i => `
        <div class="detail-item">
          <div class="detail-item-name">${escapeHtml(i.name || i.ItemDesc || "Item")}</div>
          <div class="detail-item-qty">x${escapeHtml(i.qty || 1)}</div>
          <div class="detail-item-price">${escapeHtml(formatMoney(i.price || 0))}</div>
        </div>
      `).join("")}
    </div>

    <div class="detail-summary">
      <div class="detail-row">
        <span>Subtotal</span>
        <strong>${escapeHtml(formatMoney(subtotal))}</strong>
      </div>

      <div class="detail-row">
        <span>Eco Packaging</span>
        <strong>${ecoFee > 0 ? "+" + escapeHtml(formatMoney(ecoFee)) : "$0.00"}</strong>
      </div>

      ${promoRow}
      ${discountRow}

      <div class="detail-total-row">
        <span>Total</span>
        <span>${escapeHtml(formatMoney(total))}</span>
      </div>
    </div>
  `;
}

// ================= RENDER LIST (Fetch from FIRESTORE) =================
async function loadHistory(uid) {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const loadingEl = document.getElementById("loadingMsg");

  if (listEl) listEl.innerHTML = "";
  if (loadingEl) {
    loadingEl.style.display = "block";
    loadingEl.textContent = "Loading orders...";
  }
  if (emptyEl) emptyEl.style.display = "none";

  try {
    const q = uid
      ? query(
          collection(db, "orders"),
          where("userId", "==", uid),
          orderBy("createdAt", "desc"),
          limit(30)
        )
      : query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(30));

    const snapshot = await getDocs(q);

    allOrders = [];
    snapshot.forEach((doc) => {
      allOrders.push({ id: doc.id, ...doc.data() });
    });

    if (loadingEl) loadingEl.style.display = "none";

    if (!allOrders.length) {
      if (emptyEl) {
        emptyEl.style.display = "block";
        emptyEl.textContent = "No orders found.";
      }
      return;
    }

    if (!listEl) return;

    listEl.innerHTML = allOrders.map((o) => {
      const stall = escapeHtml(o.stallSummary || "Multiple stalls");
      const date = escapeHtml(formatDate(o.createdAt));
      const total = escapeHtml(formatMoney(o.total));
      const orderNo = escapeHtml(o.orderNo || "---");
      const status = escapeHtml(o.status || "Paid");

      return `
        <div class="history-item">
          <div>
            <div class="history-meta-row">
              <span class="history-status-pill">${status}</span>
              <span class="history-order-no">#${orderNo}</span>
            </div>

            <div class="history-stall">${stall}</div>
            <div class="history-date">${date}</div>
            <div class="history-total">Total: ${total}</div>
          </div>

          <button class="history-view-btn view-btn" data-id="${o.id}" type="button">
            View Details
          </button>
        </div>
      `;
    }).join("");

    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => showDetail(e.currentTarget.dataset.id));
    });

  } catch (error) {
    console.error("Error fetching history:", error);
    if (loadingEl) loadingEl.style.display = "none";
    if (emptyEl) {
      emptyEl.style.display = "block";
      emptyEl.textContent = "Could not load orders (check console).";
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    loadHistory(user ? user.uid : null);
  });

  document.getElementById("backToListBtn")?.addEventListener("click", showList);

  document.getElementById("refreshBtn")?.addEventListener("click", () => {
    loadHistory(auth.currentUser ? auth.currentUser.uid : null);
  });
});
