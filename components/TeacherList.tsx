import React from 'react';
import { ChevronDown, Save, FileText, CheckCircle, XCircle } from 'lucide-react';

export const TeacherList = ({
    filteredTeachers,
    payments,
    handleUpdateTeacherPayment,
    isMobile,
    t,
    formatCurrencyDZD,
    editingNote,
    noteValue,
    setNoteValue,
    handleSaveNote,
    setEditingNote,
    editingDate,
    dateValue,
    setDateValue,
    handleUpdateNextPaymentDate,
    setEditingDate,
    editingAmount,
    amountValue,
    setAmountValue,
    handleUpdateTeacherSalary,
    setEditingAmount
}: any) => {
    return (
        isMobile ? (
            <div className="space-y-4">
                {filteredTeachers.map((t_user: any) => {
                    const pay = payments[t_user.id];
                    return (
                        <div key={t_user.id} className="bg-institutional-50 dark:bg-slate-900 border-l-4 border-primary rounded-2xl p-6 text-start shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                        {t_user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-institutional-900 dark:text-institutional-50">{t_user.name}</p>
                                        <p className="text-[9px] font-bold text-institutional-600 uppercase tracking-widest">ID: {t_user.id}</p>
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
                                    <p className="text-[8px] font-black uppercase text-institutional-600 tracking-widest mb-1">{t('economic.amountOwed')}</p>
                                    <p className="text-sm font-black text-institutional-900 dark:text-institutional-50">{formatCurrencyDZD(pay?.amountOwed || 0)}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase text-institutional-600 tracking-widest mb-1">{t('economic.amountPaid')}</p>
                                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrencyDZD(pay?.amountPaid || 0)}</p>
                                </div>
                            </div>
                            <div className="pt-4">
                                <p className="text-[8px] font-black uppercase text-institutional-600 tracking-widest mb-2">{t('economic.notes')}</p>
                                {editingNote === t_user.id ? (
                                    <div className="flex gap-2">
                                        <input 
                                            value={noteValue}
                                            onChange={e => setNoteValue(e.target.value)}
                                            className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold outline-none"
                                        />
                                        <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-primary text-institutional-50 rounded-xl shadow-lg shadow-primary/20"><Save size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-medium text-institutional-600 italic truncate">{pay?.notes || 'No notes added...'}</p>
                                        <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-primary"><FileText size={16} /></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        ) : (
            <div className="bg-institutional-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl">
                <table className="w-full text-start border-collapse">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">{t('admin.legalName')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">{t('economic.status')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">{t('economic.amountOwed')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">{t('economic.amountPaid')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">Next Payment Date</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">Monthly Salary</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-start">{t('economic.notes')}</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-institutional-600 text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTeachers.map((t_user: any) => {
                            const pay = payments[t_user.id];
                            return (
                                <tr key={t_user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                                                {t_user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-institutional-900 dark:text-institutional-50">{t_user.name}</p>
                                                <p className="text-[10px] font-bold text-institutional-600 uppercase tracking-widest">ID: {t_user.id}</p>
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
                                                <button onClick={() => handleUpdateNextPaymentDate(t_user.id)} className="p-2 bg-primary text-institutional-50 rounded-lg"><Save size={16} /></button>
                                            </div>
                                        ) : (
                                            <div onClick={() => { setEditingDate(t_user.id); setDateValue(pay?.nextPaymentDate || ''); }} className="cursor-pointer">
                                                <p className="text-sm font-bold text-institutional-700 dark:text-institutional-300">{pay?.nextPaymentDate || 'Not set'}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6">
                                        {editingAmount === t_user.id ? (
                                            <div className="flex items-center gap-2">
                                                <input type="number" value={amountValue} onChange={(e) => setAmountValue(Number(e.target.value))} className="w-24 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border-2 border-primary" />
                                                <button onClick={() => handleUpdateTeacherSalary(t_user.id)} className="p-2 bg-primary text-institutional-50 rounded-lg"><Save size={16} /></button>
                                            </div>
                                        ) : (
                                            <div onClick={() => { setEditingAmount(t_user.id); setAmountValue(pay?.monthlySalary || 0); }} className="cursor-pointer">
                                                <p className="text-sm font-black text-institutional-900 dark:text-institutional-50">{formatCurrencyDZD(pay?.monthlySalary || 0)}</p>
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
                                                <button onClick={() => handleSaveNote(t_user.id)} className="p-3 bg-primary text-institutional-50 rounded-xl shadow-lg shadow-primary/20"><Save size={16} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 group">
                                                <p className="text-xs font-medium text-institutional-600 italic truncate">{pay?.notes || 'No notes added...'}</p>
                                                <button onClick={() => { setEditingNote(t_user.id); setNoteValue(pay?.notes || ''); }} className="text-primary opacity-0 group-hover:opacity-100 transition-all"><FileText size={16} /></button>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-6 text-end">
                                        <div className="flex justify-end gap-3">
                                            <button 
                                                onClick={() => handleUpdateTeacherPayment(t_user.id, 'Paid')}
                                                className={`p-3 rounded-2xl transition-all ${pay?.status === 'Paid' ? 'bg-emerald-500 text-institutional-50 shadow-lg shadow-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-institutional-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-500'}`}
                                                title={t('economic.markPaid')}>
                                                <CheckCircle size={20} />
                                            </button>
                                            <button 
                                                onClick={() => handleUpdateTeacherPayment(t_user.id, 'Unpaid')}
                                                className={`p-3 rounded-2xl transition-all ${pay?.status === 'Unpaid' ? 'bg-rose-500 text-institutional-50 shadow-lg shadow-rose-500/20' : 'bg-slate-100 dark:bg-slate-800 text-institutional-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500'}`}
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
    );
};
