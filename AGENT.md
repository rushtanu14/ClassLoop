# ClassLoop Operational Memory

Use this alongside `AGENTS.md` when working in this repository.

## Branch Discipline

- `main` is now the only active product branch.
- The old `codex/audio-session-improvements` branch has been promoted into `main` and should be treated as historical.
- Preserve the classroom product direction unless the user explicitly asks for a redesign.
- Do not reintroduce image-heavy or abyssal UI work into `main` unless the user specifically requests that visual direction.

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
- Recording/live capture should require consent notice and should label unknown voice segments for teacher review rather than claiming automatic biometric student identification.
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
