import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { StudentSubscription, StudentPaymentRecord } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

const Subscription: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [subscription, setSubscription] = useState<StudentSubscription | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<StudentPaymentRecord[]>([]);

    useEffect(() => {
        if (!user) return;

        const subDocRef = doc(db, 'subscriptions', user.id);
        const unsubSub = onSnapshot(subDocRef, (doc) => {
            if (doc.exists()) {
                setSubscription({ id: doc.id, ...doc.data() } as StudentSubscription);
            }
        });

        // Mock payment history for now
        setPaymentHistory([
            { id: '1', studentId: user.id, amount: 12500, date: '2024-05-20', status: 'Paid', method: 'Credit Card' },
            { id: '2', studentId: user.id, amount: 12500, date: '2024-04-20', status: 'Paid', method: 'Credit Card' },
            { id: '3', studentId: user.id, amount: 12500, date: '2024-03-20', status: 'Paid', method: 'Credit Card' },
        ]);

        return () => {
            unsubSub();
        };
    }, [user]);

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'paid': case 'active': return 'bg-emerald-100 text-emerald-700';
            case 'unpaid': case 'expired': return 'bg-rose-100 text-rose-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            case 'frozen': return 'bg-blue-100 text-blue-700';
            case 'disabled': return 'bg-slate-200 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const formatCurrencyDZD = (amount: number) => {
        return new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
    };

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-6">{t('nav.subscription')}</h1>
            {subscription ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Current Plan</h2>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">{t('economic.plan')}</p>
                                <p className="font-bold text-lg">{subscription.plan}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{t('economic.duration')}</p>
                                <p className="font-bold text-lg">{subscription.duration} Months</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{t('economic.monthlyAmount')}</p>
                                <p className="font-bold text-lg">{formatCurrencyDZD(subscription.monthlyAmount || 0)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{t('economic.nextDueDate')}</p>
                                <p className="font-bold text-lg">{subscription.endDate}</p>
                            </div>
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-slate-500">Subscription Status</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(subscription.status)}`}>
                                        {subscription.status}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-sm text-slate-500">{t('economic.paymentStatus')}</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(subscription.paymentStatus)}`}>
                                        {subscription.paymentStatus}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-slate-500">Account Access</p>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${getStatusColor(user?.accountStatus || 'active')}`}>
                                        {user?.accountStatus || 'active'}
                                    </span>
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
                                        <p className="text-sm text-slate-500">{payment.method}</p>
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
                <p>Loading subscription details...</p>
            )}
        </div>
    );
};

export default Subscription;
