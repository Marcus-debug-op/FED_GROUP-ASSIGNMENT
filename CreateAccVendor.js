// CreateAccVendor.js
document.addEventListener("DOMContentLoaded", () => {
  const createBtn = document.getElementById("createBtn");
  if (!createBtn) return;

  createBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirm = document.getElementById("confirm")?.value;

    if (!fullname || !email || !phone || !password || !confirm) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem("hawkerHubUsers")) || [];

    // Keep emails unique (case-insensitive)
    const userExists = existingUsers.some(u => (u.email || "").toLowerCase() === email.toLowerCase());
    if (userExists) {
      alert("An account with this email already exists.");
      return;
    }

    const newUser = {
      fullname,
      email,
      phone,
      password,      // demo only; don't store plaintext in real apps
      role: "vendor"
    };

    existingUsers.push(newUser);
    localStorage.setItem("hawkerHubUsers", JSON.stringify(existingUsers));

    alert("Vendor Account Created Successfully!");
    window.location.href = "Sign InVendor.html";
  });
});
