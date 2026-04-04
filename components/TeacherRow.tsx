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
                <div className="bg-surface dark:bg-background border border-border p-6 text-start space-y-4 shadow-soft rounded-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {t_user.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-text">{t_user.name}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary truncate">ID: {t_user.id}</p>
                            </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${pay?.status === 'Paid' ? 'bg-success/10 text-success' : pay?.status === 'Unpaid' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                            {pay?.status || 'Pending'}
                        </span>
                    </div>

                    <div className="bg-muted/5 dark:bg-muted/10 border border-border p-4 rounded-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-3">Payment Details</p>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">{t('economic.amountOwed')}</p>
                                <p className="text-sm font-bold text-text">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">{t('economic.amountPaid')}</p>
                                <p className="text-sm font-bold text-success">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Next Payment</p>
                                <p className="text-sm font-bold text-text-secondary">{pay?.nextPaymentDate || 'Not set'}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleUpdateTeacherPayment(t_user.id, 'Paid')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pay?.status === 'Paid' ? 'bg-success text-background' : 'bg-muted text-text-secondary'}`}>Paid</button>
                            <button onClick={() => handleUpdateTeacherPayment(t_user.id, 'Pending')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pay?.status === 'Pending' || !pay?.status ? 'bg-primary text-background' : 'bg-muted text-text-secondary'}`}>Pending</button>
                            <button onClick={() => handleUpdateTeacherPayment(t_user.id, 'Unpaid')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${pay?.status === 'Unpaid' ? 'bg-danger text-background' : 'bg-muted text-text-secondary'}`}>Unpaid</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                         <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-1">Monthly Salary</p>
                            {editingAmount === t_user.id ? (
                                <div className="flex items-center gap-2">
                                    <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-full bg-surface dark:bg-background border border-border p-2 rounded-xl text-xs text-text outline-none" />
                                    <button onClick={() => handleUpdateTeacherSalary(t_user.id)} className="px-3 py-2 bg-primary text-background rounded-xl flex items-center gap-2">
                                        <Save size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Save</span>
                                    </button>
                                    <button onClick={() => setEditingAmount(null)} className="p-2 bg-danger/10 text-danger rounded-xl"><XCircle size={14} /></button>
                                </div>
                            ) : (
                                <div onClick={() => { setEditingAmount(t_user.id); setAmountValue(pay?.monthlySalary || 0); }} className="cursor-pointer bg-muted/5 dark:bg-muted/10 border border-border p-3 rounded-xl">
                                    <p className="font-bold text-sm text-text">{formatCurrencyDZD(pay?.monthlySalary || 0)}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">{t('economic.notes')}</p>
                            {editingNote === t_user.id ? (
                                <div className="flex gap-2">
                                    <input 
                                        value={noteValue}
                                        onChange={e => setNoteValue(e.target.value)}
                                        className="flex-1 bg-surface dark:bg-background border border-border rounded-xl p-3 text-xs font-bold text-text outline-none"
                                    />
                                    <button onClick={() => handleSaveNote(t_user.id)} className="px-3 py-2 bg-primary text-background rounded-xl flex items-center gap-2">
                                        <Save size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Save</span>
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between gap-4 p-3 bg-muted/5 dark:bg-muted/10 rounded-xl border border-border">
                                    <p className="text-xs italic text-text-secondary truncate">{pay?.notes || 'No notes added...'}</p>
                                    <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-primary"><FileText size={16} /></button>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <tr style={style} className="hover:bg-muted/5 dark:hover:bg-muted/5 transition-colors border-b border-border">
            <td className="px-8 py-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {t_user.name.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-sm text-text">{t_user.name}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">ID: {t_user.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-8 py-6">
                <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${pay?.status === 'Paid' ? 'bg-success/10 text-success' : pay?.status === 'Unpaid' ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary'}`}>
                    {pay?.status || 'Pending'}
                </span>
            </td>
            <td className="px-8 py-6">
                <p className="text-sm font-bold text-danger">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
            </td>
            <td className="px-8 py-6">
                <p className="text-sm font-bold text-success">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
            </td>
            <td className="px-8 py-6">
                {editingDate === t_user.id ? (
                    <div className="flex items-center gap-2">
                        <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} className="w-36 bg-surface dark:bg-background border border-border p-2 rounded-xl text-xs text-text outline-none" />
                        <button onClick={() => handleUpdateNextPaymentDate(t_user.id)} className="p-2 bg-primary text-background rounded-xl"><Save size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => { setEditingDate(t_user.id); setDateValue(pay?.nextPaymentDate || ''); }} className="cursor-pointer bg-muted/5 dark:bg-muted/10 border border-border p-3 rounded-xl hover:bg-muted/10 dark:hover:bg-muted/10 transition-colors">
                        <p className="text-sm font-bold text-text">{pay?.nextPaymentDate || 'Not set'}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Edit Date</p>
                    </div>
                )}
            </td>
            <td className="px-8 py-6">
                {editingAmount === t_user.id ? (
                    <div className="flex items-center gap-2">
                        <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-24 bg-surface dark:bg-background border border-border p-2 rounded-xl text-xs text-text outline-none" />
                        <button onClick={() => handleUpdateTeacherSalary(t_user.id)} className="p-2 bg-primary text-background rounded-xl"><Save size={16} /></button>
                    </div>
                ) : (
                    <div onClick={() => { setEditingAmount(t_user.id); setAmountValue(pay?.monthlySalary || 0); }} className="cursor-pointer bg-muted/5 dark:bg-muted/10 border border-border p-3 rounded-xl hover:bg-muted/10 dark:hover:bg-muted/10 transition-colors">
                        <p className="font-bold text-sm text-text">{formatCurrencyDZD(pay?.monthlySalary || 0)}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-text-secondary">Edit Salary</p>
                    </div>
                )}
            </td>
            <td className="px-8 py-6">
                {editingNote === t_user.id ? (
                    <div className="flex gap-2">
                        <input 
                            value={noteValue}
                            onChange={e => setNoteValue(e.target.value)}
                            className="flex-1 bg-surface dark:bg-background border border-border rounded-xl p-3 text-xs font-bold text-text outline-none"
                        />
                        <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-primary text-background rounded-xl"><Save size={16} /></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4 p-3 bg-muted/5 dark:bg-muted/10 rounded-xl border border-border">
                        <p className="text-xs italic text-text-secondary truncate">{pay?.notes || 'No notes added...'}</p>
                        <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-primary"><FileText size={16} /></button>
                    </div>
                )}
            </td>
            <td className="px-8 py-6 text-end">
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => handleUpdateTeacherPayment(t_user.id, 'Paid')}
                        className={`p-3 rounded-xl transition-all ${pay?.status === 'Paid' ? 'bg-success text-background' : 'bg-muted dark:bg-muted/10 text-text-secondary hover:bg-success/10 hover:text-success'}`}>
                        <CheckCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleUpdateTeacherPayment(t_user.id, 'Unpaid')}
                        className={`p-3 rounded-xl transition-all ${pay?.status === 'Unpaid' ? 'bg-danger text-background' : 'bg-muted dark:bg-muted/10 text-text-secondary hover:bg-danger/10 hover:text-danger'}`}>
                        <XCircle size={20} />
                    </button>
                    <button 
                        onClick={() => handleUpdateTeacherPayment(t_user.id, 'Pending')}
                        className={`p-3 rounded-xl transition-all ${pay?.status === 'Pending' || !pay?.status ? 'bg-primary text-background' : 'bg-muted dark:bg-muted/10 text-text-secondary hover:bg-primary/10 hover:text-primary'}`}>
                        <Clock size={20} />
                    </button>
                </div>
            </td>

        </tr>
    );
};

export default React.memo(TeacherRow);
