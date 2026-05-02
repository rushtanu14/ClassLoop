# ClassLoop Agent Instructions

## Project Overview

ClassLoop is a desktop classroom follow-up platform (Electron + React) that transforms messy class inputs—transcripts, notes, rosters, and resource links—into structured teacher review workflows and student-facing follow-up dashboards.

**Core value**: Teachers import a Zoom transcript + class roster → ClassLoop auto-extracts participation events, identifies students who need catch-up, generates action items, and publishes personalized student follow-ups with tasks, resources, and due dates.

**Tech Stack**: Electron (desktop), React 18, TypeScript, Vite (build), Vitest (tests).

## Quick Commands

| Task | Command |
|------|---------|
| **Run desktop app** | `./run.sh` |
| **Dev server** | `npm run dev` |
| **Build** | `npm run build` |
| **Test import flow** | `npm run test:import` |
| **Lint/type check** | `tsc` |

**Demo Accounts**:
- Teacher: `teacher@classloop.demo` / `classloop-teacher`
- Student: `maya@classloop.demo` / `classloop-student`

## Architecture

```
ClassLoop
├── src/
│   ├── App.tsx              # Main UI: teacher dashboard, import flow, session review
│   ├── data.ts              # Core parsing: transcript → structured session data
│   ├── types.ts             # Session, Student, Participation, ActionItem, etc.
│   ├── main.tsx             # React entry point
│   └── styles.css           # Tailwind + custom (green education theme)
├── desktop/
│   └── main.cjs             # Electron main process, window creation
├── public/                  # Static assets
├── tests/
│   └── import-flow.test.ts  # End-to-end parsing tests
├── vite.config.ts           # Build config (fingerprinting for prod)
└── tsconfig*.json           # TypeScript configs (main + test)
```

### Data Flow

1. **Teacher imports class records**: Paste or upload transcript (Zoom export), roster (CSV or compressed text), notes, and resource links.
2. **Parser normalizes input** (`src/data.ts`):
   - Handles varied roster formats (comma-sep, pipe-sep, numbered, tabular, glued text like `1Aaliyah Carteracarter@cs4all.nyc`)
   - Extracts speaker names from transcript (strips labels like `Student (Jalen Thompson)`)
   - Matches speakers to roster entries (case-insensitive, handles common aliases)
   - Flags unmatched participants (e.g., teacher names like `Ms. Rivera`)
3. **Generates session data**:
   - **Participation events**: Each chat, question, or answer from a student → ParticipationEvent
   - **Action items**: From transcript homework mentions, overdue tasks, follow-up notes
   - **Student follow-ups**: Personalized for each student (recap, catch-up notes, tasks, due date)
   - **Resources**: Extracted URLs with type classification (video, worksheet, link, slides)
4. **Teacher edits & publishes**: Refine recap, questions, action items, then approve for student view.
5. **Students see**: Personalized recap, assigned tasks, resource links, due dates, completion check-ins.

## Key Files & Patterns

### `src/data.ts` — Import Parsing Logic

**Core exports**:
- `createGeneratedSession(input: ImportDraftInput): Session` — Main parse function
- `readTranscriptFileText(file: TranscriptTextFile)` — Handles Zoom transcript file input
- `extractTranscriptSpeakers(transcript)` — Pulls speaker list from transcript text

**Parsing robustness**:
- **Roster format flexibility**: Handles `Name, email` OR `Name|email` OR numbered like `1Aaliyah Carteracarter@cs4all.nyc` (glued without delimiters, common in compressed lists)
- **Speaker normalization**: Converts `Student (Jalen Thompson)` → `jalen thompson` → matched to roster
- **Metadata skipping**: Ignores lines like `CLASS ROSTER —`, `#Student NameEmail`, `Mr. Agrawal | Period 4`, teacher names (Ms. Rivera)
- **Unmatched participant tracking**: Captures names not in roster for teacher review (e.g., guests, substitutes)
- **Confidence scoring**: Marks participation with confidence level (1.0 = exact match, 0.5 = fuzzy match)

**Sample test case** (from `tests/import-flow.test.ts`):
```
Compressed roster (18 students, no delimiters):
  1Aaliyah Carteracarter@cs4all.nyc2Danny Reyesdreyes@cs4all.nyc...

Zoom transcript excerpt:
  [00:02:01] Student (Aaliyah Carter): Wait do we write it in a doc?
  [00:10:31] Student (Keisha Brown): Okay so we wrote: Step 1 — Pick up...
  [Chat] Keisha Brown: [Chat] GPS directions

Result: 18 students correctly matched, 3 participation events extracted, resources extracted
```

### Type System (`src/types.ts`)

Core domain models:
- **Student**: id, name, email, avatarColor, aliases, guardian
- **Session**: title, type (Math review | CS workshop | General classroom | Club | Study group), transcript, notes, roster
- **ParticipationEvent**: studentId, type (asked_question | answered_question | chat | quiet | absent), text, confidence, approved
- **ActionItem**: title, description, dueDate, status (todo | in_progress | complete | overdue), source
- **StudentFollowUp**: personalized reminder, catch-up notes, assigned tasks, due date, completion status
- **Resource**: title, url, type (video | worksheet | link | slides), relatedTopic
- **UnmatchedParticipant**: name, lines (transcript lines), suggestedStudentId (fuzzy match hint)

### `src/App.tsx` — UI & State

**Views**:
1. **Sign-in** (teacher/student)
2. **Teacher dashboard**: List of sessions, import button
3. **Import flow**: 
   - Paste transcript → roster → notes → resources
   - Template selection (General Classroom, Math review, CS workshop, etc.)
   - Live preview of parsed students & participation
4. **Session review**: Edit recap, review essential questions, action items, participation highlights
5. **Student dashboard**: View assigned tasks, resources, due dates, mark completion
6. **Analytics**: Attendance, participation distribution, quiet students, overdue work

**UI patterns**:
- Green education-focused color scheme (#10b981 primary, white surfaces)
- Responsive grid layout (sidebar for navigation, main content area)
- Real-time parsing feedback (unmatched participants flagged)
- Teacher-facing controls: edit, approve, publish workflow

## Real Session Example

**Input**:
```
Title: CS4All Intro to Computational Thinking — Demo Session
Type: CS workshop
Date: April 28, 2026
Teacher: Ms. Rivera

Roster: (18 students, Aaliyah Carter, Danny Reyes, Jalen Thompson, ...)

Transcript excerpt:
  [00:00:44] Ms. Rivera: Great. So — who can tell me, what an algorithm is?
  [00:00:57] Student (Priya Mehta): Is it like... a set of steps to solve a problem?
  [00:01:02] Ms. Rivera: Yes! Exactly. A sequence of instructions.
  [00:01:14] Student (Jalen Thompson): [Chat] TikTok algorithm lol
  [00:02:01] Ms. Rivera: Your task is to write out the steps to make a peanut butter 
               and jelly sandwich as if you were programming a robot. Be super literal.
  [00:10:22] Ms. Rivera: Okay welcome back! Let's hear from a few groups. 
               Group 2, Keisha — can you share what your group came up with?
  [00:10:31] Student (Keisha Brown): Okay so we wrote: Step 1 — Pick up the bread bag...
  [00:10:55] Ms. Rivera: This is what we call the precision problem in programming...
  [00:11:48] Student (Priya Mehta): Break it into smaller parts?
  [00:11:51] Ms. Rivera: Yes. We decompose it. ...each can be its own function. 
               This maps directly to how we'll write Python functions next week.
  [00:12:13] Ms. Rivera: I want to do a quick Nearpod poll before we wrap up.
  [00:12:55] Ms. Rivera: Okay I'm seeing responses come in... 78% of you said B — directions...
  [00:13:35] Ms. Rivera: Homework for Thursday: complete the algorithm design worksheet...
  [Chat] Priya Mehta: found this video → https://www.youtube.com/watch?v=6hfOvs8pY1k
  [Chat] Leo Fernandez: yo this video breaks down decomposition → https://www.youtube.com/watch?v=QXjU9qTsYCc
```

**Parsed Output**:
```
Session {
  title: "CS4All Intro to Computational Thinking — Demo Session"
  type: "CS workshop"
  students: [18 students: Aaliyah Carter, Danny Reyes, ..., Lena Wu]
  
  participationEvents: [
    { studentId: "priya-mehta", type: "answered_question", 
      text: "Is it like... a set of steps to solve a problem?", confidence: 1.0 },
    { studentId: "jalen-thompson", type: "chat", 
      text: "TikTok algorithm lol", confidence: 1.0 },
    { studentId: "keisha-brown", type: "answered_question", 
      text: "Okay so we wrote: Step 1 — Pick up the bread bag...", confidence: 1.0 },
    // 15 more events
  ]
  
  actionItems: [
    { title: "Algorithm Design Worksheet", 
      description: "Everyday Algorithms — pick 2 of 3 problems with flowcharts",
      dueDate: "2026-04-30", source: "transcript" },
    { title: "Unit 2 Reflection (Overdue)", 
      description: "Now past due and affecting grade",
      dueDate: "before 2026-04-28", status: "overdue", source: "transcript" },
    { title: "Marcus Williams — Follow-up: Exit Ticket from Last Thursday",
      description: "Forgot to complete. Come see Ms. Rivera.",
      dueDate: "2026-04-28", source: "transcript" }
  ]
  
  resources: [
    { title: "Algorithm Concepts", 
      url: "https://www.youtube.com/watch?v=6hfOvs8pY1k", 
      type: "video", relatedTopic: "Algorithm Basics" },
    { title: "Problem Decomposition", 
      url: "https://www.youtube.com/watch?v=QXjU9qTsYCc", 
      type: "video", relatedTopic: "Decomposition" }
  ]
  
  unmatchedParticipants: [] // Ms. Rivera excluded (teacher)
  
  studentFollowUps: {
    "aaliyah-carter": { 
      reminder: "You asked about writing in a doc during the PB&J activity...",
      catchUp: "...",
      tasks: ["Algorithm Design Worksheet"],
      dueDate: "2026-04-30"
    },
    "marcus-williams": {
      reminder: "You struggled with the conditional logic question...",
      catchUp: "Review the algorithm video (link below) and come see Ms. Rivera about the exit ticket",
      tasks: ["Exit Ticket Follow-up", "Algorithm Design Worksheet"],
      dueDate: "2026-04-30"
    },
    // ... 16 more
  }
}
```

**Teacher Recap** (editable before publish):
```
Approved Recap:
"We explored algorithms and precision in programming. Students worked through a 
PB&J decomposition activity to understand how computers need explicit, literal instructions. 
Key teachable moment: the precision problem — 'flat surface' isn't specific enough for a robot.

We introduced decomposition: breaking complex problems (the sandwich) into sub-problems 
(bread setup, spread, assembly), which maps directly to Python functions. A Nearpod poll 
confirmed understanding of algorithms vs. data representations.

Homework: Algorithm Design Worksheet due Thursday (pick 2 of 3 flowchart problems). 
Marcus, come see me about the missing exit ticket. Unit 2 reflections are now overdue."

Essential Questions:
1. What makes an instruction precise enough for a computer?
2. How do you decompose a complex problem into sub-problems?
3. Why is the order of steps important in an algorithm?
```

## Testing

**Test file**: [tests/import-flow.test.ts](tests/import-flow.test.ts)

Tests validate:
- Compressed/glued roster parsing (18 students without delimiters)
- Speaker name normalization and roster matching
- Participation event extraction and confidence scoring
- Metadata line filtering (class titles, headers, teacher names)
- Resource URL extraction
- Unmatched participant detection
- Full end-to-end session generation

**Run tests**: `npm run test:import`

**Test approach**: Broad regression tests using real-world Zoom transcript + compressed CS4All roster. Not unit-test granular; instead, validates that the full import pipeline handles realistic variations (varied delimiters, naming inconsistencies, missing metadata, etc.).

## Development Conventions

1. **Component structure**: Top-level App.tsx manages auth + view routing. Sub-components for sections (ImportFlow, SessionReview, StudentDashboard).
2. **State management**: React hooks (useState, useEffect, useMemo). No Redux—state scope is per-view.
3. **Type-first**: All data models in types.ts. Parser returns strongly-typed Session objects.
4. **String formatting**: Date strings are ISO 8601 (YYYY-MM-DD). Names are lowercase-slugified for IDs.
5. **Error handling**: Parser is defensive (unmatched names flagged but don't break import). UI shows warnings clearly.
6. **Accessibility**: Icons from lucide-react (semantic naming). Enough contrast for education-friendly green theme.

## High-Value Next Work

1. **Teacher edit UI**: Add inline edits to recap, questions, action items before publish (not just form views).
2. **Publish preview**: Show each student exactly what they'll see before distributing.
3. **Completion check-ins**: Real task states: not started → working → submitted → reviewed. Hook up student submissions.
4. **Roster manager**: Reuse rosters across multiple sessions without re-pasting.
5. **LMS integration**: Export/sync to Google Classroom, Canvas, Schoology.
6. **Privacy dashboard**: Explain to schools how student data is handled (no rankings, teacher-only signals, student-specific sharing).

## Common Pitfalls

- **Roster format unpredictability**: Teachers paste from different sources (Excel, Classroom exports, typed lists). Always test against compressed formats like `1Aaliyah Carteracarter@cs4all.nyc` without delimiters.
- **Speaker name variability**: Same student appears as "Jalen Thompson", "Student (Jalen Thompson)", "J. Thompson", and "jalen t." in transcripts. Parser must be fuzzy-match friendly.
- **Metadata noise**: Zoom exports include class titles, timestamps, participant counts. Filter aggressively to avoid false participation matches.
- **Timestamp parsing**: Zoom timecodes like `[00:02:01]` are straightforward, but some exports use different formats. Use regex with fallbacks.
- **Missing rosters**: Teachers sometimes forget to paste roster. UI should offer "estimate from transcript" mode (extract all unique speakers, ask teacher to confirm).

## File Organization Recommendations

When adding features:
- **New session types** (e.g., "Interview Prep", "Exam Review"): Add to `SessionType` enum in types.ts.
- **New participation types** (e.g., "demo_code", "misconception"): Add to `ParticipationType` enum.
- **New resource types** (e.g., "interactive", "assessment"): Add to Resource.type union.
- **Parser improvements**: Add test cases to import-flow.test.ts first, then update createGeneratedSession() logic.
- **New student follow-up fields** (e.g., "skillsToReview", "nextTopic"): Add to StudentFollowUp type, update parser template.

## Links to Existing Docs

- [README.md](README.md) — Product vision, sample accounts, demo path, monetization roadmap
- [package.json](package.json) — Dependencies (React 18, Electron 41, Vite 6, Lucide icons)
- [src/types.ts](src/types.ts) — Complete type definitions for Session, Student, ParticipationEvent, ActionItem, Resource, StudentFollowUp
