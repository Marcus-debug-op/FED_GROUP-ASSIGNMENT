import { fs } from "./firebase-init.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    stallId: (params.get("id") || "").trim(),
    returnUrl: (params.get("return") || "").trim()
  };
}

// Resize + compress image to keep Firestore doc small (recommended)
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

        // JPEG keeps it much smaller than PNG
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
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

  const { stallId, returnUrl } = getParams();

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

    // Optional photo
    let photo = "";
    const file = fileInput?.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Photo must be an image.");
        return;
      }
      // compress to keep Firestore under size limit
      photo = await fileToCompressedDataUrl(file);
    }

    try {
      await addDoc(collection(fs, "stalls", stallId, "feedback"), {
        name,
        comment,
        rating,
        photo, // <-- this is the review photo
        createdAt: serverTimestamp()
      });

      alert("Review posted!");
      if (returnUrl) window.location.href = returnUrl;
      else window.history.back();
    } catch (err) {
      console.error(err);
      alert("Failed to post review. Check console + Firestore rules.");
    }
  });
});
