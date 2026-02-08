
import { auth, fs } from "./firebase-init.js";

import { signInWithEmailAndPassword } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import { doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.querySelector(".submit");

  btn?.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = (emailEl?.value || "").trim().toLowerCase();
    const password = passEl?.value || "";

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

  
      const userSnap = await getDoc(doc(fs, "users", cred.user.uid));
      const role = (userSnap.exists() ? (userSnap.data()?.role || "") : "").toString().toLowerCase();

      if (role !== "patron") {
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
  if (code.includes("too-many-requests")) return "Too many attempts. Try again later.";
  return err?.message || "Sign in failed.";
}
