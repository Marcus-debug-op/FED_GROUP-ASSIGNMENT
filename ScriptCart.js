
const CART_KEY = "hawkerhub_cart";
const ECO_KEY = "hawkerhub_eco_packaging";
const ECO_FEE = 0.20;

const BROWSE_PAGE = "browsestalls.html";
const CART_PAGE = "cart.html";


const DOT_ALLOWED_PAGES = new Set([
  "menus.html",
  "AhSengMenu.html",
  "Sataymenu.html",
  "beancurdmenu.html",
  "LaksaMenu.html",
  "WokMasterMenu.html",
  "MeeRebusMenu.html",
  "SpringLeafMenu.html",
  "NasiLemakMenu.html"
]);

function currentFileName() {
  const p = window.location.pathname;
  return p.substring(p.lastIndexOf("/") + 1) || "";
}
function isDotAllowedHere() {
  return DOT_ALLOWED_PAGES.has(currentFileName());
}


function makeKey(item) {
  if (item && item.id) return String(item.id);

  const stallId = item?.stallId ? String(item.stallId) : "";
  const itemId = item?.itemId ? String(item.itemId) : "";
  if (stallId && itemId) return `${stallId}__${itemId}`;

  return String(item?.name || "item") + "__" + String(item?.price || 0);
}

function normalizeItem(item) {
  const key = makeKey(item);

  return {
    id: key,
    name: item?.name || "Item",
    price: Number(item?.price) || 0,
    qty: Math.max(1, Number(item?.qty) || 1),
    img: item?.img || item?.image || "",
    stall: item?.stall || item?.stallName || "",
    ...item,
    id: key,
    qty: Math.max(1, Number(item?.qty) || 1),
    price: Number(item?.price) || 0,
    img: item?.img || item?.image || "",
    stall: item?.stall || item?.stallName || ""
  };
}

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const data = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(data)) return [];
    return data.map(normalizeItem);
  } catch {
    return [];
  }
}

function saveCart(cart) {
  const normalized = (cart || []).map(normalizeItem);
  localStorage.setItem(CART_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event("cart-updated"));
}

/* ---------- formatting ---------- */
function formatMoney(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}
function cartCount(cart) {
  return cart.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
}
function cartSubtotal(cart) {
  return cart.reduce((sum, x) => sum + (Number(x.qty) * Number(x.price || 0)), 0);
}

/* ---------- UI helpers ---------- */
function updateBannerCount(count) {
  const miniSub = document.querySelector(".cart-mini-sub");
  if (miniSub) miniSub.textContent = `${count} items`;
}

function readEco() {
  return localStorage.getItem(ECO_KEY) === "true";
}
function saveEco(v) {
  localStorage.setItem(ECO_KEY, String(!!v));
}

/* ---------- Cart summary UI ---------- */
function updateSummary(cart) {
  const subtotal = cartSubtotal(cart);
  const ecoOn = readEco();
  const total = subtotal + (ecoOn ? ECO_FEE : 0);

  const subtotalEl = document.getElementById("subtotalAmount");
  const totalEl = document.getElementById("totalAmount");
  const ecoRow = document.getElementById("ecoFeeRow");
  const ecoAmt = document.getElementById("ecoFeeAmount");

  if (subtotalEl) subtotalEl.textContent = formatMoney(subtotal);
  if (totalEl) totalEl.textContent = formatMoney(total);
  if (ecoRow) ecoRow.style.display = ecoOn ? "flex" : "none";
  if (ecoAmt) ecoAmt.textContent = formatMoney(ECO_FEE);
}

/* ---------- Cart dot handling (navbar) ---------- */
function findNavCartLink() {
  return (
    document.querySelector('a.navlink[href="cart.html"]') ||
    Array.from(document.querySelectorAll("a.navlink")).find(
      (a) => a.textContent.trim().toLowerCase() === "cart"
    )
  );
}

function ensureCartDot() {
  if (!isDotAllowedHere()) return false;

  const navCart = findNavCartLink();
  if (!navCart) return false;

  navCart.setAttribute("href", CART_PAGE);

  if (!navCart.querySelector(".cart-dot")) {
    const dot = document.createElement("span");
    dot.className = "cart-dot";
    dot.setAttribute("aria-hidden", "true");
    navCart.appendChild(dot);
  }

  return true;
}

function updateCartDot() {
  if (!isDotAllowedHere()) return;

  const ok = ensureCartDot();
  if (!ok) return;

  const cart = readCart();
  const count = cartCount(cart);

  const navCart = findNavCartLink();
  if (!navCart) return;

  const dot = navCart.querySelector(".cart-dot");
  if (!dot) return;

  dot.style.display = count > 0 ? "inline-block" : "none";
}

function updateCartDotWithRetry() {
  if (!isDotAllowedHere()) return;
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    updateCartDot();
    if (findNavCartLink() || tries >= 20) clearInterval(t);
  }, 150);
}

/* ---------- Toast ---------- */
function ensureToastHost() {
  if (document.getElementById("toastHost")) return;
  const host = document.createElement("div");
  host.id = "toastHost";
  host.style.position = "fixed";
  host.style.left = "50%";
  host.style.top = "18px";
  host.style.transform = "translateX(-50%)";
  host.style.zIndex = "9999";
  host.style.display = "grid";
  host.style.gap = "10px";
  host.style.pointerEvents = "none";
  document.body.appendChild(host);
}

function showToast(message) {
  ensureToastHost();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;

  toast.style.background = "#ff6a00";
  toast.style.color = "#fff";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "999px";
  toast.style.fontWeight = "900";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 10px 18px rgba(0,0,0,0.18)";
  toast.style.pointerEvents = "none";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(-6px)";
  toast.style.transition = "opacity 180ms ease, transform 180ms ease";

  const host = document.getElementById("toastHost");
  host.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 220);
  }, 1500);
}

/* ---------- Render cart (cart page) ---------- */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

const IMAGE_MAP = {
  "Steamed Chicken Rice": "img/Ah Seng Chicken Rice.jpg",
  "Braised Chicken Rice": "img/red-pork-rice-famous-thai-food-recipe.jpg",
  "Lemon Chicken Rice": "img/spicy-salad-with-fried-chicken.jpg"
};

function getItemImage(item) {
  return item.img || IMAGE_MAP[item.name] || "img/cart icon.png";
}

function renderCart(cart) {
  const itemsArea = document.querySelector(".cart-items-area");
  const emptyState = document.querySelector(".cart-empty-state");
  if (!itemsArea || !emptyState) return;

  if (!cart.length) {
    itemsArea.innerHTML = "";
    emptyState.style.display = "grid";
    return;
  }

  emptyState.style.display = "none";

  itemsArea.innerHTML = cart
    .map((item) => {
      const qty = Number(item.qty) || 1;
      const price = Number(item.price) || 0;
      const lineTotal = qty * price;
      const key = makeKey(item);

      return `
        <div class="cart-item-card" data-id="${escapeHtml(key)}">
          <div class="cart-item-left">
            <div class="cart-item-img">
              <img src="${escapeHtml(getItemImage(item))}" alt="${escapeHtml(item.name)}">
            </div>
            <div class="cart-item-info">
              <div class="cart-item-name">${escapeHtml(item.name)}</div>
              <div class="cart-item-stall">${escapeHtml(item.stall || "")}</div>
              <div class="cart-item-price">${formatMoney(price)}</div>
            </div>
          </div>

          <div class="cart-item-right">
            <button class="cart-remove" type="button" title="Remove" data-action="remove">🗑</button>

            <div class="qty-stepper">
              <button type="button" data-action="dec">-</button>
              <span class="qty">${qty}</span>
              <button type="button" data-action="inc">+</button>
            </div>

            <div class="cart-item-total">${formatMoney(lineTotal)}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

/* ---------- Mutations ---------- */
function setQty(key, newQty) {
  const cart = readCart();
  const idx = cart.findIndex((x) => makeKey(x) === key);
  if (idx === -1) return;

  cart[idx].qty = Math.max(1, Number(newQty) || 1);
  saveCart(cart);
  refreshCartUI(cart);
}

function removeItem(key) {
  const cart = readCart().filter((x) => makeKey(x) !== key);
  saveCart(cart);
  refreshCartUI(cart);
}

/* ---------- UI refresh ---------- */
function refreshCartUI(cart) {
  updateBannerCount(cartCount(cart));
  renderCart(cart);
  updateSummary(cart);
  updateCartDot();
}

/* ---------- Navigation ---------- */
function bindNavigation() {
  document.querySelector(".cart-browse-btn")?.addEventListener("click", () => {
    window.location.href = BROWSE_PAGE;
  });

  document.getElementById("proceedCheckout")?.addEventListener("click", () => {
    const cart = readCart();
    if (!cart.length) {
      showToast("Your cart has no menu items");
      return;
    }
    window.location.href = "checkout.html";
  });
}

/* ---------- Eco checkbox ---------- */
function bindEcoCheckbox() {
  const ecoCheckbox = document.getElementById("ecoPackaging");
  if (!ecoCheckbox) return;

  ecoCheckbox.checked = readEco();
  ecoCheckbox.addEventListener("change", () => {
    saveEco(ecoCheckbox.checked);
    updateSummary(readCart());
  });
}

/* ---------- Add-to-cart handler (toast included) ---------- */
function bindAddToCartButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;

    const itemName = decodeURIComponent(btn.dataset.name || "Item");

    if (btn.dataset.skipScriptcart === "1") {
      updateCartDot();
      showToast(`${itemName} added to cart`);
      return;
    }

    const cart = readCart();

    const key = btn.dataset.id || (crypto.randomUUID?.() || String(Date.now()));
    const newItem = normalizeItem({
      id: key,
      name: itemName,
      price: Number(btn.dataset.price) || 0,
      qty: Number(btn.dataset.qty) || 1,
      stall: decodeURIComponent(btn.dataset.stall || ""),
      img: decodeURIComponent(btn.dataset.img || "")
    });

    const existing = cart.find((x) => makeKey(x) === makeKey(newItem));
    if (existing) existing.qty = (Number(existing.qty) || 1) + 1;
    else cart.push(newItem);

    saveCart(cart);
    showToast(`${itemName} added to cart`);
    refreshCartUI(cart);
  });
}

/* ---------- Cart item actions (inc/dec/remove) ---------- */
function bindCartItemActions() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".cart-item-card");
    if (!card) return;

    const key = card.dataset.id;
    const action = e.target?.dataset?.action;
    if (!action) return;

    const cart = readCart();
    const item = cart.find((x) => makeKey(x) === key);
    if (!item) return;

    if (action === "remove") {
      removeItem(key);
      showToast("Item removed");
      return;
    }

    if (action === "inc") {
      setQty(key, (Number(item.qty) || 1) + 1);
      return;
    }

    if (action === "dec") {
      setQty(key, Math.max(1, (Number(item.qty) || 1) - 1));
      return;
    }
  });
}

/* ---------- INIT ---------- */
document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindEcoCheckbox();
  bindAddToCartButtons();
  bindCartItemActions();

  updateCartDotWithRetry();

  const cart = readCart();
  // save once to migrate
  saveCart(cart);
  refreshCartUI(cart);

  window.addEventListener("cart-updated", () => {
    const c = readCart();
    refreshCartUI(c);
  });
});
