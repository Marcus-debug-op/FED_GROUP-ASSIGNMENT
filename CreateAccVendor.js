// CreateAccVendor.js (module) — Auth + Firestore (NO realtime db)

import { auth, fs } from "./firebase-init.js";

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".submit-btn");
  if (!btn) {
    console.log("CreateAccVendor: .submit-btn not found");
    return;
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname")?.value.trim();
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value || "";
    const confirm = document.getElementById("confirm")?.value || "";

    if (!fullname || !email || !phone || !password || !confirm) {
      alert("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    // Prevent double click spam
    btn.disabled = true;

    try {
      // 1) Create auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      // 2) Set display name for Google/Auth UI
      await updateProfile(cred.user, { displayName: fullname });

      // 3) Create Firestore user profile: users/{uid}
      await setDoc(
        doc(fs, "users", cred.user.uid),
        {
          fullName: fullname,
          email,
          phone,
          role: "vendor",
          hasCompletedVendorSetup: false,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Vendor Account Created Successfully!");
      window.location.href = "Sign InVendor.html";
    } catch (err) {
      alert(prettyFirebaseError(err));
      console.error(err);
    } finally {
      btn.disabled = false;
    }
  });
});

function prettyFirebaseError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use"))
    return "This email is already registered.";
  if (code.includes("invalid-email")) return "Invalid email format.";
  if (code.includes("weak-password"))
    return "Password too weak (6+ characters).";
  return err?.message || "Sign up failed.";
}
