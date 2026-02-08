import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const stallNameDisplay = document.getElementById('stallNameDisplay');
const complaintsList = document.getElementById('complaints-list');
const vendorName = document.getElementById('vendorName');
const vendorEmail = document.getElementById('vendorEmail');

// Modal Elements
const modal = document.getElementById('detailModal');
const closeModal = document.getElementById('closeDetailModal');
const closeBtnSecondary = document.getElementById('closeBtnSecondary');

// Status & Delete Elements
const statusSelect = document.getElementById('statusSelect');
const saveIndicator = document.getElementById('saveStatusIndicator');
const deleteIconBtn = document.getElementById('deleteIconBtn');

// Reply Elements
const replyInput = document.getElementById('vendorReplyInput');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const replyStatusText = document.getElementById('replyStatusText');

let currentStallId = null;
let currentComplaintId = null;

// 1. Check Auth & Load Stall
onAuthStateChanged(auth, async (user) => {
    if (user) {
        vendorEmail.textContent = user.email;
        vendorName.textContent = user.displayName || "Vendor";
        await findVendorStall(user.uid);
    } else {
        window.location.href = "signup.html"; 
    }
});

// 2. Find which stall belongs to this user
async function findVendorStall(userId) {
    try {
        const q = query(collection(fs, "stalls"), where("vendorId", "==", userId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const stallDoc = querySnapshot.docs[0];
            currentStallId = stallDoc.id;
            stallNameDisplay.textContent = stallDoc.data().name;
            loadComplaints(currentStallId);
        } else {
            stallNameDisplay.textContent = "No Stall Linked";
            complaintsList.innerHTML = `<div class="state-message error-state"><p>No stall linked to this account.</p></div>`;
        }
    } catch (error) {
        console.error("Error finding stall:", error);
    }
}

// 3. Load Complaints
async function loadComplaints(stallId) {
    complaintsList.innerHTML = "<p class='loading-text'>Loading complaints...</p>";

    try {
        const complaintsRef = collection(fs, "stalls", stallId, "complaints");
        const snapshot = await getDocs(complaintsRef);

        if (snapshot.empty) {
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
            const currentStatus = data.status || "Pending"; 
            const statusClass = currentStatus.toLowerCase().replace(" ", ""); 

            let dateStr = "Unknown Date";
            if (data.timestamp) {
                dateStr = new Date(data.timestamp.seconds * 1000).toLocaleDateString("en-SG", {
                    day: 'numeric', month: 'short', year: 'numeric'
                });
            }
            
            const card = document.createElement('div');
            card.className = `complaint-card status-${statusClass}`;
            
            card.innerHTML = `
                <div class="card-header">
                    <div class="user-info">
                        <span class="user-badge">${data.userEmail ? data.userEmail.split('@')[0] : 'Anonymous'}</span>
                        <span class="status-pill ${statusClass}">${currentStatus}</span>
                    </div>
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
    }
}

// 4. Modal Logic
function openModal(docId, data, date) {
    currentComplaintId = docId;
    
    // Fill Text Data
    document.getElementById('modalUser').textContent = data.userEmail || "Anonymous";
    document.getElementById('modalDate').textContent = date;
    document.getElementById('modalComplaint').textContent = data.complaint;
    document.getElementById('modalImprovement').textContent = data.improvement || "None provided";
    
    // Fill Reply Data
    replyInput.value = data.vendorReply || ""; 
    replyStatusText.textContent = "";

    // Set Status & Show/Hide Delete Icon
    statusSelect.value = data.status || "Pending";
    toggleDeleteIcon(statusSelect.value);
    
    saveIndicator.classList.remove('visible'); 

    // Handle Image
    const imgEl = document.getElementById('modalImage');
    const noImgText = document.getElementById('noImageText');
    
    if (data.imageURL) {
        imgEl.src = data.imageURL;
        imgEl.classList.add('show');
        imgEl.classList.remove('hide');
        noImgText.classList.add('hide');
        noImgText.classList.remove('show');
    } else {
        imgEl.classList.add('hide');
        imgEl.classList.remove('show');
        noImgText.classList.add('show');
        noImgText.classList.remove('hide');
    }

    modal.classList.add('flex-show');
}

// Helper: Show Delete Icon only if Resolved/Rejected
function toggleDeleteIcon(status) {
    if (status === "Resolved" || status === "Rejected") {
        deleteIconBtn.classList.add("visible");
    } else {
        deleteIconBtn.classList.remove("visible");
    }
}

// 5. Update Status Listener
statusSelect.addEventListener('change', async (e) => {
    if (!currentStallId || !currentComplaintId) return;

    const newStatus = e.target.value;
    
    // Immediate UI update
    toggleDeleteIcon(newStatus);

    try {
        const docRef = doc(fs, "stalls", currentStallId, "complaints", currentComplaintId);
        await updateDoc(docRef, { status: newStatus });

        saveIndicator.classList.add('visible');
        setTimeout(() => saveIndicator.classList.remove('visible'), 2000);
        loadComplaints(currentStallId); // Refresh background list
    } catch (error) {
        console.error("Error updating status:", error);
        alert("Failed to update status.");
    }
});

// 6. Reply Logic
sendReplyBtn.addEventListener('click', async () => {
    if (!currentStallId || !currentComplaintId) return;
    
    const replyText = replyInput.value.trim();
    if (!replyText) {
        alert("Please type a reply first.");
        return;
    }

    try {
        sendReplyBtn.textContent = "Sending...";
        const docRef = doc(fs, "stalls", currentStallId, "complaints", currentComplaintId);
        
        await updateDoc(docRef, { vendorReply: replyText });

        replyStatusText.textContent = "Reply Sent Successfully!";
        sendReplyBtn.textContent = "Send Reply";
    } catch (error) {
        console.error("Error sending reply:", error);
        replyStatusText.textContent = "Error sending reply.";
        sendReplyBtn.textContent = "Send Reply";
    }
});

// 7. Delete Logic (Trash Icon)
deleteIconBtn.addEventListener('click', async () => {
    if (!currentStallId || !currentComplaintId) return;

    if (confirm("Are you sure you want to permanently delete this record?")) {
        try {
            await deleteDoc(doc(fs, "stalls", currentStallId, "complaints", currentComplaintId));
            modal.classList.remove('flex-show');
            loadComplaints(currentStallId); 
            alert("Record deleted.");
        } catch (error) {
            console.error("Error deleting:", error);
            alert("Failed to delete.");
        }
    }
});

// Close Modal
[closeModal, closeBtnSecondary].forEach(btn => {
    btn.addEventListener('click', () => {
        modal.classList.remove('flex-show');
    });
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = "signup.html");
});