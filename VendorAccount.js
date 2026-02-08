import { auth, fs } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, query, where, getDocs, addDoc, doc, getDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

console.log("VendorAccount.js loaded");

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. SELECT ELEMENTS
    const menuGrid = document.getElementById("menuGrid");
    const modal = document.getElementById("itemModal");
    const openModalBtn = document.getElementById("openModalBtn");
    
    // Form Elements
    const imagePreview = document.getElementById("imagePreview");
    const fileInput = document.getElementById("fileInput");
    const uploadBox = document.getElementById("uploadBox");
    const addItemForm = document.getElementById("addItemForm");
    const modalTitle = document.querySelector(".modal-header h2");
    const submitBtn = document.querySelector(".add-btn");

    // 2. STATE VARIABLES
    let currentStallId = "";
    let editingItemId = null; // If null, we are adding. If set, we are editing.
    let currentMenuData = {}; // Cache to store item details

    // 3. EVENT DELEGATION (THE FIX FOR CLICKS)

    if (menuGrid) {
        menuGrid.addEventListener("click", (e) => {
            // Check if Edit Button (or icon inside) was clicked
            const editBtn = e.target.closest(".edit-btn");
            if (editBtn) {
                const id = editBtn.getAttribute("data-id");
                openEditModal(id);
                return;
            }

            // Check if Delete Button (or icon inside) was clicked
            const deleteBtn = e.target.closest(".delete-btn");
            if (deleteBtn) {
                const id = deleteBtn.getAttribute("data-id");
                deleteItem(id);
                return;
            }
        });
    }

    // 4. LOGIC: OPEN EDIT MODAL
    function openEditModal(id) {
        const item = currentMenuData[id];
        if (!item) return;

        console.log("Editing item:", item.name);
        editingItemId = id; // Set ID so save logic knows to Update

        // Fill the form
        document.getElementById("itemName").value = item.name;
        document.getElementById("itemPrice").value = item.price;
        document.getElementById("itemDesc").value = item.description || "";

        // Show Preview
        if (item.image) {
            imagePreview.src = item.image;
            imagePreview.style.display = "block";
            // Hide placeholder UI
            if (uploadBox) {
                uploadBox.querySelector(".camera-icon").style.visibility = "hidden";
                uploadBox.querySelector("p").style.visibility = "hidden";
            }
        }

        // Change Text
        if (modalTitle) modalTitle.textContent = "Edit Menu Item";
        if (submitBtn) submitBtn.textContent = "Update Item";

        if (modal) modal.style.display = "flex";
    }

    // 5. LOGIC: DELETE ITEM
    async function deleteItem(id) {
        if (confirm("Are you sure you want to delete this item?")) {
            try {
                const itemRef = doc(fs, "stalls", currentStallId, "menu", id);
                await deleteDoc(itemRef);
                loadMenu(currentStallId); // Refresh grid
            } catch (error) {
                console.error("Error deleting:", error);
                alert("Failed to delete item.");
            }
        }
    }

    // 6. OPEN MODAL (ADD NEW)
    if (openModalBtn) {
        openModalBtn.addEventListener("click", (e) => {
            e.preventDefault();
            resetModal();
            if (modal) modal.style.display = "flex";
        });
    }

    function resetModal() {
        if (addItemForm) addItemForm.reset();
        editingItemId = null; // Switch back to Add mode
        
        if (modalTitle) modalTitle.textContent = "Add New Menu Item";
        if (submitBtn) submitBtn.textContent = "Add Item";
        
        if (imagePreview) {
            imagePreview.src = "";
            imagePreview.style.display = "none";
        }
        if (uploadBox) {
            uploadBox.querySelector(".camera-icon").style.visibility = "visible";
            uploadBox.querySelector("p").style.visibility = "visible";
        }
    }

    // 7. CLOSE MODAL HELPERS
    function closeModal() {
        if (modal) modal.style.display = "none";
        resetModal();
    }
    const closeBtn = document.getElementById("closeModal");
    const cancelBtn = document.getElementById("cancelBtn");
    if (closeBtn) closeBtn.onclick = closeModal;
    if (cancelBtn) cancelBtn.onclick = closeModal;

    // 8. IMAGE PREVIEW
    if (uploadBox && fileInput) {
        uploadBox.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const tempUrl = URL.createObjectURL(file);
                imagePreview.src = tempUrl;
                imagePreview.style.display = "block";
                uploadBox.querySelector(".camera-icon").style.visibility = "hidden";
                uploadBox.querySelector("p").style.visibility = "hidden";
            }
        };
    }

    // 9. AUTH & LOADING
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await findAndLoadStall(user.uid);
        } else {
            window.location.href = "signup.html";
        }
    });

    async function findAndLoadStall(uid) {
        try {
            // Check if there's a selected stall in sessionStorage (from VendorStallDetails.js)
            const selectedStallId = sessionStorage.getItem("selectedStallId");
            const selectedStallName = sessionStorage.getItem("selectedStallName");

            if (selectedStallId) {
                // Load the specific selected stall
                const stallRef = doc(fs, "stalls", selectedStallId);
                const stallSnap = await getDoc(stallRef);
                
                if (stallSnap.exists() && stallSnap.data().vendorId === uid) {
                    currentStallId = selectedStallId;
                    const display = document.getElementById("stallNameDisplay");
                    if (display) display.textContent = selectedStallName || stallSnap.data().name;
                    loadMenu(currentStallId);
                } else {
                    // Selected stall doesn't exist or doesn't belong to this vendor
                    sessionStorage.removeItem("selectedStallId");
                    sessionStorage.removeItem("selectedStallName");
                    await loadFirstStall(uid);
                }
            } else {
                // No selected stall, load the first stall owned by this vendor
                await loadFirstStall(uid);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadFirstStall(uid) {
        try {
            const stallsRef = collection(fs, "stalls");
            const q = query(stallsRef, where("vendorId", "==", uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const stallDoc = querySnapshot.docs[0];
                currentStallId = stallDoc.id;
                const display = document.getElementById("stallNameDisplay");
                if (display) display.textContent = stallDoc.data().name;
                loadMenu(currentStallId);
            } else {
                if (menuGrid) menuGrid.innerHTML = "<p class='loading-message'>No stall found.</p>";
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function loadMenu(stallId) {
        const menuRef = collection(fs, "stalls", stallId, "menu");
        const menuSnap = await getDocs(menuRef);
        let html = "";
        currentMenuData = {}; // Clear cache

        if (menuSnap.empty) {
            if (menuGrid) menuGrid.innerHTML = "<p class='loading-message'>Menu is empty.</p>";
            return;
        }

        menuSnap.forEach((doc) => {
            const item = doc.data();
            const id = doc.id;
            currentMenuData[id] = item; // Store for editing
            const imgSrc = item.image ? item.image : 'img/Ah Seng Chicken Rice.jpg';

            html += `
                <article class="card">
                    <img src="${imgSrc}" alt="${item.name}">
                    <div class="card-body">
                        <div class="card-header">
                            <h3 class="card-title">${item.name}</h3>
                        </div>
                        <p class="card-desc">${item.description || ''}</p>
                        <div class="card-footer">
                            <span class="price">$${parseFloat(item.price).toFixed(2)}</span>
                            
                            <div class="card-actions">
                                <button class="action-btn edit-btn" data-id="${id}" title="Edit">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="action-btn delete-btn" data-id="${id}" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </article>`;
        });
        if (menuGrid) menuGrid.innerHTML = html;
    }

    // 10. SAVE / UPDATE SUBMISSION
    if (addItemForm) {
        addItemForm.onsubmit = async (e) => {
            e.preventDefault();
            if (!currentStallId) return;

            const name = document.getElementById("itemName").value;
            const price = document.getElementById("itemPrice").value;
            const desc = document.getElementById("itemDesc").value;
            
            // Handle Image: If editing and no new image, keep old one
            let finalImage = imagePreview.src;
            if (editingItemId && currentMenuData[editingItemId] && imagePreview.src.startsWith("blob:")) {
                // New local file selected
                finalImage = imagePreview.src; 
            } else if (editingItemId && currentMenuData[editingItemId]) {
                 // Existing item, no new file
                finalImage = currentMenuData[editingItemId].image;
            } else {
                // New Item
                finalImage = imagePreview.src || "";
            }

            const itemData = {
                name: name,
                price: price,
                description: desc,
                image: finalImage
            };

            try {
                if (editingItemId) {
                    // UPDATE
                    const docRef = doc(fs, "stalls", currentStallId, "menu", editingItemId);
                    await updateDoc(docRef, itemData);
                    alert("Updated successfully!");
                } else {
                    // ADD - removed likes field
                    const colRef = collection(fs, "stalls", currentStallId, "menu");
                    await addDoc(colRef, itemData);
                    alert("Added successfully!");
                }
                closeModal();
                loadMenu(currentStallId);
            } catch (err) {
                console.error("Error saving:", err);
            }
        };
    }
});