import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle, ChevronDown, GraduationCap, Globe, UserPlus, LogIn } from 'lucide-react';
import { collection, getDocs, query, where, doc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db, collections, auth } from '../services/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { User, AppLanguage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';

const Login: React.FC = () => {
    const { login } = useAuth();
    const { t, language, setLanguage, isRTL } = useLanguage();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState<UserRole>('student');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
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
            if (isSignUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, collections.users, userCredential.user.uid), {
                    email,
                    name,
                    role,
                    createdAt: Timestamp.now()
                });
                await login(email, password);
            } else {
                const q = query(collection(db, collections.users), where('email', '==', email));
                const snap = await getDocs(q);
                if (snap.empty) throw new Error("Invalid email or password.");
                
                const u = { id: snap.docs[0].id, ...snap.docs[0].data() } as User;

                if (u.mustChangePassword) {
                    setPendingUser(u);
                    setIsSubmitting(false);
                } else {
                    await login(email, password); 
                }
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
        <div className={`min-h-screen flex bg-institutional-50 relative overflow-hidden ${isRTL ? 'font-arabic' : ''}`}>
            <div className="w-full flex items-center justify-center p-6 sm:p-12 bg-institutional-50 relative">
                {/* Subtle Background Detail for Right Side */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.02]">
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
                            <div className="flex p-1 bg-institutional-50 rounded-full border border-institutional-100">
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => setLanguage(lang.code)}
                                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${language === lang.code ? 'bg-institutional-50 text-primary shadow-sm' : 'text-institutional-600 hover:text-institutional-600'}`}
                                    >
                                        {lang.code}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <h2 className="text-4xl font-serif text-institutional-900 tracking-tight leading-tight mb-3">
                            {pendingUser ? t('economic.changePassword') : t('login.welcome')}
                        </h2>
                        <p className="text-institutional-600 text-sm font-medium">
                            {pendingUser ? t('login.updatePasswordPrompt') : t('login.enterDetailsPrompt')}
                        </p>
                    </motion.div>


                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mb-8 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold"
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
                                    <label className="text-[10px] font-black uppercase text-institutional-600 tracking-[0.2em] mb-2 block px-1">{t('login.newPassword')}</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-600 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder={t('login.minCharacters')} 
                                            className={`w-full bg-institutional-50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-institutional-100 font-bold focus:border-primary focus:bg-institutional-50 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase text-institutional-600 tracking-[0.2em] mb-2 block px-1">{t('login.confirmPassword')}</label>
                                    <div className="relative group">
                                        <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-600 group-focus-within:text-primary transition-colors`} size={20} />
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder={t('login.repeatPassword')} 
                                            className={`w-full bg-institutional-50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-2xl border-2 border-institutional-100 font-bold focus:border-primary focus:bg-institutional-50 outline-none text-sm transition-all`}
                                            required 
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-institutional-50 p-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                                >
                                    {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                                    <span>{t('login.updateAndLogin')}</span>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPendingUser(null)}
                                    className="w-full text-[10px] font-black uppercase text-institutional-600 tracking-widest hover:text-institutional-600 transition-all"
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
                                <div className="space-y-6">
                                    {isSignUp && (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-institutional-600 dark:text-institutional-400 mb-2 block px-1">Name</label>
                                                <div className="relative group">
                                                    <UserPlus className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-600 group-focus-within:text-primary transition-colors`} size={20} />
                                                    <input 
                                                        type="text" 
                                                        value={name}
                                                        onChange={(e) => setName(e.target.value)}
                                                        placeholder="Full Name" 
                                                className={`w-full bg-institutional-50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border border-institutional-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all`}
                                                        required 
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-institutional-600 dark:text-institutional-400 mb-2 block px-1">{t('profile.role')}</label>
                                                <div className="relative group">
                                                    <GraduationCap className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-600 group-focus-within:text-primary transition-colors`} size={20} />
                                                    <select 
                                                        value={role}
                                                        onChange={(e) => setRole(e.target.value as UserRole)}
                                                        className={`w-full bg-institutional-50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border border-institutional-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all appearance-none cursor-pointer`}
                                                        required
                                                    >
                                                        <option value="student">{t('roles.student')}</option>
                                                        <option value="teacher">{t('roles.teacher')}</option>
                                                        <option value="admin">{t('roles.admin')}</option>
                                                        <option value="economic">{t('roles.economic')}</option>
                                                    </select>
                                                    <ChevronDown className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-institutional-600 pointer-events-none`} size={16} />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <label className="text-xs font-semibold text-institutional-600 mb-2 block px-1">{t('login.email')}</label>
                                        <div className="relative group">
                                            <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-600 group-focus-within:text-primary transition-colors`} size={20} />
                                            <input 
                                                type="email" 
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="name@institution.edu.dz" 
                                                className={`w-full bg-institutional-50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border border-institutional-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all`}
                                                required 
                                            />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-semibold text-institutional-600 mb-2 block px-1">{t('login.password')}</label>
                                        <div className="relative group">
                                            <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-600 group-focus-within:text-primary transition-colors`} size={20} />
                                            <input 
                                                type="password" 
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••" 
                                                className={`w-full bg-institutional-50 ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border border-institutional-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none text-sm transition-all`}
                                                required 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full bg-primary text-institutional-50 p-4 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                                >
                                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isSignUp ? <UserPlus size={18} /> : <LogIn size={18} />)}
                                    <span>{isSubmitting ? t('login.verifying') : (isSignUp ? 'Sign Up' : t('login.authenticate'))}</span>
                                </button>
                                <div className="mt-4 text-center">
                                    <button 
                                        type="button"
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="text-xs font-medium text-institutional-600 hover:text-primary transition-all"
                                    >
                                        {isSignUp ? 'Already have an account? Login' : 'Need an account? Sign Up'}
                                    </button>
                                </div>
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
                            className="text-xs font-medium text-institutional-600 hover:text-primary transition-all flex items-center justify-center gap-2 mx-auto py-2"
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
                                        className="w-full text-left bg-institutional-50 hover:bg-institutional-50 p-4 rounded-xl border border-institutional-200 transition-all group active:scale-[0.98] shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-institutional-50 shadow-sm ${u.role === 'admin' ? 'bg-rose-500' : u.role === 'teacher' ? 'bg-primary' : 'bg-emerald-500'}`}>
                                                    {u.role.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-institutional-900 font-semibold text-sm">{u.name}</p>
                                                    <p className="text-xs text-institutional-600 capitalize">{u.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="mt-12 pt-8 border-t border-institutional-100 flex flex-col items-center justify-center gap-3 text-institutional-600">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-institutional-600">
                            الجمهورية الجزائرية الديمقراطية الشعبية
                        </p>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Globe size={14} />
                                <span className="text-xs font-medium">MESRS Platform</span>
                            </div>
                            <div className="w-1 h-1 bg-institutional-300 rounded-full" />
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
