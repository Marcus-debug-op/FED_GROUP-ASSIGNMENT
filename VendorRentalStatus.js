import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, query, where, getDocs, 
  doc, getDoc, setDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("Rental Status Script Loaded");

// 1. SET DATE FOOTER
const dateFooter = document.querySelector('.dash-footer .muted');
if (dateFooter) {
  const today = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  dateFooter.textContent = today.toLocaleDateString('en-US', options);
}

// 2. HELPER FUNCTION TO SET TEXT
function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el) {
    el.textContent = text;
    if (text === "Loading..." || text === "N/A") {
      el.style.color = "#ccc";
    } else {
      el.style.color = ""; 
    }
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
    // Find the Stall ID linked to this User
    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", uid)); 
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const stallDoc = querySnapshot.docs[0];
      const stallId = stallDoc.id;
      const mainData = stallDoc.data();
      
      console.log("Stall found:", stallId);

      // Fetch 'rental' document from 'rental_details' sub-collection
      const rentalRef = doc(fs, "stalls", stallId, "rental_details", "rental");
      const rentalSnap = await getDoc(rentalRef);
      
      let rentalData = {};

      if (rentalSnap.exists()) {
        console.log("Found rental data!");
        rentalData = rentalSnap.data();
        
        // Ensure required fields exist
        const missing = !rentalData.hasOwnProperty('nextPaymentDue') || 
                       !rentalData.hasOwnProperty('lastPaymentMade');

        if (missing) {
          await setDoc(rentalRef, {
            nextPaymentDue: rentalData.nextPaymentDue || "",
            lastPaymentMade: rentalData.lastPaymentMade || "",
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } else {
        console.warn("Sub-collection document 'rental' not found. Using main doc fields.");
        rentalData = mainData; // Fallback
      }

      // Update the UI
      updateUI(mainData, rentalData);

    } else {
      console.error("No stall found for this user.");
      setText('.rental-title', "No Stall Linked");
    }
  } catch (err) {
    console.error("Error loading rental info:", err);
  }
}

// 5. UPDATE UI FUNCTION
function updateUI(mainData, rentalData) {
  // Header - Stall Name
  const stallName = mainData.name || mainData.StallName || "Unknown Stall";
  setText('.rental-title', stallName);
  
  // Update banner if it exists
  const bannerTitle = document.getElementById('stallNameDisplay');
  if (bannerTitle) {
    bannerTitle.textContent = `${stallName} - Rental Status`;
  }

  // Grid Tiles - using class selectors based on position
  const tiles = document.querySelectorAll('.rental-tile .tile-value');
  
  if (tiles[0]) { // Location
    tiles[0].textContent = rentalData.location || mainData.location || "Location Not Set";
  }
  
  if (tiles[1]) { // Stall Type
    tiles[1].textContent = mainData.cuisine || mainData.type || "General";
  }
  
  if (tiles[2]) { // Monthly Rent
    const rentVal = rentalData.rent || mainData.rent || 0;
    const rentText = rentVal ? `$${parseInt(rentVal).toLocaleString()}` : "$0.00";
    tiles[2].textContent = rentText;
  }
  
  if (tiles[3]) { // Lease Period
    const start = formatAnyDate(rentalData.leaseStart) || formatAnyDate(mainData.leaseStart) || "N/A";
    const end = formatAnyDate(rentalData.leaseEnd) || formatAnyDate(mainData.leaseEnd) || "N/A";
    tiles[3].textContent = `${start} – ${end}`;
  }

  // Payment Information Panel
  const paymentKVs = document.querySelectorAll('.panel:nth-of-type(1) .kv .v');
  
  if (paymentKVs[0]) { // Next Payment Due
    const nextDueText = formatAnyDate(rentalData.nextPaymentDue) || "Not set";
    paymentKVs[0].textContent = nextDueText;
  }
  
  if (paymentKVs[1]) { // Last Payment Made
    // If lastPaymentMade is not set but we have a lease, show current date
    let lastMadeText;
    if (rentalData.lastPaymentMade) {
      lastMadeText = formatAnyDate(rentalData.lastPaymentMade);
    } else if (rentalData.leaseEnd || mainData.leaseEnd) {
      // Default to current date if lease exists but no payment recorded
      lastMadeText = formatDate(new Date());
    } else {
      lastMadeText = "Not set";
    }
    paymentKVs[1].textContent = lastMadeText;
  }
  
  if (paymentKVs[2]) { // Amount (same as rent)
    const rentVal = rentalData.rent || mainData.rent || 1000; // Default to $1000
    const rentText = rentVal ? `$${parseInt(rentVal).toLocaleString()}` : "$0.00";
    paymentKVs[2].textContent = rentText;
  }

  // Lease Actions Panel (formerly Remarks)
  const actionsKVs = document.querySelectorAll('.panel:nth-of-type(2) .kv .v');
  
  if (actionsKVs[0]) { // Lease Expiry Date
    const expiryDate = formatAnyDate(rentalData.leaseEnd) || formatAnyDate(mainData.leaseEnd) || "N/A";
    actionsKVs[0].textContent = expiryDate;
  }

  // Update status pill
  updateStatusPill(rentalData.nextPaymentDue, rentalData.lastPaymentMade);
}

// 6. STATUS PILL (auto-switch)
function updateStatusPill(nextPaymentDue, lastPaymentMade) {
  const el = document.getElementById("paymentStatus");
  if (!el) return;

  const due = parseAnyDate(nextPaymentDue);
  const last = parseAnyDate(lastPaymentMade);
  const today = startOfDay(new Date());

  // Default
  let status = "Paid";
  let cls = "paid";

  // If no due date, cannot evaluate properly
  if (!due) {
    status = "Status Unknown";
    cls = "due";
  } else {
    const dueDay = startOfDay(due);
    const daysUntilDue = Math.ceil((dueDay - today) / (1000 * 60 * 60 * 24));

    // Overdue if today > due date
    if (today > dueDay) {
      status = "Overdue";
      cls = "overdue";
    } else if (daysUntilDue <= 7) {
      status = `Due Soon (${daysUntilDue}d)`;
      cls = "due";
    } else {
      status = "Paid";
      cls = "paid";
    }
  }

  // If last payment is after due date, mark as paid
  if (due && last) {
    const dueDay = startOfDay(due);
    const lastDay = startOfDay(last);
    if (lastDay >= dueDay) {
      status = "Paid";
      cls = "paid";
    }
  }

  el.textContent = status;
  el.className = `status-pill ${cls}`;
}

// 7. HELPER FUNCTIONS

// Normalize date to start of day
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Format any date type to readable string
function formatAnyDate(input) {
  const parsed = parseAnyDate(input);
  return parsed ? formatDate(parsed) : null;
}

// Parse various date formats
function parseAnyDate(input) {
  if (!input) return null;

  // Firestore Timestamp support
  if (typeof input === "object" && typeof input.toDate === "function") {
    try { 
      return input.toDate(); 
    } catch { 
      return null; 
    }
  }

  if (input instanceof Date) return input;

  const s = String(input).trim();
  if (!s || s.toLowerCase() === "n/a" || s.toLowerCase() === "loading...") {
    return null;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split(/[-/]/).map(Number);
    return new Date(y, m - 1, d);
  }

  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  // Try native parse (e.g. "1 Feb 2026", "February 1, 2026")
  const native = new Date(s);
  if (!isNaN(native.getTime())) return native;

  return null;
}

// Format date to DD/MM/YYYY
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}