import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, RecurringSession } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, XCircle, CalendarDays, Plus, Pause, Play, Trash2, X } from 'lucide-react';
import RecurringSessionModal from '../components/RecurringSessionModal';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';

const Schedule: React.FC = () => {
    const { user } = useAuth();
    const { t, language } = useLanguage();

    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [recurringSessions, setRecurringSessions] = useState<RecurringSession[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDayModalOpen, setIsDayModalOpen] = useState(false);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);

    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, collections.classes), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)));
        });
        
        const unsubRecurring = onSnapshot(collection(db, 'recurring_sessions'), (snap) => {
            setRecurringSessions(snap.docs.map(d => ({ id: d.id, ...d.data() } as RecurringSession)));
        });
        
        const unsubTeachers = onSnapshot(query(collection(db, collections.users), where('role', '==', 'teacher')), (snap) => {
            setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubSubjects = onSnapshot(collection(db, 'subjects'), (snap) => {
            setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        const qAttendance = user?.role === 'student' 
            ? query(collection(db, collections.attendance), where('studentId', '==', user.id)) 
            : collection(db, collections.attendance);
            
        const unsubAttendance = onSnapshot(qAttendance, (snap) => {
            setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        return () => { unsubClasses(); unsubAttendance(); unsubRecurring(); unsubTeachers(); unsubSubjects(); };
    }, [user?.role, user?.id]);

    const checkIsLive = useCallback((date: string, start: string, end: string) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (date !== today) return false;
        const nowTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        return nowTime >= start && nowTime < end;
    }, []);

    const checkHasEnded = useCallback((date: string, end: string) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        if (date < today) return true;
        if (date > today) return false;
        const nowTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        return nowTime >= end;
    }, []);

    const getAttendanceStatus = useCallback((classId: string, classDate: string) => {
        if (user?.role === 'student') {
            const isPresent = attendance.some(a => a.classId === classId && a.date === classDate && a.studentId === user.id);
            if (isPresent) return 'present';
            const cls = classes.find(c => c.id === classId);
            if (checkHasEnded(classDate, cls?.endTime || '00:00')) return 'absent';
            return 'pending';
        }
        return attendance.filter(a => a.classId === classId && a.date === classDate).length;
    }, [user?.role, attendance, classes, checkHasEnded]);

    const formattedToday = useMemo(() => {
        const d = new Date(currentDate);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    }, [currentDate]);

    const filteredClasses = useMemo(() => {
        if (user?.role === 'student') {
            if (!user.subjectsStudied || user.subjectsStudied.length === 0) return [];
            return classes.filter(c => c.subjectId && user.subjectsStudied?.includes(c.subjectId));
        }
        return classes;
    }, [classes, user]);

    const filteredRecurringSessions = useMemo(() => {
        if (user?.role === 'student') {
            if (!user.subjectsStudied || user.subjectsStudied.length === 0) return [];
            return recurringSessions.filter(s => s.subjectId && user.subjectsStudied?.includes(s.subjectId) && s.status !== 'paused');
        }
        return recurringSessions;
    }, [recurringSessions, user]);

    const handleTogglePause = async (e: React.MouseEvent, session: RecurringSession) => {
        e.stopPropagation();
        const newStatus = session.status === 'paused' ? 'active' : 'paused';
        try {
            await updateDoc(doc(db, 'recurring_sessions', session.id), { status: newStatus });
            toast.success(`Session ${newStatus === 'paused' ? 'paused' : 'resumed'} successfully`);
        } catch (error) {
            console.error('Error toggling session status:', error);
            toast.error('Failed to update session status');
        }
    };

    const handleDeleteRecurring = async (e: React.MouseEvent, session: RecurringSession) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete the recurring session "${session.name}"?`)) return;
        try {
            await deleteDoc(doc(db, 'recurring_sessions', session.id));
            toast.success('Recurring session deleted');
        } catch (error) {
            console.error('Error deleting recurring session:', error);
            toast.error('Failed to delete session');
        }
    };

    const todaysClasses = useMemo(() => {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        const recurring = filteredRecurringSessions
            .filter(s => s.dayOfWeek === dayName)
            .map(s => ({
                id: s.id,
                name: s.name,
                date: currentDate.toISOString().split('T')[0],
                time: s.startTime,
                endTime: s.endTime,
                room: s.room,
                type: s.type,
                subjectId: s.subjectId,
                isRecurring: true,
                status: s.status || 'active',
                originalSession: s
            } as any));
        
        return [...filteredClasses.filter(c => c.date === currentDate.toISOString().split('T')[0]), ...recurring]
            .sort((a,b) => a.time.localeCompare(b.time));
    }, [filteredClasses, filteredRecurringSessions, currentDate]);

    const navigateMonth = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + direction);
        setCurrentDate(newDate);
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        return (
            <div className="p-8">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                        {currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={() => navigateMonth(-1)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => navigateMonth(1)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                    {weekDays.map(d => <div key={d}>{d}</div>)}
                </div>

                <div className="grid grid-cols-7 gap-3">
                    {days.map((d, i) => {
                        if (!d) return <div key={`empty-${i}`} className="h-12" />;
                        
                        const localDateString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        const isSelected = localDateString === formattedToday;
                        
                        const today = new Date();
                        const isToday = localDateString === new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        
                        const hasClass = filteredClasses.some(c => c.date === localDateString) || 
                                         filteredRecurringSessions.some(s => s.dayOfWeek === d.toLocaleDateString('en-US', { weekday: 'long' }));
                        
                        return (
                            <button 
                                key={i} 
                                onClick={() => {
                                    setCurrentDate(d);
                                    if (user?.role === 'economic') {
                                        setIsDayModalOpen(true);
                                    }
                                }}
                                className={`h-12 w-12 mx-auto rounded-2xl flex flex-col items-center justify-center text-sm relative transition-all
                                    ${isSelected ? 'bg-primary text-white font-bold shadow-xl shadow-primary/30 scale-110 z-10' : 
                                      isToday ? 'bg-primary/10 text-primary font-bold border border-primary/20' : 
                                      'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
                                `}
                            >
                                <span>{d.getDate()}</span>
                                {hasClass && (
                                    <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                    <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-primary-hover transition-all hover:scale-105"
                    >
                        Go to Today
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12 pb-32">
            <header className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">{t('schedule.title')}</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Institutional Academic Timeline & Session Management</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Calendar Section */}
                <div className="lg:col-span-4 lg:sticky lg:top-4 z-20">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        {renderCalendar()}
                    </div>
                </div>

                {/* Schedule List Section */}
                <div className="lg:col-span-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <CalendarDays size={22} className="text-primary" />
                                {currentDate.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}
                            </h3>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">
                                {todaysClasses.length} {todaysClasses.length === 1 ? 'Scheduled Session' : 'Scheduled Sessions'}
                            </p>
                        </div>
                        
                        {user?.role === 'economic' && (
                            <button 
                                onClick={() => setIsModalOpen(true)} 
                                className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus size={18} /> Add Recurring Session
                            </button>
                        )}
                    </div>

                    <RecurringSessionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} teachers={teachers} subjects={subjects} />

                    {/* Day Sessions Modal for Economic Account */}
                    <AnimatePresence>
                        {isDayModalOpen && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsDayModalOpen(false)}
                                    className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
                                />
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                                >
                                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <CalendarDays size={24} />
                                            </div>
                                            <div className="text-start">
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                                    {currentDate.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}
                                                </h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Session Protocol</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setIsDayModalOpen(false)} className="p-3 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 rounded-2xl transition-all">
                                            <X size={24} />
                                        </button>
                                    </div>

                                    <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                                        {todaysClasses.length > 0 ? todaysClasses.map((s) => {
                                            const isPaused = s.status === 'paused';
                                            const isRecurring = s.isRecurring;
                                            
                                            return (
                                                <div 
                                                    key={s.id} 
                                                    className={`p-6 rounded-3xl border transition-all duration-300 ${
                                                        isPaused 
                                                        ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-60' 
                                                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isPaused ? 'bg-slate-200 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                                                                <Clock size={24} />
                                                            </div>
                                                            <div className="text-start">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className={`text-base font-black tracking-tight ${isPaused ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                                                        {s.name}
                                                                    </h4>
                                                                    {isPaused && (
                                                                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase rounded-md tracking-widest">Paused</span>
                                                                    )}
                                                                    {isRecurring && (
                                                                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-md tracking-widest">Recurring</span>
                                                                    )}
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                                    <Clock size={12} /> {s.time} - {s.endTime}
                                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                                    <MapPin size={12} /> {s.room}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {isRecurring && user?.role === 'economic' && (
                                                            <div className="flex items-center gap-2">
                                                                <button 
                                                                    onClick={(e) => handleTogglePause(e, s.originalSession)}
                                                                    className={`p-3 rounded-xl transition-all ${isPaused ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                                                                    title={isPaused ? 'Resume' : 'Pause'}
                                                                >
                                                                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => handleDeleteRecurring(e, s.originalSession)}
                                                                    className="p-3 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="py-20 text-center flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                                    <CalendarIcon size={32} />
                                                </div>
                                                <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">No sessions scheduled</h4>
                                                <p className="text-sm text-slate-500">There are no classes on this date.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
                                        <button 
                                            onClick={() => setIsDayModalOpen(false)}
                                            className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-xl shadow-slate-900/10"
                                        >
                                            Close Protocol
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={formattedToday}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="space-y-6"
                            >
                                {todaysClasses.length > 0 ? todaysClasses.map((s) => {
                                    const isPaused = s.status === 'paused';
                                    const isLive = !isPaused && checkIsLive(s.date, s.time, s.endTime);
                                    const status = isPaused ? 'paused' : getAttendanceStatus(s.id, s.date);
                                    const attendees = (user?.role !== 'student' && !isPaused) ? attendance.filter(a => a.classId === s.id && a.date === s.date) : [];
                                    const isExpanded = expandedSession === s.id;
                                    
                                    return (
                                        <div 
                                            key={s.id} 
                                            onClick={() => user?.role !== 'student' && setExpandedSession(isExpanded ? null : s.id)}
                                            className={`bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] border transition-all relative group overflow-hidden 
                                                ${isLive ? 'border-primary shadow-xl ring-2 ring-primary/10' : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg'} 
                                                ${user?.role !== 'student' ? 'cursor-pointer' : ''}
                                                ${isPaused ? 'opacity-75 grayscale-[0.5]' : ''}
                                            `}
                                        >
                                            {isLive && (
                                                <div className="absolute top-0 right-0 p-4">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                                        <div className="w-2 h-2 bg-primary rounded-full" />
                                                        Live Protocol
                                                    </div>
                                                </div>
                                            )}

                                            {s.isRecurring && (user?.role === 'economic' || user?.role === 'admin') && (
                                                <div className="absolute bottom-6 right-6 flex items-center gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={(e) => handleTogglePause(e, s.originalSession)}
                                                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-sm border
                                                            ${s.status === 'paused' ? 
                                                              'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' : 
                                                              'bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100'}`}
                                                        title={s.status === 'paused' ? 'Resume Session' : 'Pause Session'}
                                                    >
                                                        {s.status === 'paused' ? <Play size={18} /> : <Pause size={18} />}
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleDeleteRecurring(e, s.originalSession)}
                                                        className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded-xl transition-all shadow-sm"
                                                        title="Delete Recurring Session"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                                                            {s.type}
                                                        </span>
                                                        {s.isRecurring && (
                                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border
                                                                ${s.status === 'paused' ? 
                                                                  'bg-amber-50 text-amber-700 border-amber-100' : 
                                                                  'bg-primary/5 text-primary border-primary/10'}`}>
                                                                {s.status === 'paused' ? 'Paused' : 'Recurring'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className={`text-xl md:text-2xl font-bold tracking-tight leading-tight transition-all ${s.status === 'paused' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                                                        {s.name}
                                                    </h4>
                                                </div>
                                                
                                                <div className="shrink-0">
                                                    {typeof status === 'string' ? (
                                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border
                                                            ${status === 'present' ? 'bg-success/10 text-success border-success/20' : 
                                                              status === 'absent' ? 'bg-danger/10 text-danger border-danger/20' : 
                                                              'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                                                            {status === 'present' ? <CheckCircle2 size={14} /> : status === 'absent' ? <XCircle size={14} /> : <Clock size={14} />}
                                                            {t(`schedule.${status}`)}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-primary/5 text-primary border border-primary/10 px-5 py-3 rounded-2xl flex flex-col items-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] mb-1 opacity-60">
                                                                {(user?.role === 'economic' || user?.role === 'admin') ? 'Attendees' : t('schedule.present')}
                                                            </span>
                                                            <span className="text-xl font-black">{status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-6 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                        <Clock size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold tracking-tight">{s.time} — {s.endTime}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                                        <MapPin size={16} />
                                                    </div>
                                                    <span className="text-sm font-bold tracking-tight truncate max-w-[200px]">{s.room}</span>
                                                </div>
                                            </div>

                                            {isExpanded && user?.role !== 'student' && (
                                                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-200" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-between mb-4">
                                                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Present Students ({attendees.length})</h5>
                                                    </div>
                                                    
                                                    {attendees.length > 0 ? (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 scroll-hide">
                                                            {attendees.map((a: any) => (
                                                                <div key={a.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm">
                                                                    <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success shrink-0 font-bold text-xs">
                                                                        {a.studentName.charAt(0)}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{a.studentName}</p>
                                                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                                                            <CheckCircle2 size={10} className="text-success" />
                                                                            {a.timestamp?.seconds ? new Date(a.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Verified'}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                                            <p className="text-xs font-medium text-slate-400 italic">No students scanned yet.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center px-6">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                            <CalendarIcon size={24} />
                                        </div>
                                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">No sessions scheduled</h4>
                                        <p className="text-xs text-slate-500">You have no classes on this date.</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Schedule;