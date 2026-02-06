import { fs } from "./firebase-init.js";
import {
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const params = new URLSearchParams(window.location.search);

  const urlStallName = params.get("stall");
  const urlStallId = (params.get("id") || params.get("stallId") || "").trim();
  const urlReturn = params.get("return");

  if (urlStallName) {
    const header = document.querySelector(".sub-header h1");
    if (header) header.textContent = "Review: " + urlStallName;
  }


  const submitBtn = document.querySelector(".btn-submit");
  const ratingInput = document.getElementById("rating-value");
  const textArea = document.querySelector("textarea");
  const imagePreview = document.getElementById("image-preview");
  const stars = document.querySelectorAll(".star");
  const isReviewPage = stars.length > 0;

  if (!submitBtn) return;

  submitBtn.addEventListener("click", async (e) => {
    e.preventDefault();


    if (isReviewPage) {
      const currentRating = ratingInput ? ratingInput.value : 0;
      if (currentRating === "0" || currentRating === 0) {
        alert("Please select a star rating first!");
        return;
      }
    } else if (textArea && textArea.value.trim() === "") {
      alert("Please fill in the text field.");
      return;
    }


    const finalStallName = urlStallName || "General Feedback";
    const finalReturnPage = urlReturn || "browsestalls.html";


    let userName = "Guest Patron";
    const storedUser = localStorage.getItem("hawkerHubCurrentUser");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.fullname) userName = parsedUser.fullname;
      } catch {}
    }

    const todayDisplay = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    let imageData = "";
    if (imagePreview && imagePreview.style.display === "block") {
      imageData = imagePreview.src;
    }

    if (isReviewPage && urlStallId) {
      try {
        const newReviewDoc = {
          stallId: urlStallId,
          stallName: finalStallName,
          user: userName,
          rating: Number(ratingInput ? ratingInput.value : 0),
          text: textArea ? textArea.value : "",
          image: imageData,
          dateDisplay: todayDisplay,
          createdAt: serverTimestamp()
        };

        await addDoc(collection(fs, "stalls", urlStallId, "feedback"), newReviewDoc);

        alert("Thanks! Your review has been submitted.");
        window.location.href = finalReturnPage;
        return;
      } catch (err) {
        console.error(err);
        alert("Failed to submit review. Please try again.");
        return;
      }
    }


    if (isReviewPage && !urlStallId) {
      alert("Error: Missing stall id. Please go back and open the feedback page from a stall.");
      return;
    }


    try {
      const newFeedback = {
        stall: finalStallName,
        user: userName,
        date: todayDisplay,
        rating: isReviewPage ? (ratingInput ? ratingInput.value : "0") : "0",
        text: textArea ? textArea.value : "",
        image: imageData
      };

      let reviews = JSON.parse(localStorage.getItem("hawkerReviews"));
      if (!Array.isArray(reviews)) reviews = [];

      reviews.unshift(newFeedback);
      localStorage.setItem("hawkerReviews", JSON.stringify(reviews));

      alert("Submitted!");
      window.location.href = finalReturnPage;
    } catch (err) {
      console.error(err);
      alert("Submit failed. Please try again.");
    }
  });
});
