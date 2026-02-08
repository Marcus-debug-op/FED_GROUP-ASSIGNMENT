import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, query, where, getDocs, 
  doc, getDoc, updateDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Constants
const MONTHLY_RENT = 1000;
const MAX_RENEWAL_MONTHS = 3;

let currentUser = null;
let currentStallId = null;
let currentRentalRef = null;
let currentLeaseEndDate = null;

const currentLeaseEl = document.getElementById("currentLease");
const newLeaseEndInput = document.getElementById("newLeaseEnd");
const saveBtn = document.getElementById("saveRenewal");
const resetBtn = document.getElementById("resetLeaseBtn");
const paymentInfoEl = document.getElementById("paymentInfo");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signup.html";
    return;
  }

  currentUser = user;
  await loadCurrentLease();
});

async function loadCurrentLease() {
  try {
    currentLeaseEl.textContent = "Loading...";
    
    // Find vendor's stall
    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", currentUser.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      currentLeaseEl.innerHTML = `<span style="color: #f44336;">No stall assigned to your account</span>`;
      saveBtn.disabled = true;
      return;
    }

    currentStallId = snap.docs[0].id;
    const stallData = snap.docs[0].data();

    // Get rental details
    currentRentalRef = doc(fs, "stalls", currentStallId, "rental_details", "rental");
    const rentalSnap = await getDoc(currentRentalRef);

    if (rentalSnap.exists()) {
      const rentalData = rentalSnap.data();
      
      if (rentalData.leaseEnd) {
        // Handle both Timestamp and string formats
        if (rentalData.leaseEnd.toDate) {
          currentLeaseEndDate = rentalData.leaseEnd;
          currentLeaseEl.textContent = formatDate(rentalData.leaseEnd.toDate());
        } else if (typeof rentalData.leaseEnd === 'string') {
          const parsedDate = parseDate(rentalData.leaseEnd);
          currentLeaseEndDate = Timestamp.fromDate(parsedDate);
          currentLeaseEl.textContent = rentalData.leaseEnd;
        } else {
          currentLeaseEndDate = rentalData.leaseEnd;
          currentLeaseEl.textContent = new Date(rentalData.leaseEnd).toLocaleDateString('en-GB');
        }
        
        // Set date constraints
        const today = new Date();
        const currentEnd = currentLeaseEndDate.toDate ? currentLeaseEndDate.toDate() : new Date(currentLeaseEndDate);
        const maxDate = new Date(currentEnd);
        maxDate.setMonth(maxDate.getMonth() + MAX_RENEWAL_MONTHS);
        
        newLeaseEndInput.min = today.toISOString().split('T')[0];
        newLeaseEndInput.max = maxDate.toISOString().split('T')[0];
        
      } else {
        currentLeaseEl.innerHTML = `<span style="color: #ff9800;">No lease end date set</span>`;
      }
    } else {
      currentLeaseEl.innerHTML = `<span style="color: #f44336;">Rental details not found</span>`;
      saveBtn.disabled = true;
    }
    
  } catch (error) {
    console.error("Error loading lease:", error);
    currentLeaseEl.innerHTML = `<span style="color: #f44336;">Error loading lease information</span>`;
  }
}

// Calculate payment details based on renewal period
function calculatePayments(currentEndDate, newEndDate) {
  const current = currentEndDate.toDate ? currentEndDate.toDate() : new Date(currentEndDate);
  const newEnd = new Date(newEndDate);
  
  // Calculate months difference
  const monthsDiff = Math.ceil((newEnd - current) / (1000 * 60 * 60 * 24 * 30));
  
  if (monthsDiff > MAX_RENEWAL_MONTHS) {
    return null; // Exceeds maximum
  }
  
  const totalAmount = monthsDiff * MONTHLY_RENT;
  
  // Generate payment schedule
  const payments = [];
  const today = new Date();
  
  for (let i = 0; i < monthsDiff; i++) {
    const paymentDate = new Date(current);
    paymentDate.setMonth(paymentDate.getMonth() + i + 1);
    
    payments.push({
      dueDate: paymentDate,
      amount: MONTHLY_RENT,
      status: paymentDate < today ? 'paid' : 'upcoming'
    });
  }
  
  return {
    months: monthsDiff,
    totalAmount,
    monthlyAmount: MONTHLY_RENT,
    payments
  };
}

// Update payment info display
function updatePaymentInfo(paymentDetails) {
  if (!paymentInfoEl) return;
  
  if (!paymentDetails) {
    paymentInfoEl.innerHTML = `<div class="info-box error">Maximum renewal period is ${MAX_RENEWAL_MONTHS} months</div>`;
    return;
  }
  
  const paidCount = paymentDetails.payments.filter(p => p.status === 'paid').length;
  const upcomingCount = paymentDetails.payments.filter(p => p.status === 'upcoming').length;
  
  paymentInfoEl.innerHTML = `
    <div class="info-box">
      <h4>Renewal Payment Details</h4>
      <div class="payment-summary">
        <div class="summary-item">
          <span class="label">Renewal Period:</span>
          <span class="value">${paymentDetails.months} month${paymentDetails.months > 1 ? 's' : ''}</span>
        </div>
        <div class="summary-item">
          <span class="label">Monthly Rate:</span>
          <span class="value">$${paymentDetails.monthlyAmount.toLocaleString()}</span>
        </div>
        <div class="summary-item total">
          <span class="label">Total Amount:</span>
          <span class="value">$${paymentDetails.totalAmount.toLocaleString()}</span>
        </div>
      </div>
      
      <div class="payment-schedule">
        <h5>Payment Schedule:</h5>
        ${paymentDetails.payments.map((p, i) => `
          <div class="payment-item ${p.status}">
            <span class="payment-num">Payment ${i + 1}</span>
            <span class="payment-date">${formatDate(p.dueDate)}</span>
            <span class="payment-amount">$${p.amount.toLocaleString()}</span>
            <span class="payment-status">${p.status === 'paid' ? '✓ Paid' : 'Upcoming'}</span>
          </div>
        `).join('')}
      </div>
      
      ${paidCount > 0 ? `<p class="info-note">✓ ${paidCount} payment${paidCount > 1 ? 's' : ''} already processed</p>` : ''}
    </div>
  `;
}

// Listen for date changes
if (newLeaseEndInput) {
  newLeaseEndInput.addEventListener("change", () => {
    const newDateValue = newLeaseEndInput.value;
    if (newDateValue && currentLeaseEndDate) {
      const paymentDetails = calculatePayments(currentLeaseEndDate, newDateValue);
      updatePaymentInfo(paymentDetails);
      
      if (!paymentDetails) {
        saveBtn.disabled = true;
      } else {
        saveBtn.disabled = false;
      }
    }
  });
}

saveBtn.addEventListener("click", async () => {
  const newDateValue = newLeaseEndInput.value;
  
  if (!newDateValue) {
    alert("Please select a new lease end date");
    return;
  }

  if (!currentRentalRef || !currentUser) {
    alert("Error: Missing rental information");
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = "Updating...";

    // Parse the new date
    const newLeaseEnd = new Date(newDateValue);
    
    // Validate renewal period
    const paymentDetails = calculatePayments(currentLeaseEndDate, newDateValue);
    
    if (!paymentDetails) {
      alert(`Maximum renewal period is ${MAX_RENEWAL_MONTHS} months`);
      saveBtn.disabled = false;
      saveBtn.textContent = "Update Lease";
      return;
    }
    
    // Validate that new date is after current lease end
    if (currentLeaseEndDate) {
      const currentDate = currentLeaseEndDate.toDate 
        ? currentLeaseEndDate.toDate() 
        : new Date(currentLeaseEndDate);
      
      if (newLeaseEnd <= currentDate) {
        alert("New lease end date must be after the current lease end date");
        saveBtn.disabled = false;
        saveBtn.textContent = "Update Lease";
        return;
      }
    }

    // Calculate next payment due (first upcoming payment)
    const today = new Date();
    const nextPayment = paymentDetails.payments.find(p => p.dueDate >= today);
    const paidPayments = paymentDetails.payments.filter(p => p.dueDate < today);
    
    // Last payment: use most recent paid payment, or current date if no paid payments
    let lastPaymentDate;
    if (paidPayments.length > 0) {
      lastPaymentDate = paidPayments[paidPayments.length - 1].dueDate;
    } else {
      // No paid payments yet, use current date
      lastPaymentDate = today;
    }

    // Update lease with payment information
    await updateDoc(currentRentalRef, {
      leaseEnd: Timestamp.fromDate(newLeaseEnd),
      nextPaymentDue: nextPayment ? Timestamp.fromDate(nextPayment.dueDate) : "",
      lastPaymentMade: Timestamp.fromDate(lastPaymentDate),
      rent: MONTHLY_RENT,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid
    });

    alert(`✅ Lease renewed successfully!\n\nRenewal Period: ${paymentDetails.months} month(s)\nTotal Amount: $${paymentDetails.totalAmount.toLocaleString()}`);
    window.location.href = "VenderAccountRentalStatus.html";

  } catch (error) {
    console.error("Error renewing lease:", error);
    alert("Failed to renew lease. Please try again.\n\nError: " + error.message);
    saveBtn.disabled = false;
    saveBtn.textContent = "Update Lease";
  }
});

// Reset lease to current date
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    if (!confirm("Reset lease end date to today? This will set the lease as ending today.")) {
      return;
    }

    try {
      resetBtn.disabled = true;
      resetBtn.textContent = "Resetting...";

      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      await updateDoc(currentRentalRef, {
        leaseEnd: Timestamp.fromDate(today),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      });

      alert("✅ Lease end date reset to today!");
      window.location.reload();

    } catch (error) {
      console.error("Error resetting lease:", error);
      alert("Failed to reset lease. Please try again.");
      resetBtn.disabled = false;
      resetBtn.textContent = "Reset to Today";
    }
  });
}

// Helper functions
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDate(dateStr) {
  // Parse DD/MM/YYYY format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}