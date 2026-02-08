import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);


function displayStallData(data, stallId) {
    // 1. Basic Info
    document.getElementById("stall-name").textContent = data.name || "Unknown Stall";
    document.getElementById("stall-id").textContent = data.stallNo || ("#" + stallId);

    // 2. Hygiene & Score
    const hygieneGrade = data.hygiene || "C"; 
    const score = data.inspectionScore || 0;
    
    const badge = document.getElementById("hygiene-badge");
    badge.textContent = `🛡️ Hygiene ${hygieneGrade}`;
    document.getElementById("inspection-score").textContent = score;

    // 3. Dates
    document.getElementById("last-inspection").textContent = data.lastInspectionDate || "N/A";
    document.getElementById("next-inspection").textContent = data.nextInspectionDate || "N/A";

    // 4. Strengths
    const strengthsList = document.getElementById("strengths-list");
    strengthsList.innerHTML = ""; 
    if (data.strengths && data.strengths.length > 0) {
      data.strengths.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        strengthsList.appendChild(li);
      });
    } else {
      strengthsList.innerHTML = "<li>No specific strengths recorded.</li>";
    }

    // 5. Remarks
    const remarksList = document.getElementById("remarks-list");
    remarksList.innerHTML = ""; 
    if (data.remarks && data.remarks.length > 0) {
      data.remarks.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;
        remarksList.appendChild(li);
      });
    } else {
      remarksList.innerHTML = "<li>No remarks available.</li>";
    }
}

// Main Logic
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log("Logged in as:", user.email, "(", user.uid, ")");
    document.getElementById("stall-name").textContent = "Finding your stall...";

    try {
      
      const q = query(collection(db, "stalls"), where("vendorId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {

        const stallDoc = querySnapshot.docs[0]; // Take the first match
        console.log("Found stall:", stallDoc.id);
        displayStallData(stallDoc.data(), stallDoc.id);
      } else {
        console.log("No stall found with this vendorId");
        document.getElementById("stall-name").textContent = "No Stall Linked";
        document.getElementById("stall-id").textContent = "Please contact admin to link your account.";
      }

    } catch (error) {
      console.error("Error finding stall:", error);
      document.getElementById("stall-name").textContent = "Error loading data";
    }

  } else {
    // Not logged in
    console.log("User not logged in");
    document.getElementById("stall-name").textContent = "Please Log In";

  }
});