
function loadReviews() {
    const stallNameEl = document.querySelector('.stall-name');
    if (!stallNameEl) return;

    const currentStallName = stallNameEl.textContent.trim();
    const reviewsList = document.querySelector('.reviews-list');


    const existingDynamic = document.querySelectorAll('.dynamic-review');
    existingDynamic.forEach(el => el.remove());


    const storedReviews = JSON.parse(localStorage.getItem('hawkerReviews')) || [];
    const stallReviews = storedReviews.filter(review => review.stall === currentStallName);


    stallReviews.forEach(review => {
        const rating = parseInt(review.rating);
        const filledStars = '★'.repeat(rating);
        
        const reviewCard = document.createElement('div');

        reviewCard.className = 'review-post dynamic-review';

        let imageHtml = '';
        if (review.image) {
            imageHtml = `<div class="review-image-container"><img src="${review.image}" class="review-img"></div>`;
        }

        reviewCard.innerHTML = `
            <div class="user-meta">
    
                <div class="user-title">
                    <strong>${review.user}</strong>
                    <div class="stars-gold-small">${filledStars}</div>
                </div>
                <span class="post-date">${review.date}</span>
            </div>
            <p class="post-text">${review.text}</p>
            ${imageHtml}
        `;


        reviewsList.prepend(reviewCard);
    });
}


document.addEventListener('DOMContentLoaded', loadReviews);


window.addEventListener('pageshow', loadReviews);