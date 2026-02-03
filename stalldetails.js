import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

function getStallId() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("stall")).trim();
}

async function loadDetails() {
  const stallId = getStallId();
  if (!stallId) {
    document.getElementById("stall-name").textContent = "No stall selected";
    return;
  }

  const snap = await getDoc(doc(db, "stalls", stallId));
  if (!snap.exists()) {
    document.getElementById("stall-name").textContent = "Stall not found";
    return;
  }

  const s = snap.data();

  // Title
  document.title = `${s.displayName || "Stall"} - Details`;
  document.getElementById("stall-name").textContent = s.name || stallId;

  document.getElementById("stall-id-display").textContent = s.stallNo || ("#" + stallId.toUpperCase());

  // Image
  document.getElementById("stall-img").src = s.heroImage || "";
  document.getElementById("stall-img").alt = s.displayName || stallId;

  // Badge
  const badge = document.getElementById("stall-badge");
  if (s.badge) {
    badge.style.display = "block";
    badge.textContent = s.badge;
  }

  // Hygiene + cuisine
  document.getElementById("stall-hygiene").textContent = s.hygiene ? `Hygiene ${s.hygiene}` : "";
  document.getElementById("stall-cuisine").textContent = s.cuisine || "";

  // Rating
  const ratingText =
    (s.rating != null && s.reviews != null)
      ? `${s.rating} (${s.reviews} reviews)`
      : (s.rating != null ? `${s.rating}` : "");
  document.getElementById("stall-rating").textContent = ratingText;

  // Description
  document.getElementById("stall-desc").textContent = s.description || "";

  // Grid buttons
  document.getElementById("stall-location").textContent = s.location || "-";
  document.getElementById("stall-hours").textContent = s.hours || "-";
  document.getElementById("stall-price").textContent = s.priceRange || "-";
  document.getElementById("stall-phone").textContent = s.phone || "-";

  // Links
  document.getElementById("menu-link").href = `menus.html?stall=${encodeURIComponent(stallId)}`;

  // Optional: if you have per-stall feedback pages, set them here.
  // Otherwise, you can point all to the same feedback page and filter by stallId later.
  document.getElementById("feedback-link").href = `feedback.html?stall=${encodeURIComponent(stallId)}`;
}

loadDetails().catch(console.error);
