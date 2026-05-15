# Relay Context

Relay is a classroom continuity product that turns class records into teacher-reviewed follow-up for students.

## Language

**Class Artifact**:
A teacher-provided class record such as a transcript, notes, roster, task list, or resource link.
_Avoid_: Data dump, raw file

**Redacted Real-Class Data**:
Class artifacts based on an actual class, with student-identifying details replaced before use in Relay validation.
_Avoid_: Raw student data, private roster

**Solo Simulation**:
A validation pass where Rushil plays the teacher/operator role and tests Relay against realistic class artifacts without recruiting outside testers.
_Avoid_: Teacher alpha, beta test

**Teacher Alpha**:
A later real-user research milestone where outside teachers try Relay and provide usability/support feedback.
_Avoid_: Solo simulation, launch-readiness gate

**Sample Workspace**:
The sample-only hosted environment where visitors can explore teacher and student flows without creating durable accounts or saved class data.
_Avoid_: Hosted demo workspace, demo account, public signup

**Sample Publication**:
A temporary published session inside the Sample Workspace that proves the student-facing workflow without real delivery or durable persistence.
_Avoid_: Real delivery, durable publish

**Memory-Only Sample State**:
Visitor-created Sample Workspace data that exists only for the current browser runtime and is cleared on reload, sign-out, or tab close.
_Avoid_: Demo persistence, saved sample account data, hidden localStorage

**Clean-Host Release Validation**:
First-run validation on the actual target operating system and architecture before that installer is treated as public-ready.
_Avoid_: Build artifact check, package exists, local-only smoke

**Detected Installer**:
The installer Relay recommends from the public download page based on the visitor's current operating system.
_Avoid_: Default macOS download, guessed platform

**Browser Hint Detection**:
Non-permission browser platform hints used to choose a Detected Installer.
_Avoid_: Fingerprinting, permission prompt, device scan

**Install Fallback**:
The non-desktop path shown when Relay cannot confidently detect the visitor's operating system for a desktop installer.
_Avoid_: Fake desktop default, macOS guess

**Installer Choice List**:
The fallback list of desktop operating-system installers shown when a visitor says the detected installer is not their system.
_Avoid_: Web/PWA option list, hidden downloads, advanced downloads

**Desktop Installer Escape Hatch**:
A clear secondary option from mobile, tablet, or ambiguous install flows that opens the Installer Choice List for visitors who want to download Relay for another computer.
_Avoid_: Forced desktop download, hidden alternate installers

**Web/PWA Entry Point**:
The browser and add-to-phone path shown near the public landing hero, separate from desktop installer choices.
_Avoid_: Installer choice, desktop download

**No Device Credential Prompt**:
A Relay product rule that app flows must not ask for a device password, OS password, fingerprint, or biometric credential.
_Avoid_: Keychain prompt, safeStorage prompt, Touch ID prompt, OS password prompt

**Celebration Moment**:
A short, reduced-motion-aware success animation tied to a completed workflow milestone.
_Avoid_: Idle spectacle, distracting loop, false success animation

**Microinteraction Polish**:
Small hover, focus, and pointer-follow motion that makes controls feel responsive without changing layout or meaning.
_Avoid_: Constant gleam, layout shift, inaccessible motion, disabled-control animation

**CS4ALL/Scratch Club Session**:
A recurring Monday learning session Rushil runs, suitable as the first real-class shape for Relay validation.
_Avoid_: Generic demo class

**Student Feedback Popup**:
A student-facing rating prompt for Relay product usefulness that asks for improvement notes when the score is low.
_Avoid_: Public rating, grade, generic survey

**Creator Product Feedback**:
Student feedback routed to Rushil/the Relay creator for product improvements, not to the teacher's classroom analytics.
_Avoid_: Teacher action item, grade signal, student-visible ranking

**Completion-Triggered Feedback**:
Student feedback requested only after the student marks a follow-up complete.
_Avoid_: First-load feedback, pre-read rating

**Non-Blocking Feedback Prompt**:
An optional feedback prompt shown after a successful workflow state change without blocking, reverting, or delaying that state.
_Avoid_: Completion gate, required survey, progress rollback

**Low Product Feedback**:
A low Relay usefulness rating that asks what would make the product better and posts that note to the creator feedback endpoint.
_Avoid_: Teacher action queue, classroom intervention, public complaint

## Relationships

- A **Class Artifact** may be synthetic or may come from **Redacted Real-Class Data**.
- **Redacted Real-Class Data** is made from one or more **Class Artifacts**.
- A **Solo Simulation** may use **Redacted Real-Class Data**.
- The first planned **Solo Simulation** uses a **CS4ALL/Scratch Club Session** as its real-class shape.
- A **Teacher Alpha** happens after the launch-readiness **Solo Simulation** and requires outside teacher participation.
- A **Sample Workspace** may allow temporary session creation and **Sample Publication**, but visitor-created class data must be **Memory-Only Sample State**.
- **Memory-Only Sample State** must not be written to localStorage, Supabase, cookies, telemetry payloads, or analytics. Seeded static sample data may reload because it is product demo content, not visitor-created class data.
- **Clean-Host Release Validation** applies per installer target; one passing target does not certify other operating systems or architectures.
- A **Detected Installer** is chosen with **Browser Hint Detection** only.
- A public download page shows one **Detected Installer** first when **Browser Hint Detection** is confident; otherwise it shows the **Install Fallback**.
- Mobile, tablet, ChromeOS, and ambiguous platforms should see the **Web/PWA Entry Point** or **Install Fallback** first, not a guessed desktop installer.
- The **Installer Choice List** is revealed when the visitor says the detected installer is not their system or uses the **Desktop Installer Escape Hatch**.
- The **Web/PWA Entry Point** belongs near the landing hero, not inside the desktop installer section.
- Relay app flows follow **No Device Credential Prompt**; install detection and local storage must not request device passwords, fingerprints, biometric credentials, Keychain prompts, or Electron safeStorage prompts.
- **Celebration Moment** applies to teacher new-session draft creation, teacher publish success, and student completion check-in.
- The student completion **Celebration Moment** fires when the student submits or marks the full follow-up complete, not on every individual task checkbox. Individual task changes may use small **Microinteraction Polish** only.
- A **Celebration Moment** fires only after the underlying state change succeeds. Reduced-motion users should get a quieter success state instead of confetti or cursor-following motion.
- **Microinteraction Polish** may appear across the site and app, but disabled or loading controls must not animate, and hover effects must not cause layout shift.
- A **Student Feedback Popup** records **Creator Product Feedback** for Rushil/the Relay creator.
- Relay uses **Completion-Triggered Feedback** so usefulness ratings happen after the student has acted on the follow-up.
- Completion state is primary: after a full student completion check-in, Relay should save/commit completion, show success or a **Celebration Moment**, then optionally show a **Non-Blocking Feedback Prompt**.
- A **Non-Blocking Feedback Prompt** must not prevent completion, undo progress, or make feedback required.
- Low **Creator Product Feedback** becomes **Low Product Feedback** and is routed to the product feedback endpoint, not teacher analytics.

## Example dialogue

> **Dev:** "Should the launch-readiness PRD require a teacher alpha before installers go public?"
> **Domain expert:** "No. The launch-readiness gate is a **Solo Simulation** with **Redacted Real-Class Data**. A **Teacher Alpha** is useful later, but it is not this PRD's required validation step."

> **Dev:** "Can the web demo save the sample teacher's published session?"
> **Domain expert:** "Only as a **Sample Publication** inside the current **Sample Workspace** interaction. It should disappear after reload or sign-out."

> **Dev:** "Can a visitor-created session in the Sample Workspace survive reload or sync to Supabase?"
> **Domain expert:** "No. It is **Memory-Only Sample State**. Reload, sign-out, or closing the tab clears it; static seeded samples may load again."

> **Dev:** "Can we publish Windows downloads after macOS arm64 passes locally?"
> **Domain expert:** "No. Each installer needs **Clean-Host Release Validation** on its own target."

> **Dev:** "Should the download page show macOS first for everyone?"
> **Domain expert:** "No. Show the **Detected Installer** first, with a small 'Not your system?' control that opens the **Installer Choice List**."

> **Dev:** "What if Relay cannot tell what system the visitor uses?"
> **Domain expert:** "Show the **Install Fallback** first. Do not guess macOS or any desktop installer."

> **Dev:** "What if the visitor is on mobile, tablet, ChromeOS, or an unknown platform but wants the desktop app for another computer?"
> **Domain expert:** "Show the **Web/PWA Entry Point** or **Install Fallback** first, but include a clear **Desktop Installer Escape Hatch** that opens the **Installer Choice List**."

> **Dev:** "Can Relay ask permission or fingerprint the browser to detect the installer?"
> **Domain expert:** "No. Use **Browser Hint Detection** only, and follow **No Device Credential Prompt**."

> **Dev:** "Can desktop storage use OS secure storage if it asks for Keychain or a password?"
> **Domain expert:** "No. **No Device Credential Prompt** also bans Keychain and Electron safeStorage prompts."

> **Dev:** "Should the installer section include the web/PWA path?"
> **Domain expert:** "No. Keep the **Installer Choice List** focused on desktop installers. Put the **Web/PWA Entry Point** near the hero."

> **Dev:** "Where should Relay use confetti?"
> **Domain expert:** "Use a **Celebration Moment** for teacher new-session draft creation, teacher publish success, and student completion check-in. Respect reduced motion and never animate false success."

> **Dev:** "Should every student task checkbox trigger confetti?"
> **Domain expert:** "No. Save confetti for the full completion check-in. Individual task checkboxes can get small **Microinteraction Polish**."

> **Dev:** "Can buttons have hover shine and cursor-following motion?"
> **Domain expert:** "Yes, as **Microinteraction Polish**, as long as it avoids layout shift, respects reduced motion, and stays off disabled or loading controls."

> **Dev:** "When should Relay ask students to rate a follow-up?"
> **Domain expert:** "After they mark it complete. The feedback is **Creator Product Feedback** for improving Relay, not teacher-visible classroom data."

> **Dev:** "Should the feedback popup block student completion?"
> **Domain expert:** "No. Commit completion and show success/confetti first. Then show an optional **Non-Blocking Feedback Prompt**."

> **Dev:** "What should happen when a student says the follow-up was not useful?"
> **Domain expert:** "Treat it as **Low Product Feedback**: ask what would make Relay better and send that to the creator feedback endpoint."

## Flagged ambiguities

- "Teacher alpha" was used for both solo validation and outside-teacher research. Resolved: **Solo Simulation** is the required launch-readiness validation path; **Teacher Alpha** is a later optional real-user research milestone.
- "Hosted demo workspace", "demo account", "web demo", and "sample workspace" were used for the same hosted sample-only environment. Resolved: use **Sample Workspace** for the non-durable public demo boundary.
- "Publish" in a **Sample Workspace** was ambiguous. Resolved: use **Sample Publication** for temporary demo publishing; it proves the student-facing workflow without real delivery or durable persistence.
- "Not saved" was ambiguous. Resolved: visitor-created Sample Workspace data is **Memory-Only Sample State** and must not write to localStorage, Supabase, cookies, telemetry payloads, or analytics.
- "Installer verified" was ambiguous. Resolved: use **Clean-Host Release Validation** for per-OS/per-architecture launch proof, not build artifact presence.
- "Download" was too broad for the website install flow. Resolved: public page should show one **Detected Installer** when confident, show **Install Fallback** when not confident, reveal the desktop-only **Installer Choice List** through "Not your system?", and keep the **Web/PWA Entry Point** near the hero.
- "Auto-detect" was ambiguous. Resolved: use **Browser Hint Detection** only; no fingerprinting, permission prompts, or device scans.
- "Mobile download" was ambiguous. Resolved: mobile/tablet/ChromeOS/unknown should get Web/PWA or fallback first, with a clear **Desktop Installer Escape Hatch** for downloading desktop installers manually.
- "No prompts" includes **No Device Credential Prompt**: Relay app flows must not ask for device password, OS password, fingerprint, biometric credential, Keychain access, or Electron safeStorage prompts.
- "Confetti" was too broad. Resolved: confetti is a **Celebration Moment** for teacher new-session draft creation, teacher publish success, and student completion check-in only after state succeeds.
- "Student completion check-in" means completing/submitting the full follow-up, not every individual task checkbox.
- "Interactive buttons" means **Microinteraction Polish**: hover/focus/pointer response that respects reduced motion, avoids layout shift, and does not animate disabled/loading controls.
- "Feedback" means **Creator Product Feedback** from a **Student Feedback Popup**, not teacher-facing classroom analytics.
- Feedback timing is **Completion-Triggered Feedback**, not first-load or detail-open feedback.
- Feedback prompting is non-blocking: student completion must save before the optional feedback prompt appears, and dismissing/skipping feedback must not affect progress.
- Low feedback is product-actionable: it should ask for an improvement note and route to Rushil/the creator, not appear in the teacher action queue.
