import { getFirestore, doc, getDoc } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
  const fs = getFirestore();

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".submit-btn"); // your current patron create button
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const fullname = document.getElementById("fullname")?.value.trim();
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirm = document.getElementById("confirm")?.value;

    if (!fullname || !email || !phone || !password || !confirm) {
      alert("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(cred.user, { displayName: fullname });

      await set(ref(db, `users/${cred.user.uid}`), {
        fullname,
        email,
        phone,
        role: "patron",
        createdAt: Date.now()
      });

      alert("Patron Account Created Successfully!");
      window.location.href = "SigninPatron.html";
    } catch (err) {
      alert(prettyFirebaseError(err));
    }
  });
});

function prettyFirebaseError(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "This email is already registered.";
  if (code.includes("invalid-email")) return "Invalid email format.";
  if (code.includes("weak-password")) return "Password too weak (6+ characters).";
  return err?.message || "Sign up failed.";
}
