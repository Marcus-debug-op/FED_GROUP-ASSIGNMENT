document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SETUP VARIABLES ---
    const stars = document.querySelectorAll('#star-container .star');
    const starContainer = document.getElementById('star-container');
    const ratingInput = document.getElementById('rating-value');
    const commentInput = document.getElementById('comments');
    const submitBtn = document.querySelector('.btn-submit');
    const closeBtn = document.querySelector('.close-btn');
    
    let currentRating = 0;

    // --- 2. HELPER FUNCTION ---
    function highlightStars(count) {
        stars.forEach((star, index) => {
            // Check if this star's position is less than or equal to the count
            // (index 0 = Star 1, index 1 = Star 2, etc.)
            if (index + 1 <= count) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    // --- 3. STAR INTERACTION ---
    stars.forEach((star, index) => {
        const starValue = index + 1;

        // Hover: Highlight stars up to the one you are hovering
        star.addEventListener('mouseover', function() {
            highlightStars(starValue);
        });

        // Click: Set the rating permanently
        star.addEventListener('click', function() {
            currentRating = starValue;
            ratingInput.value = currentRating;
            highlightStars(currentRating);
        });
    });

    // Mouse Leave: Reset to the last clicked rating
    starContainer.addEventListener('mouseleave', function() {
        highlightStars(currentRating);
    });

    // --- 4. SUBMIT BUTTON ---
    submitBtn.addEventListener('click', function(e) {
        e.preventDefault(); 

        // Validation
        if (ratingInput.value == 0) {
            alert("Please select a star rating before submitting!");
            return;
        }

        // Redirect to your success page
        window.location.href = "AhSengSubmitFeedback.html";
    });

    // --- 5. CLOSE BUTTON ---
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            window.location.href = "AhSengDetails.html"; 
        });
    }
});