document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. SETUP VARIABLES ---
    const stars = document.querySelectorAll('.star');
    const starContainer = document.getElementById('star-container');
    const ratingInput = document.getElementById('rating-value');
    const commentInput = document.getElementById('comments');
    const submitBtn = document.querySelector('.btn-submit');
    const closeBtn = document.querySelector('.close-btn');
    
    let currentRating = 0;




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
            const hoverValue = this.getAttribute('data-value');
            highlightStars(hoverValue);
        });

        star.addEventListener('click', function() {
            currentRating = this.getAttribute('data-value');
            ratingInput.value = currentRating; 
            highlightStars(currentRating);
        });
    });


    starContainer.addEventListener('mouseleave', function() {
        highlightStars(currentRating);
    });



    submitBtn.addEventListener('click', function(e) {

        e.preventDefault(); 


        const finalRating = ratingInput.value;
        const finalComment = commentInput.value;


        if (finalRating === "0" || finalRating === 0) {
            alert("Please select a star rating before submitting!");
            return;
        }


        window.location.href = "SataySubmitFeedback.html";
    });


    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            window.location.href = "stalldetails.html"; 
        });
    }

});