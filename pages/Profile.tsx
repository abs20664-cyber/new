import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Subject } from '../types';
import { db, collections } from '../services/firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Edit3, 
  Save, 
  X, 
  BookOpen, 
  Briefcase, 
  UserCircle,
  ChevronLeft,
  Camera
} from 'lucide-react';

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);

  const isOwnProfile = currentUser?.id === id;
  const isEconomic = currentUser?.role === 'economic';
  const isRTL = language === 'ar';

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, collections.users, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as User;
          setProfileUser({ ...data, id: docSnap.id });
          setEditData(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubSubjects = onSnapshot(collection(db, collections.subjects), (snap) => {
        const fetchedSubjects = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Subject));
        setSubjects(fetchedSubjects);
    });

    fetchProfile();
    return () => unsubSubjects();
  }, [id]);

  const handleSave = async () => {
    if (!id || !isOwnProfile) return;
    setSaving(true);
    try {
      const docRef = doc(db, collections.users, id);
      
      // Only save non-credential profile fields
      const profileUpdates = {
        avatar: editData.avatar,
        fieldOfStudy: editData.fieldOfStudy,
        subjectsTaughtIds: editData.subjectsTaughtIds,
        age: editData.age,
        bio: editData.bio
      };

      await updateDoc(docRef, profileUpdates);
      setProfileUser(prev => prev ? { ...prev, ...profileUpdates } : null);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const calculateDuration = (timestamp: any) => {
    if (!timestamp) return t('common.justNow');
    const date = timestamp.toDate ? timestamp.toDate() : new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
      const remainingMonths = diffMonths % 12;
      return `${diffYears} ${t('profile.years')}${remainingMonths > 0 ? `, ${remainingMonths} ${t('profile.months')}` : ''}`;
    }
    if (diffMonths > 0) {
      const remainingDays = diffDays % 30;
      return `${diffMonths} ${t('profile.months')}${remainingDays > 0 ? `, ${remainingDays} ${t('profile.days')}` : ''}`;
    }
    return `${diffDays} ${t('profile.days')}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '---';
    const date = timestamp.toDate ? timestamp.toDate() : new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <UserCircle size={64} className="text-institutional-300" />
        <p className="text-institutional-500 font-bold uppercase tracking-widest">User Not Found</p>
        <button onClick={() => navigate(-1)} className="text-primary font-bold flex items-center gap-2">
          <ChevronLeft size={16} /> {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-6 border-b-4 border-border-dark">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface border-2 border-border-dark text-text-secondary hover:text-primary hover:-translate-y-1 shadow-pop-sm hover:shadow-none transition-all"
          >
            <ChevronLeft size={24} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tighter uppercase text-text">
            {t('profile.title')}
          </h1>
        </div>
        
        {isOwnProfile && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="academic-button academic-button-primary px-6 py-3"
          >
            <Edit3 size={18} />
            <span className="hidden sm:inline">{t('profile.editProfile')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-8">
          <div className="bg-surface rounded-3xl border-4 border-border-dark shadow-pop p-8 text-center">
            <div className="relative inline-block mb-6">
              <div className="w-32 h-32 rounded-3xl bg-muted flex items-center justify-center border-4 border-border-dark shadow-pop-sm overflow-hidden rotate-3 hover:rotate-0 transition-transform duration-300">
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl font-display font-bold text-text-secondary/50">
                    {profileUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </span>
                )}
              </div>
              {isEditing && (
                <button 
                  onClick={() => {
                    const url = prompt('Enter image URL:', editData.avatar || '');
                    if (url !== null) setEditData({ ...editData, avatar: url });
                  }}
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-primary text-white rounded-2xl border-4 border-border-dark shadow-pop-sm flex items-center justify-center hover:-translate-y-1 hover:shadow-none transition-all"
                >
                  <Camera size={20} />
                </button>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-institutional-950 dark:text-white mb-1">
              {profileUser.name}
            </h2>
            <div className="academic-badge academic-badge-primary mb-4">
              <Shield size={12} />
              {t(`roles.${profileUser.role}`)}
            </div>

            <div className="space-y-3 text-left" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="flex items-center gap-3 text-institutional-500 dark:text-institutional-400 text-sm">
                <Mail size={16} className="shrink-0" />
                <span className="truncate">{profileUser.email}</span>
              </div>
              <div className="flex items-center gap-3 text-institutional-500 dark:text-institutional-400 text-sm">
                <Clock size={16} className="shrink-0" />
                <span>{profileUser.id}</span>
              </div>
            </div>
          </div>

          {/* Platform Metadata */}
          <div className="bg-institutional-50 dark:bg-institutional-950/50 border-2 border-institutional-100 dark:border-institutional-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-institutional-400 mb-2">
              {t('profile.platformMetadata')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-institutional-800 flex items-center justify-center text-primary shadow-sm">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-institutional-400 leading-none mb-1">{t('profile.memberSince')}</p>
                  <p className="text-sm font-bold text-institutional-700 dark:text-institutional-300">{formatDate(profileUser.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-institutional-800 flex items-center justify-center text-primary shadow-sm">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-institutional-400 leading-none mb-1">{t('profile.timeOnPlatform')}</p>
                  <p className="text-sm font-bold text-institutional-700 dark:text-institutional-300">{calculateDuration(profileUser.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Edit Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Academic Information */}
          <div className="bg-surface rounded-3xl border-4 border-border-dark shadow-pop p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border-4 border-border-dark">
                <BookOpen size={24} />
              </div>
              <h3 className="text-2xl font-display font-bold text-text uppercase tracking-tighter">
                {t('profile.academicInfo')}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {profileUser.role === 'student' && !isEconomic && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">
                    {t('profile.fieldOfStudy')}
                  </label>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editData.fieldOfStudy || ''}
                      onChange={(e) => setEditData({ ...editData, fieldOfStudy: e.target.value })}
                      placeholder={t('profile.fieldPlaceholder')}
                      className="w-full rounded-2xl border-4 border-border-dark bg-surface p-4 text-text focus:border-primary focus:outline-none transition-all"
                    />
                  ) : (
                    <p className="text-text font-bold text-lg">
                      {profileUser.fieldOfStudy || '---'}
                    </p>
                  )}
                </div>
              )}

              {profileUser.role === 'teacher' && !isEconomic && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">
                    {t('profile.subjects')}
                  </label>
                  {isEditing ? (
                    <div className="w-full rounded-2xl border-4 border-border-dark bg-surface p-4 text-text max-h-40 overflow-y-auto">
                        {subjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2">
                                <input type="checkbox" checked={editData.subjectsTaughtIds?.includes(s.id)} onChange={(e) => {
                                    const newSubjects = e.target.checked 
                                        ? [...(editData.subjectsTaughtIds || []), s.id]
                                        : (editData.subjectsTaughtIds || []).filter(id => id !== s.id);
                                    setEditData({ ...editData, subjectsTaughtIds: newSubjects });
                                }} />
                                {s.name}
                            </label>
                        ))}
                    </div>
                  ) : (
                    <p className="text-text font-bold text-lg">
                      {profileUser.subjectsTaughtIds?.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', ') || '---'}
                    </p>
                  )}
                </div>
              )}

              {(profileUser.role === 'admin' || isEconomic) && (
                <div className="p-4 bg-muted rounded-2xl border-4 border-dashed border-border-dark">
                  <p className="text-text-secondary text-sm italic">
                    {isEconomic && !isOwnProfile ? "Financial oversight role: Academic data restricted." : "Administrative accounts do not display public academic data."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-surface rounded-3xl border-4 border-border-dark shadow-pop p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-muted text-text flex items-center justify-center border-4 border-border-dark">
                <Briefcase size={24} />
              </div>
              <h3 className="text-2xl font-display font-bold text-text uppercase tracking-tighter">
                {t('profile.personalInfo')}
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">
                  {t('profile.age')}
                </label>
                {isEditing ? (
                  <input 
                    type="number"
                    value={editData.age || ''}
                    onChange={(e) => setEditData({ ...editData, age: parseInt(e.target.value) || 0 })}
                    className="w-32 rounded-2xl border-4 border-border-dark bg-surface p-4 text-text focus:border-primary focus:outline-none transition-all"
                  />
                ) : (
                  <p className="text-text font-bold text-lg">
                    {profileUser.age ? `${profileUser.age} ${t('profile.years')}` : '---'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">
                  {t('profile.bio')}
                </label>
                {isEditing ? (
                  <textarea 
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    placeholder={t('profile.bioPlaceholder')}
                    rows={4}
                    className="w-full rounded-2xl border-4 border-border-dark bg-surface p-4 text-text focus:border-primary focus:outline-none transition-all resize-none"
                  />
                ) : (
                  <p className="text-text-secondary leading-relaxed">
                    {profileUser.bio || '---'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons for Editing */}
          {isEditing && (
            <div className="sticky bottom-4 md:static flex items-center gap-4 pt-4 z-50">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl border-4 border-border-dark bg-primary px-6 py-4 font-bold text-white shadow-pop hover:-translate-y-1 hover:shadow-none transition-all flex-1"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save size={20} />
                    {t('profile.saveChanges')}
                  </>
                )}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditData(profileUser);
                }}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-2xl border-4 border-border-dark bg-surface px-6 py-4 font-bold text-text hover:-translate-y-1 hover:shadow-none transition-all"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
