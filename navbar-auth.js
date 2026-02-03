import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

export function initNavbarAuth() {
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

  const dashboardAuthBtn = document.getElementById("dashboardAuthBtn");
  const signinBtn = document.getElementById("signinBtn");

  function applyRoleBasedNav(role) {
    document.querySelectorAll(".navlink[data-role]").forEach((link) => {
      const allowedRole = link.dataset.role;
      if (!role) link.style.display = (allowedRole === "all") ? "" : "none";
      else link.style.display = (allowedRole === "all" || allowedRole === role) ? "" : "none";
    });

    document.querySelectorAll("#dashboard a[data-role]").forEach((a) => {
      const allowed = a.getAttribute("data-role");
      if (!role) a.style.display = (allowed === "all") ? "" : "none";
      else a.style.display = (allowed === "all" || allowed === role) ? "" : "none";
    });
  }

  async function fetchUserProfile(uid) {
    const snap = await get(ref(db, `users/${uid}`));
    return snap.exists() ? snap.val() : null;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      if (dashboardAuthBtn) {
        dashboardAuthBtn.textContent = "Sign in";
        dashboardAuthBtn.onclick = () => (window.location.href = "sign up.html");
      }
      if (signinBtn) {
        signinBtn.textContent = "Sign in";
        signinBtn.href = "sign up.html";
      }
      applyRoleBasedNav(null);
      return;
    }

    let profile = null;
    try { profile = await fetchUserProfile(user.uid); }
    catch (e) { console.log("Failed to load profile:", e); }

    const role = (profile?.role || "").toLowerCase() || null;
    const fullname = profile?.fullname || user.displayName || "Account";

    if (dashboardAuthBtn) {
      dashboardAuthBtn.textContent = "Sign out";
      dashboardAuthBtn.onclick = async () => {
        if (!confirm("Sign out?")) return;
        await signOut(auth);
        window.location.reload();
      };
    }

    const profileUrl = "Profile(Patron & Vendor).html";
    if (signinBtn) {
      signinBtn.textContent = fullname;
      signinBtn.onclick = () => (window.location.href = profileUrl);
    }

    applyRoleBasedNav(role);
  });
}
