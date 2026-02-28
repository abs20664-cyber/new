
import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlatform } from '../contexts/PlatformContext';
import { Copy, Check, ShieldCheck, User as UserIcon, QrCode as QrIcon, Fingerprint } from 'lucide-react';

const QRIdentity: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { isMobile } = usePlatform();
    const [copied, setCopied] = useState(false);
    
    const qrData = JSON.stringify({
        id: String(user?.id || ''),
        name: String(user?.name || '')
    });

    const handleCopyId = () => {
        if (!user?.id) return;
        // Fix: Removed non-existent property access 'shortText' on navigator.clipboard which caused an error.
        navigator.clipboard.writeText(user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8 fade-in">
            <div className={`w-full max-w-lg bg-surface dark:bg-institutional-900 rounded-[3rem] shadow-strong border border-institutional-200 dark:border-institutional-800 overflow-hidden relative transition-all duration-500`}>
                
                {/* Security Bar Animation */}
                <div className="absolute top-0 inset-x-0 h-2 bg-institutional-100 dark:bg-institutional-800 overflow-hidden">
                    <div className="w-[40%] h-full bg-primary opacity-50 animate-[scan-line_4s_infinite] rounded-full"></div>
                </div>

                <div className="p-10 md:p-14 flex flex-col items-center text-center">
                    
                    <div className="w-full mb-10 flex flex-col items-center">
                        <div className="w-full flex justify-between items-center mb-10">
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 bg-primary/10 rounded-xl">
                                    <ShieldCheck size={20} className="text-primary" />
                                </div>
                                <div className="text-start">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-institutional-900 dark:text-white leading-none">Status</p>
                                    <p className="text-[9px] font-black uppercase tracking-[0.1em] text-success mt-1">Authenticated</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-institutional-400">Security Lev. 04</span>
                                <div className="flex gap-0.5 mt-1.5">
                                    {[1,2,3,4].map(i => <div key={i} className="w-4 h-1 bg-primary rounded-full"></div>)}
                                    <div className="w-4 h-1 bg-institutional-200 dark:border-institutional-700 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="relative inline-block mb-6 group">
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-[2.5rem] bg-institutional-100 dark:bg-institutional-800 border-2 border-institutional-200 dark:border-institutional-700 flex items-center justify-center text-primary text-5xl font-black shadow-inner transition-transform duration-500 group-hover:scale-105">
                                {user?.name.charAt(0)}
                            </div>
                            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2.5 rounded-2xl border-4 border-surface dark:border-institutional-900 shadow-xl shadow-primary/30 transform rotate-12 transition-transform hover:rotate-0">
                                <Fingerprint size={18} />
                            </div>
                        </div>

                        <h2 className="text-3xl font-black tracking-tight text-institutional-950 dark:text-white mb-2 uppercase">
                            {user?.name}
                        </h2>
                        <div className="px-4 py-1.5 bg-primary/10 rounded-full inline-block">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t('dashboard.studentProfile')}</p>
                        </div>
                    </div>

                    <div className="relative group mb-12">
                        {/* Decorative Corners */}
                        <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary/20 rounded-tl-3xl transition-all group-hover:-top-2 group-hover:-left-2 group-hover:border-primary/40"></div>
                        <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary/20 rounded-br-3xl transition-all group-hover:-bottom-2 group-hover:-right-2 group-hover:border-primary/40"></div>
                        
                        <div className="bg-white p-7 rounded-[3rem] shadow-strong border border-institutional-100 transition-all duration-500 group-hover:scale-[1.03]">
                             <QRCode 
                                value={qrData}
                                size={isMobile ? 200 : 240}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                                // Fix: Removed reference to undefined isDarkMode. fgColor is constant as background is bg-white.
                                fgColor="#0f172a"
                             />
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-3 opacity-40 group-hover:opacity-80 transition-opacity">
                            <QrIcon size={16} className="text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-institutional-950 dark:text-white">{t('dashboard.scanPresence')}</span>
                        </div>
                    </div>

                    <div className="w-full space-y-5">
                        <div className="bg-institutional-50 dark:bg-institutional-800/40 p-6 rounded-3xl border border-institutional-200 dark:border-institutional-800 flex items-center justify-between group transition-all hover:border-primary/30">
                            <div className="text-start overflow-hidden">
                                <p className="text-[9px] font-black uppercase text-institutional-400 tracking-[0.2em] mb-1">{t('dashboard.uniqueId')}</p>
                                <p className="text-sm font-mono font-bold text-institutional-900 dark:text-white truncate tracking-wider">
                                    {user?.id}
                                </p>
                            </div>
                            <button 
                                onClick={handleCopyId}
                                className={`p-4 rounded-2xl transition-all active:scale-90 ${copied ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-surface dark:bg-institutional-700 text-institutional-500 hover:text-primary shadow-sm hover:shadow-xl'}`}
                            >
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-6">
                            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-institutional-200 dark:to-institutional-800"></div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-institutional-500">{t('dashboard.validSession')}</span>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-institutional-200 dark:to-institutional-800"></div>
                        </div>
                    </div>
                </div>

                <div className="bg-institutional-50 dark:bg-institutional-800/80 p-6 px-10 border-t border-institutional-200 dark:border-institutional-800 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest text-institutional-950 dark:text-white leading-none">{t('appName')}</span>
                        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-institutional-400 mt-1">Central OS v3.1</span>
                    </div>
                    <div className="px-4 py-2 bg-surface dark:bg-institutional-900 rounded-xl border border-institutional-200 dark:border-institutional-700">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Secure Channel Alpha</span>
                    </div>
                </div>
            </div>

            {isMobile && (
                <div className="mt-10 text-center max-w-sm animate-in fade-in duration-1000">
                    <p className="text-[11px] font-bold text-institutional-400 uppercase leading-relaxed tracking-wider">
                        {t('dashboard.helperMsg')}
                    </p>
                </div>
            )}

            <style>{`
                @keyframes scan-line {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(250%); }
                }
            `}</style>
        </div>
    );
};

export default QRIdentity;
