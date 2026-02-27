import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, addDoc, Timestamp, doc, setDoc, writeBatch, query, where, deleteDoc, limit, orderBy, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User, Message, Group, EMOJI_SET } from '../types';
import { 
    Send, ShieldAlert, UserCheck, ChevronLeft, MoreVertical, Paperclip, 
    Check, CheckCheck, ShieldCheck, Trash2, Edit2, Pin, PinOff, Smile, 
    Search, Users, MessageSquare, Plus, Info, X, ArrowDown, Hash, User as UserIcon
} from 'lucide-react';
import { usePlatform } from '../contexts/PlatformContext';

interface ChatTarget {
    type: 'dm' | 'group';
    id: string;
    name: string;
    role?: string;
    lastSeen?: any;
    participantIds?: string[];
}

const MessageItem = React.memo(({ message, isMe, isMobile, onDelete, onEdit, onPin, language, isRTL, showMeta, isGroupChat }: {
    message: Message;
    isMe: boolean;
    isMobile: boolean;
    onDelete: (id: string) => void;
    onEdit: (m: Message) => void;
    onPin: (id: string, current: boolean) => void;
    language: string;
    isRTL: boolean;
    showMeta: boolean;
    isGroupChat: boolean;
}) => {
    const [showActions, setShowActions] = useState(false);
    
    return (
        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 ${!showMeta ? 'mt-0.5' : 'mt-5'}`}>
            <div className={`max-w-[88%] sm:max-w-[75%] md:max-w-[65%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {isGroupChat && !isMe && showMeta && (
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 px-3">{message.senderName}</p>
                )}
                
                <div className={`flex items-center gap-1 group/msg relative ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Actions bar for desktop */}
                    {!isMobile && (
                        <div className={`opacity-0 group-hover/msg:opacity-100 flex items-center gap-0.5 transition-all p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg ${isMe ? 'mr-1' : 'ml-1'}`}>
                            {isMe && <button onClick={() => onEdit(message)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Edit2 size={13} /></button>}
                            <button onClick={() => onPin(message.id, !!message.isPinned)} className={`p-1.5 rounded-lg ${message.isPinned ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{message.isPinned ? <PinOff size={13} /> : <Pin size={13} />}</button>
                            {isMe && <button onClick={() => onDelete(message.id)} className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-lg"><Trash2 size={13} /></button>}
                        </div>
                    )}
                    
                    <div className="relative">
                        <div 
                            onClick={() => isMobile && setShowActions(!showActions)}
                            className={`px-4 py-3 text-sm md:text-[15px] font-medium leading-relaxed transition-all shadow-sm cursor-pointer md:cursor-default ${isMe ? `bg-primary text-white rounded-2xl ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}` : `bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/50 rounded-2xl ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`}`}
                        >
                            {message.isPinned && <Pin size={9} className="absolute -top-1.5 -right-1.5 text-white bg-primary rounded-full p-0.5 border-2 border-white dark:border-slate-900 shadow-sm" />}
                            <p className="whitespace-pre-wrap break-words text-start">{message.text}</p>
                        </div>

                        {/* Actions popover for mobile */}
                        {showActions && isMobile && (
                            <div className={`absolute bottom-full mb-2 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 shadow-2xl flex gap-1 animate-in zoom-in-95 duration-200 ${isMe ? 'right-0' : 'left-0'}`}>
                                {isMe && (
                                    <button onClick={() => { onEdit(message); setShowActions(false); }} className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                )}
                                <button onClick={() => { onPin(message.id, !!message.isPinned); setShowActions(false); }} className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                    {message.isPinned ? <PinOff size={16} /> : <Pin size={16} />}
                                </button>
                                {isMe && (
                                    <button onClick={() => { onDelete(message.id); setShowActions(false); }} className="w-8 h-8 flex items-center justify-center text-danger hover:bg-danger/10 rounded-xl transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {showMeta && (
                    <div className={`text-[9px] font-bold tracking-widest uppercase mt-1.5 flex items-center gap-2 ${isMe ? 'justify-end text-slate-400' : 'justify-start text-slate-400'}`}>
                        {message.editedAt && <span>{language === 'ar' ? 'معدل' : language === 'fr' ? 'modifié' : 'edited'}</span>}
                        {message.timestamp?.seconds ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'}) : '...'}
                        {isMe && !isGroupChat && (
                            <div className="flex items-center gap-1">
                                {message.seen ? (
                                    <CheckCheck size={12} className="text-emerald-500" />
                                ) : (
                                    <Check size={12} className="text-slate-300" />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

const Inbox: React.FC = () => {
    const { user } = useAuth();
    const { isMobile } = usePlatform();
    const { t, isRTL, language } = useLanguage();
    const navigate = useNavigate();
    
    const [users, setUsers] = useState<User[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [activeTarget, setActiveTarget] = useState<ChatTarget | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [inputText, setInputText] = useState('');
    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [remoteTyping, setRemoteTyping] = useState(false);
    const [showConversation, setShowConversation] = useState(false);
    const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
    const [isScrollingUp, setIsScrollingUp] = useState(false);
    
    useEffect(() => {
        if (user?.role === 'economic') {
            navigate('/');
        }
    }, [user?.role, navigate]);

    const scrollRef = useRef<HTMLDivElement>(null);
    const lastBroadcastRef = useRef<number>(0);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, collections.users), (snap) => {
            const allUsers = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
            let filtered = allUsers.filter(u => u.status !== 'deleted' && u.id !== user?.id && u.role !== 'economic');
            if (user?.role === 'student') filtered = filtered.filter(u => u.role === 'teacher');
            setUsers(filtered);
        });

        const unsubGroups = onSnapshot(collection(db, collections.groups), (snap) => {
            const allGroups = snap.docs.map(d => ({ id: d.id, ...d.data() } as Group));
            // Fixed: Added optional chaining to prevent "includes" error on undefined participantIds
            const myGroups = allGroups.filter(g => g.participantIds?.includes(user?.id || ''));
            setGroups(myGroups);
        });

        return () => { unsubUsers(); unsubGroups(); };
    }, [user?.role, user?.id]);

    // Unread Count Sync
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, collections.messages), where('seen', '==', false), limit(500));
        const unsub = onSnapshot(q, (snap) => {
            const counts: Record<string, number> = {};
            snap.docs.forEach(d => {
                const m = d.data() as Message;
                if (m.senderId !== user.id && m.chatId.includes(user.id)) {
                    counts[m.chatId] = (counts[m.chatId] || 0) + 1;
                }
            });
            setUnreadCounts(counts);
        });
        return () => unsub();
    }, [user?.id]);

    // Message Fetching for Active Chat
    useEffect(() => {
        if (!user || !activeTarget) return;
        
        const chatId = activeTarget.type === 'dm' 
            ? [user.id, activeTarget.id].sort().join('_')
            : activeTarget.id;

        // Fixed: Removed orderBy('timestamp', 'desc') to resolve "requires an index" error.
        // Sorting is now handled on the client side below.
        const q = query(
            collection(db, collections.messages),
            where('chatId', '==', chatId),
            limit(100)
        );
        
        const unsub = onSnapshot(q, (snap) => {
            const msgs = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Message))
                // Client-side sorting as a fallback to avoid mandatory composite indexes
                .sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            setMessages(msgs);
        });
        return () => unsub();
    }, [user?.id, activeTarget?.id]);

    // Seen Update
    useEffect(() => {
        if (!user || !activeTarget || messages.length === 0 || activeTarget.type === 'group') return;
        const unreadMessages = messages.filter(m => m.senderId !== user.id && !m.seen);
        if (unreadMessages.length > 0) {
            const batch = writeBatch(db);
            unreadMessages.forEach(m => batch.update(doc(db, collections.messages, m.id), { seen: true, seenAt: Timestamp.now() }));
            batch.commit();
        }
    }, [messages.length, user?.id, activeTarget?.id]);

    // Typing Indicators
    useEffect(() => {
        if (!user || !activeTarget || activeTarget.type === 'group') return;
        const chatId = [user.id, activeTarget.id].sort().join('_');
        const unsub = onSnapshot(doc(db, collections.typing, chatId), (snap) => {
            if (snap.exists()) setRemoteTyping(!!snap.data()[activeTarget.id]);
            else setRemoteTyping(false);
        });
        return () => { unsub(); setRemoteTyping(false); };
    }, [user?.id, activeTarget?.id]);

    const broadcastTyping = useCallback(async (isTyping: boolean) => {
        if (!user || !activeTarget || activeTarget.type === 'group') return;
        const now = Date.now();
        if (!isTyping || now - lastBroadcastRef.current > 2000) {
            const chatId = [user.id, activeTarget.id].sort().join('_');
            lastBroadcastRef.current = now;
            try { await setDoc(doc(db, collections.typing, chatId), { [user.id]: isTyping }, { merge: true }); } catch (e) {}
        }
    }, [user?.id, activeTarget?.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInputText(val);
        if (val.trim()) {
            broadcastTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 3000);
        } else {
            broadcastTyping(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = inputText.trim();
        if (!text || !user || !activeTarget) return;

        if (editingMessage) {
            try {
                await updateDoc(doc(db, collections.messages, editingMessage.id), {
                    text, editedAt: Timestamp.now()
                });
                setEditingMessage(null);
                setInputText('');
            } catch (e) { alert(t('common.error')); }
            return;
        }

        const chatId = activeTarget.type === 'dm' 
            ? [user.id, activeTarget.id].sort().join('_')
            : activeTarget.id;
            
        setInputText('');
        try {
            await addDoc(collection(db, collections.messages), { 
                chatId, 
                senderId: user.id, 
                senderName: user.name,
                text, 
                timestamp: Timestamp.now(), 
                seen: false 
            });
            if (activeTarget.type === 'dm') {
                await addDoc(collection(db, collections.notifications), {
                    userId: activeTarget.id, title: 'New Message', message: `${user.name}: ${text.substring(0, 50)}`, type: 'message', read: false, timestamp: Timestamp.now(), link: '/inbox'
                });
            }
        } catch (error) { setInputText(text); }
    };

    const handlePin = async (messageId: string, current: boolean) => {
        await updateDoc(doc(db, collections.messages, messageId), { isPinned: !current });
    };

    const handleDeleteMessage = async (id: string) => {
        if (window.confirm(t('inbox.deleteConfirm'))) {
            await deleteDoc(doc(db, collections.messages, id));
        }
    };

    const createGroup = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = fd.get('groupName') as string;
        const participants = fd.getAll('participants') as string[];
        if (!name || participants.length === 0) return;
        try {
            await addDoc(collection(db, collections.groups), {
                name,
                creatorId: user?.id,
                participantIds: [...participants, user?.id],
                createdAt: Timestamp.now(),
                type: 'custom'
            });
            setIsCreateGroupOpen(false);
        } catch (e) { alert(t('common.error')); }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (scrollRef.current && !isScrollingUp) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length, remoteTyping, isScrollingUp]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        setIsScrollingUp(scrollHeight - scrollTop - clientHeight > 200);
    };

    const filteredSidebar = useMemo(() => {
        const term = searchTerm.toLowerCase();
        const filteredUsers = users.filter(u => u.name.toLowerCase().includes(term));
        const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(term));
        return { users: filteredUsers, groups: filteredGroups };
    }, [users, groups, searchTerm]);

    const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned), [messages]);

    const selectTarget = (t: ChatTarget) => {
        setActiveTarget(t);
        setShowConversation(true);
    };

    const getPresenceStatus = useCallback((u: User) => {
        if (!u.lastSeen) return { isOnline: false, lastSeenStr: '' };
        const lastSeenTime = u.lastSeen.toMillis ? u.lastSeen.toMillis() : (u.lastSeen.seconds * 1000);
        const diffMinutes = (Date.now() - lastSeenTime) / 1000 / 60;
        const isOnline = diffMinutes < 5;
        
        let lastSeenStr = '';
        if (!isOnline) {
            if (diffMinutes < 60) {
                lastSeenStr = `${Math.floor(diffMinutes)}${t('common.minutesShort')} ${t('common.ago')}`;
            } else if (diffMinutes < 1440) {
                lastSeenStr = `${Math.floor(diffMinutes / 60)}${t('common.hoursShort')} ${t('common.ago')}`;
            } else {
                lastSeenStr = new Date(lastSeenTime).toLocaleDateString();
            }
        }
        
        return { isOnline, lastSeenStr };
    }, [t]);

    return (
        <div className={`flex h-[calc(100vh-140px)] lg:h-[calc(100vh-220px)] overflow-hidden shadow-2xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-all duration-500`}>
            
            {/* Sidebar View */}
            <div className={`${showConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-[380px] flex-col bg-slate-50/10 dark:bg-slate-900/10 border-r border-slate-200 dark:border-slate-800 shrink-0 transition-all`}>
                <div className="p-8 pb-4 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-none">{t('nav.inbox')}</h3>
                        {user?.role === 'teacher' && (
                            <button onClick={() => setIsCreateGroupOpen(true)} className="p-2.5 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 active:scale-90 transition-all">
                                <Plus size={18} />
                            </button>
                        )}
                    </div>
                    <div className="relative group">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors`} size={15} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={t('inbox.searchPlaceholder')}
                            className={`w-full bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/50 transition-all`}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-8 scroll-hide">
                    {/* Groups Section */}
                    {filteredSidebar.groups.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] px-4 mb-3">{t('inbox.classGroups')}</p>
                            <div className="space-y-1">
                                {filteredSidebar.groups.map(g => (
                                    <button 
                                        key={g.id}
                                        onClick={() => selectTarget({ type: 'group', id: g.id, name: g.name, participantIds: g.participantIds })}
                                        className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTarget?.id === g.id ? 'bg-primary text-white shadow-xl translate-x-1' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${activeTarget?.id === g.id ? 'bg-white/20' : 'bg-primary/5 text-primary border border-primary/10'}`}>
                                            <Users size={18} />
                                        </div>
                                        <div className="text-start flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${activeTarget?.id === g.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{g.name}</p>
                                            <p className={`text-[10px] font-bold tracking-tight mt-0.5 ${activeTarget?.id === g.id ? 'text-white/60' : 'text-slate-400'}`}>{g.participantIds?.length || 0} {t('inbox.participants')}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DMs Section */}
                    {filteredSidebar.users.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.25em] px-4 mb-3">{t('inbox.dms')}</p>
                            <div className="space-y-1">
                                {filteredSidebar.users.map(u => {
                                    const chatId = [user?.id, u.id].sort().join('_');
                                    const unread = unreadCounts[chatId] || 0;
                                    const { isOnline } = getPresenceStatus(u);
                                    return (
                                        <button 
                                            key={u.id}
                                            onClick={() => selectTarget({ type: 'dm', id: u.id, name: u.name, role: u.role, lastSeen: u.lastSeen })}
                                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${activeTarget?.id === u.id ? 'bg-primary text-white shadow-xl translate-x-1' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${activeTarget?.id === u.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-800'}`}>
                                                    {u.name.charAt(0)}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 ${activeTarget?.id === u.id ? 'border-primary' : 'border-white dark:border-slate-950'} ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                {unread > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-950 animate-bounce">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-start flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${activeTarget?.id === u.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{u.name}</p>
                                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${activeTarget?.id === u.id ? 'text-white/60' : 'text-slate-400'}`}>{u.role}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Conversation Window */}
            <div className={`${!showConversation ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-white dark:bg-slate-950 transition-all relative overflow-hidden`}>
                {activeTarget ? (
                    <>
                        {/* Conversation Header */}
                        <div className="px-6 py-4 md:px-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-20 lg:top-24 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
                            <div className="flex items-center gap-4 min-w-0">
                                <button onClick={() => setShowConversation(false)} className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">
                                    <ChevronLeft size={22} className={isRTL ? 'rotate-180' : ''} />
                                </button>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 bg-primary/5 text-primary border border-primary/10`}>
                                    {activeTarget.type === 'dm' ? activeTarget.name.charAt(0) : <Users size={20} />}
                                </div>
                                <div className="text-start min-w-0">
                                    <h4 className="font-bold text-base text-slate-900 dark:text-white truncate flex items-center gap-2">
                                        {activeTarget.name}
                                        {activeTarget.type === 'dm' && activeTarget.role === 'teacher' && <UserCheck size={14} className="text-primary" />}
                                        {activeTarget.type === 'dm' && (
                                            <button 
                                                onClick={() => navigate(`/profile/${activeTarget.id}`)}
                                                className="p-1 hover:bg-primary/10 rounded-lg text-primary transition-colors"
                                                title={t('profile.title')}
                                            >
                                                <UserIcon size={14} />
                                            </button>
                                        )}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                            {activeTarget.type === 'dm' ? activeTarget.role : `${activeTarget.participantIds?.length || 0} ${t('inbox.participants')}`}
                                        </p>
                                        <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                        {remoteTyping ? (
                                            <span className="text-[10px] font-black text-primary animate-pulse">{t('inbox.typing')}...</span>
                                        ) : (
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTarget.type === 'dm' && getPresenceStatus(activeTarget as any).isOnline ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                {activeTarget.type === 'dm' ? (
                                                    getPresenceStatus(activeTarget as any).isOnline 
                                                        ? t('common.online') 
                                                        : `${t('common.lastSeen')} ${getPresenceStatus(activeTarget as any).lastSeenStr}`
                                                ) : t('common.online')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"><Info size={20} /></button>
                                <button className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"><MoreVertical size={20} /></button>
                            </div>
                        </div>

                        {/* Pinned Messages - Enhanced Section */}
                        {pinnedMessages.length > 0 && (
                            <div className="bg-primary/5 border-b border-primary/10 p-3 flex gap-3 overflow-x-auto scroll-hide animate-in slide-in-from-top-2 duration-300">
                                {pinnedMessages.map(pm => (
                                    <div key={pm.id} className="bg-white dark:bg-slate-900 p-2.5 px-4 rounded-2xl border border-primary/20 shadow-sm flex items-center gap-3 min-w-[200px] max-w-[320px] shrink-0 group">
                                        <Pin size={12} className="text-primary shrink-0" />
                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{pm.text}</p>
                                        <button onClick={() => handlePin(pm.id, true)} className="ml-auto p-1 text-slate-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Chat Feed */}
                        <div 
                            ref={scrollRef} 
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto p-6 md:p-10 space-y-1.5 scroll-smooth relative"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-10 select-none">
                                    <ShieldCheck size={80} strokeWidth={1} />
                                    <p className="mt-6 text-[11px] font-black uppercase tracking-[0.5em]">{t('inbox.protocolInitiated')}</p>
                                </div>
                            )}
                            
                            {messages.map((m, i) => {
                                const isMe = m.senderId === user?.id;
                                const showMeta = i === messages.length - 1 || messages[i+1].senderId !== m.senderId;
                                return (
                                    <MessageItem 
                                        key={m.id}
                                        message={m}
                                        isMe={isMe}
                                        isMobile={isMobile}
                                        onDelete={handleDeleteMessage}
                                        onEdit={setEditingMessage}
                                        onPin={handlePin}
                                        language={language}
                                        isRTL={isRTL}
                                        showMeta={showMeta}
                                        isGroupChat={activeTarget.type === 'group'}
                                    />
                                );
                            })}
                            
                            {remoteTyping && (
                                <div className="flex w-full justify-start mt-6 animate-in slide-in-from-left-4 duration-500">
                                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 px-5 rounded-2xl rounded-bl-none flex items-center gap-3">
                                        <div className="flex gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isScrollingUp && (
                                <button 
                                    onClick={scrollToBottom}
                                    className="fixed bottom-36 end-10 md:end-16 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-2xl text-primary animate-in zoom-in-90 duration-300 hover:scale-110 active:scale-90 transition-all z-40"
                                >
                                    <ArrowDown size={22} />
                                </button>
                            )}
                        </div>

                        {/* Input & Control Area */}
                        <div className="p-6 md:p-10 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                            {editingMessage && (
                                <div className="mb-6 p-4 bg-primary/5 rounded-[1.5rem] flex items-center justify-between border border-primary/20 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="p-2.5 bg-primary text-white rounded-xl"><Edit2 size={16} /></div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">{t('inbox.editMessage')}</p>
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">{editingMessage.text}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="p-2 text-slate-400 hover:text-danger"><X size={20} /></button>
                                </div>
                            )}
                            <form onSubmit={handleSend} className="flex gap-4 items-center max-w-6xl mx-auto relative">
                                <button type="button" className="hidden sm:flex p-4 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-primary rounded-2xl transition-all shadow-sm"><Paperclip size={22} /></button>
                                <div className="flex-1 relative flex items-center">
                                    <input 
                                        value={inputText || (editingMessage?.text || '')}
                                        onChange={handleInputChange}
                                        placeholder={t('inbox.secureTrans')}
                                        className={`w-full bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-primary/50 p-4.5 rounded-2xl text-[15px] font-medium outline-none transition-all shadow-inner text-slate-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}
                                    />
                                    {!isMobile && (
                                        <button type="button" className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-primary transition-colors`}>
                                            <Smile size={20} />
                                        </button>
                                    )}
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={(!inputText.trim() && !editingMessage)} 
                                    className="w-14 h-14 shrink-0 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/30 active:scale-90 transition-all disabled:opacity-20 disabled:shadow-none"
                                >
                                    <Send size={24} className={isRTL ? 'rotate-180' : ''} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30 select-none grayscale">
                        <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-[3rem] flex items-center justify-center mb-8 rotate-3">
                            <MessageSquare size={64} className="text-slate-300" strokeWidth={1} />
                        </div>
                        <h3 className="text-2xl font-black uppercase text-slate-900 dark:text-white mb-4 tracking-tighter">{t('inbox.terminalSession')}</h3>
                        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 max-w-xs leading-loose">{t('inbox.chooseContact')}</p>
                    </div>
                )}
            </div>

            {/* Modal: Create Collaborative Group */}
            {isCreateGroupOpen && (
                <div className="fixed inset-0 z-[500] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl max-w-xl w-full p-10 relative border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-500">
                        <button onClick={() => setIsCreateGroupOpen(false)} className={`absolute top-10 ${isRTL ? 'left-10' : 'right-10'} p-2 text-slate-400 hover:text-danger transition-colors`}><X size={24} /></button>
                        <div className="text-start mb-10">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('inbox.createGroup')}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-2">Protocol: Collaborative Academic Channel</p>
                        </div>
                        <form onSubmit={createGroup} className="space-y-8 text-start">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest px-2">{t('inbox.groupName')}</label>
                                <div className="relative group">
                                    <Hash className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-300`} size={16} />
                                    <input name="groupName" placeholder="Project Alpha, Class Beta..." className={`w-full bg-slate-50 dark:bg-slate-800/50 p-4 ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-inner`} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase text-slate-500 tracking-widest px-2">{t('inbox.participants')}</label>
                                <div className="max-h-[280px] overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2rem] space-y-1.5 shadow-inner scroll-hide">
                                    {users.map(u => (
                                        <label key={u.id} className="flex items-center gap-4 p-4 hover:bg-white dark:hover:bg-slate-900 rounded-2xl cursor-pointer transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                                            <input type="checkbox" name="participants" value={u.id} className="w-5 h-5 rounded-lg border-2 border-slate-300 checked:bg-primary text-primary transition-all cursor-pointer focus:ring-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{u.name}</p>
                                                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">{u.role}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all mt-4 hover:bg-primary-hover">
                                {t('common.confirm')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;