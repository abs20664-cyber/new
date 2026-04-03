import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Loader2 } from 'lucide-react';
import { Timestamp, collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, Attachment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface SessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingClass: ClassSession | null;
    onSaveSuccess?: () => void;
}

const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose, editingClass, onSaveSuccess }) => {
    const { user } = useAuth();
    const { t, isRTL } = useLanguage();
    const [attachments, setAttachments] = useState<{name: string, data: string}[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (editingClass) {
            setAttachments(editingClass.attachments || []);
        } else {
            setAttachments([]);
        }
    }, [editingClass, isOpen]);

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
            const finalAttachments: Attachment[] = attachments.map(att => ({ 
                ...att, 
                teacherName: user?.name || 'Unknown Faculty', 
                timestamp: Timestamp.now() 
            }));
            
            const data = {
                name: formData.get('name') as string,
                date: formData.get('date') as string,
                time: formData.get('time') as string,
                endTime: formData.get('endTime') as string,
                room: formData.get('room') as string,
                type: formData.get('type') as string,
                timestamp: Timestamp.now(),
                attachments: finalAttachments,
                teacherId: user?.id || ''
            };

            if (editingClass) {
                await updateDoc(doc(db, collections.classes, editingClass.id), data);
            } else {
                await addDoc(collection(db, collections.classes), data);
            }
            
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) { 
            console.error(error);
            alert(t('common.error')); 
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-surface rounded-3xl shadow-pop max-w-2xl w-full p-12 md:p-16 relative overflow-hidden border-4 border-border-dark max-h-[90vh] overflow-y-auto scroll-hide">
                <button onClick={onClose} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-3 bg-surface rounded-2xl text-text-secondary hover:text-danger transition-all border-2 border-border-dark shadow-pop-sm`}>
                    <X size={24} />
                </button>
                
                <div className="text-start mb-12">
                    <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-text">{t('hub.config')}</h3>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mt-2">Institutional Session Parameterization</p>
                </div>

                <form onSubmit={handleSave} className="space-y-8 text-start">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('hub.name')}</label>
                        <input name="name" defaultValue={editingClass?.name} placeholder="Academic Session Title" className="academic-input" required />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('hub.date')}</label>
                            <input type="date" name="date" defaultValue={editingClass?.date} className="academic-input" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('hub.room')}</label>
                            <input name="room" defaultValue={editingClass?.room} placeholder="Hall Identifier" className="academic-input" required />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('hub.start')}</label>
                            <select name="time" defaultValue={editingClass?.time || '08:00'} className="academic-input cursor-pointer appearance-none">
                                {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('hub.end')}</label>
                            <select name="endTime" defaultValue={editingClass?.endTime || '09:00'} className="academic-input cursor-pointer appearance-none">
                                {['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2 flex items-center justify-between">
                            {t('hub.attachments')}
                            <span className="text-primary font-bold">{attachments.length} {t('hub.filesSelected')}</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {attachments.map((file, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-surface rounded-2xl border-2 border-border-dark shadow-pop-sm animate-in zoom-in duration-300">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-primary/10 rounded-lg border-2 border-primary"><FileText size={16} className="text-primary" /></div>
                                        <span className="text-[11px] font-bold truncate text-text">{file.name}</span>
                                    </div>
                                    <button type="button" onClick={() => removeAttachment(i)} className="p-2 text-danger hover:bg-danger/10 rounded-xl transition-all">
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border-dark rounded-3xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group min-h-[100px]">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-surface rounded-2xl group-hover:bg-primary group-hover:text-white transition-all border-2 border-border-dark shadow-pop-sm"><Plus size={20} /></div>
                                    <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary group-hover:text-primary">{t('hub.clickToAdd')}</span>
                                </div>
                                <input type="file" multiple className="hidden" onChange={handleFileChange} />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('hub.type')}</label>
                        <div className="grid grid-cols-3 gap-4">
                            {['Cours', 'TD', 'Exam'].map(tp => (
                                <label key={tp} className="relative group cursor-pointer">
                                    <input type="radio" name="type" value={tp} defaultChecked={editingClass?.type === tp || (tp === 'Cours' && !editingClass)} className="peer hidden" />
                                    <div className="p-5 text-center rounded-2xl border-2 border-border-dark font-bold text-[11px] uppercase tracking-widest peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all group-hover:border-primary/50 text-text-secondary shadow-pop-sm">
                                        {tp}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" disabled={isSaving} className="academic-button academic-button-primary w-full py-6 flex items-center justify-center gap-3 mt-6 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSaving && <Loader2 size={18} className="animate-spin" />}
                        {isSaving ? 'SYNCING...' : t('hub.sync')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SessionModal;
