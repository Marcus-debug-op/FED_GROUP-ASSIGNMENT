import { auth, db } from "./firebase-init.js";
import { GoogleAuthProvider, signInWithPopup, signOut } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, set } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".google-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    setLoading(btn, true);

    try {
      // 🔒 Hard-lock role to patron
      const intendedRole = "patron";

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = ref(db, `users/${user.uid}`);
      const snap = await get(userRef);

      if (snap.exists()) {
        const existingRole = String(snap.val()?.role || "").toLowerCase();

        // ❌ Block vendor accounts from using patron page
        if (existingRole && existingRole !== "patron") {
          await signOut(auth);
          alert(
            `This Google account is registered as a "${existingRole}". Please use the ${existingRole} sign-in page.`
          );
          return;
        }
      } else {
        // ✅ First-time Google user → create as patron
        await set(userRef, {
          fullname: user.displayName || "",
          email: user.email || "",
          phone: "",
          role: "patron",
          createdAt: Date.now()
        });
      }

      // ✅ Patron home only
      window.location.href = "Home Guest.html";

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
