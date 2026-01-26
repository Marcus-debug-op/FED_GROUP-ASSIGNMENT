// SignInPatron.js
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const signInBtn = document.querySelector(".submit");

  if (!emailEl || !passEl || !signInBtn) return;

  signInBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = passEl.value || "";

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("hawkerHubUsers")) || [];

    const matched = users.find(
      (u) =>
        String(u?.email || "").trim().toLowerCase() === email &&
        String(u?.password || "") === password &&
        String(u?.role || "").trim().toLowerCase() === "patron"
    );

    if (!matched) {
      alert("Invalid patron credentials.");
      return;
    }

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
