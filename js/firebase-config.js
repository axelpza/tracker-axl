// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDokleWa9zxrE5q-GIb5uUceo4BRY-UF58",
    authDomain: "tracker-finanzas-b85ec.firebaseapp.com",
    projectId: "tracker-finanzas-b85ec",
    storageBucket: "tracker-finanzas-b85ec.firebasestorage.app",
    messagingSenderId: "537685468596",
    appId: "1:537685468596:web:c94e9005665e16be4ebee1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);