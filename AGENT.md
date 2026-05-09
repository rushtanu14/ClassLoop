# ClassLoop Operational Memory

Use this alongside `AGENTS.md` when working in this repository.

## Branch Discipline

- `main` is the stable product branch. Preserve the original white/green classroom UI.
- `codex/audio-session-improvements` is the richer product branch for audio notes, Gmail delivery, class manager, delivery logs, and deeper follow-through workflows.
- Do not port image-heavy or abyssal UI work into `main`.
- Shared fixes that should exist on both branches: parser correctness, launch reliability, security/privacy controls, backend scaffolding, documentation, and automated tests.

## Current Product Direction

- ClassLoop is a real teacher/student platform, not a hardcoded demo.
- Demo/sample data must be explicit.
- Teacher-only: import, review, publish, analytics, roster manager, privacy controls, sync/billing, audit logs.
- Student-only: personal recap, tasks, resources, completion state, appearance settings.
- Free-first policy remains important: no paid API dependencies should be required for the local desktop app.

## Backend And Payments

- Hosted multi-device sync uses Supabase Auth plus `classloop_workspace_state`.
- Subscription access uses Stripe Checkout and a webhook-updated `classloop_profiles` row.
- Client-side plan checks are UX hints only; paid entitlements must come from the hosted profile endpoint.
- Required hosted environment variables live in `.env.example`. Never commit `.env.local` or real secrets.
- Stripe has no monthly platform fee, but real payments have transaction fees. Keep the local app useful without payments.

## Privacy Defaults

- No training on student data unless explicitly allowed.
- Recording/live capture should require consent notice.
- Keep retention settings, export/delete student data, and audit logs visible to teachers.
- Avoid public rankings or student shaming.

## Verification Commands

Run these before reporting a complete implementation:

```bash
npm run build
npm run test:import
npm run test:browser
node -c desktop/main.cjs
```

For hosted backend files, also run `node --check` on `api/**/*.js` when practical.
