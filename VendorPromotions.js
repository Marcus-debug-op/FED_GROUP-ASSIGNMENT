import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
  authDomain: "hawkerhub-64e2d.firebaseapp.com",
  databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const form = document.getElementById("promoForm");
const promoList = document.getElementById("promoList");
const promoMsg = document.getElementById("promoMsg");

const codeEl = document.getElementById("code");
const typeEl = document.getElementById("type");
const valueEl = document.getElementById("value");
const minSpendEl = document.getElementById("minSpend");
const expiryEl = document.getElementById("expiry");
const activeEl = document.getElementById("active");

function showMsg(text, isError = false) {
  promoMsg.textContent = text;
  promoMsg.style.color = isError ? "#b00020" : "";
}

function asUpperCode(s) {
  return String(s || "").trim().toUpperCase().replace(/\s+/g, "");
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseExpiryToText(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// IMPORTANT: your stalls doc ID is your stallId (e.g. "ahseng") in your setup
async function getVendorStallId(uid) {
  const q = query(collection(db, "stalls"), where("vendorId", "==", uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  // Prefer using a field stallId if it exists, otherwise doc id.
  const stallData = snap.docs[0].data();
  return stallData.stallId || stallData.stallID || snap.docs[0].id;
}

function buildOfferText(type, value, minSpend) {
  const main = type === "percent" ? `${value}% off` : `$${value} off`;
  if (minSpend > 0) return `${main} with min. spend $${minSpend}`;
  return `${main} with no min. spend`;
}

function getCreatedAtMs(data) {
  const c = data?.createdAt;
  if (!c) return 0;
  if (typeof c.toMillis === "function") return c.toMillis();
  if (typeof c.seconds === "number") return c.seconds * 1000;
  return 0;
}

function renderPromotionItem(docId, p) {
  const code = p.code || "";
  const title = p.title || "";
  const offer = p.offer || "";
  const expiry = p.expiry || "";
  const status = p.status || (p.active === false ? "Inactive" : "Active");

  return `
    <div class="promo-item" data-id="${escapeHtml(docId)}">
      <div class="promo-item-top">
        <div class="promo-code">${escapeHtml(code)}</div>
        <div class="promo-pill">${escapeHtml(status)}</div>
      </div>

      <div class="promo-title">${escapeHtml(title)}</div>
      <div>${escapeHtml(offer)}</div>
      <div class="promo-expiry">${expiry ? "Valid until " + escapeHtml(expiry) : "No expiry"}</div>

      <div class="promo-actions">
        <button type="button" class="promo-action-btn" data-action="toggle">
          ${status === "Active" ? "Set Inactive" : "Set Active"}
        </button>

        <button type="button" class="promo-action-btn" data-action="edit">
          Edit
        </button>

        <button type="button" class="promo-action-btn" data-action="delete">
          Delete
        </button>
      </div>
    </div>
  `;
}

let currentUser = null;
let currentStallId = null;
let unsubPromos = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showMsg("Please sign in as a vendor to manage promotions.", true);
    const btn = form?.querySelector("button[type='submit']");
    if (btn) btn.disabled = true;
    return;
  }

  currentUser = user;
  const btn = form?.querySelector("button[type='submit']");
  if (btn) btn.disabled = false;

  showMsg("Loading your stall...");
  currentStallId = await getVendorStallId(user.uid);

  if (!currentStallId) {
    showMsg("No stall found for this vendor (stalls.vendorId does not match your UID).", true);
    return;
  }

  showMsg("Loaded promotions.");

  // ✅ NO orderBy => no composite index needed
  const promoQ = query(collection(db, "promocodes"), where("stallId", "==", currentStallId));

  if (unsubPromos) unsubPromos();

  unsubPromos = onSnapshot(
    promoQ,
    (snap) => {
      if (snap.empty) {
        promoList.innerHTML = `<p style="margin:0; opacity:.75;">No promo codes yet.</p>`;
        return;
      }

      const sorted = snap.docs
        .map((d) => ({ id: d.id, data: d.data() }))
        .sort((a, b) => getCreatedAtMs(b.data) - getCreatedAtMs(a.data));

      promoList.innerHTML = sorted.map((x) => renderPromotionItem(x.id, x.data)).join("");
    },
    (err) => {
      console.error(err);
      showMsg("Failed to load promo codes. Check console.", true);
    }
  );
});

// Add new promo code
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !currentStallId) return;

  const code = asUpperCode(codeEl.value);
  const type = typeEl.value;
  const value = toNumber(valueEl.value, NaN);
  const minSpend = toNumber(minSpendEl.value, 0);
  const expiryText = parseExpiryToText(expiryEl.value);
  const active = !!activeEl.checked;

  if (!code) return showMsg("Promo code cannot be empty.", true);
  if (!Number.isFinite(value) || value <= 0) return showMsg("Value must be a number > 0.", true);
  if (type === "percent" && value > 100) return showMsg("Percent discount cannot exceed 100.", true);

  const title = `${code} Special`;
  const offer = buildOfferText(type, value, minSpend);
  const status = active ? "Active" : "Inactive";

  try {
    await addDoc(collection(db, "promocodes"), {
        scope: "stall",  
        vendorId: currentUser.uid,
        stallId: currentStallId,

        code,
        title,
        offer,
        expiry: expiryText,
        status,

        type,
        value,
        minSpend,
        active,

        createdAt: serverTimestamp(),
        });

    showMsg("Promo code saved!");
    form.reset();
    activeEl.checked = true;
  } catch (err) {
    console.error(err);
    showMsg("Failed to save promo code. Check console.", true);
  }
});

// Toggle / Edit / Delete
promoList.addEventListener("click", async (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;

  const card = btn.closest(".promo-item");
  if (!card) return;

  const docId = card.getAttribute("data-id");
  const action = btn.getAttribute("data-action");
  if (!docId || !action) return;

  const ref = doc(db, "promocodes", docId);

  try {
    if (action === "toggle") {
      const pill = card.querySelector(".promo-pill");
      const currentStatus = pill ? pill.textContent.trim() : "Active";
      const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";

      await updateDoc(ref, { status: nextStatus, active: nextStatus === "Active" });
      showMsg(`Status updated to ${nextStatus}.`);
    }

    if (action === "edit") {
      const newTitle = prompt("Enter new title:");
      if (newTitle === null) return;

      const newOffer = prompt("Enter new offer text:");
      if (newOffer === null) return;

      const newExpiry = prompt("Enter new expiry (e.g. 30 Jun 2026):");
      if (newExpiry === null) return;

      await updateDoc(ref, {
        title: newTitle.trim(),
        offer: newOffer.trim(),
        expiry: newExpiry.trim(),
      });

      showMsg("Promo updated.");
    }

    if (action === "delete") {
      const ok = confirm("Delete this promo code?");
      if (!ok) return;
      await deleteDoc(ref);
      showMsg("Promo deleted.");
    }
  } catch (err) {
    console.error(err);
    showMsg("Action failed. Check console.", true);
  }
});
