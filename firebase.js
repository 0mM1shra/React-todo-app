import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: 
  authDomain: "to-do-list-e3909.firebaseapp.com",
  projectId: "to-do-list-e3909",
  storageBucket: "to-do-list-e3909.firebasestorage.app",
  messagingSenderId: "357311135593",
  appId: "1:357311135593:web:d02fec52f3dd59baa087f8",
  measurementId: "G-HLB4ZRT94M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
