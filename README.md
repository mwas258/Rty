# Arbitrage Finder Pro

A mobile-first, production-oriented sports arbitrage **analysis** application: live scanner, two/three-way calculator,
bookmaker directory, watchlist, de-duplicated alerts, history, subscriptions and an admin console.

> Arbitrage Finder Pro shows **theoretical** opportunities. Odds move, bookmakers limit or void bets and fees apply.
> Nothing in this product is a guaranteed return.

---

## 1. Stack & documented deviations from the original brief

| Requested | Implemented | Why |
| --- | --- | --- |
| React + Vite + React Router | **Next.js 16 App Router** (React 19, TypeScript, Tailwind v4) | The development environment is a Next.js + PostgreSQL template. App Router provides file-based routing, server-rendered auth gating and co-located API route handlers. |
| Supabase Auth / RLS | **Self-hosted session auth** (scrypt password hashes, httpOnly cookies, TOTP MFA) + **server-side authorization in the data-access layer** | No Supabase project is available in this environment. Every API route authorises by the session user; `supabase/policies.sql` contains equivalent RLS policies if you deploy the same schema to Supabase. |
| TanStack Query, React Hook Form, Zod | ✅ used as requested | — |
| PWA | ✅ `public/manifest.webmanifest`, `public/sw.js` (app-shell cache + offline page, API never cached) | — |

The arbitrage engine (`src/lib/arb/engine.ts`), DTO types (`src/lib/types.ts`), validation schemas (`src/lib/validation.ts`) and the
plan catalogue (`src/lib/plans.ts`) are framework-agnostic and can be shared with a future React Native app.

## 2. Quick start

```bash
cp .env.example .env            # edit DATABASE_URL / AUTH_SECRET at minimum
npm install
npm run db:migrate              # applies ./drizzle/*.sql (also runs automatically on server start)
npm run db:seed                 # reference data, demo accounts, first odds refresh
npm run dev                     # http://localhost:3000
npm test                        # vitest: engine, auth primitives, rate limiter
```

Seeded accounts (only created when the `profiles` table is empty — change the passwords via env before deploying):

| Role | E-mail | Password |
| --- | --- | --- |
| Admin | `admin@arbitragefinder.pro` (`SEED_ADMIN_EMAIL`) | `Admin12345!` (`SEED_ADMIN_PASSWORD`) |
| User | `demo@arbitragefinder.pro` (`SEED_DEMO_EMAIL`) | `Demo12345!` (`SEED_DEMO_PASSWORD`) |

Without `ODDS_API_KEY` the app runs in **demo mode**: a deterministic seeded provider generates clearly-labelled sample odds
that drift every 5 minutes so the scanner, alerts and history exhibit real state transitions.

## 3. Environment variables

See `.env.example`. Summary:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ (prod) | Encrypts MFA secrets; falls back to an insecure dev value with a warning |
| `APP_URL` | ✅ | Public origin for e-mail links & OAuth redirect URIs |
| `SEED_*` | optional | First-run accounts |
| `ODDS_PROVIDER`, `ODDS_API_KEY`, `ODDS_API_SPORTS`, `ODDS_API_REGIONS`, `ODDS_API_MARKETS`, `ODDS_REFRESH_INTERVAL_SEC` | optional | Licensed provider (The Odds API v4 adapter). Missing key → demo mode |
| `CRON_SECRET` | optional | Enables `POST /api/cron/refresh` for external schedulers |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | Shows “Continue with Google”. Redirect URI: `${APP_URL}/api/auth/google/callback` |
| `RESEND_API_KEY`, `EMAIL_FROM` | optional | Transactional e-mail (verification, reset, alerts). Without it, verification/reset links are returned to the UI (“dev links”) |
| `TELEGRAM_BOT_TOKEN` | optional | Telegram alert channel |
| `STRIPE_SECRET_KEY` | reserved | **Not integrated.** Payments are disabled until availability/legal requirements are verified |
| `ENABLE_FRAME_PROTECTION` | optional | Adds `X-Frame-Options: DENY` / `frame-ancestors 'none'` (off by default so embedded previews work) |

**Integration status in this environment:** no odds-provider key, Google, Resend, Telegram or payment credentials are configured.
The corresponding adapters are implemented against public documentation but have **not** been exercised here; features stay hidden
or disabled until the variables are set.

## 4. Architecture

```
src/
  app/                      Next.js routes
    (auth)/                 login, register, forgot/reset password (redirects signed-in users)
    verify-email/           e-mail verification landing page
    app/                    protected product screens (layout checks the session server-side)
    admin/                  protected admin console (role = admin)
    api/                    route handlers (auth, opportunities, scan, bookmakers, watchlist, alerts,
                            notifications, history, export, profile, preferences, subscription,
                            saved-filters, activity, cron, admin/*)
  components/               design system (ui/*), app shell, opportunity cards/tables, calculator
  db/schema.ts              Drizzle schema (19 tables, indexes, constraints)
  db/seed.ts                reference data, demo accounts, demo history
  lib/arb/engine.ts         pure arbitrage math + detection + freshness/odds-movement warnings
  lib/auth/*                scrypt passwords, AES-GCM secret encryption, sessions, single-use tokens, TOTP
  lib/providers/*           OddsProvider interface, DemoOddsProvider, TheOddsApiProvider
  lib/services/sync.ts      ingest → dedupe → markets → odds snapshots → opportunity detection → expiry → retention
  lib/services/alerts.ts    rule matching, de-duplicated notifications, external channel dispatch, stale alerts
  lib/services/*.ts         opportunity queries/facets, dashboard, user helpers
  lib/entitlements.ts       server-side plan checks (free/premium, trials, admin entitlements)
  instrumentation.ts        startup: migrate → seed → warm odds cache
drizzle/                    SQL migrations (generated with drizzle-kit)
supabase/policies.sql       RLS policies for Supabase deployments
```

### Arbitrage engine
For decimal odds `o1..on`: `S = Σ 1/oᵢ`; theoretical arbitrage when `S < 1`; `margin = (1 − S) × 100%`;
`stakeᵢ = T × (1/oᵢ) / S`; `gross returnᵢ = stakeᵢ × oᵢ`; `profitᵢ = gross returnᵢ − total staked`.
Net profit subtracts commission on winnings (exchange style), FX/payment % of the outlay and fixed costs, and reports the
**worst-case** outcome. Rounding (nearest/down/up to a step), minimum-stake warnings, odds-movement and stale-data warnings are included.
Tests: `src/lib/arb/engine.test.ts` (two-way, three-way, invalid odds, S = 1 boundary, rounding, fees, detection, warnings).

### Odds data flow
1. `getOddsProvider()` picks `TheOddsApiProvider` (when `ODDS_API_KEY` is set) or `DemoOddsProvider`.
2. `runSync()` respects the provider interval (manual refreshes are throttled; admins may force), backs off after errors,
   normalizes events/markets/outcomes/bookmakers, de-duplicates events by `sport|home|away|kick-off hour`,
   stores odds snapshots (`is_latest` flag + history), detects opportunities with the engine, expires vanished ones
   (`odds_moved`, `not_offered`, `event_started`) and records `provider_runs` (duration, counts, quota headers).
3. `evaluateAlerts()` matches changes against enabled rules (plan limits enforced), inserting notifications with a unique
   `(user_id, dedupe_key)` so duplicates are impossible. Stale-data alerts fire once per staleness episode.
4. Retention (hourly): snapshots 30 d, expired opportunities 180 d, notifications 90 d, activity/audit 365 d, provider runs & error logs 30 d.

### Entitlements
`src/lib/plans.ts` defines limits (scanner size, advanced filters, alert rules, watchlist, saved filters, history days, CSV export,
calculators, external channels, dashboard customisation). Every API route re-checks entitlements server-side
(`getEntitlements`, `assertWithinLimit`, `assertFeature`). A one-time 14-day trial is available while payments are not configured;
admins can grant Premium manually.

### Security
- Passwords: scrypt (N=16384, r=8, p=1), per-user salt, constant-time comparison, dummy hash on unknown e-mails.
- Sessions: random 256-bit token, SHA-256 stored, httpOnly/SameSite=Lax cookie, 30-day (or 1-day) expiry, per-device revocation.
- Tokens (verify/reset/MFA challenge): single-use, hashed, time-limited; MFA challenge attempts capped at 5.
- MFA: TOTP (RFC 6238), secret encrypted with AES-256-GCM derived from `AUTH_SECRET`; admin can reset a locked-out user.
- Rate limiting on register/login/MFA/reset/refresh (in-memory sliding window — swap for Redis across multiple instances).
- RBAC: `role` column; admins cannot change their own role/status; all admin actions audited.
- Headers: CSP, nosniff, referrer-policy, permissions-policy (`next.config.ts`).
- Logging redacts password/token/secret/cookie keys; unhandled API errors are stored in `error_logs` for the admin console.
- Secrets are only read server-side (`src/lib/env.ts`); the browser bundle never receives provider keys.

## 5. Database

Tables: `profiles`, `sessions`, `auth_tokens`, `user_preferences`, `bookmakers`, `user_bookmakers`, `sports`, `events`, `markets`,
`odds_snapshots`, `opportunities`, `watchlist`, `alert_rules`, `notifications`, `subscriptions`, `saved_filters`, `user_activity`,
`audit_logs`, `feature_flags`, `provider_runs`, `error_logs`.

- Migrations: `npm run db:generate` (after editing `src/db/schema.ts`) → `npm run db:migrate`. The server also applies pending
  migrations on boot (`src/lib/bootstrap.ts`). `npm run db:push` is available for quick local iteration.
- Unique constraints: lower-cased e-mail, session token hash, event fingerprint, `(event, market, line)`, `(market)` per opportunity,
  `(user, opportunity)` watchlist, `(user, dedupe_key)` notifications.
- Access control: application-level (every query scoped by the session user); `supabase/policies.sql` mirrors this as RLS.

## 6. Deployment

1. Provision PostgreSQL 15+ and set `DATABASE_URL`, `AUTH_SECRET` (32+ random bytes), `APP_URL`.
2. `npm ci && npm run build && npm run start` (or deploy to any Node host / container). Migrations run on first boot.
3. Schedule `POST /api/cron/refresh` with `Authorization: Bearer $CRON_SECRET` at your provider interval (the endpoint itself respects
   `ODDS_REFRESH_INTERVAL_SEC`, so over-scheduling is safe).
4. Configure optional integrations (odds provider, Resend, Google OAuth, Telegram) and set `ENABLE_FRAME_PROTECTION=true` when the app
   is not embedded in an iframe.
5. Put the app behind HTTPS; the session cookie becomes `Secure` automatically when `APP_URL` starts with `https://`.
6. For multi-instance deployments move the rate limiter and the in-process sync lock to Redis/advisory locks.

## 7. Roadmap / not yet implemented

- Payment provider (Stripe/Paddle) checkout and webhooks — blocked on availability & legal verification.
- Web Push notifications (VAPID) — in-app, e-mail and Telegram channels exist.
- MFA recovery codes (admins can reset MFA today).
- Provider-supplied liquidity/limits (not available from the current provider; surfaced as a note in the UI).
- React Native client reusing `src/lib/arb`, `src/lib/types`, `src/lib/validation` and the REST API.
