import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, query, where, getDocs, 
  doc, getDoc, updateDoc, setDoc, Timestamp, increment
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Configuration - Loaded from stalls/_config
let config = {
  monthlyRent: 0,
  maxRenewalMonths: 3,
  currency: 'SGD',
  currencySymbol: 'S$',
  allowEarlyRenewalDays: 30, // Days before expiry that renewal is allowed
  minRenewalDays: 7 // Minimum days that must be added
};

// State
let currentUser = null;
let currentStallId = null;
let currentStallData = null;
let currentRentalRef = null;
let currentLeaseEndDate = null;
let originalLeaseData = null;

// DOM Elements cache
const elements = {
  currentLease: document.getElementById("currentLease"),
  newLeaseEnd: document.getElementById("newLeaseEnd"),
  saveBtn: document.getElementById("saveRenewal"),
  resetBtn: document.getElementById("resetLeaseBtn"),
  paymentInfo: document.getElementById("paymentInfo"),
  stallId: document.getElementById("stallId"),
  currentRate: document.getElementById("currentRate"),
  leaseStatusBadge: document.getElementById("leaseStatusBadge"),
  durationButtons: document.querySelectorAll('.duration-btn'),
  termsCheckbox: document.getElementById('agreeTerms')
};

// Initialize
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "signup.html";
    return;
  }

  currentUser = user;
  
  try {
    // Load config first, then lease data
    await loadConfig();
    await loadCurrentLease();
    setupEventListeners();
  } catch (error) {
    console.error("Initialization error:", error);
    showError("Failed to load lease information. Please refresh.");
  }
});

// Load configuration from stalls/_config
async function loadConfig() {
  try {
    const configDoc = await getDoc(doc(fs, "stalls", "_config"));
    
    if (configDoc.exists()) {
      const data = configDoc.data();
      config = {
        monthlyRent: data.leaseSettings?.monthlyRent || 1000,
        maxRenewalMonths: data.leaseSettings?.maxRenewalMonths || 3,
        currency: data.leaseSettings?.currency || 'SGD',
        currencySymbol: data.leaseSettings?.currencySymbol || 'S$',
        allowEarlyRenewalDays: data.leaseSettings?.allowEarlyRenewalDays || 30,
        minRenewalDays: data.leaseSettings?.minRenewalDays || 7
      };
    } else {
      console.warn("No config found in stalls/_config, using defaults");
    }
    
    // Update UI with config
    if (elements.currentRate) {
      elements.currentRate.textContent = formatCurrency(config.monthlyRent) + '/month';
    }
    
  } catch (error) {
    console.error("Error loading config:", error);
    // Continue with defaults
  }
}

async function loadCurrentLease() {
  try {
    showLoadingState(true);
    
    // Find vendor's stall
    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", currentUser.uid));
    const snap = await getDocs(q);

    if (snap.empty) {
      showError("No stall assigned to your account. Please contact support.");
      disableForm();
      return;
    }

    currentStallId = snap.docs[0].id;
    currentStallData = snap.docs[0].data();
    
    // Update UI with stall info
    if (elements.stallId) {
      elements.stallId.textContent = currentStallData.stallNumber || currentStallId;
    }

    // Get rental details from subcollection
    currentRentalRef = doc(fs, "stalls", currentStallId, "rental_details", "current");
    const rentalSnap = await getDoc(currentRentalRef);
    
    // If rental details don't exist, create default structure
    if (!rentalSnap.exists()) {
      await initializeRentalDetails();
      return; // Reload after initialization
    }

    originalLeaseData = rentalSnap.data();
    
    // Parse lease end date
    if (originalLeaseData.leaseEnd) {
      currentLeaseEndDate = convertToDate(originalLeaseData.leaseEnd);
      updateLeaseDisplay();
      setupDateConstraints();
      checkRenewalEligibility();
    } else {
      showError("No lease end date found. Please contact support.");
      elements.currentLease.textContent = "Not Available";
    }
    
  } catch (error) {
    console.error("Error loading lease:", error);
    showError("Error loading lease information");
  } finally {
    showLoadingState(false);
  }
}

async function initializeRentalDetails() {
  // Create default rental details if missing
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1); // Default 1 month from now
  
  await setDoc(currentRentalRef, {
    leaseStart: Timestamp.fromDate(new Date()),
    leaseEnd: Timestamp.fromDate(defaultEndDate),
    rent: config.monthlyRent,
    deposit: config.monthlyRent * 2,
    paymentStatus: 'pending',
    autoRenewal: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid
  });
  
  // Reload to get fresh data
  await loadCurrentLease();
}

function updateLeaseDisplay() {
  if (!currentLeaseEndDate) return;
  
  const formattedDate = formatDate(currentLeaseEndDate);
  elements.currentLease.textContent = formattedDate;
  
  // Calculate days until expiry
  const daysUntil = getDaysUntil(currentLeaseEndDate);
  updateStatusBadge(daysUntil);
  
  // Show warning if expired or expiring soon
  if (daysUntil < 0) {
    showAlert("Your lease has expired! Please renew immediately.", "error");
  } else if (daysUntil <= 7) {
    showAlert(`Your lease expires in ${daysUntil} days. Please renew soon.`, "warning");
  }
}

function setupDateConstraints() {
  if (!currentLeaseEndDate || !elements.newLeaseEnd) return;
  
  const minDate = new Date(currentLeaseEndDate);
  minDate.setDate(minDate.getDate() + config.minRenewalDays); // Minimum extension
  
  const maxDate = new Date(currentLeaseEndDate);
  maxDate.setMonth(maxDate.getMonth() + config.maxRenewalMonths);
  
  // Set input constraints
  elements.newLeaseEnd.min = formatDateForInput(minDate);
  elements.newLeaseEnd.max = formatDateForInput(maxDate);
  
  // Set default value to current end date + 1 month
  const defaultDate = new Date(currentLeaseEndDate);
  defaultDate.setMonth(defaultDate.getMonth() + 1);
  elements.newLeaseEnd.value = formatDateForInput(defaultDate);
  
  // Auto-calculate initial payment preview
  handleDateChange();
}

function checkRenewalEligibility() {
  if (!currentLeaseEndDate) return false;
  
  const daysUntil = getDaysUntil(currentLeaseEndDate);
  
  // Can only renew if within allowed early renewal window or already expired
  const canRenew = daysUntil <= config.allowEarlyRenewalDays || daysUntil < 0;
  
  if (!canRenew) {
    elements.newLeaseEnd.disabled = true;
    elements.saveBtn.disabled = true;
    showAlert(`Renewal available ${config.allowEarlyRenewalDays} days before expiry. Please check back later.`, "info");
  } else {
    elements.newLeaseEnd.disabled = false;
  }
  
  return canRenew;
}

function setupEventListeners() {
  // Date input change - auto calculate
  elements.newLeaseEnd?.addEventListener("input", debounce(handleDateChange, 300));
  
  // Quick select buttons
  elements.durationButtons?.forEach(btn => {
    btn.addEventListener('click', () => {
      const months = parseInt(btn.dataset.months);
      selectDuration(months);
      // Update active state
      elements.durationButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  
  // Terms checkbox
  elements.termsCheckbox?.addEventListener('change', validateForm);
  
  // Save button
  elements.saveBtn?.addEventListener("click", handleSave);
  
  // Reset button
  elements.resetBtn?.addEventListener("click", handleReset);
}

function selectDuration(months) {
  if (!currentLeaseEndDate) return;
  
  const newDate = new Date(currentLeaseEndDate);
  newDate.setMonth(newDate.getMonth() + months);
  
  // Ensure we don't exceed max
  const maxDate = new Date(currentLeaseEndDate);
  maxDate.setMonth(maxDate.getMonth() + config.maxRenewalMonths);
  
  if (newDate > maxDate) {
    newDate.setTime(maxDate.getTime());
  }
  
  elements.newLeaseEnd.value = formatDateForInput(newDate);
  handleDateChange();
}

function handleDateChange() {
  const newDateValue = elements.newLeaseEnd.value;
  
  if (!newDateValue || !currentLeaseEndDate) {
    elements.paymentInfo.innerHTML = '';
    elements.saveBtn.disabled = true;
    return;
  }
  
  const newEndDate = new Date(newDateValue);
  const currentEnd = new Date(currentLeaseEndDate);
  
  // Validation
  if (newEndDate <= currentEnd) {
    showInputError("New date must be after current lease end");
    elements.saveBtn.disabled = true;
    return;
  }
  
  const maxAllowed = new Date(currentEnd);
  maxAllowed.setMonth(maxAllowed.getMonth() + config.maxRenewalMonths);
  
  if (newEndDate > maxAllowed) {
    showInputError(`Maximum renewal is ${config.maxRenewalMonths} months`);
    elements.saveBtn.disabled = true;
    return;
  }
  
  clearInputError();
  const paymentDetails = calculatePayments(currentEnd, newEndDate);
  renderPaymentPreview(paymentDetails);
  validateForm();
}

function calculatePayments(currentEndDate, newEndDate) {
  // Calculate exact month difference
  let months = 0;
  let tempDate = new Date(currentEndDate);
  
  while (tempDate < newEndDate) {
    tempDate.setMonth(tempDate.getMonth() + 1);
    if (tempDate <= newEndDate) {
      months++;
    }
  }
  
  // Calculate pro-rated amount for partial month if needed
  const lastMonthStart = new Date(currentEndDate);
  lastMonthStart.setMonth(lastMonthStart.getMonth() + months);
  
  let partialMonthAmount = 0;
  if (lastMonthStart < newEndDate) {
    const daysInMonth = new Date(lastMonthStart.getFullYear(), lastMonthStart.getMonth() + 1, 0).getDate();
    const remainingDays = Math.ceil((newEndDate - lastMonthStart) / (1000 * 60 * 60 * 24));
    partialMonthAmount = (remainingDays / daysInMonth) * config.monthlyRent;
  }
  
  const totalAmount = (months * config.monthlyRent) + partialMonthAmount;
  
  // Generate payment schedule
  const payments = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < months; i++) {
    const dueDate = new Date(currentEndDate);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    dueDate.setDate(1); // First of each month
    
    // Payment is "paid" only if it's for past months relative to current lease end
    const isPaid = dueDate <= today && dueDate <= currentEndDate;
    
    payments.push({
      dueDate: dueDate,
      amount: config.monthlyRent,
      status: isPaid ? 'paid' : 'upcoming',
      formattedDate: formatDate(dueDate)
    });
  }
  
  // Add partial month payment if exists
  if (partialMonthAmount > 0) {
    payments.push({
      dueDate: new Date(newEndDate),
      amount: Math.round(partialMonthAmount),
      status: 'upcoming',
      formattedDate: formatDate(newEndDate),
      isPartial: true
    });
  }
  
  return {
    months,
    days: Math.ceil((newEndDate - currentEndDate) / (1000 * 60 * 60 * 24)),
    totalAmount: Math.round(totalAmount),
    monthlyAmount: config.monthlyRent,
    partialAmount: Math.round(partialMonthAmount),
    payments
  };
}

function renderPaymentPreview(details) {
  if (!elements.paymentInfo) return;
  
  const html = `
    <div class="payment-summary-card fade-in">
      <div class="summary-header">
        <h4>Renewal Summary</h4>
        <span class="duration-badge">${details.months} month${details.months !== 1 ? 's' : ''} ${details.days % 30 > 0 ? `+ ${details.days % 30} days` : ''}</span>
      </div>
      
      <div class="summary-grid">
        <div class="summary-item">
          <span class="label">Current End Date</span>
          <span class="value">${formatDate(currentLeaseEndDate)}</span>
        </div>
        <div class="summary-item">
          <span class="label">New End Date</span>
          <span class="value highlight">${formatDate(new Date(elements.newLeaseEnd.value))}</span>
        </div>
        <div class="summary-item">
          <span class="label">Monthly Rate</span>
          <span class="value">${formatCurrency(config.monthlyRent)}</span>
        </div>
        ${details.partialAmount > 0 ? `
        <div class="summary-item">
          <span class="label">Pro-rated Amount</span>
          <span class="value">${formatCurrency(details.partialAmount)}</span>
        </div>
        ` : ''}
        <div class="summary-item total">
          <span class="label">Total Renewal Cost</span>
          <span class="value">${formatCurrency(details.totalAmount)}</span>
        </div>
      </div>
      
      <div class="payment-schedule">
        <h5>Payment Schedule</h5>
        ${details.payments.map((p, i) => `
          <div class="payment-row ${p.status}">
            <div class="payment-info">
              <span class="payment-label">${p.isPartial ? 'Pro-rated Final' : `Month ${i + 1}`}</span>
              <span class="payment-date">${p.formattedDate}</span>
            </div>
            <div class="payment-amount-status">
              <span class="amount">${formatCurrency(p.amount)}</span>
              <span class="status-badge ${p.status}">${p.status === 'paid' ? '✓ Paid' : 'Due'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  elements.paymentInfo.innerHTML = html;
}

function validateForm() {
  const hasDate = elements.newLeaseEnd.value !== '';
  const agreed = elements.termsCheckbox?.checked || false;
  const hasPayment = elements.paymentInfo.innerHTML !== '';
  
  const isValid = hasDate && agreed && hasPayment;
  elements.saveBtn.disabled = !isValid;
  
  return isValid;
}

async function handleSave() {
  if (!validateForm()) return;
  
  const newDateValue = elements.newLeaseEnd.value;
  const newLeaseEnd = new Date(newDateValue);
  
  try {
    setLoading(true);
    
    const paymentDetails = calculatePayments(currentLeaseEndDate, newLeaseEnd);
    
    // Prepare update data
    const updateData = {
      leaseEnd: Timestamp.fromDate(newLeaseEnd),
      previousLeaseEnd: originalLeaseData.leaseEnd || currentLeaseEndDate,
      renewalCount: increment(1),
      lastRenewalDate: serverTimestamp(),
      lastRenewalAmount: paymentDetails.totalAmount,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.uid,
      
      // Calculate next payment due (first upcoming payment after today)
      nextPaymentDue: paymentDetails.payments.find(p => p.status === 'upcoming')?.dueDate 
        ? Timestamp.fromDate(paymentDetails.payments.find(p => p.status === 'upcoming').dueDate)
        : null,
        
      // Store renewal history
      lastRenewalDetails: {
        durationMonths: paymentDetails.months,
        durationDays: paymentDetails.days,
        totalAmount: paymentDetails.totalAmount,
        monthlyRate: config.monthlyRent,
        renewedAt: serverTimestamp(),
        renewedBy: currentUser.uid
      }
    };
    
    // If rent has changed in config vs stored, update it
    if (originalLeaseData.rent !== config.monthlyRent) {
      updateData.rent = config.monthlyRent;
    }
    
    // Update Firestore
    await updateDoc(currentRentalRef, updateData);
    
    // Also log to renewal_history subcollection for audit trail
    const historyRef = doc(collection(fs, "stalls", currentStallId, "renewal_history"));
    await setDoc(historyRef, {
      renewedAt: serverTimestamp(),
      previousEndDate: originalLeaseData.leaseEnd,
      newEndDate: Timestamp.fromDate(newLeaseEnd),
      amount: paymentDetails.totalAmount,
      durationMonths: paymentDetails.months,
      durationDays: paymentDetails.days,
      renewedBy: currentUser.uid,
      paymentDetails: paymentDetails
    });
    
    // Success - show modal and refresh
    showSuccessModal(paymentDetails);
    
    // Refresh local data
    await loadCurrentLease();
    elements.newLeaseEnd.value = '';
    elements.paymentInfo.innerHTML = '';
    if (elements.termsCheckbox) elements.termsCheckbox.checked = false;
    
  } catch (error) {
    console.error("Error renewing lease:", error);
    showError("Failed to renew lease: " + error.message);
  } finally {
    setLoading(false);
  }
}

async function handleReset() {
  if (!confirm("WARNING: This will set your lease to end TODAY. Are you sure?")) return;
  
  try {
    setLoading(true, true);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    await updateDoc(currentRentalRef, {
      leaseEnd: Timestamp.fromDate(today),
      resetAt: serverTimestamp(),
      resetBy: currentUser.uid,
      previousLeaseEnd: originalLeaseData?.leaseEnd || null
    });
    
    showSuccess("Lease reset to today successfully");
    await loadCurrentLease();
    
  } catch (error) {
    console.error("Error resetting lease:", error);
    showError("Failed to reset lease");
  } finally {
    setLoading(false, true);
  }
}

// Utility Functions
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
    month: 'short',
    year: 'numeric'
  });
}

function formatDateForInput(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

function formatCurrency(amount) {
  return `${config.currencySymbol}${amount.toLocaleString()}`;
}

function getDaysUntil(date) {
  if (!date) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function updateStatusBadge(daysUntil) {
  if (!elements.leaseStatusBadge) return;
  
  let status = 'active';
  let text = 'Active';
  
  if (daysUntil < 0) {
    status = 'expired';
    text = 'Expired';
  } else if (daysUntil <= 7) {
    status = 'critical';
    text = `Expires in ${daysUntil} days`;
  } else if (daysUntil <= 30) {
    status = 'warning';
    text = 'Expiring Soon';
  }
  
  elements.leaseStatusBadge.className = `status-badge ${status}`;
  elements.leaseStatusBadge.textContent = text;
}

function showLoadingState(show) {
  if (show) {
    elements.currentLease.innerHTML = '<span class="loading-spinner"></span>';
  }
}

function setLoading(loading, isReset = false) {
  const btn = isReset ? elements.resetBtn : elements.saveBtn;
  if (!btn) return;
  
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
  
  if (!isReset) {
    const textSpan = btn.querySelector('.btn-text') || btn;
    textSpan.textContent = loading ? 'Processing...' : 'Confirm Renewal';
  }
}

function showError(message) {
  showAlert(message, 'error');
}

function showSuccess(message) {
  showAlert(message, 'success');
}

function showAlert(message, type = 'info') {
  // Remove existing alerts
  document.querySelectorAll('.alert-toast').forEach(el => el.remove());
  
  const alert = document.createElement('div');
  alert.className = `alert-toast alert-${type}`;
  alert.innerHTML = `
    <span class="alert-icon">${type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️'}</span>
    <span class="alert-message">${message}</span>
    <button class="alert-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(alert);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    alert.style.opacity = '0';
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

function showInputError(message) {
  elements.newLeaseEnd?.classList.add('error');
  const hint = elements.newLeaseEnd?.nextElementSibling;
  if (hint && hint.classList.contains('hint')) {
    hint.textContent = message;
    hint.classList.add('error-text');
  }
}

function clearInputError() {
  elements.newLeaseEnd?.classList.remove('error');
  const hint = elements.newLeaseEnd?.nextElementSibling;
  if (hint && hint.classList.contains('hint')) {
    hint.textContent = `Select a date up to ${config.maxRenewalMonths} months from current end date`;
    hint.classList.remove('error-text');
  }
}

function showSuccessModal(details) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content success-modal">
      <div class="success-icon">✅</div>
      <h2>Lease Renewed Successfully!</h2>
      <p>Your lease has been extended by ${details.months} month${details.months !== 1 ? 's' : ''}</p>
      
      <div class="modal-details">
        <div class="detail-row">
          <span>Total Amount:</span>
          <strong>${formatCurrency(details.totalAmount)}</strong>
        </div>
        <div class="detail-row">
          <span>New Expiry Date:</span>
          <strong>${formatDate(new Date(elements.newLeaseEnd.value))}</strong>
        </div>
        <div class="detail-row">
          <span>Reference:</span>
          <strong>#${Date.now().toString(36).toUpperCase()}</strong>
        </div>
      </div>
      
      <button onclick="this.closest('.modal-overlay').remove(); window.location.href='VendorAccountRentalStatus.html'" class="btn btn-primary" style="width: 100%; margin-top: 20px;">
        Go to Dashboard
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function disableForm() {
  elements.newLeaseEnd && (elements.newLeaseEnd.disabled = true);
  elements.saveBtn && (elements.saveBtn.disabled = true);
  elements.resetBtn && (elements.resetBtn.disabled = true);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Export for debugging
window.leaseRenewal = {
  refresh: loadCurrentLease,
  getConfig: () => config,
  getCurrentData: () => ({
    currentLeaseEndDate,
    currentStallId,
    originalLeaseData
  })
};