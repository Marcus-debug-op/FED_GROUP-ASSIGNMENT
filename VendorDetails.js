
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
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // ====== CHANGE THESE IDs TO MATCH YOUR HTML ======
  const stallSelect = document.getElementById("stallSelect");     // <select>
  const addBtn = document.getElementById("addStallBtn");          // "Add Stall"
  const clearBtn = document.getElementById("clearBtn");           // "Clear"
  const chosenList = document.getElementById("selectedChips");    // div/ul to show chosen
  const saveBtn = document.getElementById("saveVendorSetupBtn");  // Save/Continue button
  const pageTitle = document.getElementById("pageTitle");         // Optional: page title element
  // ===============================================

  if (!stallSelect || !addBtn || !clearBtn || !chosenList) {
    console.error("Missing HTML elements for stall picker. Check your IDs.");
    return;
  }

  // Determine mode: "setup" for first-time vendors, "normal" for returning vendors
  const urlParams = new URLSearchParams(window.location.search);
  const isSetupMode = urlParams.get("mode") === "setup";

  let uid = null;
  let chosen = []; // array of { id, name }
  let tempSelectedStalls = []; // For setup mode: stalls selected before saving to DB

  // Update UI based on mode
  function updateUIMode() {
    if (isSetupMode) {
      if (pageTitle) pageTitle.textContent = "Select Stalls to Manage";
      if (saveBtn) saveBtn.textContent = "Save & Continue to Sign In";
      if (clearBtn) clearBtn.style.display = "inline-block";
      if (addBtn) addBtn.style.display = "inline-block";
      if (stallSelect) stallSelect.style.display = "block";
    } else {
      if (pageTitle) pageTitle.textContent = "Your Managed Stalls";
      if (saveBtn) saveBtn.textContent = "Manage Selected Stall";
      if (clearBtn) clearBtn.style.display = "none";
      if (addBtn) addBtn.style.display = "none";
      if (stallSelect) stallSelect.style.display = "none";
    }
  }

  function renderChosen() {
    const stallsToRender = isSetupMode ? tempSelectedStalls : chosen;
    
    if (stallsToRender.length === 0) {
      chosenList.innerHTML = `<div class="muted">No stalls selected yet.</div>`;
      return;
    }

    if (isSetupMode) {
      // Setup mode: show removable chips
      chosenList.innerHTML = stallsToRender
        .map(
          (s) => `
          <div class="chip">
            <span>${escapeHtml(s.name)}</span>
            <button type="button" class="chip-x" data-id="${s.id}">×</button>
          </div>`
        )
        .join("");
    } else {
      // Normal mode: show selectable stall cards
      chosenList.innerHTML = stallsToRender
        .map(
          (s) => `
          <div class="stall-card" data-id="${s.id}">
            <span class="stall-name">${escapeHtml(s.name)}</span>
            <span class="stall-action">Click to Manage →</span>
          </div>`
        )
        .join("");
    }
  }

  // Handle clicks on chips (setup mode) or stall cards (normal mode)
  chosenList.addEventListener("click", async (e) => {
    if (isSetupMode) {
      // Setup mode: remove from temp selection
      const btn = e.target.closest(".chip-x");
      if (!btn) return;
      const stallId = btn.dataset.id;
      tempSelectedStalls = tempSelectedStalls.filter(s => s.id !== stallId);
      renderChosen();
      await loadAvailableStalls();
    } else {
      // Normal mode: select stall to manage
      const card = e.target.closest(".stall-card");
      if (!card) return;
      const stallId = card.dataset.id;
      
      // Store selected stall ID for reference on home page
      sessionStorage.setItem("selectedStallId", stallId);
      sessionStorage.setItem("selectedStallName", chosen.find(s => s.id === stallId)?.name || "");
      
      // Redirect to home guest page
      window.location.href = "index.html";
    }
  });

  function setLoadingSelect(text) {
    stallSelect.innerHTML = `<option value="">${text}</option>`;
    stallSelect.disabled = true;
  }

  async function loadAvailableStalls() {
    setLoadingSelect("Loading stalls...");

    const stallsRef = collection(fs, "stalls");
    const snap = await getDocs(stallsRef);

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

    // Build options based on mode
    snap.forEach((d) => {
      const data = d.data();
      const name = data.name || data.StallName || d.id;
      const takenBy = data.vendorId || null;

      const opt = document.createElement("option");
      opt.value = d.id;

      if (isSetupMode) {
        // Setup mode: show all stalls, disable taken ones
        const isTaken = takenBy !== null;
        const isTempSelected = tempSelectedStalls.some(s => s.id === d.id);
        
        if (isTaken) {
          opt.textContent = `${name} (taken)`;
          opt.disabled = true;
        } else if (isTempSelected) {
          opt.textContent = `${name} (selected)`;
          opt.disabled = true;
        } else {
          opt.textContent = name;
        }
      } else {
        // Normal mode: not used (dropdown hidden)
        opt.textContent = name;
      }

      stallSelect.appendChild(opt);
    });

    stallSelect.disabled = false;
  }

  async function loadMyChosenStalls() {
    // Load stalls already claimed by THIS vendor
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
    batch.update(stallRef, { vendorId: uid });

    // Also store role under users/{uid}
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
    batch.update(stallRef, { vendorId: null });
    await batch.commit();

    await refreshUI();
  }

  async function refreshUI() {
    if (isSetupMode) {
      await loadAvailableStalls();
    } else {
      await loadMyChosenStalls();
    }
  }

  // Add stall button (setup mode only)
  addBtn.addEventListener("click", async () => {
    if (!isSetupMode) return;
    
    const stallId = stallSelect.value;
    if (!stallId) {
      alert("Please select a stall first.");
      return;
    }

    const stallName = stallSelect.options[stallSelect.selectedIndex].text;
    
    // Add to temp selection
    if (!tempSelectedStalls.some(s => s.id === stallId)) {
      tempSelectedStalls.push({ id: stallId, name: stallName });
    }
    
    renderChosen();
    stallSelect.value = "";
    await loadAvailableStalls();
  });

  // Clear button (setup mode only)
  clearBtn.addEventListener("click", async () => {
    if (!isSetupMode) return;
    
    if (!confirm("Clear all selected stalls?")) return;
    tempSelectedStalls = [];
    renderChosen();
    await loadAvailableStalls();
  });

  // Save button handler
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (isSetupMode) {
        // Setup mode: save selected stalls and redirect to sign in
        if (tempSelectedStalls.length === 0) {
          alert("Please select at least one stall before continuing.");
          return;
        }

        if (!uid) {
          alert("Session expired. Please sign up again.");
          window.location.href = "createaccountvendor.html";
          return;
        }

        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";

          // Claim all selected stalls
          const batch = writeBatch(fs);
          
          for (const stall of tempSelectedStalls) {
            const stallRef = doc(fs, "stalls", stall.id);
            const stallSnap = await getDoc(stallRef);
            
            if (stallSnap.exists()) {
              const data = stallSnap.data();
              // Only claim if not taken by someone else
              if (!data.vendorId || data.vendorId === uid) {
                batch.update(stallRef, { vendorId: uid });
              }
            }
          }

          // Update user profile
          const userRef = doc(fs, "users", uid);
          batch.set(userRef, { 
            hasCompletedVendorSetup: true,
            stallCount: tempSelectedStalls.length,
            updatedAt: serverTimestamp()
          }, { merge: true });

          await batch.commit();

          alert("Stalls saved successfully! Please sign in to continue.");
          
          // Sign out and redirect to sign in page
          await auth.signOut();
          window.location.href = "signinvendor.html";
        } catch (e) {
          console.error(e);
          alert("Failed to save stalls. Please try again.");
          saveBtn.disabled = false;
          saveBtn.textContent = "Save & Continue to Sign In";
        }
      } else {

        alert("Please click on a stall card to manage it.");
      }
    });
  }

  // Auth state handler
  onAuthStateChanged(auth, async (user) => {
    if (isSetupMode) {
      // Setup mode: user just created account, should be logged in
      if (!user) {
        // Not logged in, redirect to sign up
        window.location.href = "createaccountvendor.html"
        return;
      }
      uid = user.uid;
      updateUIMode();
      await loadAvailableStalls();
    } else {
      // Normal mode: must be logged in
      if (!user) {
        window.location.href = "signinvendor.html";
        return;
      }
      uid = user.uid;
      updateUIMode();
      await loadMyChosenStalls();
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
});