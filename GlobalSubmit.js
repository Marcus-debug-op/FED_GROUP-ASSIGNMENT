document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. GET VARIABLES FROM HTML ---
    // This is where the magic happens. We read the data from the body tag.
    const bodyData = document.body.dataset;
    const stallName = bodyData.stall;      // Reads "Wok Master"
    const returnPage = bodyData.return;    // Reads "WokMasterDetails.html"

    // --- 2. SETUP ELEMENTS ---
    const stars = document.querySelectorAll('.star');
    const starContainer = document.getElementById('star-container');
    const ratingInput = document.getElementById('rating-value');
    const submitBtn = document.querySelector('.btn-submit');
    const closeBtn = document.querySelector('.close-btn') || document.querySelector('.close-modal-btn');
    
    let currentRating = 0;

    // --- 3. STAR LOGIC (Only runs if stars exist on page) ---
    if (stars.length > 0) {
        function highlightStars(value) {
            stars.forEach(star => {
                const starValue = parseInt(star.getAttribute('data-value'));
                if (starValue <= value) {
                    star.classList.add('active');
                } else {
                    star.classList.remove('active');
                }
            });
        }

        stars.forEach(star => {
            star.addEventListener('mouseover', function() {
                highlightStars(this.getAttribute('data-value'));
            });

            star.addEventListener('click', function() {
                currentRating = this.getAttribute('data-value');
                if(ratingInput) ratingInput.value = currentRating; 
                highlightStars(currentRating);
            });
        });

        if (starContainer) {
            starContainer.addEventListener('mouseleave', function() {
                highlightStars(currentRating);
            });
        }
    }

    // --- 4. SUBMIT BUTTON ---
    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault(); 

            // Check if it's a Feedback page (has stars) or Complaint page (text only)
            const isFeedback = document.querySelector('.star') !== null;
            const textArea = document.querySelector('textarea');

            // Validation
            if (isFeedback && (currentRating === 0 || currentRating === "0")) {
                alert("Please select a star rating!");
                return;
            }
            if (!isFeedback && textArea && textArea.value.trim() === "") {
                alert("Please describe your complaint.");
                return;
            }

            // Decide type based on page content
            const type = isFeedback ? 'feedback' : 'complaint';

            // Redirect using the variables we found in Step 1
            // Ensure you have created the universal Success.html from the previous step!
            window.location.href = `Success.html?type=${type}&stall=${encodeURIComponent(stallName)}&return=${returnPage}`;
        });
    }

    // --- 5. CLOSE BUTTON ---
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            // Go back to the specific return page found in Step 1
            window.location.href = returnPage; 
        });
    }
});