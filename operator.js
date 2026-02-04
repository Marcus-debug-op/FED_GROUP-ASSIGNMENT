// --- 1. FIREBASE CONFIGURATION ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
    authDomain: "hawkerhub-64e2d.firebaseapp.com",
    databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hawkerhub-64e2d",
    storageBucket: "hawkerhub-64e2d.firebasestorage.app",
    messagingSenderId: "722888051277",
    appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 2. GLOBAL VARIABLES FOR CHARTS ---
let salesChartInstance = null;
let orderChartInstance = null;

// --- 3. LISTEN FOR REAL-TIME UPDATES ---
const docRef = doc(db, "stats", "summary");

onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("New data received:", data);
        updateDashboard(data);
    } else {
        console.log("No such document! Did you create the 'stats/summary' document in Firestore?");
        updateDashboard(getFallbackData()); 
    }
}, (error) => {
    console.error("Error getting document:", error);
});

// --- 4. DASHBOARD UPDATE LOGIC ---
function updateDashboard(data) {
    const safe = (val) => val !== undefined ? val : '-';

    // Update Text Elements (Check if element exists before updating to avoid errors)
    if(document.getElementById('total-revenue')) document.getElementById('total-revenue').innerText = `$${(data.totalRevenue || 0).toLocaleString()}`;
    if(document.getElementById('revenue-trend')) document.getElementById('revenue-trend').innerText = `+${safe(data.revenueIncrease)}%`;
    if(document.getElementById('orders-today')) document.getElementById('orders-today').innerText = safe(data.ordersToday);
    if(document.getElementById('orders-trend')) document.getElementById('orders-trend').innerText = `+${safe(data.ordersIncrease)}%`;
    if(document.getElementById('avg-rating')) document.getElementById('avg-rating').innerText = safe(data.avgRating);
    if(document.getElementById('review-count')) document.getElementById('review-count').innerText = safe(data.totalReviews);
    if(document.getElementById('hygiene-grade')) document.getElementById('hygiene-grade').innerText = safe(data.hygieneGrade);
    if(document.getElementById('hygiene-score')) document.getElementById('hygiene-score').innerText = safe(data.hygieneScore);
    if(document.getElementById('last-inspection')) document.getElementById('last-inspection').innerText = safe(data.lastInspected);

    updateCharts(data);
}

// --- 5. CHART LOGIC ---
function updateCharts(data) {
    const salesData = data.salesTrend || [0,0,0,0,0,0];
    const orderData = data.orderDistribution || [1,1,1];

    // Sales Chart
    const salesCanvas = document.getElementById('salesChart');
    if (salesCanvas) {
        const ctxSales = salesCanvas.getContext('2d');
        if (salesChartInstance) {
            salesChartInstance.data.datasets[0].data = salesData;
            salesChartInstance.update();
        } else {
            salesChartInstance = new Chart(ctxSales, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Revenue',
                        data: salesData,
                        borderColor: '#ff6b00',
                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
    }

    // Order Chart
    const orderCanvas = document.getElementById('orderTypeChart');
    if (orderCanvas) {
        const ctxOrders = orderCanvas.getContext('2d');
        if (orderChartInstance) {
            orderChartInstance.data.datasets[0].data = orderData;
            orderChartInstance.update();
        } else {
            orderChartInstance = new Chart(ctxOrders, {
                type: 'pie',
                data: {
                    labels: ['Dine-in', 'Takeaway', 'Delivery'],
                    datasets: [{
                        data: orderData,
                        backgroundColor: ['#ff6b00', '#ffb380', '#ffe0cc'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }
    }
}

// --- 6. NAVIGATION LOGIC ---
// crucial: attach to window so HTML onclick="..." can see it
window.switchPage = function(pageId, element) {
    const pages = document.querySelectorAll('[id^="page-"]');
    pages.forEach(page => page.classList.add('hidden'));

    const target = document.getElementById('page-' + pageId);
    if(target) target.classList.remove('hidden');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if(element) element.classList.add('active');

    if (pageId === 'overview') {
        window.dispatchEvent(new Event('resize'));
    }
};

// --- 7. FALLBACK DATA ---
function getFallbackData() {
    return {
        totalRevenue: 0, revenueIncrease: 0,
        ordersToday: 0, ordersIncrease: 0,
        avgRating: 0, totalReviews: 0,
        hygieneGrade: "-", hygieneScore: 0, lastInspected: "-",
        salesTrend: [0,0,0,0,0,0], orderDistribution: [1,1,1]
    };
}