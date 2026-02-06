import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. FIREBASE CONFIGURATION
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

// 2. MAIN FUNCTION: LOAD DATA
async function loadOfficerData() {
    console.log("Fetching officer data...");

    try {
        // Fetch all documents from the "stats" collection
        const querySnapshot = await getDocs(collection(db, "stats"));
        
        let totalStalls = 0;
        let criticalIssues = 0;
        let totalScore = 0;
        
        let directoryHTML = '';
        let recentHTML = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const stallId = doc.id;

            // Calculations
            totalStalls++;
            const score = data.hygieneScore || 0;
            totalScore += score;

            // Determine Grade and Status
            const grade = data.hygieneGrade || '?';
            
            // Count critical issues (C or D grade)
            if (grade === 'C' || grade === 'D') {
                criticalIssues++;
            }

            // Badge Logic
            let badgeClass = 'badge-pending';
            let statusText = 'Warning';
            
            if (grade === 'A') { 
                badgeClass = 'badge-success'; 
                statusText = 'Pass';
            } else if (grade === 'B') {
                badgeClass = 'badge-pending';
                statusText = 'Monitor';
            } else {
                badgeClass = 'badge-danger';
                statusText = 'Action Req.';
            }

            // Fill Stall Directory Table
            directoryHTML += `
                <tr>
                    <td>#${stallId.substring(0, 5)}</td>
                    <td>${data.stallName || 'Unknown'}</td>
                    <td>${data.ownerName || '-'}</td>
                    <td><span class="badge ${badgeClass}">${grade} (${score})</span></td>
                    <td><button class="btn-text">View</button></td>
                </tr>
            `;

            // Fill Dashboard Recent Activity Table
            const date = data.lastInspected || "Pending";
            recentHTML += `
                <tr>
                    <td>${data.stallName || 'Unknown'}</td>
                    <td>${date}</td>
                    <td><span class="badge ${badgeClass}">${grade} (${score})</span></td>
                    <td>${statusText}</td>
                </tr>
            `;
        });

        // Update Dashboard Stats
        if(document.getElementById('total-stalls')) {
            document.getElementById('total-stalls').innerText = totalStalls;
        }
        
        if(document.getElementById('critical-violations')) {
            document.getElementById('critical-violations').innerText = criticalIssues;
        }

        if(document.getElementById('avg-zone-score')) {
            const avg = totalStalls > 0 ? (totalScore / totalStalls).toFixed(1) : 0;
            document.getElementById('avg-zone-score').innerText = avg;
        }

        // Inject Table HTML
        const recentTable = document.getElementById('recent-inspections-body');
        if(recentTable) recentTable.innerHTML = recentHTML;

        const directoryTable = document.querySelector('#page-stalls tbody');
        if(directoryTable) directoryTable.innerHTML = directoryHTML;

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// 3. NAVIGATION LOGIC
window.switchPage = function(pageId, element) {
    // Hide all pages
    document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
    
    // Show target page
    const target = document.getElementById('page-' + pageId);
    if(target) target.classList.remove('hidden');
    
    // Update sidebar state
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
};

// Start loading data immediately
loadOfficerData();