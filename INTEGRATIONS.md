# ClassLoop Integrations

ClassLoop can send real recap emails and post follow-ups to Google Classroom or an LMS when credentials are configured.

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

When you click `Send recap emails`, ClassLoop sends each student their recap, action items, due date, and resources. It only marks the delivery as sent after the SMTP provider accepts at least one message.

## Google Classroom

Set:

- `CLASSLOOP_GOOGLE_CLIENT_ID`
- `CLASSLOOP_GOOGLE_CLIENT_SECRET`

Then use the publish preview page to connect Google Classroom. ClassLoop opens the OAuth consent screen, stores the returned local token in `.classloop-integrations.json`, lists active courses, and posts the recap as published coursework.

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
