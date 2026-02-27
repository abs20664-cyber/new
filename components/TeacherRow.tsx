import React from 'react';
import { User, TeacherPayment } from '../types';
import { ChevronDown, Save, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

interface TeacherRowProps {
    index: number;
    style: React.CSSProperties;
    data: any;
}

const TeacherRow: React.FC<TeacherRowProps> = ({ index, style, data }) => {
    const { 
        teachers, 
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
    } = data;
    const t_user = teachers[index];
    const pay = payments[t_user.id];

    if (isMobile) {
        return (
            <div style={style} className="px-1 py-2">
                <div className="academic-card p-6 text-start space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-sm bg-gold/10 flex items-center justify-center text-gold font-serif font-bold text-sm">
                                {t_user.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-serif font-bold text-sm text-paper">{t_user.name}</p>
                                <p className="editorial-label truncate">ID: {t_user.id}</p>
                            </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest ${pay?.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : pay?.status === 'Unpaid' ? 'bg-rose-500/10 text-rose-500' : 'bg-gold/10 text-gold'}`}>
                            {pay?.status || 'Pending'}
                        </span>
                    </div>

                    <div className="bg-gold/5 border border-gold/10 p-4 rounded-sm">
                        <p className="editorial-label mb-3">Payment Details</p>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <p className="editorial-label mb-1">{t('economic.amountOwed')}</p>
                                <p className="font-mono text-sm font-bold text-paper">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
                            </div>
                            <div>
                                <p className="editorial-label mb-1">{t('economic.amountPaid')}</p>
                                <p className="font-mono text-sm font-bold text-emerald-500">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
                            </div>
                            <div>
                                <p className="editorial-label mb-1">Next Payment</p>
                                <p className="font-mono text-sm font-bold text-paper-dim">{pay?.nextPaymentDate || 'Not set'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleUpdateTeacherPayment(t_user.id, 'Paid')} className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${pay?.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-gold/5 text-gold/40'}`}>Paid</button>
                            <button onClick={() => handleUpdateTeacherPayment(t_user.id, 'Pending')} className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${pay?.status === 'Pending' || !pay?.status ? 'bg-gold text-ink' : 'bg-gold/5 text-gold/40'}`}>Pending</button>
                            <button onClick={() => handleUpdateTeacherPayment(t_user.id, 'Unpaid')} className={`flex-1 py-2 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${pay?.status === 'Unpaid' ? 'bg-rose-500 text-white' : 'bg-gold/5 text-gold/40'}`}>Unpaid</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                         <div>
                            <p className="editorial-label mb-1">Monthly Salary</p>
                            {editingAmount === t_user.id ? (
                                <div className="flex items-center gap-2">
                                    <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-full bg-ink border border-gold/20 p-2 rounded-sm font-mono text-xs text-paper outline-none" />
                                    <button onClick={() => handleUpdateTeacherSalary(t_user.id)} className="p-2 bg-gold text-ink rounded-sm"><Save size={14} /></button>
                                </div>
                            ) : (
                                <div onClick={() => { setEditingAmount(t_user.id); setAmountValue(pay?.monthlySalary || 0); }} className="cursor-pointer bg-gold/5 border border-gold/10 p-3 rounded-sm">
                                    <p className="font-mono font-bold text-sm text-paper">{formatCurrencyDZD(pay?.monthlySalary || 0)}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="editorial-label mb-2">{t('economic.notes')}</p>
                            {editingNote === t_user.id ? (
                                <div className="flex gap-2">
                                    <input 
                                        value={noteValue}
                                        onChange={e => setNoteValue(e.target.value)}
                                        className="flex-1 bg-ink border border-gold/20 rounded-sm p-3 text-xs font-serif font-bold text-paper outline-none"
                                    />
                                    <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-gold text-ink rounded-sm"><Save size={16} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-4 p-3 bg-gold/5 rounded-sm border border-gold/10">
                                    <p className="text-xs font-serif italic text-paper-dim truncate">{pay?.notes || 'No notes added...'}</p>
                                    <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-gold"><FileText size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <tr style={style} className="hover:bg-gold/5 transition-colors border-b border-gold/10">
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-gold/10 flex items-center justify-center text-gold font-serif font-bold text-sm">
                        {t_user.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-serif font-bold text-sm text-paper">{t_user.name}</p>
                        <p className="editorial-label">ID: {t_user.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <span className={`px-4 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-widest ${pay?.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' : pay?.status === 'Unpaid' ? 'bg-rose-500/10 text-rose-500' : 'bg-gold/10 text-gold'}`}>
                    {pay?.status || 'Pending'}
                </span>
            </td>
            <td className="px-8 py-6">
                <p className="font-mono text-sm font-bold text-rose-500">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
            </td>
            <td className="px-8 py-6">
                <p className="font-mono text-sm font-bold text-emerald-500">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
            </td>
            <td className="px-8 py-6">
                {editingDate === t_user.id ? (
                    <div className="flex items-center gap-2">
                        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="w-36 bg-ink border border-gold/20 p-2 rounded-sm font-mono text-xs text-paper outline-none" />
                        <button onClick={() => handleUpdateNextPaymentDate(t_user.id)} className="p-2 bg-gold text-ink rounded-sm"><Save size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => { setEditingDate(t_user.id); setDateValue(pay?.nextPaymentDate || ''); }} className="cursor-pointer bg-gold/5 border border-gold/10 p-3 rounded-sm hover:bg-gold/10 transition-colors">
                        <p className="font-mono text-sm font-bold text-paper">{pay?.nextPaymentDate || 'Not set'}</p>
                        <p className="editorial-label">Edit Date</p>
                    </div>
                )}
            </td>
            <td className="px-8 py-6">
                {editingAmount === t_user.id ? (
                    <div className="flex items-center gap-2">
                        <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-24 bg-ink border border-gold/20 p-2 rounded-sm font-mono text-xs text-paper outline-none" />
                        <button onClick={() => handleUpdateTeacherSalary(t_user.id)} className="p-2 bg-gold text-ink rounded-sm"><Save size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => { setEditingAmount(t_user.id); setAmountValue(pay?.monthlySalary || 0); }} className="cursor-pointer bg-gold/5 border border-gold/10 p-3 rounded-sm hover:bg-gold/10 transition-colors">
                        <p className="font-mono font-bold text-sm text-paper">{formatCurrencyDZD(pay?.monthlySalary || 0)}</p>
                        <p className="editorial-label">Edit Salary</p>
                    </div>
                )}
            </td>
            <td className="px-8 py-6">
                {editingNote === t_user.id ? (
                    <div className="flex gap-2">
                        <input 
                            value={noteValue}
                            onChange={e => setNoteValue(e.target.value)}
                            className="flex-1 bg-ink border border-gold/20 rounded-sm p-3 text-xs font-serif font-bold text-paper outline-none"
                        />
                        <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-gold text-ink rounded-sm"><Save size={16} /></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4 p-3 bg-gold/5 rounded-sm border border-gold/10">
                        <p className="text-xs font-serif italic text-paper-dim truncate">{pay?.notes || 'No notes added...'}</p>
                        <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-gold"><FileText size={16} /></button>
                    </div>
                )}
            </td>
            <td className="px-8 py-6 text-end">
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => handleUpdateTeacherPayment(t_user.id, 'Paid')}
                        className={`p-3 rounded-sm transition-all ${pay?.status === 'Paid' ? 'bg-emerald-500 text-white' : 'bg-gold/5 text-gold/40 hover:bg-emerald-500/10 hover:text-emerald-500'}`}>
                        <CheckCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleUpdateTeacherPayment(t_user.id, 'Unpaid')}
                        className={`p-3 rounded-sm transition-all ${pay?.status === 'Unpaid' ? 'bg-rose-500 text-white' : 'bg-gold/5 text-gold/40 hover:bg-rose-500/10 hover:text-rose-500'}`}>
                        <XCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleUpdateTeacherPayment(t_user.id, 'Pending')}
                        className={`p-3 rounded-sm transition-all ${pay?.status === 'Pending' || !pay?.status ? 'bg-gold text-ink' : 'bg-gold/5 text-gold/40 hover:bg-gold/10 hover:text-gold'}`}>
                        <Clock size={20} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

export default React.memo(TeacherRow);
