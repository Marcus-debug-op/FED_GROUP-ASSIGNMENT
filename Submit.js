document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const stall = decodeURIComponent(params.get('stall') || 'the stall');
    const returnUrl = params.get('return') || 'browsestalls.html';


    const titleEl = document.getElementById('page-title');
    const textEl = document.getElementById('success-text');
    const returnBtn = document.getElementById('btn-return');


    if (type === 'complaint') {
        titleEl.textContent = "Complaint Received";
        textEl.innerHTML = `Your complaint regarding <strong>${stall}</strong> has been submitted. We take this feedback seriously.`;
    } else {
        // Default to feedback message
        titleEl.textContent = "Thank You!";
        textEl.innerHTML = `Your feedback for <strong>${stall}</strong> has been successfully submitted. We appreciate your input!`;
    }

 
    if (returnBtn) {
        returnBtn.href = returnUrl;
    }
});