import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db, collections } from './firebase';
import { StudentSubscription } from '../types';

export const checkAndUpdateSubscriptionStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'subscriptions'), where('status', '==', 'Active'));
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach(async (d) => {
        const sub = { id: d.id, ...d.data() } as StudentSubscription;
        if (sub.endDate < today) {
            await updateDoc(doc(db, 'subscriptions', sub.id), { status: 'Pending' });
        }
    });
};
