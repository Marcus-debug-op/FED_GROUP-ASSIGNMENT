import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, query, where, getDocs, 
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("Lease License Script Loaded");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "sign up.html";
    return;
  }

  await loadLicenseData(user);
});

async function loadLicenseData(user) {
  try {
    // Find vendor's stall
    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", user.uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      alert("No stall assigned to your account");
      window.location.href = "Vender AccountRentalStatus.html";
      return;
    }

    const stallDoc = querySnapshot.docs[0];
    const stallId = stallDoc.id;
    const stallData = stallDoc.data();

    // Get rental details
    const rentalRef = doc(fs, "stalls", stallId, "rental_details", "rental");
    const rentalSnap = await getDoc(rentalRef);

    let rentalData = {};
    if (rentalSnap.exists()) {
      rentalData = rentalSnap.data();
    }

    // Get user profile data
    const userRef = doc(fs, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? userSnap.data() : {};

    // Populate license document
    populateLicense(stallId, stallData, rentalData, user, userData);

  } catch (error) {
    console.error("Error loading license data:", error);
    alert("Failed to load license information");
  }
}

function populateLicense(stallId, stallData, rentalData, user, userData) {
  // Stall Information
  setText("licenseStallName", stallData.name || stallData.StallName || "N/A");
  setText("licenseStallNo", rentalData.stallNo || stallData.stallNo || "N/A");
  setText("licenseStallId", stallId);
  setText("licenseLocation", rentalData.location || stallData.location || "N/A");
  setText("licenseCuisine", stallData.cuisine || stallData.type || "General");

  // Owner Information
  const ownerName = userData.name || userData.displayName || user.displayName || "N/A";
  setText("licenseOwnerName", ownerName);
  setText("licenseEmail", user.email || "N/A");
  setText("licenseVendorId", user.uid.substring(0, 12) + "...");

  // Lease Terms
  const leaseStart = formatAnyDate(rentalData.leaseStart) || formatAnyDate(stallData.leaseStart) || "N/A";
  const leaseEnd = formatAnyDate(rentalData.leaseEnd) || formatAnyDate(stallData.leaseEnd) || "N/A";
  const rent = rentalData.rent || stallData.rent || 1000;

  setText("licenseLeaseStart", leaseStart);
  setText("licenseLeaseEnd", leaseEnd);
  setText("licenseRent", `$${parseInt(rent).toLocaleString()} / month`);

  // Lease Status
  const status = calculateLeaseStatus(rentalData.leaseEnd || stallData.leaseEnd);
  const statusEl = document.getElementById("licenseStatus");
  if (statusEl) {
    statusEl.textContent = status.text;
    statusEl.style.color = status.color;
  }

  // Payment Information
  const nextPayment = formatAnyDate(rentalData.nextPaymentDue) || "Not set";
  const lastPayment = formatAnyDate(rentalData.lastPaymentMade) || "Not set";
  
  setText("licenseNextPayment", nextPayment);
  setText("licenseLastPayment", lastPayment);

  // Payment Status
  const paymentStatus = calculatePaymentStatus(rentalData.nextPaymentDue);
  const paymentStatusEl = document.getElementById("licensePaymentStatus");
  if (paymentStatusEl) {
    paymentStatusEl.textContent = paymentStatus.text;
    paymentStatusEl.style.color = paymentStatus.color;
  }

  // License metadata
  const today = new Date();
  setText("licenseIssueDate", `Issued: ${formatDate(today)}`);
  setText("licenseGeneratedDate", formatDateTime(today));
  setText("licenseDocId", generateLicenseId(stallId, user.uid));
}

function calculateLeaseStatus(leaseEnd) {
  if (!leaseEnd) return { text: "Unknown", color: "#999" };
  
  const endDate = parseAnyDate(leaseEnd);
  if (!endDate) return { text: "Unknown", color: "#999" };
  
  const today = new Date();
  const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysRemaining < 0) {
    return { text: "Expired", color: "#f44336" };
  } else if (daysRemaining === 0) {
    return { text: "Expires Today", color: "#ff9800" };
  } else if (daysRemaining <= 30) {
    return { text: `Active (${daysRemaining} days remaining)`, color: "#ff9800" };
  } else {
    return { text: "Active", color: "#4caf50" };
  }
}

function calculatePaymentStatus(nextPaymentDue) {
  if (!nextPaymentDue) return { text: "No payment due", color: "#999" };
  
  const dueDate = parseAnyDate(nextPaymentDue);
  if (!dueDate) return { text: "Unknown", color: "#999" };
  
  const today = new Date();
  const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilDue < 0) {
    return { text: "Overdue", color: "#f44336" };
  } else if (daysUntilDue === 0) {
    return { text: "Due Today", color: "#ff9800" };
  } else if (daysUntilDue <= 7) {
    return { text: `Due Soon (${daysUntilDue} days)`, color: "#ff9800" };
  } else {
    return { text: "Up to Date", color: "#4caf50" };
  }
}

function generateLicenseId(stallId, userId) {
  const stallPart = stallId.substring(0, 6).toUpperCase();
  const userPart = userId.substring(0, 6).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  return `HH-${stallPart}-${userPart}-${timestamp}`;
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = text;
  }
}

function formatAnyDate(input) {
  const parsed = parseAnyDate(input);
  return parsed ? formatDate(parsed) : null;
}

function parseAnyDate(input) {
  if (!input) return null;

  // Firestore Timestamp
  if (typeof input === "object" && typeof input.toDate === "function") {
    try { 
      return input.toDate(); 
    } catch { 
      return null; 
    }
  }

  if (input instanceof Date) return input;

  const s = String(input).trim();
  if (!s || s.toLowerCase() === "n/a") return null;

  // YYYY-MM-DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split(/[-/]/).map(Number);
    return new Date(y, m - 1, d);
  }

  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  const native = new Date(s);
  if (!isNaN(native.getTime())) return native;

  return null;
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateTime(date) {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
}