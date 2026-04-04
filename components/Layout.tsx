
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlatform } from '../contexts/PlatformContext';
import Logo from './Logo';
import { collection, onSnapshot, query, where, doc, updateDoc, limit } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { Notification, AppLanguage } from '../types';
import { 
    LayoutDashboard, 
    CalendarDays, 
    FolderOpen, 
    MessageSquare, 
    QrCode, 
    Moon, 
    Sun, 
    LogOut,
    Users,
    Settings,
    X,
    Bell,
    Info,
    Mail,
    Volume2,
    VolumeX,
    Power,
    Briefcase,
    ClipboardCheck,
    CalendarCheck,
    CheckCircle2,
    Languages,
    ChevronRight,
    Search,
    UserCircle,
    DollarSign,
    CreditCard
} from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    currentPath: string;
    onNavigate: (path: string) => void;
}

const NOTIFICATION_SOUND_URL = "https://cdn.freesound.org/previews/263/263133_2064400-lq.mp3";

export const Layout: React.FC<LayoutProps> = ({ children, currentPath, onNavigate }) => {
    const { user, logout } = useAuth();
    const { t, language, setLanguage, isRTL } = useLanguage();
    const { isMobile } = usePlatform();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    const [toasts, setToasts] = useState<Notification[]>([]);
    
    const [audioEnabled, setAudioEnabled] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const sessionStartTime = useRef(Date.now());
    const processedIds = useRef<Set<string>>(new Set());

    // Initialize Theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('edu_alg_theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    // Initialize Audio
    useEffect(() => {
        const audio = new Audio(NOTIFICATION_SOUND_URL);
        audio.volume = 0.2;
        audio.preload = "auto";
        audioRef.current = audio;

        const savedPerm = localStorage.getItem('edu_alg_audio_active');
        if (savedPerm === 'true') setAudioEnabled(true);

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                audioRef.current = null;
            }
        };
    }, []);

    const enableAudio = () => {
        if (!audioEnabled && audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                setAudioEnabled(true);
                localStorage.setItem('edu_alg_audio_active', 'true');
            }).catch(() => {});
        }
    };

    const triggerAlertSound = async () => {
        if (!audioRef.current || !audioEnabled) return;
        try {
            audioRef.current.currentTime = 0;
            await audioRef.current.play();
        } catch (error) {}
    };

    const toggleTheme = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        enableAudio();
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        document.documentElement.classList.toggle('dark', nextMode);
        localStorage.setItem('edu_alg_theme', nextMode ? 'dark' : 'light');
    };

    useEffect(() => {
        if (!user) return;
        
        const qNotifs = query(
            collection(db, collections.notifications),
            where('userId', '==', user.id)
        );

        const unsubNotifs = onSnapshot(qNotifs, (snap) => {
            const allNotifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification));
            const sortedNotifs = allNotifs.sort((a, b) => {
                const tA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
                const tB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
                return tB - tA;
            });

            sortedNotifs.forEach(notif => {
                const nTime = notif.timestamp?.toMillis?.() || notif.timestamp?.seconds * 1000 || 0;
                if (!notif.read && nTime > sessionStartTime.current && !processedIds.current.has(notif.id)) {
                    processedIds.current.add(notif.id);
                    setToasts(prev => [...prev, notif]);
                    triggerAlertSound();
                    setTimeout(() => {
                        setToasts(prev => prev.filter(t => t.id !== notif.id));
                    }, 6000);
                }
            });
            setNotifications(sortedNotifs.slice(0, 50));
        });

        // Unread Messages Count
        const qMessages = query(collection(db, collections.messages), where('seen', '==', false), limit(500));
        const unsubMessages = onSnapshot(qMessages, (snap) => {
            let count = 0;
            snap.docs.forEach(d => {
                const m = d.data();
                if (m.senderId !== user.id && m.chatId.includes(user.id)) {
                    count++;
                }
            });
            setUnreadMessagesCount(count);
        });

        return () => {
            unsubNotifs();
            unsubMessages();
        };
    }, [user, audioEnabled]);

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, collections.notifications, id), { read: true });
        } catch (e) { console.error("[Ledger] Update failed", e); }
    };

    const handleNotificationClick = async (notif: Notification) => {
        enableAudio();
        await markAsRead(notif.id);
        setToasts(prev => prev.filter(t => t.id !== notif.id));
        if (notif.link) onNavigate(notif.link);
    };

    const markAllRead = async () => {
        enableAudio();
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => markAsRead(n.id)));
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

    const unreadCount = notifications.filter(n => !n.read).length;

    const routes: any[] = user?.role === 'admin' 
        ? [
            { path: '/', label: t('nav.registry'), icon: Users }, 
            { path: `/profile/${user?.id}`, label: t('nav.myProfile'), icon: UserCircle },
            { path: '/settings', label: t('nav.settings'), icon: Settings }
        ]
        : user?.role === 'economic'
        ? [
            { path: '/', label: t('nav.economic'), icon: DollarSign },
            { path: '/schedule', label: t('nav.schedule'), icon: CalendarDays },
            { path: '/timetable', label: 'Timetable', icon: CalendarCheck },
            { path: `/profile/${user?.id}`, label: t('nav.myProfile'), icon: UserCircle },
            { path: '/settings', label: t('nav.settings'), icon: Settings }
        ]
        : user?.role === 'teacher'
        ? [
            { path: '/', label: t('nav.hub'), icon: LayoutDashboard },
            { path: '/schedule', label: t('nav.schedule'), icon: CalendarDays },
            { path: '/assignments', label: t('nav.homework'), icon: FolderOpen },
            { path: '/inbox', label: t('nav.inbox'), icon: MessageSquare },
            { path: `/profile/${user?.id}`, label: t('nav.myProfile'), icon: UserCircle },
        ]
        : [
            { path: '/', label: t('nav.identity'), icon: QrCode },
            { path: '/schedule', label: t('nav.schedule'), icon: CalendarDays },
            { path: '/assignments', label: t('nav.homework'), icon: FolderOpen },
            { path: '/materials', label: t('nav.cabinet'), icon: Briefcase },
            { path: '/inbox', label: t('nav.inbox'), icon: MessageSquare },
            { path: `/profile/${user?.id}`, label: t('nav.myProfile'), icon: UserCircle },
        ];

    const getPageTitle = () => {
        if (currentPath === '/settings') return t('nav.settings');
        if (currentPath === '/scanner') return t('scanner.title');
        const found = routes.find(r => r.path === currentPath);
        return found ? found.label : t('appName');
    };

    const languages: { code: AppLanguage; label: string; flag: string }[] = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'ar', label: 'العربية', flag: '🇩🇿' }
    ];

    return (
        <div 
            className={`h-screen flex flex-col lg:flex-row overflow-hidden bg-body text-institutional-950 dark:text-institutional-50 transition-all duration-500 ${isRTL ? 'font-arabic' : ''}`}
            onClick={enableAudio} 
        >
            {/* TOAST STACK */}
            <div className={`fixed z-[500] flex flex-col gap-4 p-6 transition-all duration-300 ${isMobile ? 'top-0 inset-x-0' : 'top-6 end-6 w-[400px]'}`}>
                {toasts.map((toast, idx) => (
                    <div 
                        key={toast.id} 
                        onClick={() => handleNotificationClick(toast)}
                        className="glass p-5 rounded-2xl shadow-strong border border-white/20 dark:border-white/5 flex items-start gap-4 animate-in slide-in-from-right-10 fade-in duration-500 cursor-pointer group hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ zIndex: 500 + idx }}
                    >
                        <div className={`p-3 rounded-xl shrink-0 ${getColorForType(toast.type)} shadow-sm`}>
                            {getIconForType(toast.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{toast.title}</p>
                                <span className="text-[9px] font-bold text-institutional-600">{t('common.justNow')}</span>
                            </div>
                            <p className="text-sm font-semibold text-institutional-900 dark:text-institutional-50 line-clamp-2 leading-tight">{toast.message}</p>
                        </div>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setToasts(prev => prev.filter(t => t.id !== toast.id));
                            }} 
                            className="p-1.5 opacity-20 hover:opacity-100 hover:bg-institutional-200 dark:hover:bg-institutional-800 rounded-lg transition-all"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>


            {/* MAIN CONTENT AREA */}
            <main className={`flex-1 flex flex-col h-full relative overflow-hidden bg-body transition-all duration-500`}>
                <motion.header 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`shrink-0 z-40 sticky top-0 transition-all duration-500 ${isMobile ? 'h-0' : 'h-24 bg-surface/80 dark:bg-institutional-950/80 backdrop-blur-xl border-b border-institutional-200 dark:border-institutional-800 flex items-center justify-between px-16'}`}
                >
                    {!isMobile && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="flex items-center gap-4"
                            >
                                <Logo size="sm" />
                                <motion.h1 
                                    key={getPageTitle()}
                                    initial={{ opacity: 0, x: -10, scale: 0.98 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                    className="text-xl font-black tracking-tighter text-institutional-900 dark:text-institutional-50 uppercase"
                                >
                                    {getPageTitle()}
                                </motion.h1>
                            </motion.div>

                            <div 
                                onClick={() => onNavigate(`/profile/${user?.id}`)}
                                className="flex items-center gap-3 bg-institutional-100 dark:bg-institutional-900 p-2 pr-4 rounded-2xl border border-institutional-200 dark:border-institutional-800 cursor-pointer hover:bg-institutional-200 dark:hover:bg-institutional-800 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-institutional-50 font-black text-[11px] uppercase shadow-lg shadow-primary/20">
                                    {user?.name.charAt(0)}
                                </div>
                                <div className="text-start">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-institutional-900 dark:text-institutional-50">{user?.name.split(' ')[0]}</p>
                                    <p className="text-[8px] font-bold uppercase tracking-widest text-institutional-600 leading-none mt-0.5">{user?.role}</p>
                                </div>
                            </div>
                        </>
                    )}
                </motion.header>

                <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-12 relative scroll-smooth pb-36 pt-20">
                    <div className="max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </div>

            {/* BOTTOM NAVIGATION */}
            <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex justify-center">
                <div className="pointer-events-auto overflow-x-auto no-scrollbar max-w-[95vw] sm:max-w-full px-2 pb-4 scroll-smooth snap-x">
                    <div className="flex items-end h-[450px]">
                        <nav className="bg-surface/90 dark:bg-institutional-900/90 backdrop-blur-2xl border border-institutional-200 dark:border-institutional-800 flex items-center p-1.5 px-3 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] gap-1 mb-1">
                            {routes.map((route) => {
                                const Icon = route.icon;
                                const isActive = currentPath === route.path;
                                const isInbox = route.path === '/inbox';
                                return (
                                    <button 
                                        key={route.path}
                                        onClick={() => { enableAudio(); onNavigate(route.path); }}
                                        className={`flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-[1.5rem] transition-all min-w-[64px] relative snap-center ${isActive ? 'text-primary bg-primary/5 scale-105' : 'text-institutional-600 hover:text-institutional-600 dark:hover:text-institutional-200'}`}
                                    >
                                        <div className="relative">
                                            <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                                            {isInbox && unreadMessagesCount > 0 && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
                                            )}
                                        </div>
                                        <span className={`text-[7px] font-black uppercase tracking-[0.1em] transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{route.label}</span>
                                        {isActive && <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />}
                                    </button>
                                );
                            })}
                            
                            <div className="w-px h-8 bg-institutional-200 dark:bg-institutional-800 mx-1 shrink-0 snap-center" />
                            
                            <button onClick={toggleTheme} className="p-3 text-institutional-600 hover:text-primary transition-all shrink-0 snap-center">
                                {isDarkMode ? <Sun size={18} className="text-warning" /> : <Moon size={18} className="text-primary" />}
                            </button>
                            
                            <div className="relative shrink-0 snap-center">
                                <button 
                                    onClick={() => {
                                        setIsLangOpen(!isLangOpen);
                                        setIsNotifOpen(false);
                                    }} 
                                    className={`p-3 transition-all relative ${isLangOpen ? 'text-primary' : 'text-institutional-600 hover:text-primary'}`}
                                >
                                    <Languages size={18} />
                                </button>
                                {isLangOpen && (
                                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-48 bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 z-[100] p-2">
                                        {languages.map(l => (
                                            <button 
                                                key={l.code} 
                                                onClick={(e) => { e.stopPropagation(); setLanguage(l.code); setIsLangOpen(false); }}
                                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-institutional-100 dark:hover:bg-institutional-800 transition-all text-xs font-black uppercase ${language === l.code ? 'text-primary bg-primary/5' : 'text-institutional-600'}`}
                                            >
                                                <span className="text-xl">{l.flag}</span>
                                                <span>{l.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            
                            <div className="relative shrink-0 snap-center">
                                <button 
                                    onClick={() => { 
                                        setIsNotifOpen(!isNotifOpen); 
                                        setIsLangOpen(false);
                                        if (!isNotifOpen) markAllRead(); 
                                    }} 
                                    className={`p-3 transition-all relative ${isNotifOpen ? 'text-primary' : 'text-institutional-600 hover:text-primary'}`}
                                >
                                    <div className="relative">
                                        <Bell size={18} />
                                        {unreadCount > 0 && !isNotifOpen && <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />}
                                    </div>
                                </button>
                                {isNotifOpen && (
                                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 z-[100] p-4">
                                        <h3 className="text-xs font-black uppercase text-institutional-900 dark:text-institutional-50 mb-3">Notifications</h3>
                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                notifications.map(n => (
                                                    <div key={n.id} className="text-xs text-institutional-600 p-2 bg-institutional-100 dark:bg-institutional-800 rounded-xl">
                                                        {n.message}
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-institutional-600">No new notifications.</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <button onClick={logout} className="p-3 text-danger hover:text-danger-hover transition-all shrink-0 snap-center">
                                <Power size={18} />
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
            </main>
        </div>
    );
};
