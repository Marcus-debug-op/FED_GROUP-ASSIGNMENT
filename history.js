// ===============================
// History page logic (render + clear)
// ===============================

const HISTORY_KEY = "hawkerhub_order_history";

// ---------- Helpers ----------
function readHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function formatMoney(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return map[m];
  });
}

// ---------- Render history ----------
function renderHistory() {
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");

  if (!listEl || !emptyEl) return;

  const orders = readHistory().slice().reverse(); // newest first

  if (!orders.length) {
    listEl.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";

  listEl.innerHTML = orders
    .map((o) => {
      const id = escapeHtml(o.orderNo || "");
      const stall = escapeHtml(o.stallSummary || "Multiple stalls");
      const date = escapeHtml(formatDate(o.createdAt));
      const total = escapeHtml(formatMoney(o.total));

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
              <span style="
                background:#d9fbe1;
                color:#0b6b2b;
                font-weight:800;
                padding:4px 10px;
                border-radius:999px;
                font-size:12px;
              ">Paid</span>

              <span style="color:#ff5a5a; font-weight:800; font-size:12px;">
                #${id}
              </span>
            </div>

            <div style="font-weight:800;">${stall}</div>
            <div style="opacity:0.75; font-size:12px; margin-top:4px;">
              ${date}
            </div>
            <div style="margin-top:8px; font-weight:800;">
              Total: ${total}
            </div>
          </div>

          <button
            type="button"
            data-view="${escapeHtml(o.id)}"
            style="
              background:#ff6a00;
              color:#fff;
              border:0;
              padding:8px 12px;
              border-radius:10px;
              font-weight:800;
              cursor:pointer;
            "
          >
            View Details
          </button>
        </div>
      `;
    })
    .join("");
}

// ---------- Clear history ----------
function bindClearHistory() {
  const clearBtn = document.getElementById("clearHistoryBtn");
  if (!clearBtn) return;

  clearBtn.addEventListener("click", () => {
    const ok = confirm("Are you sure you want to clear all order history?");
    if (!ok) return;

    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
  });
}

// ---------- View details ----------
function bindViewDetails() {
  const listEl = document.getElementById("historyList");
  if (!listEl) return;

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-view]");
    if (!btn) return;

    const orderId = btn.dataset.view;
    const orders = readHistory();
    const found = orders.find((o) => o.id === orderId);
    if (!found) return;

    alert(
      `Order #${found.orderNo}\n` +
        `Total: ${formatMoney(found.total)}\n\n` +
        `Items:\n` +
        found.items.map((i) => `- ${i.name} x${i.qty}`).join("\n")
    );
  });
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  renderHistory();
  bindClearHistory();
  bindViewDetails();
});
