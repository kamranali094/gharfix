/**
 * Shared business-logic utilities. Pure functions — safe to use anywhere.
 */
import {
  BOOKING_TRANSITIONS,
  BOOKING_TRANSITION_ACTORS,
  BOOKING_REFERENCE_PREFIX,
  DEFAULT_COMMISSION_RATE,
  PAYMENT_REFERENCE_PREFIX,
  PAYMENT_TRANSITIONS,
  PK_MOBILE_NORMALIZED_REGEX,
  PK_MOBILE_REGEX,
  SETTLEMENT_REFERENCE_PREFIX,
  TICKET_REFERENCE_PREFIX,
} from './constants';
import type {
  BookingStatus,
  PaymentStatus,
  PriceSnapshot,
  PricingModel,
  UserRole,
} from './types';

// ─── Pakistani phone numbers ────────────────────────────────────────────────

/** Normalize to +92XXXXXXXXXX. Throws on invalid input. */
export function normalizePkPhone(input: string): string {
  const digits = input.replace(/[\s\-()]/g, '');
  if (!PK_MOBILE_REGEX.test(digits)) {
    throw new Error('Invalid Pakistani mobile number');
  }
  if (digits.startsWith('+92')) return digits;
  if (digits.startsWith('92')) return '+' + digits;
  if (digits.startsWith('0')) return '+92' + digits.slice(1);
  return '+92' + digits; // starts with '3...'
}

export function isValidPkPhone(input: string): boolean {
  try {
    normalizePkPhone(input);
    return true;
  } catch {
    return false;
  }
}

/** Mask for display before address/contact is authorized: +92 300 •••4567 */
export function maskPhone(normalized: string): string {
  if (!PK_MOBILE_NORMALIZED_REGEX.test(normalized)) return '•••';
  return `${normalized.slice(0, 6)} •••${normalized.slice(-4)}`;
}

// ─── Money ───────────────────────────────────────────────────────────────────

export function formatPKR(amount: number): string {
  const rounded = Math.round(amount);
  return `PKR ${rounded.toLocaleString('en-PK')}`;
}

/** Round to 2dp using integer paisa math to avoid float drift. */
export function toPaisa(pkr: number): number {
  return Math.round(pkr * 100);
}
export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export interface CommissionResult {
  labour: number;
  rate: number;
  commission: number;
  providerNet: number;
}

/** Commission is taken on labour only (materials pass through to provider). */
export function calculateCommission(labour: number, rate = DEFAULT_COMMISSION_RATE): CommissionResult {
  if (labour < 0) throw new Error('Labour cannot be negative');
  if (rate < 0 || rate > 1) throw new Error('Commission rate must be between 0 and 1');
  const commission = fromPaisa(Math.round(toPaisa(labour) * rate));
  return { labour, rate, commission, providerNet: fromPaisa(toPaisa(labour) - toPaisa(commission)) };
}

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

export function buildPriceSnapshot(input: PriceInput): PriceSnapshot {
  const labour = input.labour ?? 0;
  const materials = input.materials ?? 0;
  const inspectionFee = input.inspectionFee ?? 0;
  const serviceFee = input.serviceFee ?? 0;
  const discount = input.discount ?? 0;
  for (const [k, v] of Object.entries({ labour, materials, inspectionFee, serviceFee, discount })) {
    if (v < 0) throw new Error(`${k} cannot be negative`);
  }
  const subtotal = labour + materials + inspectionFee + serviceFee;
  const total = Math.max(0, subtotal - discount);
  const rate = input.commissionRate ?? DEFAULT_COMMISSION_RATE;
  const { commission, providerNet } = calculateCommission(labour, rate);
  const providerPayable = fromPaisa(toPaisa(providerNet) + toPaisa(materials));
  return {
    labour,
    materials,
    inspection_fee: inspectionFee,
    service_fee: serviceFee,
    discount,
    subtotal,
    commission_rate: rate,
    commission_amount: commission,
    provider_payable: providerPayable,
    total,
    currency: 'PKR',
    pricing_model: input.pricingModel,
    note: input.note ?? null,
  };
}

// ─── Booking state machine ───────────────────────────────────────────────────

export function canTransitionBooking(
  from: BookingStatus,
  to: BookingStatus,
  actorRole: UserRole | 'system',
): boolean {
  if (!(BOOKING_TRANSITIONS[from] ?? []).includes(to)) return false;
  const actors = BOOKING_TRANSITION_ACTORS[`${from}>${to}`] ?? [];
  return actors.includes(actorRole);
}

export function assertTransitionBooking(
  from: BookingStatus,
  to: BookingStatus,
  actorRole: UserRole | 'system',
): void {
  if (!(BOOKING_TRANSITIONS[from] ?? []).includes(to)) {
    throw new Error(`Invalid booking transition: ${from} → ${to}`);
  }
  const actors = BOOKING_TRANSITION_ACTORS[`${from}>${to}`] ?? [];
  if (!actors.includes(actorRole)) {
    throw new Error(`Role '${actorRole}' may not transition booking ${from} → ${to}`);
  }
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return (PAYMENT_TRANSITIONS[from] ?? []).includes(to);
}

export const TERMINAL_BOOKING_STATUSES: BookingStatus[] = ['completed', 'cancelled'];
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'accepted',
  'provider_assigned',
  'on_the_way',
  'arrived',
  'in_progress',
  'awaiting_quote_approval',
  'disputed',
];

/** Cancellation allowed while booking is not terminal (policy may add fees). */
export function canCancelBooking(status: BookingStatus): boolean {
  return !TERMINAL_BOOKING_STATUSES.includes(status);
}

// ─── References & idempotency ────────────────────────────────────────────────
// NOTE: Math.random-based on purpose — keeps this package dependency-free and
// working in Node, browsers and React Native (no crypto/global polyfill needed).
// These are reference numbers and idempotency keys, not security tokens.

function randomSuffix(len: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function generateBookingReference(): string {
  return `${BOOKING_REFERENCE_PREFIX}-${randomSuffix(6)}`;
}
export function generatePaymentReference(): string {
  return `${PAYMENT_REFERENCE_PREFIX}-${randomSuffix(6)}`;
}
export function generateSettlementReference(): string {
  return `${SETTLEMENT_REFERENCE_PREFIX}-${randomSuffix(6)}`;
}
export function generateTicketReference(): string {
  return `${TICKET_REFERENCE_PREFIX}-${randomSuffix(6)}`;
}

export function generateIdempotencyKey(): string {
  const hex = (n: number): string => {
    let s = '';
    for (let i = 0; i < n; i++) s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    return s;
  };
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(Math.random() * 4)]}${hex(3)}-${hex(12)}`;
}

// ─── Scheduling helpers ──────────────────────────────────────────────────────

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "11:00"
  label: string; // "9:00 AM – 11:00 AM"
}

export const DEFAULT_TIME_SLOTS: TimeSlot[] = [
  { start: '09:00', end: '11:00', label: '9:00 AM – 11:00 AM' },
  { start: '11:00', end: '13:00', label: '11:00 AM – 1:00 PM' },
  { start: '13:00', end: '15:00', label: '1:00 PM – 3:00 PM' },
  { start: '15:00', end: '17:00', label: '3:00 PM – 5:00 PM' },
  { start: '17:00', end: '19:00', label: '5:00 PM – 7:00 PM' },
];

/** True if the datetime is in the future (Asia/Karachi wall-clock check kept simple). */
export function isFutureDateTime(iso: string): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t > Date.now();
}

/** Average rating rounded to 1 decimal from a list of 1..5 ratings. */
export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}
