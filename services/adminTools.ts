import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    writeBatch,
    DocumentReference,
    getDoc,
    deleteDoc,
    updateDoc
} from 'firebase/firestore';
import { db, collections } from './firebase';

/**
 * Super-Admin Hard Delete Script (Robust Version)
 * 
 * Strategy:
 * 1. IDENTITY: Resolve the user ID.
 * 2. KILL: Try to delete the document (Hard Delete).
 * 3. NEUTRALIZE: If Hard Delete is blocked by rules, wipe sensitive data (Soft Delete fallback).
 * 4. CLEANUP: Wipe related records.
 */
export const superAdminHardDelete = async (identifier: string): Promise<string[]> => {
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(`[SuperAdmin] ${msg}`);
        logs.push(msg);
    };

    log(`Initializing Delete Protocol for: ${identifier}`);

    try {
        let userId = identifier;
        
        // 1. Resolve Target
        const userDocRef = doc(db, collections.users, identifier);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            const q = query(collection(db, collections.users), where('email', '==', identifier));
            const emailSnap = await getDocs(q);
            if (!emailSnap.empty) {
                userId = emailSnap.docs[0].id;
                log(`Resolved Email to ID: ${userId}`);
            } else {
                log(`Target user doc not found. Cleaning orphans for ID: ${identifier}`);
            }
        }

        // 2. The Kill Step (Hard Delete vs Neutralize)
        try {
            await deleteDoc(doc(db, collections.users, userId));
            log(`SUCCESS: User Identity [${userId}] deleted from database.`);
        } catch (e: any) {
            log(`Hard Delete Restricted: ${e.message}. Attempting neutralization fallback...`);
            // FALLBACK: If we can't delete, we wipe the account data to render it useless.
            try {
                await updateDoc(doc(db, collections.users, userId), {
                    password: `DELETED_${Date.now()}`,
                    email: `deleted_${userId}@edu.alg`,
                    status: 'deleted',
                    name: `(Deleted User)`,
                    role: 'student' // Demote just in case
                });
                log(`SUCCESS: User account neutralized (Soft Delete). Login access revoked.`);
            } catch (fallbackError: any) {
                log(`FATAL: Both Hard and Soft delete failed. ${fallbackError.message}`);
                throw new Error("Insufficient permissions to delete or modify this user.");
            }
        }

        // 3. Cascading Cleanup (Best Effort)
        const refsToDelete: DocumentReference[] = [];
        const safeCollect = async (name: string, q: any) => {
            try {
                const snap = await getDocs(q);
                snap.forEach(d => refsToDelete.push(d.ref));
            } catch (e) {}
        };

        await Promise.all([
            safeCollect('Attendance', query(collection(db, collections.attendance), where('studentId', '==', userId))),
            safeCollect('Attendance_T', query(collection(db, collections.attendance), where('teacherId', '==', userId))),
            safeCollect('Messages', query(collection(db, collections.messages), where('senderId', '==', userId))),
            safeCollect('Submissions', query(collection(db, collections.submissions), where('studentId', '==', userId))),
        ]);

        if (refsToDelete.length > 0) {
            const batch = writeBatch(db);
            refsToDelete.slice(0, 450).forEach(ref => batch.delete(ref));
            await batch.commit();
            log(`Cleaned up ${refsToDelete.length} related records.`);
        }

        return logs;

    } catch (error: any) {
        log(`Operation Failed: ${error.message}`);
        throw error;
    }
};