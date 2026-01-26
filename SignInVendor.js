// SignInVendor.js
document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const signInBtn = document.querySelector(".submit");

  if (!emailEl || !passEl || !signInBtn) return;

  signInBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = passEl.value ?? "";

    const raw = localStorage.getItem("hawkerHubUsers");
    const users = raw ? JSON.parse(raw) : [];

    // ✅ Helpful debug so you immediately see the real cause
    console.log("hawkerHubUsers raw =", raw);
    console.log("parsed users =", users);

    if (!users.length) {
      alert(
        "No saved accounts found on this page.\n\n" +
        "This usually happens when pages are opened under different origins (e.g., file://).\n" +
        "Run the site using a local server (VS Code Live Server) so Create + Sign In share the same localStorage."
      );
      return;
    }

    const matched = users.find((u) => {
      const uEmail = String(u?.email ?? "").trim().toLowerCase();
      const uPass = String(u?.password ?? "");
      const uRole = String(u?.role ?? "").trim().toLowerCase();
      return uEmail === email && uPass === password && uRole === "vendor";
    });

    if (!matched) {
      alert("Invalid vendor credentials.");
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
