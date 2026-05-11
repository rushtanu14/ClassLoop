# Testing Strategy

## Test Structure

**File**: `tests/import-flow.test.ts`
**Frameworks**: TypeScript import regression runner + Playwright browser tests
**Run Commands**:
- `npm run test:import`
- `npm run test:browser`
- `npm run test:web`

## Test Categories

### End-to-End Parsing Tests
- **Compressed Roster**: 18 students glued format (`1Aaliyah Carteracarter@cs4all.nyc...`)
- **Speaker Matching**: `Student (Jalen Thompson)` → roster match
- **Participation Extraction**: Questions, answers, chat messages
- **Resource Detection**: YouTube URLs in chat
- **Metadata Filtering**: Skip teacher names, headers

### Regression Tests
- **Format Variations**: Comma-sep, pipe-sep, tabular rosters
- **Google Classroom CSV**: First name, last name, email exports
- **Transcript Variations**: Zoom `.vtt`, Microsoft Teams transcript blocks, Google Meet captions
- **Naming Inconsistencies**: Aliases, case variations, first-name/last-initial nicknames
- **Edge Cases**: Missing roster, malformed transcript

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
- **Teacher Review Loop**: Teacher preview can mark submitted student check-ins as reviewed.
- **Capture Modes**: New session flow exposes transcript, in-person class, and online meeting capture choices without biometric voice identification claims.
- **Analytics Hiding**: Student navigation does not expose teacher analytics.
- **Publish Audit**: Preview/report pages show publish audit evidence for class-wide and per-student follow-ups.
- **Report Exports**: Session report exposes JSON, CSV, and print actions.
- **Appearance**: Students can change appearance while signed in; logout returns the login screen to the default theme; sign-in restores the saved account theme.
- **Responsive Layout**: Core controls remain visible at phone-sized width without horizontal overflow.

### Hosted Web Smoke Tests
- **Landing Page**: Hosted root page loads ClassLoop marketing/download UI.
- **Desktop Downloads**: macOS, Windows, and Linux download controls are visible; missing installer URLs show packaging/demo fallback copy.
- **Mobile/PWA Access**: Hosted root exposes the "Add to phone" action, standalone web app manifest, app icon, and service worker shell.
- **Sample-Only Demo**: Hosted demo exposes teacher/student demo choices instead of editable email/password fields.
- **Demo Walkthrough**: Teacher sample demo starts the guided walkthrough and shows the unsaved demo banner after skip.

## Test Data Sources

**Real Transcripts**:
- CS4All Zoom export (47 minutes, 18 students)
- Includes: PB&J activity, Nearpod poll, homework assignments
- Chat messages with YouTube links

**Roster Formats**:
- Compressed: No delimiters, numbered
- Standard: CSV-style with headers
- Mixed: Some students with aliases

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
**Expected**: All assertions pass, no errors

## Browser Test Setup

Playwright is installed in the repo through `@playwright/test`.

**Install browsers**: `npx playwright install chromium`
**Automated install**: `npm install` runs `playwright install chromium` through `postinstall`.
**Run browser tests**: `npm run test:browser`
**Run hosted web smoke**: `npm run test:web`

Playwright starts the Vite dev server on `127.0.0.1:5177` and runs Chromium checks across desktop and mobile-sized projects.
Hosted web tests use `playwright.web.config.ts` and default to `https://class-loop-ten.vercel.app`. Override with:

```bash
CLASSLOOP_WEB_TEST_URL=https://your-domain.com npm run test:web
```

## Testing Script Response

When the user says "use the testing script," run the saved ClassLoop QA sequence and report:
- pass/fail by command
- browser workflow result
- anything not verifiable without the configured Gmail/SMTP sender
- whether paid/API-key/external-platform features remain absent from the app, except Gmail/SMTP email through a user-owned sender
- whether class manager, CSV roster import/export, publish audit, student submitted/reviewed states, and report exports are reachable
- whether the hosted web demo still hides editable login fields and exposes platform download controls
- whether the hosted web demo exposes mobile/PWA install controls and passes the manifest/service-worker checks
- concise feedback on how the run went
- what could be improved
- feature ideas that would improve user experience

## Test Maintenance

**When Adding Features**:
1. Add test case to `import-flow.test.ts` first
2. Add browser coverage in `tests/browser/classloop.spec.ts` when the feature changes access, routing, or user workflow
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
