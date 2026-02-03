import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { ref, get, update, push, set } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  const stallSelect = document.getElementById("stallSelect");
  const addStallBtn = document.getElementById("addStallBtn");
  const clearBtn = document.getElementById("clearBtn");
  const chipsWrap = document.getElementById("selectedChips");
  const saveBtn = document.getElementById("saveVendorSetupBtn");

  const notListedCheck = document.getElementById("notListedCheck");
  const requestBox = document.getElementById("requestBox");
  const submitRequestBtn = document.getElementById("submitRequestBtn");

  const reqStallName = document.getElementById("reqStallName");
  const reqHawkerCentre = document.getElementById("reqHawkerCentre");
  const reqUnitNo = document.getElementById("reqUnitNo");
  const reqNotes = document.getElementById("reqNotes");

  /** selected stalls: Map(stallId -> label) */
  const selected = new Map();

  // Toggle request box
  if (notListedCheck && requestBox) {
    notListedCheck.addEventListener("change", () => {
      requestBox.classList.toggle("hidden", !notListedCheck.checked);
    });
  }

  // Submit "stall not listed" request (does NOT create stalls; just requests)
  submitRequestBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in again.");
      window.location.href = "Sign InVendor.html";
      return;
    }

    const name = (reqStallName?.value || "").trim();
    const centre = (reqHawkerCentre?.value || "").trim();
    const unit = (reqUnitNo?.value || "").trim();
    const notes = (reqNotes?.value || "").trim();

    if (!name || !centre || !unit) {
      alert("Please fill in Stall name, Hawker centre, and Unit/Stall number.");
      return;
    }

    try {
      const reqRef = push(ref(db, `stallRequests/${user.uid}`));
      await set(reqRef, {
        stallName: name,
        hawkerCentre: centre,
        unitNo: unit,
        notes,
        status: "pending",
        createdAt: Date.now()
      });

      alert("Request submitted! For now, please select an existing stall to continue.");

      if (reqStallName) reqStallName.value = "";
      if (reqHawkerCentre) reqHawkerCentre.value = "";
      if (reqUnitNo) reqUnitNo.value = "";
      if (reqNotes) reqNotes.value = "";

      if (notListedCheck) notListedCheck.checked = false;
      if (requestBox) requestBox.classList.add("hidden");
    } catch (e) {
      alert(e?.message || "Failed to submit request.");
    }
  });

  // Add selected stall to "chips"
  addStallBtn?.addEventListener("click", () => {
    const id = stallSelect?.value;
    if (!id) return;

    const label = stallSelect.options[stallSelect.selectedIndex]?.text || "";
    selected.set(id, label);
    renderChips();
  });

  // Clear selected stalls
  clearBtn?.addEventListener("click", () => {
    selected.clear();
    renderChips();
  });

  function renderChips() {
    if (!chipsWrap) return;

    chipsWrap.innerHTML = "";
    for (const [id, label] of selected.entries()) {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.innerHTML = `
        <span>${escapeHtml(label)}</span>
        <button type="button" aria-label="Remove">✕</button>
      `;

      chip.querySelector("button")?.addEventListener("click", () => {
        selected.delete(id);
        renderChips();
      });

      chipsWrap.appendChild(chip);
    }
  }

  // Save vendor stall ownership + mark setup complete
  saveBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please sign in again.");
      window.location.href = "Sign InVendor.html";
      return;
    }

    if (selected.size === 0) {
      alert("Please select at least one stall.");
      return;
    }

    // Build vendorStalls/{uid}/{stallId}: true
    const stallFlags = {};
    for (const stallId of selected.keys()) stallFlags[stallId] = true;

    try {
      const updates = {};
      updates[`vendorStalls/${user.uid}`] = stallFlags;
      updates[`users/${user.uid}/hasCompletedVendorSetup`] = true;

      await update(ref(db), updates);

      // Optional: set first stall as active for convenience
      const firstStallId = selected.keys().next().value;
      sessionStorage.setItem("activeStallId", firstStallId);

      alert("Vendor setup saved!");
      window.location.href = "Sign InVendor.html";
    } catch (e) {
      alert(e?.message || "Failed to save vendor setup.");
    }
  });

  // Require auth, then load stalls list
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Please sign in again.");
      window.location.href = "Sign InVendor.html";
      return;
    }
    await loadFoodStalls();
  });

  async function loadFoodStalls() {
    if (!stallSelect) return;

    try {
      const snap = await get(ref(db, "foodStalls"));
      const stalls = snap.exists() ? snap.val() : null;

      stallSelect.innerHTML = "";

      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = stalls ? "Select a stall..." : "No stalls found in Firebase.";
      stallSelect.appendChild(placeholder);

      if (!stalls) return;

      Object.entries(stalls).forEach(([stallId, data]) => {
        const opt = document.createElement("option");
        opt.value = stallId;

        // Keys based on your Firebase: stallName, hawkerCentre, unitNo, cuisine, halal
        // Also supports alternative casing safely
        const stallName = data?.stallName || data?.stallname || data?.StallName || "Unnamed Stall";
        const centre = data?.hawkerCentre || data?.hawkercentre || "";
        const unit = data?.unitNo || data?.unitno || "";
        const cuisine = data?.cuisine || data?.Cuisine || "";
        const halalRaw = data?.halal ?? data?.Halal ?? null;

        let halalLabel = "";
        if (halalRaw === true) halalLabel = "Halal";
        else if (halalRaw === false) halalLabel = "Non-Halal";

        const tags = [cuisine, halalLabel].filter(Boolean).join(" • ");
        const meta = [centre, unit].filter(Boolean).join(" • ");

        let label = stallName;
        if (tags) label += ` (${tags})`;
        if (meta) label += ` — ${meta}`;

        opt.textContent = label;
        stallSelect.appendChild(opt);
      });
    } catch (e) {
      stallSelect.innerHTML = `<option value="">Failed to load stalls.</option>`;
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
});
