document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('return');
    const type = params.get('type');
    const stall = decodeURIComponent(params.get('stall') || 'the stall');

    
    const titleEl = document.getElementById('page-title');
    const textEl = document.getElementById('success-text');
    const btnEl = document.querySelector('.btn-home'); 

    
    if (type === 'feedback' && stall) {
        if (textEl) textEl.textContent = `Your review for ${stall} has been posted!`;
    }

    
    if (returnUrl && btnEl) {
        btnEl.href = returnUrl;
        btnEl.textContent = "Return to Stall"; 
    }
});