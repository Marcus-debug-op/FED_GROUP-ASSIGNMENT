// Import Firebase SDKs (Realtime Database version)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, get, child } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// --- YOUR CONFIG (Same as checkout.js) ---
const firebaseConfig = {
  apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
  authDomain: "hawkerhub-64e2d.firebaseapp.com",
  databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

// ================= RENDER LIST (Fetch from Realtime DB) =================
async function loadHistory() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const loadingEl = document.getElementById("loadingMsg");

  // Reset UI
  listEl.innerHTML = "";
  loadingEl.style.display = "block";
  emptyEl.style.display = "none";

  try {
    // 1. Fetch from Realtime Database
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `orders`));

    allOrders = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      // Realtime DB returns an object of objects { "id1": {...}, "id2": {...} }
      // We convert this into an array
      Object.keys(data).forEach((key) => {
        allOrders.push({
          id: key,
          ...data[key]
        });
      });

      // Sort by createdAt descending (newest first)
      allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    loadingEl.style.display = "none";

    // 2. Handle empty state
    if (allOrders.length === 0) {
      emptyEl.style.display = "block";
      return;
    }

    // 3. Generate HTML
    listEl.innerHTML = allOrders.map((o) => {
      const stall = escapeHtml(o.stallSummary || "Multiple stalls");
      const date = escapeHtml(formatDate(o.createdAt));
      const total = escapeHtml(formatMoney(o.total));
      const orderNo = escapeHtml(o.orderNo || "---");
      const status = escapeHtml(o.status || "Paid");

      return `
        <div style="
          background:#fff;
          border-radius:16px;
          padding:16px 18px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          box-shadow:0 6px 16px rgba(0,0,0,0.06);
        ">
          <div>
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
              <span style="background:#d9fbe1; color:#0b6b2b; font-weight:800; padding:4px 10px; border-radius:999px; font-size:12px;">
                ${status}
              </span>
              <span style="color:#ff5a5a; font-weight:800; font-size:12px;">#${orderNo}</span>
            </div>
            <div style="font-weight:800;">${stall}</div>
            <div style="opacity:0.75; font-size:12px; margin-top:4px;">${date}</div>
            <div style="margin-top:8px; font-weight:800;">Total: ${total}</div>
          </div>

          <button class="view-btn" data-id="${o.id}" style="
            background:#ff6a00;
            color:#fff;
            border:0;
            padding:8px 12px;
            border-radius:10px;
            font-weight:800;
            cursor:pointer;
          ">
            View Details
          </button>
        </div>
      `;
    }).join("");

    // 4. Add Click Listeners
    document.querySelectorAll(".view-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.dataset.id;
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
        <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
          <div>
            <div style="font-weight:800;">${name}</div>
            <div style="opacity:0.7; font-size:12px;">Quantity ${qty}</div>
          </div>
          <div style="font-weight:800;">${escapeHtml(formatMoney(line))}</div>
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
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Promo Code</span>
        <span style="font-weight:900;">${promoCode}</span>
      </div>` : "";

  const discountRow = discount > 0 ? `
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Discount</span>
        <span style="font-weight:900; color:crimson;">-${escapeHtml(formatMoney(discount))}</span>
      </div>` : "";

  bodyEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
      <div>
        <div style="opacity:0.75; font-size:12px;">${date}</div>
        <div style="font-weight:900; font-size:18px; margin-top:6px;">Order #${escapeHtml(order.orderNo)}</div>
        <div style="margin-top:10px;"><b>Stall</b><br>${stall}</div>
      </div>
      <div style="background:#d9fbe1; color:#0b6b2b; font-weight:900; padding:8px 12px; border-radius:999px; font-size:13px;">
        ${status}
      </div>
    </div>

    <div style="margin-top:18px; font-weight:900;">Order Items</div>
    <div style="margin-top:8px;">${itemsHtml}</div>

    <div style="margin-top:16px; border-top:1px solid #ddd; padding-top:12px;">
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Subtotal</span>
        <span style="font-weight:900;">${escapeHtml(formatMoney(subtotal))}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Eco Packaging</span>
        <span style="font-weight:900;">${ecoFee > 0 ? "+" + escapeHtml(formatMoney(ecoFee)) : "$0.00"}</span>
      </div>
      ${promoRow}
      ${discountRow}
      <div style="display:flex; justify-content:space-between; margin-top:12px; font-size:18px;">
        <span style="font-weight:900;">Total</span>
        <span style="font-weight:900;">${escapeHtml(formatMoney(total))}</span>
      </div>
    </div>
  `;
}

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  loadHistory();

  // "Back to List" button event
  const backBtn = document.getElementById("backToListBtn");
  if(backBtn) {
    backBtn.addEventListener("click", () => {
      showList();
    });
  }

  // Refresh button event
  const refreshBtn = document.getElementById("refreshBtn");
  if(refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      loadHistory();
    });
  }
});