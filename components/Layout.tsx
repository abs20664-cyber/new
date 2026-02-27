
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlatform } from '../contexts/PlatformContext';
import Logo from './Logo';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
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
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isLangOpen, setIsLangOpen] = useState(false);
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

        return () => unsub();
    }, [user, audioEnabled]);

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, collections.notifications, id), { read: true });
        } catch (e) { console.error("[Ledger] Update failed", e); }
    };

    const handleNotificationClick = async (notif: Notification) => {
        enableAudio();
        await markAsRead(notif.id);
        setIsNotifOpen(false);
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
            default: return 'text-institutional-500 bg-institutional-500/10';
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
            { path: `/profile/${user?.id}`, label: t('nav.myProfile'), icon: UserCircle },
            { path: '/settings', label: t('nav.settings'), icon: Settings }
        ]
        : user?.role === 'teacher'
        ? [
            { path: '/', label: t('nav.hub'), icon: LayoutDashboard },
            { path: '/schedule', label: t('nav.schedule'), icon: CalendarDays },
            { path: '/assignments', label: t('nav.dropbox'), icon: FolderOpen },
            { path: '/inbox', label: t('nav.inbox'), icon: MessageSquare },
            { path: `/profile/${user?.id}`, label: t('nav.myProfile'), icon: UserCircle },
        ]
        : [
            { path: '/', label: t('nav.identity'), icon: QrCode },
            { path: '/schedule', label: t('nav.schedule'), icon: CalendarDays },
            { path: '/assignments', label: t('nav.dropbox'), icon: FolderOpen },
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
                        className="glass p-5 rounded-2xl shadow-2xl border border-white/20 dark:border-white/5 flex items-start gap-4 animate-in slide-in-from-right-10 fade-in duration-500 cursor-pointer group hover:scale-[1.02] active:scale-95 transition-all"
                        style={{ zIndex: 500 + idx }}
                    >
                        <div className={`p-3 rounded-xl shrink-0 ${getColorForType(toast.type)} shadow-sm`}>
                            {getIconForType(toast.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">{toast.title}</p>
                                <span className="text-[9px] font-bold text-institutional-400">{t('common.justNow')}</span>
                            </div>
                            <p className="text-sm font-semibold text-institutional-900 dark:text-white line-clamp-2 leading-tight">{toast.message}</p>
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

            {/* NOTIFICATION DRAWER */}
            {isNotifOpen && (
                <>
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-[110] animate-in fade-in duration-300" onClick={() => setIsNotifOpen(false)} />
                    <aside className={`fixed top-0 bottom-0 w-full sm:w-[450px] bg-surface dark:bg-institutional-950 z-[120] border-institutional-300 dark:border-institutional-800 shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col ${isRTL ? 'start-0 border-e' : 'end-0 border-s'}`}>
                        <div className="p-8 flex justify-between items-center border-b border-institutional-200 dark:border-institutional-800">
                            <div>
                                <h3 className="text-2xl font-black tracking-tight text-institutional-900 dark:text-white uppercase">Activity Ledger</h3>
                                <p className="text-xs font-bold text-institutional-400 uppercase tracking-widest mt-1">Institutional Records</p>
                            </div>
                            <button onClick={() => setIsNotifOpen(false)} className="p-3 bg-institutional-100 dark:bg-institutional-800 rounded-2xl text-institutional-500 hover:text-danger transition-all"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                                    <Bell size={64} className="mb-6 text-institutional-300" />
                                    <p className="font-black text-xs uppercase tracking-[0.4em]">Vault is Empty</p>
                                </div>
                            ) : notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleNotificationClick(n)}
                                    className={`p-6 rounded-3xl border transition-all cursor-pointer relative group ${n.read ? 'bg-transparent border-transparent opacity-60' : 'bg-surface dark:bg-institutional-900 border-institutional-200 dark:border-institutional-800 shadow-sm hover:shadow-xl hover:-translate-y-1'}`}
                                >
                                    {!n.read && <div className={`absolute top-6 ${isRTL ? 'start-6' : 'end-6'} w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]`} />}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-3 rounded-2xl ${getColorForType(n.type)} shadow-sm`}>
                                            {getIconForType(n.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase text-institutional-400 tracking-[0.1em]">{n.title}</p>
                                            <p className="text-[9px] font-bold text-institutional-500 mt-0.5">
                                                {n.timestamp ? new Date(n.timestamp.seconds * 1000).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : '...'}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-institutional-800 dark:text-white font-semibold leading-relaxed">{n.message}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 border-t border-institutional-200 dark:border-institutional-800 bg-institutional-50/50 dark:bg-institutional-900/50">
                            <button 
                                onClick={markAllRead} 
                                disabled={unreadCount === 0}
                                className="w-full bg-primary text-white p-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary-hover disabled:opacity-30 disabled:hover:bg-primary shadow-lg shadow-primary/20 transition-all"
                            >
                                Acknowledge All Entries
                            </button>
                        </div>
                    </aside>
                </>
            )}

            {/* DESKTOP SIDEBAR */}
            <aside className={`hidden lg:flex fixed inset-y-0 ${isRTL ? 'end-0 border-s' : 'start-0 border-e'} w-[300px] bg-surface dark:bg-institutional-950 border-institutional-200 dark:border-institutional-800 z-50 flex-col transition-all duration-300`}>
                <div className="p-10 flex items-center gap-4">
                    <Logo size="md" />
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-institutional-950 dark:text-white uppercase">{t('appName')}</h1>
                        <p className="text-[9px] font-black tracking-[0.3em] text-primary uppercase">{t('appSubName')}</p>
                    </div>
                </div>

                <div className="px-6 mb-8">
                    <div className="relative group">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-400 group-focus-within:text-primary transition-colors`} size={16} />
                        <input 
                            type="text" 
                            placeholder="Global Search..." 
                            className={`w-full bg-institutional-50 dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-2xl ${isRTL ? 'pr-12' : 'pl-12'} py-3.5 text-xs font-bold outline-none focus:border-primary transition-all`} 
                        />
                    </div>
                </div>

                <nav className="flex-1 py-4 space-y-2 overflow-y-auto px-6 scroll-hide">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-institutional-400 mb-4 px-2">Navigation</p>
                    {routes.map((route) => {
                        const Icon = route.icon;
                        const isActive = currentPath === route.path;
                        return (
                            <button 
                                key={route.path}
                                onClick={() => { enableAudio(); onNavigate(route.path); }}
                                className={`group w-full flex items-center justify-between px-5 py-4 rounded-[1.25rem] font-bold transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-institutional-500 hover:bg-institutional-100 dark:hover:bg-institutional-900 dark:text-institutional-400 hover:text-primary'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <Icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="uppercase tracking-widest text-[11px] font-black">{route.label}</span>
                                </div>
                                {isActive && <ChevronRight size={14} className={`${isRTL ? 'rotate-180' : ''}`} />}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-8 mt-auto border-t border-institutional-200 dark:border-institutional-800 space-y-4">
                    <div className="flex items-center gap-2 p-1.5 bg-institutional-100 dark:bg-institutional-900 rounded-2xl border border-institutional-200 dark:border-institutional-800">
                        <button 
                            onClick={toggleTheme} 
                            className="flex-1 flex items-center justify-center py-3 rounded-xl hover:bg-surface dark:hover:bg-institutional-800 transition-all text-institutional-500 hover:text-primary"
                            title="Toggle Theme"
                        >
                            {isDarkMode ? <Sun size={18} className="text-warning" /> : <Moon size={18} className="text-primary" />}
                        </button>
                        <div className="w-px h-6 bg-institutional-200 dark:bg-institutional-800" />
                        <button 
                            onClick={() => { enableAudio(); setIsNotifOpen(true); }} 
                            className="flex-1 flex items-center justify-center py-3 rounded-xl hover:bg-surface dark:hover:bg-institutional-800 transition-all text-institutional-500 hover:text-primary relative"
                            title="Notifications"
                        >
                            <Bell size={18} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-4 w-2 h-2 bg-danger rounded-full" />
                            )}
                        </button>
                    </div>

                    <button 
                        onClick={() => setIsLangOpen(!isLangOpen)} 
                        className="flex items-center justify-between w-full px-5 py-4 rounded-2xl border border-institutional-200 dark:border-institutional-800 hover:bg-institutional-100 dark:hover:bg-institutional-900 transition-all text-institutional-600 dark:text-institutional-300 relative"
                    >
                        <div className="flex items-center gap-4">
                            <Languages size={18} className="text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest">{languages.find(l => l.code === language)?.label}</span>
                        </div>
                        {isLangOpen && (
                            <div className={`absolute bottom-full mb-3 inset-x-0 bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 z-50 p-2`}>
                                {languages.map(l => (
                                    <button 
                                        key={l.code} 
                                        onClick={(e) => { e.stopPropagation(); setLanguage(l.code); setIsLangOpen(false); }}
                                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-institutional-100 dark:hover:bg-institutional-800 transition-all text-xs font-black uppercase ${language === l.code ? 'text-primary bg-primary/5' : 'text-institutional-500'}`}
                                    >
                                        <span className="text-xl">{l.flag}</span>
                                        <span>{l.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </button>

                    <button onClick={logout} className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl bg-danger/5 text-danger hover:bg-danger/10 transition-all group">
                        <Power size={18} className={`transition-transform duration-300 ${isRTL ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
                        <span className="text-xs font-black uppercase tracking-widest">{t('common.disconnect')}</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className={`flex-1 flex flex-col h-full relative overflow-hidden ${!isMobile ? (isRTL ? 'lg:mr-[300px]' : 'lg:ml-[300px]') : ''} bg-body transition-all duration-500`}>
                <header className={`shrink-0 z-40 sticky top-0 transition-all duration-500 ${isMobile ? 'h-0' : 'h-24 bg-surface/80 dark:bg-institutional-950/80 backdrop-blur-xl border-b border-institutional-200 dark:border-institutional-800 flex items-center justify-between px-16'}`}>
                    {!isMobile && (
                        <>
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black tracking-tight text-institutional-950 dark:text-white uppercase leading-none">{getPageTitle()}</h2>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all ${audioEnabled ? 'border-success/20 text-success bg-success/5' : 'border-danger/20 text-danger bg-danger/5 animate-pulse'}`}>
                                    {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                </div>

                                <div className="flex items-center gap-4 h-12 px-2.5 bg-institutional-100 dark:bg-institutional-900 rounded-2xl border border-institutional-200 dark:border-institutional-800">
                                    <button onClick={toggleTheme} className="p-2.5 text-institutional-500 hover:text-primary transition-all active:scale-90" aria-label="Toggle Theme">
                                        {isDarkMode ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-primary" />}
                                    </button>
                                    <div className="w-px h-6 bg-institutional-200 dark:bg-institutional-800 mx-1" />
                                    <button onClick={() => { enableAudio(); setIsNotifOpen(true); }} className="relative p-2.5 text-institutional-500 hover:text-primary transition-all active:scale-90">
                                        <Bell size={20} />
                                        {unreadCount > 0 && (
                                            <span className={`absolute top-2 ${isRTL ? 'start-2' : 'end-2'} w-4.5 h-4.5 bg-danger text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-surface dark:border-institutional-950 animate-bounce`}>
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>
                                    <div className="w-px h-6 bg-institutional-200 dark:bg-institutional-800 mx-1" />
                                    <button onClick={logout} className="p-2.5 text-institutional-500 hover:text-danger transition-all active:scale-90">
                                        <Power size={20} />
                                    </button>
                                </div>
                                
                                <div 
                                    onClick={() => onNavigate(`/profile/${user?.id}`)}
                                    className="flex items-center gap-3 bg-institutional-100 dark:bg-institutional-900 p-2 pr-4 rounded-2xl border border-institutional-200 dark:border-institutional-800 cursor-pointer hover:bg-institutional-200 dark:hover:bg-institutional-800 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white font-black text-[11px] uppercase shadow-lg shadow-primary/20">
                                        {user?.name.charAt(0)}
                                    </div>
                                    <div className="text-start">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-institutional-900 dark:text-white">{user?.name.split(' ')[0]}</p>
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-institutional-400 leading-none mt-0.5">{user?.role}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </header>

                {/* MOBILE FLOATING TOP BAR */}
                {isMobile && (
                    <div className="fixed top-4 inset-x-0 z-[60] px-3 pointer-events-none">
                        <div className="flex items-center justify-between w-full">
                            <div className="bg-surface/90 dark:bg-institutional-900/90 backdrop-blur-2xl border border-institutional-200 dark:border-institutional-800 p-2 px-3 shadow-2xl rounded-2xl flex items-center gap-2 pointer-events-auto">
                                <Logo size="sm" />
                                <h2 className="text-[10px] sm:text-xs font-black tracking-tight text-institutional-950 dark:text-white uppercase truncate max-w-[100px] sm:max-w-[120px]">{getPageTitle()}</h2>
                            </div>

                            <div className="bg-surface/90 dark:bg-institutional-900/90 backdrop-blur-2xl border border-institutional-200 dark:border-institutional-800 p-1.5 shadow-2xl rounded-2xl flex items-center gap-1 pointer-events-auto">
                                <button onClick={toggleTheme} className="p-1.5 sm:p-2 text-institutional-500 hover:text-primary transition-all active:scale-90">
                                    {isDarkMode ? <Sun size={16} className="text-warning" /> : <Moon size={16} className="text-primary" />}
                                </button>
                                <button onClick={() => { enableAudio(); setIsNotifOpen(true); }} className="relative p-1.5 sm:p-2 text-institutional-500 hover:text-primary transition-all active:scale-90">
                                    <Bell size={16} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-danger text-white text-[7px] font-black flex items-center justify-center rounded-full border border-surface dark:border-institutional-950">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>
                                <button onClick={logout} className="p-1.5 sm:p-2 text-institutional-500 hover:text-danger transition-all active:scale-90">
                                    <Power size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`flex-1 overflow-y-auto p-3 sm:p-6 lg:p-12 relative scroll-smooth ${isMobile ? 'pb-28 pt-20' : ''}`}>
                    <div className="max-w-[1400px] mx-auto">
                        {children}
                    </div>
                </div>

                {isMobile && (
                    <div className="fixed bottom-4 inset-x-0 flex justify-center z-50 px-2 pointer-events-none">
                        <nav className="bg-surface/90 dark:bg-institutional-900/90 backdrop-blur-2xl border border-institutional-200 dark:border-institutional-800 flex items-center overflow-x-auto scroll-smooth scrollbar-hide p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] gap-1 pointer-events-auto max-w-full">
                            {routes.map((route) => {
                                const Icon = route.icon;
                                const isActive = currentPath === route.path;
                                return (
                                    <button 
                                        key={route.path}
                                        onClick={() => { enableAudio(); onNavigate(route.path); }}
                                        className={`flex-shrink-0 flex flex-col items-center gap-1 p-2.5 rounded-[1.5rem] transition-all min-w-[60px] relative ${isActive ? 'text-primary bg-primary/5 scale-105' : 'text-institutional-400 hover:text-institutional-600 dark:hover:text-institutional-200'}`}
                                    >
                                        <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                                        <span className={`text-[7px] font-black uppercase tracking-[0.1em] transition-all ${isActive ? 'opacity-100' : 'opacity-60'}`}>{route.label}</span>
                                        {isActive && <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                )}
            </main>
        </div>
    );
};
