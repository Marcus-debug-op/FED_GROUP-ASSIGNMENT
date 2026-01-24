document.addEventListener("DOMContentLoaded", () => {
  const paymentOptions = document.querySelectorAll(".pay-option");
  const proceedBtn = document.querySelector(".cta");

  // ===== Totals from cart =====
  const CART_KEY = "hawkerhub_cart";
  const ECO_KEY = "hawkerhub_eco_packaging";
  const ECO_FEE = 0.20;

  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
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

  function cartSubtotal(cart) {
    return cart.reduce((sum, x) => {
      const qty = Number(x.qty) || 0;
      const price = Number(x.price) || 0;
      return sum + qty * price;
    }, 0);
  }

  function ecoOn() {
    return localStorage.getItem(ECO_KEY) === "true";
  }

  function updateCheckoutSummary() {
    const cart = readCart();
    const subtotal = cartSubtotal(cart);
    const total = subtotal + (ecoOn() ? ECO_FEE : 0);

    const subEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutTotal");

    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (totalEl) totalEl.textContent = formatMoney(total);
  }

  updateCheckoutSummary();

  // ===== Payment option UI =====
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

  // Redirect to payment success page
  proceedBtn.addEventListener("click", () => {
    window.location.href = "PaymentSuccesss.html";
  });
});
