import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const discountContainer = document.getElementById("discount-container");

// 1. Separate Logout Logic
async function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        try {
            await signOut(auth);
            window.location.href = "HomeGuest.html";
        } catch (error) {
            console.error("Logout failed", error);
        }
    }
}

// 2. Optimized Discount Loader
async function loadDiscounts() {
    try {
        const querySnapshot = await getDocs(collection(fs, "promocodes"));
        let html = "";

        if (querySnapshot.empty) {
            discountContainer.innerHTML = "<p>No discounts available at the moment.</p>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            html += `
                <div class="voucher-card">
                    <div class="vc-details">
                        <span class="tag-badge">
                            ${d.code} <i class="fa-solid fa-tag"></i>
                        </span>
                        <h3>${d.title}</h3>
                        <p class="offer">${d.offer}</p>
                    </div>
                    <div class="vc-actions">
                        <span class="status-active">${d.status || 'Active'}</span>
                        <button class="redeem-btn" onclick="navigator.clipboard.writeText('${d.code}'); alert('Copied!')">Redeem</button>
                        <span class="validity">Valid until <strong>${d.expiry}</strong></span>
                    </div>
                </div>`;
        });
        discountContainer.innerHTML = html;
    } catch (err) {
        console.error("Error loading discounts:", err);
        discountContainer.innerHTML = "<p>Error loading discounts.</p>";
    }
}

// 3. Auth Listener & Profile Loader
onAuthStateChanged(auth, async (user) => {
    loadDiscounts();

    if (user) {
        // Load Profile Info
        const userRef = doc(fs, "users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const userData = userSnap.data();
            document.getElementById("profileName").textContent = userData.fullName || userData.name || "User";
            document.getElementById("profileEmail").textContent = user.email;
        }

        // Attach Logout Event
        const logoutBtn = document.querySelector(".logout-btn");
        if (logoutBtn) {
            logoutBtn.onclick = handleLogout;
        }
    } else {
        window.location.href = "signup.html";
    }
});                                                                 