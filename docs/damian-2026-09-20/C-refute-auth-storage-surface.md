# C. Red team: auth, authorization, storage, new surface (2026-09-20)
Reviewer model: Claude Fable 5.1 (`claude-fable-5-1`), running as the refuter seat. Note: the checkout has no `node_modules/`, so `@supabase/ssr`, `fluent-ffmpeg`, and Next router internals could not be quoted; every library-behaviour statement below is marked as such.
Range attacked: 7669afe..43732ea (HEAD 43732ea, 2026-09-19 23:27 -0600)
Files read (all under `site/` unless noted):
`lib/safeRedirect.ts`, `lib/storageUrls.ts`, `lib/admin.ts`, `lib/supabaseServer.ts`, `lib/supabaseAdmin.ts`, `lib/supabaseClient.ts`, `lib/db.ts`, `lib/constants.ts`, `lib/takeFiles.ts`, `lib/audioPreview.ts`, `lib/jobActions.ts` (selectProvisionalWinner, finalizeAward, finalizeDueAwards, cancelJobAndRefund), `middleware.ts`, `next.config.mjs`, `package.json`, `package-lock.json` (versions), `.env.example`, `.gitignore`, `README.md:55-90`, `HANDOFF.md` (grep), `prisma/schema.prisma` (grep), `prisma/migrations/20260919220000_enable_rls_lock_down_data_api/migration.sql`, `prisma/migrations/20260920053000_job_finalize_reminder/migration.sql`, `prisma/scriptGuard.js`, `prisma/seed.js:1-60`, `app/api/uploads/sign/route.ts`, `app/api/uploads/preview/route.ts`, `app/api/jobs/[jobId]/takes/route.ts`, `app/api/takes/mine/route.ts`, `app/api/jobs/[jobId]/route.ts`, `app/api/jobs/route.ts`, `app/api/jobs/[jobId]/select-winner/route.ts`, `app/api/jobs/[jobId]/cancel/route.ts`, `app/auth/callback/route.ts`, `app/api/auth/complete-profile/route.ts`, `app/api/auth/me/route.ts`, `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`, `components/GoogleAuthButton.tsx`, `app/dashboard/CompleteProfileForm.tsx`, all eight `app/api/admin/**/route.ts`, `app/admin/page.tsx` (auth lines), `app/admin/preview/producer/[creatorId]/page.tsx`, `app/api/webhooks/stripe/route.ts`, `app/api/webhooks/resend/route.ts`, `app/api/stripe/connect/{onboard,dashboard}/route.ts`, `app/api/payouts/alt/route.ts`, `app/api/settings/*/route.ts` (grep), `app/api/instruments/route.ts`, `app/{producers,musicians,settings,dashboard,dashboard/settings}/page.tsx` (heads), `components/FileUpload.tsx`, `components/TakeSubmissionFiles.tsx`, `app/dashboard/CreatorView.tsx`, `app/dashboard/SubmitTakeForm.tsx`, `components/OpenJobsBrowse.tsx`, `app/dashboard/MySubmissions.tsx` (greps), `lib/notify.ts` (grep: no file URLs in mail). Prior review: `code reviews/2026-09-04-codebase-review/E-critic-consolidated.md` (E-2..E-33 sections).

## Summary
Counts: **1 CRITICAL, 4 HIGH, 7 MEDIUM, 5 LOW, 1 INFO** (18 findings).

Verdict: the Sept-4 CRITICALs are closed *as written* — the takes endpoint is authorized to creator/admin, the upload signer is authenticated and user-scoped, RLS is on, and the SQL-injection-grade exposures are gone — but the **new "gate master WAV until award" feature is cosmetic**: the bucket is still forced public on every cold start *and* on every upload-sign call, and the preview URL handed to the producer is the master's path with `.preview.mp3` swapped in, so any producer downloads every master for free by guessing `.wav`. The new surface also adds a fail-open (any ffmpeg failure returns the master), an unscoped ffmpeg transcoder any signed-in user can point at any object (300 s CPU per call, no rate limit), a client-controlled `previewUrl` that is never checked against `fileUrl` (audition one file, get paid for another), and an open-redirect bypass via ASCII tab that survives the new `safeInternalPath`.

## Route authorization matrix (every `app/api/**/route.ts` and every page under /admin, /dashboard, /producers, /musicians, /settings)
| route | methods | session | ownership | admin | notes |
|---|---|---|---|---|---|
| `/api/admin/creators/[userId]/jobs` | GET | via `requireAdmin` | n/a | yes (`:10`) | returns `creator.email` + full `Job` rows |
| `/api/admin/instruments` | GET | via `requireAdmin` | n/a | yes (`:13`) | |
| `/api/admin/jobs` | GET | via `requireAdmin` | n/a | yes (`:9`) | also runs Stripe/email sweeps (`:13,18`) |
| `/api/admin/jobs/[jobId]/three-day-reminder` | POST | via `requireAdmin` | n/a | yes (`:10`) | no "already sent" guard before sending (`:29-37`) |
| `/api/admin/members` | GET | via `requireAdmin` | n/a | yes (`:10`) | every email + payout email/name |
| `/api/admin/members/[userId]/instruments` | PATCH | via `requireAdmin` | any user id | yes (`:11`) | |
| `/api/admin/members/[userId]/reset-payouts` | POST | via `requireAdmin` | any user id | yes (`:16`) | no audit trail; `force` bypasses live-destination check — C-11 |
| `/api/admin/stats` | GET | via `requireAdmin` | n/a | yes (`:20`) | |
| `/api/auth/complete-profile` | POST | yes (`:12-19`) | self | no | `name` untyped (`:22-25`) |
| `/api/auth/me` | GET | yes (`:9`) | self | promotes on GET (`:17-28`) | requires `email_confirmed_at` |
| `/api/instruments` | GET | **none** | n/a | no | public by design |
| `/api/jobs` | GET | none; `?mine=true` → session (`:238-244`) | n/a | no | anonymous call runs Stripe capture/transfer/cancel + email sweeps (`:249,255,281,290`); spreads full `Job` row (`:314-318`) — C-10, C-14 |
| `/api/jobs` | POST | yes (`:37`) | self | no | raw Stripe `err.message` → client (`:173-175`) — C-9 |
| `/api/jobs/[jobId]` | PATCH | yes (`:10`) | creator **or admin** (`:20-24`) | yes | storage check is bucket-wide only — C-4 |
| `/api/jobs/[jobId]/cancel` | POST | yes (`:11`) | creator (`:20`) | no | |
| `/api/jobs/[jobId]/select-winner` | POST | yes (`:19`) | creator (`:37`) | no | any `Error.message` → client (`:7-12,89`) — C-9 |
| `/api/jobs/[jobId]/takes` | GET | yes (`:253`) | creator or admin (`:267-275`) | yes | preview URL → master path derivable — C-1; fail-open — C-2 |
| `/api/jobs/[jobId]/takes` | POST | yes (`:92`) | any non-creator with payout set (`:97-109,139`) | no | client `previewUrl` trusted — C-4; replace = 1 email/request — C-10 |
| `/api/payouts/alt` | POST | yes (`:17`) | self | no | |
| `/api/payouts/status` | GET | yes (`:7`) | self | no | |
| `/api/settings/account` | GET, PATCH | yes | self | no | PATCH writes `name` only (`:42,49`) |
| `/api/settings/instruments` | GET, PATCH | yes | self | no | sanitized ids |
| `/api/settings/notifications` | GET, PATCH | yes | self | no | booleans only |
| `/api/stripe/connect/dashboard` | POST | yes (`:9`) | self | no | raw `err.message` (`:27-29`) |
| `/api/stripe/connect/onboard` | POST | yes (`:17`) | self | no | raw `err.message` (`:101-103`) |
| `/api/stripe/connect/status` | GET | yes (`:8`) | self | no | |
| `/api/takes/mine` | GET | yes (`:8`) | self (`:14`) | no | returns own masters + previews |
| `/api/uploads/preview` | POST | yes (`:15`) | **none** — any `path` under `take/`, `demo/`, `demo-backing/` (`:40`) | no | 300 s ffmpeg per call; raw `err.message` — C-5 |
| `/api/uploads/sign` | POST | yes (`:32`) | path is `kind/userId/uuid-name` (`:59`) | no | `application/octet-stream` allowed (`:25`); re-forces bucket public (`:49-52`) — C-3, C-16 |
| `/api/webhooks/resend` | POST | HMAC (`:21`) | n/a | n/a | |
| `/api/webhooks/stripe` | POST | `constructEvent` (`:30`) | n/a | n/a | |
| `/auth/callback` | GET | PKCE code / token_hash exchange (`:37-46`) | n/a | n/a | own `next` check omits backslash and tab rules — C-6 |
| `/admin`, `/admin/preview/producer/[creatorId]` | page | `"use client"` shells; middleware bounces anonymous (`middleware.ts:31-38`) | data only via admin APIs | API is the boundary | preview page fetches `/api/admin/creators/:id/jobs` (`page.tsx:41`) then renders `CreatorView readOnly` (`:95-101`) — holds |
| `/producers`, `/settings` | page | client shells; middleware bounces anonymous | via APIs | | |
| `/musicians` | page | client shell; **not** in `needsAuth` (`middleware.ts:32-36`) | via APIs | | public browse is intended; no server data |
| `/dashboard` | page | client redirect to hubs | | | |
| `/dashboard/settings` | page | server `redirect("/settings")` | | | |

## Findings (most severe first)

### [CRITICAL] C-1: The "master WAV gated until award" feature is cosmetic — the preview URL *is* the master path, and the bucket is public   (bypass of the previewUrl/fileUrl gating claim; reopens the substance of E-2 and E-3)
- Where: `lib/audioPreview.ts:30-33, 95-96`; `app/api/uploads/sign/route.ts:57-59`; `app/api/jobs/[jobId]/takes/route.ts:42-52, 283-295`; `lib/supabaseAdmin.ts:15-21, 36-39`; `app/api/uploads/sign/route.ts:49-52`
- What: For a producer reviewing takes before award, `serializeFiles` nulls `fileUrl` but returns `previewUrl`. The preview object is created at the master's own path with only the extension replaced, inside a bucket the code forces `public: true`. So the "hidden" master is one string edit away from any preview URL the producer already holds. For MP3 submissions the preview *is* the master (`isAlreadyStreamFriendly` returns the original URL), so nothing is gated at all.
- Attack (any producer, today):
  1. `GET /api/jobs/<myJob>/takes` → `files[0].previewUrl = https://<ref>.supabase.co/storage/v1/object/public/audio-files/take/<musicianId>/<uuid>-Lead_Vocal.preview.mp3`, `fileUrl: null`.
  2. Replace `.preview.mp3` with `.wav` (then `.aif`, `.aiff`, `.flac` if needed — `safeName` keeps the uploader's original extension, so it is one of a handful). `GET` that URL anonymously → 200, full master.
  3. Cancel the job (`POST /api/jobs/<id>/cancel`) → full refund of the authorization hold. Producer has every entrant's master for $0.
  Musicians cannot do this to each other (GET is creator/admin only), but the producer is exactly the party the gate exists to constrain.
- Evidence:
  ```
  audioPreview.ts:30-33   function previewPathFromOriginal(originalPath: string): string {
                            const base = originalPath.replace(/\.[^.]+$/, "");
                            return `${base}.preview.mp3`;
  sign/route.ts:57-59     const safeName = String(fileName).replace(/[^a-zA-Z0-9.\-_]/g, "_");
                          const path = `${kind}/${userId}/${crypto.randomUUID()}-${safeName}`;
  takes/route.ts:45       const fileUrl = opts.exposeMasters ? f.fileUrl : previewUrl ? null : f.fileUrl;
  supabaseAdmin.ts:16-18  await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, { public: true, fileSizeLimit: bytes });
  sign/route.ts:49-51     await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES });
  audioPreview.ts:91-92   if (isAlreadyStreamFriendly(hint) || isAlreadyStreamFriendly(opts.originalPublicUrl)) {
                            return { previewUrl: opts.originalPublicUrl, created: false };
  ```
- Confidence: High. Every link in the chain is in code; the only runtime assumption is that the bucket is public, which the code itself enforces on every cold start and every upload.
- Fix direction: previews must live under a *different, unguessable* key (e.g. `preview/<uuid2>.mp3` with no relation to the master), or — the real fix — make the bucket private, store object paths, and mint short-lived signed read URLs from the takes endpoint only for what the caller is entitled to. Stop calling `updateBucket({public:true})` from request paths. Treat MP3 masters like WAV (transcode to a lower-bitrate preview, or accept that MP3 entries are ungated and say so in the UI).

### [HIGH] C-2: The master gate fails open — every ffmpeg failure mode returns the master `fileUrl` to the producer pre-award; MIDI masters leak via `audioFileUrl` regardless   (NEW)
- Where: `app/api/jobs/[jobId]/takes/route.ts:42-45, 59-67, 69-83, 164`; `lib/audioPreview.ts:11-20, 45-49, 111-124`; `components/FileUpload.tsx:168-179`; `next.config.mjs:2-4`
- What: When `previewUrl` is null, `serializeFiles` returns the master ("legacy / failed transcode" fallback). `previewUrl` is null whenever (a) the client's `/api/uploads/preview` call failed or timed out, and (b) the server-side best-effort `ensurePreviewForAudio` also failed. Failure is the *likely* case for exactly the files the gate matters for: the whole object is read into memory (`Buffer.from(await blob.arrayBuffer())`) and written to `/tmp`, so a 500 MB WAV needs ~1 GB RAM plus 500 MB of `/tmp` (Vercel `/tmp` is 512 MB); `POST /takes` runs up to three transcodes in parallel (`Promise.all`, `:164`) with no `maxDuration` export; and the binary is resolved by `existsSync(process.cwd()/node_modules/ffmpeg-static/ffmpeg)` while deliberately never `require`d, so Vercel's file tracer has no reason to ship it (and `serverExternalPackages` is a Next 15 key — in 14.2.35 the option is `experimental.serverComponentsExternalPackages`, so the config line is ignored). Separately, `serializeTakeAudioFileUrl` returns `take.audioFileUrl` when the first audio file has no preview — for MIDI-only takes that is the MIDI master URL, exposed even though `files[].fileUrl` is nulled for MIDI.
- Attack: no attacker needed — upload a 400 MB multi-mic WAV (the stated reason for the 500 MB cap); preview creation OOMs/ENOSPCs/times out; the producer's takes list now contains `fileUrl: <master>`. A malicious musician can also *force* it: upload a file whose transcode fails (a corrupt WAV header, or an `.aiff` that ffmpeg rejects) — then the producer gets the master directly. Not a leak the musician minds, but it proves the gate has no enforcement.
- Evidence:
  ```
  takes/route.ts:44-45   // If preview is missing (legacy / failed transcode), fall back to master for listening.
                         const fileUrl = opts.exposeMasters ? f.fileUrl : previewUrl ? null : f.fileUrl;
  takes/route.ts:63-66   if (exposeMasters) return take.audioFileUrl;
                         const firstAudio = take.files.find((f) => f.kind === "AUDIO");
                         if (firstAudio?.previewUrl) return firstAudio.previewUrl;
                         return take.audioFileUrl;
  takes/route.ts:79-82   } catch (err) { console.error("[takes] preview ensure failed", err); return file; }
  audioPreview.ts:13     path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
  audioPreview.ts:123-124 const buffer = Buffer.from(await blob.arrayBuffer()); await fs.writeFile(inputPath, buffer);
  next.config.mjs:4      serverExternalPackages: ["ffmpeg-static"],
  ```
- Confidence: High that the fallback exists and is reachable; Medium on how often it fires in production (see Unverified 1–2).
- Fix direction: fail *closed* — if no preview exists, return neither URL (show "preview processing") and generate previews asynchronously (queue/cron) rather than in the request path; stream ffmpeg input from a signed URL instead of buffering; for MIDI-only takes never put the MIDI URL in `audioFileUrl` for non-owners.

### [HIGH] C-3: Audio bucket is still forced `public: true` on every cold start *and* on every upload-sign call; take replacement orphans old masters as permanent public objects   (reopens E-3; interacts with a9d6e83)
- Where: `lib/supabaseAdmin.ts:15-21, 35-44`; `app/api/uploads/sign/route.ts:47-55`; `app/api/jobs/[jobId]/takes/route.ts:195-208`; `components/OpenJobsBrowse.tsx:335-338`
- What: The Sept-4 finding is unchanged, and `3dddf6e` made it worse: `POST /api/uploads/sign` now calls `updateBucket({ public: true, allowedMimeTypes })` on *every* request, so an operator flipping the bucket private in the dashboard is undone by the next upload, not just the next deploy. Every URL ever handed out (demos, backing tracks, masters, previews) is a permanent unauthenticated key. Take replacement (`a9d6e83`) deletes the `TakeFile` rows but never removes the storage objects, so superseded masters stay downloadable forever by anyone who saw the URL.
- Attack: anonymous `GET /api/jobs` → `demoFileUrl`/`backingFileUrl` for every open job (`allowDownload={signedIn}` is a UI toggle; the URL is in the JSON). Any preview URL from C-1 → master. Any URL from a replaced take → still live.
- Evidence:
  ```
  supabaseAdmin.ts:16-19  await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, { public: true, fileSizeLimit: bytes });
  sign/route.ts:49-52     await supabaseAdmin.storage.updateBucket(AUDIO_BUCKET, { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES });
  takes/route.ts:196      await tx.takeFile.deleteMany({ where: { takeId: existing.id } });   // no storage.remove()
  OpenJobsBrowse.tsx:335-338  partSrc={job.demoFileUrl} backingSrc={job.backingFileUrl} … allowDownload={signedIn}
  ```
- Confidence: High.
- Fix direction: as E-3 — private bucket, path storage, signed reads; remove `updateBucket` from request paths (do bucket config once, out of band); on replacement, `storage.remove()` the old objects (and their `.preview.mp3`).

### [HIGH] C-4: Storage-URL check is bucket-wide, not owner-scoped, and `previewUrl` is never verified to derive from `fileUrl` — audition one file, get paid for another; cross-user object reuse   (bypass of claim #6; partially reopens E-5)
- Where: `lib/storageUrls.ts:4-11`; `app/api/jobs/[jobId]/takes/route.ts:152-164, 168-175`; `lib/takeFiles.ts:41-43`; `app/dashboard/SubmitTakeForm.tsx:173-174, 353`; `app/api/jobs/route.ts:146-150`; `app/api/jobs/[jobId]/route.ts:76-90`
- What: `isAppStoragePublicUrl` only checks `startsWith(<base>/storage/v1/object/public/audio-files/)`. It does not check `<kind>/<callerId>/`, and the take POST accepts a client-supplied `previewUrl` that passes the same prefix check and then *skips* server-side preview generation (`ensurePreviewForAudio` returns early when `previewUrl` is set). Nothing ties the preview the producer hears to the master the producer receives.
- Attack:
  1. Bait-and-switch (money-touching): musician submits `audioTakes: [{ label, fileUrl: <own mediocre WAV>, previewUrl: <any polished object in the bucket> }]`. Sources for the polished object: a preview URL from a job the attacker *posted* as a producer (all accounts have both roles — `complete-profile/route.ts:30`), or that job's public `demoFileUrl`. Producer auditions the polished preview, picks it, `finalizeAward` captures and transfers; the master delivered is the mediocre WAV.
  2. Plagiarism: `fileUrl` itself can be any bucket object — another job's `demoFileUrl` (public via anonymous `GET /api/jobs`), or a master derived via C-1 from the attacker's own producer-side job. Resubmitted on a different producer's job under the attacker's name.
  3. Same prefix-only check on `POST /api/jobs` (`demoFileUrl`, `backingFileUrl`) and `PATCH /api/jobs/:id` — a producer can point their job's demo at another user's object.
- Evidence:
  ```
  storageUrls.ts:9-10   const prefix = `${base}/storage/v1/object/public/${AUDIO_BUCKET}/`;
                        return trimmed.startsWith(prefix);
  takes/route.ts:153-158  assertAppStorageUrls([ legacyAudioUrl…, ...audioTakes.map((f) => f.fileUrl), ...midiFiles.map((f) => f.fileUrl), ...audioTakes.map((f) => f.previewUrl ?? null) ]);
  takes/route.ts:69-70  async function ensurePreviewForAudio(file: TakeFileInput): Promise<TakeFileInput> {
                          if (file.previewUrl) return file;
  SubmitTakeForm.tsx:173-174  fileUrl: audioFileUrl as string, previewUrl: audioPreviewUrl,
  ```
- Confidence: High on mechanism; the plagiarism variant needs the attacker to have funded a job (unusual condition), the bait-and-switch does not (their own job's demo is a free polished source, or any URL seen anywhere).
- Fix direction: require `fileUrl` to start with `${prefix}${kind}/${sessionUserId}/` for the kind being submitted; ignore client `previewUrl` entirely — always derive it server-side from `fileUrl` (and store the derivation), or store paths and compute preview paths at read time.

### [HIGH] C-5: `/api/uploads/preview` is an unscoped, unmetered ffmpeg transcoder — any signed-in user can point it at any object under three prefixes, burn 300 s of CPU per call, buffer 500 MB in memory, and read the raw error (ffmpeg stderr, tmp paths)   (NEW; also reopens E-23 and E-31 for this route)
- Where: `app/api/uploads/preview/route.ts:6-7, 31-42, 44-50, 56-66`; `lib/audioPreview.ts:98-109, 111-131`
- What: The route validates only `!path.includes("..")` and `^(take|demo|demo-backing)\/`. There is no check that `path` is under the caller's `userId` segment, no size/duration cap before download, no per-user throttle, and the response on failure is `err.message` verbatim (which includes `ffmpeg failed (N): <last 500 bytes of stderr>` — tmp dir names, codec/probe details — and Supabase download error text). `maxDuration = 300` advertises the budget. Output is written with `upsert: true` into the *victim's* namespace (`<path-minus-ext>.preview.mp3`).
- Attack:
  - Cost/DoS: sign in (free), `POST /api/uploads/sign` a 500 MB WAV (allowed), then `POST /api/uploads/preview { path }`. Each call: 500 MB Supabase egress + ~1 GB-RAM × up to 300 s of function time. Existence check means the *same* path only transcodes once, but a fresh 500 MB upload per iteration is free for the attacker and is never cleaned up (storage cost compounds). A crafted highly-compressible FLAC of silence decodes to hours of audio and reliably hits the 300 s ceiling and fills `/tmp`.
  - Cross-user: given any other user's object path (from C-1 previews, or public `demoFileUrl`s), `{ path: "demo/<victim>/<uuid>-song.wav", fileName: "x.wav" }` creates a public MP3 of it and returns the URL.
  - Info: `{ path: "take/<any>/nonexistent" }` → 500 with the storage error string; a corrupt upload → ffmpeg stderr.
- Evidence:
  ```
  preview/route.ts:35-42  if (!originalPath || originalPath.includes("..")) { … }
                          if (!/^(take|demo|demo-backing)\//.test(originalPath)) { … }
  preview/route.ts:58-64  error: err instanceof Error ? err.message : "Could not create preview",
  audioPreview.ts:76      else reject(new Error(`ffmpeg failed (${code}): ${stderr.slice(-500)}`));
  audioPreview.ts:128-130 .upload(previewObjectPath, mp3, { contentType: "audio/mpeg", upsert: true });
  ```
- Confidence: High (unscoped path and raw error are certain; exact cost per call depends on Vercel plan — Unverified 2).
- Fix direction: require `path` to start with `<kind>/<sessionUserId>/`; reject if the object's size (from `list()` metadata) exceeds a preview budget; enforce `-t`/`-fs` and a wall-clock kill; move transcoding off the request path; return a generic error and log details server-side; rate-limit per user.

### [MEDIUM] C-6: Post-auth open redirect survives — ASCII tab/newline bypass `safeInternalPath`; the OAuth callback's own check also omits the backslash rule   (bypass of claim #5; reopens E-17)
- Where: `lib/safeRedirect.ts:5-14`; `app/auth/callback/route.ts:14-18`; `app/(auth)/sign-in/page.tsx:53`; `app/(auth)/sign-up/page.tsx:53,70-73`; `components/GoogleAuthButton.tsx:44-45`
- What: The WHATWG URL parser strips ASCII tab/CR/LF *anywhere* in the input before parsing, so `"/\t/evil.com"` parses as `https://evil.com/`. `safeInternalPath` only `trim()`s the ends and tests `startsWith("//")`, so a tab (or `%0A`, `%0D`) after the first slash passes. Verified in Node against the exact function bodies:
  ```
  "/\t/evil.com"  | safeInternalPath -> "/\t/evil.com" => https://evil.com/   | callback -> "/\t/evil.com" => https://evil.com/
  "/\\evil.com"   | safeInternalPath -> "/producers"                          | callback -> "/\\evil.com"  => https://evil.com/
  "/\\/evil.com"  | safeInternalPath -> "/producers"                          | callback -> "/\\/evil.com" => https://evil.com/
  ```
  (A raw `?next=/%09/evil.com` decodes to the tab form via `searchParams.get`; `%5C` and `%2F%2F` are correctly blocked — I tried them.)
- Attack: phishing link `https://retrackthis.com/sign-in?next=/%09/evil.com`. Password path: `router.push("/\t/evil.com")` → Next 14 app router resolves against `location.href`, sees a foreign origin and does a full-page `location.assign` (consistent with the 14.2 `navigateReducer` → `handleExternalUrl` path noted in E-17; not quotable here — `node_modules` absent). Google path: `GoogleAuthButton` encodes the *same* tab into `redirectTo=…/auth/callback?next=%2F%09%2Fevil.com`; GoTrue accepts any redirect on the Site-URL hostname (which is why the app's own `?next=` works at all); after a real Google sign-in the callback does `NextResponse.redirect(new URL("/\t/evil.com", origin))` → `https://evil.com/`. The victim arrives on the attacker's page with a freshly minted RetrackThis session behind them — classic credential-reuse / "session expired, sign in again" phishing. Cookies are not leaked cross-origin, so this stays MEDIUM.
- Evidence:
  ```
  safeRedirect.ts:7-8   const trimmed = next.trim();
                        if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
  callback/route.ts:15-16  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/producers";
  GoogleAuthButton.tsx:44-45  const next = safeInternalPath(nextPath ?? null, "/producers");
                              const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  ```
- Confidence: High for the parser behaviour (executed); High that the callback redirect follows it (server-side `new URL(next, origin)`); Medium-High for the client `router.push` leg (library not quotable here).
- Fix direction: canonicalise with the parser instead of string tests: `const u = new URL(next, origin); if (u.origin !== origin) return fallback; return u.pathname + u.search + u.hash;` — and reject any control characters (`/[\x00-\x1f]/`). Use that one helper in the callback too.

### [MEDIUM] C-7: RLS migration does not set default privileges or disable the Data API — the next Prisma `CREATE TABLE` is exposed again; `storage.objects` untouched   (RLS claim holds for today's five tables only)
- Where: `prisma/migrations/20260919220000_enable_rls_lock_down_data_api/migration.sql:7-19`; `prisma/migrations/20260920053000_job_finalize_reminder/migration.sql`
- What: RLS is enabled (not forced — correct, Prisma connects as owner) and grants are revoked on `User`, `Job`, `Take`, `TakeFile`, `Payment`, `_prisma_migrations`. Missing: `ALTER DEFAULT PRIVILEGES … IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated` (Supabase's default privileges auto-grant new tables to those roles), `REVOKE USAGE ON SCHEMA public FROM anon, authenticated` (or removing `public` from exposed schemas), and any sequence/function revokes (none exist today). The file's header says "Lock down Supabase Data API" but the API stays on. The first migration after it (`20260920053000`) only adds a column, so nothing is exposed *yet*; the next `model` in `schema.prisma` will be, silently, with RLS off. No client-side `supabaseClient.from()` exists (grep = 0), so nothing broke — but also nothing would notice a regression.
- Attack (future): add `model AuditLog` → `prisma migrate` → `curl "$SUPABASE_URL/rest/v1/AuditLog" -H "apikey: $ANON"` → rows.
- Evidence: the migration's 13 statements are all `ALTER TABLE … ENABLE ROW LEVEL SECURITY` / `REVOKE ALL ON TABLE …`; no `DEFAULT PRIVILEGES`, no `SCHEMA`, no `storage.` in any migration (grep).
- Confidence: High.
- Fix direction: add the default-privileges revoke for the migration role, revoke schema usage or unexpose `public` in the dashboard, and add a CI check that every table in `public` has `relrowsecurity = true`.

### [MEDIUM] C-8: `scriptGuard` does not recognise Supabase's direct host, and `seed.js` loads `.env.local` *before* the guard; `SEED_TEST_PASSWORD` still defaults to `testpass123`   (bypass of claim #7)
- Where: `prisma/scriptGuard.js:20-24`; `prisma/seed.js:6-13, 24`; `.env.example:3`
- What: `looksProd` matches `supabase.com`, `pooler.supabase`, `amazonaws.com`. The Supabase *direct* connection host is `db.<ref>.supabase.co` — none of the three substrings — so a `DATABASE_URL` on port 5432/direct (the natural choice when the pooler rejects a script, and what Prisma `directUrl` users have lying around) passes the guard and `seed.js:55-58` wipes every table. `seed.js` also parses `.env.local` into `process.env` before calling the guard, so a stale `ALLOW_PROD_SCRIPTS=1` in that file permanently disarms it. Passwords with an unencoded `@`/`#` make `new URL()` throw → `host = ""` → `looksProd = false` → allowed. The seed password is still hard-coded as a fallback.
- Attack: operator with `DATABASE_URL="postgresql://postgres:…@db.abcd.supabase.co:5432/postgres"` runs `node prisma/seed.js` → guard prints `database host: db.abcd.supabase.co` and proceeds to `deleteMany()` ×4 and to create three confirmed Auth users with `testpass123`.
- Evidence:
  ```
  scriptGuard.js:20-23  const looksProd = host.includes("supabase.com") || host.includes("pooler.supabase") || host.includes("amazonaws.com");
  seed.js:6-13          for (const line of fs.readFileSync(envLocalPath, "utf8").split("\n")) { … process.env[m[1]] = m[2]; }
                        const { assertSafeDatabaseTarget } = require("./scriptGuard"); assertSafeDatabaseTarget("seed.js");
  seed.js:24            const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || "testpass123";
  ```
- Confidence: High.
- Fix direction: invert to an allowlist (`localhost`, `127.0.0.1`, `*.local`, explicit `DEV_DB_HOSTS`); treat unparseable URLs as prod; read `ALLOW_PROD_SCRIPTS` only from the real process env; require `SEED_TEST_PASSWORD` (throw if unset).

### [MEDIUM] C-9: Error sanitisation is partial — five routes still return raw `err.message`; `POST /api/jobs` turns Stripe decline reasons into a card-testing oracle   (reopens E-31; claim #11 holds only for `/api/instruments` and the admin routes)
- Where: `app/api/uploads/preview/route.ts:60`; `app/api/jobs/route.ts:173-175`; `app/api/jobs/[jobId]/select-winner/route.ts:7-12, 89`; `app/api/stripe/connect/onboard/route.ts:101-103`; `app/api/stripe/connect/dashboard/route.ts:27-29`
- What: `select-winner`'s `stripeMessage()` returns *any* object's `.message`, including Prisma errors (which embed model/field names and, for connection failures, the pooler host). `POST /api/jobs` returns the Stripe error verbatim at 402 — "Your card was declined", "insufficient funds", "incorrect_cvc" etc. — with a real authorization attempt per call and no rate limit (C-10), which is a card-testing service. Preview leaks ffmpeg stderr and tmp paths (C-5).
- Evidence:
  ```
  jobs/route.ts:173-175    const message = err instanceof Error ? err.message : "Card authorization failed. Try another card.";
                           return NextResponse.json({ error: message }, { status: 402 });
  select-winner/route.ts:8-9   if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") { return (err as { message: string }).message; }
  ```
- Confidence: High.
- Fix direction: map Stripe `code`/`decline_code` to a fixed set of user strings; everything else → generic message + server log with a correlation id.

### [MEDIUM] C-10: No rate limiting anywhere; cheapest abuses now: replace-take email cannon, unscoped transcodes, unlimited 500 MB uploads, anonymous Stripe/email sweeps that race   (E-23 still open)
- Where: `middleware.ts` (no limiter), `package.json` (no limiter dep); `app/api/jobs/[jobId]/takes/route.ts:190-221`; `app/api/jobs/route.ts:246-293`; `lib/jobActions.ts:277-316`; `app/api/uploads/sign/route.ts:45-61`
- What / cheapest vectors, ranked by attacker cost:
  1. **Email cannon (one account, no card):** set a PayPal payout email (`/api/payouts/alt` — email + name, no verification), then loop `POST /api/jobs/<job>/takes` with the same `fileUrl`; every call hits the replacement branch and sends `notifyCreatorTakeSubmitted({ replaced: true })` — one email to the producer per request, forever. Across all open jobs, every producer.
  2. **CPU/egress:** C-5.
  3. **Storage:** `POST /api/uploads/sign` unlimited; each call also makes two Storage admin calls (`ensureAudioBucket` memoised, but `updateBucket` runs every time).
  4. **Anonymous Stripe/email trigger:** every anonymous `GET /api/jobs` runs `finalizeDueAwards()` (Stripe capture + transfer), `sendDueFinalizeReminders()`, `cancelJobAndRefund()` (fire-and-forget), `sendDueThreeDayReminders()`. Two concurrent anonymous requests both select the same due job (`findMany` at `jobActions.ts:279-290`, no lock, no idempotency key) and both enter `finalizeAward` — the second `capture` fails with `payment_intent_unexpected_state`, but whether `transfers.create` can run twice depends on where the first request is when the second re-reads status (E-8 territory; flagged for that reviewer). Also `sendDueThreeDayReminders` marks the job *after* sending.
  5. **Card testing:** C-9 via `POST /api/jobs` (needs a `pm_`, min price; each call is a real auth).
- Evidence:
  ```
  takes/route.ts:210-214  await notifyCreatorTakeSubmitted({ job: …, musicianName: take.musician.name, replaced: true });
  jobs/route.ts:248-252   try { await finalizeDueAwards(); } catch (err) { … }      // on anonymous GET
  jobs/route.ts:281       void cancelJobAndRefund(job.id).catch(…)
  ```
- Confidence: High on absence and on vector 1; Medium on the sweep race outcome.
- Fix direction: per-user + per-IP limiter (Upstash/Vercel KV or in-DB token bucket) on takes POST, preview, sign, forgot-password proxying, jobs POST; move sweeps to a cron with a DB advisory lock and Stripe idempotency keys; cap replacements per take per hour.

### [MEDIUM] C-11: Admin `reset-payouts` has no audit trail, `force` wipes live Stripe destinations, and clearing a musician between pick and finalize strands the job   (NEW, admin-only)
- Where: `app/api/admin/members/[userId]/reset-payouts/route.ts:24-25, 51-66, 68-78`; `lib/jobActions.ts:252-261, 60-135`
- What: Nothing records *which admin* cleared *whose* payout data or the previous values (the response echoes `previousAccountId` once and it is gone). `force: true` skips the "already ready" check and nulls a working `stripeAccountId`. `finalizeAward` re-reads `musician.stripeAccountId` at capture time; if it was cleared after the provisional pick, finalize fails ("Musician hasn't finished payout setup"), the job stays OPEN, the ~7-day hold expires, and neither party is paid.
- Attack: a compromised or careless admin session (no re-auth, no 2FA gate) `POST /api/admin/members/<winner>/reset-payouts {"force":true}` the day before auto-finalize.
- Evidence: `:69-77` `db.user.update({ … stripeAccountId: null, payoutProvider: null, payoutEmail: null, … })` with no log write; `:25` `const force = Boolean(body.force);`.
- Confidence: High.
- Fix direction: write an `AdminAction` row (actor, target, before/after, reason); refuse when the user has a provisionally-won OPEN job; require an explicit typed confirmation for `force`.

### [MEDIUM] C-12: Upload-sign MIME allowlist includes `application/octet-stream`, so the "file types restricted" claim is nominal; `updateBucket` is re-issued without `fileSizeLimit` on every sign   (weakens claim #2)
- Where: `app/api/uploads/sign/route.ts:7-26, 47-55`; `lib/supabaseAdmin.ts:15-21`
- What: Any browser can label any bytes `application/octet-stream`; the allowlist therefore admits arbitrary content (the rest of the list is irrelevant). The bucket is then updated with `{ public, allowedMimeTypes }` and *no* `fileSizeLimit`; whether Supabase's `PUT /bucket/:id` preserves or nulls an omitted `file_size_limit` is not verifiable from code (Unverified 6) — if it nulls it, the 500 MB server cap is gone after the first upload of each cold start until `ensureAudioBucket` runs again on the next cold start.
- Evidence: `:24-25` `// Browsers sometimes send MIDI / WAV as octet-stream` / `"application/octet-stream",`; `:49-52` `updateBucket(AUDIO_BUCKET, { public: true, allowedMimeTypes: ALLOWED_MIME_TYPES })`.
- Confidence: High on octet-stream; Low-Medium on the size-limit reset.
- Fix direction: drop octet-stream and sniff magic bytes in the preview/validation step instead; configure the bucket once, out of band, with both fields.

### [LOW] C-13: Security headers still absent; session cookie is browser-readable by library design   (E-32 open)
- Where: `next.config.mjs:1-7` (no `headers()`); `lib/supabaseClient.ts:5-8` / `@supabase/ssr@0.12.4` (lock)
- What: No CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`. HSTS is typically injected by Vercel for custom domains (Unverified). `@supabase/ssr`'s browser client must read the auth cookie, so it is `httpOnly: false` (prior review quoted 0.10.3's `DEFAULT_COOKIE_OPTIONS`; 0.12.4 not quotable here). Any XSS = session theft; the only current XSS-shaped input is C-6's redirect (path-only, so no `javascript:`).
- Fix direction: add `headers()` with a nonce-based CSP (allow Stripe/Supabase origins), `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`.

### [LOW] C-14: Public `GET /api/jobs` still returns the full `Job` row (`creatorId`, file URLs, price, key); takes GET returns `musician.id`   (E-6 unchanged)
- Where: `app/api/jobs/route.ts:260-267, 313-318`; `app/api/jobs/[jobId]/takes/route.ts:85-88`
- Evidence: `visible.map(({ _count, takes: winningTakes, ...job }) => ({ ...job, … }))` — no projection.
- Fix direction: public DTO without `creatorId`; ids are only useful to admins.

### [LOW] C-15: `/reset-password` accepts *any* session, not a recovery session; callback passes an unvalidated `type` to `verifyOtp`
- Where: `app/(auth)/reset-password/page.tsx:24-37, 64`; `app/auth/callback/route.ts:40-44`
- What: `hasSession` is `Boolean(data.session)`; a normally signed-in user (or anyone at an unlocked machine) can set a new password with `updateUser({ password })` and no old-password check. That is Supabase's default semantics, but the page's copy ("Link expired") implies a recovery gate that does not exist. `type` is cast, not validated. `next` is *not* honoured on this page (good); user enumeration on forgot-password is absent (Supabase returns success either way; copy at `:68` is correct).
- Fix direction: gate the form on the `PASSWORD_RECOVERY` event only (track it in state), or require `reauthenticate()`; allowlist `type`.

### [LOW] C-16: ffmpeg runs untrusted containers with no hardening
- Where: `lib/audioPreview.ts:52-67`
- What: Arguments are fixed (no injection — see "held"), but there is no `-t`/`-fs` output cap, no `-nostdin`, no `-protocol_whitelist file,crypto,data`, no `-f` forcing the demuxer, and `-i` gets an extension-less file so ffmpeg probes every demuxer (playlist formats can reference other local files; default `safe`/protocol rules mostly neutralise this, but a probe-driven parser CVE in `ffmpeg-static@5.3.0`'s bundled build would be reachable by any signed-in user via C-5).
- Fix direction: `-nostdin -protocol_whitelist file -t <max> -fs <bytes>`, run with a wall-clock kill, and pin/track the ffmpeg build.

### [LOW] C-17: Take replacement — old objects orphaned; audition/replace race; note that the guard *does* hold for picked takes
- Where: `app/api/jobs/[jobId]/takes/route.ts:186-222`; `lib/jobActions.ts:263-266`
- What: Replacement is correctly refused once `isWinner` is set, and `selectProvisionalWinner` sets `isWinner` on the provisional pick, so a picked take cannot be swapped (attack #11 fails — see "held"). Remaining issues: the musician can swap between the producer's audition and the click (mitigated only by the "updated" email), and the superseded storage objects (+ their previews) are never removed (C-3).
- Fix direction: `storage.remove()` on replace; show "updated since you last listened" in the UI using `submittedAt`.

### [INFO] C-18: Doc/code mismatches and dead weight
- `fluent-ffmpeg@2.1.3` is in `dependencies` but imported nowhere (grep = 0) — unmaintained package shipped for nothing; remove.
- `next.config.mjs:4` uses `serverExternalPackages` (Next 15 name) on Next 14.2.35 — Next 14 expects `experimental.serverComponentsExternalPackages`; the line is ignored (feeds C-2).
- `README.md:71` says "20MB server-enforced cap"; code says 500 MB (`lib/constants.ts:3`).
- RLS migration header says it locks down the Data API; it does not (C-7).
- `tsconfig.tsbuildinfo` is tracked (`git ls-files`), despite `next-env.d.ts` being ignored.
- `README.md:61-64` tells local devs to turn *off* "Confirm email" and prod to keep it *on*; the admin-bootstrap guard (C-held #9) is only as good as that toggle.

## Claims that held (what I attacked and could NOT bypass)
- **#1 Takes listing requires creator/admin** — `app/api/jobs/[jobId]/takes/route.ts:252-275`: anonymous → 401; a musician or a second producer → 403 (`getAdminUser()` returns null unless `isAdmin` or confirmed-allowlisted). Tried: musician session on a job they entered; second creator; `?mine`-style tricks (none exist); admin-promotion side channel (needs allowlisted confirmed email). `/api/takes/mine` (`:14`) is scoped by `musicianId`. Admin preview page fetches only admin-gated APIs. No `takes` include in public `/api/jobs` (only `_count` and winner ids, `:263-266`). No file URLs in email payloads (`lib/notify.ts` grep = 0).
- **#2 Upload signer auth + scoping** — `sign/route.ts:32-35` (401), `:41-43` (`kind` from a 4-entry `Set`), `:57-59` (`safeName` restricted to `[A-Za-z0-9.\-_]`, path prefixed with `kind/userId/uuid-`). Tried: `fileName: "../../x"` → `.._.._x`-style dots only, harmless behind the UUID prefix; `fileName: "x.preview.mp3"` → new UUID, cannot collide with an existing preview; very long names → Storage error → generic 500. Signed-upload token is path-bound and non-upsert by default (Supabase semantics; not quotable here).
- **#5 partially** — `safeInternalPath` blocks `//evil.com`, `https://evil.com`, `/\evil.com`, `%2F%2F` (decoded to `//`), `%5C` (stays literal), `javascript:`. Only the control-character class escapes (C-6).
- **#9 Admin bootstrap requires confirmed email** — `lib/admin.ts:41-42, 50`; `app/api/auth/me/route.ts:22`. A Google identity satisfies `email_confirmed_at` only if Google asserts the address; both hard-coded allowlist entries are addresses an attacker cannot get Google to verify for them. `profile.email` is set server-side from `user.email` (`complete-profile/route.ts:36`); account PATCH writes `name` only (`settings/account/route.ts:42,49`).
- **#11 Admin routes** — 8/8 call `requireAdmin` before any DB access; `/api/instruments` is `force-dynamic` and returns catalog data only.
- **Preview route: no SSRF, no argument injection** — `publicUrl` is never fetched (only echoed back at `audioPreview.ts:92`); bytes come from `supabaseAdmin.storage.download(originalPath)` (`:116-118`); ffmpeg args are a fixed array with server-generated tmp paths (`:52-66`, `spawn` without a shell). Tried: `publicUrl: "http://169.254.169.254/…"` (ignored), `path` with `..` (rejected), `fileName` with `;` and spaces (never reaches ffmpeg).
- **Take replacement of a picked take** — refused at `takes/route.ts:190-193` because `selectProvisionalWinner` sets `isWinner: true` (`jobActions.ts:263-266`); OPEN status and deadline enforced first (`:135-150`); self-submission blocked (`:139-144`).
- **OAuth callback exchanges server-side (PKCE)** — `callback/route.ts:37-39`. An attacker-crafted Supabase `/authorize` link cannot complete: without the victim's `code_verifier` cookie GoTrue falls back to implicit flow and returns tokens in the URL fragment, which the server never sees → `/forgot-password?error=invalid_link` (`:48-50`). The only way to reach the callback with a valid code is to start from RetrackThis's own button — which is why C-6 matters.
- **Webhooks** — Stripe `constructEvent` (`stripe/route.ts:30`), Resend HMAC (`resend/route.ts:21`); both fail closed when the secret is unset.
- **CSRF** — state changes are JSON `fetch` POST/PATCH; Supabase cookies default `SameSite=Lax`, which is not sent on cross-site POST.
- **RLS did not break the app** — no `supabaseClient.from()`/`.rpc()` in `app/`, `components/`, `lib/` (grep); only `supabaseClient.storage.uploadToSignedUrl` (`FileUpload.tsx:155-157`), which is token-based.
- **Password reset** — token exchange happens server-side via the callback; `next` is hard-coded to `/reset-password` (`forgot-password/page.tsx:46-48`); `/reset-password` ignores query params; forgot-password response does not distinguish existing vs unknown emails.

## Unverified suspicions (needs Supabase/Vercel evidence)
1. **Is the ffmpeg binary present in the deployed function?** Look for `ffmpeg binary is not available on this server` in Vercel logs, and check whether any `TakeFile.previewUrl` is non-null for WAV uploads since `b25149f`. If absent, C-2 is firing on every WAV take today.
2. **Vercel plan limits** — is `maxDuration = 300` honoured, function memory, `/tmp` 512 MB. Determines C-2 frequency and C-5 cost per call.
3. **Supabase "Confirm email" is ON in production** (README:64). If OFF, `email_confirmed_at` is set at signup and claim #9's guard is void (E-16 fully reopens).
4. **Supabase Site URL / redirect allowlist** — confirm Site URL is `https://retrackthis.com`; GoTrue's same-hostname rule is what lets `?next=` through (C-6 exploit path).
5. **Supabase auth email rate limits** — with the built-in sender the project-wide cap is low; an attacker hammering `resetPasswordForEmail` can exhaust signup/reset mail for everyone (DoS, not enumeration).
6. **Bucket state** — is `audio-files` public right now (it will be); do `allowedMimeTypes` include `application/octet-stream`; does `updateBucket` without `file_size_limit` reset the cap (C-12)?
7. **`@supabase/ssr@0.12.4` cookie options** — confirm `httpOnly: false` (C-13).
8. **Did the seed ever run against prod?** — Auth users list for `@example.com` (carried from E-21; C-8 shows the guard would not have stopped a direct-host run).
9. **Storage listing** — confirm no `storage.objects` policy grants `select` to `anon` (public buckets do not list by default; a stray policy would let anyone enumerate every master).

## Notes for the critic
- C-1 is rated CRITICAL under the brief's definition (data breach reachable by a normal user today). If the critic prefers to reserve CRITICAL for *anonymous* reach, downgrade to HIGH — but note that the producer is the only party the gate is meant to stop, and they get every master for a refundable hold.
- C-1/C-2/C-3/C-4 are one root cause seen from four sides: **URLs are capabilities in a public bucket, and the app trusts client-supplied URLs.** The real fix (private bucket, path storage, signed reads, server-derived previews) closes all four; per-finding patches will leave gaps.
- C-10 vector 4 (anonymous sweep race) overlaps the escrow reviewer's E-8; I did not trace `finalizeAward`'s full body for double-transfer, only confirmed there is no lock or idempotency key on the trigger. Hand off.
- Nothing in this range adds a new **anonymous** CRITICAL; the anonymous surface is `/api/jobs` (sweep trigger + data), `/api/instruments`, the public bucket, and the two signed webhooks.
- Attack #5 (Google account-linking takeover) fails on mechanism: GoTrue links only provider-verified emails, and neither allowlisted address is forgeable through Google. Still worth confirming the Supabase "Confirm email" and "Allow manual linking" settings (Unverified 3).
- Attack #13 (headers) and #14 (`tsbuildinfo`, `fluent-ffmpeg`) are confirmed but LOW/INFO; listed in C-13 and C-18.
