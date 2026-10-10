import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCehVUTGLcqDm0yRmrI-U41AsmKS4CurIM",
  authDomain: "wedding-ca5fa.firebaseapp.com",
  projectId: "wedding-ca5fa",
  storageBucket: "wedding-ca5fa.firebasestorage.app",
  messagingSenderId: "83915660661",
  appId: "1:83915660661:web:c24cf9021d9598a1c1873c",
  measurementId: "G-5ZVZPWEEQ4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
