// 1. Import from your shared file (CLEANER)
import { fs } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Helper to get ID from URL (Checks for both "id" and "stall")
function getStallId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || params.get("stall"); // Support both ?id= and ?stall=
    return id ? id.trim() : null;
}

async function loadDetails() {
    const stallId = getStallId();
    
    // --- HANDLE MISSING ID ---
    if (!stallId) {
        document.getElementById("stall-name").textContent = "No stall selected";
        console.error("No Stall ID found in URL");
        return;
    }

    console.log("Loading details for:", stallId); // Debugging

    // --- FETCH DATA FROM FIRESTORE ---
    // Note: We use 'fs' here, which is the database imported from firebase-init.js
    const snap = await getDoc(doc(fs, "stalls", stallId));

    if (!snap.exists()) {
        document.getElementById("stall-name").textContent = "Stall not found";
        return;
    }

    const s = snap.data();

    // --- FILL IN THE HTML ---
    document.title = `${s.displayName || "Stall"} - Details`;
    document.getElementById("stall-name").textContent = s.name || stallId;
    document.getElementById("stall-id-display").textContent = s.stallNo || ("#" + stallId.toUpperCase());

    // Image
    const imgElement = document.getElementById("stall-img");
    if (imgElement) {
        imgElement.src = s.heroImage || "";
        imgElement.alt = s.displayName || stallId;
    }

    // Badge
    const badge = document.getElementById("stall-badge");
    if (s.badge && badge) {
        badge.style.display = "block";
        badge.textContent = s.badge;
    }

    // Hygiene + Cuisine
    document.getElementById("stall-hygiene").textContent = s.hygiene ? `Hygiene ${s.hygiene}` : "";
    document.getElementById("stall-cuisine").textContent = s.cuisine || "";

    // Rating
    const ratingText = (s.rating != null && s.reviews != null)
        ? `${s.rating} (${s.reviews} reviews)`
        : (s.rating != null ? `${s.rating}` : "");
    document.getElementById("stall-rating").textContent = ratingText;

    // Description
    document.getElementById("stall-desc").textContent = s.description || "";

    // Info Grid
    document.getElementById("stall-location").textContent = s.location || "-";
    document.getElementById("stall-hours").textContent = s.hours || "-";
    document.getElementById("stall-price").textContent = s.priceRange || "-";
    document.getElementById("stall-phone").textContent = s.phone || "-";

    // --- UPDATE BUTTON LINKS (THE IMPORTANT PART) ---

    // 1. Update Menu Link
    const menuLink = document.getElementById("menu-link");
    if (menuLink) {
        menuLink.href = `menus.html?id=${encodeURIComponent(stallId)}`;
    }

    // 2. Update Feedback Link
    const feedbackLink = document.getElementById("feedback-link");
    if (feedbackLink) {
        feedbackLink.href = `stallFeedback.html?id=${encodeURIComponent(stallId)}`;
    }

    // 3. Update "Add Complaint" Link (Finds it automatically)
    // We look for the link that points to "complaint.html" OR has the ID "add-complaint-btn"
    const complaintBtn = document.getElementById("add-complaint-btn") || document.querySelector('a[href*="complaint.html"]');
    
    if (complaintBtn) {
        // This ensures the link becomes "complaint.html?id=ahseng"
        complaintBtn.href = `complaint.html?id=${encodeURIComponent(stallId)}`;
    }
}

// Run the function
loadDetails().catch(console.error);