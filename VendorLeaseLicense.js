import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, query, where, getDocs, 
  doc, getDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Configuration
let config = {
  currencySymbol: 'S$'
};

// State
let currentUser = null;
let currentStallId = null;
let currentStallData = null;
let currentRentalData = null;

// DOM Elements mapping to your HTML IDs
const els = {
  // Stall Info
  licenseStallName: document.getElementById("licenseStallName"),
  licenseStallNo: document.getElementById("licenseStallNo"),
  licenseStallId: document.getElementById("licenseStallId"),
  licenseLocation: document.getElementById("licenseLocation"),
  licenseCuisine: document.getElementById("licenseCuisine"),
  
  // Owner Info
  licenseOwnerName: document.getElementById("licenseOwnerName"),
  licenseEmail: document.getElementById("licenseEmail"),
  licenseVendorId: document.getElementById("licenseVendorId"),
  
  // Lease Terms
  licenseLeaseStart: document.getElementById("licenseLeaseStart"),
  licenseLeaseEnd: document.getElementById("licenseLeaseEnd"),
  licenseRent: document.getElementById("licenseRent"),
  licenseStatus: document.getElementById("licenseStatus"),
  
  // Payment Info
  licenseNextPayment: document.getElementById("licenseNextPayment"),
  licenseLastPayment: document.getElementById("licenseLastPayment"),
  licensePaymentStatus: document.getElementById("licensePaymentStatus"),
  
  // Footer
  licenseIssueDate: document.getElementById("licenseIssueDate"),
  licenseDocId: document.getElementById("licenseDocId"),
  licenseGeneratedDate: document.getElementById("licenseGeneratedDate")
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 License Document Loaded");
  initAuth();
});

function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "signup.html";
      return;
    }

    currentUser = user;
    console.log("✅ User:", user.uid);
    
    try {
      await loadLicenseData();
    } catch (error) {
      console.error("❌ Error loading license:", error);
      showError("Failed to load license data. Please try again.");
    }
  });
}

async function loadLicenseData() {
  // 1. Find vendor's stall
  const stallsRef = collection(fs, "stalls");
  const q = query(stallsRef, where("vendorId", "==", currentUser.uid));
  const stallSnap = await getDocs(q);

  if (stallSnap.empty) {
    throw new Error("No stall found for this account");
  }

  currentStallId = stallSnap.docs[0].id;
  currentStallData = stallSnap.docs[0].data();
  
  console.log("🏪 Stall found:", currentStallId);

  // 2. Get rental details
  const rentalRef = doc(fs, "stalls", currentStallId, "rental_details", "current");
  const rentalSnap = await getDoc(rentalRef);
  
  if (rentalSnap.exists()) {
    currentRentalData = rentalSnap.data();
  } else {
    // Try old path
    const oldRef = doc(fs, "stalls", currentStallId, "rental_details", "rental");
    const oldSnap = await getDoc(oldRef);
    if (oldSnap.exists()) {
      currentRentalData = oldSnap.data();
    }
  }

  // 3. Get user profile data
  const userRef = doc(fs, "vendors", currentUser.uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : {};

  // 4. Populate all fields
  populateLicenseData(userData);
}

function populateLicenseData(userData) {
  const stall = currentStallData || {};
  const rental = currentRentalData || {};
  
  // Stall Information
  if (els.licenseStallName) els.licenseStallName.textContent = stall.name || stall.stallName || "Not Set";
  if (els.licenseStallNo) els.licenseStallNo.textContent = stall.stallNumber || "N/A";
  if (els.licenseStallId) els.licenseStallId.textContent = currentStallId;
  if (els.licenseLocation) els.licenseLocation.textContent = stall.location || "HawkerHub Center";
  if (els.licenseCuisine) els.licenseCuisine.textContent = stall.cuisine || "Mixed Cuisine";
  
  // Owner Information
  if (els.licenseOwnerName) els.licenseOwnerName.textContent = userData.fullName || userData.displayName || currentUser.displayName || "License Holder";
  if (els.licenseEmail) els.licenseEmail.textContent = currentUser.email;
  if (els.licenseVendorId) els.licenseVendorId.textContent = currentUser.uid.substring(0, 8) + "...";
  
  // Lease Terms
  const leaseStart = rental.leaseStart ? convertToDate(rental.leaseStart) : null;
  const leaseEnd = rental.leaseEnd ? convertToDate(rental.leaseEnd) : null;
  
  if (els.licenseLeaseStart) els.licenseLeaseStart.textContent = leaseStart ? formatDate(leaseStart) : "Not Set";
  if (els.licenseLeaseEnd) els.licenseLeaseEnd.textContent = leaseEnd ? formatDate(leaseEnd) : "Not Set";
  if (els.licenseRent) els.licenseRent.textContent = formatCurrency(rental.rent || config.monthlyRent || 1000);
  
  // Lease Status with color coding
  if (els.licenseStatus) {
    const status = getLeaseStatus(leaseEnd);
    els.licenseStatus.innerHTML = `<span class="status-badge ${status.class}">${status.text}</span>`;
  }
  
  // Payment Information
  const nextPayment = rental.nextPaymentDue ? convertToDate(rental.nextPaymentDue) : null;
  const lastPayment = rental.lastPaymentMade ? convertToDate(rental.lastPaymentMade) : null;
  
  if (els.licenseNextPayment) els.licenseNextPayment.textContent = nextPayment ? formatDate(nextPayment) : "N/A";
  if (els.licenseLastPayment) els.licenseLastPayment.textContent = lastPayment ? formatDate(lastPayment) : "No Record";
  if (els.licensePaymentStatus) {
    const paymentStatus = rental.paymentStatus || "Unknown";
    const statusClass = paymentStatus === 'paid' ? 'active' : paymentStatus === 'pending' ? 'warning' : 'expired';
    els.licensePaymentStatus.innerHTML = `<span class="status-badge ${statusClass}">${paymentStatus.toUpperCase()}</span>`;
  }
  
  // Footer
  const now = new Date();
  if (els.licenseIssueDate) els.licenseIssueDate.textContent = `Issued: ${formatDate(now)}`;
  if (els.licenseDocId) els.licenseDocId.textContent = `LIC-${currentStallId.substring(0, 8).toUpperCase()}`;
  if (els.licenseGeneratedDate) els.licenseGeneratedDate.textContent = now.toLocaleString('en-GB');
  
  console.log("✅ License data populated");
}

function getLeaseStatus(leaseEndDate) {
  if (!leaseEndDate) return { text: "NO LEASE", class: "expired" };
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const end = new Date(leaseEndDate);
  end.setHours(0,0,0,0);
  
  const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: `EXPIRED (${Math.abs(diffDays)} days ago)`, class: "expired" };
  if (diffDays <= 7) return { text: `EXPIRES SOON (${diffDays} days left)`, class: "critical" };
  if (diffDays <= 30) return { text: `ACTIVE (${diffDays} days left)`, class: "warning" };
  return { text: "ACTIVE", class: "active" };
}

// Helper Functions
function convertToDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp.toDate) return timestamp.toDate();
  if (typeof timestamp === 'string') return new Date(timestamp);
  return new Date(timestamp);
}

function formatDate(date) {
  if (!date) return '-';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(amount) {
  const symbol = config.currencySymbol || 'S$';
  return symbol + parseInt(amount || 0).toLocaleString();
}

function showError(message) {
  // Display error in the license document
  Object.values(els).forEach(el => {
    if (el && el.textContent === "Loading...") {
      el.textContent = "Error loading data";
      el.style.color = "#dc3545";
    }
  });
  
  alert("Error: " + message);
}