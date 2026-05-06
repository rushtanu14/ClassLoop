# ClassLoop Integrations

ClassLoop can send real recap emails and post follow-ups to Google Classroom or an LMS when credentials are configured.

## Free-First Policy

ClassLoop should not require paid services for the default classroom workflow. Keep these integrations optional:

- Email: use a free Gmail account you own, or the teacher's existing school email if the school allows SMTP/app-password access.
- Google Classroom: use the teacher's existing Classroom account. ClassLoop does not create or pay for Google Workspace accounts.
- LMS: connect only to an LMS the teacher or school already has, or to a self-hosted/free LMS such as Moodle.
- Speech-to-text: prefer browser speech recognition or a local/self-hosted transcription service. OpenAI transcription is supported only as an optional paid provider.

If none of these free/owned options are configured, the app should keep working with transcript paste/upload and local publishing.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill in the provider credentials you want to use.
3. Start ClassLoop with `./run.sh`.

`.env.local` and `.classloop-integrations.json` are ignored by git. Do not commit real credentials or OAuth tokens.

## Email

ClassLoop supports:

- Generic SMTP through `CLASSLOOP_SMTP_*`
- Gmail SMTP through `CLASSLOOP_GMAIL_USER` and `CLASSLOOP_GMAIL_APP_PASSWORD`

For Gmail, create an app password in the Google account security settings. Do not use the normal account password.

ClassLoop cannot generate a Gmail account for you. For a free no-reply-like sender, create and own a Gmail account such as `classloop.noreply@gmail.com`, turn on 2-Step Verification, generate an app password, and use that account as the sender. This is free, but it is still a real mailbox with Gmail sending limits and anti-spam rules.

For a managed no-reply sender, configure the SMTP or Gmail credentials for that mailbox, then set:

```bash
CLASSLOOP_NO_REPLY_EMAIL=classloop.noreply@gmail.com
CLASSLOOP_NO_REPLY_NAME=ClassLoop
CLASSLOOP_REPLY_TO=teacher@example.com
```

The no-reply account sends the message automatically. `CLASSLOOP_REPLY_TO` lets student replies go to a real teacher/support inbox without exposing the SMTP login identity in the app UI.

Avoid trying to send from an address you do not own, such as `do-not-reply@classloop.school`, unless that mailbox or alias actually exists and is authorized in Gmail/SMTP.

When you click `Send recap emails`, ClassLoop sends each student their recap, action items, due date, and resources. It only marks the delivery as sent after the SMTP provider accepts at least one message.

## Google Classroom

Set:

- `CLASSLOOP_GOOGLE_CLIENT_ID`
- `CLASSLOOP_GOOGLE_CLIENT_SECRET`

Then use the publish preview page to connect Google Classroom. ClassLoop opens the OAuth consent screen, stores the returned local token in `.classloop-integrations.json`, lists active courses, and posts the recap as published coursework.

Cost note: Classroom API usage is appropriate as a free/owned integration when the teacher already has Google Classroom access. Do not add paid Google Workspace requirements for the prototype. Requesting quota increases can require a Google Cloud billing account, so keep the default integration inside normal API quotas.

Required scopes:

- `classroom.courses.readonly`
- `classroom.coursework.students`

## LMS

Canvas is supported directly:

- `CLASSLOOP_LMS_PROVIDER=canvas`
- `CLASSLOOP_LMS_BASE_URL=https://your-school.instructure.com`
- `CLASSLOOP_LMS_TOKEN=...`

ClassLoop lists teacher courses and posts the recap as a published Canvas assignment.

For other LMS systems, set `CLASSLOOP_LMS_POST_URL`. ClassLoop will POST a JSON payload containing the selected course, recap, action items, resources, and full session object to that endpoint. This is the integration point for Moodle, Schoology, Blackboard, or a school middleware service.

Cost note: ClassLoop should not require paid LMS access. Canvas/Schoology integrations only work if the school already provides accounts/API access. Moodle can be self-hosted for no license cost, but hosting a public server may still cost money.

## Audio Transcription

Audio recording and background online-call capture can create transcript text in two ways:

- Browser live speech recognition, when the current Electron/Chromium runtime supports it.
- Backend transcription through `/api/transcribe`, preferably pointed at a local/self-hosted transcription service for no API cost.

Free-first local transcription option:

```bash
CLASSLOOP_TRANSCRIBE_URL=http://127.0.0.1:9000/transcribe
CLASSLOOP_TRANSCRIBE_TOKEN=
```

That local service can wrap Whisper/whisper.cpp or another school-approved speech-to-text tool. This avoids per-minute API fees, but it requires the user's computer or a school server to run the model.

Optional paid OpenAI speech-to-text:

```bash
OPENAI_API_KEY=sk-...
CLASSLOOP_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe
```

You can also use a district-approved transcription service:

```bash
CLASSLOOP_TRANSCRIBE_URL=https://example.edu/classloop/transcribe
CLASSLOOP_TRANSCRIBE_TOKEN=...
```

The custom endpoint receives JSON with `audioBase64`, `mimeType`, `fileName`, and `prompt`, and should return `{ "text": "..." }`.

## Privacy and Security Controls

This desktop prototype includes the following controls:

- Real secrets live in `.env.local`, which is ignored by git.
- Google OAuth tokens live in `.classloop-integrations.json`, which is ignored by git.
- OAuth tokens are encrypted with Electron `safeStorage` when the operating system supports it.
- Desktop account/session state is encrypted with Electron `safeStorage` when available.
- Browser fallback storage is AES-GCM encrypted locally. This protects local storage at rest, but true multi-device access still requires a real backend database and authentication service.
- Local API routes reject requests from untrusted origins.
- Static and API responses include restrictive security headers.
- The browser window uses context isolation and does not expose Node integration to the UI.
- External links are restricted to `http`, `https`, and `mailto`.
- Camera/geolocation permissions are denied; microphone and display capture are only allowed for the local ClassLoop app.
- Recording/call capture requires an in-app consent confirmation when privacy settings require it.
- The Privacy page includes retention settings, export/delete controls, and an audit log for important workspace actions.

No software can guarantee data “cannot leak at all.” For production use, ClassLoop still needs managed hosting, audited authentication, encrypted databases, centralized secrets management, logging/auditing, FERPA/COPPA review, role-based access enforced on a backend, backups, and incident response procedures.
