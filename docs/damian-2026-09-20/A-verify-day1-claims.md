# A. Verification of the developer's claimed fixes (2026-09-20)
Reviewer model: Claude Fable 5.1 (`claude-fable-5-1`)
Range reviewed: 7669afe..43732ea (56 commits, 228 files, `main`, clean tree, HEAD confirmed `43732eadc20411d15d3c4fca9d8fafa6d55c3add`)
Tests present: **no.** `find` for `*.test.*`, `*.spec.*`, `vitest.config.*`, `jest.config.*`, `playwright.config.*` (excluding `node_modules`) returns nothing; `package.json:5-12` scripts are `dev/build/start/postinstall/prisma:migrate/prisma:studio` only; no test runner in `devDependencies` (`package.json:26-37`). Every "Test" cell below is therefore "none". Nothing in this review was proven by execution; everything is read evidence.

Prior review read in full: `/Users/damianbaca/Claude Workspace/projects/retrackthis/code reviews/2026-09-04-codebase-review/E-critic-consolidated.md` (566 lines). Note the folder is `code reviews/`, not `reviews/` as the brief says.

Read-only: no file inside `site/` was created, edited, or deleted. Only `git show`, `git log`, `git diff`, `grep`, `sed`, `cat`, and one `node -e` URL-parsing check were run.

## Scorecard

| # | Claim | Verdict | Closes | Quality | Test |
|---|---|---|---|---|---|
| 1 | Takes listing auth | **FIXED** | E-2 in full (403 instead of the suggested 404) | acceptable: inline in the one route, no shared owner-or-admin helper | none |
| 2 | Upload signer | **PARTIAL** | E-4: auth and per-user path yes; "file types restricted" is materially untrue (`application/octet-stream` allowed); no throttle. Regresses E-3 hygiene (now forces `public: true` on every request) | fragile | none |
| 3 | Buyer ≠ seller | **FIXED** | E-1 guard-only (the two-line part). Price ceiling, payout delay, Customer/Radar, dispute handler: not done | clean for the guard (lives in `lib/jobActions.ts`, both award paths inherit it) | none |
| 5 | Relative `next` param | **FIXED-BUT-FRAGILE** | E-17 closed on sign-in, sign-up, Google button. `app/auth/callback` uses a weaker inline check that lets `next=/\evil.com` redirect off-site (proven with node, see item) | fragile | none |
| 6 | Storage URL prefix | **FIXED** | E-5 on all three write paths. Fix direction not fully met: no binding to the caller's own user segment, no per-job dedupe | acceptable: shared helper, but each route must remember to call it (two call it via `await import`) | none |
| 7 | Seed script guards | **FIXED-BUT-FRAGILE** | E-21 mostly. Guard is a hostname denylist that does not match Supabase direct hosts (`db.<ref>.supabase.co`); `testpass123` fallback still in code; `prisma.seed` hook still present | fragile | none |
| 8 | Deadline validation | **FIXED-BUT-FRAGILE** (claim inaccurate) | E-15 Day-1 scope as the review asked. Effective cap is **3 days**, not 7; the 7-day check is unreachable dead code; the form's default deadline (7) is rejected by the server | fragile | none |
| 9 | Admin confirmed email | **FIXED** | E-16 | acceptable: same logic copy-pasted in `lib/admin.ts` and `app/api/auth/me` | none |
| 10 | Webhook status guards | **PARTIAL** | E-25 webhook half only. The claimed "payment status transitions hardened" (E-12) is **NOT FIXED**: same `findFirst` → `update`, still no `@unique` on the PI id. Onboard half of E-25 not fixed | acceptable | none |
| 11 | Instruments + errors | **PARTIAL** | E-33 closed. E-31: only `uploads/sign` sanitized; `select-winner`, `connect/onboard`, `connect/dashboard`, `uploads/preview`, `jobs` POST still echo raw error text | acceptable | none |
| RLS | Supabase RLS lockdown | **FIXED** (needs runtime) | E-7 | fragile for the next table: no `ALTER DEFAULT PRIVILEGES`, so a future `prisma migrate` that adds a table reopens the hole unless the Data API is also off | none |
| SSO | Google SSO | **FIXED** (feature, not a fix) | touches E-16/E-17/E-20; see #5 callback gap | acceptable | none |
| hello@ | RESEND_REPLY_TO → hello@ | **FIXED** | E-19 reply-to half. Founder addresses still hard-coded in `lib/admin.ts:5`; README `:124` still says inbound goes to a personal Gmail | clean | none |
| Pool | DB pool fix | **FIXED** (config; needs runtime) | ops item, not an E finding | acceptable: the URL lives only in Vercel env; `schema.prisma` has no `directUrl`, so migrations through the transaction pooler are a known Prisma footgun | none |

Totals: FIXED 8 · PARTIAL 3 · NOT FIXED 0 · FIXED-BUT-FRAGILE 3. (Three of the eight FIXED are runtime-conditional: RLS, pool, SSO provider config.)

One structural note that applies to every auth item: `middleware.ts:32-36` gates only `/producers`, `/settings`, `/dashboard`, `/admin` page paths. Nothing gates `/api/*`. Every API route must call `getSessionUserId()` itself, so a new route added next month inherits **nothing**; the developer has to remember. That is the same shape that produced E-2 and E-4 in the first place.

## Item-by-item evidence

### #1 Takes listing auth — FIXED
- Routes needing the control: `GET /api/jobs/:jobId/takes` (the only takes-listing route). `GET /api/takes/mine` (own takes only, `takes/mine/route.ts:8-14`, covered). Admin panel uses the same takes GET as admin (`app/admin/AdminJobsPanel.tsx:251`, covered by the admin branch).
- Where: `app/api/jobs/[jobId]/takes/route.ts:252-275`
  ```
  252  export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  253    const sessionUserId = await getSessionUserId();
  254    if (!sessionUserId) {
  255      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  256    }
  ...
  267    const isCreator = job.creatorId === sessionUserId;
  268    if (!isCreator) {
  269      const { getAdminUser } = await import("@/lib/admin");
  270      const admin = await getAdminUser();
  271      if (!admin) {
  272        return NextResponse.json({ error: "Not authorized to listen to these takes" }, { status: 403 });
  ```
  Masters are additionally hidden until `AWARDED` for the creator (`:283-295`, `exposeMasters = isAdmin || (jobAwarded && take.isWinner)`), and `GET /api/jobs` gives anonymous callers only `takeCount`/`hasSelectedWinner` (`app/api/jobs/route.ts:313-319`).
- Gap / bypass risk: 403 (not the suggested 404) confirms job existence to non-owners; harmless since job ids are public anyway. The response still spreads `...take` (`:291`) which includes `note`, `musicianId`, `humanAttestedAt`; fine for the creator. The real residual risk is E-3: the URLs this route now hides are still public objects (see E-3 below).
- Quality: acceptable. The owner-or-admin check is written inline; there is no `requireJobOwnerOrAdmin(jobId)` helper, so the next per-job route copies it or forgets it. `getAdminUser` is loaded with `await import` for no stated reason (it is a normal server module, imported statically in `[jobId]/route.ts:2`).

### #2 Upload signer — PARTIAL
- Routes needing the control: `POST /api/uploads/sign` (covered), `POST /api/uploads/preview` (new since Sept 4; auth covered at `preview/route.ts:15-18`).
- Where: `app/api/uploads/sign/route.ts:32-35` (session), `:57-59` (path)
  ```
  32    const userId = await getSessionUserId();
  33    if (!userId) {
  34      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  ...
  59    const path = `${kind}/${userId}/${crypto.randomUUID()}-${safeName}`;
  ```
  "File types restricted": `uploads/sign/route.ts:7-26` lists MIME types and `:48-55` pushes them to the bucket:
  ```
  25    "application/octet-stream",
  ...
  48    try {
  49      await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, {
  50        public: true,
  51        allowedMimeTypes: ALLOWED_MIME_TYPES,
  52      });
  53    } catch (err) {
  54      console.warn("[uploads/sign] could not sync allowedMimeTypes", err);
  ```
- Gap / bypass risk: (a) Supabase enforces `allowedMimeTypes` against the `Content-Type` the uploader sends; the uploader chooses it, and `application/octet-stream` is on the list, so any bytes with any extension (`safeName` keeps the extension, `:57`) can be uploaded by declaring octet-stream. The restriction only stops an uploader who volunteers `text/html`; the phishing-host sub-case of E-4 is mitigated only because octet-stream is not rendered inline by browsers. (b) `updateBucket(... public: true ...)` now runs on **every** mint (not memoised like `ensureAudioBucket`), so the code re-forces the bucket public on every upload; this is the exact "config-only fix the code silently undoes" pattern the Sept 4 review called out, now stronger. (c) No per-user throttle (grep `ratelimit|throttle` over `app/`, `lib/`, `middleware.ts` = 0). (d) Failure of the bucket update is swallowed (`:53-55`), so the mime list can silently not be in effect.
- Quality: fragile. Right idea in the wrong place: bucket configuration belongs in a one-time setup step (or migration), not in a request path with `public: true` hard-coded three times (`lib/supabaseAdmin.ts:17`, `:37`, `uploads/sign/route.ts:50`).

### #3 Buyer ≠ seller — FIXED
- Routes needing the control: takes POST (submit), select-winner provisional path, select-winner finalize path, the automatic finalize sweep. All four covered.
- Where: `app/api/jobs/[jobId]/takes/route.ts:139-144`
  ```
  139    if (job.creatorId === musicianId) {
  140      return NextResponse.json(
  141        { error: "You can’t submit a take on your own job." },
  ```
  `lib/jobActions.ts:85-87` (inside `finalizeAward`, used by select-winner finalize and by `finalizeDueAwards`) and `:242-244` (inside `selectProvisionalWinner`):
  ```
   85    if (take.musicianId === job.creatorId) {
   86      return { ok: false, error: "You can’t award your own take on your own job", status: 400 };
  ```
  Both introduced in `3dddf6e` (confirmed by `git log -S'own take on your own job'`).
- Gap / bypass risk: the second-account variant is unchanged and is the normal shape of E-1; nothing in the range adds a price ceiling (`jobs/route.ts:93-98` checks only `>= MIN_PRICE_CENTS`; `SLIDER_MAX_USD = 500` at `lib/jobPricing.ts:10` is UI-only), a Stripe Customer, Radar signals, a payout delay, or a `charge.dispute.created` handler (grep = 0). Both Connect account shapes still make the platform the loss bearer (`lib/stripeConnect.ts:130-131` `fees_collector: "application", losses_collector: "application"`; `:181-182`). New since Sept 4: PayPal/Wise manual payouts (`d7b852f`) route the same money through a human, which is a de facto delay for those recipients only.
- Quality: clean for what it is. Putting the award-side guard in `lib/jobActions.ts` means both the route and the sweep inherit it.

### #5 Relative `next` param — FIXED-BUT-FRAGILE
- Entry points that consume `next`: sign-in (`router.push`), sign-up (`router.push` and the sign-in link), Google button (`redirectTo`), `app/auth/callback` (server redirect after code exchange), middleware (writes `next`, does not consume it). Covered: sign-in, sign-up, Google. **Not fully covered: callback.**
- Where: `lib/safeRedirect.ts:5-14`
  ```
   8    if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
   9      return fallback;
  10    }
  11    // Block backslash tricks / protocol-relative variants
  12    if (trimmed.includes("\\")) return fallback;
  ```
  Used at `app/(auth)/sign-in/page.tsx:53`, `app/(auth)/sign-up/page.tsx:53` and `:70-73`, `components/GoogleAuthButton.tsx:44`. `javascript:` is blocked by the leading-slash requirement.
- Gap / bypass risk: `app/auth/callback/route.ts:14-16` does not use the helper:
  ```
  14    const nextRaw = searchParams.get("next") ?? "/producers";
  15    const next =
  16      nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/producers";
  ```
  No backslash check. Verified with node against the WHATWG parser Next uses: `next=/\evil.com` and `next=/%5Cevil.com` both pass this test and `new URL(next, origin).href` resolves to `https://evil.com/`. The redirect fires only after a successful `exchangeCodeForSession`/`verifyOtp` (`:37-46`), so the live vector is a crafted Supabase authorize link (`.../auth/v1/authorize?provider=google&redirect_to=https://retrackthis.com/auth/callback?next=/\evil.com`): the victim completes a real Google login, a session cookie is set, then they land on the attacker's page. Whether Supabase's redirect allowlist accepts the query-string variant is runtime evidence; the app's own Google flow depends on it accepting `?next=`, so it very likely does. One-line fix: use `safeInternalPath` there too.
- Quality: fragile. The helper exists and three callers use it; the fourth reimplements a weaker version.

### #6 Storage URL prefix — FIXED
- Write paths needing the control: `POST /api/jobs` (demo, backing), `PATCH /api/jobs/:id` (demo, backing), `POST /api/jobs/:id/takes` (legacy `audioFileUrl`, every audio `fileUrl`, every MIDI `fileUrl`, every `previewUrl`). All covered.
- Where: `lib/storageUrls.ts:4-11`
  ```
   9    const prefix = `${base}/storage/v1/object/public/${AUDIO_BUCKET}/`;
  10    return trimmed.startsWith(prefix);
  ```
  Calls: `app/api/jobs/route.ts:146-150`, `app/api/jobs/[jobId]/route.ts:76-77` and `:88-89`, `app/api/jobs/[jobId]/takes/route.ts:152-161` (includes `previewUrl`, good).
- Gap / bypass risk: (a) The fix direction asked for the caller's own user segment once E-4 landed; not done, so a musician can submit any public object URL in the bucket (a creator's demo, another take's preview URL they legitimately received, or a stale object). (b) No dedupe of identical URLs per job. (c) `startsWith` accepts `.../audio-files/../<other-bucket>/x`; the stored string is only rendered into `<audio src>`/`<a href>`, so the browser normalizes it to another public bucket on the same Supabase host. Low impact today (there is one bucket). (d) `uploads/preview/route.ts:26-42` does its own check with `storagePathFromPublicUrl` (`lib/audioPreview.ts:38-43`), which searches for the marker *anywhere* in the string rather than as a prefix; only the derived path is used server-side, so this is a consistency smell, not a hole.
- Quality: acceptable. One helper, three routes. The `await import("@/lib/storageUrls")` in two of them (`jobs/route.ts:146`, `takes/route.ts:152`) is unexplained; `[jobId]/route.ts:4` imports it normally.

### #7 Seed script guards — FIXED-BUT-FRAGILE
- Scripts needing the guard: `prisma/seed.js`, `prisma/seed-ui-states.js`, `prisma/seed-demo-jobs.js`, `prisma/cleanup-demo.js`. All four call it before opening a client: `seed.js:12-13`, `seed-ui-states.js:11-12`, `seed-demo-jobs.js:11-12`, `cleanup-demo.js:18-19`.
- Where: `prisma/scriptGuard.js:14-32`
  ```
  20    const looksProd =
  21      host.includes("supabase.com") ||
  22      host.includes("pooler.supabase") ||
  23      host.includes("amazonaws.com");
  24    const allow = process.env.ALLOW_PROD_SCRIPTS === "1";
  25    if (looksProd && !allow) {
  ```
  Password: `prisma/seed.js:24` `const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";`. README `:54-59` and HANDOFF `:88-89` no longer print the password (diff in `3dddf6e`).
- Gap / bypass risk: (a) This is a denylist, the review asked for an allowlist. Supabase's **direct** connection host is `db.<ref>.supabase.co`; `"db.x.supabase.co".includes("supabase.com")` is `false` (checked). A developer whose `.env.local` still holds the session-mode/direct URL (the shape `.env.example` used before `d9d43ee`) runs `node prisma/seed.js`, the guard prints the host and proceeds, and `seed.js:55-58` wipes `Payment`, `Take`, `Job`, `User` in production. (b) The fallback `"testpass123"` means the default behaviour without the env var is unchanged; the review asked to scrub it. (c) `package.json:38-40` still wires `prisma.seed` → `node prisma/seed.js`, so `prisma migrate reset` still seeds (guarded by the same denylist). (d) `cleanup-demo.js:31-33` still selects rows by content (E-22, untouched).
- Quality: fragile. Right layer (one shared module, called first in each script), wrong predicate.

### #8 Deadline validation — FIXED-BUT-FRAGILE (claim inaccurate)
- Routes needing the control: `POST /api/jobs` (covered). `PATCH /api/jobs/:id` does not accept `deadline` (`[jobId]/route.ts:50-56`), so no second path.
- Where: `app/api/jobs/route.ts:119-144`
  ```
  119    const deadlineDate = new Date(deadline);
  120    if (Number.isNaN(deadlineDate.getTime())) {
  ...
  123    if (deadlineDate.getTime() <= Date.now()) {
  ...
  128    const maxWindowMs = 6 * 24 * 60 * 60 * 1000;
  129    if (deadlineDate.getTime() + CANCEL_GRACE_PERIOD_MS > Date.now() + maxWindowMs) {
  ...
  138    const maxDeadlineMs = Date.now() + MAX_DEADLINE_DAYS * 24 * 60 * 60 * 1000 + 60_000;
  139    if (deadlineDate.getTime() > maxDeadlineMs) {
  ```
  with `CANCEL_GRACE_PERIOD_MS = 72h` (`lib/jobActions.ts:16`) and `MAX_DEADLINE_DAYS = 7` (`lib/jobPricing.ts:14`). Takes are now refused after the deadline (`takes/route.ts:145-150`), closing that half of E-15.
- Gap / bypass risk: arithmetic. Line 129 rejects any deadline later than **now + 3 days** (6 d minus 72 h). Line 139's 7-day check can therefore never fire; it is dead code that documents a cap that does not exist. Meanwhile the form defaults to 7 (`app/dashboard/PostJobForm.tsx:148` `useState(String(MAX_DEADLINE_DAYS))`), validates 1..7 client-side (`:230-236`), and posts `Date.now() + deadlineDays*86400000` (`:293`). A creator who accepts the default gets a 400 "Deadline is too far out for the current card-hold escrow" after filling the whole form, including the card. Anything 4 to 7 days fails the same way. So either production is not at HEAD, or job posting with the default is broken today; that is runtime evidence item 1 below. The developer's "capped (7 days)" is wrong in both directions: the effective cap is 3 days, and 7 days is what the code says while never enforcing it. Separately, the 3-day arithmetic was the review's literal Day-1 suggestion ("cap deadline + 72h at 6 days"), so the *security* intent is met; the product regression is what nobody checked. The E-15 design decision (charge-upfront / SetupIntent / extended auth) is still open; `AUTH_HOLD_SAFE_MS` (`jobActions.ts:24`) and `finalizeAutoAt` (`:30-34`) are the stopgap. The reported production incident (violin job, hold expired, job cancelled) is consistent with a job posted before `3dddf6e` under the old 7-day default plus lazy sweep; the new code would auto-finalize a *picked* job by `min(deadline+24h, hold+6d)` **only if someone hits `GET /api/jobs` in that window** (no cron, see E-14).
- Quality: fragile. Three overlapping constants (`maxWindowMs` local at `:128`, `AUTH_HOLD_SAFE_MS`, `MAX_DEADLINE_DAYS`) in three files with different values; client and server disagree; dead branch.

### #9 Admin confirmed email — FIXED
- Paths that bootstrap admin from the allowlist: `getAdminUser()` (every `requireAdmin()` caller and the takes GET) and `GET /api/auth/me`. Both covered.
- Where: `lib/admin.ts:37-51`
  ```
  41    const emailConfirmed = Boolean(authUser?.email_confirmed_at);
  42    if (allowlisted && emailConfirmed && !profile.isAdmin) {
  ...
  49    if (profile.isAdmin) return profile;
  50    if (allowlisted && emailConfirmed) return profile;
  51    return null;
  ```
  `app/api/auth/me/route.ts:22` `if (emailIsAdmin(user?.email ?? profile.email) && user?.email_confirmed_at) {`. README `:64` now tells operators to keep Confirm-email ON in production.
- Gap / bypass risk: Google OAuth sign-ins arrive with `email_confirmed_at` set by Supabase (provider-verified), which is correct behaviour but means the allowlist path is now reachable via Google for any allowlisted address; Supabase's default identity linking on a verified email decides who owns that account. Runtime evidence: Confirm-email toggle, and whether every `ADMIN_EMAILS` entry already has an account. `DEFAULT_ADMIN_EMAILS` still hard-coded (`admin.ts:5`), stored `isAdmin` still cannot be revoked by removing an address (`:49`), both E-19.
- Quality: acceptable. Same predicate written twice (`admin.ts:41-42` and `me/route.ts:22`); one should call the other.

### #10 Webhook status guards — PARTIAL
- What Day-1 item 10 asked for: (a) E-12 `updateMany({ where: { stripePaymentIntentId, status: { in: allowedFrom } } })` plus `@unique` on the PI id; (b) E-25 fill `stripeAccountId` only when null, in webhook and onboard.
- Where (b, webhook): `app/api/webhooks/stripe/route.ts:127-134`
  ```
  127    if (user.stripeAccountId) {
  128      if (user.stripeAccountId !== account.id) {
  129        console.warn(
  ...
  133      return;
  134    }
  ```
  Done in `3dddf6e` (diff confirmed).
- Not done (a): `app/api/webhooks/stripe/route.ts:82-104` is byte-for-byte the Sept 4 logic: `findFirst` at `:82`, in-memory `onlyIfIn` at `:90`, terminal guard at `:95`, unconditional `update` at `:101`. `prisma/schema.prisma:122` `stripePaymentIntentId String` still has no `@unique`. No migration in the range touches `Payment`. The race in E-12 (webhook `succeeded` landing between select-winner's capture and its DB write, downgrading `transferred` to `captured`) is unchanged; if anything it is wider now, because `finalizeAward` does `retrieve → capture → transfers.list → transfers.create → $transaction` (`lib/jobActions.ts:112-214`), a longer window.
- Not done (b, onboard): `app/api/stripe/connect/onboard/route.ts:79-95` still creates an account and writes `stripeAccountId` unconditionally when the in-memory `accountId` is null; two concurrent POSTs both create. Fix direction was `updateMany where stripeAccountId: null`.
- Quality: acceptable for the half that shipped. The developer's own claim wording ("payment status transitions hardened") describes the half that did not.

### #11 Instruments dynamic + API errors sanitized — PARTIAL
- E-33: `app/api/instruments/route.ts:5` `export const dynamic = "force-dynamic";` (only such export in `app/`). Closed.
- E-31 "errors sanitized": only `app/api/uploads/sign/route.ts:64` (`"Failed to create signed upload URL"`). Still echoing raw `.message` to the browser: `app/api/jobs/[jobId]/select-winner/route.ts:7-12, 89` (`stripeMessage(err)` returns `.message` of *anything* thrown, including Prisma errors from the `$transaction` inside `finalizeAward`), `app/api/jobs/route.ts:173-175` (Stripe text, 402), `app/api/stripe/connect/onboard/route.ts:101-103`, `app/api/stripe/connect/dashboard/route.ts:27-29`, `app/api/uploads/preview/route.ts:60` (ffmpeg stderr tail, `lib/audioPreview.ts:76`, reaches the client). Also unchanged from E-31: no `event.livemode` check (grep 0), `middleware.ts:51-53` matcher still runs the Supabase auth call on `/api/webhooks/*`, `!` on env at `lib/stripe.ts:3`, `lib/supabaseAdmin.ts:7-8`.
- Quality: the one sanitized route is fine; the pattern was not applied where the review pointed (select-winner was named explicitly).

### RLS — FIXED (needs runtime evidence)
- Where: `prisma/migrations/20260919220000_enable_rls_lock_down_data_api/migration.sql:7-19`
  ```
   7  ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
  ...
  12  ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  13
  14  REVOKE ALL ON TABLE "User" FROM anon, authenticated;
  ```
  All five app tables plus `_prisma_migrations`; no policies, so PostgREST as `anon`/`authenticated` gets nothing; Prisma connects as the table owner and bypasses RLS. Matches the E-7 fix direction.
- Gap / bypass risk: (a) Runtime: was it applied to production (`_prisma_migrations` row), and is the Data API toggle/exposed-schemas set? (b) Fragile for the future: Supabase's default privileges still grant `anon`/`authenticated` on any new table the `postgres` role creates in `public`, and RLS is off by default on it. The next `prisma migrate` that adds a table (the range added five columns but no tables; the next feature might) reopens E-7 for that table unless someone remembers. `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;` or disabling the Data API would make it inherit. (c) Sequences/functions untouched; not relevant to this schema (ids are app-generated cuids).
- Quality: right layer (a migration, lives with the schema), incomplete for inheritance.

### Google SSO — FIXED (feature)
- Where: `components/GoogleAuthButton.tsx:41-57` (`signInWithOAuth({ provider: "google", options: { redirectTo } })` with `next` sanitized at `:44`), `app/auth/callback/route.ts:37-39` (`exchangeCodeForSession`), `app/dashboard/CompleteProfileForm.tsx` prefills the name from `user_metadata.full_name|name` (diff in `7e4aad1`, user-editable field, harmless). README `:72-82` documents the Supabase provider and redirect allowlist.
- Gap / bypass risk: the callback's weaker `next` check (see #5). OAuth users are email-confirmed, which feeds the admin allowlist (see #9). Password reset (`app/(auth)/forgot-password/page.tsx:46-51`, `reset-password/page.tsx:64`) shares the callback and passes `next=/reset-password`; the callback default changed from `/reset-password` to `/producers` in `7e4aad1` (fine, the reset page asks for its own `next`).
- Needs runtime: provider enabled with a real client id/secret; Supabase redirect URL allowlist contains `https://retrackthis.com/auth/callback`; Google Cloud authorized redirect URI is the Supabase one.

### hello@ ops — FIXED
- Where: `lib/email.ts:34` `const replyTo = process.env.RESEND_REPLY_TO?.trim() || "hello@retrackthis.com";`, `lib/resendInbound.ts:3`, `.env.example:20`. Commit `15575c2`.
- Gap: `README.md:124` still reads "Inbound (`hello@retrackthis.com` → `music@lukedespain.com`)". `lib/admin.ts:5` still ships two personal addresses in source. `lib/resendInbound.ts:46` still special-cases the literal `hello@retrackthis.com`.
- Quality: clean.

### DB pool fix — FIXED in code (config; needs runtime)
- Where: `lib/db.ts:8-14` (client cached on `globalThis` in every environment; previously only outside production, diff in `d9d43ee`), `.env.example:1-3` documents `...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`.
- Gap: the actual `DATABASE_URL` is a Vercel env var (runtime evidence). `prisma/schema.prisma:5-8` has `url` only, no `directUrl`; Prisma documents that `migrate` should not go through a transaction-mode pooler. That is an ops footgun for the next migration, not a security issue. `$transaction` batches and the interactive transaction in `takes/route.ts:195-208` are fine under transaction pooling with `pgbouncer=true`.
- Quality: acceptable.

## Sept-4 findings status (E-1 … E-37)

| id | status | evidence |
|---|---|---|
| E-1 | **partially closed** | Self-award guard in `takes/route.ts:139`, `jobActions.ts:85, 242` (`3dddf6e`). Two-account variant, no price ceiling (`jobs/route.ts:93-98`), no Customer/Radar/payout delay/dispute handler, platform still `losses_collector` (`stripeConnect.ts:130-131, 181-182`). "End gig & pay" (`43732ea`) lets a two-account attacker capture and transfer minutes after posting. |
| E-2 | **closed** | `takes/route.ts:252-275` (session + creator-or-admin). |
| E-3 | **open, and the new gating is cosmetic** | Bucket still forced public: `lib/supabaseAdmin.ts:17, :37` and now per-request in `uploads/sign/route.ts:50`. Every `fileUrl`/`previewUrl` is still a permanent public object URL (`uploads/sign:67`, `audioPreview.ts:96`). The `previewUrl`-instead-of-master gating (`b25149f`, `takes/route.ts:25-67`) is bypassable: the preview path is the master path with the extension replaced (`lib/audioPreview.ts:30-33` `${base}.preview.mp3`), so anyone holding a preview URL derives the master by trying `.wav/.aiff/.flac` against a public bucket; and MP3/M4A masters are returned *as* the preview (`audioPreview.ts:91-93`), so for those the "master" was never hidden. Public marketplace still hands `demoFileUrl`/`backingFileUrl` to anonymous browsers (`components/OpenJobsBrowse.tsx:334-339`) and `GET /api/jobs` returns them in JSON. No signed-read endpoint (grep `createSignedUrl` = 0). |
| E-4 | **mostly closed** | Auth `uploads/sign:32-35`, per-user path `:59`. Mime allowlist weak (octet-stream, `:25`); no throttle. |
| E-5 | **mostly closed** | `lib/storageUrls.ts` on all three write paths (`jobs/route.ts:146`, `[jobId]/route.ts:76, 88`, `takes/route.ts:152-158`). No user-segment binding, no dedupe. Take replacement (`a9d6e83`, `takes/route.ts:190-222`) makes "swap after audition" a feature for un-picked takes; picked takes are locked (`:191-193`). |
| E-6 | **open** | `GET /api/jobs` still spreads full rows incl. `creatorId` (`jobs/route.ts:313-319`), now plus `takeCount`/`hasSelectedWinner`. |
| E-7 | **closed (runtime-conditional)** | RLS migration `5190b72`. Data API toggle and prod application unverified; new tables not covered. |
| E-8 | **open** | `lib/jobActions.ts:385-401`: `paymentIntents.cancel` → `payment_intent_unexpected_state` swallowed (`:390-391`) → `CANCELLED`/`"cancelled"` written (`:395-401`) regardless of whether the PI was captured. No `refunds.create` anywhere (grep 0). The half-failed award path is unchanged: `finalizeAward` captures (`:131`) then transfers (`:197`) then writes DB (`:206`); a throw between capture and the DB write leaves the job OPEN with money captured, and the creator's "Cancel" or the sweep records it as cancelled with no refund. New mitigation: a retry of `finalizeAward` now checks `transfers.list({ transfer_group })` (`:195-204`) and tolerates `succeeded` (`:132`), so *retrying the award* is safe; *cancelling after* is not. |
| E-9 | **open, surface wider** | No `updateMany` with a status predicate on `Job` anywhere (grep: only `take.updateMany` hits). `finalizeAward` reads `job.status` at `:61-73` then does four Stripe round-trips before `:206`. New: `finalizeDueAwards` (`:277-312`) runs, **awaited**, on every anonymous `GET /api/jobs` (`jobs/route.ts:248-252`) and on `GET /api/admin/jobs` (`admin/jobs/route.ts:13`); N concurrent visitors race the same finalize. The second capture fails (Stripe) and the second transfer is bounded only by Stripe's cumulative-transfer cap (Sept 4 runtime check 6, still unverified). |
| E-10 | **partially closed** | `transfers.list` guard `jobActions.ts:195-204`. No idempotency keys (grep 0), no `stripeChargeId`/`stripeTransferId` columns (`schema.prisma:118-127`). |
| E-11 | **partially closed** | `finalizeAward:113-129` closes a job whose PI is `canceled` or whose `Payment.status` is `"cancelled"` (`13c663e`), but only when finalize runs. Webhook still updates `Payment` only (`webhooks/stripe/route.ts:101-104`); takes POST still checks `job.status` only (`takes/route.ts:136`), so a job whose hold died keeps accepting takes until the deadline or the sweep. |
| E-12 | **open** | `webhooks/stripe/route.ts:82-104` unchanged; `schema.prisma:122` no `@unique`. |
| E-13 | **partially closed** | Validation now precedes `paymentIntents.create` (`jobs/route.ts:59-160` before `:164`): pm shape, price min, duration, key, deadline, storage URLs, bpm. Still: non-integer `priceCents` passes `Number.isFinite` (`:93`) and reaches Prisma `Int` at `:193` after the hold exists; no max price; no `metadata`, no idempotency key; no `catch` that cancels the PI when `db.job.create` (`:184`) throws; user without a `User` row still hits the FK after the hold. |
| E-14 | **partially closed** | Cancel sweep still anonymous, unbounded, fire-and-forget `void cancelJobAndRefund` (`jobs/route.ts:279-285`), no atomic claim (`jobActions.ts:383` read-then-write). No cron (`vercel.json` absent). Finalize/reminder sweeps are now awaited (`:248-258, 289-293`), which fixes "may never finish on Vercel" for those and turns every anonymous marketplace GET into a Stripe-blocking request. Hidden-but-OPEN jobs no longer accept takes (deadline check `takes/route.ts:145`). |
| E-15 | **partially closed, product regression** | Server parse/future/cap `jobs/route.ts:119-144` (effective cap 3 days; 7-day branch dead; form default 7 rejected, see #8). Post-deadline takes refused. Provisional pick + auto-finalize at `min(deadline+24h, payment.createdAt+6d)` (`jobActions.ts:30-34, 277-312`), reminder emails (`:318-373`). No extended authorization, no charge-upfront decision. Payout reliability depends on lazy sweep traffic. Production incident reported by the developer fits the pre-`3dddf6e` defaults. |
| E-16 | **closed (runtime toggle)** | `lib/admin.ts:41-42, 50`; `me/route.ts:22`; README `:64`. |
| E-17 | **closed on 3 of 4 entry points** | `lib/safeRedirect.ts`; sign-in `:53`, sign-up `:53, 70`, Google `:44`. Callback `app/auth/callback/route.ts:15-16` still open to `/\evil.com` (node-verified). `httpOnly:false` cookie unchanged (library default; `supabaseServer.ts:15`, `middleware.ts:21` pass options through). |
| E-18 | **open** | `app/dashboard/AccountSettings.tsx:75` still `supabaseClient.auth.updateUser({ email: next })` with no server mirror; `me/route.ts` does not sync; `complete-profile/route.ts:36` still `email: user.email!` on `@unique` (`schema.prisma:23`). |
| E-19 | **partially closed** | Reply-to is the role mailbox (`email.ts:34`). Founder addresses still in source (`admin.ts:5`); stored `isAdmin` still wins with no demote path (`admin.ts:49`). |
| E-20 | **closed** | `app/(auth)/forgot-password/page.tsx`, `reset-password/page.tsx`, `app/auth/callback/route.ts`. Min password length 6 (`reset-password:53`, sign-up `:97`). |
| E-21 | **mostly closed, guard has a hole** | `prisma/scriptGuard.js`, all four scripts. Denylist misses `*.supabase.co` direct hosts; `testpass123` fallback (`seed.js:24`); `prisma.seed` hook (`package.json:39`). README/HANDOFF scrubbed. Deleting `@example.com` Auth users from production is runtime. |
| E-22 | **open** | `prisma/cleanup-demo.js:31-33` still selects by `[demo-variety]` marker and placeholder host. |
| E-23 | **open** | grep `ratelimit|throttle|captcha|turnstile|upstash` over `app/`, `lib/`, `middleware.ts` = 0. Invites still 5 per post, unlimited posts (`jobs/route.ts:23-30, 212-222`); `complete-profile:22-25` name still unbounded (only `settings/account:43` caps at 80). Mitigation: `"all"` no longer matches every job (`lib/instruments.ts:348-352`), so fan-out is bounded to concrete instrument matches. New sinks: 3-day reminder fan-out per job (`b598315`), and `POST /api/uploads/preview` (authenticated, `maxDuration = 300`, downloads a whole object into memory `audioPreview.ts:123` and runs ffmpeg) with no ownership binding on `path` (`preview/route.ts:31-42`). |
| E-24 | **open** | `lib/notify.ts:61-76` `Promise.all` over every recipient, inside `POST /api/jobs` (`jobs/route.ts:210`); same pattern at `:105-121`, `:135-153`, `:261-278`. |
| E-25 | **partially closed** | Webhook fill-only-when-null `webhooks/stripe/route.ts:127-134`. Onboard still unconditional (`onboard/route.ts:79-95`). README `:112-114` still claims a `payouts_enabled` condition that does not exist. |
| E-26 | **partially closed** | `getConnectReadiness` still throws on a missing account (`stripeConnect.ts:259-272`: v2 miss falls to v1 `accounts.retrieve`, which throws). `getMusicianPayoutSnapshot` catches and reports `"pending"` (`musicianPayouts.ts:82-93`), hiding it from the musician; `onboard/route.ts:100-103` returns 500 with the raw message, and the new `reset: true` self-service path calls `getConnectReadiness` first (`:35-36`) so it also 500s for a bricked id. Recovery paths that do work: admin `POST /api/admin/members/:id/reset-payouts` with `force` (`reset-payouts/route.ts:51-78`), or the musician switching to PayPal/Wise, which nulls `stripeAccountId` (`payouts/alt/route.ts:65`). |
| E-27 | **open** | No length caps on `title`/`description` (`jobs/route.ts:59` truthiness only), `note`/`label` (`takes/route.ts:112`, `takeFiles.ts:38-40`), `name` (`complete-profile:23`). `takeId` non-string → `db.take.findUnique` throws outside the `try` (`select-winner/route.ts:32` vs `:50`). Public list still unpaginated, no DTO (`jobs/route.ts:260-267, 313`). New numeric bounds landed (duration `:100-115`, bpm `:152-160`, key `:117`). |
| E-28 | **open** | `[jobId]/route.ts:26-28` gate is `OPEN` only; `demoFileUrl`, `backingFileUrl`, `bpm`, `description` writable at `:58-104` with takes present. |
| E-29 | **open (legacy path)** | `lib/resendInbound.ts:51-53` raw HTML wins, `:64` attacker `reply_to`, `:62` sent as `hello@`. README `:124-129` still documents the webhook; `.env.example:22` says MX now points at Google Workspace. Reachable while the Resend webhook stays configured. |
| E-30 | **open** | `resendInbound.ts:15-35` no timestamp tolerance, no id memory. |
| E-31 | **partially closed** | `uploads/sign:64` sanitized. Others listed under #11 still echo. No `livemode`; webhooks still under the middleware matcher (`middleware.ts:51-53`). |
| E-32 | **open** | `next.config.mjs:2-5` has `serverExternalPackages` only; grep `Content-Security-Policy|frame-ancestors|X-Content-Type-Options|headers()` = 0. |
| E-33 | **closed** | `instruments/route.ts:5`. |
| E-34 | **partially closed** | `middleware.ts:40` now preserves `search` in `next`. `appBaseUrl` still duplicated (`lib/appUrl.ts:1-6` vs `lib/stripeConnect.ts:8-13`), `VERCEL_URL` fallback still in both. |
| E-35 | **open** | `notify.ts:63, 107, 137, 266` labels carry addresses into `console.error`; `email.ts:29`. |
| E-36 | **partially closed, new drift** | Terms rewritten (`terms/page.tsx:15-18, 42-50`) for the provisional-pick flow, then `43732ea` changed the flow again ("End gig & pay" any time) so `:15-16` "captured when the deadline ends" and `:46-48` "captured ... when the deadline ends" are stale a second time. Privacy `:67-68` is now true at the API but not at the storage layer (E-3). "refunds" (`terms:80`, `privacy:38`) still has no refund code. Chargeback clause (`terms:48-50`) still contradicts `losses_collector: "application"`. "withhold payouts" (`terms:90`): admin can reset payout details, still cannot withhold or delay a transfer. Deletion (`privacy:75-76, 90`): no code path, FKs still without `onDelete` (`schema.prisma:52, 81, 83, 120`). README `:27-40` "don't change without flagging" section does not describe provisional pick, early finalize, auto-finalize, or PayPal/Wise manual payouts, all of which changed that flow (`2106d6a`, `43732ea`, `d7b852f`); README `:71` still says "20MB" while the cap is 500MB; README `:112-114` `payouts_enabled` claim stale; HANDOFF `:74` (`pm_card_visa`) and `:84` ("Still local-only") stale. |
| E-37 | **open** | `package.json` versions unchanged for `next 14.2.35`, `stripe ^16`, `prisma ^5`. Added `ffmpeg-static ^5.3.0` (used by path, `audioPreview.ts:11-20`) and `fluent-ffmpeg ^2.1.3` plus its types, which nothing imports (grep `fluent-ffmpeg` over `app/`, `lib/`, `components/` = 0): dead dependency with a native-adjacent surface. No `npm audit` evidence in the range. |

Counts: closed 6 (E-2, E-7*, E-16*, E-20, E-33, plus E-17 on three of four paths counted here as closed-with-gap) · partially closed 15 · open 16 · superseded 0. (*runtime-conditional.)

## Silently changed guarantees (in range, not in the developer's list)

1. **Upload cap 100MB → 500MB** (`904c50e`, 2026-09-10; `lib/constants.ts:3`). Five times the storage/egress exposure per object behind an authenticated-but-unthrottled mint, and the new preview pipeline reads the whole object into a `Buffer` (`lib/audioPreview.ts:116-124`) inside a serverless function; a 500MB WAV is likely an OOM, not a preview. README `:71` still says 20MB.
2. **Take replacement** (`a9d6e83`, 2026-09-05; `takes/route.ts:186-222`). A musician can overwrite a pending take until the deadline; old `TakeFile` rows are deleted (`:196`) but storage objects are not, so orphaned public objects accumulate. Picked takes are locked (`:191-193`), which is the important half.
3. **Job alerts flipped on for everyone, including users who had opted out** (`99671d5` 2026-09-04, migration `20260905020000_job_alerts_opt_out`): `UPDATE "User" SET "notifyJobAlerts" = true ... WHERE "notifyJobAlerts" = false AND cardinality("notifyInstruments") = 0`. That re-subscribes accounts that had alerts off and never set instrument filters. Consent and CAN-SPAM-shaped issue, and it multiplies the E-23/E-24 fan-out. Then `77f0a06` deprecated `notifyInstruments` (`schema.prisma:36` "legacy") and matching moved to profile `instruments` (`notify.ts:47-58`); `"all"` no longer broadcasts (`instruments.ts:348-352`).
4. **Three-day reminder fan-out** (`b598315`): a second email blast per job to every matching musician who has not submitted (`notify.ts:80-124`), triggered from anonymous `GET /api/jobs` (`jobs/route.ts:289-293`) and by admins.
5. **Money mutations on anonymous GET** (`2106d6a`, `d9d43ee`): `finalizeDueAwards()` (capture + transfer) runs, awaited, inside every public `GET /api/jobs` (`jobs/route.ts:248-252`). Previously the anonymous sweep could only cancel (release holds); now it can capture and pay. Also the README "flag before changing" flow was changed three times without the README changing.
6. **Provisional pick + "End gig & pay" any time** (`2106d6a`, `43732ea`): capture and transfer can now happen before the deadline on the creator's click (`select-winner/route.ts:47-48, 64`, `CreatorView.tsx:427-437`). Reasonable product move; note it shortens the window for any future fraud review.
7. **PayPal/Wise manual payouts** (`d7b852f`): any user sets an arbitrary payout email with no verification (`payouts/alt/route.ts:57-67`), which also nulls their `stripeAccountId` (`:65`). `finalizeAward` captures to the platform and marks `pending_manual_payout` (`jobActions.ts:159-183`), and the select-winner response returns the musician's `payoutEmail` and `payoutAccountName` to the **creator's** browser (`select-winner/route.ts:69-78`). `CreatorView.tsx` does not render those fields (grep 0), but they are in the JSON; that is musician PII disclosed to the counterparty. No admin route records that a manual payout was made; `Payment.status` stays `pending_manual_payout` forever (grep for a transition = 0).
8. **`SEED_TEST_PASSWORD` with default** (`3dddf6e`, `seed.js:24`): the env var is honoured, the old constant remains the fallback.
9. **`tsconfig.tsbuildinfo` committed** (`77f0a06`); not in `.gitignore` (`.gitignore:1-9`). Build cache with absolute local paths in the public repo; noise and a minor path leak.
10. **Admin can unlink a live Stripe account** (`reset-payouts/route.ts:51-78` with `force: true`). Admin-gated; note for the audit trail (nothing is logged beyond the response).
11. **Preview transcoding endpoint** (`b25149f`, `uploads/preview/route.ts`): any signed-in user can make the server download and transcode any object in `take/`, `demo/`, `demo-backing/` (no ownership check on `path`, `:31-42`) and `upsert` the result next to it (`audioPreview.ts:128-131`). Content is derived from the original so it is not a substitution vector, but it is a free compute sink with `maxDuration = 300`.
12. **`GET /api/jobs` now leaks `hasSelectedWinner`** to anonymous callers (`jobs/route.ts:317`). Minor.
13. **Middleware now gates `/producers` and `/settings`** (`middleware.ts:32-36`), and Google OAuth users arrive email-confirmed (feeds #9). Already covered above; listed for completeness.

## Needs runtime evidence

1. **Default job post works?** On staging, post a job with the form's default deadline (7 days). Expected from HEAD: 400 "Deadline is too far out for the current card-hold escrow." If it succeeds, production is not at HEAD or the deploy differs from `main`.
2. **RLS in effect:** Supabase → Database → Advisors → "RLS Disabled in Public" should be empty; `SELECT * FROM "_prisma_migrations" WHERE migration_name LIKE '2026091922%'`; and the Sept 4 `curl .../rest/v1/User?select=id,email,isAdmin` with the anon key must return no rows. Also Settings → API → Data API toggle / exposed schemas.
3. **Bucket public flag:** open any stored `fileUrl` in a private window. The code forces `public: true` (three places), so expect it plays. Then take a `.preview.mp3` URL from a creator's dashboard and request the same path with `.wav`/`.aiff`/`.flac` to confirm the master-derivation bypass.
4. **Supabase Auth:** Confirm-email ON; Google provider enabled; redirect allowlist entries; whether `redirect_to=https://retrackthis.com/auth/callback?next=/\evil.com` is accepted by the authorize endpoint (settles the callback open-redirect's reachability); `alex@/jamie@/sam@example.com` users deleted.
5. **`DATABASE_URL` on Vercel:** host `*.pooler.supabase.com:6543` with `pgbouncer=true&connection_limit=1`. And which host developers' `.env.local` files carry (the `*.supabase.co` direct form slips the seed guard).
6. **Stripe:** cumulative-transfer cap against one `source_transaction` (Sept 4 check 6; now load-bearing for the anonymous finalize race); webhook event list and "connected accounts" toggle; extended authorization setting; any `resource_missing` Connect ids (Sept 4 check 10); whether the violin job's PI shows `canceled` with a `Payment` row that was ever `transferred`.
7. **Vercel:** function `maxDuration` for `select-winner` and `GET /api/jobs` (the latter now awaits Stripe work); logs for `[award sweep]`, `[jobs sweep] failed`, `[finalize reminder]`; is `main` what is deployed.
8. **Resend:** whether the `email.received` webhook is still configured (E-29/E-30 reachability) given the MX move to Google Workspace.

## Controls I tried to falsify and could not (for the refuters to attack)

- **Takes GET ownership.** Tried: unauthenticated (401 at `:254`), other signed-in user (403 at `:272`), musician who submitted (403, they are not the creator), admin (allowed). No body/query parameter is read. Held. Attack surface left: E-3 URL derivation, and `AdminJobsPanel` relies on the same route.
- **Self-award guard on every award path.** `select-winner` → `selectProvisionalWinner` (`:242`) or `finalizeAward` (`:85`); sweep → `finalizeAward`. `takeId` from another job → 404 (`select-winner:34`). Held per account.
- **`safeInternalPath`.** `//evil`, `https://evil`, `javascript:alert(1)`, `/\evil.com`, `/%5Cevil.com` (decoded by `searchParams.get`) all fall back. Held where it is used; the callback does not use it.
- **Storage prefix on persisted URLs.** Every persisted `fileUrl`/`previewUrl`/`demoFileUrl`/`backingFileUrl` passes `isAppStoragePublicUrl`; the preview endpoint's returned `previewUrl` can be attacker-influenced (`audioPreview.ts:92` returns `originalPublicUrl` when the filename hint looks like mp3) but is re-validated when persisted (`takes/route.ts:157`). Held for persistence. Attack surface left: `..` segments, cross-user URL reuse.
- **Admin bootstrap requires a confirmed email** in both places that promote. Held. Attack surface left: Supabase identity-linking semantics for an allowlisted address created via Google vs password.
- **Webhook signature and Connect id fill.** `constructEvent` on raw body (`:26-34`); `stripeAccountId` written only when null (`:127-138`). Held. Attack surface left: E-12 race, onboard double-submit.
- **RLS migration text.** Correct tables, correct roles, `_prisma_migrations` included. Held on paper. Attack surface left: application to prod, Data API toggle, future tables, `postgres` role ownership assumptions on Supabase.
- **Deadline arithmetic.** Read three times; `deadline + 72h <= now + 6d` really does mean `deadline <= now + 3d`, and the form really does default to 7. If a refuter can post a 7-day job against HEAD, I am wrong about the arithmetic and would like to know how.
- **Seed guard predicate.** `"db.<ref>.supabase.co".includes("supabase.com")` is `false` (checked with node). The pooler and AWS forms are caught. If Supabase no longer issues `.supabase.co` direct hosts for this project's region, the hole is theoretical; the review's allowlist recommendation would have closed it either way.
