import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, Timestamp, setDoc, doc, deleteDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { Assignment, Submission, User } from '../types';
import { 
    Plus, 
    Paperclip, 
    UploadCloud, 
    Download, 
    CheckCircle, 
    AlertCircle, 
    Trash2, 
    X, 
    FileText, 
    ChevronRight, 
    Clock, 
    Target, 
    User as UserIcon, 
    Star, 
    MessageSquare, 
    ExternalLink, 
    Calendar,
    Award,
    Hash
} from 'lucide-react';

const Assignments: React.FC = () => {
    const { user } = useAuth();
    const { t, isRTL, language } = useLanguage();
    const navigate = useNavigate();

    useEffect(() => {
        if (user?.role === 'economic') {
            navigate('/');
        }
    }, [user?.role, navigate]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [viewingSubmissionsFor, setViewingSubmissionsFor] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<string | null>(null);
    const [fileData, setFileData] = useState<{name: string, data: string} | null>(null);
    const [isGrading, setIsGrading] = useState<string | null>(null);
    const [studentCount, setStudentCount] = useState(0);
    
    const isTeacher = user?.role === 'teacher';

    useEffect(() => {
        const unsub = onSnapshot(collection(db, collections.assignments), (snap) => {
            setAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment)).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
        });
        const unsubSub = onSnapshot(collection(db, collections.submissions), (snap) => {
            setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Submission)));
        });
        
        getDocs(query(collection(db, collections.users), where('role', '==', 'student'))).then(snap => setStudentCount(snap.size));

        return () => { unsub(); unsubSub(); };
    }, []);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { if(ev.target?.result) setFileData({ name: file.name, data: ev.target.result as string }); };
        reader.readAsDataURL(file);
    };

    const handleCreateAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const title = fd.get('title') as string;
        try {
            await addDoc(collection(db, collections.assignments), {
                title, description: fd.get('description'), deadlineDate: fd.get('date'), deadlineTime: fd.get('time'), creatorId: user?.id, timestamp: Timestamp.now(), fileData: fileData?.data, fileName: fileData?.name
            });
            const studentsSnap = await getDocs(query(collection(db, collections.users), where('role', '==', 'student')));
            const notifOps = studentsSnap.docs.map(studentDoc => 
                addDoc(collection(db, collections.notifications), {
                    userId: studentDoc.id, title: t('dropbox.taskIssued'), message: title, type: 'task', read: false, timestamp: Timestamp.now(), link: '/assignments'
                })
            );
            await Promise.all(notifOps);
            setIsCreateModalOpen(false); setFileData(null);
        } catch (error) { alert(t('common.error')); }
    };

    const handleDeleteAssignment = async (id: string) => {
        if (!window.confirm(t('common.confirm') + "?")) return;
        const target = assignments.find(a => a.id === id);
        try {
            await deleteDoc(doc(db, collections.assignments, id));
            const studentsSnap = await getDocs(query(collection(db, collections.users), where('role', '==', 'student')));
            const notifOps = studentsSnap.docs.map(studentDoc => 
                addDoc(collection(db, collections.notifications), {
                    userId: studentDoc.id, title: t('dropbox.taskRemoved'), message: target?.title, type: 'system', read: false, timestamp: Timestamp.now(), link: '/assignments'
                })
            );
            await Promise.all(notifOps);
        } catch (error) { alert(t('common.error')); }
    };

    const handleSubmitWork = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!isSubmitModalOpen || !user) return;
        const assignment = assignments.find(a => a.id === isSubmitModalOpen);
        try {
            await setDoc(doc(db, collections.submissions, `${isSubmitModalOpen}_${user.id}`), {
                assignmentId: isSubmitModalOpen, studentId: user.id, studentName: user.name, fileData: fileData?.data, fileName: fileData?.name, timestamp: Timestamp.now()
            });
            if (assignment?.creatorId) {
                await addDoc(collection(db, collections.notifications), {
                    userId: assignment.creatorId, title: t('dropbox.submit'), message: `${user.name}: ${assignment.title}`, type: 'task', read: false, timestamp: Timestamp.now(), link: '/assignments'
                });
            }
            setIsSubmitModalOpen(null); setFileData(null);
        } catch (error) { alert(t('common.error')); }
    };

    const handleSaveGrade = async (submissionId: string, grade: number, review: string) => {
        try {
            const sub = submissions.find(s => s.id === submissionId);
            if (!sub) return;
            await updateDoc(doc(db, collections.submissions, submissionId), { 
                grade, 
                review,
                gradedBy: user?.id,
                gradedByName: user?.name,
                gradedAt: Timestamp.now()
            });
            await addDoc(collection(db, collections.notifications), {
                userId: sub.studentId, title: t('dropbox.graded'), message: `${t('dropbox.score')}: ${grade}`, type: 'task', read: false, timestamp: Timestamp.now(), link: '/assignments'
            });
            setIsGrading(null);
        } catch (error) { alert(t('common.error')); }
    };

    const downloadFile = (data: string, name: string) => {
        const a = document.createElement('a');
        a.href = data; a.download = name; a.click();
    };

    const currentAssignmentSubmissions = submissions.filter(s => s.assignmentId === viewingSubmissionsFor);
    const selectedAssignment = assignments.find(a => a.id === viewingSubmissionsFor);

    return (
        <div className="fade-in max-w-7xl mx-auto pb-20">
            {/* Header Section */}
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-border">
                <div className="text-start">
                    <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase text-text leading-none">{t('nav.dropbox')}</h2>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[11px] font-black text-text-secondary/50 uppercase tracking-[0.3em]">{t('dropbox.title')}</p>
                    </div>
                </div>
                {isTeacher && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="bg-primary text-white rounded-3xl font-black text-[12px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:bg-primary/90 hover:scale-[1.03] transition-all px-8 py-5"
                    >
                        <Plus size={20} /> {t('dropbox.issueTask')}
                    </button>
                )}
            </div>

            {/* Assignments Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {assignments.map(hw => {
                    const deadline = new Date(`${hw.deadlineDate}T${hw.deadlineTime}`);
                    const isExpired = new Date() > deadline;
                    const mySubmission = submissions.find(s => s.assignmentId === hw.id && s.studentId === user?.id);
                    const submissionCount = submissions.filter(s => s.assignmentId === hw.id).length;
                    const isCreator = user?.id === hw.creatorId;

                    return (
                        <div key={hw.id} className="group relative flex flex-col bg-sidebar rounded-[2.5rem] border border-border shadow-sm hover:shadow-2xl transition-all overflow-hidden p-8">
                            {isCreator && (
                                <button onClick={() => handleDeleteAssignment(hw.id)} className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} p-3 bg-background rounded-2xl text-text-secondary hover:text-danger transition-all border border-border`}>
                                    <Trash2 size={20} />
                                </button>
                            )}
                            
                            <div className="flex-1 text-start">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${isExpired ? 'bg-background text-text-secondary/50 border border-border' : 'bg-primary/10 text-primary border border-primary/10'}`}>
                                        {hw.deadlineDate} @ {hw.deadlineTime}
                                    </span>
                                    {isTeacher && (
                                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black bg-success/10 text-success border border-success/10 uppercase tracking-widest">
                                            <Hash size={12} />
                                            {submissionCount} / {studentCount}
                                        </span>
                                    )}
                                </div>
                                
                                <h3 className="text-2xl font-black text-text uppercase tracking-tight mb-4 leading-tight group-hover:text-primary transition-colors">{hw.title}</h3>
                                <p className="text-sm text-text-secondary line-clamp-3 mb-8 leading-relaxed font-medium">{hw.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-6 mb-8">
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary/50">
                                        <Clock size={16} />
                                        <span>{isExpired ? t('dropbox.closed') : t('dropbox.deadline')}</span>
                                    </div>
                                    {hw.fileData && (
                                        <button onClick={() => downloadFile(hw.fileData!, hw.fileName!)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                            <Paperclip size={16} />
                                            {t('dropbox.resource')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Student Work Visibility */}
                            {!isTeacher && mySubmission && (
                                <div className="mb-8 rounded-[2rem] border border-success/20 bg-success/5 p-8 text-start shadow-inner">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
                                                <Award size={20} />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-widest text-text">{t('dropbox.score')}</span>
                                        </div>
                                        <span className="text-3xl font-black text-success tracking-tighter">{mySubmission.grade ?? '--'} <span className="text-xs text-text-secondary/50 font-black uppercase tracking-widest ml-1">/ 20</span></span>
                                    </div>
                                    {mySubmission.review && (
                                        <div className="pt-6 border-t border-success/10">
                                            <p className="text-[9px] font-black text-text-secondary/50 uppercase tracking-[0.3em] mb-3">{t('dropbox.review')}</p>
                                            <p className="text-sm text-text-secondary italic bg-background p-5 rounded-2xl border border-border shadow-inner leading-relaxed font-medium">"{mySubmission.review}"</p>
                                            <div className="mt-4 flex items-center gap-3 text-[10px] text-text-secondary/50 font-black uppercase tracking-widest">
                                                <UserIcon size={14} />
                                                <span>{mySubmission.gradedByName}</span>
                                                {mySubmission.gradedAt && (
                                                    <>
                                                        <div className="w-1 h-1 rounded-full bg-text-secondary/20"></div>
                                                        <span>{new Date(mySubmission.gradedAt.seconds * 1000).toLocaleDateString()}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="mt-auto pt-6 border-t border-border">
                                {isTeacher ? (
                                    <button onClick={() => setViewingSubmissionsFor(hw.id)} className="w-full inline-flex items-center justify-center gap-3 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-text-secondary bg-background hover:bg-sidebar rounded-2xl transition-all border border-border hover:border-primary/20">
                                        {t('dropbox.auditLedger')} <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => !isExpired && !mySubmission && setIsSubmitModalOpen(hw.id)} 
                                        disabled={isExpired || !!mySubmission} 
                                        className={`w-full inline-flex items-center justify-center gap-3 py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${isExpired || mySubmission ? 'bg-background text-text-secondary/30 cursor-not-allowed border border-border' : 'bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 hover:scale-[1.02]'}`}
                                    >
                                        {mySubmission ? <CheckCircle size={20} /> : isExpired ? <AlertCircle size={20} /> : <UploadCloud size={20} />}
                                        {mySubmission ? t('common.success') : isExpired ? t('dropbox.closed') : t('dropbox.submit')}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal: Creation */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-sidebar rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] max-w-2xl w-full max-h-[90vh] overflow-y-auto scroll-hide p-12 relative border border-border">
                        <button onClick={() => setIsCreateModalOpen(false)} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-3 bg-background rounded-2xl text-text-secondary hover:text-danger transition-all border border-border`}><X size={24} /></button>
                        <div className="text-start mb-10">
                            <h3 className="text-3xl font-black uppercase tracking-tight text-text leading-none">{t('dropbox.issueTask')}</h3>
                            <p className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.3em] mt-3">Institutional Mandate Generation</p>
                        </div>
                        <form onSubmit={handleCreateAssignment} className="space-y-8 text-start">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('dropbox.taskTitle')}</label>
                                <input name="title" className="w-full bg-background p-5 rounded-2xl border border-border text-sm font-black focus:border-primary outline-none shadow-inner text-text" placeholder="Task Title" required />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">{t('dropbox.technicalObj')}</label>
                                <textarea name="description" rows={4} className="w-full bg-background p-5 rounded-2xl border border-border text-sm font-black focus:border-primary outline-none resize-none shadow-inner text-text leading-relaxed" placeholder="Task description..." required />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">Date</label>
                                    <input type="date" name="date" className="w-full bg-background p-5 rounded-2xl border border-border text-sm font-black focus:border-primary outline-none shadow-inner text-text" required />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-secondary/50 tracking-widest px-2">Time</label>
                                    <input type="time" name="time" className="w-full bg-background p-5 rounded-2xl border border-border text-sm font-black focus:border-primary outline-none shadow-inner text-text" required />
                                </div>
                            </div>
                            <div className="p-10 border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center gap-4 bg-background/50 hover:bg-background transition-all group cursor-pointer">
                                <Paperclip size={32} className="text-text-secondary/30 group-hover:text-primary transition-colors" />
                                <input type="file" id="file-create" className="hidden" onChange={handleFile} />
                                <label htmlFor="file-create" className="cursor-pointer text-center">
                                    <p className="text-sm font-black text-text uppercase tracking-tight">{fileData ? fileData.name : t('dropbox.resource')}</p>
                                    <p className="text-[10px] text-text-secondary/50 uppercase font-black tracking-widest mt-2">Max 10MB (Optional)</p>
                                </label>
                            </div>
                            <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all mt-4 text-[11px]">
                                {t('dropbox.issueTask')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal: Submission */}
            {isSubmitModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-sidebar rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.3)] max-w-md w-full p-12 relative border border-border">
                         <button onClick={() => setIsSubmitModalOpen(null)} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-3 bg-background rounded-2xl text-text-secondary hover:text-danger transition-all border border-border`}><X size={24} /></button>
                         <div className="text-start mb-10">
                            <h3 className="text-3xl font-black uppercase tracking-tight text-text leading-none">{t('dropbox.submit')}</h3>
                            <p className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.3em] mt-3">Artifact Deployment Protocol</p>
                        </div>
                         <form onSubmit={handleSubmitWork} className="space-y-8">
                            <div className="p-12 border-4 border-dashed border-border rounded-[2.5rem] flex flex-col items-center gap-6 hover:border-primary/30 bg-background/50 hover:bg-background transition-all group cursor-pointer">
                                <UploadCloud size={56} className="text-primary/40 group-hover:text-primary transition-all" />
                                <input type="file" id="file-submit" className="hidden" onChange={handleFile} />
                                <label htmlFor="file-submit" className="cursor-pointer text-center">
                                    <p className="text-sm font-black text-text uppercase tracking-tight">{fileData ? fileData.name : t('dropbox.selectArchive')}</p>
                                    <p className="text-[10px] text-text-secondary/50 font-black uppercase tracking-widest mt-2">{t('dropbox.prefFiles')}</p>
                                </label>
                            </div>
                            <button type="submit" className="w-full py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 text-[11px]">
                                <CheckCircle size={20} /> {t('dropbox.deploy')}
                            </button>
                         </form>
                    </div>
                </div>
            )}

            {/* Audit Ledger: Teacher Submissions View */}
            {viewingSubmissionsFor && (
                <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-0 md:p-12 animate-in fade-in duration-500">
                    <div className="bg-background w-full h-full md:max-w-7xl md:h-auto md:max-h-[90vh] md:rounded-[3.5rem] flex flex-col shadow-[0_50px_150px_rgba(0,0,0,0.5)] overflow-hidden border border-border">
                        
                        <div className="p-8 md:p-12 bg-sidebar border-b border-border flex justify-between items-center shrink-0">
                            <div className="text-start">
                                <h3 className="text-3xl font-black uppercase tracking-tight text-text leading-none">{t('dropbox.auditLedger')}</h3>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                    <p className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">{selectedAssignment?.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingSubmissionsFor(null)} className="p-4 bg-background rounded-2xl text-text-secondary hover:text-danger transition-all border border-border"><X size={28} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 scroll-hide">
                            {currentAssignmentSubmissions.length === 0 ? (
                                <div className="py-32 text-center flex flex-col items-center opacity-30 grayscale">
                                    <Target size={64} className="mb-6" />
                                    <p className="text-sm font-black uppercase tracking-[0.3em]">{t('dropbox.noSubmissions')}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Desktop Table Header */}
                                    <div className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_80px] gap-6 px-10 py-5 bg-sidebar rounded-2xl border border-border text-[10px] font-black uppercase text-text-secondary/50 tracking-[0.3em] text-start">
                                        <div>{t('dropbox.student')}</div>
                                        <div>{t('dropbox.submissionDate')}</div>
                                        <div>Asset</div>
                                        <div>{t('dropbox.score')}</div>
                                        <div className="text-right">Action</div>
                                    </div>

                                    {currentAssignmentSubmissions.map(sub => {
                                        const subDate = sub.timestamp?.seconds ? new Date(sub.timestamp.seconds * 1000).toLocaleString(language, { dateStyle: 'short', timeStyle: 'short' }) : '---';
                                        const isBeingGraded = isGrading === sub.id;

                                        return (
                                            <div key={sub.id} className="bg-sidebar rounded-[2.5rem] border border-border shadow-sm transition-all hover:border-primary/20 overflow-hidden group">
                                                <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1fr_80px] items-center gap-6 md:gap-8 text-start">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-background border border-border flex items-center justify-center text-primary font-black text-base shadow-inner">
                                                            {sub.studentName.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p 
                                                                onClick={() => navigate(`/profile/${sub.studentId}`)}
                                                                className="text-base font-black text-text uppercase tracking-tight truncate hover:text-primary cursor-pointer transition-colors"
                                                            >
                                                                {sub.studentName}
                                                            </p>
                                                            <p className="text-[10px] font-black text-text-secondary/40 uppercase tracking-widest mt-1">ID: {sub.studentId.substring(0,8)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <p className="md:hidden text-[9px] font-black text-text-secondary/50 uppercase tracking-widest mb-2">{t('dropbox.submissionDate')}</p>
                                                        <p className="text-xs text-text-secondary font-black tracking-widest">{subDate}</p>
                                                    </div>

                                                    <div>
                                                        <p className="md:hidden text-[9px] font-black text-text-secondary/50 uppercase tracking-widest mb-2">Asset</p>
                                                        {sub.fileData ? (
                                                            <button 
                                                                onClick={() => downloadFile(sub.fileData!, sub.fileName!)}
                                                                className="inline-flex items-center gap-3 py-3 px-5 bg-background text-text text-[10px] font-black uppercase tracking-widest rounded-xl border border-border hover:border-primary/30 transition-all truncate max-w-full shadow-inner"
                                                            >
                                                                <FileText size={16} className="text-primary" />
                                                                <span className="truncate">{sub.fileName}</span>
                                                                <ExternalLink size={12} className="opacity-30" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-text-secondary/30 font-black uppercase tracking-widest italic">No File</span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="md:hidden text-[9px] font-black text-text-secondary/50 uppercase tracking-widest mb-2">{t('dropbox.score')}</p>
                                                        <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sub.grade !== undefined ? 'bg-success/10 text-success border border-success/10' : 'bg-warning/10 text-warning border border-warning/10'}`}>
                                                            {sub.grade !== undefined ? `${sub.grade} / 20` : t('dropbox.pending')}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <button 
                                                            onClick={() => setIsGrading(sub.id)}
                                                            className={`p-4 rounded-2xl transition-all ${isBeingGraded ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'bg-background text-text-secondary hover:text-primary border border-border hover:border-primary/30'}`}
                                                        >
                                                            <Star size={24} fill={sub.grade !== undefined ? "currentColor" : "none"} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Grading UI Expanded */}
                                                {isBeingGraded && (
                                                    <div className="p-10 md:p-12 bg-background border-t border-border animate-in slide-in-from-top-4 duration-500">
                                                        <div className="mb-10 flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                                <Award size={24} />
                                                            </div>
                                                            <h4 className="text-base font-black text-text uppercase tracking-tight">Evaluation Terminal</h4>
                                                        </div>
                                                        <form 
                                                            className="space-y-10"
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                const fd = new FormData(e.currentTarget);
                                                                handleSaveGrade(sub.id, Number(fd.get('grade')), fd.get('review') as string);
                                                            }}
                                                        >
                                                            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-10 text-start">
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.3em] px-2">{t('dropbox.score')} (/20)</label>
                                                                    <input 
                                                                        name="grade" 
                                                                        type="number" 
                                                                        min="0" max="20" 
                                                                        defaultValue={sub.grade ?? ''} 
                                                                        className="w-full bg-sidebar p-6 rounded-[2rem] border border-border text-4xl font-black text-center focus:border-primary outline-none shadow-inner text-text" 
                                                                        required 
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.3em] px-2">{t('dropbox.review')}</label>
                                                                    <textarea 
                                                                        name="review" 
                                                                        rows={5} 
                                                                        defaultValue={sub.review ?? ''} 
                                                                        className="w-full bg-sidebar p-6 rounded-[2rem] border border-border text-sm font-black focus:border-primary outline-none resize-none shadow-inner text-text leading-relaxed" 
                                                                        placeholder="Academic commentary for student reference..."
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-6 justify-end">
                                                                <button type="button" onClick={() => setIsGrading(null)} className="px-8 py-4 text-[11px] font-black text-text-secondary hover:text-text transition-all uppercase tracking-[0.2em]">{t('common.cancel')}</button>
                                                                <button type="submit" className="px-12 py-5 bg-primary text-white text-[11px] font-black rounded-2xl transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.2em] hover:bg-primary/90 hover:scale-[1.02]">{t('dropbox.saveGrade')}</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}

                                                {/* Existing Review Display (Collapsible/Static) */}
                                                {!isBeingGraded && sub.review && (
                                                    <div className="mx-10 mb-10 p-8 bg-background rounded-[2rem] border border-border text-start shadow-inner">
                                                        <div className="flex items-center gap-3 mb-4 text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.3em]">
                                                            <MessageSquare size={16} className="text-primary/40" />
                                                            {t('dropbox.review')}
                                                        </div>
                                                        <p className="text-sm text-text-secondary italic font-medium leading-relaxed">"{sub.review}"</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Assignments;