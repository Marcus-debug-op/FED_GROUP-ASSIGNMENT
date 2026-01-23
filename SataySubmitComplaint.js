document.addEventListener('DOMContentLoaded', function() {
    
    // Select the Submit Button
    const submitBtn = document.querySelector('.btn-submit');
    
    // Select the main complaint textarea
    // We look for the class .main-complaint based on your CSS
    const textArea = document.querySelector('.main-complaint');

    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();

            // Validate that the field isn't empty
            if (textArea && textArea.value.trim() === "") {
                alert("Please state your complaint before submitting.");
                return; 
            }

            // Redirect to the confirmation page
            window.location.href = 'SataySubmitComplaint.html';
        });
    }
});