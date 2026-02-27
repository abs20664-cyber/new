import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { addDoc, collection, Timestamp, getDoc, doc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import { useLanguage } from '../contexts/LanguageContext';
import { CheckCircle, X, ShieldCheck, AlertTriangle, FileUp, Clock } from 'lucide-react';
import { ClassSession } from '../types';

interface ScannerProps {
    classId: string | null;
    onBack: () => void;
}

const VERIFY_SOUND_URL = "https://cdn.freesound.org/previews/263/263133_2064400-lq.mp3";

const Scanner: React.FC<ScannerProps> = ({ classId, onBack }) => {
    const { user } = useAuth();
    const { isMobile } = usePlatform();
    const { t } = useLanguage();

    useEffect(() => {
        if (user?.role === 'economic') {
            onBack();
        }
    }, [user?.role, onBack]);

    const [status, setStatus] = useState<string>(t('scanner.init'));
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isProcessing = useRef(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [sessionData, setSessionData] = useState<ClassSession | null>(null);

    const stopScanning = useCallback(async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                await scannerRef.current.clear();
            } catch (e) {
                console.error("Scanner cleanup failed", e);
            }
        }
    }, []);

    useEffect(() => {
        if (!classId) {
            setErrorMsg(t('scanner.notFound'));
            return;
        }

        const today = new Date().toISOString().split('T')[0];

        const fetchSession = async () => {
            try {
                const snap = await getDoc(doc(db, collections.classes, classId));
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() } as ClassSession;
                    
                    const now = new Date();
                    const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
                    
                    const hasEnded = data.date < today || (data.date === today && nowStr >= data.endTime);
                    const notStarted = data.date > today || (data.date === today && nowStr < data.time);

                    if (hasEnded) {
                        setErrorMsg(t('scanner.expired'));
                    } else if (notStarted) {
                        setErrorMsg(`${t('scanner.scheduled')} ${data.time}.`);
                    } else {
                        setSessionData(data);
                        startScanning(data);
                    }
                } else {
                    setErrorMsg(t('scanner.notFound'));
                }
            } catch (e) {
                setErrorMsg(t('common.error'));
            }
        };

        const startScanning = async (data: ClassSession) => {
            audioRef.current = new Audio(VERIFY_SOUND_URL);
            audioRef.current.volume = 0.4;

            const elementId = "reader";
            const html5QrCode = new Html5Qrcode(elementId);
            scannerRef.current = html5QrCode;

            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 15,
                        qrbox: isMobile ? { width: 300, height: 300 } : { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    async (decodedText) => {
                        if (isProcessing.current) return;
                        isProcessing.current = true;
                        
                        try {
                            let scanData;
                            try { 
                                scanData = JSON.parse(decodedText); 
                            } catch { 
                                scanData = { id: decodedText, name: "ID: " + decodedText.substring(0,6) }; 
                            }
                            
                            const studentId = String(scanData.id);
                            const studentName = scanData.name || "Unknown Identity";

                            // Prevent duplicates for this session attendance
                            const q = query(
                                collection(db, collections.attendance), 
                                where('studentId', '==', studentId),
                                where('classId', '==', classId),
                                where('date', '==', data.date || today)
                            );
                            const existingSnap = await getDocs(q);

                            if (!existingSnap.empty) {
                                setStatus(`${t('scanner.alreadyVerified')}: ${studentName}`);
                                setTimeout(() => setStatus(t('scanner.scanningActive')), 2000);
                            } else {
                                // 1. Record Attendance
                                await addDoc(collection(db, collections.attendance), {
                                    studentId,
                                    studentName,
                                    teacherId: user?.id,
                                    classId: classId,
                                    className: data.name || "Unknown",
                                    date: data.date || today,
                                    timestamp: Timestamp.now()
                                });

                                // 2. Deliver Session Attachments to Student Account
                                if (data.attachments && data.attachments.length > 0) {
                                    setStatus(t('scanner.delivering'));
                                    const materialOps = data.attachments.map(async (att) => {
                                        const materialId = `${studentId}_${classId}_${att.name.replace(/[^a-z0-9]/gi, '_')}`;
                                        const materialRef = doc(db, collections.materials, materialId);
                                        
                                        await setDoc(materialRef, {
                                            studentId,
                                            sessionId: classId,
                                            fileName: att.name,
                                            fileData: att.data,
                                            teacherName: user?.name || 'Unknown Faculty',
                                            teacherId: user?.id || '',
                                            timestamp: Timestamp.now()
                                        });
                                    });
                                    await Promise.all(materialOps);
                                }

                                // 3. Notify Student
                                await addDoc(collection(db, collections.notifications), {
                                    userId: studentId,
                                    title: 'Presence Recorded',
                                    message: `Attendance verified. ${data.attachments?.length || 0} session files delivered to your Cabinet.`,
                                    type: 'attendance',
                                    read: false,
                                    timestamp: Timestamp.now()
                                });

                                if (audioRef.current) {
                                    audioRef.current.currentTime = 0;
                                    audioRef.current.play().catch(() => {});
                                }

                                setStatus(`${t('scanner.verified')}: ${studentName}`);
                            }
                        } catch (error) {
                            console.error(error);
                            setStatus(t('common.error'));
                        } finally {
                            setTimeout(() => {
                                setStatus(t('scanner.scanningActive'));
                                isProcessing.current = false;
                            }, 1500);
                        }
                    },
                    () => {}
                );
                setStatus(t('scanner.scanningActive'));
            } catch (err) { 
                setStatus(t('scanner.hardwareError')); 
            }
        };

        fetchSession();

        return () => {
            stopScanning();
        };
    }, [user, classId, isMobile, stopScanning, t]);

    if (errorMsg) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-danger/10 text-danger rounded-3xl flex items-center justify-center mb-6 shadow-xl border border-danger/20">
                    <AlertTriangle size={40} />
                </div>
                <h3 className="text-xl font-black uppercase text-institutional-950 dark:text-white mb-2">{errorMsg}</h3>
                <p className="text-sm font-bold text-institutional-500 mb-8 uppercase tracking-widest">{t('scanner.protocolError')}</p>
                <button onClick={onBack} className="bg-institutional-900 dark:bg-white text-white dark:text-institutional-900 px-10 py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-transform hover:scale-105">{t('scanner.returnHub')}</button>
            </div>
        );
    }

    return (
        <div className={`fade-in max-w-2xl mx-auto flex flex-col ${isMobile ? 'h-[calc(100vh-180px)]' : 'h-[calc(100vh-140px)]'}`}>
             <div className="mb-6 flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-institutional-950 dark:text-white">{t('scanner.title')}</h2>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{sessionData?.name}</p>
                </div>
                <button onClick={onBack} className="w-12 h-12 flex items-center justify-center bg-institutional-200 dark:bg-institutional-800 text-institutional-500 hover:bg-danger hover:text-white rounded-xl transition-all shadow-lg"><X size={24} /></button>
            </div>
            
            <div className={`flex-1 card-edu rounded-[2.5rem] bg-black overflow-hidden relative flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-black`}>
                <div id="reader" className="w-full h-full flex-1 bg-black overflow-hidden"></div>
                
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-10">
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <ShieldCheck size={14} className="text-primary" />
                        <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">{t('scanner.authActive')}</span>
                    </div>

                    <div className="w-64 h-64 border-2 border-white/10 rounded-3xl relative">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -translate-x-1 -translate-y-1 rounded-tl-xl shadow-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary translate-x-1 -translate-y-1 rounded-tr-xl shadow-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -translate-x-1 translate-y-1 rounded-bl-xl shadow-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary translate-x-1 translate-y-1 rounded-br-xl shadow-lg"></div>
                        <div className="w-full h-[2px] bg-primary/60 absolute top-0 animate-[scan-line_2.5s_infinite] shadow-[0_0_20px_rgba(79,70,229,0.9)]"></div>
                    </div>

                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-2xl w-full max-w-xs justify-center transition-all">
                        {status.includes(t('scanner.verified')) ? <CheckCircle size={20} className="text-success animate-pulse" /> : status.includes(t('scanner.delivering')) ? <FileUp size={20} className="text-primary animate-bounce" /> : <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{status}</span>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scan-line {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default Scanner;