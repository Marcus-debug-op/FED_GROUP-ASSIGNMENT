// CreateAccVendor.js
document.addEventListener("DOMContentLoaded", () => {
  const createBtn = document.getElementById("createBtn");

  if (createBtn) {
    createBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // 1. Capture Input Values
      const fullname = document.getElementById("fullname").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("password").value;
      const confirm = document.getElementById("confirm").value;

      // 2. Basic Validation
      if (!fullname || !email || !phone || !password) {
        alert("Please fill in all fields.");
        return;
      }

      if (password !== confirm) {
        alert("Passwords do not match!");
        return;
      }

      // 3. Retrieve Existing Users from Local Storage
      // We parse the JSON string back into an array, or create an empty array if none exist
      const existingUsers = JSON.parse(localStorage.getItem("hawkerHubUsers")) || [];

      // 4. Check if Email Already Exists
      const userExists = existingUsers.some(user => user.email === email);
      if (userExists) {
        alert("An account with this email already exists.");
        return;
      }

      // 5. Create New User Object
      const newUser = {
        fullname: fullname,
        email: email,
        phone: phone,
        password: password, // Note: In a real app, never store passwords in plain text!
        role: "vendor"      // Tagging this user as a vendor
      };

      // 6. Save back to Local Storage
      existingUsers.push(newUser);
      localStorage.setItem("hawkerHubUsers", JSON.stringify(existingUsers));

      // 7. Success & Redirect
      alert("Vendor Account Created Successfully!");
      window.location.href = "Log In.html";
    });
  }
});

