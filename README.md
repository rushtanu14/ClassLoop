# ClassLoop

ClassLoop is an AI-assisted classroom follow-up platform prototype. It turns class transcripts, pasted notes, roster details, and resource links into a teacher review workflow plus student-facing follow-up dashboards.

The product goal is simple: connect what happened in class, what each student needs to do next, and whether they actually followed through.

## Run

ClassLoop runs as a desktop application.

```bash
./run.sh
```

The launcher installs missing dependencies when needed, then opens ClassLoop in a native Electron window.

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
- Publish preview showing the student-facing recap, tasks, resources, and why a follow-up is assigned.
- Roster manager inside draft review with CSV import/export for local roster cleanup.
- Import parser handles compressed rosters, Google Classroom-style CSV rows, Zoom VTT captions, Teams transcript blocks, and Google Meet-style captions.
- Session report actions for print-friendly sharing plus JSON and CSV exports.
- Explicit sample accounts and sample session data for demonstrations.
- Checked-in app build under `dist/`, wrapped by the desktop launcher.

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

## Branch Split

- `main`: stable white/green classroom app with transcript paste/upload, publish preview, roster CSV cleanup, report exports, parser hardening, and browser QA.
- `codex/audio-session-improvements`: branch-only experiments for live audio notes, optional Gmail/SMTP recap delivery, class/course manager, publish-audit data model, and submitted/reviewed student workflow.

## Testing

```bash
npm run build
npm run test:import
npm run test:browser
node -c desktop/main.cjs
```

Playwright browser tests run on a dedicated Vite port so they do not accidentally connect to another local app.

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

## PRD Alignment

ClassLoop is designed for teachers, tutors, instructors, club leaders, and students who need clean follow-up after a class or learning session.

Core MVP promise:

- Import or paste messy class records.
- Generate a structured teacher-editable review.
- Publish approved student-specific follow-ups.
- Show students their recap, tasks, resources, due dates, and check-ins.
- Give teachers private insight into attendance, participation, quiet students, missed sessions, overdue work, and completion.

## High-Value Next Changes

1. Make the import-to-review moment stronger: add a clearer “before and after” transformation from transcript text to recap, tasks, resources, and student follow-ups.
2. Add teacher edit affordances directly to student follow-up cards so judges immediately see that the teacher stays in control before publishing.
3. Add completion check-in states that feel real: “not started,” “working,” “submitted,” and “teacher reviewed.”
4. Add a simple class roster manager so the product feels reusable across multiple sessions, not just one import.
5. Add a privacy/explanation panel written for schools: private teacher signals, no public ranking, student-specific sharing only.
6. Add local backup/restore so teachers can move their desktop data safely.
7. Add stronger first-run onboarding for brand-new non-demo accounts.

## Monetization Direction

- Free: limited sessions per month, basic recap, basic action items.
- Pro: unlimited sessions, local transcript processing, student dashboards, analytics, exports, and saved rosters.
- Future school/team plan: admin dashboards, roster sync, privacy controls, and team reporting.
