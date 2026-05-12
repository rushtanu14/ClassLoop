const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

const automatedGate = [
  "npm run test:security",
  "npm run test:import",
  "npm run test:cloud",
  "npm run test:entitlements",
  "npm run build",
  "npm run test:browser",
  "npm run test:web",
  "npm run test:desktop:state",
  "npm run test:desktop:first-run",
  "npm run drill:rollback",
  "npm run drill:incidents",
  "git diff --check",
];

const operatorModes = [
  ["Playwright", "Repeatable browser workflows, downloads, mobile viewports, and accessibility checks."],
  ["Browser plugin", "Interactive local or hosted route traversal, screenshots, visual QA, and responsive inspection."],
  ["Chrome plugin", "Profile-dependent hosted checks, installed-PWA behavior, cookies, and browser-specific persistence."],
  ["Computer Use", "Native Electron app, installers, OS dialogs, file picker, microphone/screen-capture prompts, and clean-machine launch."],
  ["Supabase/Stripe plugins", "Live hosted auth, RLS, profile state, checkout, portal, webhook, and entitlement verification."],
  ["GitHub/Vercel/Netlify plugins", "Remote branch, PR, deploy, preview, build-log, protected-preview, and rollback evidence."],
  ["Gmail/Slack/Notion/Drive/Canva/Jam/Granola", "Alpha feedback capture, support-burden notes, bug recordings, docs, and project-memory updates."],
];

const sections = [
  [
    "Public Landing, Hosted Demo, And PWA",
    "Browser or Chrome plugin",
    [
      "Open `/`, `#/features`, `#/screenshots`, `#/docs`, `#/privacy`, `#/donate`, and `#/download` on desktop, tablet, and phone widths.",
      "Verify missing macOS, Windows, and Linux URLs say `Packaging pending` before and after click.",
      "Confirm hosted demo uses sample teacher/student choices and never exposes account creation fields in demo-only mode.",
      "Verify Add to phone/PWA controls, manifest, service worker, icon, standalone start URL, and mobile readability.",
      "Check docs/privacy/donate/download copy for legal/support clarity and no misleading live-sync, billing, or installer claims.",
    ],
  ],
  [
    "Teacher Core Flow",
    "Playwright, Browser plugin, or Computer Use for packaged app",
    [
      "Run import -> review -> approve -> publish for Math review, CS workshop, Club meeting, General classroom, and Study group templates.",
      "Edit recap, essential questions, participation events, action items, resources, attendance, and student-specific follow-ups before publish.",
      "Inspect publish preview for every student, verify publish audit, save or skip the roster prompt, and export report JSON/CSV/print.",
      "Repeat back-to-back imports and confirm sessions, rosters, follow-ups, resources, and participation signals do not bleed between sessions.",
    ],
  ],
  [
    "Student Portal And Role Boundaries",
    "Playwright or Browser plugin",
    [
      "Sign in as rostered students and verify only that student's sessions appear.",
      "Mark complete, verify submitted state, return as teacher, mark reviewed, and confirm only the intended student changes.",
      "Directly open teacher-only routes (`#/analytics`, `#/classes`, `#/rosters`, `#/billing`, `#/privacy`) while signed in as a student.",
      "Create a second teacher and unrelated student; verify no sessions, rosters, classes, drafts, reports, or preferences leak across accounts.",
    ],
  ],
  [
    "Parser, Scale, And Durability",
    "Automated import tests plus Browser plugin for UI review",
    [
      "Paste comma, pipe, semicolon, tabular, numbered, compressed, Google Classroom, alias-column, and malformed rosters.",
      "Paste Zoom, Zoom chat, VTT, dotted VTT, Teams, Meet captions, generic labels, no-speaker prose, transcript-only inputs, and compliance-note labels.",
      "Run a large 100+ student transcript in the UI; record parse latency, spinner behavior, memory growth, and responsiveness.",
      "Corrupt desktop state, verify read-only recovery and blocked overwrite, restore backup, and confirm data returns.",
    ],
  ],
  [
    "Hosted Sync, Billing, Entitlements",
    "Supabase/Stripe plugins for live projects, Playwright for local fallbacks",
    [
      "With credentials absent, confirm desktop/local mode works and hosted sync/billing failures are clear.",
      "With test credentials configured, verify Supabase login/logout, token expiry, upload/download, conflict resolution, and offline queue behavior.",
      "Verify Stripe checkout, portal, webhook updates, upgrade, downgrade, canceled/past-due/unpaid states, and locked-feature UI.",
      "Attempt client-side entitlement tampering and confirm profile/API helpers ignore paid fields submitted by the client.",
    ],
  ],
  [
    "Desktop Installers And Clean Hosts",
    "Computer Use on clean macOS/Windows/Linux hosts",
    [
      "Build or install macOS x64/arm64, Windows x64/arm64 where supported, and Linux x64/arm64 artifacts on matching clean machines.",
      "Launch first-run, create account, confirm `.relay-data.json` and `.relay-storage-key` live in user data, relaunch, and sign back in.",
      "Inspect signing/notarization/Gatekeeper/SmartScreen/AppImage/deb warnings and whether they block a normal teacher.",
      "Do not publish desktop installers until signed/notarized macOS first-run passes and Windows/Linux first-run is verified on matching clean machines.",
    ],
  ],
  [
    "Accessibility, Security, Legal, Ops",
    "Playwright, shell scripts, Browser/Chrome, and Computer Use",
    [
      "Keyboard through login, dashboard, import, review, preview, report, student dashboard, privacy, billing, tutorial, and public routes.",
      "Verify visible focus, logical focus order, accessible names, live status announcements, contrast, mobile readability, and no horizontal overflow.",
      "Trigger malformed transcript, malformed URL, sync API down, billing API down, storage corruption, and package init failure states.",
      "Confirm Terms, Privacy, EULA, support contact, data retention, child-appropriate safety, and demo-data ephemerality before public signup.",
      "Run rollback and incident drills; classify findings as correctness errors, feature issues, cohesion improvements, suggested features, and remaining gaps.",
    ],
  ],
];

function markdown() {
  const lines = [
    "# Relay Full Manual QA Checklist",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This checklist complements the automated suite. Use it for human review, Browser/Chrome automation, or Computer Use when native desktop or OS prompts are involved.",
    "",
    "## Automated Gate To Run First",
    "",
    ...automatedGate.map((command) => `- \`${command}\``),
    "",
    "## Operator Modes And Plugins",
    "",
    ...operatorModes.map(([mode, use]) => `- **${mode}**: ${use}`),
    "",
    "## Manual Checks",
    "",
  ];

  sections.forEach(([title, owner, checks], index) => {
    lines.push(`### ${index + 1}. ${title}`, "", `Recommended operator: ${owner}`, "");
    checks.forEach((check) => lines.push(`- [ ] ${check}`));
    lines.push("");
  });

  lines.push(
    "## Manual QA Report Template",
    "",
    "| Area | Status | Evidence | Correctness error | Feature issue | Cohesion improvement | Suggested new feature | Owner / next step |",
    "|---|---|---|---|---|---|---|---|",
    "| Example | PASS/FAIL/BLOCKED | URL, screenshot, log, command, or notes | Broken behavior/regression | Missing/awkward expected behavior | Polish/naming/layout/workflow issue | New useful capability | Person/action/date |",
    "",
    "### Required Summary",
    "",
    "- Correctness errors found:",
    "- Feature issues found:",
    "- Suggested new features:",
    "- Cohesion improvements:",
    "- Remaining coverage gaps:",
    "- Cross-platform checks not yet run on real hardware:",
    "",
  );
  return lines.join("\n");
}

function main() {
  const output = markdown();
  if (process.argv.includes("--write")) {
    const outDir = path.join(rootDir, "test-results");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "relay-manual-qa-checklist.md");
    fs.writeFileSync(outPath, output);
    console.log(`Wrote ${path.relative(rootDir, outPath)}`);
    return;
  }
  console.log(output);
}

main();
