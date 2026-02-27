import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, collections } from '../services/firebase';
import { User } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  User as UserIcon, 
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
  Camera,
  DollarSign
} from 'lucide-react';

const Profile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);

  const isOwnProfile = currentUser?.id === id;
  const isAdmin = currentUser?.role === 'admin';
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

    fetchProfile();
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
        subjectsTaught: editData.subjectsTaught,
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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-institutional-100 dark:bg-institutional-800 text-institutional-500 hover:text-primary transition-colors"
          >
            <ChevronLeft size={20} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase text-institutional-950 dark:text-white">
            {t('profile.title')}
          </h1>
        </div>
        
        {isOwnProfile && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            <Edit3 size={18} />
            <span className="hidden sm:inline">{t('profile.editProfile')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-surface border-2 border-institutional-200 dark:border-institutional-800 rounded-3xl p-6 text-center shadow-sm">
            <div className="relative inline-block mb-4">
              <div className="w-32 h-32 rounded-full bg-institutional-100 dark:bg-institutional-800 flex items-center justify-center border-4 border-white dark:border-institutional-900 shadow-xl overflow-hidden">
                {profileUser.avatar ? (
                  <img src={profileUser.avatar} alt={profileUser.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black text-institutional-400">
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
                  className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-white rounded-full border-4 border-white dark:border-institutional-900 flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Camera size={18} />
                </button>
              )}
            </div>
            
            <h2 className="text-xl font-black text-institutional-950 dark:text-white mb-1">
              {profileUser.name}
            </h2>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-institutional-100 dark:bg-institutional-800 text-institutional-500 text-xs font-black uppercase tracking-widest mb-4">
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
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-institutional-400 mb-2">
              {t('profile.platformMetadata')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-institutional-800 flex items-center justify-center text-primary shadow-sm">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-institutional-400 leading-none mb-1">{t('profile.memberSince')}</p>
                  <p className="text-sm font-bold text-institutional-700 dark:text-institutional-300">{formatDate(profileUser.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-institutional-800 flex items-center justify-center text-primary shadow-sm">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-institutional-400 leading-none mb-1">{t('profile.timeOnPlatform')}</p>
                  <p className="text-sm font-bold text-institutional-700 dark:text-institutional-300">{calculateDuration(profileUser.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details & Edit Form */}
        <div className="md:col-span-2 space-y-6">
          {/* Academic Information */}
          <div className="bg-surface border-2 border-institutional-200 dark:border-institutional-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <h3 className="text-lg font-black text-institutional-950 dark:text-white uppercase tracking-tight">
                {t('profile.academicInfo')}
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {profileUser.role === 'student' && !isEconomic && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-institutional-400 mb-2">
                    {t('profile.fieldOfStudy')}
                  </label>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editData.fieldOfStudy || ''}
                      onChange={(e) => setEditData({ ...editData, fieldOfStudy: e.target.value })}
                      placeholder={t('profile.fieldPlaceholder')}
                      className="w-full bg-institutional-100 dark:bg-institutional-800 p-4 rounded-xl border-2 border-institutional-200 dark:border-institutional-700 font-bold focus:border-primary outline-none transition-all"
                    />
                  ) : (
                    <p className="text-institutional-700 dark:text-institutional-300 font-bold text-lg">
                      {profileUser.fieldOfStudy || '---'}
                    </p>
                  )}
                </div>
              )}

              {profileUser.role === 'teacher' && !isEconomic && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-institutional-400 mb-2">
                    {t('profile.subjectsTaught')}
                  </label>
                  {isEditing ? (
                    <input 
                      type="text"
                      value={editData.subjectsTaught || ''}
                      onChange={(e) => setEditData({ ...editData, subjectsTaught: e.target.value })}
                      placeholder={t('profile.subjectsPlaceholder')}
                      className="w-full bg-institutional-100 dark:bg-institutional-800 p-4 rounded-xl border-2 border-institutional-200 dark:border-institutional-700 font-bold focus:border-primary outline-none transition-all"
                    />
                  ) : (
                    <p className="text-institutional-700 dark:text-institutional-300 font-bold text-lg">
                      {profileUser.subjectsTaught || '---'}
                    </p>
                  )}
                </div>
              )}

              {(profileUser.role === 'admin' || isEconomic) && (
                <div className="p-4 bg-institutional-50 dark:bg-institutional-900/50 rounded-2xl border border-dashed border-institutional-200 dark:border-institutional-800">
                  <p className="text-institutional-400 text-sm italic">
                    {isEconomic && !isOwnProfile ? "Financial oversight role: Academic data restricted." : "Administrative accounts do not display public academic data."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-surface border-2 border-institutional-200 dark:border-institutional-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-institutional-100 dark:bg-institutional-800 text-institutional-600 dark:text-institutional-300 flex items-center justify-center">
                <Briefcase size={20} />
              </div>
              <h3 className="text-lg font-black text-institutional-950 dark:text-white uppercase tracking-tight">
                {t('profile.personalInfo')}
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-institutional-400 mb-2">
                  {t('profile.age')}
                </label>
                {isEditing ? (
                  <input 
                    type="number"
                    value={editData.age || ''}
                    onChange={(e) => setEditData({ ...editData, age: parseInt(e.target.value) || 0 })}
                    className="w-32 bg-institutional-100 dark:bg-institutional-800 p-4 rounded-xl border-2 border-institutional-200 dark:border-institutional-700 font-bold focus:border-primary outline-none transition-all"
                  />
                ) : (
                  <p className="text-institutional-700 dark:text-institutional-300 font-bold text-lg">
                    {profileUser.age ? `${profileUser.age} ${t('profile.years')}` : '---'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-institutional-400 mb-2">
                  {t('profile.bio')}
                </label>
                {isEditing ? (
                  <textarea 
                    value={editData.bio || ''}
                    onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                    placeholder={t('profile.bioPlaceholder')}
                    rows={4}
                    className="w-full bg-institutional-100 dark:bg-institutional-800 p-4 rounded-xl border-2 border-institutional-200 dark:border-institutional-700 font-bold focus:border-primary outline-none transition-all resize-none"
                  />
                ) : (
                  <p className="text-institutional-600 dark:text-institutional-400 leading-relaxed">
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
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-primary-hover transition-all disabled:opacity-50 shadow-lg shadow-primary/20 backdrop-blur-sm"
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
                className="px-6 py-4 bg-institutional-100 dark:bg-institutional-800 text-institutional-600 dark:text-institutional-300 rounded-2xl font-black uppercase tracking-widest hover:bg-institutional-200 dark:hover:bg-institutional-700 transition-all"
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
