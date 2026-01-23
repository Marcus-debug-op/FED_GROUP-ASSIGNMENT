const CART_KEY = "hawkerhub_cart";
const ECO_KEY = "hawkerhub_eco_packaging";
const ECO_FEE = 0.20;

// ✅ CHANGE THIS to your real browse stalls file name
const BROWSE_PAGE = "browsestalls.html";

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

function readEco() {
  return localStorage.getItem(ECO_KEY) === "true";
}

function saveEco(isOn) {
  localStorage.setItem(ECO_KEY, String(!!isOn));
}

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

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[m];
  });
}

const IMAGE_MAP = {
  "Steamed Chicken Rice": "img/Ah Seng Chicken Rice.jpg",
  "Braised Chicken Rice": "img/red-pork-rice-famous-thai-food-recipe.jpg",
  "Lemon Chicken Rice": "img/spicy-salad-with-fried-chicken.jpg",
  "Crispy Prata": "img/spicy-salad-with-fried-chicken.jpg"
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
      window.location.href = "checkout.html";
    });
  }
}

function bindEcoCheckbox() {
  const ecoCheckbox = document.getElementById("ecoPackaging");
  if (!ecoCheckbox) return;

  ecoCheckbox.checked = readEco();

  ecoCheckbox.addEventListener("change", () => {
    saveEco(ecoCheckbox.checked);
    updateSummary(readCart());
  });
}

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
      img: btn.dataset.img || ""
    };

    const existing = cart.find((x) => x.id === newItem.id);
    if (existing) existing.qty = (Number(existing.qty) || 1) + 1;
    else cart.push(newItem);

    saveCart(cart);

    if (document.querySelector(".cart-items-area")) {
      updateBannerCount(cartCount(cart));
      renderCart(cart);
      updateSummary(cart);
    }
  });
}

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
      return;
    }

    if (action === "inc") {
      const current = Number(card.querySelector(".qty")?.textContent) || 1;
      const updated = setQty(id, current + 1);
      updateBannerCount(cartCount(updated));
      renderCart(updated);
      updateSummary(updated);
      return;
    }

    if (action === "dec") {
      const current = Number(card.querySelector(".qty")?.textContent) || 1;
      const updated = setQty(id, Math.max(1, current - 1));
      updateBannerCount(cartCount(updated));
      renderCart(updated);
      updateSummary(updated);
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindEcoCheckbox();
  bindAddToCartButtons();
  bindCartItemActions();

  const cart = readCart();
  updateBannerCount(cartCount(cart));
  renderCart(cart);
  updateSummary(cart);
});
