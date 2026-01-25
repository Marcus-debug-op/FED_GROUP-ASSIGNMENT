const menuBtn = document.getElementById("menu-btn");
const dashboard = document.getElementById("dashboard");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("close-btn");

menuBtn.addEventListener("click", () => {
  dashboard.classList.remove("hidden");
  overlay.classList.remove("hidden");

  // small delay so CSS transition works
  setTimeout(() => {
    dashboard.classList.add("show");
  }, 10);
});

function closeMenu(){
  dashboard.classList.remove("show");
  overlay.classList.add("hidden");

  setTimeout(() => {
    dashboard.classList.add("hidden");
  }, 300);
}

closeBtn.addEventListener("click", closeMenu);
overlay.addEventListener("click", closeMenu);



// ===============================
// Dashboard Sign In / Sign Out
// ===============================
const dashboardAuthBtn = document.getElementById("dashboardAuthBtn");

if (dashboardAuthBtn) {
  const currentUser = JSON.parse(
    localStorage.getItem("hawkerHubCurrentUser")
  );

  if (currentUser) {
    dashboardAuthBtn.textContent = "Sign out";

    dashboardAuthBtn.onclick = () => {
      if (confirm("Sign out?")) {
        localStorage.removeItem("hawkerHubCurrentUser");
        window.location.reload();
      }
    };
  } else {
    dashboardAuthBtn.textContent = "Sign in";

    dashboardAuthBtn.onclick = () => {
      window.location.href = "sign up.html";
    };
  }
}


// ===============================
// Role-based Navigation
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(
    localStorage.getItem("hawkerHubCurrentUser")
  );

  const navLinks = document.querySelectorAll(".navlink[data-role]");

  navLinks.forEach(link => {
    const allowedRole = link.dataset.role;

    // If not logged in → hide role-specific links
    if (!currentUser) {
      if (allowedRole !== "all") {
        link.style.display = "none";
      }
      return;
    }

    // Logged in
    if (
      allowedRole === "all" ||
      allowedRole === currentUser.role
    ) {
      link.style.display = "inline-flex";
    } else {
      link.style.display = "none";
    }
  });
});


document.addEventListener("DOMContentLoaded", () => {
  let user = null;
  try { user = JSON.parse(localStorage.getItem("hawkerHubCurrentUser")); } catch {}

  const role = user?.role || null;

  // ✅ Dashboard-only filtering
  document.querySelectorAll("#dashboard a[data-role]").forEach((a) => {
    const allowed = a.getAttribute("data-role"); // all / patron / vendor

    if (!role) {
      // Guest: show only 'all'
      a.style.display = (allowed === "all") ? "" : "none";
    } else {
      // Logged in: show 'all' + their role
      a.style.display = (allowed === "all" || allowed === role) ? "" : "none";
    }
  });
});


// ===============================
// Top-right Sign In / Profile button
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.getElementById("signinBtn");
  if (!signinBtn) return;

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("hawkerHubCurrentUser"));
  } catch {}

  if (user && user.fullname) {
    // Logged in → show username & link to profile
    signinBtn.textContent = user.fullname;
    signinBtn.href = "Profile(Patron & Vendor).html";
  } else {
    // Guest → normal sign in
    signinBtn.textContent = "Sign in";
    signinBtn.href = "sign up.html";
  }
});
