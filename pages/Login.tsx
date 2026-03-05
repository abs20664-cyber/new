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
            {/* Left Side - Algerian Education Themed */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-algeria-green">
                {/* Subtle Islamic Geometric Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
                
                {/* Beautiful Background Image (Algiers/Architecture) */}
                <img 
                    src="https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=2070&auto=format&fit=crop" 
                    alt="Algerian Architecture" 
                    className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity"
                    referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-algeria-green via-algeria-green/80 to-transparent" />
                
                {/* Decorative Red Accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-algeria-red" />

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 flex flex-col justify-end p-16 w-full h-full text-white"
                >
                    <div className="mb-auto">
                        <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                            <GraduationCap className="text-white" size={18} />
                            <span className="text-xs font-medium tracking-wide">وزارة التعليم العالي والبحث العلمي</span>
                        </div>
                    </div>

                    <div className="max-w-xl">
                        <h1 className="text-5xl xl:text-6xl font-arabic mb-6 leading-[1.2] tracking-tight" dir="rtl">
                            "اطلبوا العلم من المهد إلى اللحد"
                        </h1>
                        
                        <div className="flex items-center gap-4 text-white/80">
                            <div className="w-12 h-px bg-algeria-red" />
                            <p className="text-sm font-medium tracking-widest uppercase">
                                Algerian Academic Excellence
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-slate-950 relative">
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
                        
                        <h2 className="text-4xl font-serif text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                            {pendingUser ? t('economic.changePassword') : t('login.welcome')}
                        </h2>
                        <p className="text-slate-500 text-sm font-medium">
                            {pendingUser ? t('login.updatePasswordPrompt') : t('login.enterDetailsPrompt')}
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
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">{t('login.newPassword')}</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder={t('login.minCharacters')} 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-bold focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 block px-1">{t('login.confirmPassword')}</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={t('login.repeatPassword')} 
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
                                    <span>{t('login.updateAndLogin')}</span>
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
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block px-1">{t('login.email')}</label>
                                    <div className="relative group">
                                        <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="name@institution.edu.dz" 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block px-1">{t('login.password')}</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••" 
                                            className={`w-full bg-slate-50 dark:bg-slate-900/50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-white p-4 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : null}
                                    <span>{isSubmitting ? t('login.verifying') : t('login.authenticate')}</span>
                                </button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="mt-12 text-center"
                    >
                        <button 
                            onClick={() => setShowCredentials(!showCredentials)}
                            className="text-xs font-medium text-slate-500 hover:text-primary transition-all flex items-center justify-center gap-2 mx-auto py-2"
                        >
                            {showCredentials ? t('common.close') : t('login.demoAccounts')}
                            <ChevronDown size={14} className={`transition-transform duration-300 ${showCredentials ? 'rotate-180' : ''}`} />
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
                                        className="w-full text-left bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all group active:scale-[0.98] shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${u.role === 'admin' ? 'bg-rose-500' : u.role === 'teacher' ? 'bg-primary' : 'bg-emerald-500'}`}>
                                                    {u.role.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-slate-900 dark:text-white font-semibold text-sm">{u.name}</p>
                                                    <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-slate-400">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600">
                            الجمهورية الجزائرية الديمقراطية الشعبية
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Globe size={14} />
                                <span className="text-xs font-medium">MESRS Platform</span>
                            </div>
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={14} />
                                <span className="text-xs font-medium">Secure Access</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
