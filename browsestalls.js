import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
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

document.addEventListener("DOMContentLoaded", async () => {
  const stallGrid = document.getElementById("stallGrid");
  const filterBtn = document.getElementById("filterBtn");
const filterMenu = document.getElementById("filterMenu");

filterBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  filterMenu.classList.toggle("active");
});

// Close menu when clicking outside
document.addEventListener("click", () => {
  filterMenu.classList.remove("active");
});

filterMenu?.addEventListener("click", (e) => {
  e.stopPropagation();
});


  // Your existing controls
  const searchInput = document.querySelector(".search-input");
  const filterSelect = document.querySelector(".filter-select");
  const halalCheck = document.getElementById("halalCheck");
  const vegCheck = document.getElementById("vegCheck");
  const countText = document.querySelector(".count-text");

  // 1) Load stalls
  const stalls = await loadStalls();
  renderStalls(stalls);

  // 2) Filter after render
  filterStalls();

  // Hook filters
  searchInput?.addEventListener("input", filterStalls);
  filterSelect?.addEventListener("change", filterStalls);
  halalCheck?.addEventListener("change", filterStalls);
  vegCheck?.addEventListener("change", filterStalls);

  async function loadStalls() {
    const q = query(collection(db, "stalls"), orderBy("name"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  function renderStalls(list) {
    stallGrid.innerHTML = list
      .map((s) => {
        const cuisine = (s.cuisine || "all").toLowerCase();
        const rating = Number(s.rating);
        const reviews = Number(s.reviews);

        const halal = !!s.halal;
        const vegetarian = !!s.vegetarian;

        // fallback values so page never breaks
        const imageUrl = s.imageURL || "img/placeholder.jpg";
        const shortDesc = s.shortDesc || "";

        return `
          <article class="stall-card"
            data-name="${escapeAttr((s.name || "").toLowerCase())}"
            data-category="${escapeAttr(cuisine)}"
            data-halal="${halal}"
            data-vegetarian="${vegetarian}"
          >
            <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(s.name || "Stall")}" class="stall-img" />
            <div class="stall-body">
              <h3>${escapeHtml(s.name || "Unnamed Stall")}</h3>
              <div class="stall-meta">
                ${escapeHtml(cap(cuisine))}  
            <img src="img/star.png" class="rating-star" alt="rating" >
            ${isFinite(rating) ? rating.toFixed(1) : "—"}

               
              </div>
              <p class="stall-desc">${escapeHtml(shortDesc)}</p>

              <a class="view-btn" href="stalldetails.html?stall=${encodeURIComponent(s.id)}">View</a>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function filterStalls() {
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const selectedCuisine = (filterSelect?.value || "all").toLowerCase();
    const wantHalal = !!halalCheck?.checked;
    const wantVeg = !!vegCheck?.checked;

    const cards = stallGrid.querySelectorAll(".stall-card");
    let visible = 0;

    cards.forEach((card) => {
      const name = card.dataset.name || "";
      const category = card.dataset.category || "";
      const isHalal = card.dataset.halal === "true";
      const isVeg = card.dataset.vegetarian === "true";

      const okSearch = name.includes(searchTerm);
      const okCuisine = selectedCuisine === "all" || category === selectedCuisine;
      const okHalal = !wantHalal || isHalal;
      const okVeg = !wantVeg || isVeg;

      const show = okSearch && okCuisine && okHalal && okVeg;
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });

    if (countText) countText.textContent = `${visible} stalls found`;
  }

  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
  }

  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function escapeAttr(str = "") {
    return escapeHtml(str);
  }
});
