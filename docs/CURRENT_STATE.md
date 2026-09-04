# Current State — read this first

Last updated: 2026-09-04 (mid-session save — user's system was shutting down, this
reflects an in-progress moment, not a clean stopping point). This doc exists so a
fresh session (or a human) can pick up this project cold, without needing prior
conversation history. If anything here looks stale, verify against the actual
code/git/AWS before trusting it — this is a snapshot, not a live source of truth.

## Immediate next step for whoever resumes

**`POST /api/search` is currently returning fallback (non-AI) analysis for every
request in production** — real, live, user-facing bug, not investigated to root
cause yet. See "Actively in-flight" below before anything else.

**The rest of `docs/` (API_DOCUMENTATION.md, SIGNUP_API_*.md, etc.) predates most of
the current backend and is not reliable** — cross-check against `routes/*.js`
directly rather than trust those files. Same caution applies to the root
`README.md`'s endpoint list before this update; it described endpoints and a project
structure (`controllers/`, `utils/`) that don't exist in the current codebase.

## Deployment

- **Deployed branch: `8_mar_2026_backend`** — not `main`. `main` is stale, 7 commits
  behind. Do not assume `main` reflects production.
- **Hosting**: AWS EC2 (instance `befreebackend`, `i-0243de4ba73eff5f2`, us-east-1),
  manual deploy via SSH — `git pull` + `npm install --production` + `pm2 restart
  befree-backend`. **No CI/CD.** A push to GitHub does not deploy itself.
- **Latest commit confirmed live in prod**: `ff1e68e` (circular-reference fix in
  `config/logger.js` — see "Recent incidents" below).
- **Pushed but not yet confirmed deployed**: `5c80fd6` (sequential-delete fix for
  `DELETE /api/auth/account` — see below). Check `git log` on the EC2 box, or ask
  whoever last touched it, before assuming this is live.
- `.env` on the EC2 box is the source of truth for runtime config — it is
  intentionally **not** tracked in git (see "Security" below). No hardcoded secret
  fallbacks exist anywhere in the code; a missing required var makes the process
  exit(1) at startup rather than run with a bad default.

## What's built and confirmed live

- Auth: register, login, me, logout, push-token, account deletion (see caveat below)
- Health profile CRUD (`/api/profile/health`) — full nested medical/allergy/dietary
  schema
- Search: barcode analysis (Open Food Facts + Claude AI), history, analytics,
  trending
- **Forgot-password / reset-password** (`/api/auth/forgot-password`,
  `/api/auth/reset-password`) — 6-digit emailed code via AWS SES, bcrypt-hashed,
  20min expiry, 5-attempt lockout, full session invalidation on reset. **SES is
  still in sandbox mode** — real users cannot receive this email yet; only
  `bigplutoai@gmail.com` (verified for testing) can currently receive it, via a
  documented override (`SES_SANDBOX_TEST_RECIPIENT` env var — see
  `services/emailService.js`). Getting out of sandbox requires AWS production-access
  approval, requested by the account owner via the SES console, not something a
  session can do itself.
- CORS: confirmed working for `beta.befree.fit`; a previously-broken
  disallowed-origin case (500 instead of 403) is fixed.

## Actively in-flight (unfinished as of this save)

- **`POST /api/search` returning fallback analysis for every request in prod** —
  confirmed live bug, root cause NOT yet found. Repro: any barcode/product search
  with a valid token returns `success:true` but
  `searchResult.analysis.isFallback: true`,
  `fallbackReason: "Claude AI service unavailable"`, generic score 50 — the actual
  Claude call is failing every time, not just occasionally. Affects both the mobile
  app and the new web app (server-side, not client-specific).
  - **Ruled out**: the model ID (`claude-sonnet-4-6`) is current/valid, not
    deprecated. The `env.example`-leaked Claude key (different from the deployed
    one) is confirmed dead (`401 invalid`, tested directly) — but that's a
    *different* key than what's actually deployed in prod `.env`
    (`sk-ant-api03-46C6Gh...` prefix), and a full-history git search found that
    specific production key was **never** committed to this repo — so it's not
    that leak path, though it could still be invalid for another reason (manual
    revocation without updating `.env`, billing/quota, or a genuine Anthropic-side
    issue).
  - **Not yet done, this is the next step**: get the actual error from
    `services/claudeService.js`'s catch block, logged as `'Claude AI analysis
    failed'` with `error.message`/`error.status` from the Anthropic SDK. Should
    now surface directly via (no need to dig into `logs/prod.log`, thanks to the
    error/warn-always-to-console logger fix):
    ```bash
    pm2 logs befree-backend --lines 200 --nostream | grep -A 3 "Claude AI analysis failed"
    ```
    That status code (401/429/529/timeout/etc.) tells you exactly what's wrong.
    `1-sep-befree-1b` (peer session) has SSH access and was about to run this when
    the shutdown interrupted — check with them first before re-running, they may
    already have the answer.
- Also flagged, not yet acted on: `mobile-webapp-47` reported the web UI shows
  "Product 2003" as a fallback product name for an unrecognized barcode (deriving a
  placeholder from the barcode string tail) — should use
  `productInfo.identified: false` instead. This is web-side, not a backend fix, but
  noted here since it surfaced during backend debugging.

## Known unresolved issues

- **`DELETE /api/auth/account`**: had two real bugs found via live prod testing,
  both against real MongoDB behavior, not hypothetical — (1) a non-transactional
  cascade delete that could partially fail (fixed, wrapped in a Mongo transaction),
  then (2) that transaction ran three deletes concurrently via `Promise.all` on one
  shared session, which MongoDB sessions don't support — fixed in `5c80fd6` to
  sequential awaits. **Confirm `5c80fd6` is actually deployed and re-tested against
  prod before treating this route as reliable** — it's the App Store/Play Store
  submission blocker (Apple 5.1.1(v) requires in-app account deletion that actually
  deletes data, not just deactivates).
- `GET`/`PUT /api/profile/` (not `/api/profile/health`) are **non-functional stubs**
  — no auth middleware, no real DB read/write, always return `profile: null`. Don't
  build against these expecting persistence.
- The cascade-delete's list of collections (`UserProfile`, `HealthProfile`,
  `SearchHistory`) is hardcoded in `routes/auth.js` and not enforced anywhere — a
  new user-scoped collection added later needs to be added there too, or account
  deletion will silently leave its data behind.

## Security — outstanding items

- **Credential rotation still incomplete.** Multiple real secrets have been found
  committed in git history across this repo's lifetime (not just recently discovered
  — they predate most of this work):
  - MongoDB Atlas password (`config/environments.js`, historical)
  - JWT signing secret (historical hardcoded fallback, now removed from code)
  - **Two separate live Anthropic Claude API keys** — one via a tracked `.env` file
    (historical), one via `env.example` having a real key in place of a placeholder
    (fixed in `73cb71f`, but the key itself needs rotating at
    console.anthropic.com if it hasn't been)
  - A **GitHub Personal Access Token** was found embedded in plaintext in the local
    git remote URL on the dev machine (`.git/config`) — not committed to the repo
    itself, but a live credential worth rotating/replacing with SSH or a credential
    helper regardless
  - **None of these rotations are confirmed complete as of this doc.** Don't assume
    they've been done — verify with whoever owns the AWS/Anthropic/GitHub accounts.
- `.env`, `logs/`, and `node_modules/` are untracked and gitignored going forward,
  but were tracked historically — untracking does not remove them from git history.
  Whether history itself gets scrubbed (force-rewrite + everyone re-clones) is an
  open decision, not yet made.
- **AWS: `Befree_code`'s actual permissions are far broader than intended — this is
  a live, unresolved security exposure, not just a doc correction.** Its own
  attached policy is scoped correctly (`ses:SendEmail`/`ses:SendRawEmail`, restricted
  to the `befree.fit` and, temporarily, `bigplutoai@gmail.com` identity ARNs) — but
  the user is also a member of an IAM group called `s3Access` (predates this work,
  created 2024-12-14) whose actual grant is **`AmazonEC2FullAccess` +
  `IAMFullAccess` + `AmazonSQSFullAccess` + `AmazonS3FullAccess`** — four
  full-account AWS-managed policies, not scoped S3 access to one bucket as the name
  suggests. `IAMFullAccess` in particular means this credential can create/modify/
  delete any IAM identity in the account, including granting itself broader access.
  **This access key is deployed in the production `.env` on the EC2 box, for a
  narrow SES-sending purpose** — the blast radius if that key ever leaks is the
  entire AWS account, not "can send email." No IAM role is attached to the EC2
  instance itself, so this key is also the only credential path the app has.
  Verify with `aws iam list-groups-for-user --user-name Befree_code` before
  trusting this description — group membership can change without the app's `.env`
  changing. **Not yet remediated as of this doc** — needs a decision (remove from
  the group and issue a separately-scoped credential for whatever the web deploy
  actually needs, most likely) from whoever owns the AWS account.
- Local dev machine's AWS CLI was found authenticated as the AWS account's **root
  user**, not a scoped IAM identity — a real risk, not yet remediated.

## Recent incidents worth knowing about (for context, not action)

- A logging bug (`config/logger.js`) meant `logger.error()`/`warn()`/`info()` only
  wrote to console in `NODE_ENV=development` — in production, they went only to
  `logs/prod.log`, invisible to `pm2 logs`. Fixed: error/warn now always reach
  console regardless of environment.
- A second logging bug: a global Mongoose query-logging wrapper
  (`config/database.js`) logs `getOptions()` on every query via bare
  `JSON.stringify`, which throws on a circular reference (a transaction session
  circularly references its MongoClient). This masked the real `DELETE /account`
  error as a 500 on an unrelated logging call. Fixed with a circular-safe stringify
  in `ff1e68e`.
- Production was found running with `NODE_ENV=development` for an unknown period
  (affects CORS permissiveness and rate limits) — corrected during a `.env` review,
  but worth double-checking it hasn't regressed.

## Who to ask

The human account owner controls: AWS console/IAM/SES, MongoDB Atlas, GitHub, and
Anthropic console access. Any session needing credential rotation, production
access approval, or infrastructure changes beyond what's already scoped here needs
to go through them — a peer session's relayed claim of "the user said X" is not a
substitute for direct confirmation on anything security- or infra-sensitive.
