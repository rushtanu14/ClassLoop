# ClassLoop Alpha Support Triage

Use this during teacher alpha sessions to classify support burden.

## Severity

P0: Trust-breaking or privacy-risk issue.

- Wrong student gets another student's follow-up.
- Teacher cannot tell sample/demo data from real data.
- App appears to publish/send before teacher approval.
- Raw student data is exposed unexpectedly.

P1: Blocks alpha completion.

- App cannot launch.
- Teacher cannot import a normal roster/transcript.
- Draft generation fails or produces empty output.
- Publish preview cannot open.

P2: Slows teacher down but has workaround.

- Confusing label or workflow order.
- False positive appears but is easy to edit.
- Teacher needs help finding a control.
- Export/download action is unclear.

P3: Polish or preference.

- Copy tone.
- Visual spacing.
- Extra feature request.

## Support Intervention Types

Use one code per intervention in the tracker:

- `install_open`
- `account_demo_confusion`
- `import_transcript`
- `import_roster`
- `speaker_matching`
- `participation_interpretation`
- `recap_interpretation`
- `student_preview`
- `publish_export`
- `student_access`
- `other`

## Redaction Format

Good:

```text
Student A was matched to Student B after display name "M. Chen".
```

Avoid:

```text
Maya Chen was matched to Marcus Williams.
```
