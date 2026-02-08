
import { auth, fs } from "./firebase-init.js";

import {
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const signInBtn = document.querySelector(".submit");

  if (!signInBtn) return;

  signInBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = (emailEl?.value || "").trim().toLowerCase();
    const password = passEl?.value || "";

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    try {
      // 1) Auth sign in
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // 2) Role check in Firestore
      const userRef = doc(fs, "users", cred.user.uid);
      const userSnap = await getDoc(userRef);

      const role = (
        userSnap.exists() ? (userSnap.data()?.role || "") : ""
      )
        .toString()
        .toLowerCase();

      if (role !== "vendor") {
        // Important: don't keep them logged in if role is wrong
        await signOut(auth);
        alert("This account is not a vendor account.");
        return;
      }

      // 3) Redirect vendor to Vendor Details page (stall selection happens there)
      window.location.href = "VendorStallDetails.html"; 
    } catch (err) {
      alert(prettyFirebaseError(err));
    }
  });
});

function prettyFirebaseError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Wrong email or password.";
  if (code.includes("user-not-found"))
    return "No account found for this email.";
  if (code.includes("too-many-requests"))
    return "Too many attempts. Try again later.";
  return err?.message || "Sign in failed.";
}