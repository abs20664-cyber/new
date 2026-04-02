import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, Timestamp, setDoc, doc, deleteDoc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { Assignment, Submission } from '../types';
import { 
    Plus, 
    Paperclip, 
    UploadCloud, 
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
            const allAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
            if (user?.role === 'student') {
                setAssignments(allAssignments.filter(a => a.creatorId === user.teacherId).sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            } else {
                setAssignments(allAssignments.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
            }
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
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b-4 border-border-dark">
                <div className="text-start">
                    <h2 className="text-4xl lg:text-5xl font-display font-bold tracking-tighter uppercase text-text leading-none">{t('nav.dropbox')}</h2>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-widest">{t('dropbox.title')}</p>
                    </div>
                </div>
                {isTeacher && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)} 
                        className="academic-button academic-button-primary flex items-center justify-center gap-3 px-8 py-5"
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
                        <div key={hw.id} className="group relative flex flex-col bg-surface rounded-3xl border-4 border-border-dark shadow-pop hover:shadow-pop-sm hover:translate-y-1 transition-all overflow-hidden p-8">
                            {isCreator && (
                                <button onClick={() => handleDeleteAssignment(hw.id)} className={`absolute top-8 ${isRTL ? 'left-8' : 'right-8'} p-3 bg-surface rounded-2xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-all border-2 border-border-dark shadow-pop-sm`}>
                                    <Trash2 size={20} />
                                </button>
                            )}
                            
                            <div className="flex-1 text-start">
                                <div className="flex items-center gap-3 mb-6">
                                    <span className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 ${isExpired ? 'bg-muted text-text-secondary border-border-dark' : 'bg-primary/10 text-primary border-primary/20'}`}>
                                        {hw.deadlineDate} @ {hw.deadlineTime}
                                    </span>
                                    {isTeacher && (
                                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold bg-success/10 text-success border-2 border-success/20 uppercase tracking-widest">
                                            <Hash size={12} />
                                            {submissionCount} / {studentCount}
                                        </span>
                                    )}
                                </div>
                                
                                <h3 className="text-2xl font-display font-bold text-text uppercase tracking-tight mb-4 leading-tight group-hover:text-primary transition-colors">{hw.title}</h3>
                                <p className="text-sm text-text-secondary line-clamp-3 mb-8 leading-relaxed font-bold">{hw.description}</p>
                                
                                <div className="flex flex-wrap items-center gap-6 mb-8">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                                        <Clock size={16} />
                                        <span>{isExpired ? t('dropbox.closed') : t('dropbox.deadline')}</span>
                                    </div>
                                    {hw.fileData && (
                                        <button onClick={() => downloadFile(hw.fileData!, hw.fileName!)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">
                                            <Paperclip size={16} />
                                            {t('dropbox.resource')}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Student Work Visibility */}
                            {!isTeacher && mySubmission && (
                                <div className="mb-8 rounded-3xl border-4 border-success/20 bg-success/5 p-8 text-start shadow-pop-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center text-success border-2 border-success/20">
                                                <Award size={20} />
                                            </div>
                                            <span className="text-[11px] font-bold uppercase tracking-widest text-text">{t('dropbox.score')}</span>
                                        </div>
                                        <span className="text-3xl font-display font-bold text-success tracking-tighter">{mySubmission.grade ?? '--'} <span className="text-xs text-text-secondary font-bold uppercase tracking-widest ml-1">/ 20</span></span>
                                    </div>
                                    {mySubmission.review && (
                                        <div className="pt-6 border-t-2 border-success/10">
                                            <p className="text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-3">{t('dropbox.review')}</p>
                                            <p className="text-sm text-text-secondary italic bg-surface p-5 rounded-2xl border-2 border-border-dark shadow-pop-sm leading-relaxed font-bold">"{mySubmission.review}"</p>
                                            <div className="mt-4 flex items-center gap-3 text-[10px] text-text-secondary font-bold uppercase tracking-widest">
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
                            
                            <div className="mt-auto pt-6 border-t-2 border-border-dark">
                                {isTeacher ? (
                                    <button onClick={() => setViewingSubmissionsFor(hw.id)} className="w-full inline-flex items-center justify-center gap-3 py-4 text-[11px] font-bold uppercase tracking-widest text-text-secondary bg-surface hover:bg-muted rounded-2xl transition-all border-2 border-border-dark shadow-pop-sm hover:shadow-none hover:translate-y-1">
                                        {t('dropbox.auditLedger')} <ChevronRight size={18} />
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => !isExpired && !mySubmission && setIsSubmitModalOpen(hw.id)} 
                                        disabled={isExpired || !!mySubmission} 
                                        className={`w-full inline-flex items-center justify-center gap-3 py-5 rounded-2xl text-[11px] font-bold uppercase tracking-widest transition-all border-2 ${isExpired || mySubmission ? 'bg-muted text-text-secondary/50 cursor-not-allowed border-border-dark' : 'bg-primary text-white hover:bg-primary/90 border-border-dark shadow-pop-sm hover:translate-y-1 hover:shadow-none'}`}
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
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl shadow-pop max-w-2xl w-full max-h-[90vh] overflow-y-auto scroll-hide p-12 relative border-4 border-border-dark">
                        <button onClick={() => setIsCreateModalOpen(false)} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-3 bg-surface rounded-2xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-all border-2 border-border-dark shadow-pop-sm`}><X size={24} /></button>
                        <div className="text-start mb-10">
                            <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-text leading-none">{t('dropbox.issueTask')}</h3>
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-3">Institutional Mandate Generation</p>
                        </div>
                        <form onSubmit={handleCreateAssignment} className="space-y-8 text-start">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('dropbox.taskTitle')}</label>
                                <input name="title" className="academic-input w-full" placeholder="Task Title" required />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">{t('dropbox.technicalObj')}</label>
                                <textarea name="description" rows={4} className="academic-input w-full resize-none leading-relaxed" placeholder="Task description..." required />
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">Date</label>
                                    <input type="date" name="date" className="academic-input w-full" required />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary tracking-widest px-2">Time</label>
                                    <input type="time" name="time" className="academic-input w-full" required />
                                </div>
                            </div>
                            <div className="p-10 border-4 border-dashed border-border-dark rounded-3xl flex flex-col items-center gap-4 bg-muted hover:bg-surface transition-all group cursor-pointer">
                                <Paperclip size={32} className="text-text-secondary group-hover:text-primary transition-colors" />
                                <input type="file" id="file-create" className="hidden" onChange={handleFile} />
                                <label htmlFor="file-create" className="cursor-pointer text-center">
                                    <p className="text-sm font-display font-bold text-text uppercase tracking-tight">{fileData ? fileData.name : t('dropbox.resource')}</p>
                                    <p className="text-[10px] text-text-secondary uppercase font-bold tracking-widest mt-2">Max 10MB (Optional)</p>
                                </label>
                            </div>
                            <button type="submit" className="academic-button academic-button-primary w-full py-5 mt-4">
                                {t('dropbox.issueTask')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {/* Modal: Submission */}
            {isSubmitModalOpen && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl shadow-pop max-w-md w-full p-12 relative border-4 border-border-dark">
                         <button onClick={() => setIsSubmitModalOpen(null)} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-3 bg-surface rounded-2xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-all border-2 border-border-dark shadow-pop-sm`}><X size={24} /></button>
                         <div className="text-start mb-10">
                            <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-text leading-none">{t('dropbox.submit')}</h3>
                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-3">Artifact Deployment Protocol</p>
                        </div>
                         <form onSubmit={handleSubmitWork} className="space-y-8">
                            <div className="p-12 border-4 border-dashed border-border-dark rounded-3xl flex flex-col items-center gap-6 hover:border-primary bg-muted hover:bg-surface transition-all group cursor-pointer">
                                <UploadCloud size={56} className="text-text-secondary group-hover:text-primary transition-all" />
                                <input type="file" id="file-submit" className="hidden" onChange={handleFile} />
                                <label htmlFor="file-submit" className="cursor-pointer text-center">
                                    <p className="text-sm font-display font-bold text-text uppercase tracking-tight">{fileData ? fileData.name : t('dropbox.selectArchive')}</p>
                                    <p className="text-[10px] text-text-secondary font-bold uppercase tracking-widest mt-2">{t('dropbox.prefFiles')}</p>
                                </label>
                            </div>
                            <button type="submit" className="academic-button academic-button-primary w-full py-5 flex items-center justify-center gap-3">
                                <CheckCircle size={20} /> {t('dropbox.deploy')}
                            </button>
                         </form>
                    </div>
                </div>
            )}

            {/* Audit Ledger: Teacher Submissions View */}
            {viewingSubmissionsFor && (
                <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-12 animate-in fade-in duration-500">
                    <div className="bg-surface w-full h-full md:max-w-7xl md:h-auto md:max-h-[90vh] md:rounded-3xl flex flex-col shadow-pop overflow-hidden border-4 border-border-dark">
                        
                        <div className="p-8 md:p-12 bg-surface border-b-4 border-border-dark flex justify-between items-center shrink-0">
                            <div className="text-start">
                                <h3 className="text-3xl font-display font-bold uppercase tracking-tight text-text leading-none">{t('dropbox.auditLedger')}</h3>
                                <div className="flex items-center gap-3 mt-4">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                                    <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{selectedAssignment?.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setViewingSubmissionsFor(null)} className="p-4 bg-surface rounded-2xl text-text-secondary hover:text-danger hover:bg-danger/10 transition-all border-2 border-border-dark shadow-pop-sm"><X size={28} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-6 scroll-hide">
                            {currentAssignmentSubmissions.length === 0 ? (
                                <div className="py-32 text-center flex flex-col items-center opacity-50 grayscale">
                                    <Target size={64} className="mb-6" />
                                    <p className="text-sm font-bold uppercase tracking-widest">{t('dropbox.noSubmissions')}</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Desktop Table Header */}
                                    <div className="hidden md:grid grid-cols-[2fr_1fr_1.5fr_1fr_80px] gap-6 px-10 py-5 bg-muted rounded-2xl border-2 border-border-dark text-[10px] font-bold uppercase text-text-secondary tracking-widest text-start shadow-pop-sm">
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
                                            <div key={sub.id} className="bg-surface rounded-3xl border-4 border-border-dark shadow-pop transition-all hover:border-primary overflow-hidden group">
                                                <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-[2fr_1fr_1.5fr_1fr_80px] items-center gap-6 md:gap-8 text-start">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-muted border-2 border-border-dark flex items-center justify-center text-primary font-display font-bold text-base shadow-pop-sm">
                                                            {sub.studentName.charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p 
                                                                onClick={() => navigate(`/profile/${sub.studentId}`)}
                                                                className="text-base font-display font-bold text-text uppercase tracking-tight truncate hover:text-primary cursor-pointer transition-colors"
                                                            >
                                                                {sub.studentName}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-1">ID: {sub.studentId.substring(0,8)}</p>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col">
                                                        <p className="md:hidden text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">{t('dropbox.submissionDate')}</p>
                                                        <p className="text-xs text-text-secondary font-bold tracking-widest">{subDate}</p>
                                                    </div>

                                                    <div>
                                                        <p className="md:hidden text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">Asset</p>
                                                        {sub.fileData ? (
                                                            <button 
                                                                onClick={() => downloadFile(sub.fileData!, sub.fileName!)}
                                                                className="inline-flex items-center gap-3 py-3 px-5 bg-surface text-text text-[10px] font-bold uppercase tracking-widest rounded-xl border-2 border-border-dark hover:border-primary transition-all truncate max-w-full shadow-pop-sm"
                                                            >
                                                                <FileText size={16} className="text-primary" />
                                                                <span className="truncate">{sub.fileName}</span>
                                                                <ExternalLink size={12} className="opacity-50" />
                                                            </button>
                                                        ) : (
                                                            <span className="text-[10px] text-text-secondary font-bold uppercase tracking-widest italic">No File</span>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="md:hidden text-[9px] font-bold text-text-secondary uppercase tracking-widest mb-2">{t('dropbox.score')}</p>
                                                        <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border-2 ${sub.grade !== undefined ? 'bg-success/10 text-success border-success/20' : 'bg-warning/10 text-warning border-warning/20'}`}>
                                                            {sub.grade !== undefined ? `${sub.grade} / 20` : t('dropbox.pending')}
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-end">
                                                        <button 
                                                            onClick={() => setIsGrading(sub.id)}
                                                            className={`p-4 rounded-2xl transition-all border-2 ${isBeingGraded ? 'bg-primary text-white border-border-dark shadow-pop-sm' : 'bg-surface text-text-secondary hover:text-primary border-border-dark shadow-pop-sm hover:translate-y-1 hover:shadow-none'}`}
                                                        >
                                                            <Star size={24} fill={sub.grade !== undefined ? "currentColor" : "none"} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Grading UI Expanded */}
                                                {isBeingGraded && (
                                                    <div className="p-10 md:p-12 bg-muted border-t-4 border-border-dark animate-in slide-in-from-top-4 duration-500">
                                                        <div className="mb-10 flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20">
                                                                <Award size={24} />
                                                            </div>
                                                            <h4 className="text-base font-display font-bold text-text uppercase tracking-tight">Evaluation Terminal</h4>
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
                                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-2">{t('dropbox.score')} (/20)</label>
                                                                    <input 
                                                                        name="grade" 
                                                                        type="number" 
                                                                        min="0" max="20" 
                                                                        defaultValue={sub.grade ?? ''} 
                                                                        className="academic-input w-full text-4xl text-center" 
                                                                        required 
                                                                    />
                                                                </div>
                                                                <div className="space-y-3">
                                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest px-2">{t('dropbox.review')}</label>
                                                                    <textarea 
                                                                        name="review" 
                                                                        rows={5} 
                                                                        defaultValue={sub.review ?? ''} 
                                                                        className="academic-input w-full resize-none leading-relaxed" 
                                                                        placeholder="Academic commentary for student reference..."
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-6 justify-end">
                                                                <button type="button" onClick={() => setIsGrading(null)} className="px-8 py-4 text-[11px] font-bold text-text-secondary hover:text-text transition-all uppercase tracking-widest">{t('common.cancel')}</button>
                                                                <button type="submit" className="academic-button academic-button-primary px-12 py-5">{t('dropbox.saveGrade')}</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                )}

                                                {/* Existing Review Display (Collapsible/Static) */}
                                                {!isBeingGraded && sub.review && (
                                                    <div className="mx-10 mb-10 p-8 bg-surface rounded-3xl border-2 border-border-dark text-start shadow-pop-sm">
                                                        <div className="flex items-center gap-3 mb-4 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                                                            <MessageSquare size={16} className="text-primary" />
                                                            {t('dropbox.review')}
                                                        </div>
                                                        <p className="text-sm text-text-secondary italic font-bold leading-relaxed">"{sub.review}"</p>
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