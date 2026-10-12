import type { BookingStatus, PaymentStatus, PriceSnapshot, PricingModel, UserRole } from './types';
/** Normalize to +92XXXXXXXXXX. Throws on invalid input. */
export declare function normalizePkPhone(input: string): string;
export declare function isValidPkPhone(input: string): boolean;
/** Mask for display before address/contact is authorized: +92 300 •••4567 */
export declare function maskPhone(normalized: string): string;
export declare function formatPKR(amount: number): string;
/** Round to 2dp using integer paisa math to avoid float drift. */
export declare function toPaisa(pkr: number): number;
export declare function fromPaisa(paisa: number): number;
export interface CommissionResult {
    labour: number;
    rate: number;
    commission: number;
    providerNet: number;
}
/** Commission is taken on labour only (materials pass through to provider). */
export declare function calculateCommission(labour: number, rate?: number): CommissionResult;
export interface PriceInput {
    labour: number;
    materials?: number;
    inspectionFee?: number;
    serviceFee?: number;
    discount?: number;
    commissionRate?: number;
    pricingModel: PricingModel;
    note?: string | null;
}
export declare function buildPriceSnapshot(input: PriceInput): PriceSnapshot;
export declare function canTransitionBooking(from: BookingStatus, to: BookingStatus, actorRole: UserRole | 'system'): boolean;
export declare function assertTransitionBooking(from: BookingStatus, to: BookingStatus, actorRole: UserRole | 'system'): void;
export declare function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean;
export declare const TERMINAL_BOOKING_STATUSES: BookingStatus[];
export declare const ACTIVE_BOOKING_STATUSES: BookingStatus[];
/** Cancellation allowed while booking is not terminal (policy may add fees). */
export declare function canCancelBooking(status: BookingStatus): boolean;
export declare function generateBookingReference(): string;
export declare function generatePaymentReference(): string;
export declare function generateSettlementReference(): string;
export declare function generateTicketReference(): string;
export declare function generateIdempotencyKey(): string;
export interface TimeSlot {
    start: string;
    end: string;
    label: string;
}
export declare const DEFAULT_TIME_SLOTS: TimeSlot[];
/** True if the datetime is in the future (Asia/Karachi wall-clock check kept simple). */
export declare function isFutureDateTime(iso: string): boolean;
/** Average rating rounded to 1 decimal from a list of 1..5 ratings. */
export declare function averageRating(ratings: number[]): number;
