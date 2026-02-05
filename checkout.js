// Import FIRESTORE SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Firebase configuration
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
const db = getFirestore(app); // CONNECT TO FIRESTORE
const auth = getAuth(app);

  // ===== Storage keys =====
  const CART_KEY = "hawkerhub_cart";
  const ECO_KEY = "hawkerhub_eco_packaging";
  const COUPON_KEY = "hawkerhub_coupon";
  const CARD_DETAILS_KEY = "hawkerhub_card_details";
  const ECO_FEE = 0.20;

  const PROMOS = {
    FIRSTORDER: { type: "percent", value: 0.35, firstOrderOnly: true },
    HAWKER20: { type: "flat", value: 5, minSubtotal: 10 },
    WEEKDAY80: { type: "percent", value: 0.15, weekdayOnly: true }
  };

  // ---------- Helpers ----------
  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }

  function readEco() {
    return localStorage.getItem(ECO_KEY) === "true";
  }

  function formatMoney(n) {
    return `$${(Number(n) || 0).toFixed(2)}`;
  }

  function digitsOnly(s) {
    return String(s || "").replace(/\D/g, "");
  }

  function readCardDetails() {
    try {
      return JSON.parse(localStorage.getItem(CARD_DETAILS_KEY));
    } catch {
      return null;
    }
  }

  function saveCardDetails(details) {
    localStorage.setItem(CARD_DETAILS_KEY, JSON.stringify(details));
  }

  function isWeekday() {
    const d = new Date().getDay(); // 0 Sun ... 6 Sat
    return d >= 1 && d <= 5;
  }

  // =========================
  // STRICT Validation Helpers
  // =========================
  function normalizePhone(raw) {
    const digits = digitsOnly(raw);
    if (digits.startsWith("65") && digits.length === 10) return digits.slice(2);
    return digits;
  }

  function isValidSGPhone(raw) {
    const p = normalizePhone(raw);
    return /^[689]\d{7}$/.test(p);
  }

  function isValidSGPostal(raw) {
    return /^\d{6}$/.test(digitsOnly(raw));
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

  // =========================
  // Form elements
  // =========================
  const collectionMethod = document.getElementById("collectionMethod");
  const deliveryAddressField = document.getElementById("deliveryAddressField");
  const postalCodeField = document.getElementById("postalCodeField");
  const deliveryAddress = document.getElementById("deliveryAddress");
  const postalCode = document.getElementById("postalCode");
  const fullNameInput = document.getElementById("fullName");
  const phoneInput = document.getElementById("phoneNumber");

  function applyDeliveryUI() {
    const isDelivery = collectionMethod?.value === "Delivery";
    if (deliveryAddressField) deliveryAddressField.style.display = isDelivery ? "block" : "none";
    if (postalCodeField) postalCodeField.style.display = isDelivery ? "block" : "none";
  }

  collectionMethod?.addEventListener("change", applyDeliveryUI);
  applyDeliveryUI();

  // =========================
  // STRICT Form Validation
  // =========================
  function validateCheckoutForm() {
    const name = String(fullNameInput?.value || "").trim();
    const phoneRaw = String(phoneInput?.value || "").trim();
    const method = String(collectionMethod?.value || "Pickup").trim();

    const errors = [];

    if (!name) errors.push("Please enter your full name.");
    if (!phoneRaw) errors.push("Please enter your phone number.");
    else if (!isValidSGPhone(phoneRaw)) errors.push("Please enter a valid Singapore phone number (e.g. 91234567).");

    if (method === "Delivery") {
      const addr = String(deliveryAddress?.value || "").trim();
      const postal = String(postalCode?.value || "").trim();

      if (!addr) errors.push("Please enter your delivery address.");
      if (!postal) errors.push("Please enter your postal code.");
      else if (!isValidSGPostal(postal)) errors.push("Please enter a valid 6-digit postal code.");
    }

    if (errors.length) {
      alert(errors.join("\n"));
      return { ok: false };
    }

    return { ok: true, fullName: name, phone: normalizePhone(phoneRaw), method };
  }

  // =========================
  // VISUAL HIGHLIGHTING (FIXED)
  // =========================
  const paymentOptions = document.querySelectorAll(".pay-option");
  let lastPayValue = document.querySelector('input[name="pay"]:checked')?.value || "card";

  function updateRedBorder() {
    paymentOptions.forEach(option => {
      const radio = option.querySelector("input[type='radio']");
      if (radio && radio.checked) option.classList.add("is-selected");
      else option.classList.remove("is-selected");
    });
  }

  // ✅ ALSO listen to radio change (covers clicking the circle + keyboard navigation)
  const paymentRadios = document.querySelectorAll('input[name="pay"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      if (!radio.checked) return;
      updateRedBorder();

      // Only open modal when user actually changes it
      if (e && e.isTrusted) {
        if (radio.value === "card") openCardModal();
        else if (radio.value === "paynow") openPayNowModal();
        else lastPayValue = radio.value;
      }
    });
  });

  // Keep your existing label click behavior too
  paymentOptions.forEach(option => {
    option.addEventListener("click", () => {
      const radio = option.querySelector("input[type='radio']");
      if (radio) {
        radio.checked = true;
        updateRedBorder();

        if (radio.value === "card") openCardModal();
        else if (radio.value === "paynow") openPayNowModal();
        else lastPayValue = radio.value;
      }
    });
  });

  updateRedBorder();

  // =========================
  // Modals
  // =========================
  const cardOverlay = document.getElementById("cardModalOverlay");
  const paynowOverlay = document.getElementById("paynowModalOverlay");
  const cardMsg = document.getElementById("cardModalError");
  const cardName = document.getElementById("cardName");
  const cardNumber = document.getElementById("cardNumber");
  const cardExpiry = document.getElementById("cardExpiry");
  const cardCvv = document.getElementById("cardCvv");

  function showCardError(msg) {
    if (!cardMsg) return;
    cardMsg.style.display = "block";
    cardMsg.textContent = msg;
    cardMsg.style.color = "#ff6b6b";
  }

  function openCardModal() {
    if (cardOverlay) {
      if (cardMsg) cardMsg.style.display = "none";
      cardOverlay.style.display = "flex";
      const saved = readCardDetails();
      if (saved && cardName) {
        cardName.value = saved.name || "";
        if (cardExpiry) cardExpiry.value = saved.expiry || "";
      }
    }
  }

  function openPayNowModal() {
    if (paynowOverlay) {
      paynowOverlay.style.display = "flex";
      document.getElementById("paynowQrWrap").style.display = "flex";
      document.getElementById("paynowSuccessMsg").style.display = "none";
    }
  }

  function closeModals() {
    if (cardOverlay) cardOverlay.style.display = "none";
    if (paynowOverlay) paynowOverlay.style.display = "none";
  }

  function handleRevert() {
    const current = document.querySelector('input[name="pay"]:checked')?.value;
    const saved = readCardDetails();
    if ((current === "card" && !saved) || current === "paynow") {
      const prevRadio = document.querySelector(`input[name="pay"][value="${lastPayValue}"]`);
      if (prevRadio) {
        prevRadio.checked = true;
        updateRedBorder();
      }
    }
  }

  document.getElementById("cardCancelBtn")?.addEventListener("click", () => { closeModals(); handleRevert(); });
  if (cardOverlay) cardOverlay.addEventListener("click", (e) => { if (e.target === cardOverlay) { closeModals(); handleRevert(); } });
  if (paynowOverlay) paynowOverlay.addEventListener("click", (e) => { if (e.target === paynowOverlay) { closeModals(); handleRevert(); } });

  document.getElementById("cardAddBtn")?.addEventListener("click", () => {
    const name = String(cardName?.value || "").trim();
    const number = String(cardNumber?.value || "").trim();
    const expiry = String(cardExpiry?.value || "").trim();
    const cvv = String(cardCvv?.value || "").trim();

    if (!name) return showCardError("Please enter name on card.");
    if (!isValidCardNumber(number)) return showCardError("Invalid card number.");
    if (!isValidExpiry(expiry)) return showCardError("Invalid expiry date (MM/YY) or expired.");
    if (!isValidCvv(cvv)) return showCardError("Invalid CVV.");

    saveCardDetails({
      name,
      numberMasked: `**** **** **** ${digitsOnly(number).slice(-4)}`,
      expiry,
      savedAt: new Date().toISOString(),
    });

    lastPayValue = "card";
    closeModals();
  });

  document.getElementById("paynowCloseBtn")?.addEventListener("click", () => {
    document.getElementById("paynowQrWrap").style.display = "none";
    document.getElementById("paynowSuccessMsg").style.display = "block";
    lastPayValue = "paynow";
    setTimeout(closeModals, 1000);
  });

  // =========================
  // Promo Logic
  // =========================
  function computeDiscount(subtotal, code) {
    if (!code) return { ok: true, discount: 0, message: "" };
    const promo = PROMOS[code];
    if (!promo) return { ok: false, discount: 0, message: "Invalid promo code." };
    if (promo.weekdayOnly && !isWeekday()) return { ok: false, discount: 0, message: "Weekdays only." };
    if (promo.minSubtotal && subtotal <= promo.minSubtotal) return { ok: false, discount: 0, message: `Min spend $${promo.minSubtotal}.` };

    let discount = 0;
    if (promo.type === "percent") discount = subtotal * promo.value;
    if (promo.type === "flat") discount = Math.min(promo.value, subtotal);
    return { ok: true, discount, message: `${code} applied.` };
  }

  function updateCheckoutSummary() {
    const cart = readCart();
    const subtotal = cart.reduce((sum, i) => sum + (i.qty * i.price), 0);
    const ecoFee = readEco() ? ECO_FEE : 0;

    const code = (localStorage.getItem(COUPON_KEY) || "").trim().toUpperCase();
    const promoResult = computeDiscount(subtotal, code);
    const total = Math.max(0, subtotal + ecoFee - promoResult.discount);

    document.getElementById("checkoutSubtotal").textContent = formatMoney(subtotal);
    document.getElementById("checkoutTotal").textContent = formatMoney(total);

    const ecoRow = document.getElementById("checkoutEcoRow");
    if (ecoRow) {
      ecoRow.style.display = ecoFee > 0 ? "flex" : "none";
      document.getElementById("checkoutEcoFee").textContent = `+${formatMoney(ecoFee)}`;
    }

    const discRow = document.getElementById("discountRow");
    if (discRow) {
      discRow.style.display = promoResult.discount > 0 ? "flex" : "none";
      document.getElementById("discountAmount").textContent = `-${formatMoney(promoResult.discount)}`;
    }

    const promoMsg = document.getElementById("promoMsg");
    if (promoMsg) {
      promoMsg.textContent = code ? promoResult.message : "";
      promoMsg.style.color = promoResult.ok ? "green" : "crimson";
    }

    return { cart, subtotal, ecoFee, discount: promoResult.discount, promoCode: code, total };
  }

  document.getElementById("applyPromoBtn")?.addEventListener("click", () => {
    const code = document.getElementById("promoCodeInput").value.trim().toUpperCase();
    if (PROMOS[code]) localStorage.setItem(COUPON_KEY, code);
    else { alert("Invalid Code"); localStorage.removeItem(COUPON_KEY); }
    updateCheckoutSummary();
  });

  updateCheckoutSummary();

  // =========================
  // SUBMIT TO FIRESTORE
  // =========================
  const submitBtn = document.querySelector(".cta");

  submitBtn?.addEventListener("click", async () => {
    const info = updateCheckoutSummary();
    if (!info.cart.length) return alert("Cart is empty");

    const form = validateCheckoutForm();
    if (!form.ok) return;

    const pay = document.querySelector('input[name="pay"]:checked')?.value || "card";
    if (pay === "card") {
      const saved = readCardDetails();
      if (!saved) {
        alert("Please add your card details.");
        openCardModal();
        return;
      }
    }

    // --- NEW LOGIC: EXTRACT STALL ID ---
    const firstItem = info.cart[0] || {};
    const rootStallId = firstItem.stallId || "";
    const rootStallName = firstItem.stallName || "";

    submitBtn.textContent = "Processing...";
    submitBtn.disabled = true;

    try {
      await addDoc(collection(db, "orders"), {
        userId: auth.currentUser ? auth.currentUser.uid : "guest",
        orderNo: String(Date.now()).slice(-6),
        createdAt: serverTimestamp(),
        
        // --- THIS FIXES THE VENDOR TRACKING ---
        stallId: rootStallId,
        stallName: rootStallName,
        // --------------------------------------

        items: info.cart,
        subtotal: info.subtotal,
        ecoFee: info.ecoFee,
        discount: info.discount,
        promoCode: info.promoCode,
        total: info.total,
        status: "Paid",
        payment: { method: pay, card: pay === "card" ? readCardDetails() : null },
        contact: { fullName: form.fullName, phone: form.phone },
        collection: { method: form.method }
      });

      localStorage.removeItem(CART_KEY);
      localStorage.removeItem(ECO_KEY);
      localStorage.removeItem(COUPON_KEY);

      window.location.href = "PaymentSuccesss.html";
    } catch (e) {
      console.error(e);
      alert("Error processing order: " + e.message);
      submitBtn.textContent = "Submit";
      submitBtn.disabled = false;
    }
  });