/**
 * Minimal i18n scaffold: English + Urdu (RTL) UI copy.
 * Usage: t('en', 'bookNow') / t('ur', 'bookNow'). Extend per screen.
 */
import type { Locale } from './constants';
declare const STRINGS: {
    readonly en: {
        readonly appName: "GharFix";
        readonly tagline: "Ghar Ka Har Kaam, Ab Asaan.";
        readonly bookNow: "Book Now";
        readonly searchServices: "Search services…";
        readonly myBookings: "My Bookings";
        readonly favorites: "Favorites";
        readonly profile: "Profile";
        readonly cancel: "Cancel";
        readonly confirm: "Confirm";
        readonly retry: "Retry";
        readonly total: "Total";
    };
    readonly ur: {
        readonly appName: "گھر فکس";
        readonly tagline: "گھر کا ہر کام، اب آسان۔";
        readonly bookNow: "ابھی بک کریں";
        readonly searchServices: "خدمات تلاش کریں…";
        readonly myBookings: "میری بکنگز";
        readonly favorites: "پسندیدہ";
        readonly profile: "پروفائل";
        readonly cancel: "منسوخ کریں";
        readonly confirm: "تصدیق کریں";
        readonly retry: "دوبارہ کوشش کریں";
        readonly total: "کل رقم";
    };
};
export type StringKey = keyof (typeof STRINGS)['en'];
export declare function t(locale: Locale, key: StringKey): string;
export declare function isRtl(locale: Locale): boolean;
export {};
