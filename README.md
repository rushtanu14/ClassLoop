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
- Explicit sample accounts and sample session data for demonstrations.
- Checked-in app build under `dist/`, wrapped by the desktop launcher.

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
3. Add a lightweight “publish preview” step showing exactly what each student will see.
4. Add completion check-in states that feel real: “not started,” “working,” “submitted,” and “teacher reviewed.”
5. Add a simple class roster manager so the product feels reusable across multiple sessions, not just one import.
6. Add a privacy/explanation panel written for schools: private teacher signals, no public ranking, student-specific sharing only.
7. Add export/share actions for reports, because teachers and tutors will expect PDF, email, or LMS-friendly output later.

## Monetization Direction

- Free: limited sessions per month, basic recap, basic action items.
- Pro: unlimited sessions, AI transcript processing, student dashboards, analytics, exports.
- Future school/team plan: admin dashboards, LMS integration, roster sync, privacy controls, and team reporting.
