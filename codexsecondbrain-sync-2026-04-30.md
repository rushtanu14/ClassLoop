# ClassLoop Codex Second Brain Sync - 2026-04-30

## Project Context

ClassLoop is an AI-assisted classroom follow-up platform for teachers, tutors, instructors, club leaders, and students. The product turns transcripts, pasted notes, rosters, and resources into teacher-reviewed session recaps, personalized student follow-ups, resources, participation signals, and completion tracking.

The user wants the main branch to preserve the original clean white/green classroom UI. A separate experimental UI branch existed during the conversation, but main should be treated as the real product UI and should not inherit the dark image-heavy style.

## Major Product Decisions

- ClassLoop should behave like a real usable platform, not a hardcoded demo.
- Sample data should only appear when the user explicitly chooses a sample/demo account or sample transcript.
- Teacher and student accounts are separate.
- Teachers see teacher dashboards, review tools, session reports, roster tools, publishing controls, and analytics.
- Students see only their own student portal, assigned recaps, tasks, resources, and completion check-ins.
- Analytics must remain teacher-side only.
- The desktop experience matters: the user wants to run the app with `./run.sh`.

## Current Implementation Notes

- Main branch now has source files restored under `src/` instead of relying only on a static checked-in `dist/`.
- `package.json` supports a real build through `tsc && vite build`.
- `./run.sh` starts the Electron desktop app.
- Electron serves the built `dist/` bundle.
- Default theme storage key was changed to `classloop:theme:main:v1` so stale experimental theme state does not force main into the wrong style.
- Default theme is classroom calm: white/green.

## Latest Feature Work

The latest requested features were added in source and rebuilt into `dist`:

- Publish preview:
  - Teachers now preview the student-facing dashboard before publishing.
  - Teachers can pick a student and review exactly what that student will see.
  - Publishing happens from the preview screen.

- Roster manager:
  - Added to the AI review page.
  - Teachers can add, remove, rename, email-edit, mark attendance, and set Zoom/display-name aliases for students.

- Transcript participant resolution:
  - The parser detects Zoom-style speaker lines such as `Maya: ...` or timestamp-prefixed transcript lines.
  - If a speaker appears in the transcript but is not on the roster, ClassLoop prompts the teacher to add the speaker to the roster or link the display name to an existing student.
  - Linked names are stored as aliases on the student record for future matching within that roster/session context.

- Teacher editing from student side:
  - In teacher preview mode, teachers can edit student-visible recap, catch-up note, reminder, tasks, due date, status, and resources.
  - Student accounts do not receive these edit controls.

- Student route restrictions:
  - Student navigation now only includes the student portal/detail routes.
  - Analytics and design-system routes are not part of the student route set.

## Verification

- `npm install` completed successfully.
- `npm run build` completed successfully.
- `./run.sh` launched the Electron app successfully.
- Electron was stopped afterward with `killall Electron`.

## Files Most Relevant To Continue Work

- `src/App.tsx`: main app state, routing, auth, teacher/student views, publish preview, roster manager, student-visible editor.
- `src/data.ts`: sample data, transcript parsing, session generation, unmatched participant detection.
- `src/types.ts`: shared data types including student aliases and unmatched transcript participants.
- `src/styles.css`: white/green classroom styling plus new roster/preview/editor styles.
- `desktop/main.cjs`: desktop wrapper and local shared-state API.
- `run.sh`: one-command launcher.
- `dist/`: rebuilt production bundle served by Electron.

## User Preferences To Preserve

- Keep main branch white/green and professional.
- Avoid making main feel like a phony demo.
- Make sample/demo entry points small and explicit.
- Prioritize functionality and ease of use over flashy UI.
- Keep teacher controls private and student-facing pages simple.
- Avoid exposing implementation explanations such as role-based access text to normal users unless it helps privacy/trust.

## Good Next Improvements

- Add a full roster page separate from the review page so teachers can manage students before creating sessions.
- Add account-to-roster linking so newly created student accounts can request or accept a connection to a teacher/class.
- Add class/course objects so one teacher can manage multiple rosters.
- Add a publish audit screen showing all students, what changed, and who will receive updates.
- Add version history for teacher edits before and after publishing.
- Add real file parsing for `.txt`, `.vtt`, and `.srt` uploads.
- Add CSV roster import/export.
- Add clearer empty states for brand-new accounts.
- Add an onboarding checklist for first-time teachers.
- Add privacy copy in settings/help rather than crowding the main workflow.

## 2026-05-01 Update

Latest polish pass focused on making ClassLoop feel more like a real daily-use app instead of a demo:

- Account creation now has confirm password plus show/hide password.
- The profile pill in the topbar opens profile settings for name, email, and password changes.
- The duplicate topbar sign-out button was removed; sign-out stays in the sidebar.
- Electron now serves `/api/state` and stores account/session state in `.classloop-data.json`, so local desktop accounts can be logged into again after restarting the app.
- Passwords are hashed before storage; no plaintext passwords are stored.
- File upload now reads `.txt`, `.vtt`, and `.srt` transcripts into the import flow.
- Transcript parsing ignores Zoom/VTT metadata speakers such as `Meeting Title`, `Date`, `Duration`, `Participants`, `Question`, and similar labels.
- Generated recaps and follow-ups are more substance-driven:
  - class-wide recap remains shared,
  - student tasks vary based on questions asked, confusion/mistakes, answers, quiet flags, and absence,
  - readiness scores vary per student instead of defaulting to the same value.
- Publish flow now says `Preview and publish`, making the publishing step clearer.
- Publish preview now shows class-wide recap plus personal next steps and the participation evidence behind them.
- Roster rows include student access controls:
  - link by matching ClassLoop student account email,
  - open a prepared `mailto:` invite if the student does not have an account.
- Dashboard attention queue now uses the blank space for a support snapshot chart when there are no urgent items.
- Appearance page copy was rewritten to focus on user benefit and customization, not AI/design-system language.
- Responsive/layout fixes were added for topbar actions, profile menu, roster rows, preview columns, sidebar overflow, and narrow windows.

Verification from this pass:

- `npm run build` passed.
- `./run.sh` launched the Electron desktop app successfully.
- Electron was stopped afterward with `killall Electron`.
