document.addEventListener('DOMContentLoaded', () => {
    const finishBtn = document.getElementById('finishBtn');
    
    // File Upload Preview Logic
    const stallImageInput = document.getElementById('stallImage');
    const fileNameDisplay = document.getElementById('fileName');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');

    stallImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            
            // Create a preview
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreviewContainer.style.display = 'block';
            }
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.textContent = "No file chosen";
            imagePreviewContainer.style.display = 'none';
        }
    });

    // Complete Registration Logic
    finishBtn.addEventListener('click', () => {
        const stallName = document.getElementById('stallName').value;
        const location = document.getElementById('location').value;
        const unitNumber = document.getElementById('unitNumber').value;
        const cuisine = document.getElementById('cuisine').value;
        const description = document.getElementById('description').value;
        const hours = document.getElementById('hours').value;

        // Simple validation
        if (!stallName || !location || !cuisine) {
            alert("Please fill in the required fields (Name, Location, Cuisine).");
            return;
        }

        // 1. Retrieve the User Info from the previous page
        // (Assuming you saved it in localStorage in CreateAccVendor.js)
        const tempUserJson = localStorage.getItem('tempVendorUser');
        let finalVendorData = {};

        if (tempUserJson) {
            finalVendorData = JSON.parse(tempUserJson);
        }

        // 2. Add the Stall Details to the object
        finalVendorData.stallName = stallName;
        finalVendorData.location = location;
        finalVendorData.unitNumber = unitNumber;
        finalVendorData.cuisine = cuisine;
        finalVendorData.description = description;
        finalVendorData.hours = hours;
        
        // Note: We aren't saving the actual image file to localStorage here
        // as it might be too large, but in a real app, you'd send this to a server.
        
        // 3. Save Final Data (Simulating a database save)
        localStorage.setItem('hawkerHubVendor', JSON.stringify(finalVendorData));
        
        // 4. Cleanup temp data
        localStorage.removeItem('tempVendorUser');

        alert("Registration Complete! Welcome to HawkerHub.");
        
        // 5. Redirect to Vendor Dashboard or Home
        // window.location.href = "VendorDashboard.html"; 
        console.log("Saved Vendor Data:", finalVendorData);
    });
});