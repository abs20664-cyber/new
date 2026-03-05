import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { AppLanguage } from '../types';
import { Save, Lock, Mail, User as UserIcon, CheckCircle, AlertCircle, Languages } from 'lucide-react';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const { t, language: currentLang, setLanguage, isRTL } = useLanguage();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setStatus(null);

        try {
            const updates: any = {};
            if (name !== user.name) updates.name = name;
            
            if (email && email !== user.email) {
                updates.email = email;
            }
            if (password.trim()) {
                updates.password = password;
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, collections.users, user.id), updates);
                setStatus({ type: 'success', msg: t('settings.updated') });
            } else {
                setStatus({ type: 'success', msg: t('settings.updated') });
            }
            
            setPassword('');
        } catch (error: any) {
            setStatus({ type: 'error', msg: t('common.error') + ': ' + error.message });
        }
    };

    const languages: { code: AppLanguage; label: string; flag: string }[] = [
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'ar', label: 'العربية', flag: '🇩🇿' }
    ];

    return (
        <div className="max-w-2xl mx-auto">
             <div className="mb-10 text-start">
                <h2 className="text-3xl font-black tracking-tighter uppercase text-text">{t('nav.settings')}</h2>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mt-2">{t('settings.manageCredentials')}</p>
            </div>

            <div className="p-8 md:p-10 rounded-2xl bg-sidebar border border-border">
                {status && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-xs font-bold uppercase tracking-wide ${status.type === 'success' ? 'bg-secondary/10 text-secondary' : 'bg-danger/10 text-danger'}`}>
                        {status.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {status.msg}
                    </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-6">
                    <div className="space-y-1 text-start">
                        <label className="text-xs font-bold uppercase text-text-secondary mx-2">{t('settings.displayName')}</label>
                        <div className="relative mt-2">
                            <UserIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-text-secondary`} size={18} />
                            <input 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className={`w-full bg-background ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border-2 border-border font-bold focus:border-primary outline-none transition-colors text-text`}
                            />
                        </div>
                    </div>

                    <div className="space-y-1 text-start">
                        <label className="text-xs font-bold uppercase text-text-secondary mx-2">{t('login.email')}</label>
                        <div className="relative mt-2">
                            <Mail className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-text-secondary`} size={18} />
                            <input 
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className={`w-full bg-background ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border-2 border-border font-bold focus:border-primary outline-none transition-colors text-text`}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1 text-start">
                        <label className="text-xs font-bold uppercase text-text-secondary mx-2">{t('settings.newPassword')}</label>
                        <div className="relative mt-2">
                            <Lock className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-text-secondary`} size={18} />
                            <input 
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className={`w-full bg-background ${isRTL ? 'pr-12' : 'pl-12'} p-4 rounded-xl border-2 border-border font-bold focus:border-primary outline-none transition-colors text-text`}
                            />
                        </div>
                    </div>

                    <div className="space-y-3 text-start">
                        <label className="text-xs font-bold uppercase text-text-secondary mx-2 flex items-center gap-2">
                           <Languages size={12} /> {t('settings.language')}
                        </label>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                            {languages.map(l => (
                                <button
                                    key={l.code}
                                    type="button"
                                    onClick={() => setLanguage(l.code)}
                                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all h-28 ${currentLang === l.code ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30'}`}
                                >
                                    <span className="text-2xl">{l.flag}</span>
                                    <span className="text-xs font-bold uppercase">{l.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full bg-primary text-white p-4 rounded-xl font-bold uppercase tracking-wider shadow-lg shadow-primary/30 hover:bg-primary/90 transition-transform flex items-center justify-center gap-2 mt-4"
                    >
                        <Save size={18} /> {t('settings.updateCredentials')}
                    </button>
                </form>
            </div>
        </div>
    );
};
export default Settings;