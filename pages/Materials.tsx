import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Material } from '../types';
import { FolderOpen, Download, User as UserIcon, Calendar, Clock, FileText, Search, Grid, List } from 'lucide-react';

const Materials: React.FC = () => {
    const { user } = useAuth();
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === 'economic') {
            navigate('/');
        }
    }, [user?.role, navigate]);

    const [materials, setMaterials] = useState<Material[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (!user) return;

        // Removed orderBy('timestamp', 'desc') to avoid composite index requirement
        const q = query(
            collection(db, collections.materials),
            where('studentId', '==', user.id)
        );

        const unsub = onSnapshot(q, (snap) => {
            const rawMaterials = snap.docs.map(d => ({ id: d.id, ...d.data() } as Material));
            
            // Sort client-side to satisfy the UI requirement without needing server-side indexes
            const sorted = rawMaterials.sort((a, b) => {
                const tA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
                const tB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
                return tB - tA;
            });
            
            setMaterials(sorted);
        });

        return () => unsub();
    }, [user]);

    const downloadFile = (data: string, name: string) => {
        const a = document.createElement('a');
        a.href = data;
        a.download = name;
        a.click();
    };

    const filteredMaterials = materials.filter(m => 
        m.fileName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in pb-10 max-w-7xl mx-auto">
            <div className={`mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-10`}>
                <div className="text-start">
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase text-text leading-none">{t('nav.cabinet')}</h2>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[11px] font-black text-text-secondary/50 uppercase tracking-[0.3em]">{t('cabinet.title')}</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-text-secondary/50`} size={16} />
                        <input 
                            type="text" 
                            placeholder={t('cabinet.searchLedger')} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`bg-sidebar border border-border rounded-2xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 text-sm font-bold outline-none focus:border-primary w-full sm:w-64 transition-all text-text shadow-inner`}
                        />
                    </div>
                    <div className="flex bg-sidebar border border-border rounded-2xl p-1.5">
                        <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-primary'}`}><Grid size={18} /></button>
                        <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-primary'}`}><List size={18} /></button>
                    </div>
                </div>
            </div>

            {filteredMaterials.length > 0 ? (
                viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {filteredMaterials.map(m => (
                            <div key={m.id} className="p-8 bg-sidebar rounded-[2.5rem] border border-border flex flex-col group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-start shadow-sm">
                                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform border border-primary/10">
                                    <FileText size={28} />
                                </div>
                                <div className="flex-1 mb-8">
                                    <h4 className="font-black text-base uppercase text-text tracking-tight truncate mb-2" title={m.fileName}>{m.fileName}</h4>
                                    <div className="flex items-center gap-2 text-text-secondary mb-2">
                                        <UserIcon size={14} className="text-primary" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{m.teacherName}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-text-secondary/50">
                                        <Calendar size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000).toLocaleDateString() : '---'}
                                        </span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => downloadFile(m.fileData, m.fileName)}
                                    className="w-full bg-background text-text p-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary hover:text-white transition-all shadow-sm border border-border group-hover:border-primary/20"
                                >
                                    <Download size={16} /> {t('cabinet.downloadArchive')}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-sidebar rounded-[2.5rem] overflow-hidden border border-border shadow-xl">
                         <div className="grid grid-cols-[1fr_1.5fr_1fr_120px] p-8 border-b border-border bg-background font-black text-[10px] uppercase tracking-[0.3em] text-text-secondary/50">
                            <div className="text-start">Resource</div>
                            <div className="text-start">{t('cabinet.facultyAttributed')}</div>
                            <div className="text-start">{t('cabinet.date')}</div>
                            <div className="text-end">{t('nav.hub')}</div>
                        </div>
                        {filteredMaterials.map(m => (
                            <div key={m.id} className="grid grid-cols-[1fr_1.5fr_1fr_120px] p-8 border-b border-border items-center hover:bg-background transition-all group">
                                <div className="flex items-center gap-4 text-start">
                                    <div className="p-2 bg-primary/10 rounded-lg text-primary"><FileText size={20} /></div>
                                    <span className="font-black text-sm text-text uppercase tracking-tight truncate" title={m.fileName}>{m.fileName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-start">
                                    <div className="w-8 h-8 rounded-xl bg-background border border-border flex items-center justify-center text-[11px] font-black text-primary">{m.teacherName.charAt(0)}</div>
                                    <span className="text-xs font-black uppercase tracking-widest text-text-secondary">{m.teacherName}</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-secondary/50 text-start">
                                    <Clock size={16} />
                                    <span>{m.timestamp?.seconds ? new Date(m.timestamp.seconds * 1000).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '---'}</span>
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={() => downloadFile(m.fileData, m.fileName)}
                                        className="p-3 bg-background text-text-secondary rounded-xl hover:bg-primary hover:text-white transition-all border border-border hover:border-primary shadow-sm"
                                        title={t('cabinet.downloadArchive')}
                                    >
                                        <Download size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                <div className="flex flex-col items-center justify-center py-40 text-center animate-in fade-in duration-700">
                    <div className="w-24 h-24 bg-sidebar rounded-[2.5rem] flex items-center justify-center mb-8 border border-border shadow-inner">
                        <FolderOpen size={48} className="text-text-secondary/20" />
                    </div>
                    <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-text">{t('cabinet.empty')}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary/50 mt-4 max-w-xs leading-relaxed">{t('cabinet.attendToReceive')}</p>
                </div>
            )}
        </div>
    );
};

export default Materials;