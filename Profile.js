import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const discountContainer = document.getElementById("discount-container");

// 1) Logout
async function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (error) {
      console.error("Logout failed", error);
    }
  }
}

// 2) Available Discount Code (GLOBAL ONLY)
async function loadDiscounts() {
  try {
    const snap = await getDocs(collection(fs, "promocodes"));

    if (snap.empty) {
      discountContainer.innerHTML = "<p>No discounts available at the moment.</p>";
      return;
    }

    let html = "";

    snap.forEach((docSnap) => {
      const d = docSnap.data();

      // Treat missing scope as "global" so old promos still show
      const scope = (d.scope || "global").toLowerCase();
      if (scope !== "global") return;

      html += `
        <div class="voucher-card">
          <div class="vc-details">
            <span class="tag-badge">
              ${d.code || ""} <i class="fa-solid fa-tag"></i>
            </span>
            <h3>${d.title || ""}</h3>
            <p class="offer">${d.offer || ""}</p>
          </div>
          <div class="vc-actions">
            <span class="status-active">${d.status || "Active"}</span>
            <button class="redeem-btn"
              onclick="navigator.clipboard.writeText('${d.code || ""}'); alert('Redeemed!')">
              Redeem
            </button>
            <span class="validity">Valid until <strong>${d.expiry || "No Deadline"}</strong></span>
          </div>
        </div>
      `;
    });

    // If nothing matched global scope, don't leave it blank
    discountContainer.innerHTML = html || "<p>No global discounts available right now.</p>";
  } catch (err) {
    console.error("Error loading discounts:", err);
    discountContainer.innerHTML = "<p>Error loading discounts.</p>";
  }
}

// 3) My Promotions (STALL promos only, vendor only)
async function loadMyPromotions(uid) {
  const section = document.getElementById("myPromotionsSection");
  const container = document.getElementById("myPromotionsContainer");

  // Find vendor's stall
  const stallSnap = await getDocs(collection(fs, "stalls"));

  let stallId = null;
  stallSnap.forEach((docSnap) => {
    const s = docSnap.data();
    if (s.vendorId === uid) {
      stallId = s.stallId || s.stallID || docSnap.id;
    }
  });

  // If no stall, keep My Promotions hidden (prevents confusion)
  if (!stallId) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  // Load promo codes
  const promoSnap = await getDocs(collection(fs, "promocodes"));

  let html = "";
  promoSnap.forEach((docSnap) => {
    const d = docSnap.data();

    // only STALL promotions created by this vendor for this stall
    const scope = (d.scope || "global").toLowerCase();
    if (scope !== "stall") return;

    if (d.vendorId !== uid) return;
    if (d.stallId !== stallId) return;

    html += `
      <div class="voucher-card">
        <div class="vc-details">
          <span class="tag-badge">${d.code || ""}</span>
          <h3>${d.title || ""}</h3>
          <p class="offer">${d.offer || ""}</p>
        </div>
        <div class="vc-actions">
          <span class="status-active">${d.status || "Active"}</span>
          <span class="validity">Valid until <strong>${d.expiry || "No Deadline"}</strong></span>
        </div>
      </div>
    `;
  });

  // DO NOT overwrite with "Add promotions Now!"
  container.innerHTML = html || "<p>No promotions created yet.</p>";
}

// 4) Auth Listener
onAuthStateChanged(auth, async (user) => {
  // Load global discounts for everyone
  loadDiscounts();

  if (user) {
    // Vendor promotions section (only shows if they have a stall)
    loadMyPromotions(user.uid);

    // Profile info
    const userRef = doc(fs, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();

      const displayName =
        userData.fullName ||
        userData.name ||
        user.displayName ||
        user.email.split("@")[0];

      document.getElementById("profileName").textContent = displayName;
      document.getElementById("profileEmail").textContent = user.email;
    }

    // Logout
    const logoutBtn = document.querySelector(".logout-btn");
    if (logoutBtn) logoutBtn.onclick = handleLogout;
  } else {
    window.location.href = "signup.html";
  }
});
