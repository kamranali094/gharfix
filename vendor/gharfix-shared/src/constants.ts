/**
 * GharFix brand tokens + domain constants.
 * Single source of truth shared by mobile, admin and backend.
 */
import type { BookingStatus, PaymentStatus, UserRole, VerificationStatus } from './types';

// ─── Brand ───────────────────────────────────────────────────────────────────

export const BRAND = {
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
  spacing: (n: number) => n * 4,
} as const;

// ─── Locale / money ──────────────────────────────────────────────────────────

export const CURRENCY = 'PKR' as const;
export const TIMEZONE = 'Asia/Karachi' as const;
export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'ur'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// ─── Business defaults ───────────────────────────────────────────────────────

export const DEFAULT_COMMISSION_RATE = 0.15;
export const MAX_COMMISSION_RATE = 0.5;
export const BOOKING_REFERENCE_PREFIX = 'GF';
export const PAYMENT_REFERENCE_PREFIX = 'PAY';
export const SETTLEMENT_REFERENCE_PREFIX = 'STL';
export const TICKET_REFERENCE_PREFIX = 'TKT';
export const QUOTE_EXPIRY_HOURS = 48;
export const REVIEW_WINDOW_DAYS = 30;
export const MAX_BOOKING_PHOTOS = 5;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

// ─── Pakistani phone ─────────────────────────────────────────────────────────

export const PK_MOBILE_REGEX = /^(?:\+?92|0)?3\d{9}$/;
export const PK_MOBILE_NORMALIZED_REGEX = /^\+923\d{9}$/;

// ─── Booking state machine ───────────────────────────────────────────────────
// Allowed transitions: from → list of to-statuses. Enforced server-side.
export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
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
export const BOOKING_TRANSITION_ACTORS: Record<string, Array<UserRole | 'system'>> = {
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

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ['pending_verification', 'failed'],
  pending_verification: ['paid', 'failed'],
  paid: ['refunded', 'partially_refunded'],
  failed: ['pending_verification'],
  refunded: [],
  partially_refunded: ['refunded'],
};

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
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

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  not_submitted: 'Not submitted',
  pending: 'Pending review',
  under_review: 'Under review',
  approved: 'Verified',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

// ─── Admin permissions (least privilege) ─────────────────────────────────────

export const PERMISSIONS = {
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ADMIN_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  operations_manager: [
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.BOOKINGS_MANAGE,
    PERMISSIONS.PROVIDERS_VERIFY,
    PERMISSIONS.PROVIDERS_MANAGE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
  ],
  customer_support: [
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.TICKETS_MANAGE,
    PERMISSIONS.REVIEWS_MODERATE,
  ],
  finance_manager: [
    PERMISSIONS.BOOKINGS_VIEW,
    PERMISSIONS.FINANCE_VIEW,
    PERMISSIONS.FINANCE_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
  ],
};
