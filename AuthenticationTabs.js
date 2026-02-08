// AuthTabs.js
// Enables Sign Up <-> Sign In tab switching for BOTH vendor + patron pages.

(() => {
  // ✅ Change this if your patron login file has a different name
  const PATRON_SIGNIN_PAGE = "SigninPatron.html"; // your existing default in earlier scripts :contentReference[oaicite:0]{index=0}
  const VENDOR_SIGNIN_PAGE = "SignInVendor.html"; // :contentReference[oaicite:1]{index=1}

  const PATRON_SIGNUP_PAGE = "CreateAccountPatron.html"; // :contentReference[oaicite:2]{index=2}
  const VENDOR_SIGNUP_PAGE = "CreateAccountVendor.html"; // :contentReference[oaicite:3]{index=3}

  // These IDs will be added to your buttons in the HTML edits below
  const btnUp = document.getElementById("tabSignUp");
  const btnIn = document.getElementById("tabSignIn");

  if (!btnUp || !btnIn) return;

  // Decide whether this page is vendor or patron by reading data-role on the segmented wrapper
  const segmented = document.querySelector(".segmented");
  const role = segmented?.dataset?.role || "patron"; // "vendor" | "patron"

  const targets =
    role === "vendor"
      ? { signup: VENDOR_SIGNUP_PAGE, signin: VENDOR_SIGNIN_PAGE }
      : { signup: PATRON_SIGNUP_PAGE, signin: PATRON_SIGNIN_PAGE };

  btnUp.addEventListener("click", () => {
    window.location.href = targets.signup;
  });

  btnIn.addEventListener("click", () => {
    window.location.href = targets.signin;
  });
})();
