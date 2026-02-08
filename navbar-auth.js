
import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


function setNavTarget(el, url) {
  if (!el) return;

  if (el.tagName && el.tagName.toLowerCase() === "a") {
    el.setAttribute("href", url);
    el.onclick = null;
    return;
  }

  el.removeAttribute?.("href");
  el.onclick = () => (window.location.href = url);
}


function applyRoleBasedNav(role) {
  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = (el.dataset.role || "").toLowerCase(); // all/patron/vendor

    if (!role) {
      el.style.display = allowed === "all" ? "" : "none";
    } else {
      el.style.display = allowed === "all" || allowed === role ? "" : "none";
    }
  });
}

async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(fs, "users", uid));
  return snap.exists() ? snap.data() : null;
}


function initMenuUI() {
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
}

export function initNavbarAuth() {

  initMenuUI();

  const signinBtn = document.getElementById("signinBtn"); // top right
  const dashboardAuthBtn = document.getElementById("dashboardAuthBtn"); // inside menu



  onAuthStateChanged(auth, async (user) => {
    // ---------------------------
    // Not logged in
    // ---------------------------
    if (!user) {
      if (signinBtn) {
        signinBtn.textContent = "Sign in";
        setNavTarget(signinBtn, "signup.html");
      }

      if (dashboardAuthBtn) {
        dashboardAuthBtn.textContent = "Sign in";
        dashboardAuthBtn.onclick = () => (window.location.href = "signup.html");
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
      console.warn("Navbar: failed to load Firestore profile:", e);
    }

    const role = (profile?.role || "").toString().toLowerCase() || "patron"; // Default to patron
    
    // 1. DETERMINE TARGET URL BASED ON ROLE
    let targetUrl = "PatronProfile.html"; // Default for customers
    if (role === "vendor") {
        targetUrl = "VenderAccount.html"; // Redirect vendors here
    }

    const fullName =
      profile?.fullName ||
      profile?.fullname ||
      user.displayName ||
      "My Profile";

    if (signinBtn) {
      signinBtn.textContent = fullName;
      setNavTarget(signinBtn, targetUrl); // Use the dynamic URL
    }

    if (dashboardAuthBtn) {
      dashboardAuthBtn.textContent = "Sign out";
      dashboardAuthBtn.onclick = async () => {
        if (!confirm("Sign out?")) return;
        await signOut(auth);
        window.location.href = "index.html"; // Redirect to home on logout
      };
    }

    applyRoleBasedNav(role);
  });
}