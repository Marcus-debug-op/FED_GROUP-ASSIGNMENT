// Import FIRESTORE SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- YOUR CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
  authDomain: "hawkerhub-64e2d.firebaseapp.com",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // CONNECT TO FIRESTORE

// Global variable to store orders
let allOrders = [];

// ================= UTILS =================
function formatMoney(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

// ================= VIEW TOGGLING =================
const listView = document.getElementById("listView");
const detailView = document.getElementById("detailView");

function showList() {
  listView.classList.remove("hidden");
  detailView.classList.add("hidden");
  window.scrollTo(0, 0);
}

function showDetail(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (order) {
    renderDetailView(order);
    listView.classList.add("hidden");
    detailView.classList.remove("hidden");
    window.scrollTo(0, 0);
  } else {
    alert("Order details not found.");
  }
}

// ================= RENDER LIST (Fetch from FIRESTORE) =================
async function loadHistory() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const loadingEl = document.getElementById("loadingMsg");

  // Reset UI
  listEl.innerHTML = "";
  loadingEl.style.display = "block";
  emptyEl.style.display = "none";

  try {
    // 1. Fetch from Firestore
    const q = query(collection(db, "orders"));
    const snapshot = await getDocs(q);

    allOrders = [];
    snapshot.forEach((doc) => {
      // Firestore separates ID from Data, so we merge them
      allOrders.push({ id: doc.id, ...doc.data() });
    });

    // Sort manually (Newest first)
    allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    loadingEl.style.display = "none";

    // 2. Handle empty state
    if (allOrders.length === 0) {
      emptyEl.style.display = "block";
      return;
    }

    // 3. Generate HTML (no inline styles; CSS classes instead)
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

    // 4. Add Click Listeners
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.id;
        showDetail(id);
      });
    });

  } catch (error) {
    console.error("Error fetching history:", error);
    loadingEl.textContent = "Error loading history. Check console.";
  }
}

// ================= RENDER DETAIL VIEW =================
function renderDetailView(order) {
  const bodyEl = document.getElementById("detailsBody");

  // Render Items List
  const itemsHtml = (order.items || []).map((i) => {
    const name = escapeHtml(i.name || "");
    const qty = Number(i.qty) || 0;
    const price = Number(i.price) || 0;
    const line = qty * price;

    return `
      <div class="detail-item-row">
        <div>
          <div class="detail-item-name">${name}</div>
          <div class="detail-item-qty">Quantity ${qty}</div>
        </div>
        <div class="detail-item-line">${escapeHtml(formatMoney(line))}</div>
      </div>
    `;
  }).join("");

  const stall = escapeHtml(order.stallSummary || "Multiple stalls");
  const date = escapeHtml(formatDate(order.createdAt));
  const status = escapeHtml(order.status || "Paid");
  const subtotal = Number(order.subtotal) || 0;
  const ecoFee = Number(order.ecoFee) || 0;
  const discount = Number(order.discount) || 0;
  const promoCode = escapeHtml(order.promoCode || "");
  const total = Number(order.total) || 0;

  const promoRow = promoCode ? `
    <div class="detail-row">
      <span>Promo Code</span>
      <strong>${promoCode}</strong>
    </div>
  ` : "";

  const discountRow = discount > 0 ? `
    <div class="detail-row">
      <span>Discount</span>
      <span class="detail-discount">-${escapeHtml(formatMoney(discount))}</span>
    </div>
  ` : "";

  bodyEl.innerHTML = `
    <div class="detail-top">
      <div>
        <div class="detail-date">${date}</div>
        <div class="detail-order">Order #${escapeHtml(order.orderNo)}</div>
        <div class="detail-stall-block"><b>Stall</b><br>${stall}</div>
      </div>
      <div class="detail-status-pill">${status}</div>
    </div>

    <div class="detail-section-title">Order Items</div>
    <div class="detail-items">${itemsHtml}</div>

    <div class="detail-totals">
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

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();

  // "Back to List" button event
  const backBtn = document.getElementById("backToListBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      showList();
    });
  }

  // Refresh button event
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadHistory();
    });
  }
});
