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
            {/* Left Side - Decorative & Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-primary overflow-hidden items-center justify-center p-12">
                {/* Algerian Flag Inspired Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10">
                    <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-algeria-red rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-white rounded-full blur-[120px]" />
                </div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 text-white max-w-lg"
                >
                    <div className="mb-8 inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                        <GraduationCap className="text-white" size={20} />
                        <span className="text-xs font-bold uppercase tracking-widest">Algerian Academic OS</span>
                    </div>
                    
                    <h1 className="text-6xl font-black mb-6 leading-[0.9] tracking-tighter uppercase">
                        Empowering <br />
                        <span className="text-algeria-red">Education</span> <br />
                        in Algeria
                    </h1>
                    
                    <p className="text-lg text-white/80 font-medium leading-relaxed mb-12">
                        Welcome to the next generation of academic management. A secure, modern, and efficient platform designed for the future of Algerian institutions.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-4xl font-black mb-1">100%</p>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Secure Protocol</p>
                        </div>
                        <div>
                            <p className="text-4xl font-black mb-1">24/7</p>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-60">Live Support</p>
                        </div>
                    </div>
                </motion.div>
                
                {/* Floating Elements */}
                <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-20 right-20 w-32 h-32 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm"
                />
                <motion.div 
                    animate={{ y: [0, 20, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-20 left-20 w-24 h-24 bg-algeria-red/10 rounded-full border border-algeria-red/20 backdrop-blur-sm"
                />
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-slate-950">
                <div className="w-full max-w-md">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-12"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <Logo size="lg" />
                            
                            {/* Language Switcher */}
                            <div className="flex gap-2">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${language === lang.code ? 'bg-primary text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {lang.code}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none mb-3">
                            {pendingUser ? t('economic.changePassword') : t('login.welcome')}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">
                            {pendingUser ? "Update your security credentials to continue." : "Please enter your credentials to continue."}
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
                                    className="w-full bg-primary text-white p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                    <span>{isSubmitting ? t('login.verifying') : t('login.authenticate')}</span>
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-12 text-center"
                    >
                        <button 
                            onClick={() => setShowCredentials(!showCredentials)}
                            className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-primary transition-all flex items-center justify-center gap-2 mx-auto py-2 group"
                        >
                            {showCredentials ? t('common.close') : t('login.demoAccounts')}
                            <div className={`transition-transform duration-300 ${showCredentials ? 'rotate-180' : ''}`}>
                                <ChevronDown size={14} />
                            </div>
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
                    
                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="flex items-center gap-2">
                            <Globe size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Global Standards</span>
                        </div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full" />
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Secure Access</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
