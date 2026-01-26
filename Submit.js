document.addEventListener('DOMContentLoaded', () => {
    // 1. Read the parameters from the URL (e.g., ?type=feedback&stall=Satay%20King)
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const stall = decodeURIComponent(params.get('stall') || 'the stall');
    const returnUrl = params.get('return') || 'browsestalls.html';

    // 2. Select HTML elements to update
    const titleEl = document.getElementById('page-title');
    const textEl = document.getElementById('success-text');
    const returnBtn = document.getElementById('btn-return');

    // 3. Update the text based on whether it is a Complaint or Feedback
    if (type === 'complaint') {
        titleEl.textContent = "Complaint Received";
        textEl.innerHTML = `Your complaint regarding <strong>${stall}</strong> has been submitted. We take this feedback seriously.`;
    } else {
        // Default to feedback message
        titleEl.textContent = "Thank You!";
        textEl.innerHTML = `Your feedback for <strong>${stall}</strong> has been successfully submitted. We appreciate your input!`;
    }

    // 4. Update the "Return to Stall" button link
    if (returnBtn) {
        returnBtn.href = returnUrl;
    }
});