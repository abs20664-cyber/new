import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD2aOVfl6bXOpWCL9eaiM85g14WB25aXYg",
  authDomain: "alpha-26f1e.firebaseapp.com",
  projectId: "alpha-26f1e",
  storageBucket: "alpha-26f1e.firebasestorage.app",
  messagingSenderId: "838970744952",
  appId: "1:838970744952:web:4b190d95010ecf23e18d8d",
  measurementId: "G-230TGXB20M"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const APP_ID = 'edusaas-live-demo-v2';

export const collections = {
    users: `artifacts/${APP_ID}/public/data/users`,
    classes: `artifacts/${APP_ID}/public/data/classes`,
    attendance: `artifacts/${APP_ID}/public/data/attendance`,
    materials: `artifacts/${APP_ID}/public/data/materials`,
    messages: `artifacts/${APP_ID}/public/data/messages`,
    assignments: `artifacts/${APP_ID}/public/data/assignments`,
    submissions: `artifacts/${APP_ID}/public/data/submissions`,
    notifications: `artifacts/${APP_ID}/public/data/notifications`,
    typing: `artifacts/${APP_ID}/public/data/typing`,
    groups: `artifacts/${APP_ID}/public/data/groups`
};

export const signIn = async () => {
    try {
        // Check if already authenticated
        if (auth.currentUser) return auth.currentUser;
        
        // Try to sign in anonymously
        const result = await signInAnonymously(auth);
        return result.user;
    } catch (error: any) {
        // Handle the specific error 'auth/admin-restricted-operation'
        // which usually means Anonymous Auth is disabled in the Firebase Console.
        if (error.code === 'auth/admin-restricted-operation') {
            console.warn("[Firebase] Anonymous authentication is disabled in the Firebase Console. Please enable it under Authentication > Sign-in method > Anonymous.");
        } else {
            console.error("[Firebase] Auth error:", error.code, error.message);
        }
        return null;
    }
};
