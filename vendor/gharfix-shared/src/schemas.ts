/**
 * Zod schemas for input validation (shared by mobile, admin and server).
 */
import { z } from 'zod';
import { ALLOWED_IMAGE_MIME, MAX_BOOKING_PHOTOS, MAX_UPLOAD_BYTES } from './constants';

export const uuidSchema = z.string().uuid();

export const pkPhoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+?92|0)?3\d{9}$/, 'Enter a valid Pakistani mobile number (e.g. 03001234567)');

export const otpCodeSchema = z.string().regex(/^\d{4,8}$/, 'Invalid code');

export const addressSchema = z.object({
  label: z.enum(['home', 'work', 'other']),
  house: z.string().trim().min(1, 'House/flat is required').max(120),
  street: z.string().trim().min(1, 'Street is required').max(200),
  area: z.string().trim().min(1, 'Area is required').max(120),
  city: z.string().trim().min(1, 'City is required').max(120),
  directions: z.string().trim().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  is_default: z.boolean().default(false),
});

export const bookingCreateSchema = z.object({
  category_id: uuidSchema,
  service_id: uuidSchema.nullable().optional(),
  address_id: uuidSchema,
  description: z.string().trim().min(10, 'Describe the problem (min 10 characters)').max(2000),
  photos: z.array(z.string().max(500)).max(MAX_BOOKING_PHOTOS).default([]),
  urgency: z.enum(['normal', 'urgent', 'scheduled']).default('normal'),
  asap: z.boolean().default(false),
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
  provider_id: uuidSchema.nullable().optional(), // explicit provider choice, else platform assigns
  idempotency_key: uuidSchema,
});

export const quoteItemSchema = z.object({
  label: z.string().trim().min(1).max(200),
  quantity: z.number().positive().max(1000),
  unit_price: z.number().min(0).max(10_000_000),
});

export const quoteSubmitSchema = z.object({
  booking_id: uuidSchema,
  items: z.array(quoteItemSchema).min(1, 'Add at least one line item').max(50),
});

export const reviewSchema = z.object({
  booking_id: uuidSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().nullable(),
  photos: z.array(z.string().max(500)).max(3).default([]),
});

export const paymentSubmitSchema = z.object({
  booking_id: uuidSchema,
  method: z.enum(['cash', 'easypaisa_manual', 'jazzcash_manual']),
  txn_reference: z.string().trim().max(100).optional().nullable(),
  proof_path: z.string().max(500).optional().nullable(),
});

export const providerRegistrationSchema = z.object({
  full_name: z.string().trim().min(3).max(120),
  phone: pkPhoneSchema,
  email: z.string().trim().email().max(200).optional().nullable(),
  display_name: z.string().trim().min(3).max(120),
  bio: z.string().trim().max(1000).optional().nullable(),
  experience_years: z.number().int().min(0).max(60).optional().nullable(),
  city: z.string().trim().min(2).max(120),
  service_ids: z.array(uuidSchema).min(1, 'Select at least one service'),
  area_ids: z.array(uuidSchema).min(1, 'Select at least one service area'),
});

export const categoryUpsertSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers and hyphens')
    .max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  icon: z.string().trim().max(60).default('wrench'),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
  supports_fixed_pricing: z.boolean().default(true),
  supports_quotation: z.boolean().default(true),
  default_inspection_fee: z.number().min(0).max(1_000_000).default(0),
});

export const ticketCreateSchema = z.object({
  booking_id: uuidSchema.nullable().optional(),
  category: z.string().trim().min(2).max(80),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  description: z.string().trim().min(10).max(5000),
});

export const uploadMetaSchema = z.object({
  mime: z.enum(ALLOWED_IMAGE_MIME as unknown as [string, ...string[]]),
  bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type QuoteSubmitInput = z.infer<typeof quoteSubmitSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type PaymentSubmitInput = z.infer<typeof paymentSubmitSchema>;
export type ProviderRegistrationInput = z.infer<typeof providerRegistrationSchema>;
