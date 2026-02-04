import { auth, fs } from "./firebase-init.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".grid");
  const addBtn = document.querySelector(".plus-btn");

  // Modal elements
  const modal = document.getElementById("menuModal");
  const backdrop = modal?.querySelector(".modal-backdrop");
  const closeBtn = document.getElementById("closeMenuModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const form = document.getElementById("menuForm");

  const idEl = document.getElementById("itemId");
  const nameEl = document.getElementById("itemName");
  const descEl = document.getElementById("itemDesc");
  const priceEl = document.getElementById("itemPrice");
  const imgEl = document.getElementById("itemImg"); // if you removed this input, set imgEl null & keep code (it guards)
  const likesEl = document.getElementById("itemLikes");
  const titleEl = document.getElementById("menuModalTitle");

  if (!grid || !addBtn || !modal || !form) return;

  let items = [];
  let currentUid = null;

  // ---------- Loading UI ----------
  const setLoading = (msg = "Loading...") => {
    grid.innerHTML = `
      <div style="width:100%; padding:18px; border-radius:14px; background:#fff; border:1px solid rgba(0,0,0,.08);">
        <div style="font-weight:800; margin-bottom:6px;">${escapeHtml(msg)}</div>
        <div style="color:#666; font-size:14px;">Please wait…</div>
      </div>
    `;
  };

  const setError = (msg) => {
    grid.innerHTML = `
      <div style="width:100%; padding:18px; border-radius:14px; background:#fff; border:1px solid rgba(0,0,0,.08);">
        <div style="font-weight:800; margin-bottom:6px;">Couldn’t load menu</div>
        <div style="color:#666; font-size:14px;">${escapeHtml(msg)}</div>
      </div>
    `;
  };

  // ---------- Auth gate ----------
  setLoading("Checking account...");
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setError("You must be signed in to manage menu items.");
      addBtn.disabled = true;
      return;
    }

    currentUid = user.uid;
    addBtn.disabled = false;

    try {
      // ✅ 1) Seed Firestore once if empty
      await seedFirestoreIfEmpty({ uid: currentUid, grid });

      // ✅ 2) Load Firestore items
      await loadFromFirestore();
    } catch (err) {
      console.error(err);
      setError("Check Firestore rules and your internet connection.");
    }
  });

  // ---------- Firestore ----------
  function menuColRef() {
    return collection(fs, "vendors", currentUid, "menuItems");
  }

  async function loadFromFirestore() {
    setLoading("Loading menu...");
    const q = query(menuColRef(), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderGrid(grid, items);
  }

  // ---------- UI actions ----------
  addBtn.addEventListener("click", () => openModalForCreate());

  grid.addEventListener("click", (e) => {
    const editIcon = e.target.closest(".edit-icon");
    if (!editIcon) return;

    const card = e.target.closest(".card");
    const itemId = card?.dataset?.id;
    if (!itemId) return;

    const item = items.find((x) => x.id === itemId);
    if (!item) return;

    openModalForEdit(item);
  });

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close === "true") closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
  });

  deleteBtn?.addEventListener("click", async () => {
    const id = idEl.value;
    if (!id) return;

    const ok = confirm("Delete this menu item?");
    if (!ok) return;

    try {
      setModalBusy(true);
      await deleteDoc(doc(fs, "vendors", currentUid, "menuItems", id));
      closeModal();
      await loadFromFirestore();
    } catch (err) {
      console.error(err);
      alert("Delete failed. Check Firestore rules.");
    } finally {
      setModalBusy(false);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = idEl.value || cryptoId();
    const payload = {
      name: (nameEl.value || "").trim(),
      desc: (descEl.value || "").trim(),
      price: parseFloat(priceEl.value || "0"),
      img: imgEl ? (imgEl.value || "").trim() : "",
      likes: parseInt(likesEl.value || "0", 10) || 0,
      updatedAt: serverTimestamp(),
    };

    if (!payload.name || !payload.desc || Number.isNaN(payload.price)) {
      alert("Please fill in name, description, and a valid price.");
      return;
    }

    try {
      setModalBusy(true);

      // If it’s new, set createdAt too (only once)
      const isNew = !idEl.value;
      const fullPayload = isNew
        ? { ...payload, createdAt: serverTimestamp() }
        : payload;

      await setDoc(doc(fs, "vendors", currentUid, "menuItems", id), fullPayload, { merge: true });

      closeModal();
      await loadFromFirestore();
    } catch (err) {
      console.error(err);
      alert("Save failed. Check Firestore rules.");
    } finally {
      setModalBusy(false);
    }
  });

  // ---------- Modal helpers ----------
  function openModalForCreate() {
    titleEl.textContent = "Add menu item";
    idEl.value = "";
    nameEl.value = "";
    descEl.value = "";
    priceEl.value = "";
    if (imgEl) imgEl.value = "";
    likesEl.value = "";
    deleteBtn.classList.add("hidden");
    openModal();
  }

  function openModalForEdit(item) {
    titleEl.textContent = "Edit menu item";
    idEl.value = item.id;
    nameEl.value = item.name ?? "";
    descEl.value = item.desc ?? "";
    priceEl.value = String(item.price ?? "");
    if (imgEl) imgEl.value = item.img ?? "";
    likesEl.value = String(item.likes ?? 0);
    deleteBtn.classList.remove("hidden");
    openModal();
  }

  function openModal() {
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    setTimeout(() => nameEl.focus(), 0);
  }

  function closeModal() {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("no-scroll");
    form.reset();
    idEl.value = "";
    setModalBusy(false);
  }

  function setModalBusy(isBusy) {
    const controls = form.querySelectorAll("button, input, textarea");
    controls.forEach((el) => {
      if (el.id === "closeMenuModalBtn") return;
      el.disabled = !!isBusy;
    });
  }

  // ---------- Seeding (hardcoded HTML -> Firestore) ----------
  async function seedFirestoreIfEmpty({ uid, grid }) {
    // Check if firestore has any docs
    const q = query(collection(fs, "vendors", uid, "menuItems"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return; // already seeded

    // Read hardcoded cards that exist in the HTML right now
    const hardcoded = seedFromHtmlCards(grid);
    if (!hardcoded.length) return; // nothing to seed

    setLoading("Migrating hardcoded menu to Firestore...");

    // Write them all to Firestore
    for (const item of hardcoded) {
      const id = cryptoId();
      await setDoc(doc(fs, "vendors", uid, "menuItems", id), {
        name: item.name,
        desc: item.desc,
        price: item.price,
        img: item.img,
        likes: item.likes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }
});

// ----- Extract hardcoded cards -----
function seedFromHtmlCards(grid) {
  const cards = [...grid.querySelectorAll(".card")];
  return cards.map((card) => {
    const img = card.querySelector("img")?.getAttribute("src") || "";
    const title = card.querySelector(".card-title")?.textContent?.trim() || "Untitled";
    const desc = card.querySelector("p")?.textContent?.trim() || "";
    const priceText = card.querySelector(".price")?.textContent?.trim() || "$0.00";
    const price = parseFloat(priceText.replace("$", "")) || 0;

    const likesText = card.querySelector(".likes-stack span")?.textContent || "0";
    const likes = parseLikes(likesText);

    return { name: title, desc, price, img, likes };
  });
}

function renderGrid(grid, items) {
  if (!items.length) {
    grid.innerHTML = `
      <div style="width:100%; padding:18px; border-radius:14px; background:#fff; border:1px solid rgba(0,0,0,.08);">
        <div style="font-weight:800; margin-bottom:6px;">No items yet</div>
        <div style="color:#666; font-size:14px;">Click the + button to add your first menu item.</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map((item) => {
    const safeImg = item.img || "img/placeholder.jpg";
    const price = formatPrice(item.price);
    const likes = formatLikes(item.likes);

    return `
      <article class="card" data-id="${escapeHtml(item.id)}">
        <img src="${escapeAttr(safeImg)}" alt="${escapeAttr(item.name)}">
        <div class="card-body">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(item.name)}</h3>
            <div class="likes-stack">
              <div class="heart-icon">♡</div>
              <span style="font-size: 12px; font-weight: 700;">${likes} likes</span>
            </div>
          </div>
          <p style="color:#666; font-size:14px;">${escapeHtml(item.desc)}</p>
          <div class="card-footer">
            <span class="price">${price}</span>
            <div class="edit-icon" title="Edit">✎</div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// ----- Utilities -----
function cryptoId() {
  return "itm_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

function formatPrice(n) {
  const val = Number(n);
  const safe = Number.isFinite(val) ? val : 0;
  return "$" + safe.toFixed(2);
}

function parseLikes(text) {
  const t = (text || "").toLowerCase();
  if (t.includes("k")) {
    const num = parseFloat(t);
    return Number.isFinite(num) ? Math.round(num * 1000) : 0;
  }
  const num = parseInt(t.replace(/\D/g, ""), 10);
  return Number.isFinite(num) ? num : 0;
}

function formatLikes(n) {
  const val = Number(n) || 0;
  if (val >= 1000) return (val / 1000).toFixed(val % 1000 === 0 ? 0 : 1) + "k";
  return String(val);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str) {
  return escapeHtml(str).replaceAll("`", "&#096;");
}
