import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";


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

const ordersListElement = document.getElementById("orders-list");

function renderOrders(orders) {
    ordersListElement.innerHTML = "";

    if (orders.length === 0) {
        ordersListElement.innerHTML = '<div class="loading-text">No active orders found for this stall.</div>';
        return;
    }

    orders.forEach((order, index) => {
        const orderCard = document.createElement("div");
        orderCard.className = "order-card";

        const orderNo = order.orderNo || index + 1;
        const customerName = order.userName || "Customer";
        
        // Handle items
        let itemsArray = [];
        if (order.items && Array.isArray(order.items)) {
            itemsArray = order.items;
        } else if (order["1"]) {
            itemsArray.push(order["1"]);
        }
        const itemCount = itemsArray.length;
        
        const totalPrice = order.total || order.price || 0;
        const formattedPrice = typeof totalPrice === 'number' ? totalPrice.toFixed(2) : totalPrice;
        
        let timeString = "Recently";
        if (order.timestamp) {
            timeString = new Date(order.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        const isCompleted = order.status === 'completed';
        const displayStatus = isCompleted ? 'Claimed' : (order.status === 'Paid' ? 'Paid (Unclaimed)' : 'Unclaimed');
        const statusClass = isCompleted ? 'claimed' : 'unclaimed'; 

        // --- PAYMENT CAPITALIZATION FIX ---
        let rawPayment = order.payment?.method || 'PayNow';
        // Check specific cases or just capitalize first letter
        let paymentText = rawPayment;
        if (rawPayment === 'paynow') {
            paymentText = 'PayNow';
        } else {
            // Capitalize first letter: "cash" -> "Cash"
            paymentText = rawPayment.charAt(0).toUpperCase() + rawPayment.slice(1);
        }

        const collectionClass = order.collectionMethod === 'Delivery' ? 'delivery' : 'pickup';
        const collectionText = order.collectionMethod || "Pickup";

        let itemsHtml = itemsArray.map(item => `
            <div class="item-row">
                <span>• ${item.name}</span>
                <span>x ${item.qty || 1}</span>
            </div>
        `).join("");

        orderCard.innerHTML = `
            <div class="queue-section">
                <span class="queue-label">Queue No.</span>
                <span class="queue-number">${orderNo}</span>
            </div>

            <div class="details-section">
                <div class="customer-badge">${customerName}</div>
                <div class="items-list">${itemsHtml}</div>
                <div class="order-meta">
                    <span class="item-count">${itemCount} Item</span>
                    <span class="divider">|</span>
                    <span class="total-price">$${formattedPrice}</span>
                    <span class="time-stamp">${timeString}</span>
                </div>
            </div>

            <div class="collection-section">
                <span class="section-label">Collection</span>
                <span class="status-text ${collectionClass}">${collectionText}</span>
            </div>

            <div class="payment-section">
                <span class="section-label">Payment</span>
                <span class="payment-method">${paymentText}</span>
                <button class="action-btn ${statusClass}" data-id="${order.id}" data-status="${order.status}">
                    ${displayStatus}
                </button>
            </div>
        `;
        ordersListElement.appendChild(orderCard);
    });

    document.querySelectorAll(".action-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            toggleOrderStatus(e.target.getAttribute("data-id"), e.target.getAttribute("data-status"));
        });
    });
}

async function toggleOrderStatus(orderId, currentStatus) {
    const orderRef = doc(db, "orders", orderId);
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
        await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
        console.error("Status update failed:", error);
    }
}

function initVendorApp() {
    console.log("Initializing Vendor App...");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const stallsRef = collection(db, "stalls");
            const q = query(stallsRef, where("vendorId", "==", user.uid));
            onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const stallDoc = snapshot.docs[0];
                    const stallId = stallDoc.id; 
                    console.log("✅ Found Vendor's Stall ID:", stallId);
                    listenForOrders(stallId);
                } else {
                    ordersListElement.innerHTML = `<div class="loading-text">Error: No stall found linked to this account.</div>`;
                }
            });
        } else {
            ordersListElement.innerHTML = '<div class="loading-text">Please login to view orders.</div>';
        }
    });
}

function listenForOrders(targetStallId) {
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("stallId", "==", targetStallId));
    onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        orders.sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0));
        renderOrders(orders);
    }, (error) => {
        console.error("Order Listener Error:", error);
    });
}

initVendorApp();