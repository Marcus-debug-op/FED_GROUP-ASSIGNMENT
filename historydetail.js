const HISTORY_KEY = "hawkerhub_order_history";

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
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

function getOrderIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function renderOrderDetails(order) {
  const titleEl = document.getElementById("orderTitle");
  const bodyEl = document.getElementById("detailsBody");

  if (titleEl) titleEl.textContent = `Order #${order.orderNo} Details`;

  const itemsHtml = (order.items || [])
    .map((i) => {
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
    })
    .join("");

  const stall = escapeHtml(order.stallSummary || "Multiple stalls");
  const date = escapeHtml(formatDate(order.createdAt));
  const status = escapeHtml(order.status || "Paid");

  // Values saved from checkout
  const subtotal = Number(order.subtotal) || 0;
  const ecoFee = Number(order.ecoFee) || 0;
  const discount = Number(order.discount) || 0;
  const promoCode = escapeHtml(order.promoCode || "");
  const total = Number(order.total) || Math.max(0, subtotal + ecoFee - discount);

  // Optional rows
  const promoRow = promoCode
    ? `
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Promo Code</span>
        <span style="font-weight:900;">${promoCode}</span>
      </div>
    `
    : "";

  const discountRow = discount > 0
    ? `
      <div style="display:flex; justify-content:space-between; margin-top:8px;">
        <span>Discount</span>
        <span style="font-weight:900; color:crimson;">-${escapeHtml(formatMoney(discount))}</span>
      </div>
    `
    : "";

  bodyEl.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
      <div>
        <div style="opacity:0.75; font-size:12px;">${date}</div>
        <div style="font-weight:900; font-size:18px; margin-top:6px;">Order #${escapeHtml(order.orderNo)}</div>
        <div style="margin-top:10px;"><b>Stall</b><br>${stall}</div>
      </div>

      <div style="
        background:#d9fbe1;
        color:#0b6b2b;
        font-weight:900;
        padding:8px 12px;
        border-radius:999px;
        font-size:13px;
        height: fit-content;
      ">${status}</div>
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

document.addEventListener("DOMContentLoaded", () => {
  const id = getOrderIdFromUrl();
  const emptyEl = document.getElementById("detailsEmpty");
  const bodyEl = document.getElementById("detailsBody");

  const orders = readHistory();
  const order = orders.find((o) => o.id === id);

  if (!order) {
    if (bodyEl) bodyEl.innerHTML = "";
    if (emptyEl) emptyEl.style.display = "block";
    return;
  }

  if (emptyEl) emptyEl.style.display = "none";
  renderOrderDetails(order);
});
