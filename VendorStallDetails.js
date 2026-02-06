// VendorDetails.js (STALL CHOOSER, not preallocated)
import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ====== CHANGE THESE IDs TO MATCH YOUR HTML ======
  const stallSelect = document.getElementById("stallSelect");     // <select>
  const addBtn = document.getElementById("addStallBtn");          // "Add Stall"
  const clearBtn = document.getElementById("clearBtn");           // "Clear"
  const chosenList = document.getElementById("selectedChips"); // div/ul to show chosen
  // ===============================================

  if (!stallSelect || !addBtn || !clearBtn || !chosenList) {
    console.error("Missing HTML elements for stall picker. Check your IDs.");
    return;
  }

  let uid = null;
  let chosen = []; // array of { id, name }

  function renderChosen() {
    if (chosen.length === 0) {
      chosenList.innerHTML = `<div class="muted">No stalls added yet.</div>`;
      return;
    }
    chosenList.innerHTML = chosen
      .map(
        (s) => `
        <div class="chip">
          <span>${escapeHtml(s.name)}</span>
          <button type="button" class="chip-x" data-id="${s.id}">×</button>
        </div>`
      )
      .join("");
  }

  chosenList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".chip-x");
    if (!btn) return;
    const stallId = btn.dataset.id;
    await unclaimStall(stallId);
  });

  function setLoadingSelect(text) {
    stallSelect.innerHTML = `<option value="">${text}</option>`;
    stallSelect.disabled = true;
  }

  async function loadAvailableStalls() {
  setLoadingSelect("Loading stalls...");

  const stallsRef = collection(fs, "stalls");
  const snap = await getDocs(stallsRef); // ✅ load ALL stalls

  stallSelect.innerHTML = "";

  // placeholder
  const ph = document.createElement("option");
  ph.value = "";
  ph.textContent = "Select a stall...";
  stallSelect.appendChild(ph);

  if (snap.empty) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No stalls found";
    stallSelect.appendChild(opt);
    stallSelect.disabled = true;
    return;
  }

  // Build options, disabling taken stalls
  snap.forEach((d) => {
    const data = d.data();
    const name = data.name || data.StallName || d.id;

    const takenBy = data.vendorId || null;
    const isMine = takenBy && takenBy === uid;
    const isTaken = takenBy && takenBy !== uid;

    const opt = document.createElement("option");
    opt.value = d.id;

    if (isTaken) {
      opt.textContent = `${name} (taken)`;
      opt.disabled = true; // ❌ cannot select
    } else if (isMine) {
      opt.textContent = `${name} (yours)`;
      opt.disabled = true; // optional: prevent re-adding duplicates
    } else {
      opt.textContent = name; // ✅ available
    }

    stallSelect.appendChild(opt);
  });

  stallSelect.disabled = false;
}


  async function loadMyChosenStalls() {
    // Load stalls already claimed by THIS vendor so they show up as chosen
    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", uid));
    const snap = await getDocs(q);

    chosen = [];
    snap.forEach((d) => {
      const data = d.data();
      chosen.push({ id: d.id, name: data.name || data.StallName || d.id });
    });
    renderChosen();
  }

  async function claimStall(stallId) {
    if (!uid) return;

    // SAFETY CHECK: prevent claiming if someone else already took it
    const stallRef = doc(fs, "stalls", stallId);
    const stallSnap = await getDoc(stallRef);
    if (!stallSnap.exists()) {
      alert("This stall no longer exists.");
      return;
    }

    const data = stallSnap.data();
    if (data.vendorId && data.vendorId !== uid) {
      alert("Sorry — this stall was just taken by another vendor.");
      await loadAvailableStalls();
      return;
    }

    // Claim it
    const batch = writeBatch(fs);
    batch.update(stallRef, { vendorId: uid }); // claim

    // (optional) also store a simple list under users/{uid}
    const userRef = doc(fs, "users", uid);
    batch.set(userRef, { role: "vendor" }, { merge: true });

    await batch.commit();
  }

  async function unclaimStall(stallId) {
    if (!uid) return;

    const stallRef = doc(fs, "stalls", stallId);
    const stallSnap = await getDoc(stallRef);
    if (!stallSnap.exists()) return;

    const data = stallSnap.data();
    if (data.vendorId !== uid) {
      alert("You can only remove stalls you own.");
      return;
    }

    // Unclaim
    const batch = writeBatch(fs);
    batch.update(stallRef, { vendorId: null }); // back to available
    await batch.commit();

    await refreshUI();
  }

  async function refreshUI() {
    await loadMyChosenStalls();
    await loadAvailableStalls();
  }

  addBtn.addEventListener("click", async () => {
    const stallId = stallSelect.value;
    if (!stallId) {
      alert("Please select a stall first.");
      return;
    }
    try {
      addBtn.disabled = true;
      await claimStall(stallId);
      await refreshUI();
    } catch (e) {
      console.error(e);
      alert("Failed to add stall.");
    } finally {
      addBtn.disabled = false;
    }
  });

  clearBtn.addEventListener("click", async () => {
    // Clears ALL chosen stalls for this vendor
    if (!uid) return;
    if (!confirm("Remove all your stalls?")) return;

    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", uid));
    const snap = await getDocs(q);

    const batch = writeBatch(fs);
    snap.forEach((d) => batch.update(d.ref, { vendorId: null }));
    await batch.commit();

    await refreshUI();
  });

  // Save button handler
  const saveBtn = document.getElementById("saveVendorSetupBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      if (chosen.length === 0) {
        alert("Please select at least one stall before continuing.");
        return;
      }
      window.location.href = "Home Guest.html";
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "sign up.html";
      return;
    }
    uid = user.uid;
    await refreshUI();
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
});