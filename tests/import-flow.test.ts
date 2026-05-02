import { createGeneratedSession, readTranscriptFileText } from "../src/data.js";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${String(expected)}, got ${String(actual)}.`);
  }
}

const compressedRoster = `CLASS ROSTER — CS4All Demo Session
Mr. Agrawal | Period 4 | Spring 2026
#Student NameEmail1Aaliyah Carteracarter@cs4all.nyc2Danny Reyesdreyes@cs4all.nyc3Jalen Thompsonjthompson@cs4all.nyc4Keisha Brownkbrown@cs4all.nyc5Leo Fernandezlfernandez@cs4all.nyc6Marcus Williamsmwilliams@cs4all.nyc7Priya Mehtapmehta@cs4all.nyc8Brianna Owensbowens@cs4all.nyc9Caleb Nguyencnguyen@cs4all.nyc10Destiny Lewisdlewis@cs4all.nyc11Elijah Sandersesanders@cs4all.nyc12Fatima Hassanfhassan@cs4all.nyc13Gabriel Torresgtorres@cs4all.nyc14Hannah Kimhkim@cs4all.nyc15Isaiah Mooreimoore@cs4all.nyc16Jasmine Pateljpatel@cs4all.nyc17Kevin Diazkdiaz@cs4all.nyc18Lena Wulwu@cs4all.nyc`;

const zoomTranscript = `CS4ALL Zoom Demo — Full Transcript
Meeting Title: CS4All Intro to Computational Thinking — Demo Session
Date: April 28, 2026
Duration: 47 minutes
Participants: Ms. Rivera (Teacher), 18 Students

[00:00:03] Ms. Rivera: Alright everyone, I'm going to start the recording now. Can everyone give me a thumbs up in the reactions if you can hear me okay?
[00:00:11] Student (Jalen Thompson): I can hear you!
[00:00:13] Student (Priya Mehta): Yes, audio is good.
[00:00:15] Ms. Rivera: Perfect. Okay, so welcome back everyone. Today we're starting Unit 3 — Algorithms and Problem Decomposition. Before we dive in, quick check — did everyone finish the exit ticket from last Thursday?
[00:00:28] Student (Marcus Williams): I forgot 😭
[00:00:31] Ms. Rivera: Marcus, come see me after. Okay, so let's get into it. I'm going to share my screen. Can everyone see the slides?
[00:00:41] Student (Aaliyah Carter): Yes!
[00:00:42] Student (Danny Reyes): Yep.
[00:00:44] Ms. Rivera: Great. So — who can tell me, in their own words, what an algorithm is? Don't look it up, just think about it. Anyone?
[00:00:57] Student (Priya Mehta): Is it like... a set of steps to solve a problem?
[00:01:02] Ms. Rivera: Yes! Exactly. A sequence of instructions. Now here's what I want you to think about — where do you encounter algorithms in your daily life? Drop it in the chat.
[00:01:14] Student (Jalen Thompson): [Chat] TikTok algorithm lol
[00:01:15] Student (Keisha Brown): [Chat] GPS directions
[00:01:16] Student (Danny Reyes): [Chat] recipes
[00:01:17] Student (Marcus Williams): [Chat] alarm clock??
[00:01:18] Student (Priya Mehta): [Chat] found this video that explains it really well → https://www.youtube.com/watch?v=6hfOvs8pY1k
[00:01:20] Ms. Rivera: Love these. Danny — recipes, yes! That's a great one. An alarm clock is actually a really interesting case, Marcus — why do you think that might be algorithmic?
[00:01:33] Student (Marcus Williams): Uh... because it like, checks the time and then does something based on a condition?
[00:01:40] Ms. Rivera: Boom. Conditional logic. That's exactly it. Okay, let's move to the activity. I'm going to put you all into breakout rooms — groups of three. Your task is to write out the steps to make a peanut butter and jelly sandwich as if you were programming a robot. Be super literal. The robot has no common sense.
[00:02:01] Student (Aaliyah Carter): Wait do we write it in a doc?
[00:02:04] Ms. Rivera: Yes, I'm dropping a Docs link in the chat right now. You have 8 minutes. Go!
[00:02:09] [Breakout rooms opened — 6 groups]

[00:10:17] [Breakout rooms closed — all participants returned]
[00:10:22] Ms. Rivera: Okay welcome back! Let's hear from a few groups. Group 2, Keisha — can you share what your group came up with?
[00:10:31] Student (Keisha Brown): Okay so we wrote: Step 1 — Pick up the bread bag. Step 2 — Open the bread bag. Step 3 — Remove two slices of bread. Step 4 — Place slices on a flat surface...
[00:10:45] Ms. Rivera: Already I'm stopping you — "flat surface." What if the robot doesn't know what flat means? Or what surface to use?
[00:10:53] Student (Keisha Brown): Oh... we'd have to define that.
[00:10:55] Ms. Rivera: Exactly! This is what we call the precision problem in programming. Computers do exactly what you tell them — nothing more, nothing less. This is why debugging is so hard. Your logic might be right but your instructions are ambiguous. Okay Group 5, let's hear from you.
[00:11:14] Student (Leo Fernandez): We kind of went overboard — we wrote like 34 steps.
[00:11:18] [Laughter from several students]
[00:11:20] Ms. Rivera: That's not overboard, that's thorough! Can you read a few?
[00:11:24] Student (Leo Fernandez): Step 1 — Initialize hand variable. Step 2 — Assign dominant hand to variable. Step 3 — Extend arm toward bread bag...
[00:11:34] [More laughter]
[00:11:36] Ms. Rivera: I love it, Leo. This is actually really close to pseudocode. You're thinking like a programmer. Alright — let's talk decomposition. When a problem is complex, what do we do?
[00:11:48] Student (Priya Mehta): Break it into smaller parts?
[00:11:51] Ms. Rivera: Yes. We decompose it. The sandwich is actually three sub-problems: bread setup, spread application, and assembly. Each of those can be its own function. This maps directly to how we'll write Python functions next week.
[00:11:58] Student (Leo Fernandez): [Chat] yo this video breaks down decomposition perfectly https://www.youtube.com/watch?v=QXjU9qTsYCc
[00:12:02] Student (Aaliyah Carter): [Chat] omg we watched that in 8th grade lol
[00:12:04] Ms. Rivera: Leo drop the distractions 😄 but yes that's actually a solid resource, I'll add it to Classroom.
[00:12:09] Student (Danny Reyes): Wait are we actually gonna code a sandwich?
[00:12:13] Ms. Rivera: laughs Not quite. But we'll use this mental model. Okay — I want to do a quick Nearpod poll before we wrap up. Checking your understanding. One second while I launch it.
[00:12:28] [Poll launched]
Question: Which of the following is the BEST example of an algorithm?

A) A list of your favorite songs
B) Directions from your house to school
C) A photo of a map
D) The name of a city

[00:12:55] Ms. Rivera: Okay I'm seeing responses come in... 78% of you said B — directions from your house to school. That is correct! Directions are a sequence of steps with a clear start, end, and decision points. A list of songs has no sequence logic. Good job.
[00:13:14] Student (Marcus Williams): What about C though? A map kind of shows steps?
[00:13:19] Ms. Rivera: Great question. A map is a representation of space — it's data. But it's not an algorithm until you apply a process to it — like, GPS takes the map data and runs an algorithm to find the shortest path. Does that distinction make sense?
[00:13:32] Student (Marcus Williams): Yeah okay yeah.
[00:13:35] Ms. Rivera: Alright, we have about 5 minutes left. Homework for Thursday: complete the algorithm design worksheet on Google Classroom — it's the one titled "Everyday Algorithms." Also, for those of you who haven't submitted your Unit 2 reflection, that's now past due and affecting your grade.
[00:13:53] Student (Jalen Thompson): Ms. Rivera is the worksheet the one with the flowcharts?
[00:13:57] Ms. Rivera: Yes, the one with the flowcharts. There are three problems. You pick two of the three. Any other questions?
[00:14:06] Student (Aaliyah Carter): Are we going to keep using Scratch or switch to Python?
[00:14:10] Ms. Rivera: We're transitioning to Python starting next Thursday. We'll use replit — make sure your accounts are set up. I'll send a reminder on Classroom.
[00:14:19] Ms. Rivera: Okay everyone — great work today. I'll see you Thursday. Jalen, Marcus — stay on for a second.
[00:14:26] [Students begin leaving the meeting]
[00:14:31] Student (Jalen Thompson): Yes Ms. Rivera?
[00:14:33] Ms. Rivera: Jalen, you've been really engaged today, I just want to make sure you're keeping up with the written work too. Your participation is great but I need those docs submitted.
[00:14:42] Student (Jalen Thompson): Yeah I'll do it tonight I promise.
[00:14:44] Ms. Rivera: I'm going to hold you to that. Okay, have a good afternoon both of you.
[00:14:49] [Recording ended]`;

const session = createGeneratedSession({
  title: "CS4All Intro to Computational Thinking — Demo Session",
  template: "General classroom",
  transcript: zoomTranscript,
  notes: "",
  roster: compressedRoster,
  resources: "",
});

const rosterFormatVariants = [
  {
    name: "comma-separated lines",
    roster: `Roster
Aaliyah Carter, acarter@cs4all.nyc
Danny Reyes, dreyes@cs4all.nyc
Jalen Thompson, jthompson@cs4all.nyc`,
  },
  {
    name: "pipe-separated rows",
    roster: `Student Name | Email
Aaliyah Carter | acarter@cs4all.nyc
Danny Reyes | dreyes@cs4all.nyc
Jalen Thompson | jthompson@cs4all.nyc`,
  },
  {
    name: "numbered angle-bracket rows",
    roster: `Class roster
1. Aaliyah Carter <acarter@cs4all.nyc>
2. Danny Reyes <dreyes@cs4all.nyc>
3. Jalen Thompson <jthompson@cs4all.nyc>`,
  },
  {
    name: "tabular pasted rows",
    roster: `# Student Name\tEmail
1\tAaliyah Carter\tacarter@cs4all.nyc
2\tDanny Reyes\tdreyes@cs4all.nyc
3\tJalen Thompson\tjthompson@cs4all.nyc`,
  },
];

const speakerFormatTranscript = `Mr. Agrawal: Teacher instructions should not become a student.
Learner (Aaliyah Carter): I can explain the steps.
Speaker - Danny Reyes: I think directions are an algorithm.
Jalen Thompson: Is the worksheet due Thursday?
Resource: https://www.youtube.com/watch?v=6hfOvs8pY1k`;

const expectedStudents = [
  ["Aaliyah Carter", "acarter@cs4all.nyc"],
  ["Danny Reyes", "dreyes@cs4all.nyc"],
  ["Jalen Thompson", "jthompson@cs4all.nyc"],
  ["Keisha Brown", "kbrown@cs4all.nyc"],
  ["Leo Fernandez", "lfernandez@cs4all.nyc"],
  ["Marcus Williams", "mwilliams@cs4all.nyc"],
  ["Priya Mehta", "pmehta@cs4all.nyc"],
  ["Brianna Owens", "bowens@cs4all.nyc"],
  ["Caleb Nguyen", "cnguyen@cs4all.nyc"],
  ["Destiny Lewis", "dlewis@cs4all.nyc"],
  ["Elijah Sanders", "esanders@cs4all.nyc"],
  ["Fatima Hassan", "fhassan@cs4all.nyc"],
  ["Gabriel Torres", "gtorres@cs4all.nyc"],
  ["Hannah Kim", "hkim@cs4all.nyc"],
  ["Isaiah Moore", "imoore@cs4all.nyc"],
  ["Jasmine Patel", "jpatel@cs4all.nyc"],
  ["Kevin Diaz", "kdiaz@cs4all.nyc"],
  ["Lena Wu", "lwu@cs4all.nyc"],
];

const expectedMatchedSpeakers = [
  "Student (Jalen Thompson)",
  "Student (Priya Mehta)",
  "Student (Marcus Williams)",
  "Student (Aaliyah Carter)",
  "Student (Danny Reyes)",
  "Student (Keisha Brown)",
  "Student (Leo Fernandez)",
];

assertEqual(session.students.length, 18, "compressed roster should parse exactly 18 students");
expectedStudents.forEach(([name, email]) => {
  assert(
    session.students.some((student) => student.name === name && student.email === email),
    `compressed roster should include ${name} with ${email}`,
  );
});
assertEqual(session.followUps.length, 18, "follow-ups should be created for the full roster");
assert(session.participationEvents.length > 0, "matched student transcript lines should create participation events");
assertEqual(session.resources.length, 2, "two YouTube resources should be extracted");
assert(
  session.resources.some((resource) => resource.url === "https://www.youtube.com/watch?v=6hfOvs8pY1k"),
  "resources should include the algorithm YouTube URL",
);
assert(
  session.resources.some((resource) => resource.url === "https://www.youtube.com/watch?v=QXjU9qTsYCc"),
  "resources should include the decomposition YouTube URL",
);

const unmatchedNames = (session.unmatchedParticipants ?? []).map((participant) => participant.name);
assert(!unmatchedNames.includes("Ms. Rivera"), "teacher speaker should not be reported as unmatched");
assert(!unmatchedNames.includes("Mr. Agrawal"), "roster teacher metadata should not be reported as unmatched");
expectedMatchedSpeakers.forEach((speaker) => {
  assert(!unmatchedNames.includes(speaker), `${speaker} should match a roster student`);
});

rosterFormatVariants.forEach((variant) => {
  const variantSession = createGeneratedSession({
    title: `Import robustness check: ${variant.name}`,
    template: "General classroom",
    transcript: speakerFormatTranscript,
    notes: "",
    roster: variant.roster,
    resources: "",
  });
  assertEqual(variantSession.students.length, 3, `${variant.name} should parse three roster students`);
  assert(
    variantSession.students.some((student) => student.name === "Aaliyah Carter" && student.email === "acarter@cs4all.nyc"),
    `${variant.name} should parse Aaliyah Carter`,
  );
  assert(
    variantSession.students.some((student) => student.name === "Danny Reyes" && student.email === "dreyes@cs4all.nyc"),
    `${variant.name} should parse Danny Reyes`,
  );
  assert(
    variantSession.students.some((student) => student.name === "Jalen Thompson" && student.email === "jthompson@cs4all.nyc"),
    `${variant.name} should parse Jalen Thompson`,
  );
  assertEqual(variantSession.unmatchedParticipants?.length ?? 0, 0, `${variant.name} should match known speaker variants`);
  assert(variantSession.participationEvents.length > 0, `${variant.name} should generate participation events`);
  assertEqual(variantSession.resources.length, 1, `${variant.name} should preserve transcript URL extraction`);
});

const transcriptFile =
  typeof File === "function"
    ? new File([zoomTranscript], "cs4all-demo.vtt", { type: "text/vtt" })
    : { name: "cs4all-demo.vtt", text: async () => zoomTranscript };
const fileTranscript = await readTranscriptFileText(transcriptFile);
const fileSession = createGeneratedSession({
  title: "CS4All file upload path",
  template: "General classroom",
  transcript: fileTranscript,
  notes: "",
  roster: compressedRoster,
  resources: "",
});

assertEqual(fileTranscript, zoomTranscript, "transcript file text should load unchanged");
assertEqual(fileSession.students.length, 18, "file transcript path should preserve roster parsing");
assert(fileSession.participationEvents.length > 0, "file transcript path should generate participation events");
assertEqual(fileSession.resources.length, 2, "file transcript path should preserve resource extraction");
