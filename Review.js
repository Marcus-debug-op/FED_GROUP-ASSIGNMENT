document.addEventListener('DOMContentLoaded', () => {
    
    const clearBtn = document.getElementById('btn-clear-reviews');

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            
            const isSure = confirm("Are you sure you want to delete ALL reviews? This cannot be undone.");

            if (isSure) {
                
                localStorage.removeItem('hawkerReviews');
                sessionStorage.removeItem('hawkerReviews');

                
                alert("All reviews have been deleted.");
                window.location.reload();
            }
        });
    }
});