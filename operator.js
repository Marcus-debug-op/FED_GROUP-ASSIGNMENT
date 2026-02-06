import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 1. FIREBASE CONFIG
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

// 2. MAIN FUNCTION
async function loadManagerDashboard() {
    console.log("Calculating revenue from real orders...");

    try {
        // --- STEP A: Get all Orders to calculate Money ---
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        
        let totalCentreRevenue = 0;
        let totalOrdersCount = 0;
        
        // This object will store revenue per stall: { "Laksa Legend": 50, "Ah Seng": 120 }
        let stallRevenueMap = {}; 

        ordersSnapshot.forEach((doc) => {
            const data = doc.data();

            // Only count valid/paid orders to be accurate
            // (If you want to count EVERYTHING, remove the 'if' check)
            if (data.status === "Paid" || data.status === "Completed") {
                
                // 1. Add to Grand Total
                const amount = data.total || 0; 
                totalCentreRevenue += amount;
                totalOrdersCount++;

                // 2. Add to Specific Stall's Total
                const sName = data.stallName || "Unknown Stall";
                
                if (stallRevenueMap[sName]) {
                    stallRevenueMap[sName] += amount;
                } else {
                    stallRevenueMap[sName] = amount;
                }
            }
        });

        // --- STEP B: Get Stalls for Hygiene Info (Optional but nice) ---
        // We fetch stalls just to count how many exist and get their grades
        const stallsSnapshot = await getDocs(collection(db, "stalls"));
        let activeStallsCount = stallsSnapshot.size;
        let hygieneMap = {}; // { "Laksa Legend": "A" }

        stallsSnapshot.forEach(doc => {
            const sData = doc.data();
            const name = sData.name;
            if(name) hygieneMap[name] = sData.hygiene || "?";
        });


        // --- STEP C: Update the HTML ---

        // 1. Grand Totals
        document.getElementById('centre-revenue').innerText = "$" + totalCentreRevenue.toLocaleString();
        document.getElementById('total-traffic').innerText = totalOrdersCount.toLocaleString();
        document.getElementById('active-stalls').innerText = activeStallsCount;

        // 2. Populate "Top Performing Stalls" Table
        // Convert our Map into an Array so we can sort it
        let sortedStalls = [];
        for (let [name, revenue] of Object.entries(stallRevenueMap)) {
            sortedStalls.push({
                name: name,
                revenue: revenue,
                grade: hygieneMap[name] || "-" // Get grade from the other collection
            });
        }

        // Sort by highest revenue
        sortedStalls.sort((a, b) => b.revenue - a.revenue);

        // Generate Table HTML
        const tableBody = document.getElementById('top-stalls-body');
        let html = "";
        
        // Show top 5
        sortedStalls.slice(0, 5).forEach(stall => {
            let badgeClass = 'badge-pending';
            if (stall.grade === 'A') badgeClass = 'badge-success';
            if (stall.grade === 'C') badgeClass = 'badge-danger';
            
            html += `
                <tr>
                    <td>${stall.name}</td>
                    <td>$${stall.revenue.toLocaleString()}</td>
                    <td><span class="badge ${badgeClass}">${stall.grade}</span></td>
                </tr>
            `;
        });
        
        if (sortedStalls.length === 0) {
            html = "<tr><td colspan='3'>No paid orders found yet.</td></tr>";
        }

        tableBody.innerHTML = html;

        // 3. Render Chart
        renderCentreChart(totalCentreRevenue);

    } catch (error) {
        console.error("Error calculating revenue:", error);
    }
}

function renderCentreChart(currentTotal) {
    const ctx = document.getElementById('centreRevenueChart').getContext('2d');
    
    // Fake trend data for visual effect
    const trendData = [
        currentTotal * 0.7, 
        currentTotal * 0.8, 
        currentTotal * 0.6, 
        currentTotal * 0.9, 
        currentTotal * 0.85, 
        currentTotal
    ];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Cumulative Revenue',
                data: trendData,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
        }
    });
}

// Run it
loadManagerDashboard();