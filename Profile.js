const discounts = [
    { 
        code: 'FIRSTORDER', 
        title: 'First Order Discount', 
        offer: '35% Off. No Limits!', 
        expiry: 'No Deadline' 
    },
    { 
        code: 'HAWKER20', 
        title: 'Support Local Hawkers', 
        offer: '$5 off orders above $10', 
        expiry: '15 Mar 2026' 
    },
    { 
        code: 'FREESHIP', 
        title: 'Free Delivery', 
        offer: 'Free Delivery on all orders', 
        expiry: '31 Jan 2026' 
    },
    { 
        code: 'WEEKDAY80', 
        title: 'Weekday Special', 
        offer: '15% Off', 
        expiry: '31 Dec 2026' 
    }
];

function loadDiscounts() {
    const container = document.getElementById('discount-container');
    
    container.innerHTML = discounts.map(d => `
        <div class="voucher-card">
            <div class="vc-details">
                <span class="tag-badge">
                    ${d.code} <i class="fa-solid fa-tag"></i>
                </span>
                <h3>${d.title}</h3>
                <p class="offer">${d.offer}</p>
            </div>
            <div class="vc-actions">
                <span class="status-active">Active</span>
                <button class="redeem-btn">Redeem</button>
                <span class="validity">Valid until <strong>${d.expiry}</strong></span>
            </div>
        </div>
    `).join('');
}

// Run the function when the page loads
document.addEventListener('DOMContentLoaded', loadDiscounts);

document.addEventListener("DOMContentLoaded", () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("hawkerHubCurrentUser"));
  } catch {}

  // Not logged in → kick to sign in
  if (!user) {
    alert("Please sign in to view your profile.");
    window.location.href = "sign up.html";
    return;
  }

  // Fill user info placeholders
  const name = user.fullname || "User";
  const email = user.email || "-";
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileEmail").textContent = email;

  const pillName = document.getElementById("pillName");
  if (pillName) pillName.textContent = name;

  // Role-based sections
  document.querySelectorAll("[data-role]").forEach((el) => {
    const allowed = el.getAttribute("data-role");
    el.style.display = (allowed === "all" || allowed === user.role) ? "" : "none";
  });

  // Rename vendor/patron wording
  const roleSubtitle = document.getElementById("roleSubtitle");
  if (roleSubtitle) {
    if (user.role === "vendor") {
      roleSubtitle.textContent = "Stall Owner Account – manage stall & orders";
    } else {
      roleSubtitle.textContent = "Customer Account – view orders & cart";
    }
  }

  // Logout button
  const logoutBtn = document.querySelector(".logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (confirm("Sign out?")) {
        localStorage.removeItem("hawkerHubCurrentUser");
        window.location.href = "Home Guest.html";
      }
    });
  }
});
