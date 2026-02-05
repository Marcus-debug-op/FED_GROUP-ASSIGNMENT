import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
  doc, getDoc,
  collection, query, where, getDocs,
  updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const listEl = document.getElementById("adminList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "sign up.html";
    return;
  }

  // Check admin role in users/{uid}
  const userDoc = await getDoc(doc(fs, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : null;

  if (role !== "admin") {
    listEl.innerHTML = `<div class="muted">Access denied: admin only.</div>`;
    return;
  }

  await loadPending();
});

async function loadPending() {
  listEl.innerHTML = `<div class="muted">Loading pending requests...</div>`;

  const q = query(
    collection(fs, "renewal_requests"),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    listEl.innerHTML = `<div class="muted">No pending requests.</div>`;
    return;
  }

  listEl.innerHTML = snap.docs.map((d) => {
    const r = d.data();
    const reqEnd = r.requestedLeaseEnd?.toDate ? formatDate(r.requestedLeaseEnd.toDate()) : "—";
    const curEnd = r.currentLeaseEnd?.toDate ? formatDate(r.currentLeaseEnd.toDate()) : "—";

    return `
      <div class="req-card" data-id="${d.id}">
        <div class="req-row">
          <div><b>Stall:</b> ${escapeHtml(r.stallId || "—")}</div>
          <div><b>Vendor:</b> ${escapeHtml(r.vendorId || "—")}</div>
        </div>
        <div class="req-row">
          <div><b>Current End:</b> ${curEnd}</div>
          <div><b>Requested End:</b> ${reqEnd}</div>
        </div>
        <div class="req-actions">
          <button class="btn-ghost" data-reject="${d.id}">Reject</button>
          <button class="btn-primary" data-approve="${d.id}">Approve</button>
        </div>
      </div>
    `;
  }).join("");

  // bind actions
  listEl.querySelectorAll("[data-approve]").forEach((btn) => {
    btn.addEventListener("click", () => approve(btn.dataset.approve));
  });
  listEl.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => reject(btn.dataset.reject));
  });
}

async function approve(requestId) {
  const user = auth.currentUser;
  if (!user) return;

  const reqRef = doc(fs, "renewal_requests", requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) return;

  const r = reqSnap.data();
  if (!r.stallId || !r.requestedLeaseEnd) return alert("Bad request data.");

  // Update leaseEnd (admin only)
  const rentalRef = doc(fs, "stalls", r.stallId, "rental_details", "rental");
  await updateDoc(rentalRef, {
    leaseEnd: r.requestedLeaseEnd,
    updatedAt: serverTimestamp()
  });

  // Mark request approved
  await updateDoc(reqRef, {
    status: "approved",
    decidedAt: serverTimestamp(),
    decidedBy: user.uid
  });

  await loadPending();
}

async function reject(requestId) {
  const user = auth.currentUser;
  if (!user) return;

  const reqRef = doc(fs, "renewal_requests", requestId);
  await updateDoc(reqRef, {
    status: "rejected",
    decidedAt: serverTimestamp(),
    decidedBy: user.uid
  });

  await loadPending();
}

function formatDate(d) {
  return d.toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
