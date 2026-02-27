import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { TeacherPayment } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Payroll: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [payroll, setPayroll] = useState<TeacherPayment | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;

        const payrollDocRef = doc(db, 'payments', user.id);
        const unsubPayroll = onSnapshot(payrollDocRef, (doc) => {
            if (doc.exists()) {
                setPayroll({ id: doc.id, ...doc.data() } as TeacherPayment);
            }
        });

        // Mock payment history for now
        setPaymentHistory([
            { id: '1', date: '2024-05-28', amount: 50000, status: 'Paid' },
            { id: '2', date: '2024-04-28', amount: 50000, status: 'Paid' },
            { id: '3', date: '2024-03-28', amount: 50000, status: 'Paid' },
        ]);

        return () => {
            unsubPayroll();
        };
    }, [user]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid': return 'bg-emerald-100 text-emerald-700';
            case 'unpaid': return 'bg-rose-100 text-rose-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'late': return 'bg-orange-100 text-orange-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const formatCurrencyDZD = (amount: number) => {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">{t('nav.payroll')}</h1>
            {payroll ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Current Payroll</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">{t('economic.monthlySalary')}</p>
                                <p className="font-bold text-lg">{formatCurrencyDZD(payroll.monthlySalary || 0)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{t('economic.nextPaymentDate')}</p>
                                <p className="font-bold text-lg">{payroll.nextPaymentDate || 'Not scheduled'}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-slate-500">Payment Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(payroll.status)}`}>
                                        {payroll.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-500">Amount Owed</p>
                                    <p className="font-bold text-rose-600">{formatCurrencyDZD(payroll.amountOwed || 0)}</p>
                                </div>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-sm text-slate-500">Amount Paid (YTD)</p>
                                    <p className="font-bold text-emerald-600">{formatCurrencyDZD(payroll.amountPaid || 0)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Payment History</h2>
                        <div className="space-y-4">
                            {paymentHistory.map(payment => (
                                <div key={payment.id} className="flex justify-between items-center p-4 rounded-lg bg-slate-50 dark:bg-slate-700">
                                    <div>
                                        <p className="font-bold">{payment.date}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${payment.status === 'Paid' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrencyDZD(payment.amount)}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(payment.status)}`}>{payment.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <p>Loading payroll details...</p>
            )}
        </div>
    );
};

export default Payroll;
