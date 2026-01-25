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
// Auth UI: update Sign In button
// ===============================
const signinBtn = document.getElementById("signinBtn");

if (signinBtn) {
  const currentUser = JSON.parse(
    localStorage.getItem("hawkerHubCurrentUser")
  );

  if (currentUser && currentUser.fullname) {
    // Change button text to user's name
    signinBtn.textContent = currentUser.fullname;

    // Optional: prevent going to sign up page
    signinBtn.href = "#";

    // Optional: dropdown / sign out later
    signinBtn.addEventListener("click", (e) => {
      e.preventDefault();
      alert(`Signed in as ${currentUser.fullname}`);
    });
  }
}



// ===============================
// Update Sign In button if logged in
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const signinBtn = document.getElementById("signinBtn");
  if (!signinBtn) return;

  const currentUser = JSON.parse(
    localStorage.getItem("hawkerHubCurrentUser")
  );

  if (currentUser && currentUser.fullname) {
    // Show username instead of "Sign in"
    signinBtn.textContent = currentUser.fullname;

    // Prevent redirect to sign up page
    signinBtn.href = "#";

  }
});


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
