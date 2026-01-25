const CART_KEY = "hawkerhub_cart";
const ECO_KEY = "hawkerhub_eco_packaging";
const ECO_FEE = 0.20;

const BROWSE_PAGE = "browsestalls.html";
const CART_PAGE = "cart.html";

// ✅ Dot should appear ONLY on this page
const DOT_ALLOWED_PAGES = new Set(["AhSengMenu.html","Sataymenu.html","beancurdmenu.html","LaksaMenu.html","WokMasterMenu.html","MeeRebusMenu.html","SpringLeafMenu.html","NasiLemakMenu.html"]);

function currentFileName() {
  const p = window.location.pathname;
  return p.substring(p.lastIndexOf("/") + 1) || "";
}

function isDotAllowedHere() {
  return DOT_ALLOWED_PAGES.has(currentFileName());
}

/* ---------- Storage ---------- */
function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

/* ---------- Helpers ---------- */
function formatMoney(n) {
  const num = Number(n) || 0;
  return `$${num.toFixed(2)}`;
}

function cartCount(cart) {
  return cart.reduce((sum, x) => sum + (Number(x.qty) || 0), 0);
}

function cartSubtotal(cart) {
  return cart.reduce((sum, x) => {
    const qty = Number(x.qty) || 0;
    const price = Number(x.price) || 0;
    return sum + qty * price;
  }, 0);
}

function updateBannerCount(count) {
  const miniSub = document.querySelector(".cart-mini-sub");
  if (miniSub) miniSub.textContent = `${count} items`;
}

/* ---------- Eco packaging state ---------- */
function readEco() {
  return localStorage.getItem(ECO_KEY) === "true";
}

function saveEco(isOn) {
  localStorage.setItem(ECO_KEY, String(!!isOn));
}

/* ---------- Totals UI (cart page only elements) ---------- */
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

/* ---------- Red dot beside Cart tab (ONLY on AhSengMenu.html) ---------- */
function ensureCartDot() {
  if (!isDotAllowedHere()) return;

  const navCart =
    document.querySelector('a.navlink[href="cart.html"]') ||
    Array.from(document.querySelectorAll("a.navlink")).find(
      (a) => a.textContent.trim().toLowerCase() === "cart"
    );

  if (!navCart) return;

  navCart.setAttribute("href", CART_PAGE);

  if (!navCart.querySelector(".cart-dot")) {
    const dot = document.createElement("span");
    dot.className = "cart-dot";
    dot.setAttribute("aria-hidden", "true");
    navCart.appendChild(dot);
  }
}

function updateCartDot() {
  if (!isDotAllowedHere()) return;

  ensureCartDot();

  const cart = readCart();
  const count = cartCount(cart);

  const navCart =
    document.querySelector('a.navlink[href="cart.html"]') ||
    Array.from(document.querySelectorAll("a.navlink")).find(
      (a) => a.textContent.trim().toLowerCase() === "cart"
    );
  if (!navCart) return;

  const dot = navCart.querySelector(".cart-dot");
  if (!dot) return;

  dot.style.display = count > 0 ? "inline-block" : "none";
}

/* ---------- Toast notification ---------- */
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

  toast.style.background = "rgba(0,0,0,0.85)";
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
  }, 1200);
}

/* ---------- Render cart items (cart page only) ---------- */
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

const IMAGE_MAP = {
  "Steamed Chicken Rice": "img/Ah Seng Chicken Rice.jpg",
  "Braised Chicken Rice": "img/red-pork-rice-famous-thai-food-recipe.jpg",
  "Lemon Chicken Rice": "img/spicy-salad-with-fried-chicken.jpg",
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

      return `
        <div class="cart-item-card" data-id="${escapeHtml(item.id)}">
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
function setQty(id, newQty) {
  const cart = readCart();
  const item = cart.find((x) => x.id === id);
  if (!item) return cart;

  const qty = Math.max(1, Number(newQty) || 1);
  item.qty = qty;

  saveCart(cart);
  return cart;
}

function removeItem(id) {
  const cart = readCart().filter((x) => x.id !== id);
  saveCart(cart);
  return cart;
}

/* ---------- Navigation ---------- */
function bindNavigation() {
  const browseBtn = document.querySelector(".cart-browse-btn");
  if (browseBtn) {
    browseBtn.addEventListener("click", () => {
      window.location.href = BROWSE_PAGE;
    });
  }

  const continueLink = document.querySelector(".cart-continue");
  if (continueLink) {
    continueLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = BROWSE_PAGE;
    });
  }

  const proceed = document.getElementById("proceedCheckout");
  if (proceed) {
    proceed.addEventListener("click", () => {
      // ✅ ADDED VALIDATION (only change)
      const cart = readCart();
      if (!cart.length) {
        showToast("Your cart has no menu items");
        return;
      }

      window.location.href = "checkout.html";
    });
  }
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

/* ---------- Add-to-cart listener (menu pages) ---------- */
function bindAddToCartButtons() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;

    const cart = readCart();

    const newItem = {
      id: btn.dataset.id || (crypto.randomUUID?.() || String(Date.now())),
      name: btn.dataset.name || "Item",
      price: Number(btn.dataset.price) || 0,
      qty: Number(btn.dataset.qty) || 1,
      stall: btn.dataset.stall || "",
      img: btn.dataset.img || "",
    };

    const existing = cart.find((x) => x.id === newItem.id);
    if (existing) existing.qty = (Number(existing.qty) || 1) + 1;
    else cart.push(newItem);

    saveCart(cart);

    // ✅ toast everywhere
    showToast(`${newItem.name} added to cart`);

    // ✅ dot only on AhSengMenu.html
    updateCartDot();

    // If on cart page, refresh UI
    if (document.querySelector(".cart-items-area")) {
      updateBannerCount(cartCount(cart));
      renderCart(cart);
      updateSummary(cart);
    }
  });
}

/* ---------- Cart item actions ---------- */
function bindCartItemActions() {
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".cart-item-card");
    if (!card) return;

    const id = card.dataset.id;
    const action = e.target?.dataset?.action;
    if (!action) return;

    if (action === "remove") {
      const updated = removeItem(id);
      updateBannerCount(cartCount(updated));
      renderCart(updated);
      updateSummary(updated);
      updateCartDot();
      return;
    }

    if (action === "inc") {
      const current = Number(card.querySelector(".qty")?.textContent) || 1;
      const updated = setQty(id, current + 1);
      updateBannerCount(cartCount(updated));
      renderCart(updated);
      updateSummary(updated);
      updateCartDot();
      return;
    }

    if (action === "dec") {
      const current = Number(card.querySelector(".qty")?.textContent) || 1;
      const updated = setQty(id, Math.max(1, current - 1));
      updateBannerCount(cartCount(updated));
      renderCart(updated);
      updateSummary(updated);
      updateCartDot();
      return;
    }
  });
}

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindEcoCheckbox();
  bindAddToCartButtons();
  bindCartItemActions();

  // Dot only on AhSengMenu.html
  updateCartDot();

  // Cart page UI (only runs if elements exist)
  const cart = readCart();
  updateBannerCount(cartCount(cart));
  renderCart(cart);
  updateSummary(cart);
});
