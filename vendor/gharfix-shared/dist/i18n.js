"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.t = t;
exports.isRtl = isRtl;
var STRINGS = {
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
};
function t(locale, key) {
    var _a, _b;
    return (_b = (_a = STRINGS[locale][key]) !== null && _a !== void 0 ? _a : STRINGS.en[key]) !== null && _b !== void 0 ? _b : key;
}
function isRtl(locale) {
    return locale === 'ur';
}
