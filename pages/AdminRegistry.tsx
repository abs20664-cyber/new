import React, { useEffect, useState, memo, useMemo } from 'react';
import { safeStringify } from '../utils';
import { collection, onSnapshot, doc, setDoc, updateDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db, collections, firebaseConfig } from '../services/firebase';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { User, UserRole, Subject } from '../types';
import { Trash2, Plus, Settings, Shield, GraduationCap, X, Loader2, ShieldAlert, AlertTriangle, User as UserIcon, DollarSign, Users, Search, Filter } from 'lucide-react';
import { superAdminHardDelete } from '../services/adminTools';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { FixedSizeList as List } from 'react-window';
import { Skeleton } from '../components/Skeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const getRoleIcon = (role: UserRole) => {
    switch(role) {
        case 'admin': return <ShieldAlert size={14} className="text-danger" />;
        case 'teacher': return <Shield size={14} className="text-primary" />;
        case 'student': return <GraduationCap size={14} className="text-success" />;
        case 'economic': return <DollarSign size={14} className="text-amber-500" />;
        default: return <AlertTriangle size={14} />;
    }
};

const UserRow = memo(({ index, style, data }: { index: number, style: React.CSSProperties, data: any }) => {
    const { users, isMobile, t, navigate, setEditingUser, setIsModalOpen, handleDeleteClick, processingId } = data;
    const u = users[index];

    if (isMobile) {
        return (
            <div style={style} className="px-1 py-2">
                <div className="p-5 bg-surface border-2 border-border-dark rounded-2xl shadow-pop-sm text-start">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white border-2 border-border-dark shadow-pop-sm ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                            {u.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-display font-bold text-sm text-text truncate">{u.name}</p>
                            <p className="text-[10px] font-bold text-text-secondary truncate">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-surface border-2 border-border-dark shadow-pop-sm p-1 px-2 rounded-lg shrink-0">
                            {getRoleIcon(u.role)}
                            <span className="text-[9px] font-bold uppercase text-text-secondary">{u.role}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t-2 border-border-dark">
                        <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border-2 border-border-dark shadow-pop-sm text-text-secondary font-bold text-[10px] uppercase hover:bg-muted transition-colors"><Settings size={14} /> {t('admin.manage')}</button>
                        <button onClick={() => navigate(`/profile/${u.id}`)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border-2 border-border-dark shadow-pop-sm text-primary font-bold text-[10px] uppercase hover:bg-primary/10 transition-colors"><UserIcon size={14} /> {t('admin.profile')}</button>
                        <button onClick={() => handleDeleteClick(u.id)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface border-2 border-border-dark shadow-pop-sm text-danger font-bold text-[10px] uppercase hover:bg-danger/10 transition-colors">
                            {processingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} {t('common.delete')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={style} className={`grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr_100px] px-6 border-b-2 border-border-dark items-center hover:bg-muted transition-colors text-start`}>
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border-2 border-border-dark shadow-pop-sm ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}`}>
                    {u.name.charAt(0)}
                </div>
                <span className="font-display font-bold text-sm text-text">{u.name}</span>
            </div>
            <div className="text-xs font-bold text-text-secondary truncate pr-4">{u.email}</div>
            <div className="flex items-center gap-2">
                {getRoleIcon(u.role)}
                <span className="text-xs font-bold uppercase text-text-secondary">{u.role}</span>
            </div>
            <div className="text-xs font-mono text-text-muted">{u.id}</div>
            <div className="flex items-center justify-end gap-2">
                <button onClick={() => navigate(`/profile/${u.id}`)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border-2 border-border-dark shadow-pop-sm text-text-secondary hover:text-primary transition-colors" title={t('admin.profile')}><UserIcon size={14} /></button>
                <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border-2 border-border-dark shadow-pop-sm text-text-secondary hover:text-primary transition-colors"><Settings size={14} /></button>
                <button onClick={() => handleDeleteClick(u.id)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface border-2 border-border-dark shadow-pop-sm text-text-secondary hover:bg-danger hover:text-white transition-colors">
                    {processingId === u.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
            </div>
        </div>
    );
});

const AdminRegistry: React.FC = () => {
    const { user: currentUser, logout } = useAuth();
    const { isMobile } = usePlatform();
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [tempPassword, setTempPassword] = useState<string | null>(null);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [newSubject, setNewSubject] = useState('');
    const [editData, setEditData] = useState<Partial<User>>({});

    useEffect(() => {
        if (editingUser) {
            setEditData({ ...editingUser });
        } else {
            setEditData({});
        }
    }, [editingUser]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, collections.users), (snap) => {
            const fetchedUsers = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .filter(u => u.status !== 'deleted')
                .map(u => u as User);
            setUsers(fetchedUsers);
            setLoading(false);
        });
        const unsubSubjects = onSnapshot(collection(db, collections.subjects), (snap) => {
            const fetchedSubjects = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Subject));
            setSubjects(fetchedSubjects);
        });
        return () => { unsub(); unsubSubjects(); };
    }, []);

    const addSubject = async () => {
        if (!newSubject.trim()) return;
        const subjectRef = doc(collection(db, collections.subjects));
        await setDoc(subjectRef, { name: newSubject });
        setNewSubject('');
    };

    const deleteSubject = async (id: string) => {
        await updateDoc(doc(db, collections.subjects, id), { status: 'deleted' });
    };

    const performHardDelete = async (targetUserId: string) => {
        setProcessingId(targetUserId);
        try {
            setUsers(prev => prev.filter(u => u.id !== targetUserId));
            await superAdminHardDelete(targetUserId);
            if (currentUser?.id === targetUserId) {
                alert(t('admin.accountDeleted'));
                logout();
                return;
            }
        } catch (error: any) {
            console.error("Deletion Failed", error);
            alert(t('common.error'));
            const snap = await getDocs(collection(db, collections.users));
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)).filter(u => u.status !== 'deleted'));
        } finally {
            setProcessingId(null);
        }
    };

    const handleDeleteClick = (userId: string) => {
        const isSelf = currentUser?.id === userId;
        const confirmMsg = isSelf ? t('admin.idWarning') : t('admin.deleteUser');
        if (window.confirm(confirmMsg)) performHardDelete(userId);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const role = formData.get('role') as UserRole;
        const subjectsTaughtIds = editData.subjectsTaughtIds || [];

        try {
            if (editingUser) {
                const id = editingUser.id;
                const updates: any = {};
                if (name !== editingUser.name) updates.name = name;
                if (role !== editingUser.role) updates.role = role;
                if (safeStringify(subjectsTaughtIds) !== safeStringify(editingUser.subjectsTaughtIds || [])) updates.subjectsTaughtIds = subjectsTaughtIds;
                
                // Credential Safeguards: Only update if explicitly changed
                if (email && email !== editingUser.email) {
                    updates.email = email;
                    console.log(`[Admin] Explicit email change for ${id}`);
                }
                if (password && password.trim() !== '') {
                    updates.password = password;
                    console.log(`[Admin] Explicit password reset for ${id}`);
                }

                if (Object.keys(updates).length > 0) {
                    await updateDoc(doc(db, collections.users, id), updates);
                }
            } else {
                if (!password) throw new Error("Password required");
                
                // Create user in Firebase Auth using secondary app to avoid logging out admin
                const apps = getApps();
                const secondaryApp = apps.find(app => app.name === 'SecondaryApp') || initializeApp(firebaseConfig, 'SecondaryApp');
                const secondaryAuth = getAuth(secondaryApp);
                
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                const uid = userCredential.user.uid;
                
                // Sign out of secondary app to clear its state
                await secondaryAuth.signOut();

                const newUser = {
                    id: uid,
                    name,
                    email,
                    password,
                    role,
                    subjectsTaughtIds,
                    lastSeen: null,
                    createdAt: Timestamp.now(),
                    accountStatus: 'active',
                    mustChangePassword: role === 'economic'
                };
                await setDoc(doc(db, collections.users, uid), newUser);
                if (role === 'economic') setTempPassword(password);
            }
            if (role !== 'economic' || editingUser) setIsModalOpen(false);
            setEditingUser(null);
        } catch (error: any) {
            console.error("Save failed", error);
            alert(t('common.error') + ": " + error.message);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  u.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchQuery, roleFilter]);

    const stats = useMemo(() => {
        return {
            total: users.length,
            students: users.filter(u => u.role === 'student').length,
            teachers: users.filter(u => u.role === 'teacher').length,
            staff: users.filter(u => u.role === 'admin' || u.role === 'economic').length,
        };
    }, [users]);

    const pieData = useMemo(() => [
        { name: t('roles.student'), value: stats.students, color: '#10b981' }, // success
        { name: t('roles.teacher'), value: stats.teachers, color: '#3b82f6' }, // primary
        { name: t('roles.admin') + ' / ' + t('roles.economic'), value: stats.staff, color: '#ef4444' }, // danger
    ].filter(d => d.value > 0), [stats, t]);

    const itemData = { users: filteredUsers, isMobile, t, navigate, setEditingUser, setIsModalOpen, handleDeleteClick, processingId };

    const renderContent = () => {
        if (loading) {
            return isMobile ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[150px] w-full rounded-2xl" />)}
                </div>
            ) : (
                <div className="bg-surface border-4 border-border-dark rounded-3xl overflow-hidden shadow-pop">
                     <div className={`grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr_100px] p-6 border-b-4 border-border-dark bg-muted font-bold text-[10px] uppercase tracking-widest text-text-secondary text-start`}>
                        <div>{t('admin.legalName')}</div>
                        <div>{t('admin.email')}</div>
                        <div>{t('admin.permissions')}</div>
                        <div>{t('admin.systemId')}</div>
                        <div className="text-end">{t('admin.manage')}</div>
                    </div>
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[81px] w-full" />)}
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                        <div className="bg-surface border-2 border-border-dark p-6 rounded-3xl shadow-pop-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Total Users</h3>
                                <div className="w-8 h-8 rounded-full bg-muted border-2 border-border-dark shadow-pop-sm flex items-center justify-center text-text-secondary">
                                    <Users size={16} />
                                </div>
                            </div>
                            <p className="text-3xl font-display font-bold text-text">{stats.total}</p>
                        </div>
                        <div className="bg-surface border-2 border-border-dark p-6 rounded-3xl shadow-pop-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Students</h3>
                                <div className="w-8 h-8 rounded-full bg-success/10 border-2 border-success shadow-pop-sm flex items-center justify-center text-success">
                                    <GraduationCap size={16} />
                                </div>
                            </div>
                            <p className="text-3xl font-display font-bold text-text">{stats.students}</p>
                        </div>
                        <div className="bg-surface border-2 border-border-dark p-6 rounded-3xl shadow-pop-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Teachers</h3>
                                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary shadow-pop-sm flex items-center justify-center text-primary">
                                    <Shield size={16} />
                                </div>
                            </div>
                            <p className="text-3xl font-display font-bold text-text">{stats.teachers}</p>
                        </div>
                        <div className="bg-surface border-2 border-border-dark p-6 rounded-3xl shadow-pop-sm flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">Staff</h3>
                                <div className="w-8 h-8 rounded-full bg-danger/10 border-2 border-danger shadow-pop-sm flex items-center justify-center text-danger">
                                    <ShieldAlert size={16} />
                                </div>
                            </div>
                            <p className="text-3xl font-display font-bold text-text">{stats.staff}</p>
                        </div>
                    </div>
                    <div className="bg-surface border-2 border-border-dark p-6 rounded-3xl shadow-pop-sm flex flex-col">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-secondary mb-4">Role Distribution</h3>
                        <div className="flex-1 min-h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-surface border-2 border-border-dark p-4 rounded-3xl shadow-pop-sm">
                    <div className="relative w-full md:w-96">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input 
                            type="text" 
                            placeholder="Search by name, email, or ID..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="academic-input w-full pl-12"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                        <Filter size={16} className="text-text-muted shrink-0" />
                        <div className="flex gap-2">
                            {(['all', 'student', 'teacher', 'admin', 'economic'] as const).map(role => (
                                <button
                                    key={role}
                                    onClick={() => setRoleFilter(role)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-2 border-border-dark shadow-pop-sm ${
                                        roleFilter === role 
                                            ? 'bg-primary text-white' 
                                            : 'bg-surface text-text-secondary hover:bg-muted'
                                    }`}
                                >
                                    {role === 'all' ? 'All Roles' : t(`roles.${role}`)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Subject Management */}
                <div className="bg-surface border-2 border-border-dark p-6 rounded-3xl shadow-pop-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-4">{t('admin.manageSubjects')}</h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            placeholder="New subject name..."
                            className="academic-input flex-1"
                        />
                        <button onClick={addSubject} className="academic-button academic-button-primary px-6 py-3"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {subjects.map(s => (
                            <div key={s.id} className="flex items-center gap-2 bg-muted border-2 border-border-dark shadow-pop-sm px-3 py-1 rounded-full text-xs font-bold text-text-secondary">
                                {s.name}
                                <button onClick={() => deleteSubject(s.id)} className="text-danger hover:text-danger/80 transition-colors"><X size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Registry List */}
                {isMobile ? (
                    <List
                        height={window.innerHeight - 400} // Adjust height as needed
                        itemCount={filteredUsers.length}
                        itemSize={180} // Approximate height of a card
                        width="100%"
                        itemData={itemData}
                    >
                        {UserRow}
                    </List>
                ) : (
                    <div className="bg-surface border-4 border-border-dark rounded-3xl overflow-hidden shadow-pop">
                        <div className={`grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr_100px] p-6 border-b-4 border-border-dark bg-muted font-bold text-[10px] uppercase tracking-widest text-text-secondary text-start`}>
                            <div>{t('admin.legalName')}</div>
                            <div>{t('admin.email')}</div>
                            <div>{t('admin.permissions')}</div>
                            <div>{t('admin.systemId')}</div>
                            <div className="text-end">{t('admin.manage')}</div>
                        </div>
                        {filteredUsers.length > 0 ? (
                            <List
                                height={Math.min(filteredUsers.length * 81, window.innerHeight - 400)} // Dynamic height
                                itemCount={filteredUsers.length}
                                itemSize={81} // Height of a row
                                width="100%"
                                itemData={itemData}
                            >
                                {UserRow}
                            </List>
                        ) : (
                            <div className="p-12 text-center text-text-muted text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-4">
                                <Search size={32} className="opacity-20" />
                                {t('admin.registryEmpty')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fade-in max-w-7xl mx-auto">
            <div className={`mb-8 flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'}`}>
                <div className="text-start">
                    <h2 className="text-2xl md:text-4xl font-display font-bold uppercase tracking-tight text-text">{t('nav.registry')} Dashboard</h2>
                    <p className="text-[10px] font-bold text-danger uppercase tracking-widest mt-1">{t('admin.systemManagement')}</p>
                </div>
                <button 
                    onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
                    className={`academic-button academic-button-primary ${isMobile ? 'w-full py-4' : 'px-6 py-3 hover:scale-105 transition-transform'}`}
                >
                    <Plus size={16} /> {t('admin.addUser')}
                </button>
            </div>

            {renderContent()}

            {isModalOpen && (
                <div className={`fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center ${isMobile ? 'p-0 items-end' : 'p-4'}`}>
                    <div className={`bg-surface shadow-pop relative border-4 border-border-dark max-h-[90vh] overflow-y-auto ${isMobile ? 'w-full rounded-t-[2.5rem] p-6 pb-10' : 'max-w-lg w-full p-10 rounded-3xl'}`}>
                        <button onClick={() => setIsModalOpen(false)} className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} text-text-secondary hover:text-text transition-colors bg-surface border-2 border-border-dark rounded-2xl p-2 shadow-pop-sm`}><X size={24} /></button>
                        <h3 className="text-xl font-display font-bold mb-8 uppercase tracking-tight text-text">
                            {editingUser ? t('admin.updateProfile') : t('admin.newAccount')}
                        </h3>
                        {tempPassword ? (
                            <div className="bg-amber-100 border-2 border-border-dark shadow-pop-sm p-6 rounded-2xl mb-8 text-center animate-in zoom-in-95 duration-300">
                                <p className="text-[10px] font-bold uppercase text-amber-600 tracking-widest mb-2">{t('economic.tempPassword')}</p>
                                <p className="text-2xl font-bold text-amber-700 font-mono tracking-wider">{tempPassword}</p>
                                <p className="text-[9px] font-bold text-amber-500 mt-4 uppercase">Copy this password now. It will not be shown again.</p>
                                <button 
                                    onClick={() => { setTempPassword(null); setIsModalOpen(false); }}
                                    className="mt-6 w-full bg-amber-500 text-white border-2 border-border-dark shadow-pop-sm py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-colors"
                                >
                                    {t('common.confirm')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-4 text-start">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-text-secondary">{t('admin.legalName')}</label>
                                <input name="name" defaultValue={editingUser?.name} placeholder="..." className="academic-input p-4" required />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary">{t('admin.email')}</label>
                                    <input name="email" type="email" defaultValue={editingUser?.email} placeholder="name@edu.alg" className="academic-input p-4" required />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary">{t('admin.passcode')}</label>
                                    <input name="password" type="password" placeholder={editingUser ? "---" : "***"} className="academic-input p-4" required={!editingUser} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary">{t('admin.permissions')}</label>
                                    <select name="role" defaultValue={editingUser?.role || 'student'} className="academic-input p-4">
                                        <option value="student">{t('roles.student')}</option>
                                        <option value="teacher">{t('roles.teacher')}</option>
                                        <option value="admin">{t('roles.admin')}</option>
                                        <option value="economic">{t('roles.economic')}</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary">{t('admin.subjects')}</label>
                                    <div className="academic-input p-4 max-h-40 overflow-y-auto">
                                        {subjects.map(s => (
                                            <label key={s.id} className="flex items-center gap-2">
                                                <input type="checkbox" name="subjects" value={s.id} checked={editData.subjectsTaughtIds?.includes(s.id) || false} onChange={(e) => {
                                                    const newSubjects = e.target.checked 
                                                        ? [...(editData.subjectsTaughtIds || []), s.id]
                                                        : (editData.subjectsTaughtIds || []).filter(id => id !== s.id);
                                                    setEditData({ ...editData, subjectsTaughtIds: newSubjects });
                                                }} />
                                                {s.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {editingUser && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-text-secondary">{t('admin.systemId')}</label>
                                    <input name="id" defaultValue={editingUser.id} className="academic-input p-4 opacity-50" readOnly />
                                </div>
                            )}
                            <button type="submit" className="academic-button academic-button-primary w-full p-4 mt-4">{t('admin.confirmChanges')}</button>
                        </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRegistry;
