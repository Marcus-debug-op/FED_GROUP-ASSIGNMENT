import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

await addDoc(collection(fs, "renewal_requests"), {
  vendorId: user.uid,
  stallId: stallId,
  requestedLeaseEnd: newLeaseEnd,
  currentLeaseEnd: currentLeaseEnd,
  status: "pending",
  createdAt: serverTimestamp()
});

let rentalRef = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location = "sign up.html";
    return;
  }

  const stallsRef = collection(fs, "stalls");
  const q = query(stallsRef, where("vendorId", "==", user.uid));
  const snap = await getDocs(q);

  if (snap.empty) return;

  const stallId = snap.docs[0].id;

  rentalRef = doc(fs, "stalls", stallId, "rental_details", "rental");
  const rentalSnap = await getDoc(rentalRef);

  if (rentalSnap.exists()) {
    const data = rentalSnap.data();

    if (data.leaseEnd?.toDate) {
      document.getElementById("currentLease").textContent =
        data.leaseEnd.toDate().toDateString();
    }
  }
});

document.getElementById("saveRenewal").addEventListener("click", async () => {
  const newDate = document.getElementById("newLeaseEnd").value;
  if (!newDate) return alert("Pick a date");

  const newLeaseEnd = new Date(newDate);

  await updateDoc(rentalRef, {
    leaseEnd: newLeaseEnd
  });

  alert("Lease renewed successfully!");

  window.location = "Vender AccountRentalStatus.html";
});
