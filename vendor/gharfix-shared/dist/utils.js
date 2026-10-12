"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIME_SLOTS = exports.ACTIVE_BOOKING_STATUSES = exports.TERMINAL_BOOKING_STATUSES = void 0;
exports.normalizePkPhone = normalizePkPhone;
exports.isValidPkPhone = isValidPkPhone;
exports.maskPhone = maskPhone;
exports.formatPKR = formatPKR;
exports.toPaisa = toPaisa;
exports.fromPaisa = fromPaisa;
exports.calculateCommission = calculateCommission;
exports.buildPriceSnapshot = buildPriceSnapshot;
exports.canTransitionBooking = canTransitionBooking;
exports.assertTransitionBooking = assertTransitionBooking;
exports.canTransitionPayment = canTransitionPayment;
exports.canCancelBooking = canCancelBooking;
exports.generateBookingReference = generateBookingReference;
exports.generatePaymentReference = generatePaymentReference;
exports.generateSettlementReference = generateSettlementReference;
exports.generateTicketReference = generateTicketReference;
exports.generateIdempotencyKey = generateIdempotencyKey;
exports.isFutureDateTime = isFutureDateTime;
exports.averageRating = averageRating;
/**
 * Shared business-logic utilities. Pure functions — safe to use anywhere.
 */
var constants_1 = require("./constants");
// ─── Pakistani phone numbers ────────────────────────────────────────────────
/** Normalize to +92XXXXXXXXXX. Throws on invalid input. */
function normalizePkPhone(input) {
    var digits = input.replace(/[\s\-()]/g, '');
    if (!constants_1.PK_MOBILE_REGEX.test(digits)) {
        throw new Error('Invalid Pakistani mobile number');
    }
    if (digits.startsWith('+92'))
        return digits;
    if (digits.startsWith('92'))
        return '+' + digits;
    if (digits.startsWith('0'))
        return '+92' + digits.slice(1);
    return '+92' + digits; // starts with '3...'
}
function isValidPkPhone(input) {
    try {
        normalizePkPhone(input);
        return true;
    }
    catch (_a) {
        return false;
    }
}
/** Mask for display before address/contact is authorized: +92 300 •••4567 */
function maskPhone(normalized) {
    if (!constants_1.PK_MOBILE_NORMALIZED_REGEX.test(normalized))
        return '•••';
    return "".concat(normalized.slice(0, 6), " \u2022\u2022\u2022").concat(normalized.slice(-4));
}
// ─── Money ───────────────────────────────────────────────────────────────────
function formatPKR(amount) {
    var rounded = Math.round(amount);
    return "PKR ".concat(rounded.toLocaleString('en-PK'));
}
/** Round to 2dp using integer paisa math to avoid float drift. */
function toPaisa(pkr) {
    return Math.round(pkr * 100);
}
function fromPaisa(paisa) {
    return paisa / 100;
}
/** Commission is taken on labour only (materials pass through to provider). */
function calculateCommission(labour, rate) {
    if (rate === void 0) { rate = constants_1.DEFAULT_COMMISSION_RATE; }
    if (labour < 0)
        throw new Error('Labour cannot be negative');
    if (rate < 0 || rate > 1)
        throw new Error('Commission rate must be between 0 and 1');
    var commission = fromPaisa(Math.round(toPaisa(labour) * rate));
    return { labour: labour, rate: rate, commission: commission, providerNet: fromPaisa(toPaisa(labour) - toPaisa(commission)) };
}
function buildPriceSnapshot(input) {
    var _a, _b, _c, _d, _e, _f, _g;
    var labour = (_a = input.labour) !== null && _a !== void 0 ? _a : 0;
    var materials = (_b = input.materials) !== null && _b !== void 0 ? _b : 0;
    var inspectionFee = (_c = input.inspectionFee) !== null && _c !== void 0 ? _c : 0;
    var serviceFee = (_d = input.serviceFee) !== null && _d !== void 0 ? _d : 0;
    var discount = (_e = input.discount) !== null && _e !== void 0 ? _e : 0;
    for (var _i = 0, _h = Object.entries({ labour: labour, materials: materials, inspectionFee: inspectionFee, serviceFee: serviceFee, discount: discount }); _i < _h.length; _i++) {
        var _j = _h[_i], k = _j[0], v = _j[1];
        if (v < 0)
            throw new Error("".concat(k, " cannot be negative"));
    }
    var subtotal = labour + materials + inspectionFee + serviceFee;
    var total = Math.max(0, subtotal - discount);
    var rate = (_f = input.commissionRate) !== null && _f !== void 0 ? _f : constants_1.DEFAULT_COMMISSION_RATE;
    var _k = calculateCommission(labour, rate), commission = _k.commission, providerNet = _k.providerNet;
    var providerPayable = fromPaisa(toPaisa(providerNet) + toPaisa(materials));
    return {
        labour: labour,
        materials: materials,
        inspection_fee: inspectionFee,
        service_fee: serviceFee,
        discount: discount,
        subtotal: subtotal,
        commission_rate: rate,
        commission_amount: commission,
        provider_payable: providerPayable,
        total: total,
        currency: 'PKR',
        pricing_model: input.pricingModel,
        note: (_g = input.note) !== null && _g !== void 0 ? _g : null,
    };
}
// ─── Booking state machine ───────────────────────────────────────────────────
function canTransitionBooking(from, to, actorRole) {
    var _a, _b;
    if (!((_a = constants_1.BOOKING_TRANSITIONS[from]) !== null && _a !== void 0 ? _a : []).includes(to))
        return false;
    var actors = (_b = constants_1.BOOKING_TRANSITION_ACTORS["".concat(from, ">").concat(to)]) !== null && _b !== void 0 ? _b : [];
    return actors.includes(actorRole);
}
function assertTransitionBooking(from, to, actorRole) {
    var _a, _b;
    if (!((_a = constants_1.BOOKING_TRANSITIONS[from]) !== null && _a !== void 0 ? _a : []).includes(to)) {
        throw new Error("Invalid booking transition: ".concat(from, " \u2192 ").concat(to));
    }
    var actors = (_b = constants_1.BOOKING_TRANSITION_ACTORS["".concat(from, ">").concat(to)]) !== null && _b !== void 0 ? _b : [];
    if (!actors.includes(actorRole)) {
        throw new Error("Role '".concat(actorRole, "' may not transition booking ").concat(from, " \u2192 ").concat(to));
    }
}
function canTransitionPayment(from, to) {
    var _a;
    return ((_a = constants_1.PAYMENT_TRANSITIONS[from]) !== null && _a !== void 0 ? _a : []).includes(to);
}
exports.TERMINAL_BOOKING_STATUSES = ['completed', 'cancelled'];
exports.ACTIVE_BOOKING_STATUSES = [
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
function canCancelBooking(status) {
    return !exports.TERMINAL_BOOKING_STATUSES.includes(status);
}
// ─── References & idempotency ────────────────────────────────────────────────
// NOTE: Math.random-based on purpose — keeps this package dependency-free and
// working in Node, browsers and React Native (no crypto/global polyfill needed).
// These are reference numbers and idempotency keys, not security tokens.
function randomSuffix(len) {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < len; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}
function generateBookingReference() {
    return "".concat(constants_1.BOOKING_REFERENCE_PREFIX, "-").concat(randomSuffix(6));
}
function generatePaymentReference() {
    return "".concat(constants_1.PAYMENT_REFERENCE_PREFIX, "-").concat(randomSuffix(6));
}
function generateSettlementReference() {
    return "".concat(constants_1.SETTLEMENT_REFERENCE_PREFIX, "-").concat(randomSuffix(6));
}
function generateTicketReference() {
    return "".concat(constants_1.TICKET_REFERENCE_PREFIX, "-").concat(randomSuffix(6));
}
function generateIdempotencyKey() {
    var hex = function (n) {
        var s = '';
        for (var i = 0; i < n; i++)
            s += '0123456789abcdef'[Math.floor(Math.random() * 16)];
        return s;
    };
    return "".concat(hex(8), "-").concat(hex(4), "-4").concat(hex(3), "-").concat('89ab'[Math.floor(Math.random() * 4)]).concat(hex(3), "-").concat(hex(12));
}
exports.DEFAULT_TIME_SLOTS = [
    { start: '09:00', end: '11:00', label: '9:00 AM – 11:00 AM' },
    { start: '11:00', end: '13:00', label: '11:00 AM – 1:00 PM' },
    { start: '13:00', end: '15:00', label: '1:00 PM – 3:00 PM' },
    { start: '15:00', end: '17:00', label: '3:00 PM – 5:00 PM' },
    { start: '17:00', end: '19:00', label: '5:00 PM – 7:00 PM' },
];
/** True if the datetime is in the future (Asia/Karachi wall-clock check kept simple). */
function isFutureDateTime(iso) {
    var t = new Date(iso).getTime();
    return Number.isFinite(t) && t > Date.now();
}
/** Average rating rounded to 1 decimal from a list of 1..5 ratings. */
function averageRating(ratings) {
    if (ratings.length === 0)
        return 0;
    var sum = ratings.reduce(function (a, b) { return a + b; }, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
}
