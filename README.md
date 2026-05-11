# ClassLoop

ClassLoop is a polished hackathon prototype for an AI-assisted classroom follow-up platform. Teachers can import a transcript or session notes, generate a teacher-editable AI draft, publish personalized student follow-ups, and inspect participation and completion analytics.

The app starts with an empty workspace. Sample geometry data is available only from the small **Use geometry sample** option on the import screen.

## Run Locally

Fastest option:

```bash
./run
```

On macOS, you can also double-click `ClassLoop.command`.

The launcher builds ClassLoop and starts the shared app server. It opens the teacher's browser automatically and prints network URLs like `http://192.168.x.x:5173/` that students can open from their own devices on the same Wi-Fi.

Standard development option:

```bash
npm install
npm run dev
```

The development server is useful while editing the UI, but `./run` is the connected teacher/student mode.

## Shared Portal

Teacher changes are stored in `.classloop-data.json` through the local ClassLoop server. Student devices that open the printed network URL read the same published sessions and refresh automatically while they are logged in.

## Accounts

ClassLoop supports teacher and student account creation from the sign-in screen. New teacher accounts start with an empty workspace. New student accounts can sign in right away, then see published sessions once a teacher includes that student's email on a roster.

Sample teacher:

```text
teacher@classloop.demo
classloop-teacher
```

Sample student:

```text
maya@classloop.demo
classloop-student
```

The sample accounts are linked to the geometry review data. Accounts you create yourself do not load any sample sessions.

The prototype hashes passwords in the browser and keeps teacher work private until publishing. Production security would still need a real identity provider, server-side sessions, database authorization rules, and per-student access checks.

## Demo Flow

1. Sign in with the sample teacher account, or create a new teacher account for an empty workspace.
2. Open **New session** and either enter your own transcript, roster, and resources or click **Use geometry sample**.
3. Generate the AI draft and watch the processing state.
4. Review and edit the recap, action items, student follow-ups, resources, and participation signals.
5. Publish to students.
6. Sign out, then sign in as a student from the published roster to see the locked-down student portal.

The built-in demo scenario is a geometry review class covering similar triangles, AA similarity, proportions, missing side lengths, and cross-multiplication mistakes.
