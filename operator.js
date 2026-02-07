import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// GLOBAL VARIABLES FOR CHARTS
let revenueChartInstance = null;
let itemChartInstance = null;
let paymentChartInstance = null;

// 2. LOAD DASHBOARD (Overview)
async function loadManagerDashboard() {
    console.log("Loading dashboard...");
    
    try {
        // Fetch Orders & Stalls
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const stallsSnapshot = await getDocs(collection(db, "stalls"));
        
        // A. Hygiene Map (Stall Name -> Grade)
        let hygieneMap = {};
        stallsSnapshot.forEach(doc => {
            const d = doc.data();
            if(d.name) hygieneMap[d.name] = d.hygiene || "B";
        });

        // B. Calculate Revenue & Item Sales
        let totalRev = 0;
        let orderCount = 0;
        let stallRevMap = {};
        let itemSalesMap = {}; // { "Chicken Rice": 50 }
        let paymentMap = { "Card": 0, "Cash": 0 };

        ordersSnapshot.forEach(doc => {
            const data = doc.data();
            
            // Only count Paid/Completed
            if(data.status === "Paid" || data.status === "Completed") {
                const amount = data.total || 0;
                totalRev += amount;
                orderCount++;

                // Per Stall
                const sName = data.stallName || "Unknown";
                stallRevMap[sName] = (stallRevMap[sName] || 0) + amount;

                // Per Item (if items array exists)
                if(data.items && Array.isArray(data.items)) {
                    data.items.forEach(item => {
                        const itemName = item.name || "Unknown Item";
                        itemSalesMap[itemName] = (itemSalesMap[itemName] || 0) + (item.qty || 1);
                    });
                }
                
                // Payment Method (Mock data if missing)
                const method = data.payment?.method === 'card' ? 'Card' : 'Cash'; // simplified check
                paymentMap[method]++;
            }
        });

        // C. Update HTML Text
        if(document.getElementById('centre-revenue')) document.getElementById('centre-revenue').innerText = "$" + totalRev.toLocaleString();
        if(document.getElementById('active-stalls')) document.getElementById('active-stalls').innerText = stallsSnapshot.size;
        if(document.getElementById('total-traffic')) document.getElementById('total-traffic').innerText = orderCount;

        // D. Top Stalls Table
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

        // E. Render Revenue Chart
        renderRevenueChart(totalRev);

        // F. Store data globally for Reports Page
        window.reportData = { itemSalesMap, paymentMap };

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
                        <button class="btn-text" onclick="alert('Editing ${data.name}')">Edit</button>
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

// 4. LOAD REPORTS PAGE
function loadReports() {
    if(!window.reportData) return; // Wait for dashboard to load data first

    const { itemSalesMap, paymentMap } = window.reportData;

    // A. Top Items Chart
    const topItems = Object.entries(itemSalesMap)
        .sort((a,b) => b[1] - a[1]) // Sort by count
        .slice(0, 5); // Take top 5

    const ctxItems = document.getElementById('topItemsChart').getContext('2d');
    
    if(itemChartInstance) itemChartInstance.destroy(); // Prevent duplicate charts
    
    itemChartInstance = new Chart(ctxItems, {
        type: 'bar',
        data: {
            labels: topItems.map(i => i[0]), // Item Names
            datasets: [{
                label: 'Units Sold',
                data: topItems.map(i => i[1]), // Counts
                backgroundColor: '#7c3aed'
            }]
        },
        options: { responsive: true }
    });

    // B. Payment Chart
    const ctxPay = document.getElementById('paymentMethodChart').getContext('2d');
    if(paymentChartInstance) paymentChartInstance.destroy();

    paymentChartInstance = new Chart(ctxPay, {
        type: 'doughnut',
        data: {
            labels: Object.keys(paymentMap),
            datasets: [{
                data: Object.values(paymentMap),
                backgroundColor: ['#7c3aed', '#a78bfa']
            }]
        }
    });
}

// 5. CHART HELPER (Revenue)
function renderRevenueChart(total) {
    const ctx = document.getElementById('centreRevenueChart').getContext('2d');
    if(revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue',
                data: [total*0.7, total*0.8, total*0.9, total], // Mock trend
                borderColor: '#7c3aed',
                fill: false
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 6. DELETE STALL FUNCTION (Stub)
window.deleteStall = async function(id) {
    if(confirm("Are you sure you want to delete this stall? This cannot be undone.")) {
        try {
            await deleteDoc(doc(db, "stalls", id));
            alert("Stall deleted.");
            loadStallManagement(); // Refresh table
        } catch(e) {
            console.error("Delete failed:", e);
            alert("Delete failed (Permission denied or error).");
        }
    }
};

// 7. NAVIGATION
window.switchPage = function(pageId, element) {
    document.querySelectorAll('[id^="page-"]').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');

    // Trigger specific page loads
    if(pageId === 'stalls') loadStallManagement();
    if(pageId === 'reports') loadReports();
};

// Start
loadManagerDashboard();