/**
 * Locale context: en/ur toggle persisted in AsyncStorage.
 * Wraps the shared `t()` / `isRtl()` helpers from @gharfix/shared.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { t as translate, isRtl, type Locale, type StringKey } from '@gharfix/shared';

const STORAGE_KEY = 'gharfix_locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: StringKey) => string;
  rtl: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => translate('en', key),
  rtl: false,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'ur' || v === 'en') setLocaleState(v);
    });
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
    // Apply RTL layout direction for Urdu
    try {
      if (isRtl(l) !== I18nManager.isRTL) {
        I18nManager.forceRTL(isRtl(l));
      }
    } catch {
      /* best-effort only */
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: (key) => translate(locale, key), rtl: isRtl(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
