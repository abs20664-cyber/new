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
                <div className={`academic-card border-l-4 ${sub?.paymentStatus === 'Paid' ? 'border-emerald-500' : sub?.paymentStatus === 'Unpaid' ? 'border-rose-500' : 'border-gold/50'} p-6 text-start`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-sm bg-gold/10 flex items-center justify-center text-gold font-serif font-bold text-sm">
                                {s.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-serif font-bold text-sm text-paper">{s.name}</p>
                                <p className="editorial-label truncate">ID: {s.id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {s.accountStatus === 'disabled' 
                                ? <ShieldOff size={16} className="text-rose-500" /> 
                                : <ShieldCheck size={16} className="text-emerald-500" />
                            }
                            <span className={`px-3 py-1 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest ${getStatusColor(s.accountStatus || 'active')}`}>
                                {s.accountStatus || 'active'}
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 py-4 border-y border-gold/10">
                        <div className="col-span-2">
                            <p className="editorial-label mb-2">{t('economic.payment')}</p>
                            <div className="flex gap-2">
                                <button onClick={() => handleUpdateStudentPayment(s.id, 'Paid')} className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-gold/5 text-gold/40'}`}>Paid</button>
                                <button onClick={() => handleUpdateStudentPayment(s.id, 'Pending')} className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${sub?.paymentStatus === 'Pending' || !sub?.paymentStatus ? 'bg-gold text-ink' : 'bg-gold/5 text-gold/40'}`}>Pending</button>
                                <button onClick={() => handleUpdateStudentPayment(s.id, 'Unpaid')} className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500 text-white' : 'bg-gold/5 text-gold/40'}`}>Unpaid</button>
                            </div>
                        </div>
                        <div>
                            <p className="editorial-label mb-1">Start Date</p>
                            <p className="font-mono text-[11px] text-paper-dim">{sub?.startDate || '---'}</p>
                        </div>
                        <div>
                            <p className="editorial-label mb-1">End Date</p>
                            <p className="font-mono text-[11px] text-paper-dim">{sub?.endDate || '---'}</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                        className="w-full mt-4 py-3 text-[9px] font-mono font-bold uppercase tracking-widest text-gold flex items-center justify-center gap-2 hover:bg-gold/5 transition-colors">
                        <History size={14} /> {selectedStudentId === s.id ? 'Hide Timeline' : t('economic.timeline')}
                    </button>
                    {selectedStudentId === s.id && (
                        <div className="mt-4 pt-4 border-t border-gold/10 space-y-3 animate-in slide-in-from-top-2 duration-300">
                            {paymentRecords.filter(r => r.studentId === s.id).map(r => (
                                <div key={r.id} className="flex items-center justify-between p-3 bg-gold/5 rounded-sm border border-gold/10">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(r.status)}`} />
                                        <div>
                                            <p className="font-mono text-[10px] text-paper">{r.date}</p>
                                            <p className="editorial-label">{formatCurrencyDZD(r.amount)} • {r.method}</p>
                                        </div>
                                    </div>
                                    <span className={`editorial-label ${getStatusColor(r.status)}`}>{r.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <tr style={style} className={`transition-colors border-b border-gold/10 ${s.accountStatus === 'disabled' || s.accountStatus === 'frozen' ? 'bg-rose-950/20' : 'hover:bg-gold/5'}`}>
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-sm flex items-center justify-center text-ink font-serif font-bold text-sm ${s.accountStatus === 'disabled' ? 'bg-paper-dim' : 'bg-gold'}`}>
                        {s.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-serif font-bold text-sm text-paper">{s.name}</p>
                        <p className="editorial-label">ID: {s.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <div className="flex items-center gap-2">
                    {s.accountStatus === 'disabled' 
                        ? <ShieldOff size={16} className="text-rose-500" /> 
                        : <ShieldCheck size={16} className="text-emerald-500" />
                    }
                    <span className={`px-3 py-1 rounded-sm text-[9px] font-mono font-bold uppercase tracking-widest ${getStatusColor(s.accountStatus || 'active')}`}>
                        {s.accountStatus || 'active'}
                    </span>
                </div>
            </td>

            <td className="px-8 py-6">
                <div className="flex flex-col gap-1">
                    <p className="font-mono text-[11px] text-paper">{sub?.startDate || '---'}</p>
                    <p className="editorial-label">{sub?.endDate || '---'}</p>
                </div>
            </td>
            <td className="px-8 py-6">
                {editingAmount === s.id ? (
                    <div className="flex items-center gap-2">
                        <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-24 bg-ink border border-gold/20 p-2 rounded-sm font-mono text-xs text-paper focus:border-gold outline-none" />
                        <button onClick={() => handleUpdateStudentAmount(s.id)} className="p-2 bg-gold text-ink rounded-sm"><Save size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => { setEditingAmount(s.id); setAmountValue(sub?.monthlyAmount || 0); }} className="cursor-pointer bg-gold/5 border border-gold/10 p-3 rounded-sm hover:bg-gold/10 transition-colors">
                        <p className="font-mono font-bold text-sm text-paper">{formatCurrencyDZD(sub?.monthlyAmount || 0)}</p>
                        <p className="editorial-label">Edit Amount</p>
                    </div>
                )}
            </td>
            <td className="px-8 py-6">
                {editingDuration === s.id ? (
                    <div className="flex items-center gap-2">
                        <input type="number" value={durationValue} onChange={(e) => setDurationValue(Number(e.target.value))} className="w-20 bg-ink border border-gold/20 p-2 rounded-sm font-mono text-xs text-paper focus:border-gold outline-none" />
                        <button onClick={() => handleUpdateSubscriptionDuration(s.id)} className="p-2 bg-gold text-ink rounded-sm"><Save size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => { setEditingDuration(s.id); setDurationValue(sub?.duration || 1); }} className="cursor-pointer bg-gold/5 border border-gold/10 p-3 rounded-sm hover:bg-gold/10 transition-colors">
                        <p className="font-serif font-bold text-sm text-paper">{sub?.duration || 1} Months</p>
                        <p className="editorial-label">Edit Duration</p>
                    </div>
                )}
            </td>
            <td className="px-8 py-6 text-end">
                <button 
                    onClick={() => setSelectedStudentId(selectedStudentId === s.id ? null : s.id)}
                    className={`p-3 rounded-sm transition-all ${selectedStudentId === s.id ? 'bg-gold text-ink' : 'text-gold/40 hover:text-gold hover:bg-gold/5'}`}>
                    <History size={18} />
                </button>
            </td>
            <td className="px-8 py-6 text-end">
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => handleUpdateStudentPayment(s.id, 'Paid')}
                        className={`p-3 rounded-sm transition-all ${sub?.paymentStatus === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-gold/5 text-gold/40 hover:bg-emerald-500/10 hover:text-emerald-500'}`}>
                        <CheckCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleUpdateStudentPayment(s.id, 'Unpaid')}
                        className={`p-3 rounded-sm transition-all ${sub?.paymentStatus === 'Unpaid' ? 'bg-rose-500 text-white' : 'bg-gold/5 text-gold/40 hover:bg-rose-500/10 hover:text-rose-500'}`}>
                        <XCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleUpdateStudentPayment(s.id, 'Pending')}
                        className={`p-3 rounded-sm transition-all ${sub?.paymentStatus === 'Pending' || !sub?.paymentStatus ? 'bg-gold text-ink' : 'bg-gold/5 text-gold/40 hover:bg-gold/10 hover:text-gold'}`}>
                        <Clock size={20} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(StudentRow);
