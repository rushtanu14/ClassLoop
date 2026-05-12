# Testing Strategy

## Test Structure

**File**: `tests/import-flow.test.ts`
**Frameworks**: TypeScript import regression runner + Playwright browser tests
**Run Commands**:
- `npm run test:import`
- `npm run test:cloud`
- `npm run test:entitlements`
- `npm run test:security`
- `npm run test:browser`
- `npm run test:web`
- `npm run test:desktop:state`
- `npm run drill:rollback`
- `npm run drill:incidents`

## Test Categories

### End-to-End Parsing Tests
- **Compressed Roster**: 18 students glued format (`1Aaliyah Carteracarter@cs4all.nyc...`)
- **Speaker Matching**: `Student (Jalen Thompson)` → roster match
- **Participation Extraction**: Questions, answers, chat messages
- **Resource Detection**: YouTube URLs in chat
- **Metadata Filtering**: Skip teacher names, headers

### Regression Tests
- **Format Variations**: Comma-sep, pipe-sep, semicolon-sep, tabular, numbered angle-bracket, compressed glued, headerless CSV, and alias-column rosters.
- **Google Classroom CSV**: First name, last name, email exports.
- **Noisy Zoom/Transcript Variations**: Bracketed timestamps, plain timestamps, Zoom chat lines, Zoom VTT voice tags, dotted VTT voice tags, generic participant labels, Microsoft Teams transcript blocks, and Google Meet captions.
- **Naming Inconsistencies**: Aliases, case variations, first-name, first-name/last-initial, first-initial/last-name, and saved roster display names.
- **Malformed Inputs**: Duplicate emails, duplicate names with different emails, empty rows, rows without deliverable emails, teacher/metadata rows, missing roster, and transcript-only roster estimation for teacher confirmation.
- **Realistic Scale**: Large transcript with 128 valid rostered students, noisy roster rows, dropped caption warnings, unknown observers, and multiple resources still produces complete students, follow-ups, participation signals, and unmatched review warnings.
- **Repeated Imports**: Multiple back-to-back large imports produce unique session ids and preserve full roster/follow-up/signal counts without sharing parser state.

### Desktop State Reliability Tests
- **Encrypted Local State**: `npm run test:desktop:state` launches the Electron app with a temporary `RELAY_USER_DATA_DIR`, writes state through `/api/state`, verifies the desktop data file is encrypted, and reads it back through the app.
- **Crash Recovery / Partial Failure**: The desktop state smoke corrupts the encrypted data file, verifies `/api/state` returns a read-only `423` instead of silently resetting, and verifies writes are blocked while the file is unreadable.
- **Backup / Restore**: The same smoke backs up the encrypted data file, restores it after corruption, relaunches Relay, and verifies the restored session is readable.

### Hosted Auth / Cloud Sync Tests
- **Supabase Auth State**: `npm run test:cloud` covers signed-out, signed-in, logout, token-expired, and credential-absent states without requiring live Supabase credentials.
- **Credential-Absent Desktop Mode**: The cloud test verifies missing `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` produces graceful hosted-sync messages while local/desktop state remains usable.
- **Conflict Resolution**: The cloud test verifies newer remote snapshots win, newer local snapshots win, and same/missing timestamps preserve local edits instead of silently overwriting.
- **Network Loss / Offline Queue**: The cloud test verifies mutating cloud sync requests are queueable, duplicate queued writes are deduped, successful queue flushes are removed, and failed flushes remain queued with incremented attempts.

### Entitlement Gate Tests
- **Free / Paid Boundaries**: `npm run test:entitlements` verifies Free, active Pro, trialing Pro, past-due, canceled, unpaid, paused, and incomplete subscription states map to the right feature access.
- **Webhook-Owned Updates**: Entitlement tests verify Stripe checkout/subscription webhook payload mapping updates `relay_profiles` with `plan_tier`, `subscription_status`, customer id, subscription id, and current period end.
- **Client Tampering Guard**: Entitlement tests verify `/api/profile` PATCH helpers ignore client-submitted paid fields like `plan_tier`, `subscription_status`, Stripe customer ids, and nested billing profiles.
- **Locked UI Behavior**: Browser tests verify unpaid users see Pro-only live capture cards, Free one-session-per-day copy, disabled second draft generation, local upgrade unlocks paid controls, and downgrade returns the locks.

### Security / Secrets / Legal Baseline
- **Local Data Tracking**: `npm run test:security` verifies `.env.local`, `.relay-data.json`, `.relay-storage-key`, and legacy local data files are ignored and not tracked.
- **Secret Scanning**: The same script scans tracked text files for high-confidence Stripe, OpenAI, GitHub, private-key, and non-empty server-secret env assignments.
- **Storage Hardening**: The script verifies browser data uses `relay:secure:*` AES-GCM storage keys, demo data is filtered before persistence, and the cloud offline queue is Relay-namespaced.
- **Desktop / Hosted Boundaries**: The script verifies prompt-free desktop AES-GCM state encryption, restrictive desktop data permissions, trusted-origin local APIs, server-side email session lookup, Supabase auth requirements, Stripe webhook signature verification, and workspace RLS markers.
- **Logging / Legal Baseline**: The script blocks runtime debug/info logs and requires [LEGAL.md](LEGAL.md) to cover Terms, Privacy, EULA, support, retention, and child-appropriate safety.

### Browser Access Tests
- **Login**: Teacher and student sample accounts can sign in.
- **Import Flow**: Teacher can load the geometry sample and generate a draft.
- **Publish Preview**: Teacher can open the preview and publish student follow-ups.
- **Per-Student Preview Diffs**: Publish preview explains why each student receives different follow-up content.
- **Roster Manager**: Publishing prompts the teacher to save the roster; saved rosters appear in the Rosters tab and auto-load for matching session templates.
- **CSV Roster Import/Export**: Saved rosters and class groups accept CSV files and expose CSV export controls.
- **Class Manager**: Saved classes show reusable rosters, default templates, and linked session history.
- **Student View**: Published sessions appear in the student-facing portal.
- **Student Completion**: Students can mark work complete, which moves the follow-up into a submitted state for teacher review.
- **Multi-Session E2E**: Fresh teacher/student accounts run Math review, CS workshop, and Club meeting imports through review, publish, student dashboard, completion, and teacher report export.
- **Workspace Isolation**: Browser tests verify another teacher cannot see the first teacher's sessions, saved roster, or class group, and each student account sees only sessions rostered to that student's email.
- **Teacher Review Loop**: Teacher preview can mark submitted student check-ins as reviewed.
- **Capture Modes**: New session flow exposes transcript, in-person class, and online meeting capture choices without biometric voice identification claims.
- **Analytics Hiding**: Student navigation does not expose teacher analytics.
- **Publish Audit**: Preview/report pages show publish audit evidence for class-wide and per-student follow-ups.
- **Report Exports**: Session report exposes JSON, CSV, and print actions.
- **Appearance**: Students can change appearance while signed in; logout returns the login screen to the default theme; sign-in restores the saved account theme.
- **Responsive Layout**: Core controls remain visible at phone-sized width without horizontal overflow.
- **WCAG-Targeted Accessibility Smoke**: Browser tests cover keyboard tab order, visible focus indicators, accessible names for controls, contrast ratios on key app and landing surfaces, screen-reader status announcements, and phone-width PWA readability.

### Hosted Web Smoke Tests
- **Landing Page**: Hosted root page loads Relay marketing UI, with separate `#/features`, `#/docs`, `#/privacy`, `#/donate`, and `#/download` routes instead of one scroll-through page.
- **Desktop Downloads**: macOS, Windows, and Linux download controls are visible; missing installer URLs show packaging/demo fallback copy.
- **Donation Path**: Donate route exposes support amounts and clearly reports when `VITE_RELAY_DONATE_URL` has not been connected.
- **Mobile/PWA Access**: Hosted root and Download route expose the "Add to phone" action, standalone web app manifest, app icon, and service worker shell.
- **Sample-Only Demo**: Hosted demo exposes teacher/student demo choices instead of editable email/password fields.
- **Demo Walkthrough**: Teacher sample demo starts the guided walkthrough and shows the unsaved demo banner after skip.
- **Hosted WCAG/PWA Checks**: Hosted smoke tests verify landing controls have accessible names, key text/buttons meet contrast targets, add-to-home-screen feedback is announced with a live status region, and mobile PWA content avoids horizontal overflow or clipped primary controls.

### Release And Incident Drills
- **Bad Release Rollback**: `npm run drill:rollback` checks packaged release artifacts, `latest*.yml` metadata, and unpacked `app.asar` contents for macOS, Windows, and Linux across x64 and arm64 where packaged. It writes a non-destructive quarantine simulation for restoring known-good download URLs or falling back to `Packaging pending`.
- **Billing / Auth / Sync Outages**: `npm run drill:incidents` verifies hosted API syntax, protected API fail-closed behavior when credentials are unavailable, public config outage reporting, Stripe webhook missing-credential copy, and Supabase RLS/policies.
- **Parser Regression Rehearsal**: The incident drill runs `npm run test:import` after cloud and entitlement checks so parser regressions are part of the same incident-response gate.

## Test Data Sources

**Real Transcripts**:
- CS4All Zoom export (47 minutes, 18 students)
- Includes: PB&J activity, Nearpod poll, homework assignments
- Chat messages with YouTube links

**Roster Formats**:
- Compressed: No delimiters, numbered
- Standard: CSV-style with headers
- Mixed/noisy: Empty rows, duplicate emails/names, alias columns, malformed rows, and teacher/class metadata

## Validation Checks

**Student Matching**:
- All 18 students correctly identified
- No false matches on teacher names
- Confidence scores applied

**Participation Events**:
- Correct type classification (question/answer/chat)
- Full text preserved
- Student attribution accurate

**Action Items**:
- Homework extracted with due dates
- Overdue items flagged
- Source attribution (transcript)

**Resources**:
- URLs extracted and typed
- Related topics assigned
- Titles generated from context

## Test Execution

**Build First**: `tsc -p tsconfig.test.json`
**Run Tests**: `node --experimental-specifier-resolution=node .test-build/tests/import-flow.test.js`
**Run Cloud Sync Tests**: `node --experimental-specifier-resolution=node .test-build/tests/cloud-sync.test.js`
**Run Entitlement Tests**: `node tests/entitlement-gates.test.mjs`
**Expected**: All assertions pass, no errors

## Browser Test Setup

Playwright is installed in the repo through `@playwright/test`.

**Install browsers**: `npx playwright install chromium`
**Automated install**: `npm install` runs `playwright install chromium` through `postinstall`.
**Run cloud sync tests**: `npm run test:cloud`
**Run entitlement tests**: `npm run test:entitlements`
**Run security baseline**: `npm run test:security`
**Run browser tests**: `npm run test:browser`
**Run hosted web smoke**: `npm run test:web`
**Run desktop state smoke**: `npm run build && npm run test:desktop:state`
**Run packaged first-run smoke**: `npm run test:desktop:first-run`
**Run rollback drill**: `npm run drill:rollback`
**Run incident drill**: `npm run drill:incidents`

Playwright starts the Vite dev server on `127.0.0.1:5177` and runs Chromium checks across desktop and mobile-sized projects, including WCAG-targeted keyboard, focus, labels, contrast, status-announcement, and mobile PWA readability checks.
Hosted web tests use `playwright.web.config.ts` and default to `https://relay-class.vercel.app`; they include the same landing/PWA accessibility smoke on desktop and phone-sized viewports. Override with:

```bash
RELAY_WEB_TEST_URL=https://your-domain.com npm run test:web
```

For desktop state QA, run `npm run build && npm run test:desktop:state`; this covers encrypted local state read/write, corrupt-file crash recovery, read-only overwrite protection, and encrypted backup restore against the local Electron app. For desktop release QA, run the package command for the current OS first, then `npm run test:desktop:first-run`. The first-run smoke uses a temporary `RELAY_USER_DATA_DIR` to simulate a clean packaged launch, creates a local teacher account, confirms state writes outside the app bundle, relaunches, and signs back in. Cross-platform launch still needs an actual macOS, Windows, or Linux host for the matching binary; building artifacts alone does not prove a foreign OS can launch them.

For ops readiness, run `npm run drill:rollback` after packaging and `npm run drill:incidents` before alpha or release handoff. The runbooks live in `ops/rollback-drill.md` and `ops/incident-response.md`, with a reusable log template in `ops/drill-log-template.md`.

## Testing Script Response

When the user says "use the testing script," run the saved Relay QA sequence and report:
- pass/fail by command
- browser workflow result
- anything not verifiable without the configured Gmail/SMTP sender
- whether paid/API-key/external-platform features remain absent from the app, except Gmail/SMTP email through a user-owned sender
- whether class manager, CSV roster import/export, publish audit, student submitted/reviewed states, and report exports are reachable
- whether every supported noisy Zoom/CSV import variation still parses, including malformed rows, duplicate emails/names, mixed aliases, and transcript-only roster estimation
- whether Supabase auth transitions, token expiry handling, conflict resolution, network-loss queueing, and missing-credential desktop fallback pass
- whether Free/Pro entitlement boundaries, webhook-driven entitlement updates, upgrade/downgrade flows, and unpaid locked-feature UI pass
- whether local data files and `.env.local` are ignored/untracked, no high-confidence tracked secrets are present, runtime debug/info logs are absent, and the legal baseline is present
- whether realistic-scale import, repeated large imports, partial transcript failures, and 100+ student rosters pass
- whether multi-session teacher/student E2E coverage passes for Math review, CS workshop, and Club meeting without cross-user workspace leakage
- whether desktop encrypted-state read/write, corrupt-state recovery, write blocking, and backup/restore pass
- whether the hosted web demo still hides editable login fields and exposes platform download controls
- whether missing desktop installer links visibly show "Packaging pending" before click and show a pending fallback after click
- whether the hosted web demo exposes mobile/PWA install controls and passes the manifest/service-worker checks
- whether WCAG-targeted keyboard navigation, focus order, visible focus, screen-reader labels/status announcements, contrast, and mobile PWA readability checks pass
- whether rollback and incident drills passed, including clear behavior for bad release quarantine, billing outage, auth outage, sync outage, and parser regression
- concise feedback on how the run went
- what could be improved
- feature ideas that would improve user experience

## Test Maintenance

**When Adding Features**:
1. Add test case to `import-flow.test.ts` first
2. Add browser coverage in `tests/browser/relay.spec.ts` when the feature changes access, routing, or user workflow
3. Update parser logic in `src/data.ts` or UI logic in `src/App.tsx`
4. Verify tests pass
5. Update the feature QA prompt in `codexsecondbrain-sync-2026-04-30.md` so future browser QA includes the new workflow and obvious formatting checks

**When Fixing Bugs**:
1. Add failing test case reproducing the bug
2. Fix parser logic
3. Verify test now passes

## Coverage Goals

- All roster format variations
- All transcript speaker patterns
- All participation event types
- All resource URL types
- Error conditions and edge cases
