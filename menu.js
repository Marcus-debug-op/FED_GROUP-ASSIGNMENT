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
const db =  getFirestore(app);


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

function renderMenuItemCard(itemId, item) {
  // Adjust field names to match what you store in Firestore
  const name = item.name || itemId;
  const desc = item.desc || "";
  const price = money(item.price);
  const img = item.image || ""; // optional

  const div = document.createElement("div");
  div.className = "menu-card";
  div.innerHTML = `
    ${img ? `<img class="menu-card-img" src="${img}" alt="${name}">` : ""}
    <div class="menu-card-body">
      <h3 class="menu-card-title">${name}</h3>
      ${desc ? `<p class="menu-card-desc">${desc}</p>` : ""}
      <div class="menu-card-footer">
        <span class="menu-card-price">${price}</span>
        <button class="btn add-to-cart" data-item="${itemId}">Add</button>
      </div>
    </div>
  `;

  return div;
}

async function loadMenuPage() {
  const stallId = getStallIdFromUrl();

  if (!stallId) {
    document.getElementById("stall-name").textContent = "No stall selected";
    document.getElementById("menu-container").innerHTML =
      `<p>Please open this page like: <b>menu.html?stall=ahseng</b></p>`;
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
    const card = renderMenuItemCard(d.id, d.data());
    container.appendChild(card);
  });

  // 3) Hook “Add” buttons into your existing cart logic
  // If ScriptCart.js expects specific functions, tell me what it uses and I’ll wire it properly.
  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart");
    if (!btn) return;

    const itemId = btn.dataset.item;

    // TODO: call your cart function here
    // Example:
    // addToCart(stallId, itemId);

    console.log("Add to cart:", { stallId, itemId });
  });
}

loadMenuPage().catch((err) => {
  console.error(err);
  document.getElementById("menu-container").innerHTML =
    "<p>Something went wrong loading the menu.</p>";
});