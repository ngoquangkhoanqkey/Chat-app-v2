// Import the functions you need from the SDKs you need
import {
    initializeApp
} from "firebase/app";

import {
    getAnalytics
} from "firebase/analytics";

import {
    getAuth,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    FacebookAuthProvider,
    GoogleAuthProvider,
    getAdditionalUserInfo,
    // connectAuthEmulator,
} from "firebase/auth";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    // connectFirestoreEmulator,
    query, where, orderBy, limit,
} from "firebase/firestore";


// Web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCaQXqrLQoG07MHixkncQYEGksxPfmCjkc",
    authDomain: "chat-appv2-c1c3b.firebaseapp.com",
    projectId: "chat-appv2-c1c3b",
    storageBucket: "chat-appv2-c1c3b.appspot.com",
    messagingSenderId: "977072387934",
    appId: "1:977072387934:web:109ddedd37df9b0cb541cf",
    measurementId: "G-Z4ZHNQG0LN"
  };


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// Setup:
const auth = getAuth();
const db = getFirestore();
const fb_provider = new FacebookAuthProvider();
const gg_provider = new GoogleAuthProvider();


// Firebase Emulator:
// connectAuthEmulator(auth, "http://localhost:9099");
// connectFirestoreEmulator(db, 'localhost', 8080);


export {
    analytics,
    db,
    auth,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    fb_provider, gg_provider,
    FacebookAuthProvider,
    getAdditionalUserInfo,
    collection,
    doc,
    setDoc,
    addDoc, getDoc, getDocs, updateDoc, deleteDoc,
    onSnapshot,
    serverTimestamp,
    query, where, orderBy, limit,
};