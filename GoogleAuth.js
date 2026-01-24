// GoogleAuth.js
(() => {
  const GOOGLE_CLIENT_ID = "428815132009-a3m1idhb8795kf55ntn6tjt01ira35s7.apps.googleusercontent.com";

  const SUCCESS_REDIRECT = "Home Guest.html";

  function onGoogleCredentialResponse(response) {
    const jwt = response?.credential;
    if (!jwt) return;

    // Store token + basic profile (demo only)
    localStorage.setItem("hawkerhub_google_jwt", jwt);

    try {
      const payload = JSON.parse(
        atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
      );
      localStorage.setItem("hawkerhub_google_profile", JSON.stringify({
        name: payload.name,
        email: payload.email,
        picture: payload.picture
      }));

      // Optional: store as current user session
      localStorage.setItem("hawkerHubCurrentUser", JSON.stringify({
        fullname: payload.name,
        email: payload.email,
        role: "google"
      }));
    } catch (_) {}

    window.location.href = SUCCESS_REDIRECT;
  }

  function initGIS() {
    if (!window.google?.accounts?.id) return;

    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: onGoogleCredentialResponse,
      ux_mode: "popup"
    });

    // 1) If page has <div id="googleBtn"></div>, render official button
    const googleBtnDiv = document.getElementById("googleBtn");
    if (googleBtnDiv) {
      google.accounts.id.renderButton(googleBtnDiv, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with"
      });
    }

    // 2) If page has your custom .google-btn, hook it to prompt
    const customBtn = document.querySelector(".google-btn");
    if (customBtn) {
      customBtn.addEventListener("click", () => {
        google.accounts.id.prompt();
      });
    }
  }

  window.__hawkerhubInitGIS = initGIS;
})();
