import React, { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, RecurringSession } from '../types';
import { Trash2, SlidersHorizontal, MapPin, Clock, Plus, Scan, CalendarOff, ChevronRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import SessionModal from '../components/SessionModal';

const checkIsLive = (classDate: string, startTime: string, endTime: string) => {
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (classDate !== today) return false;
    const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    return nowStr >= startTime && nowStr < endTime;
};

const checkHasEnded = (classDate: string, endTime: string) => {
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (classDate < today) return true;
    if (classDate > today) return false;
    const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    return nowStr >= endTime;
};

const checkIsTooEarly = (classDate: string, startTime: string) => {
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (classDate > today) return true;
    if (classDate < today) return false;
    
    const startTimeParts = startTime.split(':');
    const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return startMinutes - nowMinutes > 15;
};

interface ClassesProps {
    onNavigate: (path: string, state?: any) => void;
}

const ClassSessionItem = React.memo(({ cl, isLive, hasEnded, isTooEarly, t, isRTL, openModal, handleDelete, onNavigate }: {
    cl: ClassSession;
    isLive: boolean;
    hasEnded: boolean;
    isTooEarly: boolean;
    t: any;
    isRTL: boolean;
    openModal: (cl: ClassSession) => void;
    handleDelete: (id: string) => void;
    onNavigate: (path: string, state?: any) => void;
}) => {
    return (
        <div key={cl.id} className={`p-8 academic-card relative group transition-all hover:border-primary/20 ${isLive ? 'ring-4 ring-success ring-offset-4 ring-offset-background' : ''} ${hasEnded ? 'opacity-60 bg-muted' : ''}`}>
            <div className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} flex gap-3 z-10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0`}>
                <button 
                    onClick={() => openModal(cl)} 
                    className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-surface rounded-2xl shadow-pop-sm border-2 border-border-dark"
                >
                    <SlidersHorizontal size={18} />
                </button>
                <button 
                    onClick={() => handleDelete(cl.id)} 
                    className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-danger transition-all bg-surface rounded-2xl shadow-pop-sm border-2 border-border-dark"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="mb-10 text-start">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`academic-badge ${isLive ? 'academic-badge-success' : hasEnded ? 'bg-muted text-text-secondary border-2 border-border-dark' : 'academic-badge-primary'}`}>
                        {isLive ? t('hub.liveNow') : hasEnded ? t('hub.ended') : cl.type}
                    </div>
                    <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">{cl.date}</div>
                </div>
                
                <h3 className="font-display font-bold text-2xl tracking-tight uppercase text-text leading-tight mb-8 min-h-[3.5rem] line-clamp-2">{cl.name}</h3>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border-2 border-border-dark shadow-pop-sm">
                        <div className="p-2.5 bg-primary/10 rounded-xl border-2 border-primary"><MapPin size={18} className="text-primary" /></div>
                        <div className="text-start">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary leading-none mb-1">Assigned Hall</p>
                            <p className="text-sm font-display font-bold text-text uppercase leading-none">{cl.room || 'TBA'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 p-4 bg-surface rounded-2xl border-2 border-border-dark shadow-pop-sm">
                        <div className="p-2.5 bg-primary/10 rounded-xl border-2 border-primary"><Clock size={18} className="text-primary" /></div>
                        <div className="text-start">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-text-secondary leading-none mb-1">Temporal Block</p>
                            <p className="text-sm font-display font-bold text-text uppercase leading-none">{cl.time} — {cl.endTime}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <button 
                onClick={() => !(hasEnded || isTooEarly) && onNavigate('/scanner', { classId: cl.id })}
                disabled={hasEnded || isTooEarly}
                className={`w-full py-5 academic-button ${(hasEnded || isTooEarly) ? 'opacity-50 cursor-not-allowed bg-muted border-2 border-border-dark text-text-secondary shadow-none' : 'academic-button-primary'}`}
            >
                {hasEnded ? <CalendarOff size={20} /> : isTooEarly ? <Clock size={20} /> : <Scan size={20} />}
                {hasEnded ? t('hub.ended') : isTooEarly ? 'Upcoming' : t('hub.marks')}
                {!(hasEnded || isTooEarly) && <ChevronRight size={16} className={`opacity-50 ${isRTL ? 'rotate-180' : ''}`} />}
            </button>
        </div>
    );
});

const Classes: React.FC<ClassesProps> = ({ onNavigate }) => {
    const { t, isRTL } = useLanguage();
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [recurringSessions, setRecurringSessions] = useState<RecurringSession[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassSession | null>(null);

    const allSessions = useMemo(() => {
        const upcomingRecurring: ClassSession[] = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
            const dateStr = date.toISOString().split('T')[0];
            
            recurringSessions.filter(s => s.dayOfWeek === dayName).forEach(s => {
                upcomingRecurring.push({
                    id: s.id,
                    name: s.name,
                    date: dateStr,
                    time: s.startTime,
                    endTime: s.endTime,
                    room: s.room,
                    type: s.type
                });
            });
        }
        
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

        return [...classes, ...upcomingRecurring].sort((a, b) => {
            const aIsPast = a.date < todayStr || (a.date === todayStr && a.endTime <= nowStr);
            const bIsPast = b.date < todayStr || (b.date === todayStr && b.endTime <= nowStr);

            if (aIsPast && !bIsPast) return 1;
            if (!aIsPast && bIsPast) return -1;

            if (!aIsPast && !bIsPast) {
                // Both upcoming/live: earliest first
                const dateCompare = a.date.localeCompare(b.date);
                if (dateCompare !== 0) return dateCompare;
                return a.time.localeCompare(b.time);
            } else {
                // Both past: most recent first
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare;
                return b.time.localeCompare(a.time);
            }
        });
    }, [classes, recurringSessions]);

    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, collections.classes), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)));
        });
        const unsubRecurring = onSnapshot(collection(db, 'recurring_sessions'), (snap) => {
            setRecurringSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringSession)));
        });
        return () => { unsubClasses(); unsubRecurring(); };
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('hub.deleteSession') + "?")) return;
        try { await deleteDoc(doc(db, collections.classes, id)); } catch (error) { alert(t('common.error')); }
    };

    const openModal = (cl?: ClassSession) => {
        if (cl) { setEditingClass(cl); }
        else { setEditingClass(null); }
        setIsModalOpen(true);
    };

    return (
        <div className="fade-in max-w-7xl mx-auto">
            <div className={`mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-4 border-border-dark pb-10`}>
                <div className="text-start">
                    <h2 className="text-4xl lg:text-5xl font-display font-bold tracking-tighter uppercase text-text leading-none">{t('nav.hub')}</h2>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.3em]">{t('hub.title')}</p>
                    </div>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="academic-button academic-button-primary px-8 py-5 flex items-center justify-center gap-3 group"
                >
                    <Plus size={20} className="transition-transform group-hover:rotate-90" /> {t('hub.newSession')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {allSessions.map(cl => {
                    const isLive = checkIsLive(cl.date, cl.time, cl.endTime);
                    const hasEnded = checkHasEnded(cl.date, cl.endTime);
                    const isTooEarly = checkIsTooEarly(cl.date, cl.time);
                    
                    return (
                        <ClassSessionItem 
                            key={cl.id}
                            cl={cl}
                            isLive={isLive}
                            hasEnded={hasEnded}
                            isTooEarly={isTooEarly}
                            t={t}
                            isRTL={isRTL}
                            openModal={openModal}
                            handleDelete={handleDelete}
                            onNavigate={onNavigate}
                        />
                    );
                })}
            </div>

            <SessionModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                editingClass={editingClass} 
            />
        </div>
    );
};

export default Classes;