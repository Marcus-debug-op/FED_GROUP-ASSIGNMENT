// GoogleAuth.js (module) — Firestore version (works for both Vendor & Patron pages)
import { auth, fs } from "./firebase-init.js";

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".google-btn");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    setLoading(btn, true);

    try {
      // Read intended role from <body data-auth-role="vendor|patron">
      const intendedRole = String(document.body?.dataset?.authRole || "patron").toLowerCase();

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // users/{uid}
      const userRef = doc(fs, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const existingRole = String(userSnap.data()?.role || "").toLowerCase();

        // Block cross-role sign-in on the wrong page
        if (existingRole && existingRole !== intendedRole) {
          await signOut(auth);
          alert(`This Google account is registered as a "${existingRole}". Please use the ${existingRole} sign-in page.`);
          return;
        }
      } else {
        // First-time Google user -> create profile with role
        await setDoc(userRef, {
          fullname: user.displayName || "",
          email: user.email || "",
          phone: user.phoneNumber || "",
          role: intendedRole,
          createdAt: serverTimestamp()
        });
      }

      // Redirect / vendor stall picker
      if (intendedRole === "vendor") {
        // If the page has a stall picker UI, show it (same ids as SignInVendor.js)
        const pickerWrap = document.getElementById("stallPicker");
        const stallSelect = document.getElementById("stallAfterLogin");
        const continueBtn = document.getElementById("continueBtn");

        if (pickerWrap && stallSelect && continueBtn) {
          pickerWrap.style.display = "block";

          // Load vendor stalls: users/{uid}/vendorStalls/*
          const vendorSnap = await getDocs(collection(fs, "users", user.uid, "vendorStalls"));
          const stallIds = [];
          vendorSnap.forEach(d => stallIds.push(d.id));

          stallSelect.innerHTML = `<option value="">Select a stall...</option>`;
          for (const stallId of stallIds) {
            const opt = document.createElement("option");
            opt.value = stallId;
            opt.textContent = stallId;
            stallSelect.appendChild(opt);
          }

          // If user has no stalls set up, just go vendor home
          if (stallIds.length === 0) {
            window.location.href = "HomeVendor.html";
            return;
          }

          // Continue button chooses stall then goes home
          continueBtn.onclick = (ev) => {
            ev.preventDefault();
            const chosen = stallSelect.value || "";
            if (!chosen) return alert("Please choose a stall.");

            sessionStorage.setItem("activeStallId", chosen);
            window.location.href = "HomeVendor.html";
          };

          return; // stop here, wait for user to pick stall
        }

        // Fallback: no picker on page
        window.location.href = "HomeVendor.html";
        return;
      }

      // Patron
      window.location.href = "HomeGuest.html";

    } catch (err) {
      alert(err?.message || "Google sign-in failed.");
    } finally {
      setLoading(btn, false);
    }
  });
});

function setLoading(btn, isLoading) {
  btn.classList.toggle("is-loading", isLoading);
  btn.disabled = !!isLoading;
}
