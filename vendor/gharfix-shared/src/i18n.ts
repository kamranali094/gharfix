/**
 * Minimal i18n scaffold: English + Urdu (RTL) UI copy.
 * Usage: t('en', 'bookNow') / t('ur', 'bookNow'). Extend per screen.
 */
import type { Locale } from './constants';

const STRINGS = {
  en: {
    appName: 'GharFix',
    tagline: 'Ghar Ka Har Kaam, Ab Asaan.',
    bookNow: 'Book Now',
    searchServices: 'Search services…',
    myBookings: 'My Bookings',
    favorites: 'Favorites',
    profile: 'Profile',
    cancel: 'Cancel',
    confirm: 'Confirm',
    retry: 'Retry',
    total: 'Total',
  },
  ur: {
    appName: 'گھر فکس',
    tagline: 'گھر کا ہر کام، اب آسان۔',
    bookNow: 'ابھی بک کریں',
    searchServices: 'خدمات تلاش کریں…',
    myBookings: 'میری بکنگز',
    favorites: 'پسندیدہ',
    profile: 'پروفائل',
    cancel: 'منسوخ کریں',
    confirm: 'تصدیق کریں',
    retry: 'دوبارہ کوشش کریں',
    total: 'کل رقم',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['en'];

export function t(locale: Locale, key: StringKey): string {
  return STRINGS[locale][key] ?? STRINGS.en[key] ?? key;
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ur';
}
