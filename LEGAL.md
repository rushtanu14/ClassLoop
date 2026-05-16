# ClassLoop Legal And School-Safety Baseline

This is a launch-readiness baseline, not legal advice. Before public signups, convert this into reviewed public Terms of Use, Privacy Policy, and desktop EULA pages.

## Public Signup Status

Hosted ClassLoop should stay sample-only until these documents are reviewed and published. Teachers can create durable local accounts in the downloaded desktop app; the public hosted demo should use sample accounts and clearly banner demo data as unsaved.

## Terms Of Use Baseline

- ClassLoop is a teacher-review tool for class follow-up, not an official gradebook, emergency service, or substitute for professional judgment.
- Teachers are responsible for checking generated recaps, participation matches, tasks, and resources before publishing them to students.
- Users may not upload content they do not have the right to process, share, or store.
- ClassLoop may suspend access to hosted services for abuse, security risk, payment failure, or legal compliance needs.

## Privacy Baseline

- ClassLoop processes classroom transcripts, notes, rosters, resource links, account profiles, student follow-up tasks, completion states, audit history, and optional product/pilot feedback. Student completion-popup product feedback is sent to the ClassLoop creator, not the teacher, and may include the related transcript context for product debugging.
- Desktop data is local-first. Electron state is encrypted with ClassLoop's prompt-free local AES-GCM storage key, and browser fallback storage uses local AES-GCM encrypted `classloop:secure:*` keys.
- Hosted sync, when configured, uses Supabase Auth and Row Level Security so each account can access only its own workspace state.
- Stripe is used only for Pro billing. Subscription status is updated by signed Stripe webhooks and stored server-side.
- Student data is set to no-training by default unless a school or teacher explicitly changes that setting.

## EULA Baseline

- The desktop app is licensed for classroom planning, review, and pilot use by the installing teacher or organization.
- ClassLoop stores desktop data in the user's per-user app data directory, not inside the app bundle.
- Updates are currently manual install-over-replace releases. ClassLoop does not silently auto-update until an updater is intentionally added.
- Users should keep their own backups before deleting local workspaces or replacing devices.

## Support

Support contact: `classloop.donotreply@gmail.com`.

For pilots, support requests should avoid raw student transcripts unless necessary. Product feedback may intentionally include the related transcript context when disclosed in the student feedback prompt; other support requests should prefer anonymized examples, screenshots with student names removed, and counts of affected records.

## Data Retention

- Default teacher retention setting: 365 days.
- Teachers can export workspace data and delete class sessions/drafts from the privacy area.
- Alpha trackers and support notes should store anonymized examples and counts, not raw transcripts or full student rosters.
- Hosted production retention and deletion SLAs must be published before durable public hosted accounts are enabled.

## Child-Appropriate Safety

- ClassLoop should not invite children to create unsupervised public accounts.
- Use school-authorized teacher or organization setup for real student data, and confirm any COPPA, FERPA, district, and parent/guardian requirements before production use.
- Student-facing views should show only that student's approved follow-ups, resources, and completion status.
- Analytics are teacher-only private support signals, not public rankings.
