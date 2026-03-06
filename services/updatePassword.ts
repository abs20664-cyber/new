import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, collections } from './firebase';

export const updatePasswordForUser = async (email: string, newPassword: string) => {
    const q = query(collection(db, collections.users), where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) {
        throw new Error("User not found");
    }
    const userDoc = snap.docs[0];
    await updateDoc(userDoc.ref, { password: newPassword });
    return "Password updated successfully";
};
