import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User } from '../types';
import { GraduationCap, Mail, Lock, LogIn, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Login: React.FC = () => {
    const { login, directLogin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [showManual, setShowManual] = useState(false);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, collections.users));
                const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
                setAvailableUsers(users);
            } catch (e) { console.error("Failed to load users", e); }
        };
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
        } catch (err: any) {
            console.error("Authentication failed.", err);
        }
    };

    const handleDirectLogin = (user: User) => {
        directLogin(user);
    };

    return (
        <div className="bg-[#f7faf6] font-body text-[#191c1b] min-h-screen flex flex-col">
            <header className="fixed top-0 w-full z-50 bg-[#f8faf9]/80 backdrop-blur-xl border-b border-[#005943]/5">
                <div className="flex justify-between items-center px-8 py-5 max-w-7xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-2xl font-black text-[#005943] font-['Manrope'] tracking-tighter flex items-center gap-2"
                    >
                        <div className="w-8 h-8 bg-[#005943] rounded-lg flex items-center justify-center">
                            <GraduationCap className="text-white w-5 h-5" />
                        </div>
                        Edutrack
                    </motion.div>
                </div>
            </header>
            
            <main className="flex-grow flex items-center justify-center px-6 pt-32 pb-20 relative overflow-hidden">
                {/* Dynamic Background Elements */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#005943] opacity-[0.04] blur-[120px] rounded-full"
                ></motion.div>
                <motion.div 
                    animate={{ 
                        scale: [1, 1.1, 1],
                        x: [0, 50, 0],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[#d7e8e2] opacity-[0.3] blur-[100px] rounded-full"
                ></motion.div>
                
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="w-full max-w-md z-10"
                >
                    <div className="bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_32px_64px_-16px_rgba(0,89,67,0.12)] overflow-hidden border border-white/40">
                        <section className="p-10 md:p-12">
                            <div className="mb-10 text-center md:text-left">
                                <motion.div 
                                    initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    transition={{ 
                                        type: "spring",
                                        stiffness: 260,
                                        damping: 20,
                                        delay: 0.2
                                    }}
                                    whileHover={{ scale: 1.05, rotate: 5 }}
                                    className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#005943] to-[#004232] rounded-2xl mb-8 shadow-xl shadow-[#005943]/20"
                                >
                                    <GraduationCap className="text-white w-8 h-8" />
                                </motion.div>
                                <h1 className="font-['Manrope'] text-4xl font-black tracking-tight text-[#191c1b] mb-3">Direct Access</h1>
                                <p className="text-[#4b5563] text-sm font-medium leading-relaxed opacity-70">Select your profile to sign in directly without authentication.</p>
                            </div>

                            <div className="space-y-3 mb-8">
                                <AnimatePresence>
                                    {availableUsers.map((u, idx) => (
                                        <motion.div 
                                            key={u.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 + (idx * 0.05) }}
                                            className="group flex items-center justify-between p-4 bg-white/40 border border-white/60 rounded-2xl cursor-pointer hover:bg-white hover:border-[#005943]/20 hover:shadow-xl hover:shadow-[#005943]/5 transition-all" 
                                            onClick={() => handleDirectLogin(u)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-xl overflow-hidden ring-4 ring-white/50 shadow-sm">
                                                    <img alt={u.name} className="w-full h-full object-cover" src={`https://ui-avatars.com/api/?name=${u.name}&background=random&bold=true`} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-[#191c1b] tracking-tight">{u.name}</p>
                                                    <p className="text-[9px] font-black text-[#005943] uppercase tracking-[0.15em] opacity-60">{u.role}</p>
                                                </div>
                                            </div>
                                            <div className="w-8 h-8 rounded-lg bg-[#f1f4f1] flex items-center justify-center text-[#717975] group-hover:bg-[#005943] group-hover:text-white transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            <div className="pt-6 border-t border-[#c0c9c4]/10">
                                <button 
                                    onClick={() => setShowManual(!showManual)}
                                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b5563] opacity-60 hover:opacity-100 transition-opacity flex items-center gap-2 mx-auto mb-8"
                                >
                                    {showManual ? 'Hide Manual Login' : 'Show Manual Login'}
                                </button>
                            </div>

                            <AnimatePresence>
                                {showManual && (
                                    <motion.form 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        onSubmit={handleSubmit} 
                                        className="space-y-6 overflow-hidden"
                                    >
                                <div className="space-y-2.5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b5563] ml-1 opacity-60">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#717975] w-5 h-5 group-focus-within:text-[#005943] transition-colors" />
                                        <input 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 bg-white/50 border border-[#c0c9c4]/30 rounded-2xl focus:ring-4 focus:ring-[#005943]/5 focus:border-[#005943] transition-all text-[#191c1b] font-medium placeholder:text-[#717975]/30 outline-none" 
                                            placeholder="name@institution.edu" 
                                            type="email"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4b5563] opacity-60">Password</label>
                                    </div>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#717975] w-5 h-5 group-focus-within:text-[#005943] transition-colors" />
                                        <input 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-14 pl-12 pr-4 bg-white/50 border border-[#c0c9c4]/30 rounded-2xl focus:ring-4 focus:ring-[#005943]/5 focus:border-[#005943] transition-all text-[#191c1b] font-medium placeholder:text-[#717975]/30 outline-none" 
                                            placeholder="••••••••" 
                                            type="password"
                                            required
                                        />
                                    </div>
                                </div>
                                <motion.button 
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="bg-[#005943] w-full h-14 rounded-2xl text-white font-['Manrope'] font-black text-xs tracking-[0.2em] shadow-2xl shadow-[#005943]/20 hover:bg-[#004232] transition-all flex items-center justify-center gap-3 uppercase" 
                                    type="submit"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Sign In
                                </motion.button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Login;
