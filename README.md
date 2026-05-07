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
- Student and teacher appearance customization, saved only to the signed-in account.
- Transcript paste/upload plus live audio notes when browser speech recognition is available.
- Publish preview with one-click recap email delivery through a user-owned Gmail/SMTP sender.
- Per-student preview differences that explain why each student receives different follow-ups.
- Saved roster manager that reuses class rosters by session template after the first published session.
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
- Background online-call capture that depends on external transcription.

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
npm run build
npm run test:import
npm run test:browser
```

`npm install` installs the Chromium browser used by Playwright through the project `postinstall` script.

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
3. Add a lightweight “publish preview” step showing exactly what each student will see.
4. Add completion check-in states that feel real: “not started,” “working,” “submitted,” and “teacher reviewed.”
5. Add CSV roster import/export before considering any external Classroom or LMS sync.
6. Add a privacy/explanation panel written for schools: private teacher signals, no public ranking, student-specific sharing only.
7. Add export/share actions for reports, because teachers and tutors will expect PDF, email, or LMS-friendly output later.

## Monetization Direction

- Free: limited sessions per month, basic recap, basic action items.
- Pro: unlimited sessions, AI transcript processing, student dashboards, analytics, exports.
- Future school/team plan: admin dashboards, roster sync, privacy controls, and team reporting.
