import { auth, db } from "./firebase-init.js";
import { signInWithEmailAndPassword } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get } from
  "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
  

document.addEventListener("DOMContentLoaded", () => {
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const signInBtn = document.querySelector(".submit");

  const pickerWrap = document.getElementById("stallPicker");
const stallSelect = document.getElementById("stallAfterLogin");
const continueBtn = document.getElementById("continueBtn");

if (continueBtn) {
  continueBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const stallId = stallSelect?.value || "";
    if (!stallId) {
      alert("Please choose a stall.");
      return;
    }

    sessionStorage.setItem("activeStallId", stallId);
    window.location.href = "Home Guest.html";
  });
}


  continueBtn?.addEventListener("click", () => {
    const stallId = stallSelect?.value || "";
    if (!stallId) {
      alert("Please choose a stall.");
      return;
    }
    sessionStorage.setItem("activeStallId", stallId);
    window.location.href = "Home Guest.html";
  });

  async function populateStallPicker(vendorStalls) {
    if (!stallSelect) return;

    stallSelect.innerHTML = `<option value="">Select a stall...</option>`;

    // vendorStalls is {stallId: true, ...}
    const stallIds = Object.keys(vendorStalls);

    // For nicer labels, fetch the master stall list once
    const foodSnap = await get(ref(db, "foodStalls"));
    const foodStalls = foodSnap.exists() ? foodSnap.val() : {};

    for (const id of stallIds) {
      const data = foodStalls?.[id] || {};
      const name = data?.stallName || data?.stallname || data?.StallName || id;
      const centre = data?.hawkerCentre || data?.hawkercentre || "";
      const unit = data?.unitNo || data?.unitno || "";
      const cuisine = data?.cuisine || data?.Cuisine || "";
      const halalRaw = data?.halal ?? data?.Halal ?? null;

      let halalLabel = "";
      if (halalRaw === true) halalLabel = "Halal";
      else if (halalRaw === false) halalLabel = "Non-Halal";

      const tags = [cuisine, halalLabel].filter(Boolean).join(" • ");
      const meta = [centre, unit].filter(Boolean).join(" • ");

      let label = name;
      if (tags) label += ` (${tags})`;
      if (meta) label += ` — ${meta}`;

      opt.textContent = label;


      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = meta ? `${name} (${meta})` : name;
      stallSelect.appendChild(opt);
    }

    // Auto-select if only one stall
    if (stallIds.length === 1) {
      stallSelect.value = stallIds[0];
    }
  }
});

function prettyFirebaseError(err) {
  const code = err?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "Wrong email or password.";
  if (code.includes("user-not-found")) return "No account found for this email.";
  return err?.message || "Sign in failed.";
}
