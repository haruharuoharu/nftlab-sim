"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { isLocale, LOCALE_KEY, translate, type Locale } from '@/lib/i18n';

const LanguageContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: 'ja', setLocale: () => {} });

export default function LanguageProvider({ children }: { children: ReactNode }) {
  // Keep the server and first client render identical, then read preferences.
  const [locale, updateLocale] = useState<Locale>('ja');
  useEffect(() => {
    const read = () => {
      const requested = new URL(window.location.href).searchParams.get('lang');
      if (isLocale(requested)) { updateLocale(requested); return; }
      try { const saved = localStorage.getItem(LOCALE_KEY); updateLocale(isLocale(saved) ? saved : 'ja'); }
      catch { updateLocale('ja'); }
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.querySelector('meta[name="description"]')?.setAttribute('content', translate(locale, 'NFTをクイズと実践で学ぶサンドボックス。'));
  }, [locale]);
  function setLocale(next: Locale) {
    updateLocale(next);
    try { localStorage.setItem(LOCALE_KEY, next); } catch { /* Switching still works without storage. */ }
    const url = new URL(window.location.href);
    url.searchParams.set('lang', next);
    window.history.replaceState(window.history.state, '', url);
  }
  return <LanguageContext.Provider value={{ locale, setLocale }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const { locale, setLocale } = useContext(LanguageContext);
  return { locale, setLocale, t: (source: string) => translate(locale, source) };
}
