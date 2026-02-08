import { fs, auth } from "./firebase-init.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- Helper: Compress Image for Database ---
function fileToCompressedDataUrl(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > h && w > maxSize) { h = Math.round((h * maxSize) / w); w = maxSize; }
        else if (h >= w && h > maxSize) { w = Math.round((w * maxSize) / h); h = maxSize; }
        
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Main Logic ---
const urlParams = new URLSearchParams(window.location.search);
const stallId = urlParams.get('id');

const titleDisplay = document.getElementById('stall-name-display');
const submitBtn = document.getElementById('submit-btn');
const complaintInput = document.getElementById('complaint-text');
const improvementInput = document.getElementById('improvement-text');

// Image Elements
const importBtn = document.getElementById('import-btn');
const realFileInput = document.getElementById('real-file-input');
const previewContainer = document.getElementById('preview-container');
const imagePreview = document.getElementById('image-preview');

// 1. Load Stall Name
async function loadStallInfo() {
    if (!stallId) {
        titleDisplay.innerText = "Error: No Stall Selected";
        submitBtn.disabled = true;
        return;
    }
    try {
        const stallRef = doc(fs, "stalls", stallId);
        const stallSnap = await getDoc(stallRef);
        if (stallSnap.exists()) {
            titleDisplay.innerText = `For: ${stallSnap.data().name}`;
        } else {
            titleDisplay.innerText = "Stall not found";
        }
    } catch (error) {
        console.error(error);
        titleDisplay.innerText = "Error loading stall info";
    }
}
loadStallInfo();

// 2. Handle Image Selection (Click Button -> Click Input)
importBtn.addEventListener('click', () => {
    realFileInput.click();
});

realFileInput.addEventListener("change", () => {
  const file = realFileInput.files && realFileInput.files[0];
  if (!file) {
    // If user cancels selection, clear preview
    previewContainer.classList.remove('show');
    imagePreview.src = "";
    return;
  }
  
  if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
  }

  // Show Preview
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target.result;
    previewContainer.classList.add('show'); // Make box visible
  };
  reader.readAsDataURL(file);
});

// 3. Handle Submit
submitBtn.addEventListener('click', async () => {
    const complaintText = complaintInput.value.trim();
    const improvementText = improvementInput.value.trim();

    if (!complaintText) {
        alert("Please enter a complaint.");
        return;
    }

    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        // Prepare Photo Data
        let photoData = "";
        if (realFileInput.files[0]) {
             photoData = await fileToCompressedDataUrl(realFileInput.files[0]);
        }

        // Save to Firestore
        await addDoc(collection(fs, "stalls", stallId, "complaints"), {
            complaint: complaintText,
            improvement: improvementText,
            photo: photoData, 
            userId: auth.currentUser ? auth.currentUser.uid : "Anonymous",
            userEmail: auth.currentUser ? auth.currentUser.email : "Anonymous",
            timestamp: serverTimestamp(),
            status: "Pending"
        });

        alert("Complaint submitted successfully!");
        window.history.back(); // Go back to stall page

    } catch (error) {
        console.error(error);
        alert("Failed to submit. Please try again.");
        submitBtn.innerText = "Submit";
        submitBtn.disabled = false;
    }
});