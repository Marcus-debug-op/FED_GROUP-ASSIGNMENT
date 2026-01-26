document.addEventListener('DOMContentLoaded', () => {

    const fileInput = document.getElementById('real-file-input');
    const importBtn = document.getElementById('import-btn');
    const closeBtn = document.querySelector('.close-modal-btn'); 
    
    const previewImg = document.getElementById('image-preview');
    const defaultHeader = document.getElementById('default-header');

    if (importBtn && fileInput) {
        importBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            fileInput.click();
        });
    }

   
    if (fileInput) {
        fileInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (defaultHeader) defaultHeader.style.display = 'none';
                    if (previewImg) {
                        previewImg.src = e.target.result;
                        previewImg.style.display = 'block';
                    }
                }
                reader.readAsDataURL(file);
            }
        });
    }

    
    if (closeBtn) {
        
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        newCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation(); 

            
            if (previewImg && previewImg.style.display === 'block') {
                
                previewImg.src = '';
                previewImg.style.display = 'none';
                if (defaultHeader) defaultHeader.style.display = 'block'; 
                if (fileInput) fileInput.value = ''; 
                return; 
            }

            const confirmClose = confirm("Are you sure you want to close this form? Your changes will be lost.");
            
            if (confirmClose) {

                const bodyData = document.body.dataset;
                const returnPage = bodyData.return || 'index.html';
                window.location.href = returnPage;
            }
        });
    }
});