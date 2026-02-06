// SignInOperator.js - Operator Sign In / Sign Up with Firestore Integration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc,
    setDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDo8B0OLtAj-Upfz7yNFeGz4cx3KWLZLuQ",
    authDomain: "hawkerhub-64e2d.firebaseapp.com",
    databaseURL: "https://hawkerhub-64e2d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "hawkerhub-64e2d",
    storageBucket: "hawkerhub-64e2d.firebasestorage.app",
    messagingSenderId: "722888051277",
    appId: "1:722888051277:web:59926d0a54ae0e4fe36a04"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Set persistence to local
setPersistence(auth, browserLocalPersistence);

// State
let isSignUpMode = false;

// DOM Elements
const tabSignUp = document.getElementById("tabSignUp");
const tabSignIn = document.getElementById("tabSignIn");
const signupFields = document.getElementById("signupFields");
const confirmField = document.getElementById("confirmField");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const googleLabel = document.getElementById("googleLabel");

// Input Elements
let fullnameEl, operatorIdEl, centreEl, phoneEl, emailEl, passwordEl, confirmEl;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    // Get input elements
    fullnameEl = document.getElementById("fullname");
    operatorIdEl = document.getElementById("operatorId");
    centreEl = document.getElementById("centre");
    phoneEl = document.getElementById("phone");
    emailEl = document.getElementById("email");
    passwordEl = document.getElementById("password");
    confirmEl = document.getElementById("confirm");

    // Attach toggle handlers
    tabSignUp?.addEventListener("click", () => setMode("signup"));
    tabSignIn?.addEventListener("click", () => setMode("signin"));

    // Attach submit handler
    submitBtn?.addEventListener("click", handleSubmit);

    // Allow Enter key to submit
    passwordEl?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSubmit(e);
    });
    confirmEl?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSubmit(e);
    });
});

/**
 * Toggle between Sign In and Sign Up modes
 */
function setMode(mode) {
    isSignUpMode = mode === "signup";

    // Update tab styles
    if (isSignUpMode) {
        tabSignUp?.classList.remove("inactive");
        tabSignUp?.classList.add("active");
        tabSignIn?.classList.remove("active");
        tabSignIn?.classList.add("inactive");

        // Show sign up fields
        if (signupFields) signupFields.style.display = "block";
        if (confirmField) confirmField.style.display = "block";

        // Update labels
        if (formTitle) formTitle.textContent = "Sign Up";
        if (submitBtn) submitBtn.textContent = "Create Account";
        if (googleLabel) googleLabel.textContent = "Sign up with Google";
    } else {
        tabSignIn?.classList.remove("inactive");
        tabSignIn?.classList.add("active");
        tabSignUp?.classList.remove("active");
        tabSignUp?.classList.add("inactive");

        // Hide sign up fields
        if (signupFields) signupFields.style.display = "none";
        if (confirmField) confirmField.style.display = "none";

        // Update labels
        if (formTitle) formTitle.textContent = "Sign In";
        if (submitBtn) submitBtn.textContent = "Sign In";
        if (googleLabel) googleLabel.textContent = "Sign in with Google";
    }
}

/**
 * Handle form submission (Sign In or Sign Up)
 */
async function handleSubmit(e) {
    e.preventDefault();

    const email = (emailEl?.value || "").trim().toLowerCase();
    const password = passwordEl?.value || "";

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    if (isSignUpMode) {
        await handleSignUp(email, password);
    } else {
        await handleSignIn(email, password);
    }
}

/**
 * Handle Sign In
 */
async function handleSignIn(email, password) {
    setLoading(true);

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Verify operator role in Firestore
        const operatorDoc = await getDoc(doc(db, "operators", user.uid));

        if (!operatorDoc.exists()) {
            const userDoc = await getDoc(doc(db, "users", user.uid));

            if (!userDoc.exists() || userDoc.data().role !== "operator") {
                await auth.signOut();
                alert("This account is not registered as a Hawker Centre Operator.");
                setLoading(false);
                return;
            }
        }

        // Update last login
        await setDoc(doc(db, "operators", user.uid), {
            lastLogin: serverTimestamp()
        }, { merge: true });

        // Store session info
        localStorage.setItem("hawkerhub_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: "operator"
        }));

        // Redirect to Operator Dashboard
        window.location.href = "operator.html";

    } catch (err) {
        console.error("Sign in error:", err);
        alert(prettyFirebaseError(err));
        setLoading(false);
    }
}

/**
 * Handle Sign Up (Account Creation)
 */
async function handleSignUp(email, password) {
    const fullname = fullnameEl?.value.trim() || "";
    const operatorId = operatorIdEl?.value.trim() || "";
    const centre = centreEl?.value.trim() || "";
    const phone = phoneEl?.value.trim() || "";
    const confirm = confirmEl?.value || "";

    // Validation
    if (!fullname || !operatorId || !centre || !phone) {
        alert("Please fill in all fields.");
        return;
    }

    if (password !== confirm) {
        alert("Passwords do not match!");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
    }

    setLoading(true);

    try {
        // Create user with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Update user profile
        await updateProfile(user, { displayName: fullname });

        // Create operator document in Firestore
        const operatorData = {
            uid: user.uid,
            fullname: fullname,
            operatorId: operatorId,
            assignedCentre: centre,
            email: email,
            phone: phone,
            role: "operator",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            isActive: true
        };

        await setDoc(doc(db, "operators", user.uid), operatorData);
        await setDoc(doc(db, "users", user.uid), operatorData);

        // Store session info
        localStorage.setItem("hawkerhub_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: "operator",
            displayName: fullname
        }));

        // Success and redirect
        alert("Operator account created successfully! Welcome to HawkerHub.");
        window.location.href = "operator.html";

    } catch (err) {
        console.error("Account creation error:", err);
        alert(prettyFirebaseError(err));
        setLoading(false);
    }
}

/**
 * Set loading state on submit button
 */
function setLoading(isLoading) {
    if (!submitBtn) return;

    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
    }
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function prettyFirebaseError(err) {
    const code = err?.code || "";

    switch (true) {
        case code.includes("email-already-in-use"):
            return "This email is already registered. Please sign in instead.";
        case code.includes("invalid-credential"):
        case code.includes("wrong-password"):
            return "Incorrect email or password. Please try again.";
        case code.includes("user-not-found"):
            return "No account found with this email. Please sign up first.";
        case code.includes("invalid-email"):
            return "Please enter a valid email address.";
        case code.includes("weak-password"):
            return "Password is too weak. Please use at least 6 characters.";
        case code.includes("user-disabled"):
            return "This account has been disabled. Please contact support.";
        case code.includes("too-many-requests"):
            return "Too many failed attempts. Please try again later.";
        case code.includes("network-request-failed"):
            return "Network error. Please check your internet connection.";
        default:
            return err?.message || "An error occurred. Please try again.";
    }
}

/**
 * Check if operator is already logged in
 */
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const operatorDoc = await getDoc(doc(db, "operators", user.uid));
            const userDoc = await getDoc(doc(db, "users", user.uid));

            const isOperator = operatorDoc.exists() || (userDoc.exists() && userDoc.data().role === "operator");

            if (isOperator) {
                window.location.href = "operator.html";
            }
        } catch (error) {
            console.error("Auth state check error:", error);
        }
    }
});

// Export for use in other modules
export { auth, db };