import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const stallNameDisplay = document.getElementById('stallNameDisplay');
const complaintsList = document.getElementById('complaints-list');
const vendorName = document.getElementById('vendorName');
const vendorEmail = document.getElementById('vendorEmail');

// Modal Elements
const modal = document.getElementById('detailModal');
const closeModal = document.getElementById('closeDetailModal');
const closeBtnSecondary = document.getElementById('closeBtnSecondary');
const resolveBtn = document.getElementById('resolveBtn');

let currentStallId = null;
let currentComplaintId = null;

// 1. Check Auth & Load Stall
onAuthStateChanged(auth, async (user) => {
    if (user) {
        vendorEmail.textContent = user.email;
        vendorName.textContent = user.displayName || "Vendor";
        await findVendorStall(user.uid);
    } else {
        window.location.href = "login.html"; 
    }
});

// 2. Find which stall belongs to this user
async function findVendorStall(userId) {
    try {
        console.log("Searching for stall with vendorID:", userId);

        // Uses "vendorId" (lowercase d) to match your database
        const q = query(collection(fs, "stalls"), where("vendorId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const stallDoc = querySnapshot.docs[0];
            currentStallId = stallDoc.id;
            
            console.log("Found Stall:", stallDoc.data().name);
            stallNameDisplay.textContent = stallDoc.data().name;
            
            loadComplaints(currentStallId);
        } else {
            console.warn("No stall found in database with vendorID:", userId);
            stallNameDisplay.textContent = "No Stall Linked";
            
            // REMOVED INLINE CSS HERE
            complaintsList.innerHTML = `
                <div class="state-message error-state">
                    <p>No stall linked to this account.</p>
                    <small>Your User ID: ${userId}</small>
                </div>`;
        }
    } catch (error) {
        console.error("Error finding stall:", error);
        complaintsList.innerHTML = `<p class="loading-text error">Error loading data.</p>`;
    }
}

// 3. Load Complaints from Sub-collection
async function loadComplaints(stallId) {
    complaintsList.innerHTML = "<p class='loading-text'>Loading complaints...</p>";

    try {
        const complaintsRef = collection(fs, "stalls", stallId, "complaints");
        const snapshot = await getDocs(complaintsRef);

        if (snapshot.empty) {
            // REMOVED INLINE CSS HERE
            complaintsList.innerHTML = `
                <div class="state-message success-state">
                    <h3>No active complaints</h3>
                    <p>Good job keeping your customers happy! 🎉</p>
                </div>`;
            return;
        }

        complaintsList.innerHTML = ""; 

        snapshot.forEach(doc => {
            const data = doc.data();
            
            let dateStr = "Unknown Date";
            if (data.timestamp) {
                dateStr = new Date(data.timestamp.seconds * 1000).toLocaleDateString("en-SG", {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            }
            
            const card = document.createElement('div');
            card.className = "complaint-card";
            card.innerHTML = `
                <div class="card-header">
                    <span class="user-badge">${data.userEmail ? data.userEmail.split('@')[0] : 'Anonymous'}</span>
                    <span class="date-text">${dateStr}</span>
                </div>
                <p class="reason-text"><strong>Reason:</strong> ${data.complaint}</p>
                <button class="view-details-btn" data-id="${doc.id}">View Details</button>
            `;

            card.querySelector('.view-details-btn').addEventListener('click', () => {
                openModal(doc.id, data, dateStr);
            });

            complaintsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching complaints:", error);
        complaintsList.innerHTML = `<p class="loading-text error">Error loading complaints.</p>`;
    }
}

// 4. Modal Logic (Class toggling handled via CSS where possible, but display requires JS state)
function openModal(docId, data, date) {
    currentComplaintId = docId;
    
    document.getElementById('modalUser').textContent = data.userEmail || "Anonymous";
    document.getElementById('modalDate').textContent = date;
    document.getElementById('modalComplaint').textContent = data.complaint;
    document.getElementById('modalImprovement').textContent = data.improvement || "None provided";
    
    const imgEl = document.getElementById('modalImage');
    const noImgText = document.getElementById('noImageText');
    
    if (data.imageURL) {
        imgEl.src = data.imageURL;
        imgEl.classList.add('show');     // Using class instead of inline style
        imgEl.classList.remove('hide');
        
        noImgText.classList.add('hide');
        noImgText.classList.remove('show');
    } else {
        imgEl.classList.add('hide');
        imgEl.classList.remove('show');
        
        noImgText.classList.add('show');
        noImgText.classList.remove('hide');
    }

    modal.classList.add('flex-show'); // Using class to show modal
}

// Close Modal Logic
[closeModal, closeBtnSecondary].forEach(btn => {
    btn.addEventListener('click', () => {
        modal.classList.remove('flex-show');
    });
});

// 5. Resolve (Delete) Complaint
resolveBtn.addEventListener('click', async () => {
    if (!currentStallId || !currentComplaintId) return;

    if (confirm("Are you sure you want to resolve and remove this complaint?")) {
        try {
            resolveBtn.textContent = "Deleting...";
            await deleteDoc(doc(fs, "stalls", currentStallId, "complaints", currentComplaintId));
            
            alert("Complaint resolved!");
            modal.classList.remove('flex-show');
            loadComplaints(currentStallId); 
            resolveBtn.textContent = "Resolve & Delete";
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete.");
            resolveBtn.textContent = "Resolve & Delete";
        }
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "login.html");
});