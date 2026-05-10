# ClassLoop

ClassLoop is an AI-assisted classroom follow-up platform prototype. It turns class transcripts, pasted notes, roster details, and resource links into a teacher review workflow plus student-facing follow-up dashboards.

The product goal is simple: connect what happened in class, what each student needs to do next, and whether they actually followed through.

## Run

ClassLoop runs as a desktop application.

```bash
./run.sh
```

The launcher installs or repairs missing dependencies with `npm ci` when `package-lock.json` is present, then opens ClassLoop in a native Electron window.

For a browser-based dev server instead of Electron:

```bash
./run.sh --dev
```

Useful launcher environment variables:

```bash
HOST=127.0.0.1 FRONTEND_PORT=5177 OPEN_BROWSER=0 ./run.sh --dev
```

You can also install dependencies directly:

```bash
npm install
```

`npm install` also downloads the Playwright Chromium browser through the project `postinstall` script.

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![CSS](https://img.shields.io/badge/CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white)

| Layer | Technology |
|---|---|
| **Framework** | React 18 |
| **Language** | TypeScript 5 |
| **Desktop Shell** | Electron 41 |
| **Build Tool** | Vite 6 |
| **Icons** | Lucide React |
| **Styling** | CSS |
| **Package Manager** | npm |

## Current Main Experience

- Original classroom visual style: clean white surfaces with green education-focused accents.
- Desktop app shell powered by Electron.
- Teacher and student sign-in screens.
- Teacher-side session dashboard, import flow, AI review draft, session report, and analytics.
- Student-side dashboard and session detail views.
- Student and teacher appearance customization, saved only to the signed-in account.
- Transcript paste/upload plus best-effort in-person microphone capture and browser online-meeting capture when available.
- Teacher-assisted speaker matching for live capture: ClassLoop creates unknown voice segments for review instead of using biometric voiceprints.
- Publish preview with one-click recap email delivery through a user-owned Gmail/SMTP sender.
- Per-student preview differences that explain why each student receives different follow-ups.
- Saved roster manager with CSV import/export and alias cleanup.
- Class/course manager that stores reusable class rosters, default session templates, and linked session history.
- Publish audit showing what will be shared with the class and why each student receives different follow-ups.
- Student completion flow from to do to submitted to teacher reviewed.
- Print, JSON, and CSV-friendly session reports for sharing or local recordkeeping.
- Privacy controls for retention settings, workspace export/delete, and audit history.
- Explicit sample accounts and sample session data for demonstrations.
- Checked-in app build under `dist/`, wrapped by the desktop launcher.

## Free-First External Services

ClassLoop should work without paid services. Transcript paste/upload, local accounts, review, publishing, student preview, analytics, and roster management are local-first.

External service support is intentionally narrow:

- Email: use a Gmail account you own, such as `classloop.noreply@gmail.com`, with an app password. ClassLoop cannot generate Gmail accounts or send from addresses you do not own.
- Audio notes: use browser live speech recognition when available, with transcript paste/upload as the reliable fallback.

Removed/deferred because they require paid API keys, school platform credentials, or external integration setup:

- OpenAI/custom transcription.
- Google Classroom OAuth posting.
- Canvas/LMS posting.
- External transcription-dependent online-call capture. ClassLoop uses free browser capture/speech APIs where available and still treats platform transcript paste/upload as the reliable path.

## Hosted Backend And Freemium MVP

The local desktop app still works without paid services or cloud credentials. For a public browser version and multi-device access, ClassLoop now includes a Supabase + Stripe backend scaffold:

- Supabase Auth for hosted teacher/student accounts.
- Supabase workspace state sync for browser/desktop continuity.
- Row Level Security SQL in `supabase/schema.sql` so each account can only read and write its own ClassLoop state.
- Stripe Checkout for Pro and School pilot subscriptions.
- Stripe webhook endpoint for server-owned subscription status updates.
- Pilot feedback endpoint for collecting early user feedback.

Suggested pricing:

- Free: `$0`, 5 sessions/month, CSV import/export, student preview, local desktop storage.
- Pro: `$9/month`, unlimited sessions, hosted sync, email delivery logs, privacy exports, and advanced reports.
- School pilot: `$49/month`, shared pilot workspace, longer retention controls, audit-ready exports, and priority onboarding.

Configure hosted mode from `.env.example`. Public Vite variables are safe for the browser build; `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` must only live in Vercel/server environment variables.

## Privacy And School Readiness

- Retention settings, export/delete workspace data, audit logs, and pilot feedback live in the teacher-only privacy area.
- Recording or live capture should require clear consent before use.
- Student data is marked as “no training” by default unless a school or teacher explicitly allows otherwise.
- Analytics stay teacher-only and should be framed as private support signals, not public rankings.

## Sample Accounts

Teacher:

```text
teacher@classloop.demo
classloop-teacher
```

Student:

```text
maya@classloop.demo
classloop-student
```

## Demo Path

1. Run `./run.sh`.
2. Sign in with the sample teacher account.
3. Review the teacher dashboard and session follow-up flow.
4. Open the student view to show personalized recaps, tasks, resources, and completion check-ins.
5. Use analytics to explain how ClassLoop tracks participation and follow-through.

## Testing

```bash
npm install
npm run build
npm run test:import
npm run test:browser
```

## PRD Alignment

ClassLoop is designed for teachers, tutors, instructors, club leaders, and students who need clean follow-up after a class or learning session.

Core MVP promise:

- Import or paste messy class records.
- Generate a structured teacher-editable review.
- Publish approved student-specific follow-ups.
- Show students their recap, tasks, resources, due dates, and check-ins.
- Give teachers private insight into attendance, participation, quiet students, missed sessions, overdue work, and completion.

## High-Value Next Changes

1. Add teacher notes templates for recurring lesson styles, such as exit tickets, lab workshops, club meetings, and tutoring sessions.
2. Add local version history for publish changes so teachers can compare what changed between draft, published, and revised follow-ups.
3. Add a lightweight student inbox showing unread class updates and teacher-reviewed submissions.
4. Add accessibility settings for font size, reduced motion, and high-contrast classroom mode.
5. Add a local backup/restore workflow for moving ClassLoop data between devices without a hosted backend.
6. Configure and verify live Supabase, Stripe, and Vercel credentials when the hosted version is ready for a pilot.
7. Run a real teacher/student pilot and use the feedback endpoint to prioritize the next polish pass.

## Monetization Direction

- Free: limited sessions per month, basic recap, basic action items.
- Pro: unlimited sessions, local transcript processing, student dashboards, analytics, exports.
- Future school/team plan: admin dashboards, roster sync, privacy controls, and team reporting.
