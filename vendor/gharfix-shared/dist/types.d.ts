/**
 * GharFix shared domain types.
 * These mirror the Supabase tables in supabase/migrations. Keep them in sync.
 */
export type UUID = string;
export type ISODateString = string;
/** Platform roles (user_roles). A user has exactly one primary role. */
export type UserRole = 'customer' | 'provider' | 'admin';
/** Admin sub-roles with least-privilege permission sets. */
export type AdminRole = 'super_admin' | 'operations_manager' | 'customer_support' | 'finance_manager';
export type VerificationStatus = 'not_submitted' | 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus = 'pending' | 'accepted' | 'provider_assigned' | 'on_the_way' | 'arrived' | 'in_progress' | 'awaiting_quote_approval' | 'completed' | 'cancelled' | 'disputed';
export type PaymentStatus = 'unpaid' | 'pending_verification' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'cash' | 'easypaisa_manual' | 'jazzcash_manual' | 'online_gateway';
export type PricingModel = 'fixed' | 'starting' | 'quotation';
export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'superseded';
export type TicketStatus = 'open' | 'in_review' | 'waiting_customer' | 'waiting_provider' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SettlementStatus = 'pending' | 'approved' | 'paid' | 'failed' | 'reversed';
export type Urgency = 'normal' | 'urgent' | 'scheduled';
export type AddressLabel = 'home' | 'work' | 'other';
export interface Profile {
    id: UUID;
    phone: string;
    full_name: string;
    email: string | null;
    avatar_url: string | null;
    role: UserRole;
    admin_role: AdminRole | null;
    is_active: boolean;
    terms_accepted_at: ISODateString | null;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface CustomerAddress {
    id: UUID;
    user_id: UUID;
    label: AddressLabel;
    house: string;
    street: string;
    area: string;
    city: string;
    directions: string | null;
    latitude: number | null;
    longitude: number | null;
    is_default: boolean;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface Favorite {
    id: UUID;
    customer_id: UUID;
    provider_id: UUID;
    created_at: ISODateString;
}
export interface ServiceCategory {
    id: UUID;
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    image_url: string | null;
    is_active: boolean;
    sort_order: number;
    supports_fixed_pricing: boolean;
    supports_quotation: boolean;
    default_inspection_fee: number;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface Service {
    id: UUID;
    category_id: UUID;
    name: string;
    slug: string;
    description: string | null;
    pricing_model: PricingModel;
    base_price: number;
    inspection_fee: number;
    unit: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface ServiceArea {
    id: UUID;
    city: string;
    area_name: string;
    is_active: boolean;
    created_at: ISODateString;
}
export interface WorkingHours {
    /** 0=Sunday..6=Saturday → [open, close] in "HH:MM" 24h, or null = closed */
    [day: number]: [string, string] | null;
}
export interface ProviderProfile {
    user_id: UUID;
    display_name: string;
    bio: string | null;
    avatar_url: string | null;
    experience_years: number | null;
    city: string;
    verification_status: VerificationStatus;
    verification_notes: string | null;
    verified_at: ISODateString | null;
    verified_by: UUID | null;
    rating_avg: number;
    rating_count: number;
    completed_jobs: number;
    is_active: boolean;
    working_hours: WorkingHours | null;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface ProviderVerificationDocument {
    id: UUID;
    provider_id: UUID;
    document_type: string;
    storage_path: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: UUID | null;
    reviewed_at: ISODateString | null;
    created_at: ISODateString;
}
export interface ProviderService {
    provider_id: UUID;
    service_id: UUID;
    custom_price: number | null;
    is_active: boolean;
}
export interface ProviderBlockedDate {
    id: UUID;
    provider_id: UUID;
    blocked_date: string;
    reason: string | null;
    created_at: ISODateString;
}
export interface PriceSnapshot {
    labour: number;
    materials: number;
    inspection_fee: number;
    service_fee: number;
    discount: number;
    subtotal: number;
    commission_rate: number;
    commission_amount: number;
    provider_payable: number;
    total: number;
    currency: 'PKR';
    pricing_model: PricingModel;
    note: string | null;
}
export interface Booking {
    id: UUID;
    reference: string;
    customer_id: UUID;
    provider_id: UUID | null;
    category_id: UUID;
    service_id: UUID | null;
    address_id: UUID;
    description: string;
    photos: string[];
    urgency: Urgency;
    asap: boolean;
    scheduled_at: ISODateString | null;
    status: BookingStatus;
    pricing_model: PricingModel;
    price_snapshot: PriceSnapshot;
    total_estimate: number;
    final_amount: number | null;
    commission_rate: number;
    commission_amount: number;
    provider_payable: number;
    payment_status: PaymentStatus;
    cancellation_reason: string | null;
    cancelled_by: UUID | null;
    idempotency_key: UUID;
    completed_at: ISODateString | null;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface BookingStatusHistory {
    id: UUID;
    booking_id: UUID;
    from_status: BookingStatus | null;
    to_status: BookingStatus;
    actor_id: UUID;
    actor_role: UserRole | 'system';
    note: string | null;
    created_at: ISODateString;
}
export interface BookingQuoteItem {
    label: string;
    quantity: number;
    unit_price: number;
    amount: number;
}
export interface BookingQuote {
    id: UUID;
    booking_id: UUID;
    version: number;
    items: BookingQuoteItem[];
    subtotal: number;
    status: QuoteStatus;
    submitted_by: UUID;
    decided_by: UUID | null;
    decided_at: ISODateString | null;
    decision_note: string | null;
    created_at: ISODateString;
}
export interface BookingAttachment {
    id: UUID;
    booking_id: UUID;
    uploaded_by: UUID;
    storage_path: string;
    kind: 'problem_photo' | 'completion_evidence' | 'payment_proof' | 'complaint_evidence';
    created_at: ISODateString;
}
export interface Payment {
    id: UUID;
    reference: string;
    booking_id: UUID;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    txn_reference: string | null;
    proof_path: string | null;
    submitted_by: UUID;
    verified_by: UUID | null;
    verified_at: ISODateString | null;
    verification_note: string | null;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface PaymentEvent {
    id: UUID;
    payment_id: UUID;
    from_status: PaymentStatus | null;
    to_status: PaymentStatus;
    actor_id: UUID;
    note: string | null;
    created_at: ISODateString;
}
export interface LedgerEntry {
    id: UUID;
    booking_id: UUID | null;
    payment_id: UUID | null;
    entry_type: 'booking_charge' | 'commission_accrual' | 'provider_payable' | 'settlement_payout' | 'refund' | 'adjustment';
    amount: number;
    currency: 'PKR';
    description: string;
    created_by: UUID;
    created_at: ISODateString;
}
export interface CommissionRule {
    id: UUID;
    scope: 'default' | 'category' | 'provider';
    category_id: UUID | null;
    provider_id: UUID | null;
    rate: number;
    effective_from: ISODateString;
    effective_to: ISODateString | null;
    reason: string | null;
    created_by: UUID;
    created_at: ISODateString;
}
export interface ProviderSettlement {
    id: UUID;
    reference: string;
    provider_id: UUID;
    period_start: string;
    period_end: string;
    gross_amount: number;
    commission_amount: number;
    adjustments: number;
    net_amount: number;
    method: string | null;
    txn_reference: string | null;
    status: SettlementStatus;
    approved_by: UUID | null;
    approved_at: ISODateString | null;
    paid_at: ISODateString | null;
    created_at: ISODateString;
}
export interface ProviderSettlementItem {
    id: UUID;
    settlement_id: UUID;
    booking_id: UUID;
    gross_amount: number;
    commission_amount: number;
    net_amount: number;
    created_at: ISODateString;
}
export interface Review {
    id: UUID;
    booking_id: UUID;
    customer_id: UUID;
    provider_id: UUID;
    rating: number;
    comment: string | null;
    photos: string[];
    is_hidden: boolean;
    hidden_reason: string | null;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface AppNotification {
    id: UUID;
    user_id: UUID;
    type: string;
    title: string;
    body: string;
    data: Record<string, unknown> | null;
    is_read: boolean;
    created_at: ISODateString;
}
export interface SupportTicket {
    id: UUID;
    reference: string;
    booking_id: UUID | null;
    reporter_id: UUID;
    category: string;
    priority: TicketPriority;
    description: string;
    status: TicketStatus;
    assigned_to: UUID | null;
    resolution_notes: string | null;
    created_at: ISODateString;
    updated_at: ISODateString;
}
export interface AuditLog {
    id: UUID;
    actor_id: UUID | null;
    action: string;
    entity: string;
    entity_id: string;
    details: Record<string, unknown> | null;
    created_at: ISODateString;
}
export interface ApiOk<T> {
    ok: true;
    data: T;
}
export interface ApiErr {
    ok: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
export type ApiResult<T> = ApiOk<T> | ApiErr;
