import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, deleteDoc, doc, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, Attachment } from '../types';
import { Trash2, SlidersHorizontal, MapPin, Clock, Plus, Scan, X, CalendarOff, Paperclip, FileText, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const checkIsLive = (classDate: string, startTime: string, endTime: string) => {
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (classDate !== today) return false;
    const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    return nowStr >= startTime && nowStr < endTime;
};

const checkHasEnded = (classDate: string, endTime: string) => {
    const now = new Date();
    const today = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (classDate < today) return true;
    if (classDate > today) return false;
    const nowStr = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    return nowStr >= endTime;
};

interface ClassesProps {
    onNavigate: (path: string, classId?: string) => void;
}

const Classes: React.FC<ClassesProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [classes, setClasses] = useState<ClassSession[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassSession | null>(null);
    const [attachments, setAttachments] = useState<{name: string, data: string}[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, collections.classes), (snap) => {
            setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession)));
        });
        return () => unsub();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('hub.deleteSession') + "?")) return;
        try { await deleteDoc(doc(db, collections.classes, id)); } catch (error) { alert(t('common.error')); }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach((file: any) => {
            if (file.size > 800 * 1024) {
                alert(`File ${file.name} is too large. Maximum size is 800KB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) setAttachments(prev => [...prev, { name: file.name, data: ev.target!.result as string }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const formData = new FormData(e.currentTarget);
            const finalAttachments: Attachment[] = attachments.map(att => ({ ...att, teacherName: user?.name || 'Unknown Faculty', timestamp: Timestamp.now() }));
            const data = {
                name: formData.get('name') as string,
                date: formData.get('date') as string,
                time: formData.get('time') as string,
                endTime: formData.get('endTime') as string,
                room: formData.get('room') as string,
                type: formData.get('type') as string,
                timestamp: Timestamp.now(),
                attachments: finalAttachments
            };
            if (editingClass) await updateDoc(doc(db, collections.classes, editingClass.id), data);
            else await addDoc(collection(db, collections.classes), data);
            setIsModalOpen(false); setEditingClass(null); setAttachments([]);
        } catch (error) { 
            console.error(error);
            alert(t('common.error')); 
        } finally {
            setIsSaving(false);
        }
    };

    const openModal = (cl?: ClassSession) => {
        if (cl) { setEditingClass(cl); setAttachments(cl.attachments || []); }
        else { setEditingClass(null); setAttachments([]); }
        setIsModalOpen(true);
    };

    return (
        <div className="fade-in max-w-7xl mx-auto">
            <div className={`mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-border pb-10`}>
                <div className="text-start">
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase text-text leading-none">{t('nav.hub')}</h2>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[11px] font-black text-text-secondary/50 uppercase tracking-[0.3em]">{t('hub.title')}</p>
                    </div>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="group bg-primary text-white px-8 py-5 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-[1.03] transition-all"
                >
                    <Plus size={20} className="transition-transform group-hover:rotate-90" /> {t('hub.newSession')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                {classes.map(cl => {
                    const isLive = checkIsLive(cl.date, cl.time, cl.endTime);
                    const hasEnded = checkHasEnded(cl.date, cl.endTime);
                    
                    return (
                        <div key={cl.id} className={`p-8 bg-sidebar relative group rounded-[2.5rem] border border-border shadow-sm transition-all hover:shadow-xl hover:border-primary/20 ${isLive ? 'ring-2 ring-success ring-offset-4 ring-offset-background' : ''} ${hasEnded ? 'opacity-60 bg-sidebar/50' : ''}`}>
                            <div className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} flex gap-3 z-10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0`}>
                                <button 
                                    onClick={() => openModal(cl)} 
                                    className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-primary transition-all bg-background rounded-2xl shadow-xl border border-border"
                                >
                                    <SlidersHorizontal size={18} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(cl.id)} 
                                    className="w-11 h-11 flex items-center justify-center text-text-secondary hover:text-danger transition-all bg-background rounded-2xl shadow-xl border border-border"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="mb-10 text-start">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isLive ? 'bg-success text-white' : hasEnded ? 'bg-background text-text-secondary' : 'bg-primary/10 text-primary'}`}>
                                        {isLive ? t('hub.liveNow') : hasEnded ? t('hub.ended') : cl.type}
                                    </div>
                                    <div className="text-[10px] font-black text-text-secondary/50 uppercase tracking-widest">{cl.date}</div>
                                </div>
                                
                                <h3 className="font-black text-2xl tracking-tight uppercase text-text leading-tight mb-8 min-h-[3.5rem] line-clamp-2">{cl.name}</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 p-4 bg-background rounded-2xl border border-border">
                                        <div className="p-2.5 bg-sidebar rounded-xl shadow-sm border border-border"><MapPin size={18} className="text-primary" /></div>
                                        <div className="text-start">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50 leading-none mb-1">Assigned Hall</p>
                                            <p className="text-sm font-black text-text uppercase leading-none">{cl.room || 'TBA'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-4 bg-background rounded-2xl border border-border">
                                        <div className="p-2.5 bg-sidebar rounded-xl shadow-sm border border-border"><Clock size={18} className="text-primary" /></div>
                                        <div className="text-start">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-text-secondary/50 leading-none mb-1">Temporal Block</p>
                                            <p className="text-sm font-black text-text uppercase leading-none">{cl.time} — {cl.endTime}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => !hasEnded && navigate('/scanner', { state: { classId: cl.id } })}
                                disabled={hasEnded}
                                className={`w-full py-5 rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all ${hasEnded ? 'bg-background text-text-secondary/30 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20 hover:scale-[1.02] active:scale-95'}`}
                            >
                                {hasEnded ? <CalendarOff size={20} /> : <Scan size={20} />}
                                {hasEnded ? t('hub.ended') : t('hub.marks')}
                                {!hasEnded && <ChevronRight size={16} className={`opacity-50 ${isRTL ? 'rotate-180' : ''}`} />}
                            </button>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-sidebar rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] max-w-2xl w-full p-12 md:p-16 relative overflow-hidden border border-border max-h-[90vh] overflow-y-auto scroll-hide">
                        <button onClick={() => setIsModalOpen(false)} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-3 bg-background rounded-2xl text-text-secondary hover:text-danger transition-all border border-border`}><X size={24} /></button>
                        
                        <div className="text-start mb-12">
                            <h3 className="text-3xl font-black uppercase tracking-tight text-text">{t('hub.config')}</h3>
                            <p className="text-xs font-black text-text-secondary/50 uppercase tracking-widest mt-2">Institutional Session Parameterization</p>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8 text-start">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('hub.name')}</label>
                                <input name="name" defaultValue={editingClass?.name} placeholder="Academic Session Title" className="w-full bg-background p-5 rounded-3xl border border-border font-bold focus:border-primary outline-none shadow-inner transition-all text-text" required />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('hub.date')}</label>
                                    <input type="date" name="date" defaultValue={editingClass?.date} className="w-full bg-background p-5 rounded-3xl border border-border font-bold outline-none shadow-inner text-text" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('hub.room')}</label>
                                    <input name="room" defaultValue={editingClass?.room} placeholder="Hall Identifier" className="w-full bg-background p-5 rounded-3xl border border-border font-bold outline-none shadow-inner text-text" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('hub.start')}</label>
                                    <select name="time" defaultValue={editingClass?.time || '08:00'} className="w-full bg-background p-5 rounded-3xl border border-border font-bold outline-none shadow-inner cursor-pointer appearance-none text-text">
                                        {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('hub.end')}</label>
                                    <select name="endTime" defaultValue={editingClass?.endTime || '09:00'} className="w-full bg-background p-5 rounded-3xl border border-border font-bold outline-none shadow-inner cursor-pointer appearance-none text-text">
                                        {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2 flex items-center justify-between">
                                    {t('hub.attachments')}
                                    <span className="text-primary font-black">{attachments.length} {t('hub.filesSelected')}</span>
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {attachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border animate-in zoom-in duration-300">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-sidebar rounded-lg shadow-sm border border-border"><FileText size={16} className="text-primary" /></div>
                                                <span className="text-[11px] font-bold truncate text-text">{file.name}</span>
                                            </div>
                                            <button type="button" onClick={() => removeAttachment(i)} className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-all">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-3xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group min-h-[100px]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-background rounded-2xl group-hover:bg-primary group-hover:text-white transition-all border border-border"><Plus size={20} /></div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-text-secondary/50 group-hover:text-primary">{t('hub.clickToAdd')}</span>
                                        </div>
                                        <input type="file" multiple className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('hub.type')}</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['Cours', 'TD', 'Exam'].map(tp => (
                                        <label key={tp} className="relative group cursor-pointer">
                                            <input type="radio" name="type" value={tp} defaultChecked={editingClass?.type === tp || (tp === 'Cours' && !editingClass)} className="peer hidden" />
                                            <div className="p-5 text-center rounded-3xl border-2 border-border font-black text-[11px] uppercase tracking-widest peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all group-hover:border-primary/50 text-text-secondary">
                                                {tp}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" disabled={isSaving} className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(99,102,241,0.3)] hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all mt-6 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3">
                                {isSaving && <Loader2 size={18} className="animate-spin" />}
                                {isSaving ? 'SYNCING...' : t('hub.sync')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classes;