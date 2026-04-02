
import React from 'react';
import QRCode from 'react-qr-code';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { usePlatform } from '../contexts/PlatformContext';
import { QrCode as QrIcon, Fingerprint } from 'lucide-react';
import { safeStringify } from '../utils';

const QRIdentity: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { isMobile } = usePlatform();
    
    const qrData = safeStringify({
        id: String(user?.id || ''),
        name: String(user?.name || '')
    });

    return (
        <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-8 fade-in">
            <div className="w-full max-w-lg academic-card p-10 md:p-14 flex flex-col items-center text-center relative overflow-hidden">
                
                {/* Security Bar Animation */}
                <div className="absolute top-0 inset-x-0 h-2 bg-muted border-b-2 border-border-dark overflow-hidden">
                    <div className="w-[40%] h-full bg-primary opacity-50 animate-[scan-line_4s_infinite] rounded-full border-r-2 border-border-dark"></div>
                </div>

                <div className="w-full mb-10 flex flex-col items-center">
                    <div className="relative inline-block mb-6 group">
                        <div className="w-28 h-28 md:w-32 md:h-32 rounded-[2.5rem] bg-surface border-4 border-border-dark flex items-center justify-center text-primary text-5xl font-display font-bold shadow-pop transition-transform duration-500 group-hover:scale-105">
                            {user?.name.charAt(0)}
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2.5 rounded-2xl border-4 border-border-dark shadow-pop-sm transform rotate-12 transition-transform hover:rotate-0">
                            <Fingerprint size={18} />
                        </div>
                    </div>

                    <h2 className="text-3xl font-display font-bold tracking-tight text-text mb-2 uppercase">
                        {user?.name}
                    </h2>
                    <div className="academic-badge academic-badge-primary">
                        {t('dashboard.studentProfile')}
                    </div>
                </div>

                <div className="relative group">
                    {/* Decorative Corners */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-3xl transition-all group-hover:-top-2 group-hover:-left-2"></div>
                    <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-3xl transition-all group-hover:-bottom-2 group-hover:-right-2"></div>
                    
                    <div className="bg-white p-7 rounded-[3rem] shadow-pop border-4 border-border-dark transition-all duration-500 group-hover:scale-[1.03]">
                         {user?.customQrCodeUrl ? (
                             <img 
                                src={user.customQrCodeUrl} 
                                alt="Custom QR Code" 
                                className="w-full h-full object-contain"
                                style={{ width: isMobile ? 200 : 240, height: isMobile ? 200 : 240 }}
                                referrerPolicy="no-referrer"
                             />
                         ) : (
                             <QRCode 
                                value={qrData}
                                size={isMobile ? 200 : 240}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                viewBox={`0 0 256 256`}
                                fgColor="#141414"
                             />
                         )}
                    </div>
                    <div className="mt-8 flex items-center justify-center gap-3 opacity-40 group-hover:opacity-80 transition-opacity">
                        <QrIcon size={16} className="text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text">{t('dashboard.scanPresence')}</span>
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
