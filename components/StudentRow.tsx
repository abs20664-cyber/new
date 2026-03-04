import React from 'react';
import { User, StudentSubscription } from '../types';
import { ShieldOff, ShieldCheck, History, ChevronDown, Clock } from 'lucide-react';

interface StudentRowProps {
    index: number;
    style: React.CSSProperties;
    data: any;
}

const StudentRow: React.FC<StudentRowProps> = ({ index, style, data }) => {
    const { 
        students, 
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
    } = data;
    const s = students[index];
    const sub = subscriptions[s.id];

    const openSettings = () => {
        setStudentToEdit(s);
        setAmountValue(sub?.monthlyAmount || 0);
        setDurationValue(sub?.duration || 1);
        setSubscriptionType(sub?.subscriptionType || 'time');
        setSessionsValue(sub?.totalSessions || 4);
    };

    if (isMobile) {
        return (
            <div className="px-4 py-3">
                <div className={`bg-white dark:bg-institutional-900 rounded-[2rem] border-2 ${sub?.paymentStatus === 'Paid' ? 'border-emerald-500/20' : sub?.paymentStatus === 'Unpaid' ? 'border-rose-500/20' : 'border-institutional-200 dark:border-institutional-800'} p-5 shadow-xl shadow-institutional-900/5 relative overflow-hidden`}>
                    {/* Status Indicator Bar */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500' : sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    
                    <div className="flex items-start justify-between mb-6">
                        <div 
                            className="flex items-center gap-4 cursor-pointer group"
                            onClick={openSettings}
                        >
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg border border-primary/20 group-hover:scale-110 transition-transform">
                                    {s.name.charAt(0)}
                                </div>
                                <div className="absolute -bottom-1 -right-1">
                                    {s.accountStatus === 'disabled' || s.accountStatus === 'suspended'
                                        ? <div className="bg-rose-500 p-1 rounded-lg border-2 border-white dark:border-institutional-900"><ShieldOff size={10} className="text-white" /></div>
                                        : <div className="bg-emerald-500 p-1 rounded-lg border-2 border-white dark:border-institutional-900"><ShieldCheck size={10} className="text-white" /></div>
                                    }
                                </div>
                            </div>
                            <div>
                                <p className="font-black text-base text-institutional-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{s.name}</p>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-institutional-400 mt-1">ID: {s.id}</p>
                            </div>
                        </div>
                        <div className="text-end">
                            <p className="text-[10px] font-black uppercase tracking-widest text-institutional-400 mb-1">Monthly</p>
                            <p className="text-sm font-black text-primary">{formatCurrencyDZD(sub?.monthlyAmount || 0)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-institutional-50 dark:bg-institutional-800/50 p-3 rounded-2xl border border-institutional-100 dark:border-institutional-800">
                            <p className="text-[9px] font-black uppercase tracking-widest text-institutional-400 mb-1">Start Date</p>
                            <p className="text-xs font-bold text-institutional-700 dark:text-institutional-300">{sub?.startDate || '---'}</p>
                        </div>
                        <div className="bg-institutional-50 dark:bg-institutional-800/50 p-3 rounded-2xl border border-institutional-100 dark:border-institutional-800">
                            <p className="text-[9px] font-black uppercase tracking-widest text-institutional-400 mb-1">
                                {sub?.subscriptionType === 'session' ? 'Sessions' : 'End Date'}
                            </p>
                            <p className="text-xs font-bold text-institutional-700 dark:text-institutional-300">
                                {sub?.subscriptionType === 'session' 
                                    ? `${sub?.sessionsUsed || 0} / ${sub?.totalSessions || 0}`
                                    : (sub?.endDate || '---')
                                }
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-institutional-50 dark:bg-institutional-800/50 rounded-2xl border border-institutional-100 dark:border-institutional-800">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-institutional-400 mb-1">Payment Status</p>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                    {sub?.paymentStatus || 'Pending'}
                                </span>
                            </div>
                            <button 
                                onClick={openSettings}
                                className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            >
                                Manage
                            </button>
                        </div>

                        <button 
                            onClick={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                            className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${selectedStudentId === s.id ? 'bg-primary/10 text-primary' : 'text-institutional-400 hover:bg-institutional-50 dark:hover:bg-institutional-800'}`}>
                            <History size={14} /> {selectedStudentId === s.id ? 'Hide Timeline' : 'View Payment Timeline'}
                        </button>
                    </div>

                    {selectedStudentId === s.id && (
                        <div className="mt-4 pt-4 border-t border-institutional-100 dark:border-institutional-800 space-y-2 animate-in slide-in-from-top-4 duration-300">
                            {paymentRecords.filter(r => r.studentId === s.id).length > 0 ? (
                                paymentRecords.filter(r => r.studentId === s.id).map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-3 bg-institutional-50 dark:bg-institutional-800/30 rounded-xl border border-institutional-100 dark:border-institutional-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(r.status)}`} />
                                            <div>
                                                <p className="text-[10px] font-bold text-institutional-900 dark:text-white">{r.date}</p>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-institutional-400">{formatCurrencyDZD(r.amount)} • {r.method}</p>
                                            </div>
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${getStatusColor(r.status)}`}>{r.status}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-4 text-[10px] font-bold text-institutional-400 uppercase tracking-widest">No payment records found</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <tr style={style} className={`transition-colors border-b border-institutional-200 dark:border-institutional-800 ${s.accountStatus === 'disabled' || s.accountStatus === 'frozen' ? 'bg-danger/5' : 'hover:bg-institutional-50 dark:hover:bg-institutional-900/50'}`}>
            <td className="px-8 py-6">
                <div 
                    className="flex items-center gap-4 cursor-pointer group"
                    onClick={openSettings}
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm transition-transform group-hover:scale-110 ${s.accountStatus === 'disabled' ? 'bg-institutional-400' : 'bg-primary'}`}>
                        {s.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-institutional-900 dark:text-white group-hover:text-primary transition-colors">{s.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-institutional-400">ID: {s.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        {s.accountStatus === 'disabled' || s.accountStatus === 'suspended'
                            ? <ShieldOff size={16} className="text-rose-500" /> 
                            : s.accountStatus === 'pending'
                            ? <Clock size={16} className="text-amber-500" />
                            : <ShieldCheck size={16} className="text-emerald-500" />
                        }
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${s.accountStatus === 'disabled' || s.accountStatus === 'suspended' ? getStatusColor('disabled') : s.accountStatus === 'pending' ? getStatusColor('pending') : getStatusColor('active')}`}>
                            {s.accountStatus || 'active'}
                        </span>
                    </div>
                </div>
            </td>

            <td className="px-8 py-6">
                <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold text-institutional-900 dark:text-white">{sub?.startDate || '---'}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-institutional-400">{sub?.endDate || '---'}</p>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex flex-col">
                    <p className="font-bold text-sm text-institutional-900 dark:text-white">{formatCurrencyDZD(sub?.monthlyAmount || 0)}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-institutional-400">Monthly Amount</p>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex flex-col">
                    <p className="font-bold text-sm text-institutional-900 dark:text-white">
                        {sub?.subscriptionType === 'session' 
                            ? `${sub?.sessionsUsed || 0} / ${sub?.totalSessions || 0} Sessions`
                            : `${sub?.duration || 1} Months`
                        }
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-institutional-400">Subscription Type</p>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500' : sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sub?.paymentStatus === 'Paid' ? 'text-emerald-500' : sub?.paymentStatus === 'Unpaid' ? 'text-rose-500' : 'text-amber-500'}`}>
                        {sub?.paymentStatus || 'Pending'}
                    </span>
                </div>
            </td>
            <td className="px-8 py-6 text-end">
                <div className="flex justify-end gap-2">
                    <button 
                        onClick={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                        className={`p-3 rounded-xl transition-all ${selectedStudentId === s.id ? 'bg-primary text-white' : 'text-institutional-400 hover:text-primary hover:bg-primary/5'}`}
                        title="View History"
                    >
                        <History size={18} />
                    </button>
                    <button 
                        onClick={openSettings}
                        className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                        title="Manage Student"
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(StudentRow);
