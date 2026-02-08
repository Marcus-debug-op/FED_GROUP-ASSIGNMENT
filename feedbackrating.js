
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. STAR RATING VISUALS ---
    const starContainer = document.getElementById("star-container");
    const ratingInput = document.getElementById("rating-value");
    
    if (starContainer && ratingInput) {
        let currentRating = 0;

        // Generate 5 text stars
        for (let i = 1; i <= 5; i++) {
            const btn = document.createElement("button");
            btn.type = "button"; 
            btn.className = "rating-star";
            btn.innerHTML = "&#9733;"; // The text star character
            
            // Click: Set value
            btn.addEventListener("click", () => {
                currentRating = i;
                ratingInput.value = i;
                updateStarVisuals(i);
            });

            // Hover: Show preview
            btn.addEventListener("mouseenter", () => updateStarVisuals(i));
            
            starContainer.appendChild(btn);
        }

        // Mouse leave: Reset to selected value
        starContainer.addEventListener("mouseleave", () => updateStarVisuals(currentRating));

        function updateStarVisuals(value) {
            const stars = starContainer.querySelectorAll(".rating-star");
            stars.forEach((star, index) => {
                // Add 'active' class if the star index is less than the value
                star.classList.toggle("active", index < value);
            });
        }
    }


    // --- 2. PHOTO PREVIEW VISUALS ---
    const fileIn = document.getElementById('real-file-input');
    const importBtn = document.getElementById('import-btn');
    const previewWrapper = document.getElementById('photo-preview-wrapper');
    const previewImg = document.getElementById('image-preview');
    const removeBtn = document.getElementById('remove-photo-btn');

    if(importBtn && fileIn && previewWrapper && previewImg) {
        // Click "Add Photo" -> Click hidden input
        importBtn.addEventListener('click', () => fileIn.click());

        // File selected -> Show preview box
        fileIn.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewImg.src = ev.target.result;
                    previewWrapper.classList.add('show'); // CSS makes it visible
                };
                reader.readAsDataURL(file);
            }
        });

        
        if(removeBtn) {
            removeBtn.addEventListener('click', () => {
                fileIn.value = ""; // Clear the input
                previewWrapper.classList.remove('show'); // Hide box
            });
        }
    }
});