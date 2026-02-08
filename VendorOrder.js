import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
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
const searchInput = document.getElementById("order-search");
const filterButtons = Array.from(document.querySelectorAll(".filter-chip"));

// --- UI state ---
let allOrders = [];
let activeFilter = "all"; // all | new | preparing | ready | completed
let searchTerm = "";

// --- workflow helpers ---
function normalizeWorkflowStatus(raw) {
    const s = (raw || "").toString().trim().toLowerCase();
    if (!s) return "new";

    if (s === "new" || s === "pending" || s === "paid") return "new";
    if (s === "accepted" || s === "accept" || s === "preparing" || s === "in progress") return "preparing";
    if (s === "ready" || s === "ready for pickup") return "ready";
    if (s === "completed" || s === "complete" || s === "done") return "completed";

    // fallback
    return "new";
}

function getWorkflowStatus(order) {
    // We store vendor workflow in `orderStatus`. If missing, infer from old `status` usage.
    if (order.orderStatus) return normalizeWorkflowStatus(order.orderStatus);
    if (order.status === "completed") return "completed";
    return "new";
}

function workflowLabel(s) {
    if (s === "preparing") return "Preparing";
    if (s === "ready") return "Ready";
    if (s === "completed") return "Completed";
    return "New";
}

function getNextWorkflowStatus(s) {
    if (s === "new") return "preparing";
    if (s === "preparing") return "ready";
    if (s === "ready") return "completed";
    return "completed";
}

function nextActionLabel(s) {
    if (s === "new") return "Start Preparing";
    if (s === "preparing") return "Mark Ready";
    if (s === "ready") return "Complete";
    return null;
}

function safeLower(v) {
    return (v || "").toString().toLowerCase();
}

function orderMatchesSearch(order, term) {
    if (!term) return true;
    const t = term.trim().toLowerCase();
    if (!t) return true;

    const orderNo = (order.orderNo ?? "").toString();
    const customerName = safeLower(order.userName || "");
    const paymentMethod = safeLower(order.payment?.method || "");
    const collectionMethod = safeLower(order.collectionMethod || "");

    let itemsText = "";
    if (Array.isArray(order.items)) {
        itemsText = order.items.map(i => `${i?.name || ""} ${i?.qty || ""}`).join(" ").toLowerCase();
    } else if (order["1"]) {
        itemsText = `${order["1"]?.name || ""} ${order["1"]?.qty || ""}`.toLowerCase();
    }

    return (
        orderNo.includes(t) ||
        customerName.includes(t) ||
        paymentMethod.includes(t) ||
        collectionMethod.includes(t) ||
        itemsText.includes(t) ||
        safeLower(order.id).includes(t)
    );
}

function applyFiltersAndRender() {
    const filtered = allOrders
        .filter(order => {
            const ws = getWorkflowStatus(order);
            const matchesFilter = activeFilter === "all" ? true : ws === activeFilter;
            return matchesFilter && orderMatchesSearch(order, searchTerm);
        })
        .sort((a, b) => {
            const pr = { new: 0, preparing: 1, ready: 2, completed: 3 };
            const aS = getWorkflowStatus(a);
            const bS = getWorkflowStatus(b);

            const pDiff = (pr[aS] ?? 99) - (pr[bS] ?? 99);
            if (pDiff !== 0) return pDiff;

            // Oldest first (if timestamp exists)
            const aT = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : 0;
            const bT = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : 0;
            if (aT !== bT) return aT - bT;

            return (a.orderNo || 0) - (b.orderNo || 0);
        });

    renderOrders(filtered);
}

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

        // --- Claim / unclaim (kept to avoid breaking existing logic elsewhere) ---
        const isClaimed = order.isClaimed === true || order.status === "completed";
        const displayClaim = isClaimed
            ? "Paid (Claimed)"
            : (order.status === "Paid" ? "Paid (Unclaimed)" : "Unclaimed");
        const claimClass = isClaimed ? "claimed" : "unclaimed";

        // --- PAYMENT CAPITALIZATION FIX ---
        let rawPayment = order.payment?.method || 'PayNow';
        let paymentText = rawPayment;
        if (rawPayment === 'paynow') {
            paymentText = 'PayNow';
        } else {
            paymentText = rawPayment.charAt(0).toUpperCase() + rawPayment.slice(1);
        }

        const collectionClass = order.collectionMethod === 'Delivery' ? 'delivery' : 'pickup';
        const collectionText = order.collectionMethod || "Pickup";

        // --- Vendor workflow status (NEW FEATURE) ---
        const workflowStatus = getWorkflowStatus(order); // new | preparing | ready | completed
        const workflowText = workflowLabel(workflowStatus);
        const nextStatus = getNextWorkflowStatus(workflowStatus);
        const nextText = nextActionLabel(workflowStatus);
        const canAdvance = workflowStatus !== "completed";

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
                <span class="order-status-badge ${workflowStatus}">${workflowText}</span>

                ${nextText ? `
                <div class="status-actions">
                    <button class="status-btn primary"
                    data-action="advance"
                    data-id="${order.id}"
                    data-next="${nextStatus}">
                    ${nextText}
                    </button>
                </div>
                ` : ""}


                <button class="action-btn ${claimClass}" type="button" data-action="claim" data-id="${order.id}" data-claimed="${isClaimed}">
                    ${displayClaim}
                </button>
            </div>
        `;
        ordersListElement.appendChild(orderCard);
    });
}

// Event delegation (avoids re-binding listeners every render)
ordersListElement.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    if (!action) return;

    const orderId = btn.getAttribute("data-id");
    if (!orderId) return;

    if (action === "claim") {
        const claimed = btn.getAttribute("data-claimed") === "true";
        await toggleClaimStatus(orderId, claimed);
    }

    if (action === "advance") {
        const next = btn.getAttribute("data-next");
        await updateWorkflowStatus(orderId, next);
    }
});

async function toggleClaimStatus(orderId, isCurrentlyClaimed) {
    const orderRef = doc(db, "orders", orderId);
    try {
        // Keep old `status` flip to avoid breaking existing features that rely on it.
        const newLegacyStatus = isCurrentlyClaimed ? "pending" : "completed";
        await updateDoc(orderRef, { status: newLegacyStatus, isClaimed: !isCurrentlyClaimed });
    } catch (error) {
        console.error("Claim update failed:", error);
    }
}

async function updateWorkflowStatus(orderId, nextStatus) {
    const orderRef = doc(db, "orders", orderId);
    try {
        await updateDoc(orderRef, { orderStatus: nextStatus });
    } catch (error) {
        console.error("Workflow update failed:", error);
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
        allOrders = orders;
        applyFiltersAndRender();
    }, (error) => {
        console.error("Order Listener Error:", error);
    });
}

// --- wire up UI controls ---
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value || "";
        applyFiltersAndRender();
    });
}

filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        activeFilter = btn.getAttribute("data-filter") || "all";

        filterButtons.forEach(b => {
            const isActive = (b.getAttribute("data-filter") || "all") === activeFilter;
            b.classList.toggle("is-active", isActive);
            b.setAttribute("aria-selected", isActive ? "true" : "false");
        });

        applyFiltersAndRender();
    });
});

initVendorApp();
