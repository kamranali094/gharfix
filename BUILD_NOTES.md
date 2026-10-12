# GharFix Mobile App — Build Notes

Single Expo (SDK 52) codebase with role-based navigation for customers and providers.
TypeScript strict, expo-router file-based routing, Supabase backend, `@gharfix/shared`
for brand tokens, schemas, and business logic.

## What was built

### Root config
- `package.json` — name `gharfix-mobile`; scripts `start`, `android`, `ios`, `typecheck`;
  deps: expo ~52, expo-router ~4, react-native, @supabase/supabase-js, @gharfix/shared
  (workspace `*`), zod, @react-native-async-storage/async-storage, expo-notifications,
  expo-image-picker, expo-secure-store, react-native-svg, react-native-url-polyfill.
- `app.json` — GharFix, slug `gharfix`, android package `com.gharfix.app`, brand green splash/adaptive icon.
- `babel.config.js`, `metro.config.js` (maps `@gharfix/shared` → `packages/shared/src`
  so the app bundles even before `packages/shared/dist` is built; watches shared src).
- `tsconfig.json` — strict, extends `expo/tsconfig.base`, path-maps `@gharfix/shared`.
- `.env.example` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  `EXPO_PUBLIC_OTP_DEV_MODE`. **No secrets, no service-role key.**

### Design system — `components/ui/`
`Button` (primary/secondary/danger/ghost + loading/disabled), `TextInput` (label,
error, focus), `Card`, `Badge`/`BookingBadge` (status color **and** text label —
never color alone), `RatingStars`, `PriceSummary`/`PriceRow` (PKR via `formatPKR`,
quotation notice), `EmptyState`, `LoadingSkeleton`, `ErrorState` (retry),
`ConfirmDialog`, `SearchBar`, `SectionHeader`, `Logo` (hand-drawn SVG home + checkmark
mark, icon-only `LogoMark` and horizontal `LogoHorizontal`). All use `BRAND` colors.

### Lib — `lib/`
- `supabase.ts` — client with AsyncStorage session persistence; anon key only.
- `auth.tsx` — `AuthProvider`: session, `profiles` row (role source of truth), `signOut`.
- `locale.tsx` — en/ur toggle persisted, wraps shared `t()`/`isRtl()`.
- `api.ts` — typed wrappers for catalog, addresses, bookings (idempotent create via
  `generateIdempotencyKey()` + resume-safe lookup), transitions (client pre-validated
  with `canTransitionBooking`; server/RLS authoritative), quotes, payments, reviews,
  favorites, notifications, tickets, provider onboarding/availability/earnings, uploads
  (size/MIME validated with shared `uploadMetaSchema`).

### Routing — `app/`
- `_layout.tsx` (providers + Stack), `index.tsx` (splash: logo, tagline, routes by
  session/role), `onboarding.tsx` (3 slides, skip, persisted flag).
- `(auth)/`: `phone.tsx` (PK validation via `pkPhoneSchema` + `normalizePkPhone`),
  `otp.tsx` (dev-mode `123456` accepted **with DEV ONLY banner**; otherwise
  `verifyOtp`, honest “SMS provider not configured” surfacing), `role.tsx`
  (customer/provider choice → creates `profiles` row + provider stub).
- `(customer)/` tabs (Home, Bookings, Favorites, Profile; role guard) + hidden screens:
  `index` (address selector, search, promo slot, categories grid from
  `service_categories`, popular services, recent bookings, rebook shortcut, help),
  `search` (category/rating/max-price filters), `provider/[id]` (verified badge **only**
  when `verification_status === 'approved'`; services, reviews, Book Now, working report
  → support ticket), `book/[serviceId]` (7-step flow: service → describe+photos →
  address (validated by `addressSchema`) → schedule (ASAP or next-14-days +
  `DEFAULT_TIME_SLOTS`, no past dates) → provider/auto-assign → price via
  `buildPriceSnapshot` with quotation notice → review → idempotent confirm showing
  booking reference), `bookings` (Upcoming/In Progress/Completed/Cancelled tabs),
  `booking/[id]` (timeline from `booking_status_history`, quote approve/reject,
  manual payment submit w/ proof, cancel per policy, review after completed, complaint
  → ticket), `favorites`, `addresses` (CRUD), `notifications` (read/unread),
  `support` (static FAQ + ticket create/list), `profile` (edit, en/ur toggle,
  notification prefs, logout, deletion request → ticket).
- `(provider)/` tabs (Dashboard, Jobs, Earnings, Profile; role guard) + hidden screens:
  `index` (verification banner — “Verified” only when approved; new requests, today's
  schedule, in-progress, month earnings, rating — all from real queries), `register`
  (`providerRegistrationSchema` + CNIC docs → private `verification-docs` bucket →
  status `pending`), `jobs` (Requests/Active/Completed tabs; open requests = assigned
  pending + unassigned in my categories), `job/[id]` (action buttons gated by
  `canTransitionBooking` for role `provider`; itemized quote submit; customer phone
  masked until acceptance), `availability` (working hours editor with HH:MM validation,
  blocked dates), `earnings` (per-booking gross/commission/net + settlements),
  `profile` (edit, support tickets, logout), `notifications` (deep-links to jobs).

Every screen has loading / empty / error states. No dead buttons: report-profile,
max-price filter, rebook, help entries, and privacy/terms rows all do something real.

## File tree
```
apps/mobile/
  app.json  babel.config.js  metro.config.js  tsconfig.json
  package.json  .env.example  BUILD_NOTES.md
  lib/            supabase.ts  auth.tsx  locale.tsx  api.ts
  components/ui/  Button TextInput Card Badge RatingStars PriceSummary
                  EmptyState LoadingSkeleton ErrorState ConfirmDialog
                  SearchBar SectionHeader Logo
  app/
    _layout.tsx  index.tsx  onboarding.tsx
    (auth)/      _layout.tsx  phone.tsx  otp.tsx  role.tsx
    (customer)/  _layout.tsx  index.tsx  search.tsx  bookings.tsx
                 favorites.tsx  addresses.tsx  notifications.tsx
                 support.tsx  profile.tsx
                 provider/[id].tsx  book/[serviceId].tsx  booking/[id].tsx
    (provider)/  _layout.tsx  index.tsx  register.tsx  jobs.tsx
                 earnings.tsx  availability.tsx  profile.tsx  notifications.tsx
                 job/[id].tsx
```

## Still needs real credentials / external setup
1. **Supabase project** — copy `.env.example` → `.env`, set
   `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Run the backend
   migrations + RLS policies (backend agent's deliverable) and create the storage
   buckets: `booking-photos` (access-controlled), `verification-docs` (**private**),
   plus `avatars` if used. Seed categories/services/areas.
2. **OTP/SMS provider** — configure a phone auth provider in Supabase (e.g. Twilio
   Verify) or sign-in is impossible; dev mode (`EXPO_PUBLIC_OTP_DEV_MODE=true`)
   only previews the OTP UI with `123456` and honestly reports that no session is created.
3. **Expo push** — `expo-notifications` is wired at the dependency level; obtaining a
   push token and sending pushes needs `EXPO_PUSH_ACCESS_TOKEN` and a sender
   (server/edge function). In-app notifications already work via the `notifications` table.
4. **First run** — `npm install` at repo root (coordinator), then `npx expo start`;
   `npm run typecheck` in `apps/mobile`.

## Known limitations / unverifiable items
- **Not typechecked or run**: coordinator runs the single root `npm install` at the end;
  `tsc --noEmit` and `expo start` were not executed here. A syntax sanity pass was done
  (see below); full typecheck + on-device testing still required.
- **Privileged logic lives client-side for the MVP** (price snapshots, transitions,
  quote versioning). RLS + server-side functions/edge functions (backend agent) must be
  the authority before production; the client pre-validates only.
- `searchProviders`/`getFavorites` filter partly client-side after a bounded fetch —
  fine for launch volumes; move to server-side search at scale.
- `providerRegistrationSchema` requires `phone`; the app passes a dummy value because
  the real phone comes from the auth profile (documented in code).
- Promo banner on the customer home is a static slot until platform-settings-driven
  promos exist; privacy/terms rows show the production URLs as placeholders.
- Push-notification permission flow / token registration is not yet implemented
  (in-app center is complete).
- RTL: `I18nManager.forceRTL` is applied on Urdu toggle (takes effect on reload);
  full RTL QA of every screen still to do.
