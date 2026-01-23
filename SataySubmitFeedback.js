document.addEventListener('DOMContentLoaded', function() {
    

    const submitBtn = document.querySelector('.btn-submit');
    

    const textArea = document.getElementById('comments') || document.querySelector('textarea');

    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {

            e.preventDefault();


            if (textArea && textArea.value.trim() === "") {
                alert("Please enter your feedback before submitting.");
                return; 
            }


            window.location.href = 'SataySubmitFeedback.html';
        });
    }
});