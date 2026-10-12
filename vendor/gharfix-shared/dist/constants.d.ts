/**
 * GharFix brand tokens + domain constants.
 * Single source of truth shared by mobile, admin and backend.
 */
import type { BookingStatus, PaymentStatus, UserRole, VerificationStatus } from './types';
export declare const BRAND: {
    readonly name: "GharFix";
    readonly tagline: "Ghar Ka Har Kaam, Ab Asaan.";
    readonly colors: {
        readonly primary: "#16A34A";
        readonly deepGreen: "#166534";
        readonly darkNavy: "#14213D";
        readonly warmWhite: "#F8FAF7";
        readonly pureWhite: "#FFFFFF";
        readonly lightGreen: "#DCFCE7";
        readonly softGray: "#F1F5F9";
        readonly borderGray: "#E2E8F0";
        readonly secondaryText: "#64748B";
        readonly success: "#15803D";
        readonly warning: "#D97706";
        readonly error: "#DC2626";
        readonly info: "#2563EB";
    };
    readonly spacing: (n: number) => number;
};
export declare const CURRENCY: "PKR";
export declare const TIMEZONE: "Asia/Karachi";
export declare const DEFAULT_LOCALE: "en";
export declare const SUPPORTED_LOCALES: readonly ["en", "ur"];
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export declare const DEFAULT_COMMISSION_RATE = 0.15;
export declare const MAX_COMMISSION_RATE = 0.5;
export declare const BOOKING_REFERENCE_PREFIX = "GF";
export declare const PAYMENT_REFERENCE_PREFIX = "PAY";
export declare const SETTLEMENT_REFERENCE_PREFIX = "STL";
export declare const TICKET_REFERENCE_PREFIX = "TKT";
export declare const QUOTE_EXPIRY_HOURS = 48;
export declare const REVIEW_WINDOW_DAYS = 30;
export declare const MAX_BOOKING_PHOTOS = 5;
export declare const MAX_UPLOAD_BYTES: number;
export declare const ALLOWED_IMAGE_MIME: readonly ["image/jpeg", "image/png", "image/webp"];
export declare const PK_MOBILE_REGEX: RegExp;
export declare const PK_MOBILE_NORMALIZED_REGEX: RegExp;
export declare const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]>;
export declare const BOOKING_TRANSITION_ACTORS: Record<string, Array<UserRole | 'system'>>;
export declare const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]>;
export declare const BOOKING_STATUS_LABELS: Record<BookingStatus, string>;
export declare const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string>;
export declare const PERMISSIONS: {
    readonly BOOKINGS_VIEW: "bookings.view";
    readonly BOOKINGS_MANAGE: "bookings.manage";
    readonly PROVIDERS_VERIFY: "providers.verify";
    readonly PROVIDERS_MANAGE: "providers.manage";
    readonly CUSTOMERS_VIEW: "customers.view";
    readonly CUSTOMERS_MANAGE: "customers.manage";
    readonly FINANCE_VIEW: "finance.view";
    readonly FINANCE_MANAGE: "finance.manage";
    readonly CATALOG_MANAGE: "catalog.manage";
    readonly REVIEWS_MODERATE: "reviews.moderate";
    readonly TICKETS_MANAGE: "tickets.manage";
    readonly REPORTS_VIEW: "reports.view";
    readonly SETTINGS_MANAGE: "settings.manage";
    readonly ADMINS_MANAGE: "admins.manage";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export declare const ADMIN_ROLE_PERMISSIONS: Record<string, Permission[]>;
