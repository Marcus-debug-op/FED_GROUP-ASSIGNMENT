// CreateAccPatron.js - Patron Account Creation with Auto-Account & Role Isolation
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    updateProfile,                                  
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
const ROLE = "patron";
const OPPOSITE_ROLES = ["officer", "operator", "vendor"]; // All other roles

setPersistence(auth, browserLocalPersistence);

document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.querySelector(".submit-btn");
    if (!submitBtn) {
        console.error("Submit button not found!");
        return;
    }

    submitBtn.addEventListener("click", handleCreateAccount);
});

async function handleCreateAccount(e) {
    e.preventDefault();
    console.log("Create account button clicked");

    const fullname = document.getElementById("fullname")?.value.trim();
    const email = document.getElementById("email")?.value.trim().toLowerCase();
    const phone = document.getElementById("phone")?.value.trim();
    const password = document.getElementById("password")?.value;
    const confirm = document.getElementById("confirm")?.value;

    // Validation
    if (!fullname) {
        alert("Please enter your full name.");
        return;
    }

    if (!email) {
        alert("Please enter your email address.");
        return;
    }

    if (!phone) {
        alert("Please enter your phone number.");
        return;
    }

    if (!password) {
        alert("Please enter a password.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    if (!confirm) {
        alert("Please confirm your password.");
        return;
    }

    if (password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    setLoading(true);

    try {
        console.log("Creating patron account for:", email);

        // Check if email exists with a different role
        const emailExistsInOtherRole = await checkEmailInOtherRoles(email);
        if (emailExistsInOtherRole) {
            alert("This email is already registered with a different role. Each email can only be used for one role.");
            setLoading(false);
            return;
        }

        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Auth account created, UID:", user.uid);

        // Update user profile with display name
        await updateProfile(user, { displayName: fullname });
        console.log("Profile updated with display name");

        // Create Firestore document
        await createPatronDocument(user.uid, fullname, email, phone);
        console.log("Firestore documents created");

        // Store session data
        localStorage.setItem("hawkerhub_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            fullname: fullname,
            phone: phone,
            role: ROLE
        }));

        alert("Patron Account Created Successfully!");
        console.log("Redirecting to patron sign-in page...");
        
        // Redirect to patron dashboard or sign-in page
        window.location.href = "signinpatron.html";

    } catch (err) {
        console.error("Account creation error:", err);
        alert(prettyFirebaseError(err));
        setLoading(false);
    }
}

async function checkEmailInOtherRoles(email) {
    try {
        console.log("Checking if email exists in other roles:", email);

        // Check all other role collections
        for (const role of OPPOSITE_ROLES) {
            const collectionRef = collection(db, `${role}s`); // officers, operators, vendors
            const q = query(collectionRef, where("email", "==", email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                console.log(`Email found in ${role}s collection`);
                return true;
            }
        }

        // Also check users collection
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", email));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            if (userData.role !== ROLE) {
                console.log(`Email found in users collection with role: ${userData.role}`);
                return true;
            }
        }

        console.log("Email not found in other roles");
        return false;
    } catch (error) {
        console.error("Error checking other roles:", error);
        // Fail open - allow account creation if check fails
        return false;
    }
}

async function createPatronDocument(uid, fullname, email, phone) {
    const accountData = {
        uid: uid,
        fullname: fullname,
        email: email,
        phone: phone,
        role: ROLE,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
    };

    // Create document in patrons collection
    await setDoc(doc(db, "patrons", uid), accountData);
    
    // Also create in users collection for unified queries
    await setDoc(doc(db, "users", uid), accountData);
    
    console.log("Created patron account documents in Firestore");
}

function setLoading(isLoading) {
    const submitBtn = document.querySelector(".submit-btn");
    if (!submitBtn) return;

    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.6";
        submitBtn.textContent = "Creating...";
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.textContent = "Create";
    }
}

function prettyFirebaseError(err) {
    const code = err?.code || "";
    const message = err?.message || "";

    switch (true) {
        case code.includes("email-already-in-use"):
            return "This email is already registered. Please sign in instead.";
        case code.includes("invalid-email"):
            return "Please enter a valid email address.";
        case code.includes("weak-password"):
            return "Password is too weak. Must be at least 6 characters.";
        case code.includes("too-many-requests"):
            return "Too many attempts. Please try again later.";
        case code.includes("network-request-failed"):
            return "Network error. Please check your connection.";
        default:
            return err?.message || "Account creation failed. Please try again.";
    }
}

export { auth, db };