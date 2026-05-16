# Incident Response Playbooks

Use this for billing, auth, sync, and parser regressions during alpha or early launch. Keep raw student transcripts out of incident notes; record counts, anonymized examples, and redacted screenshots only.

## Rehearse Locally

```bash
npm run drill:incidents
```

This checks API syntax, verifies protected APIs fail closed when hosted credentials are unavailable, confirms Supabase RLS/policies are present, and runs the cloud sync, entitlement, and parser regression suites.

## Severity

- SEV1: data loss, cross-teacher data exposure, wrong paid entitlement unlocks at scale, or parser output that could mislead many students before teacher review.
- SEV2: hosted auth unavailable, cloud sync unavailable, checkout/webhook failures, or a parser regression caught before publish.
- SEV3: single-account billing confusion, isolated import mismatch, cosmetic hosted demo issue, or support-copy gap.

## Billing Outage

Symptoms: checkout fails, Stripe webhook rejects events, Pro state does not update, or billing portal cannot open.

Immediate actions:

- Confirm `/api/config` reports whether Stripe is configured.
- Check `/api/billing/checkout`, `/api/billing/portal`, and `/api/billing/webhook` logs.
- Do not unlock Pro from client state. Treat webhook/Supabase profile state as authoritative.
- If checkout is broken, pause upgrade CTAs or add maintenance copy; existing local desktop use should still work.
- Reconcile Stripe Dashboard subscriptions against `classloop_profiles` after recovery.

Verification:
- `npm run test:entitlements`
- One sandbox checkout and webhook replay before declaring recovery.

## Auth Outage

Symptoms: Supabase sign-in/sign-up fails, tokens expire early, hosted sync returns 401.

Immediate actions:

- Confirm protected APIs return clear 401 copy instead of 500s.
- Keep desktop/local mode usable without Supabase credentials.
- Tell teachers local work remains available; hosted sync may be delayed.
- Avoid asking users to repeatedly create accounts during an active auth outage.

Verification:

- `npm run test:cloud`
- Manual hosted sign-in after Supabase recovers.

## Sync Outage

Symptoms: cloud saves fail, conflicts appear, or multi-device state falls behind.

Immediate actions:

- Preserve local state and queue mutating writes when possible.
- Do not silently overwrite local edits with older remote snapshots.
- Show a sync-delayed message rather than a success state.
- If remote state integrity is uncertain, pause cloud writes and keep desktop/local-only mode available.

Verification:

- `npm run test:cloud`
- Manual conflict test with newer local and newer remote timestamps.

## Parser Regression

Symptoms: participation false positives, roster mismatches, teacher names matched as students, resources/tasks missed, or generated follow-ups misrepresent the transcript.

Immediate actions:

- Stop publish rollout for affected sessions and keep teacher review mandatory.
- Add the failing import as a redacted fixture before patching.
- Prioritize false positives and misleading student follow-ups over recall improvements.
- If the regression shipped in desktop downloads, run the rollback drill and restore prior installer links.

Verification:

- `npm run test:import`
- Browser import/publish smoke for the affected workflow.

## Incident Closeout

Close only after the fix is verified, teacher-facing copy is updated if needed, support notes are captured, and the rollback decision is recorded in `ops/drill-log-template.md` or the project second brain.
