import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

/** =============================
 *  CART STORAGE (matches checkout.js)
 *  ============================= */
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

  // Tell other scripts (e.g., ScriptCart.js) to refresh dot
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
    cart.push({
      stallId,
      stallName: stallName || "",
      itemId,
      name,
      price: Number(price) || 0,
      qty: 1,
      image: image || ""
    });
  }

  saveCart(cart);
}

/** =============================
 *  PAGE HELPERS
 *  ============================= */
function getStallIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("stall") || "").trim();
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
   * IMPORTANT:
   * - We keep your existing .add-to-cart click handler (menu.js handles add)
   * - We ALSO add data-add-to-cart attributes so ScriptCart.js can update dot/toast if needed
   * - We add data-skip-scriptcart="1" so ScriptCart.js won't double-add (you'll add 1 small check there)
   */
  div.innerHTML = `
    <div class="image-container">
      ${img ? `<img src="${img}" alt="${name}" class="food-img">` : ""}
    </div>

    <div class="card-body">
      <div class="card-header">
        <h3>${name}</h3>

        <div class="likes-container">
          <img src="img/heart.png" class="heart-icon" alt="like" data-item="${itemId}" />
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
 *  MAIN LOAD
 *  ============================= */
async function loadMenuPage() {
  // Ensure dot is correct on page load
  updateCartDot();

  const stallId = getStallIdFromUrl();

  if (!stallId) {
    document.getElementById("stall-name").textContent = "No stall selected";
    document.getElementById("menu-container").innerHTML =
      `<p>Please open this page like: <b>menus.html?stall=ahseng</b></p>`;
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

  // 3) Add to cart click handler (YOUR existing feature)
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
}

loadMenuPage().catch((err) => {
  console.error(err);
  document.getElementById("menu-container").innerHTML =
    "<p>Something went wrong loading the menu.</p>";
});
