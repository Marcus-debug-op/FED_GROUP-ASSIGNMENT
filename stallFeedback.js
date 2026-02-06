import { fs } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Helper to get ID from URL (Checks for both "id" and "stall")
function getStallId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || params.get("stall"); // This fixes your error
    return id ? id.trim() : null;
}

async function init() {
    const stallId = getStallId();
    
    if (!stallId) {
        // If we still can't find an ID, show error but don't crash
        console.error("Missing stall id in URL");
        alert("Error: No stall selected.");
        return;
    }

    // Load stall data from Firestore using 'fs' (from firebase-init.js)
    const snap = await getDoc(doc(fs, "stalls", stallId));
    
    if (!snap.exists()) {
        alert("Stall not found in database");
        return;
    }

    const s = snap.data();
    const stallDisplayName = s.name || s.displayName || stallId;

    // Fill UI
    const nameEl = document.getElementById("stallNameText");
    if (nameEl) nameEl.textContent = stallDisplayName;

    const imgEl = document.getElementById("stallHeroImg");
    if (imgEl) imgEl.src = s.heroImage || "";

    // Make "Add Feedback" button work
    // We send the user to 'feedback.html' with the stall name
    // And tell it to return here (stallFeedback.html?id=...) after they are done
    const returnUrl = `stallFeedback.html?id=${encodeURIComponent(stallId)}`;
    const addLink = document.getElementById("addFeedbackLink");
    
    if (addLink) {
        addLink.href = `feedback.html?stall=${encodeURIComponent(stallDisplayName)}&return=${encodeURIComponent(returnUrl)}`;
    }

    // Update the page title
    document.title = `${stallDisplayName} - Feedback`;
}

init().catch(console.error);