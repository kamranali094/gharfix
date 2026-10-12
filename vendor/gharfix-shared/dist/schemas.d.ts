/**
 * Zod schemas for input validation (shared by mobile, admin and server).
 */
import { z } from 'zod';
export declare const uuidSchema: z.ZodString;
export declare const pkPhoneSchema: z.ZodString;
export declare const otpCodeSchema: z.ZodString;
export declare const addressSchema: z.ZodObject<{
    label: z.ZodEnum<["home", "work", "other"]>;
    house: z.ZodString;
    street: z.ZodString;
    area: z.ZodString;
    city: z.ZodString;
    directions: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    latitude: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    longitude: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    is_default: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    label?: "home" | "work" | "other";
    house?: string;
    street?: string;
    area?: string;
    city?: string;
    directions?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
}, {
    label?: "home" | "work" | "other";
    house?: string;
    street?: string;
    area?: string;
    city?: string;
    directions?: string;
    latitude?: number;
    longitude?: number;
    is_default?: boolean;
}>;
export declare const bookingCreateSchema: z.ZodObject<{
    category_id: z.ZodString;
    service_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address_id: z.ZodString;
    description: z.ZodString;
    photos: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    urgency: z.ZodDefault<z.ZodEnum<["normal", "urgent", "scheduled"]>>;
    asap: z.ZodDefault<z.ZodBoolean>;
    scheduled_at: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    provider_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    idempotency_key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description?: string;
    category_id?: string;
    service_id?: string;
    address_id?: string;
    photos?: string[];
    urgency?: "urgent" | "normal" | "scheduled";
    asap?: boolean;
    scheduled_at?: string;
    provider_id?: string;
    idempotency_key?: string;
}, {
    description?: string;
    category_id?: string;
    service_id?: string;
    address_id?: string;
    photos?: string[];
    urgency?: "urgent" | "normal" | "scheduled";
    asap?: boolean;
    scheduled_at?: string;
    provider_id?: string;
    idempotency_key?: string;
}>;
export declare const quoteItemSchema: z.ZodObject<{
    label: z.ZodString;
    quantity: z.ZodNumber;
    unit_price: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    label?: string;
    quantity?: number;
    unit_price?: number;
}, {
    label?: string;
    quantity?: number;
    unit_price?: number;
}>;
export declare const quoteSubmitSchema: z.ZodObject<{
    booking_id: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        label: z.ZodString;
        quantity: z.ZodNumber;
        unit_price: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        label?: string;
        quantity?: number;
        unit_price?: number;
    }, {
        label?: string;
        quantity?: number;
        unit_price?: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    items?: {
        label?: string;
        quantity?: number;
        unit_price?: number;
    }[];
    booking_id?: string;
}, {
    items?: {
        label?: string;
        quantity?: number;
        unit_price?: number;
    }[];
    booking_id?: string;
}>;
export declare const reviewSchema: z.ZodObject<{
    booking_id: z.ZodString;
    rating: z.ZodNumber;
    comment: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    photos: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    photos?: string[];
    booking_id?: string;
    rating?: number;
    comment?: string;
}, {
    photos?: string[];
    booking_id?: string;
    rating?: number;
    comment?: string;
}>;
export declare const paymentSubmitSchema: z.ZodObject<{
    booking_id: z.ZodString;
    method: z.ZodEnum<["cash", "easypaisa_manual", "jazzcash_manual"]>;
    txn_reference: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    proof_path: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    booking_id?: string;
    method?: "cash" | "easypaisa_manual" | "jazzcash_manual";
    txn_reference?: string;
    proof_path?: string;
}, {
    booking_id?: string;
    method?: "cash" | "easypaisa_manual" | "jazzcash_manual";
    txn_reference?: string;
    proof_path?: string;
}>;
export declare const providerRegistrationSchema: z.ZodObject<{
    full_name: z.ZodString;
    phone: z.ZodString;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    display_name: z.ZodString;
    bio: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    experience_years: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    city: z.ZodString;
    service_ids: z.ZodArray<z.ZodString, "many">;
    area_ids: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    email?: string;
    city?: string;
    full_name?: string;
    phone?: string;
    display_name?: string;
    bio?: string;
    experience_years?: number;
    service_ids?: string[];
    area_ids?: string[];
}, {
    email?: string;
    city?: string;
    full_name?: string;
    phone?: string;
    display_name?: string;
    bio?: string;
    experience_years?: number;
    service_ids?: string[];
    area_ids?: string[];
}>;
export declare const categoryUpsertSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    icon: z.ZodDefault<z.ZodString>;
    is_active: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
    supports_fixed_pricing: z.ZodDefault<z.ZodBoolean>;
    supports_quotation: z.ZodDefault<z.ZodBoolean>;
    default_inspection_fee: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description?: string;
    name?: string;
    slug?: string;
    icon?: string;
    is_active?: boolean;
    sort_order?: number;
    supports_fixed_pricing?: boolean;
    supports_quotation?: boolean;
    default_inspection_fee?: number;
}, {
    description?: string;
    name?: string;
    slug?: string;
    icon?: string;
    is_active?: boolean;
    sort_order?: number;
    supports_fixed_pricing?: boolean;
    supports_quotation?: boolean;
    default_inspection_fee?: number;
}>;
export declare const ticketCreateSchema: z.ZodObject<{
    booking_id: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    category: z.ZodString;
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "urgent"]>>;
    description: z.ZodString;
}, "strip", z.ZodTypeAny, {
    category?: string;
    description?: string;
    booking_id?: string;
    priority?: "low" | "medium" | "high" | "urgent";
}, {
    category?: string;
    description?: string;
    booking_id?: string;
    priority?: "low" | "medium" | "high" | "urgent";
}>;
export declare const uploadMetaSchema: z.ZodObject<{
    mime: z.ZodEnum<[string, ...string[]]>;
    bytes: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    mime?: string;
    bytes?: number;
}, {
    mime?: string;
    bytes?: number;
}>;
export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type QuoteSubmitInput = z.infer<typeof quoteSubmitSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type PaymentSubmitInput = z.infer<typeof paymentSubmitSchema>;
export type ProviderRegistrationInput = z.infer<typeof providerRegistrationSchema>;
