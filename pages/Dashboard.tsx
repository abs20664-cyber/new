import React, { useMemo, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { ClassSession, RecurringSession, Assignment, Submission } from '../types';
import Classes from './Classes';
import QRIdentity from './QRIdentity';
import AdminRegistry from './AdminRegistry';
import EconomicDashboard from './EconomicDashboard';
import SessionModal from '../components/SessionModal';
import { 
    Calendar, 
    Clock, 
    Users, 
    BookOpen, 
    ArrowUpRight,
    Plus
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardProps {
    onNavigate: (path: string, state?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { user } = useAuth();
    const { isMobile } = usePlatform();
    const { t } = useLanguage();
    const [nextClass, setNextClass] = useState<any>(null);
    const [pendingTask, setPendingTask] = useState<Assignment | null>(null);
    const [stats, setStats] = useState({ sessions: 0, students: 0, materials: 0 });
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<ClassSession | null>(null);

    useEffect(() => {
        if (!user) return;

        // Stats for teacher
        if (user.role === 'teacher') {
            const unsubClasses = onSnapshot(query(collection(db, collections.classes), where('teacherId', '==', user.id)), (snap) => {
                setStats(prev => ({ ...prev, sessions: snap.size }));
            });
            const unsubStudents = onSnapshot(query(collection(db, collections.users), where('role', '==', 'student'), where('teacherId', '==', user.id)), (snap) => {
                setStats(prev => ({ ...prev, students: snap.size }));
            });
            const unsubMaterials = onSnapshot(query(collection(db, collections.materials), where('teacherId', '==', user.id)), (snap) => {
                setStats(prev => ({ ...prev, materials: snap.size }));
            });
            return () => { unsubClasses(); unsubStudents(); unsubMaterials(); };
        }

        // Next Class for student
        if (user.role === 'student') {
            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');

            const unsubClasses = onSnapshot(collection(db, collections.classes), (snap) => {
                const classes = snap.docs.map(d => ({ id: d.id, ...d.data() } as ClassSession));
                const unsubRecurring = onSnapshot(collection(db, 'recurring_sessions'), (snapRec) => {
                    const recurring = snapRec.docs.map(d => ({ id: d.id, ...d.data() } as RecurringSession));
                    
                    const studentSubjects = user.subjectsStudied || [];
                    const myClasses = classes.filter(c => c.subjectId && studentSubjects.includes(c.subjectId));
                    const myRecurring = recurring.filter(s => s.subjectId && studentSubjects.includes(s.subjectId) && s.status !== 'paused');

                    // Find next class in the next 7 days
                    let foundNext = null;
                    for (let i = 0; i < 7; i++) {
                        const checkDate = new Date(now);
                        checkDate.setDate(now.getDate() + i);
                        const dateStr = checkDate.toISOString().split('T')[0];
                        const dayName = checkDate.toLocaleDateString('en-US', { weekday: 'long' });

                        const dayClasses = [
                            ...myClasses.filter(c => c.date === dateStr),
                            ...myRecurring.filter(s => s.dayOfWeek === dayName).map(s => ({ ...s, date: dateStr, time: s.startTime }))
                        ];

                        const filtered = i === 0 
                            ? dayClasses.filter(c => c.time > currentTime)
                            : dayClasses;

                        if (filtered.length > 0) {
                            filtered.sort((a, b) => a.time.localeCompare(b.time));
                            foundNext = { ...filtered[0], isToday: i === 0, dayName: i === 1 ? 'Tomorrow' : dayName };
                            break;
                        }
                    }

                    if (foundNext) {
                        setNextClass({
                            name: foundNext.name,
                            time: foundNext.time,
                            countdown: foundNext.isToday ? `Today at ${foundNext.time}` : `${foundNext.dayName} at ${foundNext.time}`
                        });
                    } else {
                        setNextClass({ name: 'No upcoming classes', countdown: 'Check back later' });
                    }
                });
                return () => unsubRecurring();
            });

            // Pending Tasks for student
            const unsubAssignments = onSnapshot(collection(db, collections.assignments), (snap) => {
                const assignments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Assignment));
                
                const unsubSubmissions = onSnapshot(query(collection(db, collections.submissions), where('studentId', '==', user.id)), (snapSub) => {
                    const submittedIds = snapSub.docs.map(d => (d.data() as Submission).assignmentId);
                    const pending = assignments.filter(a => !submittedIds.includes(a.id))
                        .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate));
                    
                    if (pending.length > 0) {
                        setPendingTask(pending[0]);
                    } else {
                        setPendingTask(null);
                    }
                });
                return () => unsubSubmissions();
            });

            return () => { unsubClasses(); unsubAssignments(); };
        }
    }, [user]);

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
                <header className="space-y-8 text-center">
                    <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter uppercase text-institutional-950 dark:text-white leading-none">
                        {welcomeMessage}
                    </h1>
                    
                    <div className="flex justify-center">
                        <button 
                            onClick={() => setIsSessionModalOpen(true)}
                            className="academic-button academic-button-primary px-8 py-4 flex items-center justify-center gap-3 group shadow-pop-sm"
                        >
                            <Plus size={20} className="transition-transform group-hover:rotate-90" /> 
                            {t('hub.newSession')}
                        </button>
                    </div>
                </header>

                <SessionModal 
                    isOpen={isSessionModalOpen} 
                    onClose={() => {
                        setIsSessionModalOpen(false);
                        setEditingSession(null);
                    }} 
                    editingClass={editingSession} 
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    {[
                        { label: 'Active Sessions', value: stats.sessions.toString(), icon: Clock, color: 'text-primary' },
                        { label: 'Total Students', value: stats.students.toString(), icon: Users, color: 'text-success' },
                        { label: 'Course Materials', value: stats.materials.toString(), icon: BookOpen, color: 'text-warning' }
                    ].map((stat, i) => (
                        <div key={i} className="flat-stat-card flex items-center justify-between group cursor-default">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/50 mb-1 md:mb-2">{stat.label}</p>
                                <h3 className="text-2xl md:text-3xl font-bold text-text">{stat.value}</h3>
                            </div>
                            <div className={`p-3 md:p-4 rounded-2xl bg-institutional-50 dark:bg-institutional-900 ${stat.color} group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between border-b border-border pb-4 md:pb-6">
                        <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-institutional-950 dark:text-white">Session Management</h2>
                        <button onClick={() => onNavigate('/schedule')} className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1 md:gap-2 hover:gap-3 transition-all">
                            View Full Schedule <ArrowUpRight size={14} />
                        </button>
                    </div>
                    <Classes 
                        onNavigate={onNavigate} 
                        onEditSession={(cl) => {
                            setEditingSession(cl);
                            setIsSessionModalOpen(true);
                        }}
                    />
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-12">
            <header className="space-y-6 text-center">
                <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                    <button onClick={() => onNavigate('/schedule')} className="academic-stat-card p-2 px-4 flex flex-col items-center gap-2 group text-center transition-all hover:border-primary min-w-[140px]">
                        <div className="w-8 h-8 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center shrink-0">
                            <Calendar size={14} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-text-secondary/40 leading-none mb-1">Next Class</p>
                            <h4 className="text-xs font-bold text-text dark:text-white uppercase truncate leading-none">{nextClass?.name || 'Loading...'}</h4>
                        </div>
                    </button>
                    <button onClick={() => onNavigate('/assignments')} className="academic-stat-card p-2 px-4 flex flex-col items-center gap-2 group text-center transition-all hover:border-danger min-w-[140px]">
                        <div className="w-8 h-8 rounded-lg bg-danger/5 text-danger group-hover:bg-danger group-hover:text-white transition-all flex items-center justify-center shrink-0">
                            <Clock size={14} />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[8px] font-bold uppercase tracking-widest text-text-secondary/40 leading-none mb-1">Pending Tasks</p>
                            <h4 className="text-xs font-bold text-text dark:text-white uppercase truncate leading-none">{pendingTask?.title || 'No Pending Tasks'}</h4>
                        </div>
                    </button>
                </div>

                <h1 className="text-4xl lg:text-6xl font-bold tracking-tighter uppercase text-institutional-950 dark:text-white leading-none">
                    {welcomeMessage}
                </h1>
            </header>

            <div className="flex flex-col items-center gap-12 w-full">
                <div className="w-full max-w-lg mx-auto">
                    <QRIdentity />
                </div>
                <div className="w-full max-w-4xl space-y-8">
                    {/* Main content area */}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;