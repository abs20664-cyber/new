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
import { usePlatform } from '../contexts/PlatformContext';
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
import { FixedSizeList as List } from 'react-window';
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
    
    const [editingSession, setEditingSession] = useState<RecurringSession | null>(null);
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
    const [subscriptionType, setSubscriptionType] = useState<'time' | 'session'>('time');
    const [sessionsValue, setSessionsValue] = useState<number>(4);
    const [loading, setLoading] = useState(true);
    const [hasCheckedExpirations, setHasCheckedExpirations] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState<User | null>(null);

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

    useEffect(() => {
        if (hasCheckedExpirations || Object.keys(subscriptions).length === 0 || students.length === 0) return;

        const checkExpiredSubscriptions = async () => {
            const today = new Date().toISOString().split('T')[0];
            let updated = false;
            
            for (const student of students) {
                const sub = subscriptions[student.id];
                if (!sub || !sub.endDate) continue;

                if (sub.endDate < today && sub.paymentStatus !== 'Pending') {
                    await updateDoc(doc(db, 'subscriptions', sub.id), { paymentStatus: 'Pending' });
                    await updateDoc(doc(db, collections.users, student.id), { 
                        accountStatus: 'pending',
                        paymentStatus: 'pending'
                    });
                    await logAction(
                        'Auto-Status Update',
                        `Subscription expired. Status changed to Pending.`,
                        student.id,
                        student.name
                    );
                    updated = true;
                }
            }
            setHasCheckedExpirations(true);
        };

        checkExpiredSubscriptions();
    }, [subscriptions, students, hasCheckedExpirations]);

    const calculateEndDate = (startDate: string, durationMonths: number) => {
        if (!startDate) return '';
        const date = new Date(startDate);
        if (isNaN(date.getTime())) return '';
        date.setMonth(date.getMonth() + durationMonths);
        return date.toISOString().split('T')[0];
    };

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
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const sub = subscriptions[studentId];
        
        if (sub) {
            await updateDoc(doc(db, 'subscriptions', sub.id), { monthlyAmount: amountValue });
        } else {
            await setDoc(doc(db, 'subscriptions', studentId), {
                studentId,
                studentName: student.name,
                status: 'active',
                paymentStatus: 'Pending',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '', // Will be calculated when duration is set or default
                duration: 1,
                monthlyAmount: amountValue
            });
        }

        await logAction('Student Amount Update', `Updated monthly amount to ${formatCurrencyDZD(amountValue)}`, studentId, student.name);
        setEditingAmount(null);
    };

    const handleUpdateAccountStatus = async (userId: string, status: string) => {
        const user = [...students, ...teachers].find(u => u.id === userId);
        if (!user) return;

        await updateDoc(doc(db, collections.users, userId), { accountStatus: status });
        await logAction('Account Status Update', `Updated account status to ${status}`, userId, user.name);
    };

    const handleUpdateTeacherSalary = async (teacherId: string) => {
        const pay = payments[teacherId];
        if (!pay) return;

        await updateDoc(doc(db, 'payments', pay.id), { monthlySalary: amountValue });
        await logAction('Teacher Salary Update', `Updated monthly salary to ${formatCurrencyDZD(amountValue)}`, teacherId, pay.teacherName);
        setEditingAmount(null);
    };

    const handleUpdateSubscriptionDuration = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        const sub = subscriptions[studentId];
        const startDate = sub?.startDate || new Date().toISOString().split('T')[0];
        
        let newEndDate = sub?.endDate;
        if (subscriptionType === 'time') {
            newEndDate = calculateEndDate(startDate, durationValue);
        }

        const updateData: any = {
            subscriptionType,
            startDate
        };

        if (subscriptionType === 'time') {
            updateData.duration = durationValue;
            updateData.endDate = newEndDate;
            updateData.totalSessions = null;
            updateData.sessionsUsed = null;
        } else {
            updateData.totalSessions = sessionsValue;
            updateData.sessionsUsed = (sub?.subscriptionType === 'session' ? sub.sessionsUsed : 0) || 0;
            updateData.duration = null;
            updateData.endDate = null;
        }

        if (sub) {
            await updateDoc(doc(db, 'subscriptions', sub.id), updateData);
        } else {
            await setDoc(doc(db, 'subscriptions', studentId), {
                studentId,
                studentName: student.name,
                status: 'active',
                paymentStatus: 'Pending',
                monthlyAmount: 0,
                ...updateData
            });
        }

        await logAction('Subscription Update', `Updated subscription to ${subscriptionType === 'time' ? durationValue + ' months' : sessionsValue + ' sessions'}`, studentId, student.name);
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
        const sanitizeValue = (value: any, depth = 0): any => {
            if (depth > 3) return '[Depth Limit]';
            if (value === null || value === undefined) return '';
            
            if (typeof value === 'object') {
                // Handle Firestore Timestamp
                if (value.seconds !== undefined && value.nanoseconds !== undefined) {
                    return new Date(value.seconds * 1000).toISOString();
                }
                // Handle Date objects
                if (value instanceof Date) {
                    return value.toISOString();
                }
                // Handle arrays - join them
                if (Array.isArray(value)) {
                    return value.map(v => sanitizeValue(v, depth + 1)).join(', ');
                }
                
                // Handle other objects - try to stringify, fallback to string representation
                try {
                    return JSON.stringify(value);
                } catch (e) {
                    return '[Complex Data]';
                }
            }
            return value;
        };

        const sanitizedData = data.map(item => {
            const newItem: any = {};
            Object.keys(item).forEach(key => {
                newItem[key] = sanitizeValue(item[key]);
            });
            return newItem;
        });

        const csv = Papa.unparse(sanitizedData);
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
            case 'disabled': return 'bg-institutional-200 text-institutional-600 dark:bg-institutional-800 dark:text-institutional-400';
            case 'suspended': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            case 'expired': case 'unpaid': case 'missed': return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
            case 'pending': case 'partially paid': case 'late': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'bg-institutional-100 text-institutional-700 dark:bg-institutional-800 dark:text-institutional-400';
        }
    };

    const StudentList = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-surface dark:bg-institutional-900 rounded-2xl p-6 shadow-sm">
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
            selectedStudentId,
            setSelectedStudentId,
            paymentRecords,
            formatCurrencyDZD,
            setAmountValue,
            setDurationValue,
            setSubscriptionType,
            setSessionsValue,
            setStudentToEdit
        };

        if (isMobile) {
            return (
                <div className="space-y-4">
                    {filteredStudents.map((s, idx) => (
                        <StudentRow 
                            key={s.id} 
                            index={idx} 
                            style={{}} 
                            data={itemData} 
                        />
                    ))}
                    {filteredStudents.length === 0 && (
                        <div className="p-20 text-center text-institutional-400 text-xs font-black uppercase tracking-widest">
                            No students found matching filters.
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse">
                        <thead>
                            <tr className="bg-institutional-50 dark:bg-institutional-950 border-b border-institutional-200 dark:border-institutional-800">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('admin.legalName')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">Account Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('economic.start')} / {t('economic.end')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">Monthly Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">Duration</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-end">Timeline</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-institutional-100 dark:divide-institutional-800">
                            {filteredStudents.map((s, idx) => (
                                <StudentRow 
                                    key={s.id} 
                                    index={idx} 
                                    style={{}} 
                                    data={itemData} 
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const TeacherList = () => {
        if (loading) {
            return (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-surface dark:bg-institutional-900 rounded-2xl p-6 shadow-sm">
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
                <div className="space-y-4">
                    {filteredTeachers.map((t_user, idx) => (
                        <TeacherRow 
                            key={t_user.id} 
                            index={idx} 
                            style={{}} 
                            data={itemData} 
                        />
                    ))}
                    {filteredTeachers.length === 0 && (
                        <div className="p-20 text-center text-institutional-400 text-xs font-black uppercase tracking-widest">
                            No teachers found matching filters.
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse">
                        <thead>
                            <tr className="bg-institutional-50 dark:bg-institutional-950 border-b border-institutional-200 dark:border-institutional-800">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('admin.legalName')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('economic.status')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('economic.amountOwed')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('economic.amountPaid')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">Next Payment Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">Monthly Salary</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-start">{t('economic.notes')}</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-400 text-end">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-institutional-100 dark:divide-institutional-800">
                            {filteredTeachers.map((t_user, idx) => (
                                <TeacherRow 
                                    key={t_user.id} 
                                    index={idx} 
                                    style={{}} 
                                    data={itemData} 
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="fade-in max-w-7xl mx-auto px-4 lg:px-0 pb-20">
            {/* Header & Tabs */}
            <div className="mb-10 flex flex-col gap-8 pb-6 border-b border-institutional-200 dark:border-institutional-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="text-start">
                        <h2 className="text-3xl font-black uppercase tracking-tight text-institutional-900 dark:text-white">{t('economic.title')}</h2>
                        <p className="text-[10px] font-black text-institutional-500 uppercase tracking-[0.3em] mt-1">Institutional President Terminal v3.1</p>
                    </div>
                    
                    {/* Desktop Tabs */}
                    <div className="hidden md:flex bg-institutional-100 dark:bg-institutional-800 p-1 rounded-2xl">
                        {(['overview', 'students', 'teachers', 'audit'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-surface dark:bg-institutional-700 text-primary shadow-soft' : 'text-institutional-500 hover:text-institutional-700'}`}>
                                {tab === 'overview' ? 'Overview' : tab === 'students' ? t('economic.studentSubs') : tab === 'teachers' ? t('economic.teacherPayments') : 'Audit'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Tabs - Centered & Polished */}
                <div className="md:hidden flex justify-center mb-6">
                    <div className="inline-flex bg-institutional-100 dark:bg-institutional-800 p-1.5 rounded-2xl shadow-inner overflow-x-auto scrollbar-hide max-w-[95vw]">
                        {(['overview', 'students', 'teachers', 'audit'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-surface dark:bg-institutional-700 text-primary shadow-md scale-105' : 'text-institutional-500'}`}>
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
                            <div key={i} className="bg-surface dark:bg-institutional-900 p-6 rounded-[2rem] border border-institutional-200 dark:border-institutional-800 shadow-soft hover:shadow-strong transition-all group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-2xl bg-institutional-50 dark:bg-institutional-800 ${kpi.color} group-hover:scale-110 transition-transform`}>
                                        <kpi.icon size={20} />
                                    </div>
                                    <ArrowRight size={14} className="text-institutional-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-[10px] font-black uppercase text-institutional-400 tracking-widest mb-1">{kpi.label}</p>
                                <h3 className="text-2xl font-black text-institutional-900 dark:text-white">{kpi.value}</h3>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Revenue Chart */}
                        <div className="lg:col-span-2 bg-surface dark:bg-institutional-900 p-8 rounded-[2.5rem] border border-institutional-200 dark:border-institutional-800 shadow-soft">
                            <div className="flex items-center justify-between mb-8">
                                <div className="text-start">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-institutional-900 dark:text-white">{t('economic.revenue')} Analysis</h3>
                                    <p className="text-[10px] font-bold text-institutional-400 uppercase mt-1">Monthly Collected vs Expected</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => exportCSV(financialSummary.revenueHistory, 'revenue_report')} className="p-2 text-institutional-400 hover:text-primary transition-colors"><FileSpreadsheet size={18} /></button>
                                    <button onClick={() => exportPDF('Revenue Report', ['Month', 'Collected', 'Expected'], financialSummary.revenueHistory.map(h => [h.month, h.collected, h.expected]), 'revenue_report')} className="p-2 text-institutional-400 hover:text-primary transition-colors"><FileJson size={18} /></button>
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
                        <div className="bg-surface dark:bg-institutional-900 p-8 rounded-[2.5rem] border border-institutional-200 dark:border-institutional-800 shadow-soft">
                            <h3 className="text-sm font-black uppercase tracking-widest text-institutional-900 dark:text-white mb-8 text-start">{t('economic.alerts')}</h3>
                            <div className="space-y-4">
                                {[
                                    { label: t('economic.expiredSubs'), count: alerts.expired, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                                    { label: t('economic.unpaidTeachers'), count: alerts.unpaidT, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
                                    { label: t('economic.revenueDrop'), active: alerts.revenueDrop, icon: TrendingDown, color: alerts.revenueDrop ? 'text-rose-500' : 'text-emerald-500', bg: alerts.revenueDrop ? 'bg-rose-50' : 'bg-emerald-50' },
                                ].map((alert, i) => (
                                    <div key={i} className={`p-5 rounded-2xl border border-institutional-100 dark:border-institutional-800 flex items-center justify-between group hover:border-primary/20 transition-all`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2.5 rounded-xl ${alert.bg} dark:bg-institutional-800 ${alert.color}`}>
                                                <alert.icon size={18} />
                                            </div>
                                            <div className="text-start">
                                                <p className="text-xs font-bold text-institutional-700 dark:text-institutional-300">{alert.label}</p>
                                                <p className="text-[9px] font-black uppercase text-institutional-400 tracking-widest mt-0.5">System Flag</p>
                                            </div>
                                        </div>
                                        <span className={`text-sm font-black ${alert.color}`}>
                                            {alert.count !== undefined ? alert.count : (alert.active ? 'YES' : 'NO')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-8 pt-8 border-t border-institutional-100 dark:border-institutional-800">
                                <button className="w-full py-4 bg-institutional-900 dark:bg-white text-white dark:text-institutional-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
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
                            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-400 group-focus-within:text-primary transition-colors`} size={18} />
                            <input 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder={t('inbox.searchPlaceholder')}
                                className={`w-full bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-2xl ${isRTL ? 'pr-12' : 'pl-12'} py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-soft`}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="relative">
                                <Filter className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-400`} size={16} />
                                <select 
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className={`bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-2xl ${isRTL ? 'pr-12 pl-8' : 'pl-12 pr-8'} py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all appearance-none cursor-pointer shadow-soft`}>
                                    <option value="all">All Status</option>
                                    <option value="active">{t('economic.active')}</option>
                                    <option value="expired">{t('economic.expired')}</option>
                                    <option value="pending">{t('economic.pending')}</option>
                                    <option value="paid">{t('economic.paid')}</option>
                                    <option value="unpaid">{t('economic.unpaid')}</option>
                                </select>
                                <ChevronDown className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-institutional-400 pointer-events-none`} size={14} />
                            </div>
                            <button 
                                onClick={() => activeTab === 'students' 
                                    ? exportCSV(filteredStudents.map(s => ({ ...s, ...subscriptions[s.id] })), 'student_subscriptions')
                                    : exportCSV(filteredTeachers.map(t_user => ({ ...t_user, ...payments[t_user.id] })), 'teacher_payments')
                                }
                                className="p-4 bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-2xl text-institutional-400 hover:text-primary transition-all shadow-soft">
                                <Download size={20} />
                            </button>
                        </div>
                    </div>

                    {activeTab === 'students' && <StudentList />}
                    {activeTab === 'teachers' && <TeacherList />}
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-surface dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                        <div className="p-8 border-b border-institutional-100 dark:border-institutional-800 flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-widest text-institutional-900 dark:text-white">{t('economic.auditLog')}</h3>
                            <button onClick={() => exportCSV(auditLogs, 'financial_audit_log')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                <Download size={14} /> {t('economic.export')}
                            </button>
                        </div>
                        <div className="divide-y divide-institutional-50 dark:divide-institutional-800">
                            {auditLogs.map(log => (
                                <div key={log.id} className="p-6 flex items-center justify-between hover:bg-institutional-50 dark:hover:bg-institutional-800/50 transition-colors">
                                    <div className="flex items-center gap-6">
                                        <div className="w-10 h-10 rounded-xl bg-institutional-100 dark:bg-institutional-800 flex items-center justify-center text-institutional-400">
                                            <History size={18} />
                                        </div>
                                        <div className="text-start">
                                            <p className="text-sm font-bold text-institutional-900 dark:text-white">{log.action}</p>
                                            <p className="text-[10px] font-bold text-institutional-400 uppercase tracking-widest">{log.details}</p>
                                            {log.targetName && <p className="text-[9px] font-black text-primary uppercase mt-1">Target: {log.targetName}</p>}
                                        </div>
                                    </div>
                                    <div className="text-end">
                                        <p className="text-[10px] font-black text-institutional-900 dark:text-white uppercase tracking-widest">{log.userName}</p>
                                        <p className="text-[9px] font-bold text-institutional-400 mt-1">
                                            {log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : '---'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {auditLogs.length === 0 && (
                                <div className="p-20 text-center text-institutional-400 text-xs font-black uppercase tracking-widest">
                                    No audit entries found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Student Settings Modal */}
            {studentToEdit && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-institutional-900/60 backdrop-blur-sm" onClick={() => setStudentToEdit(null)} />
                    <div className="relative w-full max-w-2xl bg-surface dark:bg-institutional-900 rounded-[2.5rem] border border-institutional-200 dark:border-institutional-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-institutional-100 dark:border-institutional-800 flex items-center justify-between bg-institutional-50/50 dark:bg-institutional-800/30">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl border border-primary/20">
                                    {studentToEdit.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-institutional-900 dark:text-white">{studentToEdit.name}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-institutional-400">Edit Student Subscription</p>
                                </div>
                            </div>
                            <button onClick={() => setStudentToEdit(null)} className="p-3 hover:bg-rose-500/10 hover:text-rose-500 text-institutional-400 rounded-2xl transition-all">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {/* Subscription Type & Amount */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-institutional-500 ml-1">Subscription Type</label>
                                    <div className="flex bg-institutional-100 dark:bg-institutional-800 p-1.5 rounded-2xl">
                                        <button 
                                            onClick={() => setSubscriptionType('time')}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subscriptionType === 'time' ? 'bg-surface dark:bg-institutional-700 text-primary shadow-soft' : 'text-institutional-500'}`}
                                        >
                                            Time Based
                                        </button>
                                        <button 
                                            onClick={() => setSubscriptionType('session')}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subscriptionType === 'session' ? 'bg-surface dark:bg-institutional-700 text-primary shadow-soft' : 'text-institutional-500'}`}
                                        >
                                            Session Based
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-institutional-500 ml-1">Monthly Amount (DZD)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-institutional-400" size={18} />
                                        <input 
                                            type="number"
                                            value={amountValue}
                                            onChange={(e) => setAmountValue(Number(e.target.value))}
                                            className="w-full bg-institutional-50 dark:bg-institutional-800 border-2 border-institutional-200 dark:border-institutional-700 pl-12 pr-4 py-4 rounded-2xl text-sm font-bold text-institutional-900 dark:text-white focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Duration / Sessions */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-institutional-500 ml-1">
                                    {subscriptionType === 'time' ? 'Subscription Duration (Months)' : 'Total Sessions'}
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-institutional-400" size={18} />
                                    <input 
                                        type="number"
                                        value={subscriptionType === 'time' ? durationValue : sessionsValue}
                                        onChange={(e) => subscriptionType === 'time' ? setDurationValue(Number(e.target.value)) : setSessionsValue(Number(e.target.value))}
                                        className="w-full bg-institutional-50 dark:bg-institutional-800 border-2 border-institutional-200 dark:border-institutional-700 pl-12 pr-4 py-4 rounded-2xl text-sm font-bold text-institutional-900 dark:text-white focus:border-primary outline-none transition-all"
                                        placeholder={subscriptionType === 'time' ? 'Enter months' : 'Enter sessions'}
                                    />
                                </div>
                            </div>

                            {/* Status Quick Actions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-institutional-500 ml-1">Payment Status</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { status: 'Paid', icon: CheckCircle, color: 'bg-emerald-500' },
                                            { status: 'Pending', icon: Clock, color: 'bg-amber-500' },
                                            { status: 'Unpaid', icon: XCircle, color: 'bg-rose-500' }
                                        ].map(item => (
                                            <button 
                                                key={item.status}
                                                onClick={() => handleUpdateStudentPayment(studentToEdit.id, item.status as any)}
                                                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all ${subscriptions[studentToEdit.id]?.paymentStatus === item.status ? `${item.color} text-white shadow-lg` : 'bg-institutional-50 dark:bg-institutional-800 text-institutional-400 border border-institutional-200 dark:border-institutional-700'}`}
                                            >
                                                <item.icon size={14} /> {item.status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-institutional-500 ml-1">Account Status</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { status: 'active', icon: ShieldCheck, color: 'bg-emerald-500' },
                                            { status: 'pending', icon: Clock, color: 'bg-amber-500' },
                                            { status: 'disabled', icon: ShieldOff, color: 'bg-rose-500' }
                                        ].map(item => (
                                            <button 
                                                key={item.status}
                                                onClick={() => handleUpdateAccountStatus(studentToEdit.id, item.status)}
                                                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest flex flex-col items-center justify-center gap-1 transition-all ${studentToEdit.accountStatus === item.status ? `${item.color} text-white shadow-lg` : 'bg-institutional-50 dark:bg-institutional-800 text-institutional-400 border border-institutional-200 dark:border-institutional-700'}`}
                                            >
                                                <item.icon size={14} /> {item.status}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-institutional-50/50 dark:bg-institutional-800/30 border-t border-institutional-100 dark:border-institutional-800 flex gap-4">
                            <button 
                                onClick={() => setStudentToEdit(null)}
                                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-institutional-500 hover:bg-institutional-100 dark:hover:bg-institutional-800 transition-all"
                            >
                                Close
                            </button>
                            <button 
                                onClick={async () => {
                                    await handleUpdateStudentAmount(studentToEdit.id);
                                    await handleUpdateSubscriptionDuration(studentToEdit.id);
                                    setStudentToEdit(null);
                                }}
                                className="flex-[2] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> Save All Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EconomicDashboard;
