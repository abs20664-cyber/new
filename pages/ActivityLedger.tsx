import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { Notification } from '../types';
import { Bell, Info, Mail, ClipboardCheck, CalendarCheck, X } from 'lucide-react';

const ActivityLedger: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) return;
        
        const q = query(
            collection(db, collections.notifications),
            where('userId', '==', user.id)
        );

        const unsub = onSnapshot(q, (snap) => {
            const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
            const sortedNotifs = allNotifs.sort((a, b) => {
                const tA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
                const tB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
                return tB - tA;
            });
            setNotifications(sortedNotifs);
        });

        return () => unsub();
    }, [user]);

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, collections.notifications, id), { read: true });
        } catch (e) { console.error("[Ledger] Update failed", e); }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'message': return <Mail size={18} />;
            case 'task': return <ClipboardCheck size={18} />;
            case 'attendance': return <CalendarCheck size={18} />;
            default: return <Info size={18} />;
        }
    };

    const getColorForType = (type: string) => {
        switch (type) {
            case 'message': return 'text-primary bg-primary/10';
            case 'task': return 'text-warning bg-warning/10';
            case 'attendance': return 'text-success bg-success/10';
            default: return 'text-institutional-600 bg-institutional-500/10';
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-black text-institutional-900 dark:text-institutional-50 mb-6 uppercase">Activity Ledger</h1>
            <div className="space-y-4">
                {notifications.length === 0 ? (
                    <div className="text-center py-20 opacity-50">
                        <Bell size={64} className="mx-auto mb-4" />
                        <p>No notifications yet.</p>
                    </div>
                ) : notifications.map(n => (
                    <div 
                        key={n.id} 
                        className={`p-6 rounded-3xl border transition-all ${n.read ? 'bg-transparent border-transparent opacity-60' : 'bg-surface dark:bg-institutional-900 border-institutional-200 dark:border-institutional-800 shadow-soft'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`p-3 rounded-2xl ${getColorForType(n.type)} shadow-sm`}>
                                {getIconForType(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase text-institutional-600 tracking-[0.1em]">{n.title}</p>
                                <p className="text-[9px] font-bold text-institutional-600 mt-0.5">
                                    {n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString() : '...'}
                                </p>
                            </div>
                            {!n.read && (
                                <button onClick={() => markAsRead(n.id)} className="text-xs font-bold text-primary hover:underline">
                                    Mark as read
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-institutional-800 dark:text-institutional-50 font-semibold leading-relaxed">{n.message}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ActivityLedger;
