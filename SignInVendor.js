// LogInVendor.js
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const signInBtn = document.querySelector(".submit"); // vendor login uses .submit :contentReference[oaicite:9]{index=9}

  if (!emailEl || !passEl || !signInBtn) return;

  signInBtn.addEventListener("click", () => {
    const email = emailEl.value.trim().toLowerCase();
    const password = passEl.value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("hawkerHubUsers")) || [];
    const matched = users.find(u =>
      (u.email || "").toLowerCase() === email &&
      u.password === password &&
      u.role === "vendor"
    );

    if (!matched) {
      alert("Invalid vendor credentials.");
      return;
    }

    // optional: store current session user
    localStorage.setItem("hawkerHubCurrentUser", JSON.stringify({
      fullname: matched.fullname,
      email: matched.email,
      role: matched.role
    }));

    window.location.href = "Home Guest.html";
  });
});
