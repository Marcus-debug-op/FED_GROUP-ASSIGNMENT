import { fs, auth } from "./firebase-init.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const stallId = urlParams.get('id');

const titleDisplay = document.getElementById('stall-name-display');
const submitBtn = document.getElementById('submit-btn');
const complaintInput = document.getElementById('complaint-text');
const improvementInput = document.getElementById('improvement-text');
const importBtn = document.getElementById('import-btn');
const realFileInput = document.getElementById('real-file-input');

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
            const stallData = stallSnap.data();
            titleDisplay.innerText = `For: ${stallData.name || "Unknown Stall"}`;
        } else {
            titleDisplay.innerText = "Stall not found";
        }
    } catch (error) {
        console.error(error);
        titleDisplay.innerText = "Error loading stall info";
    }
}

loadStallInfo();

submitBtn.addEventListener('click', async () => {
    const complaintText = complaintInput.value;
    const improvementText = improvementInput.value;

    if (!complaintText.trim()) {
        alert("Please enter a complaint.");
        return;
    }

    submitBtn.innerText = "Submitting...";
    submitBtn.disabled = true;

    try {
        await addDoc(collection(fs, "stalls", stallId, "complaints"), {
            complaint: complaintText,
            improvement: improvementText,
            userId: auth.currentUser ? auth.currentUser.uid : "Anonymous",
            userEmail: auth.currentUser ? auth.currentUser.email : "Anonymous",
            timestamp: serverTimestamp(),
            status: "Pending"
        });

        alert("Complaint submitted successfully!");
        window.location.href = `stalldetails.html?id=${stallId}`;
    } catch (error) {
        console.error(error);
        alert("Failed to submit. Please try again.");
        submitBtn.innerText = "Submit";
        submitBtn.disabled = false;
    }
});

importBtn.addEventListener('click', () => {
    realFileInput.click();
})

realFileInput.addEventListener("change", () => {
  const file = realFileInput.files && realFileInput.files[0];
  if(!file){
    imagePreview.style.display="none";
    imagePreview.src="";
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.style.display="block";
});
