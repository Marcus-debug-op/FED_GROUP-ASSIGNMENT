// CreateAccVendor.js (module) — Auth + Firestore with manual deletion handling
import { auth, fs } from "./firebase-init.js";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("CreateAccVendor: DOM loaded, looking for button...");
  
  const btn = document.querySelector(".submit-btn") || document.getElementById("createBtn");
  if (!btn) {
    console.error("CreateAccVendor: Button not found! Check class='submit-btn' or id='createBtn'");
    return;
  }
  
  console.log("CreateAccVendor: Button found, attaching click handler");
  
  // Ensure button is enabled and clickable
  btn.disabled = false;
  btn.style.pointerEvents = "auto";
  btn.style.cursor = "pointer";

  btn.addEventListener("click", async (e) => {
    console.log("CreateAccVendor: Create button clicked!");
    
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
      // Try to create new auth user
      let cred;
      let isReactivation = false;
      
      try {
        cred = await createUserWithEmailAndPassword(auth, email, password);
        console.log("CreateAccVendor: New user created in Auth");
      } catch (createErr) {
        // If email already exists, try to sign in (reactivation case)
        if (createErr.code === "auth/email-already-in-use") {
          console.log("CreateAccVendor: Email exists, checking for reactivation...");
          
          try {
            // Try to sign in with provided credentials
            cred = await signInWithEmailAndPassword(auth, email, password);
            console.log("CreateAccVendor: Existing user signed in, checking Firestore...");
            
            // Check if Firestore user doc exists
            const userRef = doc(fs, "users", cred.user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
              // User exists in both Auth and Firestore - this is a duplicate registration attempt
              console.log("CreateAccVendor: User exists in Firestore - duplicate registration");
              await auth.signOut();
              throw new Error("ACCOUNT_EXISTS");
            } else {
              // Auth exists but Firestore doesn't - reactivation case!
              console.log("CreateAccVendor: Firestore doc missing - reactivating account");
              isReactivation = true;
            }
          } catch (signInErr) {
            // Sign in failed - wrong password
            if (signInErr.code === "auth/invalid-credential" || 
                signInErr.code === "auth/wrong-password") {
              throw new Error("WRONG_PASSWORD");
            }
            throw signInErr;
          }
        } else {
          throw createErr;
        }
      }

      // 1) Set display name for Google/Auth UI
      await updateProfile(cred.user, { displayName: fullname });

      // 2) Create/update Firestore user profile: users/{uid}
      await setDoc(
        doc(fs, "users", cred.user.uid),
        {
          fullName: fullname,
          email,
          phone,
          role: "vendor",
          hasCompletedVendorSetup: false,
          createdAt: isReactivation ? serverTimestamp() : (await getDoc(doc(fs, "users", cred.user.uid))).data()?.createdAt || serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          isReactivated: isReactivation,
          reactivatedAt: isReactivation ? serverTimestamp() : null,
        },
        { merge: true }
      );

      if (isReactivation) {
        alert("Account reactivated successfully! Your profile has been restored.");
      } else {
        alert("Vendor Account Created Successfully!");
      }
      
      // Redirect to stall selection page in setup mode
      window.location.href = "VendorStallDetails.html?mode=setup";
      
    } catch (err) {
      const errorMessage = prettyFirebaseError(err);
      alert(errorMessage);
      console.error(err);
      btn.disabled = false;
    }
  });
});

function prettyFirebaseError(err) {
  const code = err?.code || "";
  const message = err?.message || "";
  
  // Custom error codes
  if (message === "ACCOUNT_EXISTS") {
    return "This email is already registered. Please sign in instead.";
  }
  if (message === "WRONG_PASSWORD") {
    return "This email is already registered with a different password. Please sign in or use a different email.";
  }
  
  // Firebase error codes
  if (code.includes("email-already-in-use"))
    return "This email is already registered.";
  if (code.includes("invalid-email")) return "Invalid email format.";
  if (code.includes("weak-password"))
    return "Password too weak (6+ characters).";
  if (code.includes("invalid-credential") || code.includes("wrong-password"))
    return "Wrong email or password.";
  if (code.includes("user-not-found"))
    return "No account found for this email.";
    
  return err?.message || "Sign up failed.";
}