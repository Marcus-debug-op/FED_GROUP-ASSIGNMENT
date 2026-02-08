// SignInOperator.js - Operator Sign In with Auto-Account Creation & Role Isolation
// CORRECTED VERSION - Ensures accounts can sign in repeatedly without issues
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
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
const ROLE = "operator";
const OPPOSITE_ROLE = "officer";

setPersistence(auth, browserLocalPersistence);

const submitBtn = document.getElementById("submitBtn");
let emailEl, passwordEl;

document.addEventListener("DOMContentLoaded", () => {
    emailEl = document.getElementById("email");
    passwordEl = document.getElementById("password");

    submitBtn?.addEventListener("click", handleSubmit);
    passwordEl?.addEventListener("keypress", (e) => {
        if (e.key === "Enter") handleSubmit(e);
    });
});

async function handleSubmit(e) {
    e.preventDefault();
    
    const email = (emailEl?.value || "").trim().toLowerCase();
    const password = passwordEl?.value || "";

    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    if (password.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    setLoading(true);

    try {
        let userCredential;
        let isNewAccount = false;
        
        try {
            // STEP 1: Try to sign in with existing credentials
            console.log("Attempting sign in for:", email);
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Sign in successful for UID:", user.uid);
            
            // STEP 2: Check if user has opposite role (officer trying to sign in as operator)
            const oppositeRoleDoc = await getDoc(doc(db, "officers", user.uid));
            if (oppositeRoleDoc.exists()) {
                console.log("ERROR: User is an officer, not an operator");
                await auth.signOut();
                alert("This email is registered as an Officer. Please use the Officer Portal instead.");
                setLoading(false);
                return;
            }
            
            // STEP 3: Check if user exists in operators collection
            const roleDoc = await getDoc(doc(db, "operators", user.uid));
            if (!roleDoc.exists()) {
                // User exists in Auth but not in Firestore operators - create entry
                console.log("User authenticated but no Firestore doc - creating operator document");
                await createRoleDocument(user.uid, email);
                isNewAccount = true;
            } else {
                // EXISTING OPERATOR - This is the normal login path for repeat logins
                console.log("Existing operator logging in - updating last login");
                await setDoc(doc(db, "operators", user.uid), {
                    lastLogin: serverTimestamp()
                }, { merge: true });
            }
            
        } catch (signInError) {
            console.log("Sign in error:", signInError.code);
            
            // CRITICAL FIX: Only create new account if user truly doesn't exist
            // NOT if they just entered wrong password
            if (signInError.code === "auth/user-not-found" || 
                signInError.code === "auth/invalid-credential") {
                
                // These errors could mean either:
                // 1. User doesn't exist (need to create)
                // 2. User exists but wrong password (should NOT create)
                
                // SOLUTION: Try to create account - Firebase will tell us if email exists
                console.log("User may not exist - attempting account creation");
                
                // Before creating, check if email exists with opposite role
                const emailExistsInOppositeRole = await checkEmailInOppositeRole(email);
                if (emailExistsInOppositeRole) {
                    alert(`This email is already registered as an ${OPPOSITE_ROLE}. Each email can only be used for one role.`);
                    setLoading(false);
                    return;
                }
                
                // Try to create new account
                try {
                    console.log("Creating new operator account...");
                    userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    await createRoleDocument(user.uid, email);
                    isNewAccount = true;
                    console.log("New operator account created successfully");
                } catch (createError) {
                    console.log("Account creation error:", createError.code);
                    
                    if (createError.code === "auth/email-already-in-use") {
                        // Email exists - this means they entered wrong password
                        alert("Incorrect password. Please try again or use the 'Forgot Password' link.");
                        setLoading(false);
                        return;
                    } else {
                        throw createError;
                    }
                }
            } else if (signInError.code === "auth/wrong-password") {
                // Explicit wrong password - do NOT create account
                console.log("Wrong password - account exists");
                alert("Incorrect password. Please try again or use the 'Forgot Password' link.");
                setLoading(false);
                return;
            } else {
                // Some other authentication error - throw it
                throw signInError;
            }
        }

        // SUCCESS - User is authenticated
        const user = userCredential.user;
        console.log("Authentication successful for:", user.email);

        // Store session data
        localStorage.setItem("hawkerhub_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: ROLE,
            isNewAccount: isNewAccount
        }));

        console.log("Redirecting to operator dashboard...");
        // Redirect to operator dashboard
        window.location.href = "operator.html";

    } catch (err) {
        console.error("Authentication error:", err);
        alert(prettyFirebaseError(err));
        setLoading(false);
    }
}

async function checkEmailInOppositeRole(email) {
    try {
        console.log("Checking if email exists in opposite role:", email);
        
        // Query the officers collection for this email
        const officersRef = collection(db, "officers");
        const q = query(officersRef, where("email", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            console.log("Email found in officers collection");
            return true;
        }
        
        // Also check users collection for safety
        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("email", "==", email), where("role", "==", OPPOSITE_ROLE));
        const userSnapshot = await getDocs(userQuery);
        
        const exists = !userSnapshot.empty;
        console.log("Email exists in opposite role:", exists);
        return exists;
    } catch (error) {
        console.error("Error checking opposite role:", error);
        // If query fails, return false to allow continuation (fail open)
        return false;
    }
}

async function createRoleDocument(uid, email) {
    console.log("Creating operator Firestore documents for UID:", uid);
    
    const accountData = {
        uid: uid,
        email: email,
        role: ROLE,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
    };
    
    // Create document in operators collection
    await setDoc(doc(db, "operators", uid), accountData);
    
    // Also create in users collection for unified queries
    await setDoc(doc(db, "users", uid), accountData);
    
    console.log(`Created ${ROLE} account documents in Firestore`);
}

function setLoading(isLoading) {
    if (!submitBtn) return;
    if (isLoading) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.textContent = "Signing In...";
    } else {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.textContent = "Sign In";
    }
}

function prettyFirebaseError(err) {
    const code = err?.code || "";
    const message = err?.message || "";
    
    if (message.includes("Officer Portal") || message.includes("Operator Portal")) {
        return message;
    }
    
    switch (true) {
        case code.includes("invalid-credential"):
        case code.includes("wrong-password"):
            return "Incorrect email or password. Please try again.";
        case code.includes("invalid-email"):
            return "Please enter a valid email address.";
        case code.includes("weak-password"):
            return "Password is too weak. Must be at least 6 characters.";
        case code.includes("email-already-in-use"):
            return "This email is already registered. Please sign in with your password.";
        case code.includes("too-many-requests"):
            return "Too many attempts. Please try again later.";
        case code.includes("network-request-failed"):
            return "Network error. Please check your connection.";
        default:
            return err?.message || "An error occurred. Please try again.";
    }
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            console.log("Auth state changed - user detected:", user.uid);
            
            // Verify they are an operator, not an officer
            const officerDoc = await getDoc(doc(db, "officers", user.uid));
            if (officerDoc.exists()) {
                // Wrong role, sign out
                console.log("User is an officer, signing out from operator portal");
                await auth.signOut();
                return;
            }
            
            const operatorDoc = await getDoc(doc(db, "operators", user.uid));
            if (operatorDoc.exists()) {
                // Only redirect if not already on the operator page
                if (!window.location.href.includes("operator.html") && 
                    !window.location.href.includes("SignInOperator.html")) {
                    console.log("Operator authenticated, redirecting to dashboard");
                    window.location.href = "operator.html";
                }
            }
        } catch (error) {
            console.error("Error in auth state change:", error);
        }
    }
});

export { auth, db };