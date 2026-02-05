import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
    authDomain: "hawkerhub-64e2d.firebaseapp.com",
    projectId: "hawkerhub-64e2d",
    storageBucket: "hawkerhub-64e2d.firebasestorage.app",
    messagingSenderId: "722888051277",
    appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// DOM Elements
const stallSelect = document.getElementById("stallSelect");
const addStallBtn = document.getElementById("addStallBtn");
const clearBtn = document.getElementById("clearBtn");
const selectedChips = document.getElementById("selectedChips");
const notListedCheck = document.getElementById("notListedCheck");
const requestBox = document.getElementById("requestBox");
const saveBtn = document.getElementById("saveVendorSetupBtn");

let selectedStalls = []; // Stores objects: { id, name }

// 1. Fetch Stalls on Load
async function loadStalls() {
    console.log("Loading stalls...");
    try {
        const querySnapshot = await getDocs(collection(db, "stalls"));
        
        // Reset the dropdown
        stallSelect.innerHTML = '<option value="">-- Select a Stall --</option>';
        
        if (querySnapshot.empty) {
            console.warn("No stalls found in Firestore 'stalls' collection.");
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Use 'name' or 'stallName' or 'title' depending on your DB structure
            const stallName = data.name || data.stallName || "Unnamed Stall";
            
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = stallName;
            stallSelect.appendChild(option);
        });
        console.log("Stalls loaded successfully.");
    } catch (error) {
        console.error("Error loading stalls:", error);
        stallSelect.innerHTML = '<option value="">Error loading stalls (See Console)</option>';
    }
}

// 2. Add Stall Logic
if (addStallBtn) {
    addStallBtn.addEventListener("click", () => {
        const stallId = stallSelect.value;
        const stallName = stallSelect.options[stallSelect.selectedIndex].text;

        if (!stallId) return alert("Please select a stall first.");

        // Check if already added
        if (selectedStalls.some(s => s.id === stallId)) {
            return alert("Stall already added.");
        }

        // Add to array
        selectedStalls.push({ id: stallId, name: stallName });
        renderChips();
        stallSelect.value = ""; // Reset dropdown
    });
}

// 3. Render Chips
function renderChips() {
    selectedChips.innerHTML = "";
    selectedStalls.forEach((stall, index) => {
        const chip = document.createElement("div");
        chip.style.cssText = "background:#e0e0e0; padding:5px 12px; border-radius:16px; display:inline-flex; align-items:center; gap:8px; margin:4px; font-size:0.9rem;";
        
        chip.innerHTML = `
            <span>${stall.name}</span>
            <span class="remove-chip" style="cursor:pointer; font-weight:bold; color:#d32f2f;">&times;</span>
        `;
        
        chip.querySelector(".remove-chip").addEventListener("click", () => {
            selectedStalls.splice(index, 1);
            renderChips();
        });
        
        selectedChips.appendChild(chip);
    });
}

// 4. Clear Selection
if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        selectedStalls = [];
        renderChips();
    });
}

// 5. Toggle Request Box
if (notListedCheck) {
    notListedCheck.addEventListener("change", (e) => {
        if (requestBox) {
            requestBox.style.display = e.target.checked ? "block" : "none";
        }
    });
}

// 6. Save & Continue
if (saveBtn) {
    saveBtn.addEventListener("click", () => {
        if (selectedStalls.length === 0 && (!notListedCheck || !notListedCheck.checked)) {
            return alert("Please select at least one stall OR request a new one.");
        }

        localStorage.setItem("vendor_selected_stalls", JSON.stringify(selectedStalls));
        
        // Redirect to Sign In (or wherever you want them to go next)
        window.location.href = "Home Guest.html"; 
    });
}

// Run initialization
loadStalls();