import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

  // ---- Stall not listed request -> Firestore ----
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
      // stallRequests/{uid}/requests/{autoId}
      const reqCol = collection(fs, "stallRequests", user.uid, "requests");
      await addDoc(reqCol, {
        stallName: name,
        hawkerCentre: centre,
        unitNo: unit,
        notes,
        status: "pending",
        createdAt: serverTimestamp()
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

  // Add selected stall to chips
  addStallBtn?.addEventListener("click", () => {
    const id = stallSelect?.value;
    if (!id) return;

    const label = stallSelect.options[stallSelect.selectedIndex]?.text || "";
    selected.set(id, label);
    renderChips();
  });

  // Clear selected
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

  // ---- Save vendor setup -> Firestore ----
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

    try {
      // users/{uid} merge {hasCompletedVendorSetup:true}
      await setDoc(
        doc(fs, "users", user.uid),
        { hasCompletedVendorSetup: true },
        { merge: true }
      );

      // users/{uid}/vendorStalls/{stallId} = {active:true, ...}
      for (const stallId of selected.keys()) {
        await setDoc(
          doc(fs, "users", user.uid, "vendorStalls", stallId),
          { active: true, createdAt: serverTimestamp() },
          { merge: true }
        );
      }

      const firstStallId = selected.keys().next().value;
      sessionStorage.setItem("activeStallId", firstStallId);

      alert("Vendor setup saved!");
      window.location.href = "Home guest.html";
    } catch (e) {
      alert(e?.message || "Failed to save vendor setup.");
    }
  });

  // ---- Load stalls list from Firestore "stalls" ----
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Please sign in again.");
      window.location.href = "Sign InVendor.html";
      return;
    }
    await loadStallsFromFirestore();
  });

  async function loadStallsFromFirestore() {
    if (!stallSelect) return;

    try {
      const snap = await getDocs(collection(fs, "stalls"));

      stallSelect.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = snap.empty ? "No stalls found." : "Select a stall...";
      stallSelect.appendChild(placeholder);

      snap.forEach((d) => {
        const data = d.data() || {};
        const stallId = d.id;

        // Use doc id if no name field exists
        const name = data.stallName || data.name || stallId;
        const cuisine = data.cuisine || "";
        const badge = data.badge || "";
        const hours = data.hours || "";

        const tags = [cuisine, badge].filter(Boolean).join(" • ");
        const meta = [hours].filter(Boolean).join(" • ");

        let label = name;
        if (tags) label += ` (${tags})`;
        if (meta) label += ` — ${meta}`;

        const opt = document.createElement("option");
        opt.value = stallId;
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
