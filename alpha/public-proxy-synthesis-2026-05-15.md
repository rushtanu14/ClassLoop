# ClassLoop Public-Transcript Proxy Alpha Synthesis

Date: 2026-05-15
Alpha day: Public proxy, not live teacher field feedback
Teachers observed: 0
Public transcript proxies reviewed: 4
Sessions attempted: 4
Sessions reaching draft: 4 proxy drafts estimated
Sessions reaching publish preview: 4 proxy previews estimated, but 3 require stronger manual gating before student-facing use

## Source Set

This synthesis uses public transcript-style artifacts because no live teacher tracker rows were available.

- Inside Mathematics, `Day 118: Sustained peer discourse`: public 8th-grade math classroom transcript with repeated generic `STUDENT` labels.
- Nigel Caplan, `Typical Zoom lesson (transcript)`: public Zoom automatic-transcript humor post showing noisy ASR and generic student turns.
- GoTranscript, `Classroom Dynamics: Tim's Struggle and Collaborative Learning`: public classroom transcript with speaker-role ambiguity.
- University of Victoria Faculty of Science information session Zoom chat transcript: public chat transcript with Q&A, resource links, direct-message artifacts, and staff/student role ambiguity.
- Colorado State WAC public Zoom chat transcripts were used as a secondary check for the same chat-only patterns: introductions, reactions, bot/notetaker messages, links, questions, and technical-access notes.

## Scorecard

Average usability rating: 3.0 / 5
Average interpretation quality: 3.0 / 5
Average support interventions per proxy: 2.0
Total matching false positives: 4
Total participation false positives: 9
Would-use-again count: 1 yes, 2 maybe, 1 no

## What Worked

- Chat-style Zoom transcripts are useful for extracting questions, links, and workshop resources.
- Class-level recaps can still be useful when the transcript has a coherent topic, even when individual speaker identity is weak.
- The teacher-review workflow is the right product posture: false positives were generally catchable if review screens make confidence and source lines obvious.
- Math discourse transcripts show ClassLoop can produce meaningful concept summaries when the transcript is short and content-dense.

## Interpretation Quality

Best examples:

- The math peer-discourse transcript supports a useful recap around equations, inverse operations, and explaining solution steps.
- Public Zoom chat transcripts support resource extraction and question clustering, especially when participants post links or explicit questions.

Issues:

- Noisy Zoom ASR should not be treated as a normal transcript. The Caplan sample shows enough garbling that generated recaps and action items could become misleading without a low-confidence warning.
- Chat-only transcripts lack spoken context. They should produce a workshop Q&A/resource summary, not individualized student follow-ups by default.
- Role-ambiguous transcripts can mix narrator, teacher, and student utterances. That can make the recap plausible while making participation attribution unsafe.

## False Positives

Matching false positives:

- Generic `STUDENT` labels create unavoidable ambiguity unless the teacher links each segment to a roster entry.
- `Speaker 1`, `Speaker 2`, and `Speaker 3` labels can collapse narrator, teacher, and multiple students into one identity.
- Public Zoom chat display names can include staff, faculty, bots, direct-message recipients, and attendees; roster matching should not assume every named participant is a student.

Participation false positives:

- Reactions and greetings should not count as meaningful participation.
- Chat tech issues such as audio/wifi trouble should be logged as support context, not student engagement.
- Staff answers in an info session can look like student responses unless roles are reviewed.
- Generic student turns in math discourse should be class-level evidence until linked to a student.

Metadata/teacher/guest issues:

- AI notetaker/bot messages should be filtered or flagged before import.
- Direct-message transcript fragments should be ignored by default or surfaced with a privacy warning.
- Teacher/narrator lines need stronger role detection before participation extraction.

## Support Burden

Install/opening:

- Not assessed in this proxy run. No live teacher installed or opened the app.

Import/setup:

- Expected burden is moderate for public transcripts because the teacher would need to choose transcript type: full transcript, noisy ASR, chat-only, or role-ambiguous transcript.
- Roster setup is the main missing piece for public sources. Public transcripts rarely include a real roster and should not generate personalized follow-ups without one.

Review/publish:

- Review burden is highest when transcript labels are generic or noisy.
- Publish preview should block or warn when many participation events come from low-confidence generic speakers.

Student access:

- Not assessed directly. Chat-only and noisy-ASR sources should not be pushed to student dashboards without teacher edits.

## Product Fixes Before Next Alpha

P0:

- Do not allow a one-click student-facing publish when most participation events come from generic labels such as `STUDENT`, `Speaker 1`, or `Student 2` without roster linking.

P1:

- Add a transcript-quality warning for noisy ASR, with copy that asks teachers to add notes or clean key sections before publishing.
- Add a chat-only import mode that produces Q&A/resource summaries and disables individualized follow-ups unless roster-linked speakers exist.
- Filter or separately classify reactions, bot/notetaker messages, greetings, tech issues, and direct-message artifacts.
- Require teacher confirmation before turning staff/guest/adult attendee chat names into roster participants.

P2:

- Show source-line evidence beside every participation event and student follow-up.
- Add bulk controls for `Mark as teacher/staff/bot`, `Do not count as participation`, and `Needs speaker linking`.
- Add a public-data demo note explaining that public transcripts are proxy data, not field validation.

## Decision

Pause and fix before expanding beyond small alpha.

Rationale:

The public-proxy run suggests ClassLoop can produce useful class-level summaries and Q&A/resource extraction, but personalized participation and student follow-ups need stronger confidence gates. The riskiest cases are generic speaker labels, noisy Zoom ASR, chat-only sessions, and role-ambiguous transcripts. The next real teacher alpha should continue only with explicit review gating and clear low-confidence states.

## Fix Follow-Up

Implemented after this proxy run:

- Generic `STUDENT` / `Speaker` labels now create blocking import-quality warnings when a roster is present.
- Noisy ASR now creates a blocking warning and keeps matched participation unapproved until teacher review.
- Chat-only imports now create a warning, keep participation signals unapproved, and still extract resource links.
- Private/direct-message chat artifacts are ignored for matching and participation, with a warning.
- Staff, host, faculty, and bot/notetaker speakers are filtered out of student participation, with an info warning.
- Greeting/reaction/technical-access chat lines are filtered out of participation.
- Participation events now carry source-line evidence and a `reviewRequired` flag.
- Publish preview disables publishing while blocking import warnings remain unreviewed, then re-enables after teacher acknowledgment.
