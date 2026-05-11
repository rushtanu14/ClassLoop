# Relay Email Setup

Relay now keeps the working prototype free-first. It does not include paid API-key features, Google Classroom OAuth posting, LMS posting, OpenAI transcription, or custom transcription-service hooks.

The only external delivery path kept in the app is email through an account the user owns. The current free path is Gmail SMTP with a Gmail app password.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Configure Gmail or another SMTP account you own.
3. Start Relay with `./run.sh`.

`.env.local` is ignored by git. Do not commit real credentials.

## Gmail Sender

Relay cannot generate a Gmail account or send from an address you do not own. For a no-reply-like sender, create and own a Gmail account such as `relay.donotreply@gmail.com`, turn on 2-Step Verification, generate an app password, and use that account as the sender.

```bash
RELAY_GMAIL_USER=relay.donotreply@gmail.com
RELAY_GMAIL_APP_PASSWORD=your-16-character-app-password
RELAY_GMAIL_FROM=relay.donotreply@gmail.com
RELAY_NO_REPLY_EMAIL=relay.donotreply@gmail.com
RELAY_NO_REPLY_NAME=Relay
RELAY_REPLY_TO=teacher@example.com
```

`RELAY_REPLY_TO` lets student replies go to a real teacher/support inbox while Relay sends from the no-reply-like Gmail account.

## Generic SMTP

If a school already provides free SMTP access, configure:

```bash
RELAY_SMTP_HOST=smtp.example.com
RELAY_SMTP_PORT=587
RELAY_SMTP_SECURE=false
RELAY_SMTP_USER=teacher@example.com
RELAY_SMTP_PASS=replace-me
RELAY_SMTP_FROM=teacher@example.com
RELAY_SMTP_PROVIDER=SMTP
```

## Removed/Deferred Paid Or Integration-Heavy Features

These features were removed from the current app because they require paid API keys, school platform credentials, or external integration setup that the user does not want to depend on:

- OpenAI speech-to-text.
- Custom transcription-provider API.
- Google Classroom OAuth posting.
- Canvas/LMS posting.
- Background online-call capture that depends on paid/external transcription.

Relay still works through transcript paste/upload, browser live audio notes when available, teacher review, publish preview, student dashboards, local analytics, roster templates, and Gmail recap delivery.

## Privacy and Security Controls

- Real secrets live in `.env.local`, which is ignored by git.
- Desktop account/session state is encrypted with Electron `safeStorage` when available.
- Browser fallback storage is AES-GCM encrypted locally. True multi-device sync still requires a backend database and server-side authentication.
- Local API routes reject requests from untrusted origins.
- Static and API responses include restrictive security headers.
- The browser window uses context isolation and does not expose Node integration to the UI.
- External links are restricted to `http`, `https`, and `mailto`.
- Camera/geolocation/display-capture permissions are denied; microphone permission is only used for local live audio notes.
