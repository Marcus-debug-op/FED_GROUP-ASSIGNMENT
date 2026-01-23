document.addEventListener('DOMContentLoaded', function() {
    // Select inputs and elements
    const searchInput = document.querySelector('.search-input');
    const filterSelect = document.querySelector('.filter-select');
    
    // Select the new filter elements
    const filterBtn = document.getElementById('filterBtn');
    const filterMenu = document.getElementById('filterMenu');
    const halalCheck = document.getElementById('halalCheck');
    const vegCheck = document.getElementById('vegCheck');

    const stallCards = document.querySelectorAll('.stall-card');
    const countText = document.querySelector('.count-text');

    // 1. Logic to Toggle the Filter Menu
    if (filterBtn && filterMenu) {
        filterBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Stops click from bubbling to document
            filterMenu.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!filterMenu.contains(e.target) && !filterBtn.contains(e.target)) {
                filterMenu.classList.remove('active');
            }
        });

        // Prevent menu from closing when clicking inside it
        filterMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // 2. Main Filter Function
    function filterStalls() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedCuisine = filterSelect.value.toLowerCase();
        const isHalalChecked = halalCheck.checked;
        const isVegChecked = vegCheck.checked;
        
        let visibleCount = 0;

        stallCards.forEach(card => {

            const nameElement = card.querySelector('h3');
            const stallName = nameElement ? nameElement.textContent.toLowerCase() : '';
            

            const category = card.dataset.category; 
            const isHalal = card.dataset.halal === 'true';
            const isVeg = card.dataset.vegetarian === 'true';


            const matchesSearch = stallName.includes(searchTerm);
            

            const matchesCuisine = selectedCuisine === 'all' || category === selectedCuisine;

            const matchesHalal = !isHalalChecked || isHalal;


            const matchesVeg = !isVegChecked || isVeg;

            if (matchesSearch && matchesCuisine && matchesHalal && matchesVeg) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (countText) {
            countText.textContent = visibleCount + ' stalls found';
        }
    }

    if (searchInput) searchInput.addEventListener('input', filterStalls);
    if (filterSelect) filterSelect.addEventListener('change', filterStalls);
    if (halalCheck) halalCheck.addEventListener('change', filterStalls);
    if (vegCheck) vegCheck.addEventListener('change', filterStalls);
});