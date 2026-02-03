// ✅ Keep your array EXACTLY as-is (unchanged)
const discounts = [
  {
    code: "FIRSTORDER",
    title: "First Order Discount",
    offer: "35% Off. No Limits!",
    expiry: "No Deadline",
  },
  {
    code: "HAWKER20",
    title: "Support Local Hawkers",
    offer: "$5 off orders above $10",
    expiry: "15 Mar 2026",
  },
  {
    code: "FREESHIP",
    title: "Free Delivery",
    offer: "Free Delivery on all orders",
    expiry: "31 Jan 2026",
  },
  {
    code: "WEEKDAY80",
    title: "Weekday Special",
    offer: "15% Off",
    expiry: "31 Dec 2026",
  },
];

function loadDiscounts() {
  const container = document.getElementById("discount-container");
  if (!container) return;

  container.innerHTML = discounts
    .map(
      (d) => `
        <div class="voucher-card">
          <div class="vc-details">
            <span class="tag-badge">
              ${d.code} <i class="fa-solid fa-tag"></i>
            </span>
            <h3>${d.title}</h3>
            <p class="offer">${d.offer}</p>
          </div>
          <div class="vc-actions">
            <span class="status-active">Active</span>
            <button class="redeem-btn">Redeem</button>
            <span class="validity">Valid until <strong>${d.expiry}</strong></span>
          </div>
        </div>
      `
    )
    .join("");
}

// ✅ Firebase Auth + Firestore access control (replaces localStorage logic)
import { auth, fs } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

async function loadProfileForSignedInUser(user) {
  // Try Firestore first
  let profile = null;
  try {
    const snap = await getDoc(doc(fs, "users", user.uid));
    if (snap.exists()) profile = snap.data();
  } catch (e) {
    console.warn("Could not read Firestore profile:", e);
  }

  // Build display values (Firestore preferred, then Auth fallback)
  const name =
    profile?.fullName ||
    profile?.fullname || // supports older field name if you used it before
    user.displayName ||
    "User";

  const email =
    profile?.email ||
    user.email ||
    "-";

  const role =
    (profile?.role || "").toLowerCase() || "patron"; // default patron if missing

  // Fill placeholders
  const nameEl = document.getElementById("profileName");
  const emailEl = document.getElementById("profileEmail");
  if (nameEl) nameEl.textContent = name;
  if (emailEl) emailEl.textContent = email;

  const pillName = document.getElementById("pillName");
  if (pillName) pillName.textContent = name;

  // Role-based sections
  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = el.getAttribute("data-role");
    el.style.display = allowed === "all" || allowed === role ? "" : "none";
  });

  // Subtitle wording
  const roleSubtitle = document.getElementById("roleSubtitle");
  if (roleSubtitle) {
    roleSubtitle.textContent =
      role === "vendor"
        ? "Stall Owner Account – manage stall & orders"
        : "Customer Account – view orders & cart";
  }

  // Logout button
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      if (!confirm("Sign out?")) return;
      await signOut(auth);
      window.location.href = "Home Guest.html";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Load vouchers immediately (no auth needed)
  loadDiscounts();

  // ✅ Gate this page by Firebase session
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Please sign in to view your profile.");
      window.location.href = "sign up.html";
      return;
    }

    await loadProfileForSignedInUser(user);
  });
});
