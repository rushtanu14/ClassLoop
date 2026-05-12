# Relay Alpha Usage Runbook

This runbook is for a 1-2 day teacher alpha focused on usability, interpretation quality, false positives, and support burden.

## Goal

Validate whether teachers can use Relay with their own classroom artifacts and whether the generated review workflow is trustworthy enough to keep testing.

Primary questions:

- Can a teacher reach a useful published follow-up without live help?
- Do generated recaps, tasks, resources, and student follow-ups match what happened in class?
- Do roster matching and participation signals create false positives that could mislead a teacher?
- Where does the product create support burden: install, import, interpretation, editing, publishing, or student access?

## Participants

Use 2-4 teachers or teacher-adjacent users for this alpha. Keep the first run small.

Recommended participant mix:

- 1 teacher with a clean Zoom/Meet transcript and roster.
- 1 teacher with messy notes or partial transcript data.
- 1 teacher/tutor/club lead with a non-classroom session.
- Optional: 1 student-side reviewer to open a published follow-up.

## Privacy Guardrails

- Prefer anonymized rosters and transcripts for the first alpha.
- Do not collect raw student transcripts in the tracker.
- If a real class artifact is used, the teacher keeps it local unless they explicitly choose to share a redacted excerpt.
- Record false positives as anonymized examples such as `Student A matched to Student B`, not real student names.
- Screenshots should exclude student names unless the teacher confirms the data is sample or redacted.

## Day 0 Setup

1. Send each teacher the current desktop build or hosted demo link.
2. Share [alpha/teacher-alpha-script.md](alpha/teacher-alpha-script.md).
3. Prepare one row per teacher in [alpha/relay-alpha-tracker.csv](alpha/relay-alpha-tracker.csv).
4. Ask each teacher to bring:
   - transcript, meeting notes, or pasted class notes
   - roster CSV or pasted roster
   - 1-3 resource links
   - a rough idea of what a good follow-up should include

## Day 1 Flow

Run a 30-45 minute observed session per teacher.

1. First-run setup:
   - app opened
   - account/sample path understood
   - any install/security warning recorded
2. Import:
   - transcript/notes pasted or uploaded
   - roster pasted/imported
   - resources added
3. Review:
   - teacher checks roster matching
   - teacher checks participation signals
   - teacher edits recap/tasks/student follow-ups
4. Publish/preview:
   - teacher opens publish preview
   - teacher reviews at least two student previews
   - teacher publishes or explains why they would not
5. Wrap:
   - teacher rates usefulness and trust
   - observer records support interventions

## Day 2 Flow

Use Day 2 only if Day 1 reveals enough promise or ambiguity.

Focus on repeat use:

- a second class/session from the same teacher
- saved roster reuse
- CSV import/export
- student dashboard interpretation
- report export
- whether the teacher would use Relay again next week

## Metrics

Track these in [alpha/relay-alpha-tracker.csv](alpha/relay-alpha-tracker.csv).

- `time_to_first_draft_minutes`
- `time_to_publish_or_preview_minutes`
- `support_interventions_count`
- `usability_rating_1_to_5`
- `interpretation_quality_1_to_5`
- `matching_false_positive_count`
- `participation_false_positive_count`
- `teacher_edit_count`
- `would_use_again`
- `top_blocker`

## Pass / Pause Criteria

Continue alpha if:

- at least 2 teachers reach publish preview in under 30 minutes
- interpretation quality averages 4 or higher
- false positives are visible and editable rather than hidden
- support interventions are mostly setup/import questions, not trust-breaking confusion

Pause and fix before expanding if:

- any teacher publishes a misleading follow-up without noticing
- roster matching creates unreviewed false positives
- participation labels feel like grades or public ranking
- more than 3 support interventions are needed before first draft
- teachers cannot tell which data is sample/demo versus durable

## Synthesis

After each day, use [alpha/day-end-synthesis-template.md](alpha/day-end-synthesis-template.md) to summarize:

- what worked
- false-positive patterns
- interpretation quality issues
- support burden hotspots
- product fixes before the next alpha round
