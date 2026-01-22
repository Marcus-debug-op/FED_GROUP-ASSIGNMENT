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