import React from 'react';
import { User, StudentSubscription } from '../types';
import { ShieldOff, ShieldCheck, History, ChevronDown, Save, CheckCircle, XCircle, Clock } from 'lucide-react';

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
    } = data;
    const s = students[index];
    const sub = subscriptions[s.id];

    if (isMobile) {
        return (
            <div style={style} className="px-1 py-2">
                <div className={`bg-white dark:bg-slate-900 border-l-4 ${sub?.paymentStatus === 'Paid' ? 'border-emerald-500' : sub?.paymentStatus === 'Unpaid' ? 'border-rose-500' : 'border-amber-500'} rounded-2xl p-6 text-start shadow-sm`}>
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
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusColor(s.accountStatus || 'active')}`}>
                                {s.accountStatus || 'active'}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100 dark:border-slate-800">
                        <div>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{t('economic.payment')}</p>
                            <div className="flex gap-2 mt-1">
                                <button onClick={() => handleUpdateStudentPayment(s.id, 'Paid')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Paid</button>
                                <button onClick={() => handleUpdateStudentPayment(s.id, 'Pending')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sub?.paymentStatus === 'Pending' || !sub?.paymentStatus ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Pending</button>
                                <button onClick={() => handleUpdateStudentPayment(s.id, 'Unpaid')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>Unpaid</button>
                            </div>
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Start Date</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{sub?.startDate || '---'}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">End Date</p>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{sub?.endDate || '---'}</p>
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
    }

    return (
        <tr style={style} className={`transition-colors ${s.accountStatus === 'disabled' || s.accountStatus === 'frozen' ? 'bg-rose-50 dark:bg-rose-950/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-500 font-black text-sm ${s.accountStatus === 'disabled' ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
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
                    {s.accountStatus === 'disabled' 
                        ? <ShieldOff size={16} className="text-rose-500" /> 
                        : <ShieldCheck size={16} className="text-emerald-500" />
                    }
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getStatusColor(s.accountStatus || 'active')}`}>
                        {s.accountStatus || 'active'}
                    </span>
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
                    <div onClick={() => { setEditingAmount(s.id); setAmountValue(sub?.monthlyAmount || 0); }} className="cursor-pointer bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrencyDZD(sub?.monthlyAmount || 0)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Edit Amount</p>
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
                    <div onClick={() => { setEditingDuration(s.id); setDurationValue(sub?.duration || 1); }} className="cursor-pointer bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub?.duration || 1} Months</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Edit Duration</p>
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
                    <button 
                        onClick={() => handleUpdateStudentPayment(s.id, 'Pending')}
                        className={`p-3 rounded-2xl transition-all ${sub?.paymentStatus === 'Pending' || !sub?.paymentStatus ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500'}`}>
                        <Clock size={20} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(StudentRow);
