// home-guest.js — Trending section loads from Firestore (no hardcoding)
// Trending = highest popularity (likes/orders/reviews), then rating as tie-break.
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
  databaseURL:
    "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
  const trendingGrid = document.getElementById("trendingGrid");
  if (!trendingGrid) return;

  try {
    const stalls = await loadStallsSameAsBrowse();
    const trending = getTopTrendingByPopularity(stalls, 3);
    renderTrending(trendingGrid, trending);
    wireTrendingClicks(trendingGrid);
  } catch (err) {
    console.error("Home trending failed to load:", err);
    trendingGrid.innerHTML = `<p style="padding:12px;">Unable to load trending stalls right now.</p>`;
  }
});

async function loadStallsSameAsBrowse() {
  // Same style as your browsestalls.js: load all stalls ordered by name
  const q = query(collection(db, "stalls"), orderBy("name"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/*Trending = "most popular"*/

function getPopularityScore(stall) {
  const likesCount = toNumber(stall.likesCount);
  if (Number.isFinite(likesCount)) return likesCount;

  const totalLikes = toNumber(stall.totalLikes);
  if (Number.isFinite(totalLikes)) return totalLikes;

  const ordersCount = toNumber(stall.ordersCount);
  if (Number.isFinite(ordersCount)) return ordersCount;

  const popularity = toNumber(stall.popularity);
  if (Number.isFinite(popularity)) return popularity;

  // fallback if you don't have a popularity field yet
  const reviews = toNumber(stall.reviews);
  if (Number.isFinite(reviews)) return reviews;

  return 0;
}

function getTopTrendingByPopularity(stalls, n) {
  return [...stalls]
    .sort((a, b) => {
      // 1) popularity desc
      const ap = getPopularityScore(a);
      const bp = getPopularityScore(b);
      if (bp !== ap) return bp - ap;

      // 2) rating desc (tie-break)
      const ar = toNumber(a.rating);
      const br = toNumber(b.rating);
      if (Number.isFinite(br) && Number.isFinite(ar) && br !== ar) return br - ar;

      // 3) reviews desc (final tie-break)
      const av = toNumber(a.reviews);
      const bv = toNumber(b.reviews);
      if (Number.isFinite(bv) && Number.isFinite(av) && bv !== av) return bv - av;

      return 0;
    })
    .slice(0, n);
}

function renderTrending(container, list) {
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `<p style="padding:12px;">No trending stalls found.</p>`;
    return;
  }

  container.innerHTML = list
    .map((s) => {
      const name = s.name || "Unnamed Stall";
      const cuisine = (s.cuisine || "Food").toString();

      const rating = toNumber(s.rating);
      const reviews = toNumber(s.reviews);
      const pop = getPopularityScore(s);

      const imageUrl = s.imageURL || "img/placeholder.jpg";
      const desc = s.shortDesc || "";

      const ratingText = Number.isFinite(rating) ? rating.toFixed(1) : "—";
      const reviewsText =
        Number.isFinite(reviews) && reviews > 0 ? `${reviews} reviews` : "reviews";

      // show popularity number too (optional)
      const popText = `${pop} popular`;

      const starsHTML = ` <img src="img/star.png" class="rating-star" alt="rating star"> ${ratingText} `;


      return `
        <article class="food-card">
          <img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(name)}" class="food-img" />
          <div class="food-body">
            <div class="food-title">${escapeHtml(name)}</div>
            <div class="food-meta">
              ${escapeHtml(cuisine)} ${starsHTML} (${escapeHtml(reviewsText)}) • ${escapeHtml(popText)}
            </div>
            <p class="food-desc">${escapeHtml(desc)}</p>
            <button
              class="food-btn"
              type="button"
              data-href="stalldetails.html?stall=${encodeURIComponent(s.id)}">
              View
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function wireTrendingClicks(container) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest?.(".food-btn");
    if (!btn) return;
    const href = btn.getAttribute("data-href");
    if (href) window.location.href = href;
  });
}

function toNumber(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : NaN;
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
