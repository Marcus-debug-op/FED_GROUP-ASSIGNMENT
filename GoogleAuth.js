// googleAuth.js
// Google Identity Services sign-in (JWT credential).
// NOTE: For real security, verify the returned JWT on a server.

(() => {
  // ✅ Replace this with your real Google OAuth Client ID (Web client)
  const GOOGLE_CLIENT_ID = "PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com";

  // Where to go after successful Google sign-in:
  // - On Create Account page, you might want to go to Log In or main/home
  // - On Log In page, you might want to go to main/home
  const DEFAULT_SUCCESS_REDIRECT = "Log In.html";

  function onGoogleCredentialResponse(response) {
    // response.credential is a JWT (ID token)
    const jwt = response.credential;
    if (!jwt) return;

    // Store token (demo). In production, send jwt to backend to verify.
    localStorage.setItem("hawkerhub_google_jwt", jwt);

    // Optional: decode payload for display/debug (NOT verification)
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      localStorage.setItem("hawkerhub_google_profile", JSON.stringify({
        name: payload.name,
        email: payload.email,
        picture: payload.picture
      }));
    } catch (_) {}

    // Redirect after login
    window.location.href = DEFAULT_SUCCESS_REDIRECT;
  }

  function initGIS() {
    if (!window.google || !google.accounts || !google.accounts.id) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onGoogleCredentialResponse,
      // UX mode popup is common for button sign-in:
      ux_mode: "popup"
    });

    // Hook your existing custom button
    const customBtn = document.querySelector(".google-btn"); // exists on both pages :contentReference[oaicite:5]{index=5}
    if (customBtn) {
      customBtn.addEventListener("click", () => {
        // Show One Tap prompt (or browser credential manager if available)
        google.accounts.id.prompt();
      });
    }
  }

  // Wait until GIS script loads
  window.__hawkerhubInitGIS = initGIS;
})();