// SignInPatron.js - Patron Sign In with Auto-Account Creation & Role Isolation
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
const OPPOSITE_ROLES = ["officer", "operator", "vendor"];

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
            
            // STEP 2: Check if user has opposite role
            const hasOtherRole = await checkUserHasOtherRole(user.uid);
            if (hasOtherRole) {
                console.log("ERROR: User has a different role");
                await auth.signOut();
                alert("This email is registered with a different role. Please use the correct portal.");
                setLoading(false);
                return;
            }
            
            // STEP 3: Check if user exists in patrons collection
            const roleDoc = await getDoc(doc(db, "patrons", user.uid));
            if (!roleDoc.exists()) {
                // User exists in Auth but not in Firestore patrons - create entry
                console.log("User authenticated but no Firestore doc - creating patron document");
                await createRoleDocument(user.uid, email);
                isNewAccount = true;
            } else {
                // EXISTING PATRON - This is the normal login path for repeat logins
                console.log("Existing patron logging in - updating last login");
                await setDoc(doc(db, "patrons", user.uid), {
                    lastLogin: serverTimestamp()
                }, { merge: true });
            }
            
        } catch (signInError) {
            console.log("Sign in error:", signInError.code);
            
            // Only create new account if user truly doesn't exist
            if (signInError.code === "auth/user-not-found" || 
                signInError.code === "auth/invalid-credential") {
                
                console.log("User may not exist - attempting account creation");
                
                // Before creating, check if email exists with opposite role
                const emailExistsInOtherRole = await checkEmailInOtherRoles(email);
                if (emailExistsInOtherRole) {
                    alert("This email is already registered with a different role. Each email can only be used for one role.");
                    setLoading(false);
                    return;
                }
                
                // Try to create new account
                try {
                    console.log("Creating new patron account...");
                    userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    await createRoleDocument(user.uid, email);
                    isNewAccount = true;
                    console.log("New patron account created successfully");
                } catch (createError) {
                    console.log("Account creation error:", createError.code);
                    
                    if (createError.code === "auth/email-already-in-use") {
                        alert("Incorrect password. Please try again or use the 'Forgot Password' link.");
                        setLoading(false);
                        return;
                    } else {
                        throw createError;
                    }
                }
            } else if (signInError.code === "auth/wrong-password") {
                console.log("Wrong password - account exists");
                alert("Incorrect password. Please try again or use the 'Forgot Password' link.");
                setLoading(false);
                return;
            } else {
                throw signInError;
            }
        }

        // SUCCESS - User is authenticated
        const user = userCredential.user;
        console.log("Authentication successful for:", user.email);

        // Get patron data
        const patronDoc = await getDoc(doc(db, "patrons", user.uid));
        const patronData = patronDoc.data() || {};

        // Store session data
        localStorage.setItem("hawkerhub_user", JSON.stringify({
            uid: user.uid,
            email: user.email,
            role: ROLE,
            fullname: patronData.fullname || user.displayName || "",
            phone: patronData.phone || "",
            isNewAccount: isNewAccount
        }));

        console.log("Redirecting to patron dashboard...");
        // Redirect to patron dashboard
        window.location.href = "HomeGuest.html"; // Update with your actual patron dashboard page

    } catch (err) {
        console.error("Authentication error:", err);
        alert(prettyFirebaseError(err));
        setLoading(false);
    }
}

async function checkUserHasOtherRole(uid) {
    try {
        // Check if user exists in other role collections
        for (const role of OPPOSITE_ROLES) {
            const roleDoc = await getDoc(doc(db, `${role}s`, uid));
            if (roleDoc.exists()) {
                console.log(`User found in ${role}s collection`);
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error("Error checking user role:", error);
        return false;
    }
}

async function checkEmailInOtherRoles(email) {
    try {
        console.log("Checking if email exists in other roles:", email);

        // Check all other role collections
        for (const role of OPPOSITE_ROLES) {
            const collectionRef = collection(db, `${role}s`);
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
        return false;
    }
}

async function createRoleDocument(uid, email) {
    console.log("Creating patron Firestore documents for UID:", uid);
    
    const accountData = {
        uid: uid,
        email: email,
        role: ROLE,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isActive: true
    };
    
    // Create document in patrons collection
    await setDoc(doc(db, "patrons", uid), accountData);
    
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
            
            // Verify they are a patron
            const hasOtherRole = await checkUserHasOtherRole(user.uid);
            if (hasOtherRole) {
                console.log("User has different role, signing out from patron portal");
                await auth.signOut();
                return;
            }
            
            const patronDoc = await getDoc(doc(db, "patrons", user.uid));
            if (patronDoc.exists()) {
                // Only redirect if not already on the patron page
                if (!window.location.href.includes("HomeGuest.html") && 
                    !window.location.href.includes("SigninPatron.html")) {
                    console.log("Patron authenticated, redirecting to dashboard");
                    window.location.href = "HomeGuest.html";
                }
            }
        } catch (error) {
            console.error("Error in auth state change:", error);
        }
    }
});

export { auth, db };