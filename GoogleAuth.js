// googleAuth.js

const GOOGLE_CLIENT_ID = "428815132009-a3m1idhb8795kf55ntn6tjt01ira35s7.apps.googleusercontent.com";

function handleGoogleLogin(response) {
  // Google returns a JWT here
  const jwt = response.credential;
  console.log("Google login success", jwt);

  // store token (demo)
  localStorage.setItem("hawkerhub_google_jwt", jwt);

  // redirect after login
  window.location.href = "Log In.html";
}

// This function MUST be global (window.)
window.__hawkerhubInitGIS = function () {
  if (!window.google || !google.accounts || !google.accounts.id) {
    console.error("Google Identity Services not loaded");
    return;
  }

  // Initialize Google Sign-In
  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleLogin,
  });

  // Render the official Google button
  const container = document.getElementById("googleBtn");
  if (!container) {
    console.error("googleBtn container not found");
    return;
  }

  google.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    width: 260,
  });
};
