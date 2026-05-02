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

## Testing Prompt Library

### CS4All Compressed Roster + Zoom Transcript Import QA

Use this prompt when testing the ClassLoop import flow without making code changes:

```text
You are only testing. Do not edit files, do not patch code, do not format files, do not run build tools that write output unless absolutely necessary. If a dev server or cache writes anything, clean up only your own generated test artifacts.

Goal: verify whether ClassLoop correctly handles this exact pasted input scenario.

Test the app/import logic with this roster and transcript exactly as pasted below. Report:
- whether the app boots
- whether import/generation succeeds
- parsed student count
- parsed student names/emails
- unmatched transcript speakers
- participation event count
- follow-up count
- resource count and URLs
- exact suspected root cause, with file/function references
- a concise “passes/fails” verdict

Do not fix anything in this chat.

Here's everything:

CLASS ROSTER — CS4All Demo Session
Ms. Rivera | Period 4 | Spring 2026
#Student NameEmail1Aaliyah Carteracarter@cs4all.nyc2Danny Reyesdreyes@cs4all.nyc3Jalen Thompsonjthompson@cs4all.nyc4Keisha Brownkbrown@cs4all.nyc5Leo Fernandezlfernandez@cs4all.nyc6Marcus Williamsmwilliams@cs4all.nyc7Priya Mehtapmehta@cs4all.nyc8Brianna Owensbowens@cs4all.nyc9Caleb Nguyencnguyen@cs4all.nyc10Destiny Lewisdlewis@cs4all.nyc11Elijah Sandersesanders@cs4all.nyc12Fatima Hassanfhassan@cs4all.nyc13Gabriel Torresgtorres@cs4all.nyc14Hannah Kimhkim@cs4all.nyc15Isaiah Mooreimoore@cs4all.nyc16Jasmine Pateljpatel@cs4all.nyc17Kevin Diazkdiaz@cs4all.nyc18Lena Wulwu@cs4all.nyc

CS4ALL Zoom Demo — Full Transcript
Meeting Title: CS4All Intro to Computational Thinking — Demo Session
Date: April 28, 2026
Duration: 47 minutes
Participants: Ms. Rivera (Teacher), 18 Students

[00:00:03] Ms. Rivera: Alright everyone, I'm going to start the recording now. Can everyone give me a thumbs up in the reactions if you can hear me okay?
[00:00:11] Student (Jalen Thompson): I can hear you!
[00:00:13] Student (Priya Mehta): Yes, audio is good.
[00:00:15] Ms. Rivera: Perfect. Okay, so welcome back everyone. Today we're starting Unit 3 — Algorithms and Problem Decomposition. Before we dive in, quick check — did everyone finish the exit ticket from last Thursday?
[00:00:28] Student (Marcus Williams): I forgot 😭
[00:00:31] Ms. Rivera: Marcus, come see me after. Okay, so let's get into it. I'm going to share my screen. Can everyone see the slides?
[00:00:41] Student (Aaliyah Carter): Yes!
[00:00:42] Student (Danny Reyes): Yep.
[00:00:44] Ms. Rivera: Great. So — who can tell me, in their own words, what an algorithm is? Don't look it up, just think about it. Anyone?
[00:00:57] Student (Priya Mehta): Is it like... a set of steps to solve a problem?
[00:01:02] Ms. Rivera: Yes! Exactly. A sequence of instructions. Now here's what I want you to think about — where do you encounter algorithms in your daily life? Drop it in the chat.
[00:01:14] Student (Jalen Thompson): [Chat] TikTok algorithm lol
[00:01:15] Student (Keisha Brown): [Chat] GPS directions
[00:01:16] Student (Danny Reyes): [Chat] recipes
[00:01:17] Student (Marcus Williams): [Chat] alarm clock??
[00:01:18] Student (Priya Mehta): [Chat] found this video that explains it really well → https://www.youtube.com/watch?v=6hfOvs8pY1k
[00:01:20] Ms. Rivera: Love these. Danny — recipes, yes! That's a great one. An alarm clock is actually a really interesting case, Marcus — why do you think that might be algorithmic?
[00:01:33] Student (Marcus Williams): Uh... because it like, checks the time and then does something based on a condition?
[00:01:40] Ms. Rivera: Boom. Conditional logic. That's exactly it. Okay, let's move to the activity. I'm going to put you all into breakout rooms — groups of three. Your task is to write out the steps to make a peanut butter and jelly sandwich as if you were programming a robot. Be super literal. The robot has no common sense.
[00:02:01] Student (Aaliyah Carter): Wait do we write it in a doc?
[00:02:04] Ms. Rivera: Yes, I'm dropping a Docs link in the chat right now. You have 8 minutes. Go!
[00:02:09] [Breakout rooms opened — 6 groups]

[00:10:17] [Breakout rooms closed — all participants returned]
[00:10:22] Ms. Rivera: Okay welcome back! Let's hear from a few groups. Group 2, Keisha — can you share what your group came up with?
[00:10:31] Student (Keisha Brown): Okay so we wrote: Step 1 — Pick up the bread bag. Step 2 — Open the bread bag. Step 3 — Remove two slices of bread. Step 4 — Place slices on a flat surface...
[00:10:45] Ms. Rivera: Already I'm stopping you — "flat surface." What if the robot doesn't know what flat means? Or what surface to use?
[00:10:53] Student (Keisha Brown): Oh... we'd have to define that.
[00:10:55] Ms. Rivera: Exactly! This is what we call the precision problem in programming. Computers do exactly what you tell them — nothing more, nothing less. This is why debugging is so hard. Your logic might be right but your instructions are ambiguous. Okay Group 5, let's hear from you.
[00:11:14] Student (Leo Fernandez): We kind of went overboard — we wrote like 34 steps.
[00:11:18] [Laughter from several students]
[00:11:20] Ms. Rivera: That's not overboard, that's thorough! Can you read a few?
[00:11:24] Student (Leo Fernandez): Step 1 — Initialize hand variable. Step 2 — Assign dominant hand to variable. Step 3 — Extend arm toward bread bag...
[00:11:34] [More laughter]
[00:11:36] Ms. Rivera: I love it, Leo. This is actually really close to pseudocode. You're thinking like a programmer. Alright — let's talk decomposition. When a problem is complex, what do we do?
[00:11:48] Student (Priya Mehta): Break it into smaller parts?
[00:11:51] Ms. Rivera: Yes. We decompose it. The sandwich is actually three sub-problems: bread setup, spread application, and assembly. Each of those can be its own function. This maps directly to how we'll write Python functions next week.
[00:11:58] Student (Leo Fernandez): [Chat] yo this video breaks down decomposition perfectly https://www.youtube.com/watch?v=QXjU9qTsYCc
[00:12:02] Student (Aaliyah Carter): [Chat] omg we watched that in 8th grade lol
[00:12:04] Ms. Rivera: Leo drop the distractions 😄 but yes that's actually a solid resource, I'll add it to Classroom.
[00:12:09] Student (Danny Reyes): Wait are we actually gonna code a sandwich?
[00:12:13] Ms. Rivera: laughs Not quite. But we'll use this mental model. Okay — I want to do a quick Nearpod poll before we wrap up. Checking your understanding. One second while I launch it.
[00:12:28] [Poll launched]
Question: Which of the following is the BEST example of an algorithm?

A) A list of your favorite songs
B) Directions from your house to school
C) A photo of a map
D) The name of a city

[00:12:55] Ms. Rivera: Okay I'm seeing responses come in... 78% of you said B — directions from your house to school. That is correct! Directions are a sequence of steps with a clear start, end, and decision points. A list of songs has no sequence logic. Good job.
[00:13:14] Student (Marcus Williams): What about C though? A map kind of shows steps?
[00:13:19] Ms. Rivera: Great question. A map is a representation of space — it's data. But it's not an algorithm until you apply a process to it — like, GPS takes the map data and runs an algorithm to find the shortest path. Does that distinction make sense?
[00:13:32] Student (Marcus Williams): Yeah okay yeah.
[00:13:35] Ms. Rivera: Alright, we have about 5 minutes left. Homework for Thursday: complete the algorithm design worksheet on Google Classroom — it's the one titled "Everyday Algorithms." Also, for those of you who haven't submitted your Unit 2 reflection, that's now past due and affecting your grade.
[00:13:53] Student (Jalen Thompson): Ms. Rivera is the worksheet the one with the flowcharts?
[00:13:57] Ms. Rivera: Yes, the one with the flowcharts. There are three problems. You pick two of the three. Any other questions?
[00:14:06] Student (Aaliyah Carter): Are we going to keep using Scratch or switch to Python?
[00:14:10] Ms. Rivera: We're transitioning to Python starting next Thursday. We'll use replit — make sure your accounts are set up. I'll send a reminder on Classroom.
[00:14:19] Ms. Rivera: Okay everyone — great work today. I'll see you Thursday. Jalen, Marcus — stay on for a second.
[00:14:26] [Students begin leaving the meeting]
[00:14:31] Student (Jalen Thompson): Yes Ms. Rivera?
[00:14:33] Ms. Rivera: Jalen, you've been really engaged today, I just want to make sure you're keeping up with the written work too. Your participation is great but I need those docs submitted.
[00:14:42] Student (Jalen Thompson): Yeah I'll do it tonight I promise.
[00:14:44] Ms. Rivera: I'm going to hold you to that. Okay, have a good afternoon both of you.
[00:14:49] [Recording ended]
```

### CS4All Import Fix Prompt

Use this prompt after the QA prompt identifies the compressed roster and Zoom speaker matching issues:

```text
Fix the ClassLoop import flow based on the test results. Keep changes narrowly scoped to only affect the background logic, do not touch the ui or anything unrelated.

Expected behavior for the pasted CS4All roster + Zoom transcript:
- Parse exactly 18 students from the compressed roster.
- Ignore roster metadata/header lines such as:
  CLASS ROSTER — CS4All Demo Session
  Mr. Agrawal | Period 4 | Spring 2026
  #Student NameEmail
- Correctly extract names/emails like:
  Aaliyah Carter / acarter@cs4all.nyc
  Danny Reyes / dreyes@cs4all.nyc
  Jalen Thompson / jthompson@cs4all.nyc
  Lena Wu / lwu@cs4all.nyc
- Normalize Zoom-style transcript speakers like `Student (Jalen Thompson)` so they match roster student `Jalen Thompson`.
- Do not treat teacher speaker `Ms. Rivera` as an unmatched student.
- Generate student participation events for matched transcript lines.
- Generate 18 student follow-ups.
- Preserve detection of both YouTube links as resources.

Likely files/functions to inspect:
- `src/data.ts`
- `parseRoster`
- `normalizeSpeakerName`
- `speakerMatchesStudent`
- `lineForStudent`
- `findUnmatchedParticipants`
- `extractTranscriptSpeakers` / `isTranscriptMetadataSpeaker`

Add regression coverage for this exact scenario if the repo has a test setup. If there is no test setup, add the smallest practical verification path or document the manual verification command you used.

After fixing, verify and report:
- `students.length === 18`
- Lena Wu is parsed with `lwu@cs4all.nyc`
- `unmatchedParticipants` excludes `Ms. Rivera`
- `unmatchedParticipants` excludes matched students like `Student (Jalen Thompson)`
- `participationEvents.length > 0`
- `followUps.length === 18`
- `resources.length === 2`
- both YouTube URLs are present

Make the code changes and then summarize exactly what changed and how you verified it.
```
