import React, { useEffect, useState, useMemo, memo } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where, addDoc, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User, StudentSubscription, TeacherPayment, FinancialAuditLog, FinancialSummary, StudentPaymentRecord } from '../types';
import { 
    Search, 
    Filter, 
    DollarSign, 
    User as UserIcon, 
    Calendar, 
    CreditCard, 
    FileText, 
    CheckCircle, 
    XCircle, 
    Clock, 
    ChevronDown,
    Save,
    Download,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    History,
    BarChart3,
    ArrowRight,
    Share2,
    FileSpreadsheet,
    FileJson,
    ShieldOff,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../App';
import { useLanguage } from '../contexts/LanguageContext';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    LineChart, 
    Line,
    Legend,
    Cell
} from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import * as ReactWindow from 'react-window';
const { FixedSizeList: List } = ReactWindow;
import { Skeleton } from '../components/Skeleton';
import StudentRow from '../components/StudentRow';
import TeacherRow from '../components/TeacherRow';

const EconomicDashboard: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { isMobile } = usePlatform();
    const { t, isRTL, language } = useLanguage();
    
    const [students, setStudents] = useState<User[]>([]);
    const [teachers, setTeachers] = useState<User[]>([]);
    const [subscriptions, setSubscriptions] = useState<Record<string, StudentSubscription>>({});
    const [payments, setPayments] = useState<Record<string, TeacherPayment>>({});
    const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
    const [paymentRecords, setPaymentRecords] = useState<StudentPaymentRecord[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'audit'>('overview');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [noteValue, setNoteValue] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [editingAmount, setEditingAmount] = useState<string | null>(null);
    const [amountValue, setAmountValue] = useState<number>(0);
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [dateValue, setDateValue] = useState<string>('');
    const [editingDuration, setEditingDuration] = useState<string | null>(null);
        const [durationValue, setDurationValue] = useState<number>(1);
    const [loading, setLoading] = useState(true);

    const formatCurrencyDZD = (amount: number) => {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
    };

    useEffect(() => {
        const unsubStudents = onSnapshot(query(collection(db, collections.users), where('role', '==', 'student')), (snap) => {
            setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
            setLoading(false); // Assume loaded when we have students
        });

        const unsubTeachers = onSnapshot(query(collection(db, collections.users), where('role', '==', 'teacher')), (snap) => {
            setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        });

        const unsubSubs = onSnapshot(collection(db, 'subscriptions'), (snap) => {
            const subs: Record<string, StudentSubscription> = {};
            snap.docs.forEach(d => {
                const data = d.data() as StudentSubscription;
                subs[data.studentId] = { ...data, id: d.id };
            });
            setSubscriptions(subs);
        });

        const unsubPayments = onSnapshot(collection(db, 'payments'), (snap) => {
            const pays: Record<string, TeacherPayment> = {};
            snap.docs.forEach(d => {
                const data = d.data() as TeacherPayment;
                pays[data.teacherId] = { ...data, id: d.id };
            });
            setPayments(pays);
        });

        const unsubAudit = onSnapshot(query(collection(db, 'financial_audit'), orderBy('timestamp', 'desc'), limit(50)), (snap) => {
            setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as FinancialAuditLog)));
        });

        const unsubPaymentRecords = onSnapshot(collection(db, 'student_payments'), (snap) => {
            setPaymentRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentPaymentRecord)));
        });

        return () => {
            unsubStudents(); unsubTeachers(); unsubSubs(); unsubPayments(); unsubAudit(); unsubPaymentRecords();
        };
    }, []);

    const logAction = async (action: string, details: string, targetId?: string, targetName?: string) => {
        if (!currentUser) return;
        await addDoc(collection(db, 'financial_audit'), {
            timestamp: Timestamp.now(),
            userId: currentUser.id,
            userName: currentUser.name,
            action,
            details,
            targetId,
            targetName
        });
    };

    const handleUpdateStudentPayment = async (studentId: string, paymentStatus: 'Paid' | 'Unpaid' | 'Pending') => {
        const sub = subscriptions[studentId];
        const student = students.find(s => s.id === studentId);
        if (!sub || !student) return;

        const oldPaymentStatus = student.paymentStatus || sub.paymentStatus;
        const oldAccountStatus = student.accountStatus || 'active';
        const newAccountStatus = paymentStatus === 'Unpaid' ? 'suspended' : 'active';
        const newPaymentStatus = paymentStatus.toLowerCase() as 'paid' | 'unpaid' | 'pending';

        await updateDoc(doc(db, 'subscriptions', sub.id), { paymentStatus });
        await updateDoc(doc(db, collections.users, studentId), { 
            accountStatus: newAccountStatus,
            paymentStatus: newPaymentStatus
        });

        await logAction(
            'Student Payment Update',
            `Status: ${oldPaymentStatus} -> ${paymentStatus}. Account: ${newAccountStatus}`,
            studentId,
            student.name
        );
    };

    const handleUpdateTeacherPayment = async (teacherId: string, status: 'Paid' | 'Unpaid' | 'Pending') => {
        const existing = payments[teacherId];
        const teacher = teachers.find(t => t.id === teacherId);
        const oldStatus = existing?.status || 'None';
        
        if (existing) {
            await updateDoc(doc(db, 'payments', existing.id), { 
                status, 
                lastPaymentDate: status === 'Paid' ? new Date().toISOString().split('T')[0] : existing.lastPaymentDate 
            });
        } else {
            await setDoc(doc(collection(db, 'payments')), {
                teacherId,
                teacherName: teacher?.name || 'Unknown',
                status,
                amountOwed: 0,
                amountPaid: 0,
                lastPaymentDate: status === 'Paid' ? new Date().toISOString().split('T')[0] : null,
                notes: ''
            });
        }
        await logAction('Payment Status Update', `Changed status from ${oldStatus} to ${status}`, teacherId, teacher?.name);
    };

    const handleSaveNote = async (teacherId: string) => {
        const existing = payments[teacherId];
        const teacher = teachers.find(t => t.id === teacherId);
        if (existing) {
            await updateDoc(doc(db, 'payments', existing.id), { notes: noteValue });
        } else {
            await setDoc(doc(collection(db, 'payments')), {
                teacherId,
                teacherName: teacher?.name || 'Unknown',
                status: 'Pending',
                amountOwed: 0,
                amountPaid: 0,
                notes: noteValue
            });
        }
        await logAction('Note Added', `Updated internal note for teacher`, teacherId, teacher?.name);
        setEditingNote(null);
    };

    const handleUpdateStudentAmount = async (studentId: string) => {
        const sub = subscriptions[studentId];
        if (!sub) return;

        await updateDoc(doc(db, 'subscriptions', sub.id), { monthlyAmount: amountValue });
        await logAction('Student Amount Update', `Updated monthly amount to ${formatCurrencyDZD(amountValue)}`, studentId, sub.studentName);
        setEditingAmount(null);
    };

    const handleUpdateTeacherSalary = async (teacherId: string) => {
        const pay = payments[teacherId];
        if (!pay) return;

        await updateDoc(doc(db, 'payments', pay.id), { monthlySalary: amountValue });
        await logAction('Teacher Salary Update', `Updated monthly salary to ${formatCurrencyDZD(amountValue)}`, teacherId, pay.teacherName);
        setEditingAmount(null);
    };

    const handleUpdateSubscriptionDuration = async (studentId: string) => {
        const sub = subscriptions[studentId];
        if (!sub) return;

        await updateDoc(doc(db, 'subscriptions', sub.id), { duration: durationValue });
        await logAction('Subscription Duration Update', `Updated duration to ${durationValue} months`, studentId, sub.studentName);
        setEditingDuration(null);
    };

    const handleUpdateNextPaymentDate = async (teacherId: string) => {
        const pay = payments[teacherId];
        if (!pay) return;

        await updateDoc(doc(db, 'payments', pay.id), { nextPaymentDate: dateValue });
        await logAction('Next Payment Date Update', `Updated next payment date to ${dateValue}`, teacherId, pay.teacherName);
        setEditingDate(null);
    };

    const financialSummary = useMemo<FinancialSummary>(() => {
        const totalExpected = Object.values(subscriptions).length * 12500; // Mock calculation in DZD
        const totalCollected = Object.values(subscriptions).filter(s => s.paymentStatus === 'Paid').length * 12500;
        const outstanding = totalExpected - totalCollected;
        const payroll = Object.values(payments).reduce((acc, p) => acc + (p.amountOwed || 0), 0);
        
        return {
            totalExpectedRevenue: totalExpected,
            totalCollectedRevenue: totalCollected,
            outstandingPayments: outstanding,
            teacherPayrollTotal: payroll,
            revenueHistory: [
                { month: 'Jan', collected: 500000, expected: 562500 },
                { month: 'Feb', collected: 475000, expected: 525000 },
                { month: 'Mar', collected: 525000, expected: 537500 },
                { month: 'Apr', collected: 562500, expected: 575000 },
                { month: 'May', collected: 512500, expected: 550000 },
                { month: 'Jun', collected: totalCollected, expected: totalExpected },
            ]
        };
    }, [subscriptions, payments]);

    const alerts = useMemo(() => {
        const expired = Object.values(subscriptions).filter(s => s.status === 'Expired').length;
        const unpaidT = Object.values(payments).filter(p => p.status === 'Unpaid').length;
        const revenueDrop = financialSummary.revenueHistory[5].collected < financialSummary.revenueHistory[4].collected;
        
        return { expired, unpaidT, revenueDrop };
    }, [subscriptions, payments, financialSummary]);

    const exportCSV = (data: any[], filename: string) => {
        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        logAction('Export', `Exported ${filename} as CSV`);
    };

    const exportPDF = (title: string, headers: string[], rows: any[][], filename: string) => {
        const doc = new jsPDF();
        doc.text(title, 14, 15);
        (doc as any).autoTable({
            head: [headers],
            body: rows,
            startY: 20,
        });
        doc.save(`${filename}.pdf`);
        logAction('Export', `Exported ${filename} as PDF`);
    };

    const filteredStudents = students.filter(s => {
        const sub = subscriptions[s.id];
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || (sub && sub.status.toLowerCase() === filterStatus.toLowerCase());
        return matchesSearch && matchesFilter;
    });

    const filteredTeachers = teachers.filter(t_user => {
        const pay = payments[t_user.id];
        const matchesSearch = t_user.name.toLowerCase().includes(searchTerm.toLowerCase()) || t_user.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || (pay && pay.status.toLowerCase() === filterStatus.toLowerCase());
        return matchesSearch && matchesFilter;
    });

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'disabled': return 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
            case 'suspended': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            case 'expired': case 'unpaid': case 'missed': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            case 'pending': case 'partially paid': case 'late': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const StudentList = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                            <Skeleton className="h-4 w-full mt-4" />
                        </div>
                    ))}
                </div>
            );
        }

        const itemData = {
            students: filteredStudents,
            subscriptions,
            isMobile,
            t,
            getStatusColor,
            handleUpdateStudentPayment,
            selectedStudentId,
            setSelectedStudentId,
            paymentRecords,
            formatCurrencyDZD,
            editingAmount,
            setEditingAmount,
            amountValue,
            setAmountValue,
            handleUpdateStudentAmount,
            editingDuration,
            setEditingDuration,
            durationValue,
            setDurationValue,
            handleUpdateSubscriptionDuration
        };

        if (isMobile) {
            return (
                <List
                    height={600}
                    itemCount={filteredStudents.length}
                    itemSize={350} // Adjust based on mobile card height
                    width="100%"
                    itemData={itemData}
                >
                    {StudentRow}
                </List>
            );
        }

        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <table className="w-full text-start border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('admin.legalName')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Account Status</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.status')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.plan')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.payment')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.start')} / {t('economic.end')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Monthly Amount</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Duration</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-end">Timeline</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <List
                            height={600}
                            itemCount={filteredStudents.length}
                            itemSize={120} // Adjust based on desktop row height
                            width="100%"
                            itemData={itemData}
                        >
                            {StudentRow}
                        </List>
                    </tbody>
                </table>
            </div>
        );
    };

    const TeacherList = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-8 w-24" />
                            </div>
                            <Skeleton className="h-4 w-full mt-4" />
                        </div>
                    ))}
                </div>
            );
        }

        const itemData = {
            teachers: filteredTeachers,
            payments,
            isMobile,
            t,
            handleUpdateTeacherPayment,
            editingNote,
            setEditingNote,
            noteValue,
            setNoteValue,
            handleSaveNote,
            formatCurrencyDZD,
            editingAmount,
            setEditingAmount,
            amountValue,
            setAmountValue,
            handleUpdateTeacherSalary,
            editingDate,
            setEditingDate,
            dateValue,
            setDateValue,
            handleUpdateNextPaymentDate
        };

        if (isMobile) {
            return (
                <List
                    height={600}
                    itemCount={filteredTeachers.length}
                    itemSize={280} // Adjust based on mobile card height
                    width="100%"
                    itemData={itemData}
                >
                    {TeacherRow}
                </List>
            );
        }

        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <table className="w-full text-start border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('admin.legalName')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.status')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.amountOwed')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.amountPaid')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Next Payment Date</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Monthly Salary</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.notes')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <List
                            height={600}
                            itemCount={filteredTeachers.length}
                            itemSize={120} // Adjust based on desktop row height
                            width="100%"
                            itemData={itemData}
                        >
                            {TeacherRow}
                        </List>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="fade-in max-w-7xl mx-auto px-4 lg:px-0 pb-20">
            {/* Header & Tabs */}
            <div className="mb-10 flex flex-col gap-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="text-start">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{t('economic.title')}</h2>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Institutional President Terminal v3.1</p>
                    </div>
                    
                    {/* Desktop Tabs */}
                    <div className="hidden md:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        {(['overview', 'students', 'teachers', 'audit'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {tab === 'overview' ? 'Overview' : tab === 'students' ? t('economic.studentSubs') : tab === 'teachers' ? t('economic.teacherPayments') : 'Audit'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Tabs - Centered & Polished */}
                <div className="md:hidden flex justify-center">
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner overflow-x-auto scrollbar-hide max-w-full">
                        {(['overview', 'students', 'teachers', 'audit'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-primary shadow-md scale-105' : 'text-slate-500'}`}>
                                {tab === 'overview' ? 'Overview' : tab === 'students' ? t('economic.studentSubs').split(' ')[0] : tab === 'teachers' ? t('economic.teacherPayments').split(' ')[0] : 'Audit'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { label: t('economic.expected'), value: formatCurrencyDZD(financialSummary.totalExpectedRevenue), icon: TrendingUp, color: 'text-primary' },
                            { label: t('economic.collected'), value: formatCurrencyDZD(financialSummary.totalCollectedRevenue), icon: DollarSign, color: 'text-emerald-500' },
                            { label: t('economic.outstanding'), value: formatCurrencyDZD(financialSummary.outstandingPayments), icon: TrendingDown, color: 'text-rose-500' },
                            { label: t('economic.payroll'), value: formatCurrencyDZD(financialSummary.teacherPayrollTotal), icon: CreditCard, color: 'text-amber-500' },
                        ].map((kpi, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 ${kpi.color} group-hover:scale-110 transition-transform`}>
                                        <kpi.icon size={20} />
                                    </div>
                                    <ArrowRight size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{kpi.label}</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{kpi.value}</h3>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Revenue Chart */}
                        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div className="text-start">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('economic.revenue')} Analysis</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Monthly Collected vs Expected</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => exportCSV(financialSummary.revenueHistory, 'revenue_report')} className="p-2 text-slate-400 hover:text-primary transition-colors"><FileSpreadsheet size={18} /></button>
                                    <button onClick={() => exportPDF('Revenue Report', ['Month', 'Collected', 'Expected'], financialSummary.revenueHistory.map(h => [h.month, h.collected, h.expected]), 'revenue_report')} className="p-2 text-slate-400 hover:text-primary transition-colors"><FileJson size={18} /></button>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={financialSummary.revenueHistory}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={(value) => `${value / 1000}k`} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                                            cursor={{ fill: '#f8fafc' }}
                                            formatter={(value: number) => formatCurrencyDZD(value)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '20px' }} />
                                        <Bar dataKey="expected" fill="#e2e8f0" radius={[4, 4, 0, 0]} name={t('economic.expected')} />
                                        <Bar dataKey="collected" fill="#6366f1" radius={[4, 4, 0, 0]} name={t('economic.collected')} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Alerts Panel */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-8 text-start">{t('economic.alerts')}</h3>
                            <div className="space-y-4">
                                {[
                                    { label: t('economic.expiredSubs'), count: alerts.expired, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                                    { label: t('economic.unpaidTeachers'), count: alerts.unpaidT, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
                                    { label: t('economic.revenueDrop'), active: alerts.revenueDrop, icon: TrendingDown, color: alerts.revenueDrop ? 'text-rose-500' : 'text-emerald-500', bg: alerts.revenueDrop ? 'bg-rose-50' : 'bg-emerald-50' },
                                ].map((alert, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between group hover:border-primary/20 transition-all`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl ${alert.bg} dark:bg-slate-800 ${alert.color}`}>
                                                <alert.icon size={18} />
                                            </div>
                                            <div className="text-start">
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{alert.label}</p>
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">System Flag</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-black ${alert.color}`}>
                                            {alert.count !== undefined ? alert.count : (alert.active ? 'YES' : 'NO')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                                <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                                    Generate Monthly Report
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(activeTab === 'students' || activeTab === 'teachers') && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Filters & Search */}
                    <div className="mb-8 flex flex-col md:flex-row gap-4 sticky top-24 z-30 bg-body/80 backdrop-blur-md py-4">
                        <div className="relative flex-1 group">
                            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors`} size={18} />
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={t('inbox.searchPlaceholder')}
                                className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl ${isRTL ? 'pr-12' : 'pl-12'} py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm`}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="relative">
                                <Filter className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
                                <select 
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl ${isRTL ? 'pr-12 pl-8' : 'pl-12 pr-8'} py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer shadow-sm`}>
                                    <option value="all">All Status</option>
                                    <option value="active">{t('economic.active')}</option>
                                    <option value="expired">{t('economic.expired')}</option>
                                    <option value="pending">{t('economic.pending')}</option>
                                    <option value="paid">{t('economic.paid')}</option>
                                    <option value="unpaid">{t('economic.unpaid')}</option>
                                </select>
                                <ChevronDown className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none`} size={14} />
                            </div>
                            <button 
                                onClick={() => activeTab === 'students' 
                                    ? exportCSV(filteredStudents.map(s => ({ ...s, ...subscriptions[s.id] })), 'student_subscriptions')
                                    : exportCSV(filteredTeachers.map(t_user => ({ ...t_user, ...payments[t_user.id] })), 'teacher_payments')
                                }
                                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm">
                                <Download size={20} />
                            </button>
                        </div>
                    </div>

                    {activeTab === 'students' ? (
                        isMobile ? (
                            <div className="space-y-4">
                                {filteredStudents.map(s => {
                                    const sub = subscriptions[s.id];
                                    return (
                                        <div key={s.id} className={`bg-white dark:bg-slate-900 border-l-4 ${sub?.paymentStatus === 'Paid' ? 'border-emerald-500' : sub?.paymentStatus === 'Unpaid' ? 'border-rose-500' : 'border-amber-500'} rounded-2xl p-6 text-start shadow-sm`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-black text-sm">
                                                        {s.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-900 dark:text-white">{s.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {s.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {s.accountStatus === 'disabled' 
                                                        ? <ShieldOff size={16} className="text-rose-500" /> 
                                                        : <ShieldCheck size={16} className="text-emerald-500" />
                                                    }
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.accountStatus === 'disabled' ? getStatusColor('disabled') : getStatusColor('active')}`}>
                                                        {s.accountStatus || 'active'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('economic.plan')}</p>
                                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{sub?.plan || '---'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('economic.payment')}</p>
                                                    <div className="relative mt-1">
                                                        <select 
                                                            value={sub?.paymentStatus || 'Pending'}
                                                            onChange={(e) => handleUpdateStudentPayment(s.id, e.target.value as 'Paid' | 'Unpaid' | 'Pending')}
                                                            className={`w-full appearance-none text-xs font-bold p-2 rounded-lg border-2 bg-transparent transition-all ${sub?.paymentStatus === 'Paid' ? 'border-emerald-200 text-emerald-700' : sub?.paymentStatus === 'Unpaid' ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}>
                                                            <option value="Paid">Paid</option>
                                                            <option value="Unpaid">Unpaid</option>
                                                            <option value="Pending">Pending</option>
                                                        </select>
                                                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                                                className="w-full mt-4 py-3 text-[9px] font-black uppercase tracking-widest text-primary flex items-center justify-center gap-2">
                                                <History size={14} /> {selectedStudentId === s.id ? 'Hide Timeline' : t('economic.timeline')}
                                            </button>
                                            {selectedStudentId === s.id && (
                                                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 space-y-3 animate-in slide-in-from-top-2 duration-300">
                                                    {paymentRecords.filter(r => r.studentId === s.id).map(r => (
                                                        <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${getStatusColor(r.status)}`} />
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{r.date}</p>
                                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">{formatCurrencyDZD(r.amount)} • {r.method}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-[8px] font-black uppercase tracking-widest ${getStatusColor(r.status)}`}>{r.status}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                                <table className="w-full text-start border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('admin.legalName')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Account Status</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.status')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.plan')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.payment')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.start')} / {t('economic.end')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Duration</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Monthly Amount</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-end">Timeline</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredStudents.map(s => {
                                            const sub = subscriptions[s.id];
                                            return (
                                                <React.Fragment key={s.id}>
                                                    <tr className={`transition-colors ${s.accountStatus === 'disabled' || s.accountStatus === 'suspended' ? 'bg-rose-50 dark:bg-rose-950/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 font-black text-sm ${s.accountStatus === 'disabled' || s.accountStatus === 'suspended' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                                                    {s.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {s.id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-2">
                                                                {(s.accountStatus === 'disabled' || s.accountStatus === 'suspended')
                                                                    ? <ShieldOff size={16} className="text-rose-500" /> 
                                                                    : <ShieldCheck size={16} className="text-emerald-500" />
                                                                }
                                                                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.accountStatus === 'disabled' || s.accountStatus === 'suspended' ? getStatusColor('suspended') : getStatusColor('active')}`}>
                                                                    {s.accountStatus || 'active'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${getStatusColor(sub?.status || 'Pending')}`}>
                                                                {sub?.status || t('economic.pending')}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{sub?.plan || '---'}</p>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="relative w-36">
                                                                <select 
                                                                    value={sub?.paymentStatus || 'Pending'}
                                                                    onChange={(e) => handleUpdateStudentPayment(s.id, e.target.value as 'Paid' | 'Unpaid' | 'Pending')}
                                                                    className={`w-full appearance-none text-xs font-bold p-2 rounded-lg border-2 bg-transparent transition-all ${sub?.paymentStatus === 'Paid' ? 'border-emerald-200 text-emerald-700' : sub?.paymentStatus === 'Unpaid' ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}>
                                                                    <option value="Paid">Paid</option>
                                                                    <option value="Unpaid">Unpaid</option>
                                                                    <option value="Pending">Pending</option>
                                                                </select>
                                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex flex-col gap-1">
                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{sub?.startDate || '---'}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">{sub?.endDate || '---'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            {editingAmount === s.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-24 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border-2 border-primary" />
                                                                    <button onClick={() => handleUpdateStudentAmount(s.id)} className="p-2 bg-primary text-white rounded-lg"><Save size={16} /></button>
                                                                </div>
                                                            ) : (
                                                                <div onClick={() => { setEditingAmount(s.id); setAmountValue(sub?.monthlyAmount || 0); }} className="cursor-pointer">
                                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrencyDZD(sub?.monthlyAmount || 0)}</p>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            {editingDuration === s.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input type="number" value={durationValue} onChange={(e) => setDurationValue(Number(e.target.value))} className="w-20 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border-2 border-primary" />
                                                                    <button onClick={() => handleUpdateSubscriptionDuration(s.id)} className="p-2 bg-primary text-white rounded-lg"><Save size={16} /></button>
                                                                </div>
                                                            ) : (
                                                                <div onClick={() => { setEditingDuration(s.id); setDurationValue(sub?.duration || 1); }} className="cursor-pointer">
                                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub?.duration || 1} Months</p>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-8 py-6 text-end">
                                                            <button 
                                                                onClick={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                                                                className={`p-3 rounded-xl transition-all ${selectedStudentId === s.id ? 'bg-primary text-white' : 'text-slate-400 hover:text-primary hover:bg-primary/5'}`}>
                                                                <History size={18} />
                                                            </button>
                                                        </td>
                                                        <td className="px-8 py-6 text-end">
                                                            <div className="flex justify-end gap-3">
                                                                <button 
                                                                    onClick={() => handleUpdateStudentPayment(s.id, 'Paid')}
                                                                    className={`p-3 rounded-2xl transition-all ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500'}`}>
                                                                    <CheckCircle size={20} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleUpdateStudentPayment(s.id, 'Unpaid')}
                                                                    className={`p-3 rounded-2xl transition-all ${sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500'}`}>
                                                                    <XCircle size={20} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {selectedStudentId === s.id && (
                                                        <tr>
                                                            <td colSpan={8} className="px-8 py-8 bg-slate-50 dark:bg-slate-950/50">
                                                                <div className="max-w-4xl mx-auto">
                                                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 flex items-center gap-3">
                                                                        <History size={14} className="text-primary" />
                                                                        {t('economic.timeline')}
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                                        {paymentRecords.filter(r => r.studentId === s.id).map(r => (
                                                                            <div key={r.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${getStatusColor(r.status)}`}>{r.status}</span>
                                                                                    <p className="text-[10px] font-bold text-slate-400">{r.date}</p>
                                                                                </div>
                                                                                <div className="flex items-center justify-between">
                                                                                    <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrencyDZD(r.amount)}</p>
                                                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{r.method}</p>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : (
                        isMobile ? (
                            <div className="space-y-4">
                                {filteredTeachers.map(t_user => {
                                    const pay = payments[t_user.id];
                                    return (
                                        <div key={t_user.id} className="bg-white dark:bg-slate-900 border-l-4 border-primary rounded-2xl p-6 text-start shadow-sm">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                                        {t_user.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-sm text-slate-900 dark:text-white">{t_user.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {t_user.id}</p>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <select 
                                                        value={pay?.status || 'Pending'}
                                                        onChange={(e) => handleUpdateTeacherPayment(t_user.id, e.target.value as 'Paid' | 'Unpaid' | 'Pending')}
                                                        className={`w-full appearance-none text-xs font-bold p-2 rounded-lg border-2 bg-transparent transition-all ${pay?.status === 'Paid' ? 'border-emerald-200 text-emerald-700' : pay?.status === 'Unpaid' ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}>
                                                        <option value="Paid">Paid</option>
                                                        <option value="Unpaid">Unpaid</option>
                                                        <option value="Pending">Pending</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('economic.amountOwed')}</p>
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('economic.amountPaid')}</p>
                                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
                                                </div>
                                            </div>
                                            <div className="pt-4">
                                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-2">{t('economic.notes')}</p>
                                                {editingNote === t_user.id ? (
                                                    <div className="flex gap-2">
                                                        <input 
                                                            value={noteValue}
                                                            onChange={e => setNoteValue(e.target.value)}
                                                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none"
                                                        />
                                                        <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"><Save size={16} /></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                                        <p className="text-xs font-medium text-slate-500 italic truncate">{pay?.notes || 'No notes added...'}</p>
                                                        <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-primary"><FileText size={16} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                                <table className="w-full text-start border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('admin.legalName')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.status')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.amountOwed')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.amountPaid')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Next Payment Date</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">Monthly Salary</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-start">{t('economic.notes')}</th>
                                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-end">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredTeachers.map(t_user => {
                                            const pay = payments[t_user.id];
                                            return (
                                                <tr key={t_user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                                                {t_user.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm text-slate-900 dark:text-white">{t_user.name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {t_user.id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="relative w-36">
                                                            <select 
                                                                value={pay?.status || 'Pending'}
                                                                onChange={(e) => handleUpdateTeacherPayment(t_user.id, e.target.value as 'Paid' | 'Unpaid' | 'Pending')}
                                                                className={`w-full appearance-none text-xs font-bold p-2 rounded-lg border-2 bg-transparent transition-all ${pay?.status === 'Paid' ? 'border-emerald-200 text-emerald-700' : pay?.status === 'Unpaid' ? 'border-rose-200 text-rose-700' : 'border-amber-200 text-amber-700'}`}>
                                                                <option value="Paid">Paid</option>
                                                                <option value="Unpaid">Unpaid</option>
                                                                <option value="Pending">Pending</option>
                                                            </select>
                                                            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-black text-rose-600 dark:text-rose-400">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {editingDate === t_user.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="w-36 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border-2 border-primary" />
                                                                <button onClick={() => handleUpdateNextPaymentDate(t_user.id)} className="p-2 bg-primary text-white rounded-lg"><Save size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <div onClick={() => { setEditingDate(t_user.id); setDateValue(pay?.nextPaymentDate || ''); }} className="cursor-pointer">
                                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{pay?.nextPaymentDate || 'Not set'}</p>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        {editingAmount === t_user.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-24 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border-2 border-primary" />
                                                                <button onClick={() => handleUpdateTeacherSalary(t_user.id)} className="p-2 bg-primary text-white rounded-lg"><Save size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <div onClick={() => { setEditingAmount(t_user.id); setAmountValue(pay?.monthlySalary || 0); }} className="cursor-pointer">
                                                                <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrencyDZD(pay?.monthlySalary || 0)}</p>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 max-w-xs">
                                                        {editingNote === t_user.id ? (
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    value={noteValue}
                                                                    onChange={e => setNoteValue(e.target.value)}
                                                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none"
                                                                />
                                                                <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"><Save size={16} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                                                                <p className="text-xs font-medium text-slate-500 italic truncate">{pay?.notes || 'No notes added...'}</p>
                                                                <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-primary opacity-0 group-hover:opacity-100 transition-all"><FileText size={16} /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-6 text-end">
                                                        <div className="flex justify-end gap-3">
                                                            <button 
                                                                onClick={() => handleUpdateTeacherPayment(t_user.id, 'Paid')}
                                                                className={`p-3 rounded-2xl transition-all ${pay?.status === 'Paid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500'}`}
                                                                title={t('economic.markPaid')}>
                                                                <CheckCircle size={20} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUpdateTeacherPayment(t_user.id, 'Unpaid')}
                                                                className={`p-3 rounded-2xl transition-all ${pay?.status === 'Unpaid' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500'}`}
                                                                title={t('economic.markUnpaid')}>
                                                                <XCircle size={20} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )
                    )}
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('economic.auditLog')}</h3>
                            <button onClick={() => exportCSV(auditLogs, 'financial_audit_log')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                <Download size={14} /> {t('economic.export')}
                            </button>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <History size={18} />
                                        </div>
                                        <div className="text-start">
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{log.action}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.details}</p>
                                            {log.targetName && <p className="text-[9px] font-black text-primary uppercase mt-1">Target: {log.targetName}</p>}
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{log.userName}</p>
                                        <p className="text-[9px] font-bold text-slate-400 mt-1">
                                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '---'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {auditLogs.length === 0 && (
                                <div className="p-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest">
                                    No audit entries found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EconomicDashboard;
