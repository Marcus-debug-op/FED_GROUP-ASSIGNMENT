// SignInPatron.js
// Patron login using localStorage -> redirects to Home Guest.html

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const signInBtn = document.querySelector(".submit");

  if (!emailEl || !passEl || !signInBtn) return;

  signInBtn.addEventListener("click", () => {
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("hawkerHubUsers")) || [];

    // Patron-only match
    const matched = users.find(
      (u) =>
        (u.email || "").toLowerCase() === email &&
        u.password === password &&
        (u.role === "patron" || u.role === "customer")
    );

    if (!matched) {
      alert("Invalid patron credentials.");
      return;
    }

    // Save current session user
    localStorage.setItem(
      "hawkerHubCurrentUser",
      JSON.stringify({
        fullname: matched.fullname,
        email: matched.email,
        role: matched.role,
      })
    );

    window.location.href = "Home Guest.html";
  });
});
