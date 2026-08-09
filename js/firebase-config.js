// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCiqIxXzIWzcHi9IywB5tUYdP9vKX6SM9g",
    authDomain: "tracker-finance-dc905.firebaseapp.com",
    projectId: "tracker-finance-dc905",
    storageBucket: "tracker-finance-dc905.firebasestorage.app",
    messagingSenderId: "47567605364",
    appId: "1:47567605364:web:32420cc90dc37812828b21"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);