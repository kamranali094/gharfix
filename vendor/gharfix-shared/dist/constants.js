"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_ROLE_PERMISSIONS = exports.PERMISSIONS = exports.VERIFICATION_STATUS_LABELS = exports.BOOKING_STATUS_LABELS = exports.PAYMENT_TRANSITIONS = exports.BOOKING_TRANSITION_ACTORS = exports.BOOKING_TRANSITIONS = exports.PK_MOBILE_NORMALIZED_REGEX = exports.PK_MOBILE_REGEX = exports.ALLOWED_IMAGE_MIME = exports.MAX_UPLOAD_BYTES = exports.MAX_BOOKING_PHOTOS = exports.REVIEW_WINDOW_DAYS = exports.QUOTE_EXPIRY_HOURS = exports.TICKET_REFERENCE_PREFIX = exports.SETTLEMENT_REFERENCE_PREFIX = exports.PAYMENT_REFERENCE_PREFIX = exports.BOOKING_REFERENCE_PREFIX = exports.MAX_COMMISSION_RATE = exports.DEFAULT_COMMISSION_RATE = exports.SUPPORTED_LOCALES = exports.DEFAULT_LOCALE = exports.TIMEZONE = exports.CURRENCY = exports.BRAND = void 0;
// ─── Brand ───────────────────────────────────────────────────────────────────
exports.BRAND = {
    name: 'GharFix',
    tagline: 'Ghar Ka Har Kaam, Ab Asaan.',
    colors: {
        primary: '#16A34A',
        deepGreen: '#166534',
        darkNavy: '#14213D',
        warmWhite: '#F8FAF7',
        pureWhite: '#FFFFFF',
        lightGreen: '#DCFCE7',
        softGray: '#F1F5F9',
        borderGray: '#E2E8F0',
        secondaryText: '#64748B',
        success: '#15803D',
        warning: '#D97706',
        error: '#DC2626',
        info: '#2563EB',
    },
    spacing: function (n) { return n * 4; },
};
// ─── Locale / money ──────────────────────────────────────────────────────────
exports.CURRENCY = 'PKR';
exports.TIMEZONE = 'Asia/Karachi';
exports.DEFAULT_LOCALE = 'en';
exports.SUPPORTED_LOCALES = ['en', 'ur'];
// ─── Business defaults ───────────────────────────────────────────────────────
exports.DEFAULT_COMMISSION_RATE = 0.15;
exports.MAX_COMMISSION_RATE = 0.5;
exports.BOOKING_REFERENCE_PREFIX = 'GF';
exports.PAYMENT_REFERENCE_PREFIX = 'PAY';
exports.SETTLEMENT_REFERENCE_PREFIX = 'STL';
exports.TICKET_REFERENCE_PREFIX = 'TKT';
exports.QUOTE_EXPIRY_HOURS = 48;
exports.REVIEW_WINDOW_DAYS = 30;
exports.MAX_BOOKING_PHOTOS = 5;
exports.MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
exports.ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
// ─── Pakistani phone ─────────────────────────────────────────────────────────
exports.PK_MOBILE_REGEX = /^(?:\+?92|0)?3\d{9}$/;
exports.PK_MOBILE_NORMALIZED_REGEX = /^\+923\d{9}$/;
// ─── Booking state machine ───────────────────────────────────────────────────
// Allowed transitions: from → list of to-statuses. Enforced server-side.
exports.BOOKING_TRANSITIONS = {
    pending: ['accepted', 'cancelled'],
    accepted: ['provider_assigned', 'cancelled'],
    provider_assigned: ['on_the_way', 'cancelled'],
    on_the_way: ['arrived', 'cancelled'],
    arrived: ['in_progress', 'cancelled'],
    in_progress: ['awaiting_quote_approval', 'completed', 'cancelled', 'disputed'],
    awaiting_quote_approval: ['in_progress', 'cancelled', 'disputed'],
    completed: ['disputed'],
    cancelled: [],
    disputed: ['completed', 'cancelled'],
};
// Which roles may initiate each transition (server-enforced).
exports.BOOKING_TRANSITION_ACTORS = {
    'pending>accepted': ['provider', 'admin'],
    'pending>cancelled': ['customer', 'admin'],
    'accepted>provider_assigned': ['admin', 'system'],
    'accepted>cancelled': ['customer', 'provider', 'admin'],
    'provider_assigned>on_the_way': ['provider'],
    'provider_assigned>cancelled': ['customer', 'provider', 'admin'],
    'on_the_way>arrived': ['provider'],
    'on_the_way>cancelled': ['customer', 'provider', 'admin'],
    'arrived>in_progress': ['provider'],
    'arrived>cancelled': ['customer', 'provider', 'admin'],
    'in_progress>awaiting_quote_approval': ['provider'],
    'in_progress>completed': ['provider', 'admin'],
    'in_progress>cancelled': ['customer', 'admin'],
    'in_progress>disputed': ['customer', 'provider'],
    'awaiting_quote_approval>in_progress': ['customer', 'admin'], // quote approved
    'awaiting_quote_approval>cancelled': ['customer', 'admin'],
    'awaiting_quote_approval>disputed': ['customer', 'provider'],
    'completed>disputed': ['customer', 'admin'],
    'disputed>completed': ['admin'],
    'disputed>cancelled': ['admin'],
};
exports.PAYMENT_TRANSITIONS = {
    unpaid: ['pending_verification', 'failed'],
    pending_verification: ['paid', 'failed'],
    paid: ['refunded', 'partially_refunded'],
    failed: ['pending_verification'],
    refunded: [],
    partially_refunded: ['refunded'],
};
exports.BOOKING_STATUS_LABELS = {
    pending: 'Pending',
    accepted: 'Accepted',
    provider_assigned: 'Provider assigned',
    on_the_way: 'On the way',
    arrived: 'Arrived',
    in_progress: 'In progress',
    awaiting_quote_approval: 'Quote awaiting approval',
    completed: 'Completed',
    cancelled: 'Cancelled',
    disputed: 'Disputed',
};
exports.VERIFICATION_STATUS_LABELS = {
    not_submitted: 'Not submitted',
    pending: 'Pending review',
    under_review: 'Under review',
    approved: 'Verified',
    rejected: 'Rejected',
    suspended: 'Suspended',
};
// ─── Admin permissions (least privilege) ─────────────────────────────────────
exports.PERMISSIONS = {
    BOOKINGS_VIEW: 'bookings.view',
    BOOKINGS_MANAGE: 'bookings.manage',
    PROVIDERS_VERIFY: 'providers.verify',
    PROVIDERS_MANAGE: 'providers.manage',
    CUSTOMERS_VIEW: 'customers.view',
    CUSTOMERS_MANAGE: 'customers.manage',
    FINANCE_VIEW: 'finance.view',
    FINANCE_MANAGE: 'finance.manage',
    CATALOG_MANAGE: 'catalog.manage',
    REVIEWS_MODERATE: 'reviews.moderate',
    TICKETS_MANAGE: 'tickets.manage',
    REPORTS_VIEW: 'reports.view',
    SETTINGS_MANAGE: 'settings.manage',
    ADMINS_MANAGE: 'admins.manage',
};
exports.ADMIN_ROLE_PERMISSIONS = {
    super_admin: Object.values(exports.PERMISSIONS),
    operations_manager: [
        exports.PERMISSIONS.BOOKINGS_VIEW,
        exports.PERMISSIONS.BOOKINGS_MANAGE,
        exports.PERMISSIONS.PROVIDERS_VERIFY,
        exports.PERMISSIONS.PROVIDERS_MANAGE,
        exports.PERMISSIONS.CUSTOMERS_VIEW,
        exports.PERMISSIONS.CATALOG_MANAGE,
        exports.PERMISSIONS.TICKETS_MANAGE,
        exports.PERMISSIONS.REPORTS_VIEW,
    ],
    customer_support: [
        exports.PERMISSIONS.BOOKINGS_VIEW,
        exports.PERMISSIONS.CUSTOMERS_VIEW,
        exports.PERMISSIONS.TICKETS_MANAGE,
        exports.PERMISSIONS.REVIEWS_MODERATE,
    ],
    finance_manager: [
        exports.PERMISSIONS.BOOKINGS_VIEW,
        exports.PERMISSIONS.FINANCE_VIEW,
        exports.PERMISSIONS.FINANCE_MANAGE,
        exports.PERMISSIONS.REPORTS_VIEW,
    ],
};
