// ===============================
// Checkout interactions + totals + save order history
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const paymentOptions = document.querySelectorAll(".pay-option");
  const proceedBtn = document.querySelector(".cta");

  // ===== Storage keys (same as your cart system) =====
  const CART_KEY = "hawkerhub_cart";
  const ECO_KEY = "hawkerhub_eco_packaging";
  const HISTORY_KEY = "hawkerhub_order_history";
  const ECO_FEE = 0.20;

  // ===== Helpers =====
  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function ecoOn() {
    return localStorage.getItem(ECO_KEY) === "true";
  }

  function formatMoney(n) {
    const num = Number(n) || 0;
    return `$${num.toFixed(2)}`;
  }

  function cartSubtotal(cart) {
    return cart.reduce((sum, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      return sum + qty * price;
    }, 0);
  }

  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveHistory(historyArr) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyArr));
  }

  function buildStallSummary(items) {
    const stalls = [...new Set(items.map((i) => i.stall).filter(Boolean))];
    if (stalls.length === 1) return stalls[0];
    if (stalls.length === 0) return "Order";
    return "Multiple stalls";
  }

  // ===== Update checkout summary amounts (right side) =====
  function updateCheckoutSummary() {
    const cart = readCart();
    const subtotal = cartSubtotal(cart);
    const total = subtotal + (ecoOn() ? ECO_FEE : 0);

    const subEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutTotal");

    // These IDs must exist in checkout.html
    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (totalEl) totalEl.textContent = formatMoney(total);

    return { cart, subtotal, total };
  }

  // Run once when page loads
  updateCheckoutSummary();

  // ===== Payment method highlight (your original code) =====
  paymentOptions.forEach((option) => {
    const radio = option.querySelector("input[type='radio']");

    radio.addEventListener("change", () => {
      paymentOptions.forEach((o) => o.classList.remove("is-selected"));
      option.classList.add("is-selected");
    });

    option.addEventListener("click", () => {
      radio.checked = true;
      paymentOptions.forEach((o) => o.classList.remove("is-selected"));
      option.classList.add("is-selected");
    });
  });

  // ===== Submit: save order into history + clear cart + redirect =====
  proceedBtn.addEventListener("click", () => {
    const { cart, subtotal, total } = updateCheckoutSummary();

    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    const history = readHistory();

    const order = {
      id: crypto.randomUUID?.() || String(Date.now()),
      orderNo: String(history.length + 1).padStart(3, "0"),
      status: "Paid",
      createdAt: new Date().toISOString(),
      stallSummary: buildStallSummary(cart),
      items: cart,
      subtotal,
      ecoFee: ecoOn() ? ECO_FEE : 0,
      total,
    };

    history.push(order);
    saveHistory(history);

    // Clear cart after successful "payment"
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(ECO_KEY);

    // Go to success page
    window.location.href = "PaymentSuccesss.html";
  });
});
