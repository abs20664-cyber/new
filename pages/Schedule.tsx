import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, HOURS_OF_DAY } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, CheckCircle2, XCircle, Info } from 'lucide-react';
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
        <div className="fade-in max-w-7xl mx-auto px-4 lg:px-0">
             <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border text-start">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tighter uppercase text-text">{t('schedule.title')}</h2>
                    <p className="text-xs font-bold text-text-secondary mt-2 flex items-center gap-2 uppercase tracking-widest">
                        <Clock size={16} className="text-primary" />
                        Temporal Allocation Ledger
                    </p>
                </div>
                
                <div className="flex gap-2 items-center bg-sidebar p-2 rounded-2xl border border-border shadow-md">
                    <button onClick={() => isMobile ? navigateDay(-1) : navigateWeek(-1)} className={`p-2 hover:bg-background rounded-xl transition-colors ${isRTL ? 'rotate-180' : ''}`}><ChevronLeft size={20} /></button>
                    <div className="flex flex-col items-center px-6 border-x border-border min-w-[140px]">
                        <span className="text-[10px] font-bold uppercase text-primary tracking-widest">{currentDate.toLocaleDateString(language, { weekday: 'long' })}</span>
                        <span className="text-sm font-bold text-text">{currentDate.toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <button onClick={() => isMobile ? navigateDay(1) : navigateWeek(1)} className={`p-2 hover:bg-background rounded-xl transition-colors ${isRTL ? 'rotate-180' : ''}`}><ChevronRight size={20} /></button>
                </div>
            </div>

            {isMobile ? (
                <div className="space-y-8">
                    <div className="flex gap-3 overflow-x-auto pb-4 px-1 scroll-hide">
                        {weekDates.map(wd => {
                            const isSelected = wd.date === formattedToday;
                            return (
                                <button 
                                    key={wd.date}
                                    onClick={() => setCurrentDate(wd.raw)}
                                    className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center border transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-sidebar border-border text-text-secondary'}`}
                                >
                                    <span className="text-[9px] font-bold uppercase tracking-wider">{wd.name.substring(0,3)}</span>
                                    <span className="text-lg font-bold mt-1">{wd.display.split(' ')[0]}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-4">
                        {todaysClasses.length > 0 ? todaysClasses.map(s => {
                            const isLive = checkIsLive(s.date, s.time, s.endTime);
                            const status = getAttendanceStatus(s.id, s.date);
                            
                            return (
                                <div key={s.id} className={`p-6 bg-sidebar rounded-2xl border transition-all ${isLive ? 'border-success ring-4 ring-success/10' : 'border-border'} text-start shadow-md`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 bg-background rounded text-[9px] font-bold text-text-secondary uppercase tracking-wider border border-border">{s.type}</span>
                                                {isLive && <span className="flex items-center gap-1 text-[8px] font-bold uppercase text-success tracking-widest"><div className="w-1 h-1 bg-success rounded-full animate-pulse" />Live Now</span>}
                                            </div>
                                            <h3 className="font-bold text-lg leading-tight truncate text-text">{s.name}</h3>
                                        </div>
                                        <div className="shrink-0">
                                            {typeof status === 'string' ? (
                                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${status === 'present' ? 'bg-success/10 text-success' : status === 'absent' ? 'bg-danger/10 text-danger' : 'bg-background text-text-secondary'}`}>
                                                    {status === 'present' ? <CheckCircle2 size={14} /> : status === 'absent' ? <XCircle size={14} /> : <Clock size={14} />}
                                                    {t(`schedule.${status}`)}
                                                </div>
                                            ) : (
                                                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-lg flex flex-col items-center border border-primary/20">
                                                    <span className="text-[8px] font-bold uppercase mb-0.5 tracking-widest">{t('schedule.present')}</span>
                                                    <span className="text-base font-bold">{status}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                                        <div className="flex items-center gap-2 text-text-secondary">
                                            <Clock size={14} className="text-primary" />
                                            <span className="text-[10px] font-bold">{s.time} — {s.endTime}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-text-secondary">
                                            <MapPin size={14} className="text-primary" />
                                            <span className="text-[10px] font-bold truncate">{s.room}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-20 text-center text-text-secondary bg-sidebar rounded-3xl border border-border shadow-inner opacity-40">
                                <Calendar size={48} className="mx-auto mb-4" />
                                <h4 className="font-bold uppercase tracking-widest text-[10px]">No sessions today</h4>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-sidebar border border-border rounded-3xl overflow-hidden shadow-xl relative">
                    <div className="grid grid-cols-[100px_repeat(7,1fr)] bg-border gap-[1px]">
                        <div className="bg-background sticky left-0 z-20" />
                        {weekDates.map(wd => (
                            <div key={wd.date} className={`p-5 text-center border-b border-border transition-colors ${wd.date === formattedToday ? 'bg-primary/5' : 'bg-sidebar'}`}>
                                <div className={`text-xs font-black uppercase tracking-widest ${wd.date === formattedToday ? 'text-primary' : 'text-text'}`}>{wd.name}</div>
                                <div className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">{wd.display}</div>
                            </div>
                        ))}
                        
                        {HOURS_OF_DAY.map(hour => (
                            <React.Fragment key={hour}>
                                <div className="bg-background flex flex-col items-center justify-center p-4 text-[11px] font-bold text-text-secondary uppercase tracking-widest sticky left-0 z-10 border-r border-border">
                                    {hour}
                                </div>
                                {weekDates.map(wd => {
                                    const sessions = classes.filter(c => c.date === wd.date && c.time === hour);
                                    const isTodayCell = wd.date === formattedToday;
                                    
                                    return (
                                        <div key={`${wd.date}-${hour}`} className={`min-h-[140px] p-3 border-b border-border transition-colors ${isTodayCell ? 'bg-primary/5' : 'bg-sidebar'}`}>
                                            {sessions.map(s => {
                                                const isLive = checkIsLive(s.date, s.time, s.endTime);
                                                const status = getAttendanceStatus(s.id, s.date);
                                                
                                                return (
                                                    <div key={s.id} className={`h-full flex flex-col justify-between p-4 rounded-xl border-l-4 transition-all hover:shadow-lg ${isLive ? 'bg-success/5 border-success' : 'bg-background border-primary'} text-start shadow-sm`}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[8px] font-bold uppercase text-text-secondary tracking-widest">{s.type}</span>
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${status === 'present' ? 'text-success' : status === 'absent' ? 'text-danger' : 'text-text-secondary/30'}`}>
                                                                {typeof status === 'string' ? (
                                                                    status === 'present' ? <CheckCircle2 size={14} /> : status === 'absent' ? <XCircle size={14} /> : <Info size={12} />
                                                                ) : <span className="text-[10px] font-bold text-primary">{status}</span>}
                                                            </div>
                                                        </div>
                                                        <p className="font-bold text-xs text-text truncate mb-4 uppercase tracking-tight">{s.name}</p>
                                                        <div className="space-y-1.5 border-t border-border pt-3">
                                                            <div className="flex items-center gap-2 text-text-secondary">
                                                                <MapPin size={10} className="text-primary" />
                                                                <span className="text-[9px] font-bold truncate">{s.room}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-text-secondary">
                                                                <Clock size={10} className="text-primary" />
                                                                <span className="text-[9px] font-bold">{s.time} — {s.endTime}</span>
                                                            </div>
                                                        </div>
                                                    </div>
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