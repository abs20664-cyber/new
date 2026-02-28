import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, ChevronDown, ChevronUp, GraduationCap, Globe } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User, AppLanguage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';

const Login: React.FC = () => {
    const { login } = useAuth();
    const { t, language, setLanguage, isRTL } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [showCredentials, setShowCredentials] = useState(false);
    const [pendingUser, setPendingUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, collections.users));
                const users = snap.docs.map(d => d.data() as User);
                setAvailableUsers(users);
            } catch (e) { console.error("Failed to load users", e); }
        };
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try { 
            const q = query(collection(db, collections.users), where('email', '==', email));
            const snap = await getDocs(q);
            if (snap.empty) throw new Error("Invalid email or password.");
            
            const u = { id: snap.docs[0].id, ...snap.docs[0].data() } as User;
            if (u.password !== password) throw new Error("Invalid email or password.");

            if (u.mustChangePassword) {
                setPendingUser(u);
                setIsSubmitting(false);
            } else {
                await login(email, password); 
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed.");
            setIsSubmitting(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingUser) return;
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, collections.users, pendingUser.id), {
                password: newPassword,
                mustChangePassword: false
            });
            await login(pendingUser.email, newPassword);
        } catch (err: any) {
            setError("Failed to update password.");
            setIsSubmitting(false);
        }
    };

    const fillCredentials = (u: User) => {
        setEmail(u.email);
        if (u.password) setPassword(u.password);
    };

    const languages: { code: AppLanguage; label: string; flag: string }[] = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'ar', label: 'العربية', flag: '🇩🇿' }
    ];

    return (
        <div className={`min-h-screen flex bg-background relative overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
            {/* Left Side - Immersive & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 bg-institutional-950">
                {/* Atmospheric Background - Recipe 7 Inspired */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_30%,#1a3a3a_0%,transparent_70%)] opacity-40" />
                    <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#9c1c1c_0%,transparent_60%)] opacity-20" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] mix-blend-overlay" />
                </div>

                {/* Animated Orbs */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                        x: [0, 50, 0],
                        y: [0, -30, 0]
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.2, 0.4, 0.2],
                        x: [0, -40, 0],
                        y: [0, 60, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-algeria-red/10 rounded-full blur-[120px]"
                />
                
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 text-white max-w-xl"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="mb-10 inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl"
                    >
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">System Status: Operational</span>
                    </motion.div>
                    
                    <h1 className="text-7xl xl:text-8xl font-black mb-8 leading-[0.85] tracking-tighter uppercase italic">
                        The Future <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white/80 to-white/40">Of Academic</span> <br />
                        <span className="text-algeria-red drop-shadow-[0_0_30px_rgba(156,28,28,0.4)]">Excellence</span>
                    </h1>
                    
                    <p className="text-xl text-white/60 font-medium leading-relaxed mb-16 max-w-md">
                        Experience the most advanced institutional operating system in the region. Secure. Scalable. Seamless.
                    </p>
                    
                    <div className="flex items-center gap-12">
                        <div className="space-y-1">
                            <p className="text-5xl font-black tracking-tighter">100<span className="text-primary text-2xl">%</span></p>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Encrypted</p>
                        </div>
                        <div className="w-px h-12 bg-white/10" />
                        <div className="space-y-1">
                            <p className="text-5xl font-black tracking-tighter">0.2<span className="text-primary text-2xl">ms</span></p>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Latency</p>
                        </div>
                    </div>
                </motion.div>
                
                {/* Decorative Elements */}
                <div className="absolute bottom-12 left-12 flex items-center gap-4 opacity-30">
                    <div className="w-12 h-px bg-white" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em]">v2.5.0-Stable</span>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-institutional-950 relative">
                {/* Subtle Background Detail for Right Side */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.05]">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_0%,#000_0%,transparent_50%)]" />
                </div>

                <div className="w-full max-w-md relative z-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-16"
                    >
                        <div className="flex items-center justify-between mb-12">
                            <Logo size="lg" />
                            
                            {/* Language Switcher - Modern Pill */}
                            <div className="flex p-1 bg-institutional-50 dark:bg-institutional-900 rounded-full border border-institutional-100 dark:border-institutional-800">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code)}
                                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === lang.code ? 'bg-white dark:bg-institutional-800 text-primary shadow-sm' : 'text-institutional-400 hover:text-institutional-600 dark:hover:text-institutional-200'}`}
                                    >
                                        {lang.code}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <h2 className="text-5xl font-black text-institutional-900 dark:text-white tracking-tighter uppercase leading-[0.9] mb-4">
                            {pendingUser ? t('economic.changePassword') : t('login.welcome')}
                        </h2>
                        <p className="text-institutional-500 text-sm font-medium tracking-tight">
                            {pendingUser ? "Update your security credentials to continue." : "Access the institutional mainframe with your credentials."}
                        </p>
                    </motion.div>


                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-8 p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/20 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-sm font-bold"
                        >
                            <AlertCircle size={18} className="shrink-0" />
                            {error}
                        </motion.div>
                    )}
                    
                    <AnimatePresence mode="wait">
                        {pendingUser ? (
                            <motion.form 
                                key="password-change"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onSubmit={handlePasswordChange} 
                                className="space-y-6"
                            >
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">New Security Passcode</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 6 characters" 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">Confirm Passcode</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repeat new passcode" 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                    <span>Update & Login</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPendingUser(null)}
                                    className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-600 transition-all"
                                >
                                    {t('common.cancel')}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.form 
                                key="login-form"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onSubmit={handleSubmit} 
                                className="space-y-6"
                            >
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">{t('login.email')}</label>
                                    <div className="relative group">
                                        <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Institutional Identifier" 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">{t('login.password')}</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Security Passcode" 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-institutional-900 dark:bg-white text-white dark:text-institutional-950 p-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-black/10 dark:shadow-white/5 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70 group"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} className="group-hover:rotate-12 transition-transform" />}
                                    <span>{isSubmitting ? t('login.verifying') : t('login.authenticate')}</span>
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-16 text-center"
                    >
                        <button 
                            onClick={() => setShowCredentials(!showCredentials)}
                            className="text-[10px] font-black uppercase text-institutional-400 tracking-[0.3em] hover:text-primary transition-all flex items-center justify-center gap-3 mx-auto py-3 group"
                        >
                            <div className="w-8 h-px bg-institutional-200 dark:bg-institutional-800 group-hover:w-12 transition-all" />
                            {showCredentials ? t('common.close') : t('login.demoAccounts')}
                            <div className="w-8 h-px bg-institutional-200 dark:bg-institutional-800 group-hover:w-12 transition-all" />
                        </button>
                    </motion.div>

                    <AnimatePresence>
                        {showCredentials && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 max-h-[300px] overflow-y-auto scroll-hide space-y-3"
                            >
                                {availableUsers.map((u) => (
                                    <button 
                                        key={u.id}
                                        onClick={() => fillCredentials(u)}
                                        className="w-full text-left bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all group active:scale-[0.98]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md ${u.role === 'admin' ? 'bg-rose-500' : u.role === 'teacher' ? 'bg-primary' : 'bg-emerald-500'}`}>
                                                    {u.role.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-bold text-sm">{u.name}</p>
                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{u.role}</p>
                                                </div>
                                            </div>
                                            <ShieldCheck size={16} className="text-slate-200 group-hover:text-primary transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="mt-16 pt-10 border-t border-institutional-100 dark:border-institutional-900 flex items-center justify-center gap-8 opacity-30">
                        <div className="flex items-center gap-2.5">
                            <Globe size={14} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Global Standards</span>
                        </div>
                        <div className="w-1 h-1 bg-institutional-300 rounded-full" />
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck size={14} />
                            <span className="text-[9px] font-black uppercase tracking-[0.3em]">Secure Access</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
