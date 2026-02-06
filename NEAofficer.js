import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, updateDoc, doc, query, orderBy, limit, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

// --- MODAL FUNCTIONS ---
window.openScheduleModal = function(stallId, stallName) {
    document.getElementById('schedule-stall-id').value = stallId;
    document.getElementById('schedule-stall-name').value = stallName;
    
    // Set Date to Today
    const today = new Date();
    document.getElementById('input-date').valueAsDate = today;
    
    // Reset Time Dropdown (Enable all options first)
    const select = document.getElementById('input-time');
    for (let i = 0; i < select.options.length; i++) {
        select.options[i].disabled = false;
        select.options[i].innerText = select.options[i].value; // Reset text
    }
    select.value = "10:00"; 

    document.getElementById('modal-schedule').classList.remove('hidden');

    // Run check immediately for today's date
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

// --- NEW: CHECK AVAILABILITY ---
window.checkAvailability = async function() {
    const dateVal = document.getElementById('input-date').value;
    const timeSelect = document.getElementById('input-time');
    
    if (!dateVal) return;

    // 1. Reset all options first
    for (let i = 0; i < timeSelect.options.length; i++) {
        timeSelect.options[i].disabled = false;
        // Clean up previous "(Booked)" text if it exists
        timeSelect.options[i].innerText = timeSelect.options[i].value; 
    }

    try {
        // 2. Query Firebase for schedules ON this date
        const q = query(collection(db, "schedules"), where("date", "==", dateVal));
        const snapshot = await getDocs(q);

        // 3. Disable the booked times
        snapshot.forEach(doc => {
            const bookedTime = doc.data().time;
            
            // Find the option with this value
            for (let i = 0; i < timeSelect.options.length; i++) {
                if (timeSelect.options[i].value === bookedTime) {
                    timeSelect.options[i].disabled = true;
                    timeSelect.options[i].innerText = `${bookedTime} (Booked)`;
                }
            }
        });

    } catch (error) {
        console.error("Error checking availability:", error);
    }
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

// --- ACTIONS ---
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
    if(!confirm("Remove this scheduled visit?")) return;
    try {
        await deleteDoc(doc(db, "schedules", scheduleId));
        loadSchedule(); 
    } catch (error) { console.error(error); alert("Error deleting."); }
};

window.submitInspection = async function() {
    const scheduleId = document.getElementById('inspect-schedule-id').value;
    const stallId = document.getElementById('inspect-stall-id').value;
    const stallName = document.getElementById('inspect-stall-name').value;
    const scoreVal = document.getElementById('input-score').value;
    const strengthsText = document.getElementById('input-strengths').value;
    const remarksText = document.getElementById('input-remarks').value;

    const score = parseInt(scoreVal);
    if (isNaN(score) || score < 0 || score > 100) { alert("Invalid score"); return; }

    let grade = 'D'; let status = 'Action Req.';
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

// --- LOADERS ---
async function loadStallDirectory() {
    const tbody = document.getElementById('stall-directory-body');
    if (!tbody) return;
    const snapshot = await getDocs(collection(db, "stalls"));
    let html = "";
    snapshot.forEach(doc => {
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

loadDashboard();
loadStallDirectory();
loadSchedule();