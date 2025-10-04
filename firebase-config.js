// Firebase configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAokjv9pinAu_hnT4kA8lSWFZyQo3I10oE",
    authDomain: "knox-inventory.firebaseapp.com",
    databaseURL: "https://knox-inventory-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "knox-inventory",
    storageBucket: "knox-inventory.firebasestorage.app",
    messagingSenderId: "14319997241",
    appId: "1:14319997241:web:e7dad9c17df15c67a498e8"
};

// Initialize Firebase
console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
console.log('Firebase initialized, database:', db);

// Export for use in other modules
window.db = db;
console.log('Firebase database assigned to window.db');