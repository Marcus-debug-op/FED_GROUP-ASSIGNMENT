import { fs } from "./firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    stallId: (params.get("id") || "").trim(),
    returnUrl: (params.get("return") || "").trim()
  };
}

function fileToCompressedDataUrl(file, maxSize = 700, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxSize) {
          h = Math.round((h * maxSize) / w);
          w = maxSize;
        } else if (h >= w && h > maxSize) {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const submitBtn = document.querySelector(".btn-submit");
  const closeBtn = document.querySelector(".close-modal-btn");
  const nameInput = document.getElementById("reviewer-name");
  const ratingHidden = document.getElementById("rating-value");
  const commentBox = document.querySelector(".main-complaint");
  const fileInput = document.getElementById("real-file-input");
  const stars = document.querySelectorAll(".star");

  const { stallId, returnUrl } = getParams();

  if (stars.length > 0) {
    stars.forEach(star => {
      star.addEventListener("click", () => {
        const val = parseInt(star.getAttribute("data-value"));
        if (ratingHidden) ratingHidden.value = val;
        updateStars(val);
      });
    });
  }

  function updateStars(rating) {
    stars.forEach(star => {
      const starVal = parseInt(star.getAttribute("data-value"));
      star.classList.toggle("active", starVal <= rating);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (returnUrl) window.location.href = returnUrl;
      else window.history.back();
    });
  }

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async () => {
    const typedName = (nameInput?.value || "").trim();
    const name = typedName || "Anonymous";
    const comment = (commentBox?.value || "").trim();
    const rating = Number(ratingHidden?.value || 0);

    if (!stallId) {
      alert("Missing stall id. Please go back and try again.");
      return;
    }
    if (!comment) {
      alert("Please write your review.");
      return;
    }
    if (!rating || rating < 1 || rating > 5) {
      alert("Please select a rating (1–5 stars).");
      return;
    }

    let photo = "";
    const file = fileInput?.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Photo must be an image.");
        return;
      }
      photo = await fileToCompressedDataUrl(file);
    }

    try {
      // 1. Save the new review
      await addDoc(collection(fs, "stalls", stallId, "feedback"), {
        name,
        comment,
        rating,
        photo,
        createdAt: serverTimestamp()
      });

      // 2. Calculate New Average
      const feedbackCol = collection(fs, "stalls", stallId, "feedback");
      const snapshot = await getDocs(feedbackCol);

      let totalRating = 0;
      let reviewCount = 0;

      snapshot.forEach((doc) => {
        const r = doc.data().rating;
        if (r) {
          totalRating += Number(r);
          reviewCount++;
        }
      });

      // --- THE FIX IS HERE ---
      // We calculate the raw average, then fix it to 1 decimal place (e.g. "3.9")
      // Number(...) turns the string "3.9" back into the number 3.9
      const rawAverage = reviewCount > 0 ? totalRating / reviewCount : 0;
      const averageRating = Number(rawAverage.toFixed(1)); 

      // 3. Update the main stall document with the CLEAN number
      const stallRef = doc(fs, "stalls", stallId);
      await updateDoc(stallRef, {
        rating: averageRating,
        reviews: reviewCount
      });

      alert("Review posted!");
      if (returnUrl) window.location.href = returnUrl;
      else window.history.back();

    } catch (err) {
      console.error(err);
      alert("Failed to post review. Check console.");
    }
  });
});