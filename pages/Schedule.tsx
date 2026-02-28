import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, HOURS_OF_DAY } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, CheckCircle2, XCircle, Info, CalendarDays, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePlatform } from '../contexts/PlatformContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Schedule: React.FC = () => {
    const { user } = useAuth();
    const { isMobile } = usePlatform();
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
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value);
        if (!isNaN(date.getTime())) {
            setCurrentDate(date);
        }
    };

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

    const weekDates = useMemo(() => {
        const date = new Date(currentDate);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(date.setDate(diff));
        
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            return {
                name: d.toLocaleDateString(language, { weekday: 'long' }),
                date: d.toISOString().split('T')[0],
                display: d.toLocaleDateString(language, { day: 'numeric', month: 'short' }),
                raw: d
            };
        });
    }, [currentDate, language]);

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

    const formattedToday = useMemo(() => currentDate.toISOString().split('T')[0], [currentDate]);
    const todaysClasses = useMemo(() => 
        classes.filter(c => c.date === formattedToday).sort((a,b) => a.time.localeCompare(b.time)),
        [classes, formattedToday]
    );

    const navigateWeek = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const navigateDay = (direction: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + direction);
        setCurrentDate(newDate);
    };

    return (
        <div className="fade-in max-w-7xl mx-auto px-4 lg:px-0 pb-24">
             <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-institutional-200 dark:border-institutional-800 text-start">
                <div className="space-y-2">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter uppercase text-institutional-950 dark:text-white">{t('schedule.title')}</h2>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-primary/10 rounded-full">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                <Clock size={12} />
                                Temporal Allocation
                            </p>
                        </div>
                        <div className="px-3 py-1 bg-institutional-100 dark:bg-institutional-800 rounded-full">
                            <p className="text-[10px] font-black text-institutional-500 dark:text-institutional-400 uppercase tracking-[0.2em]">
                                v3.1 OS
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="flex items-center bg-surface dark:bg-institutional-900 p-1.5 rounded-2xl border border-institutional-200 dark:border-institutional-800 shadow-soft">
                        <button 
                            onClick={() => isMobile ? navigateDay(-1) : navigateWeek(-1)} 
                            className={`p-3 hover:bg-institutional-100 dark:hover:bg-institutional-800 rounded-xl transition-all active:scale-90 ${isRTL ? 'rotate-180' : ''}`}
                        >
                            <ChevronLeft size={20} className="text-institutional-600 dark:text-institutional-400" />
                        </button>
                        
                        <div className="relative flex flex-col items-center px-6 border-x border-institutional-100 dark:border-institutional-800 min-w-[160px] group cursor-pointer">
                            <input 
                                type="date" 
                                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                onChange={handleDateChange}
                                value={currentDate.toISOString().split('T')[0]}
                            />
                            <span className="text-[10px] font-black uppercase text-primary tracking-widest mb-0.5">{currentDate.toLocaleDateString(language, { weekday: 'long' })}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-institutional-950 dark:text-white">{currentDate.toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <CalendarDays size={14} className="text-institutional-400 group-hover:text-primary transition-colors" />
                            </div>
                        </div>

                        <button 
                            onClick={() => isMobile ? navigateDay(1) : navigateWeek(1)} 
                            className={`p-3 hover:bg-institutional-100 dark:hover:bg-institutional-800 rounded-xl transition-all active:scale-90 ${isRTL ? 'rotate-180' : ''}`}
                        >
                            <ChevronRight size={20} className="text-institutional-600 dark:text-institutional-400" />
                        </button>
                    </div>

                    <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="px-6 py-3 bg-institutional-900 dark:bg-white text-white dark:text-institutional-900 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-soft hover:shadow-strong transition-all active:scale-95"
                    >
                        Today
                    </button>
                </div>
            </div>

            {isMobile ? (
                <div className="space-y-8">
                    <div className="flex gap-3 overflow-x-auto pb-6 px-1 scrollbar-hide">
                        {weekDates.map((wd, idx) => {
                            const isSelected = wd.date === formattedToday;
                            return (
                                <motion.button 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={wd.date}
                                    onClick={() => setCurrentDate(wd.raw)}
                                    className={`flex-shrink-0 w-20 h-24 rounded-[2rem] flex flex-col items-center justify-center border-2 transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-strong shadow-primary/20 scale-105' : 'bg-surface dark:bg-institutional-900 border-institutional-100 dark:border-institutional-800 text-institutional-500'}`}
                                >
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/70' : 'text-institutional-400'}`}>{wd.name.substring(0,3)}</span>
                                    <span className="text-xl font-black mt-1">{wd.display.split(' ')[0]}</span>
                                    {isSelected && <motion.div layoutId="activeDay" className="w-1.5 h-1.5 bg-white rounded-full mt-2" />}
                                </motion.button>
                            );
                        })}
                    </div>

                    <div className="space-y-5">
                        <AnimatePresence mode="wait">
                            <motion.div 
                                key={formattedToday}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-5"
                            >
                                {todaysClasses.length > 0 ? todaysClasses.map((s, idx) => {
                                    const isLive = checkIsLive(s.date, s.time, s.endTime);
                                    const status = getAttendanceStatus(s.id, s.date);
                                    
                                    return (
                                        <div key={s.id} className={`academic-card p-6 rounded-[2.5rem] transition-all relative overflow-hidden group ${isLive ? 'border-primary ring-4 ring-primary/5' : ''}`}>
                                            {isLive && (
                                                <div className="absolute top-0 right-0 p-4">
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-primary text-white rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                        Live Now
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="px-2.5 py-1 bg-institutional-100 dark:bg-institutional-800 rounded-lg text-[9px] font-black text-institutional-500 dark:text-institutional-400 uppercase tracking-widest border border-institutional-200 dark:border-institutional-700">{s.type}</span>
                                                    </div>
                                                    <h3 className="font-black text-xl leading-tight text-institutional-950 dark:text-white uppercase tracking-tight">{s.name}</h3>
                                                </div>
                                                
                                                <div className="shrink-0">
                                                    {typeof status === 'string' ? (
                                                        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-soft ${status === 'present' ? 'bg-success/10 text-success border border-success/20' : status === 'absent' ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-institutional-100 dark:bg-institutional-800 text-institutional-500'}`}>
                                                            {status === 'present' ? <CheckCircle2 size={14} /> : status === 'absent' ? <XCircle size={14} /> : <Clock size={14} />}
                                                            {t(`schedule.${status}`)}
                                                        </div>
                                                    ) : (
                                                        <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl flex flex-col items-center border border-primary/20 shadow-soft">
                                                            <span className="text-[8px] font-black uppercase mb-0.5 tracking-widest">{t('schedule.present')}</span>
                                                            <span className="text-lg font-black">{status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-institutional-100 dark:border-institutional-800">
                                                <div className="flex items-center gap-3 text-institutional-600 dark:text-institutional-400">
                                                    <div className="p-2 bg-institutional-50 dark:bg-institutional-800 rounded-xl">
                                                        <Clock size={16} className="text-primary" />
                                                    </div>
                                                    <div className="text-start">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-institutional-400">Time</p>
                                                        <p className="text-xs font-bold">{s.time} — {s.endTime}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-institutional-600 dark:text-institutional-400">
                                                    <div className="p-2 bg-institutional-50 dark:bg-institutional-800 rounded-xl">
                                                        <MapPin size={16} className="text-primary" />
                                                    </div>
                                                    <div className="text-start overflow-hidden">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-institutional-400">Location</p>
                                                        <p className="text-xs font-bold truncate">{s.room}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-24 text-center bg-surface dark:bg-institutional-900 rounded-[3rem] border-2 border-dashed border-institutional-200 dark:border-institutional-800 flex flex-col items-center justify-center px-10">
                                        <div className="w-20 h-20 bg-institutional-50 dark:bg-institutional-800 rounded-full flex items-center justify-center text-institutional-300 mb-6">
                                            <Calendar size={40} />
                                        </div>
                                        <h4 className="font-black uppercase tracking-[0.2em] text-xs text-institutional-900 dark:text-white mb-2">No sessions scheduled</h4>
                                        <p className="text-[10px] font-bold text-institutional-400 uppercase tracking-widest">Enjoy your temporal freedom</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            ) : (
                <div className="academic-card rounded-[3rem] overflow-hidden shadow-strong relative border-institutional-200 dark:border-institutional-800">
                    <div className="grid grid-cols-[120px_repeat(7,1fr)] bg-institutional-100 dark:bg-institutional-800 gap-[1px]">
                        <div className="bg-institutional-50 dark:bg-institutional-950 sticky left-0 z-20" />
                        {weekDates.map(wd => (
                            <div key={wd.date} className={`p-6 text-center border-b border-institutional-200 dark:border-institutional-800 transition-colors ${wd.date === formattedToday ? 'bg-primary/5' : 'bg-surface dark:bg-institutional-900'}`}>
                                <div className={`text-xs font-black uppercase tracking-widest ${wd.date === formattedToday ? 'text-primary' : 'text-institutional-900 dark:text-white'}`}>{wd.name}</div>
                                <div className="text-[10px] font-black text-institutional-400 uppercase tracking-widest mt-1.5">{wd.display}</div>
                            </div>
                        ))}
                        
                        {HOURS_OF_DAY.map(hour => (
                            <React.Fragment key={hour}>
                                <div className="bg-institutional-50 dark:bg-institutional-950 flex flex-col items-center justify-center p-6 text-[11px] font-black text-institutional-500 dark:text-institutional-400 uppercase tracking-widest sticky left-0 z-10 border-r border-institutional-200 dark:border-institutional-800">
                                    {hour}
                                </div>
                                {weekDates.map(wd => {
                                    const sessions = classes.filter(c => c.date === wd.date && c.time === hour);
                                    const isTodayCell = wd.date === formattedToday;
                                    
                                    return (
                                        <div key={`${wd.date}-${hour}`} className={`min-h-[160px] p-4 border-b border-institutional-200 dark:border-institutional-800 transition-colors ${isTodayCell ? 'bg-primary/5' : 'bg-surface dark:bg-institutional-900'}`}>
                                            {sessions.map(s => {
                                                const isLive = checkIsLive(s.date, s.time, s.endTime);
                                                const status = getAttendanceStatus(s.id, s.date);
                                                
                                                return (
                                                    <motion.div 
                                                        whileHover={{ scale: 1.02 }}
                                                        key={s.id} 
                                                        className={`h-full flex flex-col justify-between p-5 rounded-3xl border-l-4 transition-all ${isLive ? 'bg-primary/5 border-primary shadow-soft' : 'bg-institutional-50 dark:bg-institutional-800/50 border-institutional-300 dark:border-institutional-700'} text-start`}
                                                    >
                                                        <div className="flex items-center justify-between mb-3">
                                                            <span className="text-[9px] font-black uppercase text-institutional-400 tracking-widest">{s.type}</span>
                                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${status === 'present' ? 'bg-success/10 text-success' : status === 'absent' ? 'bg-danger/10 text-danger' : 'bg-institutional-200 dark:bg-institutional-700 text-institutional-400'}`}>
                                                                {typeof status === 'string' ? (
                                                                    status === 'present' ? <CheckCircle2 size={16} /> : status === 'absent' ? <XCircle size={16} /> : <Clock size={14} />
                                                                ) : <span className="text-[11px] font-black text-primary">{status}</span>}
                                                            </div>
                                                        </div>
                                                        <p className="font-black text-sm text-institutional-950 dark:text-white truncate mb-6 uppercase tracking-tight">{s.name}</p>
                                                        <div className="space-y-2 border-t border-institutional-100 dark:border-institutional-800 pt-4">
                                                            <div className="flex items-center gap-2.5 text-institutional-500">
                                                                <MapPin size={12} className="text-primary" />
                                                                <span className="text-[10px] font-bold truncate">{s.room}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2.5 text-institutional-500">
                                                                <Clock size={12} className="text-primary" />
                                                                <span className="text-[10px] font-bold">{s.time} — {s.endTime}</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;