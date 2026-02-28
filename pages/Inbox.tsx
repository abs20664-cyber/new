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
    isBroadcast?: boolean;
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
        <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 ${!showMeta ? 'mt-1' : 'mt-4'}`}>
            <div className={`max-w-[85%] sm:max-w-[70%] md:max-w-[60%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {isGroupChat && !isMe && showMeta && (
                    <p className="text-[12px] font-semibold text-institutional-400 mb-1 px-3">{message.senderName}</p>
                )}
                
                <div className={`flex items-center gap-2 group/msg relative ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
                    {/* Actions bar for desktop */}
                    {!isMobile && (
                        <div className={`opacity-0 group-hover/msg:opacity-100 flex items-center gap-1 transition-all p-1 bg-surface/80 backdrop-blur-md border border-institutional-100 dark:border-institutional-800 rounded-full shadow-sm ${isMe ? 'mr-2' : 'ml-2'}`}>
                            {isMe && <button onClick={() => onEdit(message)} className="p-1.5 text-institutional-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all"><Edit2 size={14} /></button>}
                            <button onClick={() => onPin(message.id, !!message.isPinned)} className={`p-1.5 rounded-full transition-all ${message.isPinned ? 'text-primary bg-primary/10' : 'text-institutional-400 hover:text-primary hover:bg-primary/5'}`}>{message.isPinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
                            {isMe && <button onClick={() => onDelete(message.id)} className="p-1.5 text-institutional-400 hover:text-danger hover:bg-danger/5 rounded-full transition-all"><Trash2 size={14} /></button>}
                        </div>
                    )}
                    
                    <div className="relative">
                        <div 
                            onClick={() => isMobile && setShowActions(!showActions)}
                            className={`px-4 py-2.5 text-[15px] md:text-[16px] font-normal leading-relaxed transition-all cursor-pointer md:cursor-default ${isMe ? `bg-primary text-white rounded-[20px] ${isRTL ? 'rounded-bl-none' : 'rounded-br-none'}` : `bg-institutional-50 dark:bg-institutional-900 text-institutional-900 dark:text-white rounded-[20px] ${isRTL ? 'rounded-br-none' : 'rounded-bl-none'}`}`}
                        >
                            {message.isPinned && <Pin size={12} className="absolute -top-2 -right-2 text-white bg-primary rounded-full p-1 border-2 border-surface shadow-sm" />}
                            <p className="whitespace-pre-wrap break-words text-start">{message.text}</p>
                        </div>

                        {/* Actions popover for mobile */}
                        {showActions && isMobile && (
                            <div className={`absolute bottom-full mb-2 z-40 bg-surface/95 backdrop-blur-md border border-institutional-200 dark:border-institutional-800 rounded-2xl p-1.5 shadow-strong flex gap-1 animate-in zoom-in-95 duration-200 ${isMe ? 'right-0' : 'left-0'}`}>
                                {isMe && (
                                    <button onClick={() => { onEdit(message); setShowActions(false); }} className="w-8 h-8 flex items-center justify-center text-institutional-600 dark:text-institutional-300 hover:bg-institutional-100 dark:hover:bg-institutional-800 rounded-xl transition-colors">
                                        <Edit2 size={16} />
                                    </button>
                                )}
                                <button onClick={() => { onPin(message.id, !!message.isPinned); setShowActions(false); }} className="w-8 h-8 flex items-center justify-center text-institutional-600 dark:text-institutional-300 hover:bg-institutional-100 dark:hover:bg-institutional-800 rounded-xl transition-colors">
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
                    <div className={`text-[11px] font-medium text-institutional-400 mt-1 flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {message.editedAt && <span>{language === 'ar' ? 'معدل' : language === 'fr' ? 'modifié' : 'edited'}</span>}
                        {message.timestamp?.seconds ? new Date(message.timestamp.seconds * 1000).toLocaleTimeString(language, {hour: '2-digit', minute:'2-digit'}) : '...'}
                        {isMe && !isGroupChat && (
                            <div className="flex items-center">
                                {message.seen ? (
                                    <CheckCheck size={14} className="text-primary" />
                                ) : (
                                    <Check size={14} className="opacity-50" />
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
            // Keep all non-deleted users except self and economic for the broad users state
            // Filtering for DMs will happen in the filteredSidebar memo
            const activeUsers = allUsers.filter(u => u.status !== 'deleted' && u.id !== user?.id && u.role !== 'economic');
            setUsers(activeUsers);
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

    const deleteChannel = async () => {
        if (!activeTarget || activeTarget.type !== 'group' || user?.role !== 'teacher') return;
        
        if (window.confirm(t('inbox.deleteChannelConfirm') || 'Are you sure you want to delete this broadcast channel? This will kick all participants and delete all messages.')) {
            try {
                await deleteDoc(doc(db, collections.groups, activeTarget.id));
                setActiveTarget(null);
                setShowConversation(false);
            } catch (e) {
                alert(t('common.error'));
            }
        }
    };

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
                type: 'broadcast',
                isBroadcast: true
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
        
        // DM Visibility Rules:
        // 1. Students: Cannot DM anyone
        // 2. Teachers: Can DM other Teachers (Isolated from Students, Admins, and Economic)
        // 3. Admins/Economic: Cannot DM anyone
        const dmUsers = users.filter(u => {
            if (!user) return false;
            
            if (user.role === 'teacher') {
                return u.role === 'teacher';
            }
            
            return false;
        });

        const filteredUsers = dmUsers.filter(u => u.name.toLowerCase().includes(term));
        const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(term));
        return { users: filteredUsers, groups: filteredGroups };
    }, [users, groups, searchTerm, user]);

    const pinnedMessages = useMemo(() => messages.filter(m => m.isPinned), [messages]);

    const selectTarget = (t: ChatTarget) => {
        const group = groups.find(g => g.id === t.id);
        setActiveTarget({ ...t, isBroadcast: group?.isBroadcast });
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
        <div className="flex h-screen overflow-hidden bg-surface dark:bg-institutional-950">
            
            {/* Sidebar View */}
            <div className={`${showConversation ? 'hidden lg:flex' : 'flex'} w-full lg:w-[380px] flex-col border-r border-institutional-100 dark:border-institutional-900 shrink-0 transition-all`}>
                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-bold text-institutional-900 dark:text-white">{t('nav.inbox')}</h3>
                        {user?.role === 'teacher' && (
                            <button onClick={() => setIsCreateGroupOpen(true)} className="p-2 text-institutional-900 dark:text-white hover:bg-institutional-100 dark:hover:bg-institutional-900 rounded-full transition-all">
                                <Plus size={24} />
                            </button>
                        )}
                    </div>
                    <div className="relative group">
                        <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-institutional-400`} size={18} />
                        <input 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder={t('inbox.searchPlaceholder')}
                            className={`w-full bg-institutional-50 dark:bg-institutional-900 rounded-xl ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all text-institutional-900 dark:text-white`}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scroll-hide">
                    {/* Groups Section */}
                    {filteredSidebar.groups.length > 0 && (
                        <div className="mb-4">
                            <p className="text-[11px] font-bold uppercase text-institutional-400 px-6 mb-2">{t('inbox.broadcastChannels') || 'Broadcast Channels'}</p>
                            <div className="space-y-0.5">
                                {filteredSidebar.groups.map(g => (
                                    <button 
                                        key={g.id}
                                        onClick={() => selectTarget({ type: 'group', id: g.id, name: g.name, participantIds: g.participantIds })}
                                        className={`w-full px-6 py-4 flex items-center gap-4 transition-all ${activeTarget?.id === g.id ? 'bg-institutional-50 dark:bg-institutional-900' : 'hover:bg-institutional-50/50 dark:hover:bg-institutional-900/50'}`}
                                    >
                                        <div className="w-14 h-14 rounded-full flex items-center justify-center bg-primary/10 text-primary shrink-0">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div className="text-start flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <p className="text-[16px] font-semibold text-institutional-900 dark:text-white truncate">{g.name}</p>
                                                {g.isBroadcast && (
                                                    <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">Live</span>
                                                )}
                                            </div>
                                            <p className="text-[13px] text-institutional-400 truncate font-medium">{g.participantIds?.length || 0} {t('inbox.participants')}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DMs Section */}
                    {filteredSidebar.users.length > 0 && (
                        <div>
                            <p className="text-[11px] font-bold uppercase text-institutional-400 px-6 mb-2">{t('inbox.dms')}</p>
                            <div className="space-y-0.5">
                                {filteredSidebar.users.map(u => {
                                    const chatId = [user?.id, u.id].sort().join('_');
                                    const unread = unreadCounts[chatId] || 0;
                                    const { isOnline } = getPresenceStatus(u);
                                    return (
                                        <button 
                                            key={u.id}
                                            onClick={() => selectTarget({ type: 'dm', id: u.id, name: u.name, role: u.role, lastSeen: u.lastSeen })}
                                            className={`w-full px-6 py-4 flex items-center gap-4 transition-all ${activeTarget?.id === u.id ? 'bg-institutional-50 dark:bg-institutional-900' : 'hover:bg-institutional-50/50 dark:hover:bg-institutional-900/50'}`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-institutional-100 dark:bg-institutional-800 text-institutional-900 dark:text-white font-bold text-lg">
                                                    {u.name.charAt(0)}
                                                </div>
                                                {isOnline && (
                                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-surface" />
                                                )}
                                            </div>
                                            <div className="text-start flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <p className={`text-[16px] font-semibold truncate ${unread > 0 ? 'text-institutional-900 dark:text-white' : 'text-institutional-700 dark:text-institutional-200'}`}>{u.name}</p>
                                                    {unread > 0 && (
                                                        <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                                                    )}
                                                </div>
                                                <p className="text-[13px] text-institutional-400 truncate uppercase tracking-wider font-medium">{u.role}</p>
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
            <div className={`${!showConversation ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-surface dark:bg-institutional-950 transition-all relative overflow-hidden`}>
                {activeTarget ? (
                    <>
                        {/* Conversation Header */}
                        <div className="px-6 py-4 border-b border-institutional-100 dark:border-institutional-900 flex items-center justify-between bg-surface/80 dark:bg-institutional-950/80 backdrop-blur-md sticky top-0 z-30">
                            <div className="flex items-center gap-4 min-w-0">
                                <button onClick={() => setShowConversation(false)} className="lg:hidden p-2 -ml-2 text-institutional-900 dark:text-white hover:bg-institutional-100 dark:hover:bg-institutional-900 rounded-full transition-all">
                                    <ChevronLeft size={24} className={isRTL ? 'rotate-180' : ''} />
                                </button>
                                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-institutional-100 dark:bg-institutional-800 text-institutional-900 dark:text-white font-bold shrink-0 text-lg">
                                    {activeTarget.type === 'dm' ? activeTarget.name.charAt(0) : <ShieldCheck size={24} />}
                                </div>
                                <div className="text-start min-w-0">
                                    <h4 className="font-bold text-[17px] text-institutional-900 dark:text-white truncate flex items-center gap-2">
                                        {activeTarget.name}
                                        {activeTarget.type === 'dm' && activeTarget.role === 'teacher' && <UserCheck size={16} className="text-primary" />}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                        {remoteTyping ? (
                                            <span className="text-[12px] text-primary animate-pulse font-medium">{t('inbox.typing')}...</span>
                                        ) : (
                                            <span className={`text-[12px] font-medium ${activeTarget.type === 'dm' && getPresenceStatus(activeTarget as any).isOnline ? 'text-emerald-500' : 'text-institutional-400'}`}>
                                                {activeTarget.type === 'dm' ? (
                                                    getPresenceStatus(activeTarget as any).isOnline 
                                                        ? t('common.online') 
                                                        : `${t('common.lastSeen')} ${getPresenceStatus(activeTarget as any).lastSeenStr}`
                                                ) : `${activeTarget.participantIds?.length || 0} ${t('inbox.participants')}`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {activeTarget.type === 'group' && user?.role === 'teacher' && (
                                    <button 
                                        onClick={deleteChannel}
                                        className="p-2 text-institutional-400 hover:text-danger transition-all"
                                        title={t('inbox.deleteChannel') || 'Delete Channel'}
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                                <button className="p-2 text-institutional-400 hover:text-primary transition-all"><Info size={20} /></button>
                                <button className="p-2 text-institutional-400 hover:text-primary transition-all"><MoreVertical size={20} /></button>
                            </div>
                        </div>

                        {/* Pinned Messages */}
                        {pinnedMessages.length > 0 && (
                            <div className="bg-institutional-50/50 dark:bg-institutional-900/50 border-b border-institutional-100 dark:border-institutional-900 p-2 flex gap-2 overflow-x-auto scroll-hide">
                                {pinnedMessages.map(pm => (
                                    <div key={pm.id} className="bg-surface dark:bg-institutional-800 p-2 px-3 rounded-full border border-institutional-100 dark:border-institutional-700 shadow-sm flex items-center gap-2 min-w-[150px] max-w-[250px] shrink-0 group">
                                        <Pin size={12} className="text-primary shrink-0" />
                                        <p className="text-[12px] text-institutional-700 dark:text-institutional-200 truncate">{pm.text}</p>
                                        <button onClick={() => handlePin(pm.id, true)} className="ml-auto p-0.5 text-institutional-300 hover:text-danger opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Chat Feed */}
                        <div 
                            ref={scrollRef} 
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scroll-smooth relative"
                        >
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
                                    <ShieldCheck size={80} strokeWidth={1} className="text-institutional-300" />
                                    <p className="mt-4 text-sm font-medium text-institutional-400 uppercase tracking-widest">{t('inbox.protocolInitiated')}</p>
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
                                <div className="flex w-full justify-start mt-2">
                                    <div className="bg-institutional-50 dark:bg-institutional-900 p-2 px-4 rounded-2xl rounded-bl-none flex items-center gap-1">
                                        <span className="w-1 h-1 bg-institutional-400 rounded-full animate-bounce"></span>
                                        <span className="w-1 h-1 bg-institutional-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                        <span className="w-1 h-1 bg-institutional-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                    </div>
                                </div>
                            )}

                            {isScrollingUp && (
                                <button 
                                    onClick={scrollToBottom}
                                    className="fixed bottom-24 right-8 p-2 bg-surface dark:bg-institutional-800 border border-institutional-100 dark:border-institutional-700 rounded-full shadow-lg text-primary animate-in zoom-in-90 duration-300 z-40"
                                >
                                    <ArrowDown size={18} />
                                </button>
                            )}
                        </div>

                        {/* Input & Control Area */}
                        <div className="p-4 border-t border-institutional-100 dark:border-institutional-900">
                            {editingMessage && (
                                <div className="mb-3 p-3 bg-primary/5 rounded-xl flex items-center justify-between border border-primary/10">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-2 bg-primary text-white rounded-lg"><Edit2 size={16} /></div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-primary uppercase tracking-wider">{t('inbox.editMessage')}</p>
                                            <p className="text-sm text-institutional-600 dark:text-institutional-300 truncate">{editingMessage.text}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setEditingMessage(null); setInputText(''); }} className="p-1 text-institutional-400 hover:text-danger"><X size={18} /></button>
                                </div>
                            )}
                            
                            {(activeTarget.type === 'group' && activeTarget.isBroadcast && user?.role === 'student') ? (
                                <div className="flex items-center justify-center p-4 bg-institutional-50 dark:bg-institutional-900/50 rounded-xl border border-dashed border-institutional-200 dark:border-institutional-800">
                                    <p className="text-sm text-institutional-400 flex items-center gap-2">
                                        <ShieldAlert size={16} />
                                        {t('inbox.broadcastOnly') || 'Only teachers can send messages here.'}
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleSend} className="flex gap-2 items-center max-w-4xl mx-auto">
                                    <button type="button" className="p-2 text-institutional-400 hover:text-primary transition-all"><Paperclip size={22} /></button>
                                    <div className="flex-1 relative flex items-center">
                                        <input 
                                            value={inputText || (editingMessage?.text || '')}
                                            onChange={handleInputChange}
                                            placeholder={t('inbox.secureTrans')}
                                            className="w-full bg-institutional-50 dark:bg-institutional-900 border border-institutional-200 dark:border-institutional-800 focus:border-primary/50 p-2.5 px-4 rounded-full text-[15px] outline-none transition-all text-institutional-900 dark:text-white"
                                        />
                                        <button type="button" className={`absolute ${isRTL ? 'left-3' : 'right-3'} p-1.5 text-institutional-400 hover:text-primary transition-all`}>
                                            <Smile size={20} />
                                        </button>
                                    </div>
                                    <button 
                                        type="submit" 
                                        disabled={(!inputText.trim() && !editingMessage)} 
                                        className="p-2.5 bg-primary text-white rounded-full shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none hover:bg-primary-hover"
                                    >
                                        <Send size={20} className={isRTL ? 'rotate-180' : ''} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-50">
                        <div className="w-20 h-20 bg-institutional-50 dark:bg-institutional-900 rounded-full flex items-center justify-center mb-4">
                            <MessageSquare size={40} className="text-institutional-300" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-xl font-bold text-institutional-900 dark:text-white mb-2">{t('inbox.terminalSession')}</h3>
                        <p className="text-sm text-institutional-400 max-w-xs">{t('inbox.chooseContact')}</p>
                    </div>
                )}
            </div>

            {/* Modal: Create Collaborative Group */}
            {isCreateGroupOpen && (
                <div className="fixed inset-0 z-[500] bg-institutional-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-surface dark:bg-institutional-900 rounded-2xl shadow-strong max-w-md w-full p-6 relative border border-institutional-200 dark:border-institutional-800 animate-in zoom-in-95 duration-200">
                        <button onClick={() => setIsCreateGroupOpen(false)} className={`absolute top-6 ${isRTL ? 'left-6' : 'right-6'} p-2 text-institutional-400 hover:text-danger transition-colors`}><X size={20} /></button>
                        <div className="text-start mb-6">
                            <h3 className="text-xl font-bold text-institutional-900 dark:text-white">{t('inbox.createBroadcast') || 'Create Broadcast Channel'}</h3>
                            <p className="text-xs text-institutional-400 mt-1">Select participants for the new channel.</p>
                        </div>
                        <form onSubmit={createGroup} className="space-y-6 text-start">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-institutional-500 tracking-wider px-1">{t('inbox.channelName') || 'Channel Name'}</label>
                                <div className="relative group">
                                    <Hash className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-institutional-400`} size={16} />
                                    <input name="groupName" placeholder="Announcements..." className={`w-full bg-institutional-50 dark:bg-institutional-800 p-2.5 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} rounded-xl border border-institutional-200 dark:border-institutional-700 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-institutional-900 dark:text-white`} required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase text-institutional-500 tracking-wider px-1">{t('inbox.participants')}</label>
                                <div className="max-h-[300px] overflow-y-auto p-1 bg-institutional-50 dark:bg-institutional-800 border border-institutional-200 dark:border-institutional-700 rounded-xl space-y-0.5 scroll-hide">
                                    {users.map(u => (
                                        <label key={u.id} className="flex items-center gap-3 p-3 hover:bg-surface dark:hover:bg-institutional-900 rounded-lg cursor-pointer transition-all group">
                                            <input type="checkbox" name="participants" value={u.id} className="w-4 h-4 rounded border-institutional-300 text-primary focus:ring-primary/20 transition-all cursor-pointer" />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-institutional-800 dark:text-institutional-100 group-hover:text-primary transition-colors">{u.name}</p>
                                                <p className="text-[10px] uppercase text-institutional-400 tracking-wider">{u.role}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest shadow-md active:scale-[0.98] transition-all hover:bg-primary-hover">
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