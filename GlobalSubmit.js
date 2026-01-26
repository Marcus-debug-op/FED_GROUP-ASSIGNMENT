document.addEventListener('DOMContentLoaded', () => {

    // --- 1. READ URL DATA ---
    const params = new URLSearchParams(window.location.search);
    const urlStall = params.get('stall'); 
    const urlReturn = params.get('return');

    if (urlStall) {
        const header = document.querySelector('.sub-header h1');
        if (header) header.textContent = "Review: " + urlStall;
    }

    // --- 2. SETUP ELEMENTS ---
    const submitBtn = document.querySelector('.btn-submit');
    const ratingInput = document.getElementById('rating-value');
    const textArea = document.querySelector('textarea');
    const imagePreview = document.getElementById('image-preview'); 
    const stars = document.querySelectorAll('.star');
    const isReviewPage = stars.length > 0; 

    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault(); 

            // --- 3. VALIDATION ---
            if (isReviewPage) {
                const currentRating = ratingInput ? ratingInput.value : 0;
                if (currentRating === "0" || currentRating === 0) {
                    alert("Please select a star rating first!");
                    return; 
                }
            } else if (textArea && textArea.value.trim() === "") {
                alert("Please fill in the text field.");
                return;
            }

            // --- 4. PREPARE SAVE DATA ---
            const finalStallName = urlStall || "General Feedback";
            const finalReturnPage = urlReturn || "browsestalls.html";

            if (isReviewPage) {
                // Get User Info
                let userName = "Guest Patron";
                const storedUser = localStorage.getItem('hawkerHubCurrentUser');
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        if (parsedUser.fullname) userName = parsedUser.fullname;
                    } catch (err) {}
                }

                const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

                let imageData = "";
                if (imagePreview && imagePreview.style.display === 'block') {
                    imageData = imagePreview.src;
                }

                const newReview = {
                    stall: finalStallName,
                    user: userName,
                    date: today,
                    rating: ratingInput.value,
                    text: textArea ? textArea.value : "",
                    image: imageData
                };

                // --- 5. ROBUST SAVING (The Fix) ---
                try {
                    let reviews = JSON.parse(localStorage.getItem('hawkerReviews'));
                    
                    
                    if (!Array.isArray(reviews)) {
                        console.log("Data corrupted or empty. Resetting review list.");
                        reviews = [];
                    }

                    reviews.unshift(newReview); 
                    localStorage.setItem('hawkerReviews', JSON.stringify(reviews));
                    
                } catch (err) {
                    console.error("Save error:", err);
                    localStorage.setItem('hawkerReviews', "[]");
                }
            }

            // --- 6. REDIRECT ---
            const type = isReviewPage ? 'feedback' : 'complaint';
            const successUrl = `Success.html?type=${type}&stall=${encodeURIComponent(finalStallName)}&return=${encodeURIComponent(finalReturnPage)}`;
            
            console.log("Saved and Redirecting to:", successUrl);
            window.location.href = successUrl;
        });
    }

    // --- 7. STAR CLICK LOGIC ---
    if (isReviewPage) {
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const val = this.getAttribute('data-value');
                if(ratingInput) ratingInput.value = val;
                
                stars.forEach(s => {
                    s.classList.remove('active');
                    if(s.getAttribute('data-value') <= val) s.classList.add('active');
                });
            });
        });
    }
});