import { auth, db } from "./firebase-init.js";
import { GoogleAuthProvider, signInWithPopup, signOut } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, set, update } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".google-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    setLoading(btn, true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const pageRole = document.body?.dataset?.authRole;

if (!pageRole || !["vendor", "patron"].includes(pageRole)) {
  alert("Invalid sign-in page. Please refresh or use the correct page.");
  await signOut(auth);
  setLoading(btn, false);
  return;
}

const intendedRole = pageRole;


      const userRef = ref(db, `users/${user.uid}`);
      const snap = await get(userRef);

      if (snap.exists()) {
        const existingRole = String(snap.val()?.role || "").toLowerCase();
        if (existingRole && existingRole !== intendedRole) {
          await signOut(auth);
          alert(`This Google account is registered as "${existingRole}". Use the ${existingRole} page.`);
          return;
        }
        if (!existingRole) await update(userRef, { role: intendedRole });
      } else {
        await set(userRef, {
          fullname: user.displayName || "",
          email: user.email || "",
          phone: "",
          role: intendedRole,
          createdAt: Date.now()
        });
      }

      window.location.href =
  intendedRole === "vendor"
    ? "HomeVendor.html"
    : "HomePatron.html";
    } catch (err) {
      alert(err?.message || "Google sign-in failed.");
    } finally {
      setLoading(btn, false);
    }
  });
});

function setLoading(btn, isLoading) {
  btn.classList.toggle("is-loading", isLoading);
}
