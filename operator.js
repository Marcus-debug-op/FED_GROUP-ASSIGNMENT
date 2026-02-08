import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, deleteDoc, query, where, limit } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// 1. CONFIG
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
const auth = getAuth(app);

// GLOBAL VARIABLES (Only Revenue Chart remains)
let revenueChartInstance = null;

// 2. LOAD DASHBOARD (Overview)
async function loadManagerDashboard() {
    console.log("Loading dashboard...");
    
    try {
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const stallsSnapshot = await getDocs(collection(db, "stalls"));
        
        // --- A. SETUP DATES ---
        const today = new Date();
        const thisMonth = today.getMonth();      // e.g., 1 (Feb)
        const thisYear = today.getFullYear();    // e.g., 2026

        // --- B. INITIALIZE COUNTERS ---
        let totalRev = 0;
        let totalOrders = 0;
        
        let totalStallRating = 0;
        let stallCountWithRating = 0;

        let stallRevMap = {};
        let dailyRevenueMap = {}; 
        let hygieneMap = {}; 

        // --- C. PROCESS STALLS (Rating & Hygiene) ---
        stallsSnapshot.forEach(doc => {
            const data = doc.data();
            
            if(data.name) hygieneMap[data.name] = data.hygiene || "B";

            // Calculate Rating from Stalls Collection
            if (data.rating && typeof data.rating === 'number') {
                totalStallRating += data.rating;
                stallCountWithRating++;
            }
        });

        // --- D. PROCESS ORDERS (Revenue & Daily Graph) ---
        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            
            if(data.status === "Paid" || data.status === "Completed") {
                const amount = data.total || 0;
                totalRev += amount;
                totalOrders++;

                // Date Checks for Graph (Current Month Only)
                if (data.createdAt) {
                    let dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (dateObj.getMonth() === thisMonth && dateObj.getFullYear() === thisYear) {
                        const day = dateObj.getDate();
                        dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + amount;
                    }
                }

                // Stall Aggregation (For Top Stalls)
                // Check root level first. If missing, check inside the first item.
                const sName = data.stallName || (data.items && data.items[0] ? data.items[0].stallName : "Unknown");
                stallRevMap[sName] = (stallRevMap[sName] || 0) + amount;
            }
        });

        // --- E. UPDATE HTML (TOTALS) ---
        if(document.getElementById('centre-revenue')) 
            document.getElementById('centre-revenue').innerText = "$" + totalRev.toLocaleString();
        
        if(document.getElementById('active-stalls')) 
            document.getElementById('active-stalls').innerText = stallsSnapshot.size;
        
        if(document.getElementById('total-traffic')) 
            document.getElementById('total-traffic').innerText = totalOrders;


        // --- F. UPDATE AVERAGE RATING ---
        const avgRating = stallCountWithRating > 0 
            ? (totalStallRating / stallCountWithRating).toFixed(1) 
            : "0.0";
            
        if(document.getElementById('centre-rating')) 
            document.getElementById('centre-rating').innerText = avgRating;


        // --- G. TOP STALLS TABLE ---
        let sortedStalls = [];
        for (let [name, revenue] of Object.entries(stallRevMap)) {
            sortedStalls.push({ name, revenue, grade: hygieneMap[name] || "-" });
        }
        sortedStalls.sort((a, b) => b.revenue - a.revenue);

        const topStallHTML = sortedStalls.slice(0,5).map(s => `
            <tr>
                <td>${s.name}</td>
                <td>$${s.revenue.toLocaleString()}</td>
                <td><span class="badge ${s.grade === 'A' ? 'badge-success' : 'badge-pending'}">${s.grade}</span></td>
            </tr>
        `).join('');
        document.getElementById('top-stalls-body').innerHTML = topStallHTML || '<tr><td colspan="3">No sales yet</td></tr>';


        // --- H. RENDER DAILY CHART ---
        const currentMonthName = today.toLocaleString('default', { month: 'short' });
        const sortedDays = Object.keys(dailyRevenueMap).map(Number).sort((a,b) => a - b);
        
        const chartLabels = sortedDays.map(day => `${currentMonthName} ${day}`);
        const chartData = sortedDays.map(day => dailyRevenueMap[day]);
        
        const chartTitleElement = document.querySelector('#centreRevenueChart').closest('.card').querySelector('h3');
        if(chartTitleElement) chartTitleElement.innerText = `Centre Revenue (${currentMonthName} Daily)`;

        renderRevenueChart(chartLabels, chartData);

    } catch (e) {
        console.error("Dashboard Error:", e);
    }
}

// 3. LOAD STALL MANAGEMENT PAGE
async function loadStallManagement() {
    const tableBody = document.getElementById('stall-management-body');
    if(!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5">Loading stalls...</td></tr>';

    try {
        const snapshot = await getDocs(collection(db, "stalls"));
        let html = "";
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            html += `
                <tr>
                    <td>#${id.substring(0,6)}</td>
                    <td>${data.name || 'Unknown'}</td>
                    <td>${data.stallNo || '-'}</td>
                    <td><span class="badge badge-success">${data.hygiene || '?'}</span></td>
                    <td>
                        <button class="btn-text" style="color:red" onclick="deleteStall('${id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        
    } catch (e) {
        console.error("Stall Load Error:", e);
    }
}

// 4. CHART HELPER (Revenue Only)
function renderRevenueChart(labels, data) {
    const ctx = document.getElementById('centreRevenueChart').getContext('2d');
    if(revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Revenue ($)',
                data: data,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// 5. DELETE STALL FUNCTION
window.deleteStall = async function(id) {
    if(confirm("Are you sure you want to delete this stall? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "stalls", id));
            alert("Stall deleted.");
            loadStallManagement();
        } catch(e) {
            console.error("Delete failed:", e);
            alert("Delete failed (Permission denied or error).");
        }
    }
};

// 6. LOAD SETTINGS (Finds Operator by Role)
async function loadSettings() {
    console.log("Loading settings...");
    
    onAuthStateChanged(auth, async (user) => {
        const nameField = document.getElementById('setting-name');
        const idField = document.getElementById('setting-id');

        try {
            // QUERY: Find the document where role == 'operator'
            // This ensures we get the operator profile even if IDs don't match exactly
            const q = query(collection(db, "operators"), where("role", "==", "operator"), limit(1));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const operatorDoc = querySnapshot.docs[0].data();
                if(nameField) nameField.value = operatorDoc.email || "No Email Found";
                if(idField) idField.value = operatorDoc.uid || "No UID Found"; 
            } else {
                // Fallback: Use logged in user if no operator doc exists
                if (user) {
                    if(nameField) nameField.value = user.email;
                    if(idField) idField.value = user.uid;
                }
            }
        } catch (error) {
            console.error("Error fetching operator profile:", error);
        }
    });
}

// 7. LOGOUT FUNCTION (Updated with Async/Await)
window.logout = async function() {
    if (!confirm("Are you sure you want to log out?")) return;
    
    try {
        await signOut(auth);
        alert("Logged out successfully.");
        window.location.href = "HomeGuest.html"; // Redirects after sign out completes
    } catch (error) {
        console.error("Logout Error:", error);
        alert("Error logging out.");
    }
};

// 8. NAVIGATION
window.switchPage = function(pageId, element) {
    document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');

    if(pageId === 'stalls') loadStallManagement();
    if(pageId === 'settings') loadSettings();
};

// Start
loadManagerDashboard();