document.addEventListener("DOMContentLoaded", () => {
  const paymentOptions = document.querySelectorAll(".pay-option");
  const proceedBtn = document.querySelector(".cta");

  // ===== Storage keys =====
  const CART_KEY = "hawkerhub_cart";
  const ECO_KEY = "hawkerhub_eco_packaging";
  const HISTORY_KEY = "hawkerhub_order_history";
  const COUPON_KEY = "hawkerhub_coupon";

  const ECO_FEE = 0.20;

  // ===== Promo rules based on your screenshot =====
  const PROMOS = {
    FIRSTORDER: { type: "percent", value: 0.35, firstOrderOnly: true },
    HAWKER20: { type: "flat", value: 5, minSubtotal: 10 },
    FREESHIP: { type: "freeship" }, // no delivery fee in your checkout now, so it just shows as applied
    WEEKDAY80: { type: "percent", value: 0.15, weekdayOnly: true },
  };

  // ---------- Helpers ----------
  function readCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function readEco() {
    return localStorage.getItem(ECO_KEY) === "true";
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

  function saveHistory(arr) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
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

  function normalizeCode(code) {
    return String(code || "").trim().toUpperCase();
  }

  function isWeekday() {
    const day = new Date().getDay(); // 0 Sun ... 6 Sat
    return day >= 1 && day <= 5;
  }

  function getAppliedCode() {
    return normalizeCode(localStorage.getItem(COUPON_KEY) || "");
  }

  function setAppliedCode(code) {
    localStorage.setItem(COUPON_KEY, normalizeCode(code));
  }

  function clearAppliedCode() {
    localStorage.removeItem(COUPON_KEY);
  }

  function buildStallSummary(items) {
    const stalls = [...new Set(items.map((i) => i.stall).filter(Boolean))];
    if (stalls.length === 1) return stalls[0];
    if (stalls.length === 0) return "Order";
    return "Multiple stalls";
  }

  // ---------- ✅ NEW: get fields ----------
  function getCheckoutFields() {
    const cards = document.querySelectorAll(".checkout-left .card");
    const contactCard = cards[0];
    const pickupCard = cards[1];

    const contactInputs = contactCard
      ? contactCard.querySelectorAll('input[type="text"]')
      : [];
    const nameInput = contactInputs[0] || null;
    const phoneInput = contactInputs[1] || null;

    const methodSelect = document.getElementById("collectionMethod");
    const pickupInputs = pickupCard
      ? pickupCard.querySelectorAll('input[type="text"]')
      : [];
    const instructionsInput = pickupInputs[0] || null;

    const deliveryAddressField = document.getElementById("deliveryAddressField");
    const postalCodeField = document.getElementById("postalCodeField");
    const deliveryAddressInput = document.getElementById("deliveryAddress");
    const postalCodeInput = document.getElementById("postalCode");

    return {
      nameInput,
      phoneInput,
      methodSelect,
      instructionsInput,
      deliveryAddressField,
      postalCodeField,
      deliveryAddressInput,
      postalCodeInput,
    };
  }

  // ---------- ✅ NEW: delivery show/hide ----------
  function bindDeliveryToggle() {
    const {
      methodSelect,
      deliveryAddressField,
      postalCodeField,
      deliveryAddressInput,
      postalCodeInput,
    } = getCheckoutFields();

    if (!methodSelect) return;

    const apply = () => {
      const method = String(methodSelect.value || "").trim();
      const show = method === "Delivery";

      if (deliveryAddressField) deliveryAddressField.style.display = show ? "block" : "none";
      if (postalCodeField) postalCodeField.style.display = show ? "block" : "none";

      if (!show) {
        if (deliveryAddressInput) deliveryAddressInput.value = "";
        if (postalCodeInput) postalCodeInput.value = "";
      }
    };

    methodSelect.addEventListener("change", apply);
    apply();
  }

  // ---------- ✅ NEW: validation ----------
  function normalizePhone(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    if (digits.startsWith("65") && digits.length === 10) return digits.slice(2);
    return digits;
  }

  function isValidSGPhone(raw) {
    const p = normalizePhone(raw);
    return /^[689]\d{7}$/.test(p);
  }

  function normalizePostal(raw) {
    return String(raw || "").replace(/\D/g, "");
  }

  function isValidSGPostal(raw) {
    const p = normalizePostal(raw);
    return /^\d{6}$/.test(p);
  }

  function markInvalid(el) {
    if (!el) return;
    el.style.borderColor = "crimson";
  }

  function clearInvalid(el) {
    if (!el) return;
    el.style.borderColor = "";
  }

  function validateCheckoutForm() {
    const {
      nameInput,
      phoneInput,
      methodSelect,
      deliveryAddressInput,
      postalCodeInput,
    } = getCheckoutFields();

    [nameInput, phoneInput, methodSelect, deliveryAddressInput, postalCodeInput].forEach(clearInvalid);

    const name = String(nameInput?.value || "").trim();
    const phoneRaw = String(phoneInput?.value || "").trim();
    const method = String(methodSelect?.value || "").trim();

    const errors = [];

    if (!name) {
      errors.push("Please enter your full name.");
      markInvalid(nameInput);
    }

    if (!phoneRaw) {
      errors.push("Please enter your phone number.");
      markInvalid(phoneInput);
    } else if (!isValidSGPhone(phoneRaw)) {
      errors.push("Please enter a valid Singapore phone number (e.g. 91234567 or +65 9123 4567).");
      markInvalid(phoneInput);
    }

    if (!method) {
      errors.push("Please select a collection method.");
      markInvalid(methodSelect);
    }

    let deliveryAddress = "";
    let postalCode = "";

    if (method === "Delivery") {
      deliveryAddress = String(deliveryAddressInput?.value || "").trim();
      postalCode = String(postalCodeInput?.value || "").trim();

      if (!deliveryAddress) {
        errors.push("Please enter your delivery address.");
        markInvalid(deliveryAddressInput);
      }

      if (!postalCode) {
        errors.push("Please enter your postal code.");
        markInvalid(postalCodeInput);
      } else if (!isValidSGPostal(postalCode)) {
        errors.push("Please enter a valid 6-digit postal code (e.g. 123456).");
        markInvalid(postalCodeInput);
      }
    }

    if (errors.length) {
      alert(errors.join("\n"));
      return { ok: false };
    }

    return {
      ok: true,
      fullName: name,
      phone: normalizePhone(phoneRaw),
      method,
      deliveryAddress: method === "Delivery" ? deliveryAddress : "",
      postalCode: method === "Delivery" ? normalizePostal(postalCode) : "",
    };
  }

  // ---------- Promo calculation ----------
  function computeDiscount(subtotal, code) {
    if (!code) return { ok: true, discount: 0, message: "" };

    const promo = PROMOS[code];
    if (!promo) return { ok: false, discount: 0, message: "Invalid promo code." };

    if (code === "FIRSTORDER") {
      const history = readHistory();

      // If there is already at least 1 past paid order, reject
      if (history && history.length >= 1) {
        return {
          ok: false,
          discount: 0,
          message: "FIRSTORDER can only be used if you have no previous orders.",
        };
      }
    }

    if (promo.weekdayOnly && !isWeekday()) {
      return { ok: false, discount: 0, message: "WEEKDAY80 is only valid on weekdays (Mon–Fri)." };
    }

    if (promo.minSubtotal != null && !(subtotal > promo.minSubtotal)) {
      return { ok: false, discount: 0, message: "HAWKER20 requires subtotal above $10." };
    }

    if (promo.type === "freeship") {
      return { ok: true, discount: 0, message: "FREESHIP applied." };
    }

    if (promo.type === "percent") {
      return { ok: true, discount: subtotal * promo.value, message: `${code} applied.` };
    }

    if (promo.type === "flat") {
      return { ok: true, discount: Math.min(promo.value, subtotal), message: `${code} applied.` };
    }

    return { ok: false, discount: 0, message: "Promo rule error." };
  }

  // ---------- Update UI totals ----------
  function updateCheckoutSummary() {
    const cart = readCart();
    const subtotal = cartSubtotal(cart);
    const ecoFee = readEco() ? ECO_FEE : 0;

    const code = getAppliedCode();
    const promoResult = computeDiscount(subtotal, code);
    const discount = promoResult.ok ? promoResult.discount : 0;

    const total = Math.max(0, subtotal + ecoFee - discount);

    // Subtotal/Total
    const subEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutTotal");
    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (totalEl) totalEl.textContent = formatMoney(total);

    // Eco row
    const ecoRow = document.getElementById("checkoutEcoRow");
    const ecoAmt = document.getElementById("checkoutEcoFee");
    if (ecoRow) ecoRow.style.display = ecoFee > 0 ? "flex" : "none";
    if (ecoAmt) ecoAmt.textContent = `+${formatMoney(ecoFee)}`;

    // Discount row
    const discountRow = document.getElementById("discountRow");
    const discountAmt = document.getElementById("discountAmount");
    if (discountRow) discountRow.style.display = discount > 0 ? "flex" : "none";
    if (discountAmt) discountAmt.textContent = `-${formatMoney(discount)}`;

    // Promo message
    const promoMsg = document.getElementById("promoMsg");
    if (promoMsg) {
      promoMsg.textContent = code ? promoResult.message : "";
      promoMsg.style.color = promoResult.ok ? "green" : "crimson";
    }

    return { cart, subtotal, ecoFee, discount, total, promoCode: code };
  }

  // ---------- Promo input handlers ----------
  const promoInput = document.getElementById("promoCodeInput");
  const applyPromoBtn = document.getElementById("applyPromoBtn");

  if (promoInput) promoInput.value = getAppliedCode();

  if (applyPromoBtn && promoInput) {
    applyPromoBtn.addEventListener("click", () => {
      const code = normalizeCode(promoInput.value);

      if (!code) {
        clearAppliedCode();
        updateCheckoutSummary();
        return;
      }

      setAppliedCode(code);
      updateCheckoutSummary();
    });
  }

  // Initial render
  updateCheckoutSummary();

  // ✅ NEW: delivery toggle
  bindDeliveryToggle();

  // ---------- Payment option highlight ----------
  paymentOptions.forEach((option) => {
    const radio = option.querySelector("input[type='radio']");
    if (!radio) return;

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

  // ---------- Submit: save order + clear cart ----------
  proceedBtn.addEventListener("click", () => {
    const info = updateCheckoutSummary();

    if (!info.cart.length) {
      alert("Your cart is empty.");
      return;
    }

    // ✅ NEW: validate required fields
    const form = validateCheckoutForm();
    if (!form.ok) return;

    const { instructionsInput } = getCheckoutFields();
    const instructions = String(instructionsInput?.value || "").trim();

    const history = readHistory();

    const order = {
      id: crypto.randomUUID?.() || String(Date.now()),
      orderNo: String(history.length + 1).padStart(3, "0"),
      status: "Paid",
      createdAt: new Date().toISOString(),
      stallSummary: buildStallSummary(info.cart),

      // ✅ NEW: save contact + collection info
      contact: {
        fullName: form.fullName,
        phone: form.phone,
      },
      collection: {
        method: form.method,
        instructions,
        deliveryAddress: form.deliveryAddress,
        postalCode: form.postalCode,
      },

      items: info.cart,
      subtotal: info.subtotal,
      ecoFee: info.ecoFee,
      discount: info.discount,
      promoCode: info.promoCode || "",
      total: info.total,
    };

    history.push(order);
    saveHistory(history);

    // Clear after payment
    localStorage.removeItem(CART_KEY);
    localStorage.removeItem(ECO_KEY);
    localStorage.removeItem(COUPON_KEY);

    window.location.href = "PaymentSuccesss.html";
  });
});
