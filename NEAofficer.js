import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, addDoc, deleteDoc, updateDoc, doc, query, orderBy, limit, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
    authDomain: "hawkerhub-64e2d.firebaseapp.com",
    databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hawkerhub-64e2d",
    storageBucket: "hawkerhub-64e2d.firebasestorage.app",
    messagingSenderId: "722888051277",
    appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentOfficerId = null;

// ==========================================
// 1. DATE PICKER HELPERS
// ==========================================

function initializeDatePicker() {
    const yearSelect = document.getElementById('picker-year');
    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";
    
    for (let i = 0; i < 5; i++) {
        let option = document.createElement("option");
        option.value = currentYear + i;
        option.text = currentYear + i;
        yearSelect.appendChild(option);
    }
}

window.updateDayOptions = function() {
    const year = parseInt(document.getElementById('picker-year').value);
    const monthIndex = parseInt(document.getElementById('picker-month').value); 
    const daySelect = document.getElementById('picker-day');
    
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const currentSelection = daySelect.value;
    
    daySelect.innerHTML = "";
    
    for (let i = 1; i <= daysInMonth; i++) {
        let option = document.createElement("option");
        option.value = i < 10 ? `0${i}` : i; 
        option.text = i;
        daySelect.appendChild(option);
    }

    if (currentSelection && currentSelection <= daysInMonth) {
        daySelect.value = currentSelection;
    } else {
        daySelect.value = "01";
    }

    updateFinalDate();
};

window.updateFinalDate = function() {
    const year = document.getElementById('picker-year').value;
    const month = (parseInt(document.getElementById('picker-month').value) + 1).toString().padStart(2, '0');
    const day = document.getElementById('picker-day').value; 

    const finalDateString = `${year}-${month}-${day}`;
    document.getElementById('input-date').value = finalDateString;
    
    checkAvailability();
};

// ==========================================
// 2. MODAL FUNCTIONS
// ==========================================

window.openScheduleModal = function(stallId, stallName) {
    document.getElementById('schedule-stall-id').value = stallId;
    document.getElementById('schedule-stall-name').value = stallName;
    
    initializeDatePicker();
    const today = new Date();
    document.getElementById('picker-year').value = today.getFullYear();
    document.getElementById('picker-month').value = today.getMonth();
    
    updateDayOptions();
    document.getElementById('picker-day').value = today.getDate().toString().padStart(2, '0');
    updateFinalDate();

    const select = document.getElementById('input-time');
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].disabled = false;
        select.options[i].innerText = select.options[i].value;
    }
    select.value = "10:00"; 

    document.getElementById('modal-schedule').classList.remove('hidden');
    checkAvailability();
};

window.openInspectionModal = function(scheduleId, stallId, stallName) {
    document.getElementById('inspect-schedule-id').value = scheduleId;
    document.getElementById('inspect-stall-id').value = stallId;
    document.getElementById('inspect-stall-name').value = stallName;
    document.getElementById('display-stall-name').innerText = stallName;
    
    document.getElementById('input-score').value = "";
    document.getElementById('grade-preview').innerText = ""; 
    document.getElementById('input-strengths').value = "";
    document.getElementById('input-remarks').value = "";
    
    document.getElementById('modal-inspect').classList.remove('hidden');
};

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.add('hidden');
};

// ==========================================
// 3. FIREBASE ACTIONS
// ==========================================

window.checkAvailability = async function() {
    const dateVal = document.getElementById('input-date').value;
    const timeSelect = document.getElementById('input-time');
    
    if (!dateVal) return;

    for (let i = 0; i < timeSelect.options.length; i++) {
        timeSelect.options[i].disabled = false;
        timeSelect.options[i].innerText = timeSelect.options[i].value; 
    }

    try {
        const q = query(collection(db, "schedules"), where("date", "==", dateVal));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const bookedTime = doc.data().time;
            for (let i = 0; i < timeSelect.options.length; i++) {
                if (timeSelect.options[i].value === bookedTime) {
                    timeSelect.options[i].disabled = true;
                    timeSelect.options[i].innerText = `${bookedTime} (Booked)`;
                }
            }
        });

    } catch (error) { console.error("Error checking availability:", error); }
};

window.calculateLiveGrade = function(val) {
    const previewEl = document.getElementById('grade-preview');
    if (!val) { previewEl.innerText = ""; return; }
    const score = parseInt(val);
    let grade = 'D (Risk)';
    let colorClass = 'text-grade-d';
    if (score >= 85) { grade = 'A (Excellent)'; colorClass = 'text-grade-a'; } 
    else if (score >= 70) { grade = 'B (Good)'; colorClass = 'text-grade-b'; } 
    else if (score >= 50) { grade = 'C (Satisfactory)'; colorClass = 'text-grade-c'; }
    previewEl.className = `grade-feedback ${colorClass}`;
    previewEl.innerText = `Projected Grade: ${grade}`;
};

window.confirmSchedule = async function() {
    const stallId = document.getElementById('schedule-stall-id').value;
    const stallName = document.getElementById('schedule-stall-name').value;
    const dateVal = document.getElementById('input-date').value; 
    const timeVal = document.getElementById('input-time').value;
    const note = document.getElementById('input-note').value;

    if (!dateVal || !timeVal) { alert("Select Date & Time"); return; }

    try {
        await addDoc(collection(db, "schedules"), {
            stallId, stallName, date: dateVal, time: timeVal, note: note || "Routine Check",
            createdAt: serverTimestamp()
        });
        window.closeModal('modal-schedule');
        alert("Scheduled!");
        loadSchedule(); 
    } catch (error) { console.error(error); alert("Failed."); }
};

window.deleteSchedule = async function(scheduleId) {
    if (!confirm("Delete this scheduled visit?")) return;
    try {
        await deleteDoc(doc(db, "schedules", scheduleId));
        alert("Schedule deleted!");
        loadSchedule();
    } catch (error) { console.error(error); alert("Error deleting."); }
};

window.submitInspection = async function() {
    const scheduleId = document.getElementById('inspect-schedule-id').value;
    const stallId = document.getElementById('inspect-stall-id').value;
    const stallName = document.getElementById('inspect-stall-name').value;
    const score = parseInt(document.getElementById('input-score').value);
    const strengthsText = document.getElementById('input-strengths').value.trim();
    const remarksText = document.getElementById('input-remarks').value.trim();
    if (!score || score < 0 || score > 100) { alert("Enter a valid score."); return; }
    let grade = 'D', status = 'Risk';
    if (score >= 85) { grade = 'A'; status = 'Pass'; }
    else if (score >= 70) { grade = 'B'; status = 'Warning'; }
    else if (score >= 50) { grade = 'C'; status = 'Warning'; }

    const strengthsArray = strengthsText.split('\n').filter(line => line.trim() !== "");
    const remarksArray = remarksText.split('\n').filter(line => line.trim() !== "");
    const todayStr = new Date().toLocaleDateString("en-SG", { day: 'numeric', month: 'short', year: 'numeric' });
    const nextDate = new Date(); nextDate.setMonth(nextDate.getMonth() + 1);
    const nextDateStr = nextDate.toLocaleDateString("en-SG", { day: 'numeric', month: 'short', year: 'numeric' });

    try {
        await addDoc(collection(db, "inspections"), {
            stallId, stallName, score, grade, status, remarks: remarksText, strengths: strengthsText, date: serverTimestamp()
        });
        const stallRef = doc(db, "stalls", stallId);
        await updateDoc(stallRef, {
            hygiene: grade, inspectionScore: score, lastInspectionDate: todayStr,
            nextInspectionDate: nextDateStr, strengths: strengthsArray, remarks: remarksArray
        });
        if (scheduleId) await deleteDoc(doc(db, "schedules", scheduleId));
        window.closeModal('modal-inspect');
        alert(`Report Submitted! Next Inspection: ${nextDateStr}`);
        loadSchedule(); loadDashboard(); loadStallDirectory(); window.switchPage('overview');
    } catch (error) { console.error(error); alert("Error saving."); }
};

// ==========================================
// 4. LOADERS
// ==========================================

async function loadStallDirectory() {
    const tbody = document.getElementById('stall-directory-body');
    if (!tbody) return;
    const snapshot = await getDocs(collection(db, "stalls"));
    let html = "";
    snapshot.forEach(doc => {
        // --- KEY FIX: SKIP _CONFIG FILE ---
        if (doc.id === "_config") return;

        const data = doc.data();
        let displayName = data.name || data.stallName || doc.id.charAt(0).toUpperCase() + doc.id.slice(1);
        const safeName = displayName.replace(/'/g, "\\'");
        let grade = data.hygiene || (data.rating >= 4.5 ? 'A' : 'B');
        let badgeClass = grade === 'A' ? 'badge-success' : (grade === 'B' ? 'badge-pending' : 'badge-danger');
        html += `<tr>
            <td>#${doc.id.substring(0,5)}</td><td>${displayName}</td><td>${data.vendorId ? "Registered" : "Unknown"}</td>
            <td><span class="badge ${badgeClass}">${grade}</span></td>
            <td><button class="btn-primary" style="padding:6px 12px; font-size:0.8rem;" onclick="openScheduleModal('${doc.id}', '${safeName}')">Inspect</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

async function loadSchedule() {
    const container = document.getElementById('schedule-list');
    if (!container) return;
    const q = query(collection(db, "schedules"), orderBy("createdAt", "asc"));
    const querySnapshot = await getDocs(q);
    let html = "";
    if (querySnapshot.empty) {
        container.innerHTML = '<div class="card"><p class="text-muted-center">No scheduled visits. Add one from the Directory!</p></div>';
        return;
    }
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const safeName = (data.stallName || '').replace(/'/g, "\\'");
        html += `
            <div class="schedule-card-item">
                <div class="schedule-time-box">
                    <span class="time-big">${data.time}</span>
                    <span class="date-small">${data.date}</span>
                </div>
                <div class="schedule-info">
                    <div class="schedule-title">${data.stallName}</div>
                    <div class="schedule-note">${data.note}</div>
                </div>
                <div class="schedule-actions-area">
                    <button class="btn-danger" onclick="deleteSchedule('${doc.id}')">Delete</button>
                    <button class="btn-primary" style="padding: 12px 24px; font-size: 1rem;" 
                        onclick="openInspectionModal('${doc.id}', '${data.stallId}', '${safeName}')">
                        Start Inspection
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

async function loadDashboard() {
    const recentTable = document.getElementById('recent-inspections-body');
    const totalEl = document.getElementById('total-stalls');
    const criticalEl = document.getElementById('critical-violations');
    const avgEl = document.getElementById('avg-zone-score');
    try {
        const q = query(collection(db, "inspections"), orderBy("date", "desc"), limit(5));
        const snapshot = await getDocs(q);
        let html = "", count = 0, scoreSum = 0, critical = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            count++; scoreSum += data.score;
            if(data.grade === 'D' || data.grade === 'C') critical++;
            let dateStr = data.date ? new Date(data.date.seconds * 1000).toLocaleDateString() : 'Pending';
            let badge = data.grade === 'A' ? 'badge-success' : (data.grade === 'B' ? 'badge-pending' : 'badge-danger');
            html += `<tr><td>${data.stallName}</td><td>${dateStr}</td><td><span class="badge ${badge}">${data.grade} (${data.score})</span></td><td>${data.status}</td></tr>`;
        });
        if(recentTable) recentTable.innerHTML = html || '<tr><td colspan="4" class="text-muted-center">No data</td></tr>';
        if(totalEl) totalEl.innerText = count;
        if(criticalEl) criticalEl.innerText = critical;
        if(avgEl) avgEl.innerText = count ? (scoreSum/count).toFixed(1) : "0.0";
    } catch (e) { console.error(e); }
}

window.switchPage = function(pageId, element) {
    document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById('page-' + pageId);
    if(target) target.classList.remove('hidden');
    if(element) {
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        element.classList.add('active');
    }
    if(pageId === 'schedule') loadSchedule();
    if(pageId === 'overview') loadDashboard();
};

// ==========================================
// 5. LOGOUT LOGIC
// ==========================================

window.logoutOfficer = async function() {
    if (!confirm("Are you sure you want to log out?")) return;

    if (currentOfficerId) {
        try {
            const officerRef = doc(db, "officers", currentOfficerId);
            await updateDoc(officerRef, {
                isActive: false,  
                lastLogout: serverTimestamp()
            });
            console.log("Officer status set to inactive.");
        } catch (error) {
            console.error("Error updating logout status:", error);
        }
    }

    await signOut(auth);
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "SignInOfficer.html"; 
};

// ==========================================
// 6. LOAD OFFICER PROFILE
// ==========================================

async function loadOfficerProfile() {
    if (!currentOfficerId) {
        console.warn("No officer ID available.");
        return;
    }

    try {
        const officerRef = doc(db, "officers", currentOfficerId);
        const officerSnap = await getDoc(officerRef);

        if (officerSnap.exists()) {
            const data = officerSnap.data();
            
            const nameEl = document.getElementById('display-officer-name');
            const badgeEl = document.getElementById('display-badge-id');

            if(nameEl) nameEl.innerText = data.officerName || data.email || "Officer";
            if(badgeEl) badgeEl.innerText = data.badgeId || "N/A";
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
    }
}

// ==========================================
// 7. AUTH STATE HANDLER
// ==========================================

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "SignInOfficer.html";
        return;
    }

    currentOfficerId = user.uid;

    try {
        const officerDoc = await getDoc(doc(db, "officers", user.uid));
        if (!officerDoc.exists()) {
            await signOut(auth);
            alert("Access denied. This account is not registered as an officer.");
            window.location.href = "SignInOfficer.html";
            return;
        }

        loadOfficerProfile();
        loadDashboard();
        loadStallDirectory();
        loadSchedule();
    } catch (error) {
        console.error("Error verifying officer status:", error);
        await signOut(auth);
        window.location.href = "SignInOfficer.html";
    }
});