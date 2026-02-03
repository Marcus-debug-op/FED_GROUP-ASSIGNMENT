// script.js (module) — FIRESTORE VERSION
import { auth, fs } from "./firebase-init.js";

import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ===============================
// Menu open/close (your existing code)
// ===============================
const menuBtn = document.getElementById("menu-btn");
const dashboard = document.getElementById("dashboard");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("close-btn");

if (menuBtn && dashboard && overlay) {
  menuBtn.addEventListener("click", () => {
    dashboard.classList.remove("hidden");
    overlay.classList.remove("hidden");
    setTimeout(() => dashboard.classList.add("show"), 10);
  });
}

function closeMenu() {
  if (!dashboard || !overlay) return;
  dashboard.classList.remove("show");
  overlay.classList.add("hidden");
  setTimeout(() => dashboard.classList.add("hidden"), 300);
}

if (closeBtn) closeBtn.addEventListener("click", closeMenu);
if (overlay) overlay.addEventListener("click", closeMenu);

// ===============================
// Firebase-driven UI state
// ===============================
const dashboardAuthBtn = document.getElementById("dashboardAuthBtn");
const signinBtn = document.getElementById("signinBtn");

// Helper: works whether element is <a> or <button>
function setNavTarget(el, url) {
  if (!el) return;

  // If it's an anchor, set href (best UX)
  if (el.tagName && el.tagName.toLowerCase() === "a") {
    el.setAttribute("href", url);
    el.onclick = null;
    return;
  }

  // If it's a button/div, use click handler
  el.removeAttribute?.("href");
  el.onclick = () => (window.location.href = url);
}

// Call this to apply role-based visibility
function applyRoleBasedNav(role) {
  // header/normal nav links
  const navLinks = document.querySelectorAll(".navlink[data-role]");
  navLinks.forEach((link) => {
    const allowedRole = link.dataset.role; // all / patron / vendor
    if (!role) {
      link.style.display = allowedRole === "all" ? "" : "none";
    } else {
      link.style.display =
        allowedRole === "all" || allowedRole === role ? "" : "none";
    }
  });

  // dashboard-only filtering
  document.querySelectorAll("#dashboard a[data-role]").forEach((a) => {
    const allowed = a.getAttribute("data-role"); // all / patron / vendor
    if (!role) {
      a.style.display = allowed === "all" ? "" : "none";
    } else {
      a.style.display = allowed === "all" || allowed === role ? "" : "none";
    }
  });
}

// fetch user profile from Firestore: users/{uid}
async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(fs, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// Listen to auth session
onAuthStateChanged(auth, async (user) => {
  // ---------------------------
  // Not logged in
  // ---------------------------
  if (!user) {
    // Dashboard button
    if (dashboardAuthBtn) {
      dashboardAuthBtn.textContent = "Sign in";
      dashboardAuthBtn.onclick = () => {
        window.location.href = "sign up.html";
      };
    }

    // Top-right button
    if (signinBtn) {
      signinBtn.textContent = "Sign in";
      setNavTarget(signinBtn, "sign up.html");
    }

    applyRoleBasedNav(null);
    return;
  }

  // ---------------------------
  // Logged in
  // ---------------------------
  let profile = null;
  try {
    profile = await fetchUserProfile(user.uid);
  } catch (e) {
    console.log("Failed to load profile from Firestore:", e);
  }

  const role = (profile?.role || "").toLowerCase() || null;
  const fullName =
    profile?.fullName ||
    profile?.fullname || // supports your older field name if you used it
    user.displayName ||
    "Account";

  // Dashboard button
  if (dashboardAuthBtn) {
    dashboardAuthBtn.textContent = "Sign out";
    dashboardAuthBtn.onclick = async () => {
      if (!confirm("Sign out?")) return;
      await signOut(auth);
      window.location.reload();
    };
  }

  // Top-right button (profile link)
  const profileUrl = "Profile(Patron & Vendor).html";

  if (signinBtn) {
    signinBtn.textContent = fullName;
    setNavTarget(signinBtn, profileUrl);
  }

  applyRoleBasedNav(role);
});
