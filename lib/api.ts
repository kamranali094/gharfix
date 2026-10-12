/**
 * Typed API wrappers around Supabase for the GharFix mobile app.
 *
 * Client-side convenience only: authorization is enforced by Postgres RLS
 * and (for privileged operations) server-side functions. State transitions
 * are pre-validated client-side with `canTransitionBooking` from
 * @gharfix/shared, but the server remains the authority.
 */
import { supabase } from './supabase';
import {
  ALLOWED_IMAGE_MIME,
  MAX_UPLOAD_BYTES,
  buildPriceSnapshot,
  canTransitionBooking,
  generateBookingReference,
  generateIdempotencyKey,
  generatePaymentReference,
  generateTicketReference,
  uploadMetaSchema,
  type AddressLabel,
  type AppNotification,
  type Booking,
  type BookingQuote,
  type BookingStatus,
  type BookingStatusHistory,
  type CustomerAddress,
  type Favorite,
  type Payment,
  type PaymentMethod,
  type PriceSnapshot,
  type PricingModel,
  type Profile,
  type ProviderProfile,
  type ProviderSettlement,
  type QuoteSubmitInput,
  type Review,
  type ReviewInput,
  type Service,
  type ServiceArea,
  type ServiceCategory,
  type SupportTicket,
  type TicketPriority,
  type UserRole,
  type VerificationStatus,
} from '@gharfix/shared';

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return e instanceof Error ? e.message : 'Something went wrong. Please try again.';
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You are signed out. Please sign in again.');
  return user.id;
}

/** Best-effort in-app notification; never breaks the calling flow. */
export async function notifyUser(
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, unknown> | null = null,
): Promise<void> {
  try {
    await supabase.from('notifications').insert({ user_id: userId, type, title, body, data });
  } catch {
    /* notifications are best-effort */
  }
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<ServiceCategory[]> {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceCategory[];
}

export async function getServices(categoryId?: string): Promise<Service[]> {
  let q = supabase.from('services').select('*').eq('is_active', true).order('sort_order');
  if (categoryId) q = q.eq('category_id', categoryId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}

export async function getService(id: string): Promise<Service> {
  const { data, error } = await supabase.from('services').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as Service;
}

export async function getServiceAreas(): Promise<ServiceArea[]> {
  const { data, error } = await supabase
    .from('service_areas')
    .select('*')
    .eq('is_active', true)
    .order('city')
    .order('area_name');
  if (error) throw new Error(error.message);
  return (data ?? []) as ServiceArea[];
}

export interface ProviderCard {
  profile: ProviderProfile;
  services: { id: string; name: string; category_id: string; base_price: number; pricing_model: PricingModel; custom_price: number | null }[];
  startingPrice: number | null;
  phone?: string | null;
}

export async function searchProviders(opts: {
  categoryId?: string;
  minRating?: number;
  maxPrice?: number;
  city?: string;
} = {}): Promise<ProviderCard[]> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select(
      '*, provider_services!inner(is_active, custom_price, services!inner(id, name, category_id, base_price, pricing_model, is_active))',
    )
    .eq('verification_status', 'approved')
    .eq('is_active', true)
    .eq('provider_services.is_active', true);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<ProviderProfile & { provider_services: Array<{ is_active: boolean; custom_price: number | null; services: { id: string; name: string; category_id: string; base_price: number; pricing_model: PricingModel; is_active: boolean } }> }>;
  const cards: ProviderCard[] = rows.map((p) => {
    const services = p.provider_services
      .filter((ps) => ps.services?.is_active)
      .map((ps) => ({ ...ps.services, custom_price: ps.custom_price }));
    const prices = services.map((s) => s.custom_price ?? s.base_price).filter((x) => x > 0);
    return {
      profile: p,
      services,
      startingPrice: prices.length ? Math.min(...prices) : null,
    };
  });
  return cards.filter((c) => {
    if (opts.categoryId && !c.services.some((s) => s.category_id === opts.categoryId)) return false;
    if (opts.minRating && c.profile.rating_avg < opts.minRating) return false;
    if (opts.maxPrice != null && (c.startingPrice == null || c.startingPrice > opts.maxPrice)) return false;
    if (opts.city && c.profile.city.toLowerCase() !== opts.city.toLowerCase()) return false;
    return true;
  });
}

export async function getProviderDetail(providerId: string): Promise<{
  profile: ProviderProfile;
  services: ProviderCard['services'];
  reviews: (Review & { customer_name: string | null })[];
}> {
  const { data: profile, error } = await supabase.from('provider_profiles').select('*').eq('user_id', providerId).single();
  if (error) throw new Error(error.message);
  const { data: svcRows } = await supabase
    .from('provider_services')
    .select('custom_price, services!inner(id, name, category_id, base_price, pricing_model)')
    .eq('provider_id', providerId)
    .eq('is_active', true);
  const { data: reviewRows } = await supabase
    .from('reviews')
    .select('*')
    .eq('provider_id', providerId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(20);
  const services = ((svcRows ?? []) as unknown as Array<{ custom_price: number | null; services: ProviderCard['services'][number] }>).map((r) => ({
    ...r.services,
    custom_price: r.custom_price,
  }));
  const reviews = ((reviewRows ?? []) as Review[]);
  const customerIds = [...new Set(reviews.map((r) => r.customer_id))];
  let nameMap = new Map<string, string>();
  if (customerIds.length) {
    const { data: profs } = await supabase.from('profiles').select('id, full_name').in('id', customerIds);
    nameMap = new Map(((profs ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  }
  return {
    profile: profile as ProviderProfile,
    services,
    reviews: reviews.map((r) => ({ ...r, customer_name: nameMap.get(r.customer_id) ?? null })),
  };
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export async function getAddresses(): Promise<CustomerAddress[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerAddress[];
}

export async function createAddress(input: {
  label: AddressLabel;
  house: string;
  street: string;
  area: string;
  city: string;
  directions?: string | null;
  is_default?: boolean;
}): Promise<CustomerAddress> {
  const userId = await requireUserId();
  if (input.is_default) {
    await supabase.from('customer_addresses').update({ is_default: false }).eq('user_id', userId);
  }
  const { data, error } = await supabase
    .from('customer_addresses')
    .insert({ ...input, user_id: userId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerAddress;
}

export async function deleteAddress(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ─── Uploads ─────────────────────────────────────────────────────────────────

export interface PickedImage {
  uri: string;
  mime: string;
  bytes: number;
}

export function validateImageMeta(img: PickedImage): void {
  uploadMetaSchema.parse({ mime: img.mime, bytes: img.bytes });
  if (!(ALLOWED_IMAGE_MIME as readonly string[]).includes(img.mime)) {
    throw new Error(`Only JPG, PNG or WebP images are allowed (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`);
  }
}

/** Upload a local image to a storage bucket; returns the storage path. */
export async function uploadImage(bucket: string, folder: string, img: PickedImage): Promise<string> {
  validateImageMeta(img);
  const ext = img.mime === 'image/png' ? 'png' : img.mime === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const res = await fetch(img.uri);
  const blob = await res.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: img.mime,
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface BookingCreateParams {
  categoryId: string;
  serviceId: string | null;
  addressId: string;
  description: string;
  photos: string[]; // storage paths (already uploaded)
  urgency: 'normal' | 'urgent' | 'scheduled';
  asap: boolean;
  scheduledAt: string | null; // ISO with offset
  providerId: string | null;
  service: Service;
  idempotencyKey?: string;
}

export async function createBooking(p: BookingCreateParams): Promise<Booking> {
  const customerId = await requireUserId();
  const idempotencyKey = p.idempotencyKey ?? generateIdempotencyKey();

  // Resume-safe: if this key was already used (e.g. double-tap), return the existing booking.
  const { data: existing } = await supabase
    .from('bookings')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (existing) return existing as Booking;

  const snapshot: PriceSnapshot = buildPriceSnapshot({
    labour: p.service.pricing_model === 'fixed' ? p.service.base_price : 0,
    inspectionFee: p.service.inspection_fee,
    pricingModel: p.service.pricing_model,
    note:
      p.service.pricing_model === 'quotation'
        ? 'Quotation-based service: the provider will inspect and submit an itemized quote for your approval before chargeable work begins.'
        : null,
  });

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      reference: generateBookingReference(),
      customer_id: customerId,
      provider_id: p.providerId,
      category_id: p.categoryId,
      service_id: p.serviceId,
      address_id: p.addressId,
      description: p.description,
      photos: p.photos,
      urgency: p.urgency,
      asap: p.asap,
      scheduled_at: p.scheduledAt,
      status: 'pending',
      pricing_model: p.service.pricing_model,
      price_snapshot: snapshot,
      total_estimate: snapshot.total,
      commission_rate: snapshot.commission_rate,
      commission_amount: snapshot.commission_amount,
      provider_payable: snapshot.provider_payable,
      payment_status: 'unpaid',
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const booking = data as Booking;

  await supabase.from('booking_status_history').insert({
    booking_id: booking.id,
    from_status: null,
    to_status: 'pending',
    actor_id: customerId,
    actor_role: 'customer',
    note: 'Booking request created',
  });
  for (const path of p.photos) {
    await supabase.from('booking_attachments').insert({
      booking_id: booking.id,
      uploaded_by: customerId,
      storage_path: path,
      kind: 'problem_photo',
    });
  }
  if (p.providerId) {
    await notifyUser(p.providerId, 'booking_request', 'New booking request', `New ${p.service.name} request ${booking.reference}.`);
  }
  return booking;
}

export interface BookingDetail extends Booking {
  category: ServiceCategory | null;
  service: Service | null;
  address: CustomerAddress | null;
  customer: Profile | null;
  provider: (ProviderProfile & { phone: string | null }) | null;
}

export async function getBooking(id: string): Promise<BookingDetail> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error) throw new Error(error.message);
  const b = data as Booking;
  const [cat, svc, addr, cust] = await Promise.all([
    supabase.from('service_categories').select('*').eq('id', b.category_id).maybeSingle(),
    b.service_id ? supabase.from('services').select('*').eq('id', b.service_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('customer_addresses').select('*').eq('id', b.address_id).maybeSingle(),
    supabase.from('profiles').select('*').eq('id', b.customer_id).maybeSingle(),
  ]);
  let provider: (ProviderProfile & { phone: string | null }) | null = null;
  if (b.provider_id) {
    const { data: pRow } = await supabase.from('provider_profiles').select('*').eq('user_id', b.provider_id).maybeSingle();
    if (pRow) {
      const { data: phRow } = await supabase.from('profiles').select('phone').eq('id', b.provider_id).maybeSingle();
      provider = { ...(pRow as ProviderProfile), phone: (phRow as { phone: string } | null)?.phone ?? null };
    }
  }
  return {
    ...b,
    category: (cat.data as ServiceCategory | null) ?? null,
    service: (svc.data as Service | null) ?? null,
    address: (addr.data as CustomerAddress | null) ?? null,
    customer: (cust.data as Profile | null) ?? null,
    provider,
  };
}

export async function getMyBookings(statuses?: BookingStatus[]): Promise<Booking[]> {
  const userId = await requireUserId();
  let q = supabase.from('bookings').select('*').eq('customer_id', userId).order('created_at', { ascending: false });
  if (statuses?.length) q = q.in('status', statuses);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Booking[];
}

export async function getProviderJobs(providerId: string, statuses?: BookingStatus[]): Promise<Booking[]> {
  let q = supabase.from('bookings').select('*').eq('provider_id', providerId).order('created_at', { ascending: false });
  if (statuses?.length) q = q.in('status', statuses);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Booking[];
}

/** Provider view of open requests: assigned to me and still pending, plus unassigned in my categories. */
export async function getOpenRequests(providerId: string, serviceIds: string[]): Promise<Booking[]> {
  const mine = await supabase
    .from('bookings')
    .select('*')
    .eq('provider_id', providerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (mine.error) throw new Error(mine.error.message);
  let unassigned: Booking[] = [];
  if (serviceIds.length) {
    const r = await supabase
      .from('bookings')
      .select('*')
      .is('provider_id', null)
      .eq('status', 'pending')
      .in('service_id', serviceIds)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!r.error) unassigned = (r.data ?? []) as Booking[];
  }
  return [...((mine.data ?? []) as Booking[]), ...unassigned];
}

export async function getStatusHistory(bookingId: string): Promise<BookingStatusHistory[]> {
  const { data, error } = await supabase
    .from('booking_status_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingStatusHistory[];
}

/**
 * Move a booking to a new status. Pre-validates the transition and the actor
 * role client-side; the server/RLS remains authoritative.
 */
export async function transitionBooking(
  booking: Booking,
  to: BookingStatus,
  actorRole: UserRole,
  note?: string,
): Promise<Booking> {
  const actorId = await requireUserId();
  if (!canTransitionBooking(booking.status, to, actorRole)) {
    throw new Error(`Cannot move booking from ${booking.status} to ${to} as ${actorRole}.`);
  }
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: to, ...(to === 'completed' ? { completed_at: new Date().toISOString() } : {}) })
    .eq('id', booking.id)
    .eq('status', booking.status) // optimistic concurrency: fail if someone else moved it
    .select()
    .single();
  if (error) throw new Error(error.message);
  await supabase.from('booking_status_history').insert({
    booking_id: booking.id,
    from_status: booking.status,
    to_status: to,
    actor_id: actorId,
    actor_role: actorRole,
    note: note ?? null,
  });
  const updated = data as Booking;
  const otherParty = actorRole === 'customer' ? updated.provider_id : updated.customer_id;
  if (otherParty) {
    await notifyUser(otherParty, `booking_${to}`, `Booking ${updated.reference}: ${to.replace(/_/g, ' ')}`, note ?? '');
  }
  return updated;
}

export async function cancelBooking(booking: Booking, actorRole: UserRole, reason: string): Promise<Booking> {
  if (!reason.trim()) throw new Error('Please give a reason for cancellation.');
  const actorId = await requireUserId();
  const updated = await transitionBooking(booking, 'cancelled', actorRole, reason);
  await supabase.from('bookings').update({ cancellation_reason: reason, cancelled_by: actorId }).eq('id', booking.id);
  return { ...updated, cancellation_reason: reason, cancelled_by: actorId };
}

// ─── Quotations ──────────────────────────────────────────────────────────────

export async function submitQuote(booking: Booking, input: QuoteSubmitInput): Promise<BookingQuote> {
  const providerId = await requireUserId();
  if (booking.provider_id !== providerId) throw new Error('You can only quote on your own jobs.');
  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const { data: existing } = await supabase
    .from('booking_quotes')
    .select('version')
    .eq('booking_id', booking.id)
    .order('version', { ascending: false })
    .limit(1);
  const version = ((existing ?? []) as { version: number }[])[0]?.version + 1 || 1;
  // Supersede older pending quotes
  await supabase.from('booking_quotes').update({ status: 'superseded' }).eq('booking_id', booking.id).eq('status', 'pending');
  const { data, error } = await supabase
    .from('booking_quotes')
    .insert({
      booking_id: booking.id,
      version,
      items: input.items.map((i) => ({ ...i, amount: i.quantity * i.unit_price })),
      subtotal,
      status: 'pending',
      submitted_by: providerId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await transitionBooking(booking, 'awaiting_quote_approval', 'provider', `Quote v${version} submitted: ${subtotal}`);
  await notifyUser(booking.customer_id, 'quote_available', 'Quote ready for approval', `Provider submitted a quote of ${subtotal} for ${booking.reference}.`);
  return data as BookingQuote;
}

export async function getQuotes(bookingId: string): Promise<BookingQuote[]> {
  const { data, error } = await supabase
    .from('booking_quotes')
    .select('*')
    .eq('booking_id', bookingId)
    .order('version', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as BookingQuote[];
}

export async function decideQuote(
  booking: Booking,
  quote: BookingQuote,
  approve: boolean,
  note?: string,
): Promise<void> {
  const customerId = await requireUserId();
  if (booking.customer_id !== customerId) throw new Error('Only the customer can decide on a quote.');
  if (quote.status !== 'pending') throw new Error('This quote has already been decided.');
  const { error } = await supabase
    .from('booking_quotes')
    .update({ status: approve ? 'approved' : 'rejected', decided_by: customerId, decided_at: new Date().toISOString(), decision_note: note ?? null })
    .eq('id', quote.id)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  if (approve) {
    // Update the booking's agreed price snapshot to the approved quote
    const snapshot = {
      ...(booking.price_snapshot as PriceSnapshot),
      labour: quote.subtotal,
      total: quote.subtotal,
      note: `Approved quote v${quote.version}`,
    };
    await supabase
      .from('bookings')
      .update({ price_snapshot: snapshot, total_estimate: quote.subtotal, final_amount: quote.subtotal })
      .eq('id', booking.id);
    await transitionBooking(booking, 'in_progress', 'customer', `Quote v${quote.version} approved`);
  }
  if (booking.provider_id) {
    await notifyUser(
      booking.provider_id,
      approve ? 'quote_approved' : 'quote_rejected',
      approve ? 'Quote approved' : 'Quote rejected',
      `Customer ${approve ? 'approved' : 'rejected'} quote v${quote.version} for ${booking.reference}.`,
    );
  }
}

// ─── Payments ────────────────────────────────────────────────────────────────

export async function submitPayment(
  booking: Booking,
  method: PaymentMethod,
  txnReference?: string | null,
  proof?: PickedImage | null,
): Promise<Payment> {
  const customerId = await requireUserId();
  if (booking.customer_id !== customerId) throw new Error('Only the customer can submit payment.');
  let proofPath: string | null = null;
  if (proof) {
    proofPath = await uploadImage('booking-photos', `payments/${booking.id}`, proof);
    await supabase.from('booking_attachments').insert({
      booking_id: booking.id,
      uploaded_by: customerId,
      storage_path: proofPath,
      kind: 'payment_proof',
    });
  }
  const status = method === 'cash' ? 'paid' : 'pending_verification';
  const { data, error } = await supabase
    .from('payments')
    .insert({
      reference: generatePaymentReference(),
      booking_id: booking.id,
      amount: booking.final_amount ?? booking.total_estimate,
      method,
      status,
      txn_reference: txnReference ?? null,
      proof_path: proofPath,
      submitted_by: customerId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await supabase.from('payment_events').insert({
    payment_id: (data as Payment).id,
    from_status: null,
    to_status: status,
    actor_id: customerId,
    note: method === 'cash' ? 'Cash paid on completion' : 'Manual transfer submitted for verification',
  });
  await supabase.from('bookings').update({ payment_status: status }).eq('id', booking.id);
  if (booking.provider_id) {
    await notifyUser(
      booking.provider_id,
      'payment_submitted',
      'Payment submitted',
      method === 'cash'
        ? `Customer marked cash as paid for ${booking.reference}.`
        : `Customer submitted ${method} payment for ${booking.reference} — pending verification.`,
    );
  }
  return data as Payment;
}

export async function getPayments(bookingId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Payment[];
}

// ─── Reviews & favorites ─────────────────────────────────────────────────────

export async function createReview(input: ReviewInput): Promise<Review> {
  const customerId = await requireUserId();
  const booking = await getBooking(input.booking_id);
  if (booking.customer_id !== customerId) throw new Error('You can only review your own bookings.');
  if (booking.status !== 'completed') throw new Error('You can review a booking only after it is completed.');
  if (!booking.provider_id) throw new Error('No provider assigned to this booking.');
  const { data: dup } = await supabase.from('reviews').select('id').eq('booking_id', input.booking_id).maybeSingle();
  if (dup) throw new Error('You have already reviewed this booking.');
  const { data, error } = await supabase
    .from('reviews')
    .insert({
      booking_id: input.booking_id,
      customer_id: customerId,
      provider_id: booking.provider_id,
      rating: input.rating,
      comment: input.comment ?? null,
      photos: input.photos ?? [],
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await notifyUser(booking.provider_id, 'review_received', 'New review', `Customer rated ${input.rating}/5 for ${booking.reference}.`);
  return data as Review;
}

export async function getMyReview(bookingId: string): Promise<Review | null> {
  const { data } = await supabase.from('reviews').select('*').eq('booking_id', bookingId).maybeSingle();
  return (data as Review | null) ?? null;
}

export async function getFavorites(): Promise<ProviderCard[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('favorites').select('provider_id').eq('customer_id', userId);
  if (error) throw new Error(error.message);
  const ids = ((data ?? []) as Favorite[]).map((f) => f.provider_id);
  if (!ids.length) return [];
  const { data: profiles, error: e2 } = await supabase
    .from('provider_profiles')
    .select('*, provider_services(is_active, custom_price, services!inner(id, name, category_id, base_price, pricing_model, is_active))')
    .in('user_id', ids)
    .eq('is_active', true);
  if (e2) throw new Error(e2.message);
  return ((profiles ?? []) as Array<ProviderProfile & { provider_services: Array<{ custom_price: number | null; services: ProviderCard['services'][number] }> }>).map((p) => {
    const services = p.provider_services.map((ps) => ({ ...ps.services, custom_price: ps.custom_price }));
    const prices = services.map((s) => s.custom_price ?? s.base_price).filter((x) => x > 0);
    return { profile: p, services, startingPrice: prices.length ? Math.min(...prices) : null };
  });
}

export async function isFavorite(providerId: string): Promise<boolean> {
  const userId = await requireUserId();
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('customer_id', userId)
    .eq('provider_id', providerId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleFavorite(providerId: string): Promise<boolean> {
  const userId = await requireUserId();
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('customer_id', userId)
    .eq('provider_id', providerId)
    .maybeSingle();
  if (data) {
    const { error } = await supabase.from('favorites').delete().eq('id', (data as { id: string }).id);
    if (error) throw new Error(error.message);
    return false;
  }
  const { error } = await supabase.from('favorites').insert({ customer_id: userId, provider_id: providerId });
  if (error) throw new Error(error.message);
  return true;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getNotifications(): Promise<AppNotification[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as AppNotification[];
}

export async function getUnreadCount(): Promise<number> {
  const userId = await requireUserId();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  if (error) throw new Error(error.message);
}

// ─── Support tickets ─────────────────────────────────────────────────────────

export async function createTicket(input: {
  bookingId?: string | null;
  category: string;
  priority: TicketPriority;
  description: string;
}): Promise<SupportTicket> {
  const reporterId = await requireUserId();
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      reference: generateTicketReference(),
      booking_id: input.bookingId ?? null,
      reporter_id: reporterId,
      category: input.category,
      priority: input.priority,
      description: input.description,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SupportTicket;
}

export async function getMyTickets(): Promise<SupportTicket[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

// ─── Provider onboarding & profile ───────────────────────────────────────────

export async function getMyProviderProfile(): Promise<ProviderProfile | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase.from('provider_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ProviderProfile | null) ?? null;
}

export async function getMyProviderServiceIds(): Promise<string[]> {
  const userId = await requireUserId();
  const { data } = await supabase.from('provider_services').select('service_id').eq('provider_id', userId).eq('is_active', true);
  return ((data ?? []) as { service_id: string }[]).map((r) => r.service_id);
}

export async function registerProvider(input: {
  displayName: string;
  bio?: string | null;
  experienceYears?: number | null;
  city: string;
  serviceIds: string[];
  areaIds: string[];
  documents: { type: string; image: PickedImage }[];
}): Promise<void> {
  const userId = await requireUserId();
  const existing = await getMyProviderProfile();
  if (existing) throw new Error('You already have a provider profile.');

  const docPaths: { document_type: string; storage_path: string }[] = [];
  for (const d of input.documents) {
    const path = await uploadImage('verification-docs', `providers/${userId}`, d.image);
    docPaths.push({ document_type: d.type, storage_path: path });
  }

  const { error: pErr } = await supabase.from('provider_profiles').insert({
    user_id: userId,
    display_name: input.displayName,
    bio: input.bio ?? null,
    experience_years: input.experienceYears ?? null,
    city: input.city,
    verification_status: 'pending',
    rating_avg: 0,
    rating_count: 0,
    completed_jobs: 0,
    is_active: true,
  });
  if (pErr) throw new Error(pErr.message);

  const { error: sErr } = await supabase
    .from('provider_services')
    .insert(input.serviceIds.map((sid) => ({ provider_id: userId, service_id: sid, is_active: true })));
  if (sErr) throw new Error(sErr.message);

  const { error: aErr } = await supabase
    .from('provider_service_areas')
    .insert(input.areaIds.map((aid) => ({ provider_id: userId, area_id: aid })));
  if (aErr) throw new Error(aErr.message);

  for (const d of docPaths) {
    const { error: dErr } = await supabase.from('provider_verification_documents').insert({
      provider_id: userId,
      document_type: d.document_type,
      storage_path: d.storage_path,
      status: 'pending',
    });
    if (dErr) throw new Error(dErr.message);
  }
}

export async function updateProviderProfile(patch: {
  display_name?: string;
  bio?: string | null;
  city?: string;
  experience_years?: number | null;
  working_hours?: ProviderProfile['working_hours'];
}): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('provider_profiles').update(patch).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function getBlockedDates(providerId: string): Promise<{ id: string; blocked_date: string; reason: string | null }[]> {
  const { data, error } = await supabase
    .from('provider_blocked_dates')
    .select('id, blocked_date, reason')
    .eq('provider_id', providerId)
    .gte('blocked_date', new Date().toISOString().slice(0, 10))
    .order('blocked_date');
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; blocked_date: string; reason: string | null }[];
}

export async function addBlockedDate(blockedDate: string, reason?: string | null): Promise<void> {
  const userId = await requireUserId();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(blockedDate)) throw new Error('Date must be YYYY-MM-DD.');
  if (blockedDate < new Date().toISOString().slice(0, 10)) throw new Error('Cannot block a past date.');
  const { error } = await supabase
    .from('provider_blocked_dates')
    .insert({ provider_id: userId, blocked_date: blockedDate, reason: reason ?? null });
  if (error) throw new Error(error.message);
}

export async function removeBlockedDate(id: string): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('provider_blocked_dates').delete().eq('id', id).eq('provider_id', userId);
  if (error) throw new Error(error.message);
}

export async function getProviderSettlements(providerId: string): Promise<ProviderSettlement[]> {
  const { data, error } = await supabase
    .from('provider_settlements')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProviderSettlement[];
}

// ─── Profile & preferences ───────────────────────────────────────────────────

export async function updateProfile(patch: { full_name?: string; email?: string | null }): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function getNotificationPrefs(): Promise<{ booking_updates: boolean; promotions: boolean }> {
  const userId = await requireUserId();
  const { data } = await supabase.from('notification_preferences').select('*').eq('user_id', userId).maybeSingle();
  const row = data as { booking_updates: boolean; promotions: boolean } | null;
  return { booking_updates: row?.booking_updates ?? true, promotions: row?.promotions ?? false };
}

export async function setNotificationPrefs(prefs: { booking_updates: boolean; promotions: boolean }): Promise<void> {
  const userId = await requireUserId();
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ user_id: userId, ...prefs }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export type { VerificationStatus };
