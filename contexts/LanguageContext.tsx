import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppLanguage } from '../types';
import { translations } from '../translations';
import { useAuth } from './AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, collections } from '../services/firebase';

interface LanguageContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (path: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('edu_alg_lang') as AppLanguage;
    if (savedLang) {
      setLanguageState(savedLang);
    } else if (user?.language) {
      setLanguageState(user.language);
    }
  }, [user?.language]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    localStorage.setItem('edu_alg_lang', language);
  }, [language]);

  const setLanguage = async (lang: AppLanguage) => {
    setLanguageState(lang);
    if (user?.id) {
      try {
        await updateDoc(doc(db, collections.users, user.id), { language: lang });
      } catch (e) {
        console.error("Failed to sync language preference", e);
      }
    }
  };

  const t = (path: string): string => {
    const keys = path.split('.');
    let result: any = translations[language];
    for (const key of keys) {
      if (result && result[key]) {
        result = result[key];
      } else {
        // Fallback to English if translation missing
        let fallback: any = translations['en'];
        for (const fKey of keys) {
          if (fallback && fallback[fKey]) {
            fallback = fallback[fKey];
          } else {
            return path;
          }
        }
        return fallback;
      }
    }
    return typeof result === 'string' ? result : path;
  };

  const isRTL = language === 'ar';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};