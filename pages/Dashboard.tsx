import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import { useLanguage } from '../contexts/LanguageContext';
import Classes from './Classes';
import QRIdentity from './QRIdentity';
import AdminRegistry from './AdminRegistry';
import EconomicDashboard from './EconomicDashboard';
import { 
    Calendar, 
    Clock, 
    Users, 
    BookOpen, 
    TrendingUp, 
    ShieldCheck,
    ChevronRight,
    ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
    onNavigate: (path: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const { isMobile } = usePlatform();
    const { t } = useLanguage();

    const welcomeMessage = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    }, []);
    
    if (user?.role === 'admin') {
        return <AdminRegistry />;
    }

    if (user?.role === 'economic') {
        return <EconomicDashboard />;
    }
    
    if (user?.role === 'teacher') {
        return (
            <div className={`space-y-12 ${isMobile ? 'pb-10' : ''}`}>
                <header className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck size={20} />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Faculty Protocol Active</p>
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter uppercase text-text leading-none">
                        {welcomeMessage}, <span className="text-primary">{user.name.split(' ')[0]}</span>
                    </h1>
                    <p className="text-institutional-500 font-medium max-w-2xl">
                        Welcome to your central command hub. Manage your academic sessions, track attendance, and oversee student progress with institutional precision.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { label: 'Active Sessions', value: '12', icon: Clock, color: 'text-primary' },
                        { label: 'Total Students', value: '142', icon: Users, color: 'text-success' },
                        { label: 'Course Materials', value: '28', icon: BookOpen, color: 'text-warning' }
                    ].map((stat, i) => (
                        <div key={i} className="academic-stat-card p-8 flex items-center justify-between group cursor-default">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50 mb-2">{stat.label}</p>
                                <h3 className="text-3xl font-bold text-text">{stat.value}</h3>
                            </div>
                            <div className={`p-4 rounded-2xl bg-institutional-50 dark:bg-institutional-900 ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-8">
                    <div className="flex items-center justify-between border-b border-border pb-6">
                        <h2 className="text-2xl font-bold uppercase tracking-tight text-text">Session Management</h2>
                        <button onClick={() => onNavigate('/schedule')} className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2 hover:gap-3 transition-all">
                            View Full Schedule <ArrowUpRight size={14} />
                        </button>
                    </div>
                    <Classes onNavigate={onNavigate} />
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-12">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <ShieldCheck size={20} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Student Identity Verified</p>
                </div>
                <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter uppercase text-text leading-none">
                    {welcomeMessage}, <span className="text-primary">{user?.name?.split(' ')[0] || 'Student'}</span>
                </h1>
                <p className="text-institutional-500 font-medium max-w-2xl">
                    Access your digital identity, track your academic journey, and stay connected with your institutional ecosystem.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-1">
                    <QRIdentity />
                </div>
                <div className="lg:col-span-2 space-y-8">
                    <div className="academic-card p-10 space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold uppercase tracking-tight text-text">Academic Snapshot</h3>
                            <TrendingUp size={20} className="text-success" />
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">Attendance Rate</p>
                                <p className="text-4xl font-bold text-text">94%</p>
                                <div className="w-full h-1.5 bg-institutional-100 dark:bg-institutional-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-success w-[94%] transition-all duration-1000" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50">Credits Earned</p>
                                <p className="text-4xl font-bold text-text">18/24</p>
                                <div className="w-full h-1.5 bg-institutional-100 dark:bg-institutional-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary w-[75%] transition-all duration-1000" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <button onClick={() => onNavigate('/schedule')} className="academic-stat-card p-8 flex items-center justify-between group text-start">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50 mb-2">Next Class</p>
                                <h4 className="text-lg font-bold text-text uppercase">Advanced Algorithmic Logic</h4>
                                <p className="text-xs font-bold text-primary mt-1">Starts in 15 mins</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                <Calendar size={20} />
                            </div>
                        </button>
                        <button onClick={() => onNavigate('/assignments')} className="academic-stat-card p-8 flex items-center justify-between group text-start">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50 mb-2">Pending Tasks</p>
                                <h4 className="text-lg font-bold text-text uppercase">System Architecture Review</h4>
                                <p className="text-xs font-bold text-danger mt-1">Due Today</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-danger/5 text-danger group-hover:bg-danger group-hover:text-white transition-all">
                                <Clock size={20} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;