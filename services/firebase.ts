import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import firebaseConfig from '../firebase-applet-config.json';
export { firebaseConfig };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
    groups: `artifacts/${APP_ID}/public/data/groups`,
    subjects: `artifacts/${APP_ID}/public/data/subjects`
};
