// SignInPatron.js (module)
import { auth, db } from "./firebase-init.js";
import { signInWithEmailAndPassword } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.querySelector(".submit");
  if (!emailEl || !passEl || !btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = (emailEl.value || "").trim().toLowerCase();
    const password = passEl.value || "";

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const snap = await get(ref(db, `users/${cred.user.uid}`));
      const data = snap.exists() ? snap.val() : null;

      if (!data || String(data.role).toLowerCase() !== "patron") {
        alert("This account is not a patron account.");
        return;
      }

      window.location.href = "HomeGuest.html";
    } catch (err) {
      alert(prettyFirebaseError(err));
    }
  });
});

function prettyFirebaseError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Wrong email or password.";
  if (code.includes("user-not-found")) return "No account found for this email.";
  return err?.message || "Sign in failed.";
}
