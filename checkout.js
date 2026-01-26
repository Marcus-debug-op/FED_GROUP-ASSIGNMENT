document.addEventListener("DOMContentLoaded", () => {
  const paymentOptions = document.querySelectorAll(".pay-option");
  const proceedBtn = document.querySelector(".cta");

  // ===== Storage keys =====
  const CART_KEY = "hawkerhub_cart";
  const ECO_KEY = "hawkerhub_eco_packaging";
  const HISTORY_KEY = "hawkerhub_order_history";
  const COUPON_KEY = "hawkerhub_coupon";

  // card storage
  const CARD_DETAILS_KEY = "hawkerhub_card_details";

  const ECO_FEE = 0.20;

  // ===== Promo rules =====
  const PROMOS = {
    FIRSTORDER: { type: "percent", value: 0.35, firstOrderOnly: true },
    HAWKER20: { type: "flat", value: 5, minSubtotal: 10 },
    FREESHIP: { type: "freeship" },
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
    const day = new Date().getDay();
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

  // =========================
  // Delivery show/hide
  // =========================
  const collectionMethod = document.getElementById("collectionMethod");
  const deliveryAddressField = document.getElementById("deliveryAddressField");
  const postalCodeField = document.getElementById("postalCodeField");
  const deliveryAddress = document.getElementById("deliveryAddress");
  const postalCode = document.getElementById("postalCode");

  function applyDeliveryUI() {
    const method = String(collectionMethod?.value || "Pickup");
    const show = method === "Delivery";

    if (deliveryAddressField) deliveryAddressField.style.display = show ? "block" : "none";
    if (postalCodeField) postalCodeField.style.display = show ? "block" : "none";

    if (!show) {
      if (deliveryAddress) deliveryAddress.value = "";
      if (postalCode) postalCode.value = "";
      // clear red borders when switching back
      clearInvalid(deliveryAddress);
      clearInvalid(postalCode);
    }
  }

  if (collectionMethod) {
    collectionMethod.addEventListener("change", applyDeliveryUI);
    applyDeliveryUI();
  }

  // =========================
  // ✅ RESTORED: Checkout form validation
  // =========================
  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phoneNumber");

  function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function normalizePhone(raw) {
    const digits = digitsOnly(raw);
    // +65XXXXXXXX -> keep last 8
    if (digits.startsWith("65") && digits.length === 10) return digits.slice(2);
    return digits;
  }

  function isValidSGPhone(raw) {
    const p = normalizePhone(raw);
    // SG numbers are 8 digits, often start 6/8/9
    return /^[689]\d{7}$/.test(p);
  }

  function normalizePostal(raw) {
    return digitsOnly(raw);
  }

  function isValidSGPostal(raw) {
    return /^\d{6}$/.test(normalizePostal(raw));
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
    // reset
    [fullNameInput, phoneInput, collectionMethod, deliveryAddress, postalCode].forEach(clearInvalid);

    const name = String(fullNameInput?.value || "").trim();
    const phoneRaw = String(phoneInput?.value || "").trim();
    const method = String(collectionMethod?.value || "Pickup").trim();

    const errors = [];

    if (!name) {
      errors.push("Please enter your full name.");
      markInvalid(fullNameInput);
    }

    if (!phoneRaw) {
      errors.push("Please enter your phone number.");
      markInvalid(phoneInput);
    } else if (!isValidSGPhone(phoneRaw)) {
      errors.push("Please enter a valid Singapore phone number (e.g. 91234567 or +65 9123 4567).");
      markInvalid(phoneInput);
    }

    // method always has value in your HTML (Pickup/Delivery), but we keep this safe anyway
    if (!method) {
      errors.push("Please select a collection method.");
      markInvalid(collectionMethod);
    }

    let addr = "";
    let postal = "";

    if (method === "Delivery") {
      addr = String(deliveryAddress?.value || "").trim();
      postal = String(postalCode?.value || "").trim();

      if (!addr) {
        errors.push("Please enter your delivery address.");
        markInvalid(deliveryAddress);
      }

      if (!postal) {
        errors.push("Please enter your postal code.");
        markInvalid(postalCode);
      } else if (!isValidSGPostal(postal)) {
        errors.push("Please enter a valid 6-digit postal code (e.g. 123456).");
        markInvalid(postalCode);
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
      deliveryAddress: method === "Delivery" ? addr : "",
      postalCode: method === "Delivery" ? normalizePostal(postal) : "",
    };
  }

  // optional: clear red border while typing
  if (fullNameInput) fullNameInput.addEventListener("input", () => clearInvalid(fullNameInput));
  if (phoneInput) phoneInput.addEventListener("input", () => clearInvalid(phoneInput));
  if (deliveryAddress) deliveryAddress.addEventListener("input", () => clearInvalid(deliveryAddress));
  if (postalCode) postalCode.addEventListener("input", () => clearInvalid(postalCode));
  if (collectionMethod) collectionMethod.addEventListener("change", () => clearInvalid(collectionMethod));

  // =========================
  // Card modal helpers
  // =========================
  const overlay = document.getElementById("cardModalOverlay");
  const cardName = document.getElementById("cardName");
  const cardNumber = document.getElementById("cardNumber");
  const cardExpiry = document.getElementById("cardExpiry");
  const cardCvv = document.getElementById("cardCvv");
  const cardAddBtn = document.getElementById("cardAddBtn");
  const cardCancelBtn = document.getElementById("cardCancelBtn");
  const cardErr = document.getElementById("cardModalError");

  let lastPayValue = "card";

  function getSelectedPayValue() {
    const checked = document.querySelector('input[name="pay"]:checked');
    return checked ? String(checked.value || "") : "";
  }

  function setSelectedPayValue(val) {
    const radio = document.querySelector(`input[name="pay"][value="${val}"]`);
    if (radio) radio.checked = true;

    paymentOptions.forEach((o) => o.classList.remove("is-selected"));
    const label = radio ? radio.closest(".pay-option") : null;
    if (label) label.classList.add("is-selected");
  }

  function readCardDetails() {
    try {
      const raw = localStorage.getItem(CARD_DETAILS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveCardDetails(details) {
    localStorage.setItem(CARD_DETAILS_KEY, JSON.stringify(details));
  }

  function clearCardError() {
    if (!cardErr) return;
    cardErr.style.display = "none";
    cardErr.textContent = "";
  }

  function showCardError(msg) {
    if (!cardErr) return;
    cardErr.style.display = "block";
    cardErr.textContent = msg;
  }

  function openCardModal() {
    if (!overlay) return;

    clearCardError();

    const saved = readCardDetails();
    if (saved) {
      if (cardName) cardName.value = saved.name || "";
      if (cardNumber) cardNumber.value = "";
      if (cardExpiry) cardExpiry.value = saved.expiry || "";
      if (cardCvv) cardCvv.value = "";
    } else {
      if (cardName) cardName.value = "";
      if (cardNumber) cardNumber.value = "";
      if (cardExpiry) cardExpiry.value = "";
      if (cardCvv) cardCvv.value = "";
    }

    overlay.style.display = "flex";
    overlay.setAttribute("aria-hidden", "false");

    setTimeout(() => {
      if (cardName) cardName.focus();
    }, 0);
  }

  function closeCardModal() {
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.setAttribute("aria-hidden", "true");
    clearCardError();
  }

  function isValidCardNumber(num) {
    const d = digitsOnly(num);
    return d.length >= 13 && d.length <= 19;
  }

  function isValidExpiry(mmYY) {
    const v = String(mmYY || "").trim();
    const m = v.match(/^(\d{2})\s*\/\s*(\d{2})$/);
    if (!m) return false;

    const mm = Number(m[1]);
    const yy = Number(m[2]);
    if (mm < 1 || mm > 12) return false;

    const now = new Date();
    const curYY = now.getFullYear() % 100;
    const curMM = now.getMonth() + 1;

    if (yy < curYY) return false;
    if (yy === curYY && mm < curMM) return false;

    return true;
  }

  function isValidCvv(cvv) {
    const d = digitsOnly(cvv);
    return d.length === 3 || d.length === 4;
  }

  function maskCardNumber(num) {
    const d = digitsOnly(num);
    const last4 = d.slice(-4);
    return last4 ? `**** **** **** ${last4}` : "";
  }

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        handleCardCancel();
      }
    });
  }

  function handleCardCancel() {
    const saved = readCardDetails();
    closeCardModal();

    if (!saved && lastPayValue && lastPayValue !== "card") {
      setSelectedPayValue(lastPayValue);
    }
  }

  if (cardCancelBtn) cardCancelBtn.addEventListener("click", handleCardCancel);

  if (cardAddBtn) {
    cardAddBtn.addEventListener("click", () => {
      clearCardError();

      const name = String(cardName?.value || "").trim();
      const number = String(cardNumber?.value || "").trim();
      const expiry = String(cardExpiry?.value || "").trim();
      const cvv = String(cardCvv?.value || "").trim();

      if (!name) return showCardError("Please enter the name on card.");
      if (!isValidCardNumber(number)) return showCardError("Please enter a valid card number.");
      if (!isValidExpiry(expiry)) return showCardError("Please enter a valid expiry date (MM/YY).");
      if (!isValidCvv(cvv)) return showCardError("Please enter a valid security code (3–4 digits).");

      const details = {
        name,
        numberMasked: maskCardNumber(number),
        expiry,
        savedAt: new Date().toISOString(),
      };

      saveCardDetails(details);
      closeCardModal();
      setSelectedPayValue("card");
    });
  }

  // ---------- Promo calculation ----------
  function computeDiscount(subtotal, code) {
    if (!code) return { ok: true, discount: 0, message: "" };

    const promo = PROMOS[code];
    if (!promo) return { ok: false, discount: 0, message: "Invalid promo code." };

    if (code === "FIRSTORDER") {
      const history = readHistory();
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

    const subEl = document.getElementById("checkoutSubtotal");
    const totalEl = document.getElementById("checkoutTotal");
    if (subEl) subEl.textContent = formatMoney(subtotal);
    if (totalEl) totalEl.textContent = formatMoney(total);

    const ecoRow = document.getElementById("checkoutEcoRow");
    const ecoAmt = document.getElementById("checkoutEcoFee");
    if (ecoRow) ecoRow.style.display = ecoFee > 0 ? "flex" : "none";
    if (ecoAmt) ecoAmt.textContent = `+${formatMoney(ecoFee)}`;

    const discountRow = document.getElementById("discountRow");
    const discountAmt = document.getElementById("discountAmount");
    if (discountRow) discountRow.style.display = discount > 0 ? "flex" : "none";
    if (discountAmt) discountAmt.textContent = `-${formatMoney(discount)}`;

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

  // ---------- Payment option highlight + open modal on card select ----------
  paymentOptions.forEach((option) => {
    const radio = option.querySelector("input[type='radio']");
    if (!radio) return;

    radio.addEventListener("change", () => {
      const current = getSelectedPayValue();
      if (current && current !== "card") lastPayValue = current;

      paymentOptions.forEach((o) => o.classList.remove("is-selected"));
      option.classList.add("is-selected");

      if (radio.value === "card") openCardModal();
    });

    option.addEventListener("click", () => {
      const current = getSelectedPayValue();
      if (current && current !== "card") lastPayValue = current;

      radio.checked = true;
      paymentOptions.forEach((o) => o.classList.remove("is-selected"));
      option.classList.add("is-selected");

      if (radio.value === "card") openCardModal();
    });
  });

  // ---------- Submit: save order + clear cart ----------
  proceedBtn.addEventListener("click", () => {
    const info = updateCheckoutSummary();

    if (!info.cart.length) {
      alert("Your cart is empty.");
      return;
    }

    // ✅ Validate contact + delivery info BEFORE payment checks
    const form = validateCheckoutForm();
    if (!form.ok) return;

    // ✅ If card selected but no card saved, force modal
    const pay = getSelectedPayValue();
    if (pay === "card") {
      const saved = readCardDetails();
      if (!saved) {
        alert("Please add your card details before submitting.");
        openCardModal();
        return;
      }
    }

    const history = readHistory();

    const order = {
      id: crypto.randomUUID?.() || String(Date.now()),
      orderNo: String(history.length + 1).padStart(3, "0"),
      status: "Paid",
      createdAt: new Date().toISOString(),
      stallSummary: buildStallSummary(info.cart),
      items: info.cart,
      subtotal: info.subtotal,
      ecoFee: info.ecoFee,
      discount: info.discount,
      promoCode: info.promoCode || "",
      total: info.total,

      // ✅ store payment type + masked card (demo)
      payment: {
        method: pay,
        card: pay === "card" ? readCardDetails() : null,
      },

      // ✅ store contact + collection info
      contact: {
        fullName: form.fullName,
        phone: form.phone,
      },
      collection: {
        method: form.method,
        deliveryAddress: form.deliveryAddress,
        postalCode: form.postalCode,
      },
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
