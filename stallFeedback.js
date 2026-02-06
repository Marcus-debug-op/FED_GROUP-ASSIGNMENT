import { fs } from "./firebase-init.js";
import { doc, getDoc, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

function getStallId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("stall");
  return id ? id.trim() : null;
}

function createStars(container, rating) {
  if (!container) return;
  container.innerHTML = "";
  const rounded = Math.round(Number(rating || 0));

  for (let i = 1; i <= 5; i++) {
    const star = document.createElement("i");
    star.className = i <= rounded ? "fa-solid fa-star" : "fa-regular fa-star";
    star.style.color = "#f5b301";
    container.appendChild(star);
  }
}

function ratingBucket(rating) {
  const rounded = Math.round(Number(rating || 0));
  return Math.max(1, Math.min(5, rounded));
}

function fmtDate(value) {
  try {
    if (!value) return "";
    if (typeof value === "object" && typeof value.toDate === "function") {
      const d = value.toDate();
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    }
    return "";
  } catch {
    return "";
  }
}

function renderReviews(reviews) {
  const list = document.getElementById("reviewsList");
  if (!list) return;

  list.innerHTML = "";

  for (const r of reviews) {
    const card = document.createElement("div");
    card.className = "review-post dynamic-review";

    const hasPhoto = r.photo && typeof r.photo === "string" && r.photo.trim().length > 0;

    card.innerHTML = `
      <div class="user-meta">
        <div class="user-avatar">
          <img class="avatar-img" />
        </div>

        <div class="user-title">
          <strong>${r.name || "Guest Patron"}</strong>
          <div class="stars-gold-small"></div>
        </div>

        <span class="post-date">${fmtDate(r.createdAt)}</span>
      </div>

      <div class="review-content-row">
        <p class="post-text">${r.comment || ""}</p>

        ${hasPhoto ? `
          <div class="review-photo-wrap">
            <img class="review-photo" src="${r.photo}" alt="Review Photo">
          </div>
        ` : ""}
      </div>
    `;

    list.appendChild(card);

    const avatarImg = card.querySelector(".avatar-img");
    avatarImg.src = (r.avatar && r.avatar.trim()) ? r.avatar : "img/avatars/default.png";
    avatarImg.onerror = () => (avatarImg.src = "img/avatars/default.png");

    createStars(card.querySelector(".stars-gold-small"), r.rating);

    const reviewPhoto = card.querySelector(".review-photo");
    if (reviewPhoto) {
      reviewPhoto.onerror = () => {
        reviewPhoto.closest(".review-photo-wrap")?.remove();
      };
    }
  }
}

function updateStats(reviews) {
  const total = reviews.length;

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  for (const r of reviews) {
    const rating = Number(r.rating || 0);
    if (!isNaN(rating)) sum += rating;

    const bucket = ratingBucket(rating);
    counts[bucket] += 1;
  }

  const avg = total > 0 ? sum / total : 0;

  const avgRatingEl = document.getElementById("avgRating");
  const avgStarsEl = document.getElementById("avgStars");
  const totalEl = document.getElementById("totalReviews");

  if (avgRatingEl) avgRatingEl.textContent = avg.toFixed(1);
  if (totalEl) totalEl.textContent = String(total);

  createStars(avgStarsEl, avg);

  for (let i = 1; i <= 5; i++) {
    const countEl = document.getElementById(`count${i}`);
    const barEl = document.getElementById(`bar${i}`);

    const c = counts[i] || 0;
    if (countEl) countEl.textContent = String(c);

    const pct = total > 0 ? (c / total) * 100 : 0;
    if (barEl) barEl.style.width = `${pct}%`;
  }
}

async function loadStallInfo(stallId) {
  const snap = await getDoc(doc(fs, "stalls", stallId));
  if (!snap.exists()) {
    alert("Stall not found in database");
    return null;
  }

  const s = snap.data();
  const stallDisplayName = s.name || s.displayName || stallId;

  const nameEl = document.getElementById("stallNameText");
  if (nameEl) nameEl.textContent = stallDisplayName;

  const imgEl = document.getElementById("stallHeroImg");
  if (imgEl) imgEl.src = s.heroImage || s.image || "";

  const closeBtn = document.querySelector(".btn-close-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => window.history.back());

  const returnUrl = `stallFeedback.html?id=${encodeURIComponent(stallId)}`;
  const addLink = document.getElementById("addFeedbackLink");
  if (addLink) {
    addLink.href =
      `feedback.html?stall=${encodeURIComponent(stallDisplayName)}` +
      `&id=${encodeURIComponent(stallId)}` +
      `&return=${encodeURIComponent(returnUrl)}`;
  }

  document.title = `${stallDisplayName} - Feedback`;
  return stallDisplayName;
}

async function loadFeedback(stallId) {
  const feedbackRef = collection(fs, "stalls", stallId, "feedback");

  let snaps;
  try {
    snaps = await getDocs(query(feedbackRef, orderBy("createdAt", "desc")));
  } catch (e) {
    console.warn("orderBy(createdAt) failed, fallback to normal getDocs", e);
    snaps = await getDocs(feedbackRef);
  }

  const reviews = [];
  snaps.forEach((d) => reviews.push({ id: d.id, ...d.data() }));

  reviews.sort((a, b) => {
    const at = a.createdAt?.toMillis?.() ?? 0;
    const bt = b.createdAt?.toMillis?.() ?? 0;
    return bt - at;
  });

  renderReviews(reviews);
  updateStats(reviews);
}

async function init() {
  const stallId = getStallId();
  if (!stallId) {
    alert("Error: No stall selected.");
    return;
  }

  await loadStallInfo(stallId);
  await loadFeedback(stallId);
}

init().catch(console.error);
