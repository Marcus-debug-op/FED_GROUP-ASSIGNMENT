import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
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

/** =============================
 * CART STORAGE (matches checkout.js)
 * ============================= */
const CART_KEY = "hawkerhub_cart";

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));

  // Update dot (if present)
  updateCartDot();

  // Tell other scripts (e.g., ScriptCart.js) to refresh dot and UI
  window.dispatchEvent(new Event("cart-updated"));
}

function updateCartDot() {
  const cart = readCart();
  const hasItems = cart.reduce((sum, i) => sum + (Number(i.qty) || 0), 0) > 0;

  document.querySelectorAll(".cart-dot").forEach(dot => {
    dot.style.display = hasItems ? "inline-block" : "none";
  });
}

function addToCart({ stallId, stallName, itemId, name, price, image }) {
  const cart = readCart();

  // Same item = same stallId + itemId
  const existing = cart.find(i => i.stallId === stallId && i.itemId === itemId);

  if (existing) {
    existing.qty = (Number(existing.qty) || 0) + 1;
  } else {
    // create an id field used by ScriptCart
    const id = `${stallId}__${itemId}`;
    cart.push({
      id,
      stallId,
      stallName: stallName || "",
      itemId,
      name,
      price: Number(price) || 0,
      qty: 1,
      img: image || ""
    });
  }

  saveCart(cart);
}

/** =============================
 * PAGE HELPERS
 * ============================= */
function getStallIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  // --- THE FIX: Check for 'id' OR 'stall' ---
  return (params.get("id") || params.get("stall") || "").trim();
}

function money(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return "$0.00";
  return `$${num.toFixed(2)}`;
}

function setHero(stallData) {
  document.title = `${stallData.name || "Menu"} - Menu`;

  document.getElementById("stall-name").textContent = stallData.name || "Unknown Stall";
  document.getElementById("stall-location").textContent = `📍 ${stallData.location || "-"}`;

  const rating = stallData.rating ?? "-";
  const reviews = stallData.reviews ?? "-";
  document.getElementById("stall-rating").textContent = `★ ${rating} (${reviews} reviews)`;

  // Optional: set banner background from Firestore
  if (stallData.heroImage) {
    const hero = document.getElementById("hero");
    hero.style.backgroundImage = `url('${stallData.heroImage}')`;
    hero.style.backgroundPosition = "center";
    hero.style.backgroundSize = "cover";
  }
}

function renderMenuItemCard(stallId, stallName, itemId, item) {
  const name = item.name || itemId;
  const desc = item.desc || "";
  const priceNumber = Number(item.price) || 0;
  const priceText = money(priceNumber);
  const img = item.image || "";
  const likes = item.likes ?? 0;

  const div = document.createElement("div");
  div.className = "menu-card";

  /**
   * We add:
   * - data-add-to-cart attributes (ScriptCart listens for these)
   * - data-skip-scriptcart="1" so ScriptCart won't double-add (menu.js handles the add)
   * - the data-id used by ScriptCart for cart item id
   */
  div.innerHTML = `
    <div class="image-container">
      ${img ? `<img src="${img}" alt="${name}" class="food-img">` : ""}
    </div>

    <div class="card-body">
      <div class="card-header">
        <h3>${name}</h3>

        <div class="likes-container">
          <img src="img/heart.png" class="heart-icon" alt="like" data-item="${itemId}" data-stall="${stallId}" />
          <span>${likes}</span>
        </div>
      </div>

      ${desc ? `<p>${desc}</p>` : ""}

      <div class="card-footer">
        <span class="price">${priceText}</span>

        <button
          class="add-to-cart"
          type="button"

          data-item="${itemId}"
          data-name="${encodeURIComponent(name)}"
          data-price="${priceNumber}"
          data-image="${encodeURIComponent(img)}"

          data-add-to-cart
          data-id="${encodeURIComponent(`${stallId}__${itemId}`)}"
          data-stall="${encodeURIComponent(stallName || "")}"
          data-img="${encodeURIComponent(img)}"
          data-qty="1"
          data-skip-scriptcart="1"
        >
          Add to cart
        </button>
      </div>
    </div>
  `;

  return div;
}

/** =============================
 * MAIN LOAD
 * ============================= */
async function loadMenuPage() {
  // Ensure dot is correct on page load
  updateCartDot();

  const stallId = getStallIdFromUrl();

  if (!stallId) {
    document.getElementById("stall-name").textContent = "No stall selected";
    document.getElementById("menu-container").innerHTML =
      `<p>Please open this page like: <b>menus.html?id=ahseng</b></p>`;
    return;
  }

  // 1) Load stall details
  const stallRef = doc(db, "stalls", stallId);
  const stallSnap = await getDoc(stallRef);

  if (!stallSnap.exists()) {
    document.getElementById("stall-name").textContent = "Stall not found";
    document.getElementById("menu-container").innerHTML =
      `<p>No such stall: <b>${stallId}</b></p>`;
    return;
  }

  const stallData = stallSnap.data();
  setHero(stallData);

  // 2) Load menu items from subcollection
  const menuCol = collection(db, "stalls", stallId, "menu");
  const menuSnap = await getDocs(menuCol);

  const container = document.getElementById("menu-container");
  container.innerHTML = "";

  if (menuSnap.empty) {
    container.innerHTML = "<p>No menu items yet.</p>";
    return;
  }

  menuSnap.forEach((d) => {
    const card = renderMenuItemCard(stallId, stallData.name || "", d.id, d.data());
    container.appendChild(card);
  });

  // 3) Add to cart click handler (menu.js handles add)
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart");
    if (!btn) return;

    const itemId = btn.dataset.item;
    const name = decodeURIComponent(btn.dataset.name || "");
    const price = Number(btn.dataset.price) || 0;
    const image = decodeURIComponent(btn.dataset.image || "");

    addToCart({
      stallId,
      stallName: stallData.name || "",
      itemId,
      name,
      price,
      image
    });

    // Optional feedback (no feature removed)
    btn.textContent = "Added!";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "Add to cart";
      btn.disabled = false;
    }, 800);
  });
  
  // After menu is loaded, update heart icons
  updateHeartIcons();
}

loadMenuPage().catch((err) => {
  console.error(err);
  document.getElementById("menu-container").innerHTML =
    "<p>Something went wrong loading the menu.</p>";
});

/** =============================
 * LIKES FUNCTIONALITY
 * ============================= */

// Store user's likes in memory for quick UI updates
const userLikesCache = new Set();
let currentUserForLikes = null;

// Track auth state for likes
onAuthStateChanged(auth, (user) => {
  currentUserForLikes = user;
  
  if (user) {
    // Load existing likes for this user
    loadUserLikes();
  }
});

// Load user's existing likes
async function loadUserLikes() {
  if (!currentUserForLikes) return;
  
  try {
    const likesRef = collection(db, "users", currentUserForLikes.uid, "likes");
    const snapshot = await getDocs(likesRef);
    
    userLikesCache.clear();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.itemId && data.stallId) {
        userLikesCache.add(`${data.stallId}__${data.itemId}`);
      }
    });
    
    // Update heart icons on the page
    updateHeartIcons();
  } catch (error) {
    console.error("Error loading user likes:", error);
  }
}

// Update all heart icons based on cache
function updateHeartIcons() {
  document.querySelectorAll(".heart-icon").forEach((heart) => {
    const itemId = heart.dataset.item;
    const stallId = heart.dataset.stall || getStallIdFromUrl();
    const likeKey = `${stallId}__${itemId}`;
    
    if (userLikesCache.has(likeKey)) {
      heart.src = "img/heart-filled.png";
      heart.classList.add("liked");
    } else {
      heart.src = "img/heart.png";
      heart.classList.remove("liked");
    }
  });
}

// Handle heart icon clicks
document.addEventListener("click", async (e) => {
  const heart = e.target.closest(".heart-icon");
  if (!heart) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Check if user is logged in
  if (!currentUserForLikes) {
    alert("Please log in to like items");
    window.location.href = "signup.html";
    return;
  }
  
  const itemId = heart.dataset.item;
  const card = heart.closest(".menu-card");
  
  if (!card) return;
  
  // Get item details from the card
  const btn = card.querySelector(".add-to-cart");
  const stallId = heart.dataset.stall || getStallIdFromUrl();
  const itemName = decodeURIComponent(btn.dataset.name || "");
  const price = Number(btn.dataset.price) || 0;
  const image = decodeURIComponent(btn.dataset.image || "");
  const stallName = decodeURIComponent(btn.dataset.stall || "");
  
  if (!stallId || !itemId) {
    console.error("Missing stallId or itemId");
    return;
  }
  
  const likeKey = `${stallId}__${itemId}`;
  const isLiked = userLikesCache.has(likeKey);
  
  try {
    if (isLiked) {
      // Unlike
      await unlikeItem(stallId, itemId);
      userLikesCache.delete(likeKey);
      heart.src = "img/heart.png";
      heart.classList.remove("liked");
    } else {
      // Like
      await likeItem({
        stallId,
        stallName,
        itemId,
        itemName,
        price,
        image
      });
      userLikesCache.add(likeKey);
      heart.src = "img/heart-filled.png";
      heart.classList.add("liked");
      
      // Optional: show brief feedback
      showLikeFeedback(heart);
    }
  } catch (error) {
    console.error("Error toggling like:", error);
    alert("Error updating like. Please try again.");
  }
});

// Save like to Firestore
async function likeItem(data) {
  if (!currentUserForLikes) return;
  
  const { stallId, stallName, itemId, itemName, price, image } = data;
  
  // Use stallId__itemId as the document ID for easy lookup
  const likeId = `${stallId}__${itemId}`;
  const likeRef = doc(db, "users", currentUserForLikes.uid, "likes", likeId);
  
  await setDoc(likeRef, {
    stallId,
    stallName,
    itemId,
    itemName,
    price,
    image,
    likedAt: serverTimestamp()
  });
}

// Remove like from Firestore
async function unlikeItem(stallId, itemId) {
  if (!currentUserForLikes) return;
  
  const likeId = `${stallId}__${itemId}`;
  const likeRef = doc(db, "users", currentUserForLikes.uid, "likes", likeId);
  
  await deleteDoc(likeRef);
}

// Show brief animation when liking
function showLikeFeedback(heart) {
  heart.style.transform = "scale(1.3)";
  setTimeout(() => {
    heart.style.transform = "scale(1)";
  }, 200);
}