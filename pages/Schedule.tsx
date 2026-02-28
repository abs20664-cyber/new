import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, XCircle, CalendarDays } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Schedule: React.FC = () => {
    const { user } = useAuth();
    const { t, language, isRTL } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === 'economic') {
            navigate('/');
        }
    }, [user?.role, navigate]);

    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [attendance, setAttendance] = useState<any[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        const unsubClasses = onSnapshot(collection(db, collections.classes), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)));
        });
        
        const qAttendance = user?.role === 'student' 
            ? query(collection(db, collections.attendance), where('studentId', '==', user.id)) 
            : collection(db, collections.attendance);
            
        const unsubAttendance = onSnapshot(qAttendance, (snap) => {
            setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        
        return () => { unsubClasses(); unsubAttendance(); };
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

    const todaysClasses = useMemo(() => 
        classes.filter(c => c.date === formattedToday).sort((a,b) => a.time.localeCompare(b.time)),
        [classes, formattedToday]
    );

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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm w-full max-w-sm mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                        {currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        <ChevronRight size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400 mb-3">
                    {weekDays.map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                        if (!d) return <div key={`empty-${i}`} className="h-10" />;
                        
                        // Fix timezone offset issue for comparison
                        const localDateString = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        const isSelected = localDateString === formattedToday;
                        
                        const today = new Date();
                        const isToday = localDateString === new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                        
                        const hasClass = classes.some(c => c.date === localDateString);
                        
                        return (
                            <button 
                                key={i} 
                                onClick={() => setCurrentDate(d)}
                                className={`h-10 w-10 mx-auto rounded-full flex flex-col items-center justify-center text-sm relative transition-all
                                    ${isSelected ? 'bg-primary text-white font-semibold shadow-md' : 
                                      isToday ? 'bg-primary/10 text-primary font-semibold' : 
                                      'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}
                                `}
                            >
                                <span>{d.getDate()}</span>
                                {hasClass && (
                                    <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-center">
                    <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                    >
                        Go to Today
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
            <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('schedule.title')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your academic timeline and sessions</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
                {/* Calendar Section */}
                <div className="w-full md:w-auto shrink-0">
                    {renderCalendar()}
                </div>

                {/* Schedule List Section */}
                <div className="w-full max-w-lg flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <CalendarDays size={18} className="text-primary" />
                            {currentDate.toLocaleDateString(language, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full">
                            {todaysClasses.length} {todaysClasses.length === 1 ? 'Session' : 'Sessions'}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={formattedToday}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {todaysClasses.length > 0 ? todaysClasses.map((s) => {
                                    const isLive = checkIsLive(s.date, s.time, s.endTime);
                                    const status = getAttendanceStatus(s.id, s.date);
                                    
                                    return (
                                        <div key={s.id} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all relative overflow-hidden ${isLive ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'}`}>
                                            {isLive && (
                                                <div className="absolute top-0 right-0 p-3">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wide animate-pulse">
                                                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                                        Live
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1 pr-4">
                                                    <span className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                        {s.type}
                                                    </span>
                                                    <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">{s.name}</h4>
                                                </div>
                                                
                                                <div className="shrink-0 mt-1">
                                                    {typeof status === 'string' ? (
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${status === 'present' ? 'bg-success/10 text-success' : status === 'absent' ? 'bg-danger/10 text-danger' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                            {status === 'present' ? <CheckCircle2 size={12} /> : status === 'absent' ? <XCircle size={12} /> : <Clock size={12} />}
                                                            {t(`schedule.${status}`)}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl flex flex-col items-center">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider">{t('schedule.present')}</span>
                                                            <span className="text-sm font-bold">{status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <Clock size={14} className="text-primary" />
                                                    <span className="text-xs font-medium">{s.time} — {s.endTime}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                                    <MapPin size={14} className="text-primary" />
                                                    <span className="text-xs font-medium truncate max-w-[120px]">{s.room}</span>
                                                </div>
                                            </div>
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