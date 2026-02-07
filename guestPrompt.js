import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/**
 * Guest prompt:
 * - Shows ONLY when user is NOT logged in
 * - Shows again in the future if user is still not logged in
 * - If user dismisses it, it hides only for this browser TAB session (sessionStorage)
 */

const overlay = document.getElementById("guestPromptOverlay");
const closeBtn = document.getElementById("guestPromptClose");
const guestBtn = document.getElementById("guestPromptGuestBtn");

// Hide only for the current tab session (not forever)
const SESSION_KEY = "hawkerhub_guest_prompt_hidden_this_session";

function showPrompt(){
  if (!overlay) return;
  overlay.classList.remove("hidden");
}

function hidePromptForSession(){
  if (!overlay) return;
  overlay.classList.add("hidden");
  sessionStorage.setItem(SESSION_KEY, "1");
}

function hiddenThisSession(){
  return sessionStorage.getItem(SESSION_KEY) === "1";
}

// Close / continue as guest => hide for this session only
if (closeBtn) closeBtn.addEventListener("click", hidePromptForSession);
if (guestBtn) guestBtn.addEventListener("click", hidePromptForSession);

// Click outside to close (optional)
if (overlay){
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) hidePromptForSession();
  });
}

// Firebase auth check
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  // Logged in => never show
  if (user) {
    if (overlay) overlay.classList.add("hidden");
    return;
  }

  // Not logged in => show unless hidden in this tab session
  if (!hiddenThisSession()) {
    showPrompt();
  }
});
