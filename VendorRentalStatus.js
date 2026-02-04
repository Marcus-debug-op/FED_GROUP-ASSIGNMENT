import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("Rental Status Script Loaded");

// 1. SET DATE FOOTER
const dateDisplay = document.getElementById("currentDateDisplay");
if (dateDisplay) {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateDisplay.textContent = today.toLocaleDateString('en-US', options);
}

// 2. HELPER FUNCTION
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
        if (text === "Loading..." || text === "N/A") el.style.color = "#ccc";
        else el.style.color = ""; 
    }
}

// 3. AUTH CHECK
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadRentalInfo(user.uid);
    } else {
        window.location.href = "sign up.html";
    }
});

// 4. MAIN LOAD FUNCTION
async function loadRentalInfo(uid) {
    try {
        // Step A: Find the Stall ID linked to this User
        const stallsRef = collection(fs, "stalls");
        const q = query(stallsRef, where("vendorId", "==", uid)); 
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const stallDoc = querySnapshot.docs[0];
            const stallId = stallDoc.id; // e.g., "satay_king"
            const mainData = stallDoc.data();
            
            console.log("Stall found:", stallId);

            // Step B: Fetch 'rental' document from 'rental_details' sub-collection
            // FIX: Changed "current" to "rental" to match your screenshot
            const rentalRef = doc(fs, "stalls", stallId, "rental_details", "rental");
            const rentalSnap = await getDoc(rentalRef);
            
            let rentalData = {};

            if (rentalSnap.exists()) {
                console.log("Found rental data!");
                rentalData = rentalSnap.data();
            } else {
                console.warn("Sub-collection document 'rental' not found. Using main doc fields.");
                rentalData = mainData; // Fallback
            }

            // Step C: Update the UI
            updateUI(mainData, rentalData);

        } else {
            console.error("No stall found for this user.");
            setText("displayStallName", "No Stall Linked");
        }
    } catch (err) {
        console.error("Error loading rental info:", err);
    }
}

// 5. UPDATE UI FUNCTION
function updateUI(mainData, rentalData) {
    // Header Info
    setText("displayStallNo", rentalData.stallNo || "Stall #--");
    setText("displayStallName", mainData.name || "Unknown Stall");

    // Grid Info
    setText("displayLocation", rentalData.location || "Location Not Set");
    setText("displayType", mainData.cuisine || "General");

    // Rent Formatting
    const rentVal = rentalData.rent || 0;
    const rentText = rentVal ? `$${parseInt(rentVal).toLocaleString()}` : "$0.00";
    setText("displayRent", rentText);

    // Lease Dates
    const start = rentalData.leaseStart || "--";
    const end = rentalData.leaseEnd || "--";
    setText("displayLease", `${start} - ${end}`);

    // Payments
    setText("displayNextPay", rentalData.nextPayment || "N/A");
    setText("displayLastPay", rentalData.lastPayment || "N/A");

    // Expiry (Your DB screenshot doesn't show 'leaseExpiry', so using leaseEnd as fallback)
    setText("displayExpiry", rentalData.leaseExpiry || rentalData.leaseEnd || "N/A");
}