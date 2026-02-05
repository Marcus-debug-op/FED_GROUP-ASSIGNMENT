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
  return (params.get("stall") || "").trim(); // uses same ?stall=... as your stalldetails
}

async function init() {
  const stallId = getStallId();
  if (!stallId) {
    alert("Missing stall id in URL");
    return;
  }

  // Load stall data from Firestore
  const snap = await getDoc(doc(db, "stalls", stallId));
  if (!snap.exists()) {
    alert("Stall not found");
    return;
  }

  const s = snap.data();
  const stallDisplayName = s.name || s.displayName || stallId;

  // Fill UI
  const nameEl = document.getElementById("stallNameText");
  if (nameEl) nameEl.textContent = stallDisplayName;

  const imgEl = document.getElementById("stallHeroImg");
  if (imgEl) imgEl.src = s.heroImage || "";

  // Make Add Feedback go to feedback.html (submission page)
  // IMPORTANT: keep stall as DISPLAY NAME because your localStorage reviews use stall name string
  const returnUrl = `stallFeedback.html?stall=${encodeURIComponent(stallId)}`;
  const addLink = document.getElementById("addFeedbackLink");
  if (addLink) {
    addLink.href = `feedback.html?stall=${encodeURIComponent(stallDisplayName)}&return=${encodeURIComponent(returnUrl)}`;
  }

  // Also update the page title
  document.title = `${stallDisplayName} - Feedback`;
}

init().catch(console.error);
