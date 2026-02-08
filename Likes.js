import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

let currentUser = null;


onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    
    // Update profile info
    document.getElementById("profileName").textContent = user.displayName || user.email || "User";
    document.getElementById("profileEmail").textContent = user.email || "-";
    
    // Load likes
    loadLikes(user.uid);
  } else {
    // Redirect to login if not authenticated
    window.location.href = "signup.html";
  }
});

// Logout functionality
document.querySelector(".logout-btn").addEventListener("click", async () => {
  try {
    await auth.signOut();
    window.location.href = "signup.html";
  } catch (error) {
    console.error("Logout error:", error);
    alert("Error logging out. Please try again.");
  }
});

// Format price
function money(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

// Load likes from Firestore
async function loadLikes(userId) {
  const container = document.getElementById("likes-container");
  
  try {
    // Query the likes subcollection for this user
    const likesRef = collection(db, "users", userId, "likes");
    const q = query(likesRef, orderBy("likedAt", "desc"));
    const snapshot = await getDocs(q);
    
    container.innerHTML = "";
    
    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-heart" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
          <h3>No liked items yet</h3>
          <p style="color: #666; margin-top: 10px;">Start exploring menus and like your favorite dishes!</p>
          <a href="browsestalls.html" class="redeem-btn" style="margin-top: 20px; display: inline-block; text-decoration: none;">Browse Stalls</a>
        </div>
      `;
      return;
    }
    
    // Render each liked item
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const card = createLikeCard(docSnap.id, data);
      container.appendChild(card);
    });
    
  } catch (error) {
    console.error("Error loading likes:", error);
    container.innerHTML = `
      <p style="color: red; text-align: center;">Error loading likes. Please try again.</p>
    `;
  }
}

// Create a card for a liked item
function createLikeCard(likeId, data) {
  const card = document.createElement("div");
  card.className = "voucher-card like-card";
  
  const itemName = data.itemName || "Unknown Item";
  const stallName = data.stallName || "Unknown Stall";
  const price = money(data.price || 0);
  const image = data.image || "";
  const stallId = data.stallId || "";
  const itemId = data.itemId || "";
  
  card.innerHTML = `
    <div class="like-card-content">
      ${image ? `
        <div class="like-image">
          <img src="${image}" alt="${itemName}">
        </div>
      ` : `
        <div class="like-image-placeholder">
          <i class="fa-solid fa-utensils"></i>
        </div>
      `}
      
      <div class="vc-details">
        <h3>${itemName}</h3>
        <p style="color: #666; margin: 5px 0;">
          <i class="fa-solid fa-store"></i> ${stallName}
        </p>
        <p class="offer">${price}</p>
      </div>
    </div>
    
    <div class="vc-actions">
      <button class="view-menu-btn" data-stall-id="${stallId}">
        <i class="fa-solid fa-eye"></i> View Menu
      </button>
      <button class="unlike-btn" data-like-id="${likeId}">
        <i class="fa-solid fa-heart-crack"></i> Unlike
      </button>
    </div>
  `;
  
  return card;
}

// Event delegation for unlike and view menu buttons
document.getElementById("likes-container").addEventListener("click", async (e) => {
  // Unlike button
  if (e.target.closest(".unlike-btn")) {
    const btn = e.target.closest(".unlike-btn");
    const likeId = btn.dataset.likeId;
    
    if (confirm("Remove this item from your likes?")) {
      await unlikeItem(likeId);
    }
  }
  
  // View menu button
  if (e.target.closest(".view-menu-btn")) {
    const btn = e.target.closest(".view-menu-btn");
    const stallId = btn.dataset.stallId;
    
    if (stallId) {
      window.location.href = `menus.html?id=${stallId}`;
    }
  }
});

// Remove a like from Firestore
async function unlikeItem(likeId) {
  if (!currentUser) return;
  
  try {
    const likeRef = doc(db, "users", currentUser.uid, "likes", likeId);
    await deleteDoc(likeRef);
    
    // Reload likes
    loadLikes(currentUser.uid);
  } catch (error) {
    console.error("Error unliking item:", error);
    alert("Error removing like. Please try again.");
  }
}