document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const targetStall = params.get('stall');
    const returnLink = params.get('return');


    if (targetStall) {
 
        document.body.setAttribute('data-stall', targetStall);
        

        const headerTitle = document.querySelector('.sub-header h1');
        if (headerTitle) {
            headerTitle.textContent = "Review: " + targetStall;
        }
        
  
        document.title = targetStall + " - Feedback";
    }

  
    if (returnLink) {
        document.body.setAttribute('data-return', returnLink);
        

        const goBackBtn = document.querySelector('.btn-go-back');
        if (goBackBtn) {
            goBackBtn.href = returnLink;

            goBackBtn.removeAttribute('onclick'); 
        }
    }
});