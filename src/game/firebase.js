import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
// Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration
const firebaseConfig = {
    apiKey: "AIzaSyCgMs04YcNpLATUWQr3LvnPJSocFcRexxs",
    authDomain: "minerrankdb.firebaseapp.com",
    projectId: "minerrankdb",
    storageBucket: "minerrankdb.firebasestorage.app",
    messagingSenderId: "282477991184",
    appId: "1:282477991184:web:fbf004e1c3b6cfb5230195"
};

// Initialize Firebase
// We wrap this in a try-catch or check to avoid crashing if config is invalid
let db;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase 관련 오류", e);
}

export { db };
