document.addEventListener('DOMContentLoaded', function() {
    

    const submitBtn = document.querySelector('.btn-submit');
    

    const textArea = document.querySelector('.main-complaint');

    if (submitBtn) {
        submitBtn.addEventListener('click', function(e) {
            e.preventDefault();


            if (textArea && textArea.value.trim() === "") {
                alert("Please state your complaint before submitting.");
                return; 
            }

            window.location.href = 'WokMasterSubmitComplaint.html';
        });
    }
});