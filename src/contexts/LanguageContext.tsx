import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppLanguage } from '../types';
import { getTranslation } from '../localization/translations';
import { useAuth } from './AuthContext';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: ReturnType<typeof getTranslation>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { userDoc, updateUserProfile } = useAuth();
  const [language, setLocalLanguage] = useState<AppLanguage>('en');

  useEffect(() => {
    if (userDoc?.preferredLanguage && (userDoc.preferredLanguage === 'en' || userDoc.preferredLanguage === 'ta')) {
      setLocalLanguage(userDoc.preferredLanguage);
    }
  }, [userDoc?.preferredLanguage]);

  const setLanguage = async (lang: AppLanguage) => {
    setLocalLanguage(lang);
    document.documentElement.lang = lang;
    if (userDoc && userDoc.preferredLanguage !== lang) {
      try {
        await updateUserProfile({ preferredLanguage: lang });
      } catch {
        // Keep UI switched even if offline; sync will resume
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: getTranslation(language) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
