"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMetaSchema = exports.ticketCreateSchema = exports.categoryUpsertSchema = exports.providerRegistrationSchema = exports.paymentSubmitSchema = exports.reviewSchema = exports.quoteSubmitSchema = exports.quoteItemSchema = exports.bookingCreateSchema = exports.addressSchema = exports.otpCodeSchema = exports.pkPhoneSchema = exports.uuidSchema = void 0;
/**
 * Zod schemas for input validation (shared by mobile, admin and server).
 */
var zod_1 = require("zod");
var constants_1 = require("./constants");
exports.uuidSchema = zod_1.z.string().uuid();
exports.pkPhoneSchema = zod_1.z
    .string()
    .trim()
    .regex(/^(?:\+?92|0)?3\d{9}$/, 'Enter a valid Pakistani mobile number (e.g. 03001234567)');
exports.otpCodeSchema = zod_1.z.string().regex(/^\d{4,8}$/, 'Invalid code');
exports.addressSchema = zod_1.z.object({
    label: zod_1.z.enum(['home', 'work', 'other']),
    house: zod_1.z.string().trim().min(1, 'House/flat is required').max(120),
    street: zod_1.z.string().trim().min(1, 'Street is required').max(200),
    area: zod_1.z.string().trim().min(1, 'Area is required').max(120),
    city: zod_1.z.string().trim().min(1, 'City is required').max(120),
    directions: zod_1.z.string().trim().max(500).optional().nullable(),
    latitude: zod_1.z.number().min(-90).max(90).optional().nullable(),
    longitude: zod_1.z.number().min(-180).max(180).optional().nullable(),
    is_default: zod_1.z.boolean().default(false),
});
exports.bookingCreateSchema = zod_1.z.object({
    category_id: exports.uuidSchema,
    service_id: exports.uuidSchema.nullable().optional(),
    address_id: exports.uuidSchema,
    description: zod_1.z.string().trim().min(10, 'Describe the problem (min 10 characters)').max(2000),
    photos: zod_1.z.array(zod_1.z.string().max(500)).max(constants_1.MAX_BOOKING_PHOTOS).default([]),
    urgency: zod_1.z.enum(['normal', 'urgent', 'scheduled']).default('normal'),
    asap: zod_1.z.boolean().default(false),
    scheduled_at: zod_1.z.string().datetime({ offset: true }).nullable().optional(),
    provider_id: exports.uuidSchema.nullable().optional(), // explicit provider choice, else platform assigns
    idempotency_key: exports.uuidSchema,
});
exports.quoteItemSchema = zod_1.z.object({
    label: zod_1.z.string().trim().min(1).max(200),
    quantity: zod_1.z.number().positive().max(1000),
    unit_price: zod_1.z.number().min(0).max(10000000),
});
exports.quoteSubmitSchema = zod_1.z.object({
    booking_id: exports.uuidSchema,
    items: zod_1.z.array(exports.quoteItemSchema).min(1, 'Add at least one line item').max(50),
});
exports.reviewSchema = zod_1.z.object({
    booking_id: exports.uuidSchema,
    rating: zod_1.z.number().int().min(1).max(5),
    comment: zod_1.z.string().trim().max(2000).optional().nullable(),
    photos: zod_1.z.array(zod_1.z.string().max(500)).max(3).default([]),
});
exports.paymentSubmitSchema = zod_1.z.object({
    booking_id: exports.uuidSchema,
    method: zod_1.z.enum(['cash', 'easypaisa_manual', 'jazzcash_manual']),
    txn_reference: zod_1.z.string().trim().max(100).optional().nullable(),
    proof_path: zod_1.z.string().max(500).optional().nullable(),
});
exports.providerRegistrationSchema = zod_1.z.object({
    full_name: zod_1.z.string().trim().min(3).max(120),
    phone: exports.pkPhoneSchema,
    email: zod_1.z.string().trim().email().max(200).optional().nullable(),
    display_name: zod_1.z.string().trim().min(3).max(120),
    bio: zod_1.z.string().trim().max(1000).optional().nullable(),
    experience_years: zod_1.z.number().int().min(0).max(60).optional().nullable(),
    city: zod_1.z.string().trim().min(2).max(120),
    service_ids: zod_1.z.array(exports.uuidSchema).min(1, 'Select at least one service'),
    area_ids: zod_1.z.array(exports.uuidSchema).min(1, 'Select at least one service area'),
});
exports.categoryUpsertSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2).max(120),
    slug: zod_1.z
        .string()
        .trim()
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens')
        .max(120),
    description: zod_1.z.string().trim().max(1000).optional().nullable(),
    icon: zod_1.z.string().trim().max(60).default('wrench'),
    is_active: zod_1.z.boolean().default(true),
    sort_order: zod_1.z.number().int().min(0).default(0),
    supports_fixed_pricing: zod_1.z.boolean().default(true),
    supports_quotation: zod_1.z.boolean().default(true),
    default_inspection_fee: zod_1.z.number().min(0).max(1000000).default(0),
});
exports.ticketCreateSchema = zod_1.z.object({
    booking_id: exports.uuidSchema.nullable().optional(),
    category: zod_1.z.string().trim().min(2).max(80),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    description: zod_1.z.string().trim().min(10).max(5000),
});
exports.uploadMetaSchema = zod_1.z.object({
    mime: zod_1.z.enum(constants_1.ALLOWED_IMAGE_MIME),
    bytes: zod_1.z.number().int().positive().max(constants_1.MAX_UPLOAD_BYTES),
});
