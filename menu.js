import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
  authDomain: "hawkerhub-64e2d.firebaseapp.com",
  databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hawkerhub-64e2d",
  storageBucket: "hawkerhub-64e2d.firebasestorage.app",
  messagingSenderId: "722888051277",
  appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


const menuContainer = document.getElementById('menu-container');

if (menuContainer) {
    
    const stallId = menuContainer.getAttribute('data-stall');
    
    
    if (stallId) {
        
        const menuRef = ref(db, 'menu_items/' + stallId);

        onValue(menuRef, (snapshot) => {
            const data = snapshot.val();
            menuContainer.innerHTML = "";
            
            if (!data) {
                menuContainer.innerHTML = "<p>Menu coming soon!</p>";
                return;
            }

            for (let key in data) {
                const item = data[key];
                
                
                const price = Number(item.price) || 0;

                const cardHTML = `
                <div class="menu-card">
                    <div class="image-container">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="card-body">
                        <div class="card-header">
                            <h3>${item.name}</h3>
                            <div class="likes-container">
                                <span class="heart-icon">♡</span>
                                <span class="likes-count">${item.likes || 0} likes</span>
                            </div>
                        </div>
                        <p class="desc">${item.description || ""}</p>
                        <div class="card-footer">
                            <span class="price">$${price.toFixed(2)}</span>
                            <button class="add-to-cart"
                                data-add-to-cart
                                data-id="${item.id}"
                                data-name="${item.name}"
                                data-price="${price}"
                                data-stall="${item.stall}"
                                data-img="${item.image}">
                                🛒 Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
                `;
                menuContainer.innerHTML += cardHTML;
            }
        });
    } else {
        console.error("Error: This page is missing the data-stall attribute on the menu-container!");
    }
}