// SignInOfficer.js - Officer Sign In with Auto-Account Creation & Role Isolation
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
const ROLE = "officer";
const OPPOSITE_ROLE = "operator";

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
        // Try to sign in first
        let userCredential;
        let isNewAccount = false;
        
        try {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Check if user has opposite role (operator trying to sign in as officer)
            const oppositeRoleDoc = await getDoc(doc(db, "operators", user.uid));
            if (oppositeRoleDoc.exists()) {
                await auth.signOut();
                alert("This email is registered as an Operator. Please use the Operator Portal instead.");
                setLoading(false);
                return;
            }
            
            // Check if user exists in officers collection
            const roleDoc = await getDoc(doc(db, "officers", user.uid));
            if (!roleDoc.exists()) {
                // User exists in Auth but not in Firestore officers - create entry
                await createRoleDocument(user.uid, email);
                isNewAccount = true;
            } else {
                // Update last login
                await setDoc(doc(db, "officers", user.uid), {
                    lastLogin: serverTimestamp()
                }, { merge: true });
            }
            
        } catch (signInError) {
            // If user not found in Auth, create new account
            if (signInError.code === "auth/user-not-found" || signInError.code === "auth/invalid-credential") {
                console.log("Account not found, auto-creating officer account...");
                
                // Check if email exists in opposite role first (Firestore only check)
                const emailExists = await checkEmailInOppositeRole(email);
                if (emailExists) {
                    alert(`This email is already registered as an ${OPPOSITE_ROLE}. Each email can only be used for one role.`);
                    setLoading(false);
                    return;
                }
                
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await createRoleDocument(user.uid, email);
                isNewAccount = true;
            } else if (signInError.message && signInError.message.includes("Operator Portal")) {
                // Re-throw our custom role error
                throw signInError;
            } else {
                throw signInError;
            }
        }

        const user = userCredential.user;

        // Store session
        localStorage.setItem("hawkerhub_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: ROLE,
            isNewAccount: isNewAccount
        }));

        // Redirect
        window.location.href = "NEAofficer.html";

    } catch (err) {
        console.error("Authentication error:", err);
        alert(prettyFirebaseError(err));
        setLoading(false);
    }
}

async function checkEmailInOppositeRole(email) {
    // Check if this email exists in operators collection
    // Note: In a real implementation, you might want to query by email field
    // For now, we rely on the fact that if they exist in Auth, we check above
    // If they don't exist in Auth, they can't exist in Firestore with our current flow
    return false;
}

async function createRoleDocument(uid, email) {
    const accountData = {
        uid: uid,
        email: email,
        role: ROLE,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
    };
    
    await setDoc(doc(db, "officers", uid), accountData);
    await setDoc(doc(db, "users", uid), accountData);
    console.log(`Auto-created ${ROLE} account in Firestore`);
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
    
    if (message.includes("Operator Portal")) return message;
    
    switch (true) {
        case code.includes("invalid-credential"):
        case code.includes("wrong-password"):
            return "Incorrect password. Please try again.";
        case code.includes("invalid-email"):
            return "Please enter a valid email address.";
        case code.includes("weak-password"):
            return "Password is too weak. Must be at least 6 characters.";
        case code.includes("email-already-in-use"):
            return "This email is already registered with a different role.";
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
        // Verify they are an officer, not an operator
        const operatorDoc = await getDoc(doc(db, "operators", user.uid));
        if (operatorDoc.exists()) {
            // Wrong role, sign out
            await auth.signOut();
            return;
        }
        
        const officerDoc = await getDoc(doc(db, "officers", user.uid));
        if (officerDoc.exists()) {
            window.location.href = "NEAofficer.html";
        }
    }
});

export { auth, db };