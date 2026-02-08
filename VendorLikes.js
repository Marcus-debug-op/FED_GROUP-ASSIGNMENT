import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  collectionGroup,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("VendorLikes.js loaded");

let currentStallId = "";
let allLikesData = [];
let currentFilter = "all";

// Wait for DOM
document.addEventListener("DOMContentLoaded", () => {
  
  // Setup filter buttons
  const filterBtns = document.querySelectorAll(".filter-btn");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active state
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      // Apply filter
      currentFilter = btn.dataset.filter;
      renderLikes(allLikesData);
    });
  });
  
  // Auth check
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await findAndLoadStall(user.uid);
    } else {
      window.location.href = "signup.html";
    }
  });
});

/**
 * Find vendor's stall
 */
async function findAndLoadStall(uid) {
  try {
    const stallsRef = collection(fs, "stalls");
    const q = query(stallsRef, where("vendorId", "==", uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const stallDoc = querySnapshot.docs[0];
      currentStallId = stallDoc.id;
      
      const stallName = stallDoc.data().name;
      const display = document.getElementById("stallNameDisplay");
      if (display) {
        display.textContent = `${stallName} - Customer Likes`;
      }
      
      await loadAllLikes(currentStallId);
    } else {
      const container = document.getElementById("likesContainer");
      if (container) {
        container.innerHTML = "<p class='loading-message'>No stall found.</p>";
      }
    }
  } catch (err) {
    console.error("Error finding stall:", err);
  }
}


async function loadAllLikes(stallId) {
  const container = document.getElementById("likesContainer");
  
  try {
    // Use collectionGroup to query ALL likes subcollections across all users
    const likesQuery = query(
      collectionGroup(fs, "likes"),
      where("stallId", "==", stallId),
      orderBy("likedAt", "desc")
    );
    
    const likesSnapshot = await getDocs(likesQuery);
    
    if (likesSnapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-regular fa-heart" style="font-size: 4rem; color: #ccc;"></i>
          <h3>No likes yet</h3>
          <p>Your menu items haven't been liked by customers yet.</p>
        </div>
      `;
      updateStats(0, 0, 0);
      return;
    }
    
    // Fetch patron details for each like
    const likesWithPatronInfo = [];
    
    for (const likeDoc of likesSnapshot.docs) {
      const likeData = likeDoc.data();
      

      const pathSegments = likeDoc.ref.path.split('/');
      const userId = pathSegments[1]; // users/{userId}/likes/{likeId}
      
      // Fetch patron info
      let patronInfo = {
        name: "Unknown User",
        email: ""
      };
      
      try {
        const userDocRef = doc(fs, "users", userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          patronInfo = {
            name: userData.name || userData.displayName || "Anonymous",
            email: userData.email || ""
          };
        }
      } catch (err) {
        console.warn("Could not fetch user info for:", userId, err);
      }
      
      likesWithPatronInfo.push({
        id: likeDoc.id,
        ...likeData,
        patronName: patronInfo.name,
        patronEmail: patronInfo.email,
        userId: userId
      });
    }
    
    allLikesData = likesWithPatronInfo;
    
    // Calculate stats
    const totalLikes = allLikesData.length;
    const uniquePatrons = new Set(allLikesData.map(l => l.userId)).size;
    const uniqueItems = new Set(allLikesData.map(l => l.itemId)).size;
    
    updateStats(totalLikes, uniquePatrons, uniqueItems);
    renderLikes(allLikesData);
    
  } catch (error) {
    console.error("Error loading likes:", error);
    container.innerHTML = `
      <p style="color: red; text-align: center;">Error loading likes. Please try again.</p>
    `;
  }
}

/**
 * Update statistics display
 */
function updateStats(totalLikes, uniquePatrons, likedItems) {
  const totalEl = document.getElementById("totalLikes");
  const patronsEl = document.getElementById("uniquePatrons");
  const itemsEl = document.getElementById("likedItems");
  
  if (totalEl) totalEl.textContent = totalLikes;
  if (patronsEl) patronsEl.textContent = uniquePatrons;
  if (itemsEl) itemsEl.textContent = likedItems;
}

/**
 * Render likes based on current filter
 */
function renderLikes(likesData) {
  const container = document.getElementById("likesContainer");
  
  // Apply time filter
  const filtered = filterByTime(likesData, currentFilter);
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-heart" style="font-size: 4rem; color: #ccc;"></i>
        <h3>No likes for this period</h3>
        <p>Try selecting a different time range.</p>
      </div>
    `;
    return;
  }
  
  // Group by item for better display
  const groupedByItem = groupLikesByItem(filtered);
  
  let html = "";
  
  for (const [itemId, itemLikes] of Object.entries(groupedByItem)) {
    const firstLike = itemLikes[0];
    const itemName = firstLike.itemName || "Unknown Item";
    const itemImage = firstLike.image || "";
    const itemPrice = firstLike.price || 0;
    
    html += `
      <div class="like-group-card">
        <div class="item-header">
          ${itemImage ? `
            <img src="${itemImage}" alt="${itemName}" class="item-thumb">
          ` : `
            <div class="item-thumb-placeholder">
              <i class="fa-solid fa-utensils"></i>
            </div>
          `}
          <div class="item-info">
            <h3>${itemName}</h3>
            <p class="item-price">$${parseFloat(itemPrice).toFixed(2)}</p>
            <p class="likes-count">
              <i class="fa-solid fa-heart"></i> ${itemLikes.length} ${itemLikes.length === 1 ? 'like' : 'likes'}
            </p>
          </div>
        </div>
        
        <div class="patron-list">
          ${itemLikes.map(like => createPatronLikeCard(like)).join('')}
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

/**
 * Group likes by item
 */
function groupLikesByItem(likes) {
  const grouped = {};
  
  likes.forEach(like => {
    const itemId = like.itemId;
    if (!grouped[itemId]) {
      grouped[itemId] = [];
    }
    grouped[itemId].push(like);
  });
  
  return grouped;
}

/**
 * Create individual patron like card
 */
function createPatronLikeCard(like) {
  const patronName = like.patronName || "Anonymous";
  const patronEmail = like.patronEmail || "";
  const likedAt = like.likedAt ? formatDate(like.likedAt.toDate()) : "Unknown date";
  
  return `
    <div class="patron-like-card">
      <div class="patron-avatar">
        <i class="fa-solid fa-user"></i>
      </div>
      <div class="patron-details">
        <p class="patron-name">${patronName}</p>
        ${patronEmail ? `<p class="patron-email">${patronEmail}</p>` : ''}
        <p class="liked-date">
          <i class="fa-regular fa-clock"></i> ${likedAt}
        </p>
      </div>
      <div class="like-indicator">
        <i class="fa-solid fa-heart"></i>
      </div>
    </div>
  `;
}

/**
 * Filter likes by time period
 */
function filterByTime(likes, filter) {
  if (filter === "all") return likes;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  return likes.filter(like => {
    if (!like.likedAt) return false;
    
    const likeDate = like.likedAt.toDate();
    
    switch(filter) {
      case "today":
        return likeDate >= today;
      
      case "week":
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return likeDate >= weekAgo;
      
      case "month":
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return likeDate >= monthAgo;
      
      default:
        return true;
    }
  });
}

/**
 * Format date for display
 */
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return date.toLocaleDateString('en-SG', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } else if (days > 0) {
    return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  } else if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  } else if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else {
    return 'Just now';
  }
}