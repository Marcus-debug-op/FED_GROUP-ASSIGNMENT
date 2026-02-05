import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";


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
                if (rentalSnap.exists()) {
            const data = rentalSnap.data();
            const missing = !data.nextPaymentDue && !data.lastPaymentMade;

            if (missing) {
                await setDoc(rentalRef, {
                nextPaymentDue: "",
                lastPaymentMade: "",
                updatedAt: serverTimestamp(),
                }, { merge: true });
            }
            }
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
    const nextDueTS = rentalData.nextPaymentDue;
    const lastMadeTS = rentalData.lastPaymentMade;

    const nextDueText = nextDueTS?.toDate
    ? formatDate(nextDueTS.toDate())
    : "Not set";

    const lastMadeText = lastMadeTS?.toDate
    ? formatDate(lastMadeTS.toDate())
    : "Not set";

    setText("displayNextPay", nextDueText);
    setText("displayLastPay", lastMadeText);

    updateStatusPill(nextDueTS, lastMadeTS);

    setText("displayNextPay", nextDue);
    setText("displayLastPay", lastMade);

    // ✅ update pill automatically
    updateStatusPill(nextDue, lastMade);

    // Expiry (Your DB screenshot doesn't show 'leaseExpiry', so using leaseEnd as fallback)
    setText("displayExpiry", rentalData.leaseExpiry || rentalData.leaseEnd || "N/A");
}

// ===============================
// STATUS PILL (auto-switch)
// ===============================

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
      status = `Due Soon${Number.isFinite(daysUntilDue) ? ` (${daysUntilDue}d)` : ""}`;
      cls = "due";
    } else {
      // Optional stricter logic:
      // If they haven't paid since last due, mark as Due Soon even if due is far.
      // But most dashboards show Paid until close to due date.
      status = "Paid";
      cls = "paid";
    }
  }

  // If last payment is missing and due is near, keep due/due soon
  // If last payment exists and it's after the due date, treat as paid
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

// normalize date to start of day
function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// supports: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY, "1 Feb 2026", Firestore Timestamp, Date
function parseAnyDate(input) {
  if (!input) return null;

  // Firestore Timestamp support
  if (typeof input === "object" && typeof input.toDate === "function") {
    try { return input.toDate(); } catch { return null; }
  }

  if (input instanceof Date) return input;

  const s = String(input).trim();
  if (!s || s.toLowerCase() === "n/a" || s.toLowerCase() === "loading...") return null;

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
