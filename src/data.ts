import type {
  ActionItem,
  ParticipationEvent,
  Resource,
  Session,
  SessionType,
  Student,
  StudentFollowUp,
  UnmatchedParticipant,
} from "./types";

export const sampleTranscript = `Teacher: Today we are reviewing similar triangles and how AA similarity lets us prove triangles are similar when two angle pairs match.
Teacher: We will use proportions to find missing side lengths. Remember, corresponding sides need to be matched in the same order.
Maya: If two triangles share one angle and both have a right angle, is that enough for AA?
Teacher: Yes. The shared angle and the right angle give us two matching angle pairs.
Aarav: So if triangle ABC is similar to triangle DEF, AB over DE should equal AC over DF?
Teacher: Exactly. Keep the corresponding sides aligned.
Jordan: I keep cross-multiplying wrong. I put 6 over x equals 9 over 12, then I multiply 6 times 9 instead of 6 times 12.
Teacher: Great catch. Cross products are diagonal, so 6 times 12 equals 9 times x.
Sofia: The scale factor from the small triangle to the big one is 3 over 2, so the missing side should be 15.
Teacher: Nice answer. Explain why.
Sofia: Because 10 times 3 over 2 is 15, and the matching side grew by that scale factor.
Teacher: Priya, I see you are here but quiet today. I will send you a practice set and you can check in after class.
Teacher: Ethan is absent. He needs the catch-up recap and the review video.
Teacher: Homework is problems 7-12 on the similar triangles worksheet. Due Friday.
Teacher: Resource link: https://example.com/similar-triangles-review`;

export const sampleNotes = `Geometry review with some algebra cleanup.
Need to reinforce:
- AA similarity from two matching angles
- Corresponding sides must stay in the same order
- Cross multiplication errors
- Homework problems 7-12 due Friday
- Ethan absent, Priya quiet, Jordan needs cross-multiplication reminder`;

export const sampleRoster = `Maya Chen, maya@classloop.demo
Aarav Patel, aarav@classloop.demo
Jordan Lee, jordan@classloop.demo
Sofia Ramirez, sofia@classloop.demo
Ethan Brooks, ethan@classloop.demo
Priya Shah, priya@classloop.demo`;

export type ImportDraftInput = {
  title: string;
  template: SessionType;
  transcript: string;
  notes: string;
  roster: string;
  resources: string;
};

const avatarColors = ["#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#14b8a6", "#6366f1", "#d946ef"];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function normalizeSpeakerName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isTranscriptMetadataSpeaker(speaker: string) {
  const normalized = normalizeSpeakerName(speaker);
  return (
    !normalized ||
    /^(teacher|instructor|professor|facilitator|host|classloop|meeting title|meeting date|date|duration|participants?|transcript|recording|audio|chat|question|answer|summary|agenda|start time|end time)$/i.test(
      normalized,
    ) ||
    /^\d+$/.test(normalized) ||
    /\d{1,2}\s+\d{2}/.test(normalized)
  );
}

type SpeakerLine = {
  speaker: string;
  text: string;
  line: string;
};

function parseSpeakerLine(line: string): SpeakerLine | null {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^(?:\[[^\]]+\]\s*)?(?:(?:\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?\s+)?([^:\n]{2,80}):\s*(.+)$/i,
  );
  if (!match) return null;
  const speaker = match[1].replace(/\s+/g, " ").trim();
  if (!speaker || /^https?$/i.test(speaker) || isTranscriptMetadataSpeaker(speaker)) return null;
  return { speaker, text: match[2].trim(), line: trimmed };
}

export function extractTranscriptSpeakers(text: string) {
  return text
    .split(/\n+/)
    .map(parseSpeakerLine)
    .filter((line): line is SpeakerLine => Boolean(line))
    .filter((line) => !isTranscriptMetadataSpeaker(line.speaker));
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextFriday() {
  const date = new Date();
  const day = date.getDay();
  const offset = (5 - day + 7) % 7 || 7;
  date.setDate(date.getDate() + offset);
  return toDateInput(date);
}

function parseRoster(roster: string, transcript: string): Student[] {
  const rosterStudents = roster
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const emailMatch = line.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
      const email = emailMatch?.[0] ?? "";
      const name = line
        .replace(email, "")
        .replace(/[<>,;]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return {
        id: slugify(name || `Student ${index + 1}`, `student-${index + 1}`),
        name: name || `Student ${index + 1}`,
        email: email || `${slugify(name || `student-${index + 1}`, `student-${index + 1}`)}@classloop.local`,
        avatarColor: avatarColors[index % avatarColors.length],
      };
    });

  if (rosterStudents.length) return rosterStudents;

  const speakerNames = extractTranscriptSpeakers(transcript).map((line) => line.speaker);

  return unique(speakerNames).map((name, index) => ({
    id: slugify(name, `student-${index + 1}`),
    name,
    email: `${slugify(name, `student-${index + 1}`)}@classloop.local`,
    avatarColor: avatarColors[index % avatarColors.length],
  }));
}

function cleanLine(line: string) {
  const parsed = parseSpeakerLine(line);
  return (parsed?.text ?? line).replace(/^[-*]\s*/, "").replace(/^[^:]{2,40}:\s*/, "").trim();
}

function shortText(value: string, maxLength = 96) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}...` : normalized;
}

function extractTopics(title: string, text: string, template: SessionType) {
  const fromTitle = title.includes(":") ? title.split(":").slice(1).join(":").trim() : title.trim();
  const bulletTopics = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map(cleanLine)
    .filter((line) => line.length > 6 && !/^https?:/i.test(line));
  const sentenceTopics = text
    .split(/[.\n]+/)
    .map(cleanLine)
    .filter((line) => /(review|covered|topic|reinforce|practice|debug|assigned|discussed)/i.test(line))
    .filter((line) => line.length > 12)
    .slice(0, 3);

  const fallback: Record<SessionType, string[]> = {
    "Math review": ["core math concepts", "practice problems", "common mistakes"],
    "CS workshop": ["debugging steps", "project blockers", "code explanations"],
    "General classroom": ["main lesson ideas", "student questions", "next steps"],
    "Club meeting": ["meeting decisions", "assigned owners", "next checkpoint"],
    "Study group": ["review topics", "practice goals", "peer questions"],
  };

  return unique([fromTitle, ...bulletTopics, ...sentenceTopics, ...fallback[template]])
    .filter(Boolean)
    .slice(0, 4);
}

function extractAssignment(text: string) {
  const line = text
    .split(/\n+/)
    .map(cleanLine)
    .find((item) => /(homework|assignment|problems?|finish|complete|submit|due)/i.test(item));
  return line || "Review the session recap and complete the assigned follow-up check.";
}

function eventTypeFromText(text: string) {
  if (text.includes("?")) return "asked_question" as const;
  if (/(because|so|should|equals|answer|i think|we can|it is|therefore|the fix|the reason)/i.test(text)) {
    return "answered_question" as const;
  }
  return "chat" as const;
}

function detectsMisconception(text: string) {
  return /(wrong|mistake|confus|hard|stuck|error|bug|doesn't|does not|not sure|missed|forgot|failed|incorrect)/i.test(text);
}

function studentReadinessScore({
  attendance,
  isQuiet,
  askedQuestion,
  hasMisconception,
  answeredQuestion,
  usefulChat,
}: {
  attendance: "present" | "absent" | "late";
  isQuiet: boolean;
  askedQuestion: boolean;
  hasMisconception: boolean;
  answeredQuestion: boolean;
  usefulChat: boolean;
}) {
  if (attendance === "absent") return 22;
  let score = attendance === "late" ? 45 : 52;
  if (usefulChat) score += 6;
  if (askedQuestion) score += 7;
  if (answeredQuestion) score += 13;
  if (isQuiet) score -= 18;
  if (hasMisconception) score -= 16;
  return Math.max(18, Math.min(88, score));
}

function parseResources(resourcesText: string, sessionText: string, relatedTopic: string): Resource[] {
  const combined = `${resourcesText}\n${sessionText}`;
  const urls = unique((combined.match(/https?:\/\/[^\s)]+/g) ?? []).map((url) => url.replace(/[.,;]+$/, "")));
  return urls.map((url, index) => {
    const sourceLine = combined.split(/\n+/).find((line) => line.includes(url)) ?? "";
    const label = sourceLine
      .replace(url, "")
      .replace(/resource link:?/i, "")
      .replace(/resources?:?/i, "")
      .trim();
    let fallbackTitle = `Resource ${index + 1}`;
    try {
      fallbackTitle = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      fallbackTitle = `Resource ${index + 1}`;
    }
    return {
      id: `res-${index + 1}`,
      title: label || fallbackTitle,
      url,
      type: /video|youtube|youtu\.be|vimeo/i.test(url) ? "video" : "link",
      relatedTopic,
    };
  });
}

function speakerMatchesStudent(speaker: string, student: Student) {
  const normalizedSpeaker = normalizeSpeakerName(speaker);
  const normalizedName = normalizeSpeakerName(student.name);
  const first = student.name.split(" ")[0];
  const aliases = student.aliases ?? [];
  return [student.name, first, ...aliases].some((candidate) => {
    const normalizedCandidate = normalizeSpeakerName(candidate);
    return normalizedCandidate && normalizedSpeaker === normalizedCandidate;
  }) || normalizedSpeaker === normalizedName;
}

function lineForStudent(lines: string[], student: Student) {
  const first = student.name.split(" ")[0];
  const speakerPattern = new RegExp(`^(${escapeRegExp(student.name)}|${escapeRegExp(first)})\\s*:`, "i");
  return lines.filter((line) => {
    const parsed = parseSpeakerLine(line);
    return parsed ? speakerMatchesStudent(parsed.speaker, student) : speakerPattern.test(line);
  });
}

function suggestedStudentIdForSpeaker(name: string, roster: Student[]) {
  const normalized = normalizeSpeakerName(name);
  const firstToken = normalized.split(" ")[0];
  const firstInitial = firstToken.charAt(0);
  return roster.find((student) => {
    const studentName = normalizeSpeakerName(student.name);
    return studentName.startsWith(firstToken) || (firstInitial && studentName.charAt(0) === firstInitial);
  })?.id;
}

function findUnmatchedParticipants(sessionText: string, roster: Student[], hasExplicitRoster: boolean): UnmatchedParticipant[] {
  if (!hasExplicitRoster) return [];
  const speakerLines = extractTranscriptSpeakers(sessionText);
  const speakers = unique(speakerLines.map((line) => line.speaker));
  return speakers
    .filter((speaker) => !roster.some((student) => speakerMatchesStudent(speaker, student)))
    .map((speaker) => ({
      name: speaker,
      lines: speakerLines.filter((line) => line.speaker === speaker).map((line) => line.line).slice(0, 3),
      suggestedStudentId: suggestedStudentIdForSpeaker(speaker, roster),
    }));
}

export function createGeneratedSession(input: ImportDraftInput): Session {
  const suffix = Date.now().toString(36);
  const sessionText = `${input.transcript}\n${input.notes}`.trim();
  const sessionTitle = input.title || `${input.template} session`;
  const roster = parseRoster(input.roster, input.transcript);
  const hasExplicitRoster = Boolean(input.roster.trim());
  const unmatchedParticipants = findUnmatchedParticipants(sessionText, roster, hasExplicitRoster);
  const topics = extractTopics(sessionTitle, sessionText, input.template);
  const assignment = extractAssignment(sessionText);
  const dueDate = nextFriday();
  const lines = sessionText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const resources = parseResources(input.resources, sessionText, topics[0] ?? input.template);
  const speakerLines = extractTranscriptSpeakers(sessionText);

  const attendance = roster.reduce<Record<string, "present" | "absent" | "late">>((acc, student) => {
    const first = student.name.split(" ")[0].toLowerCase();
    const full = student.name.toLowerCase();
    const lower = sessionText.toLowerCase();
    if (lower.includes(`${first} is absent`) || lower.includes(`${full} absent`) || lower.includes(`absent: ${first}`)) {
      acc[student.id] = "absent";
    } else if (lower.includes(`${first} late`) || lower.includes(`${full} late`)) {
      acc[student.id] = "late";
    } else {
      acc[student.id] = "present";
    }
    return acc;
  }, {});

  const participationEvents: ParticipationEvent[] = roster.flatMap((student) => {
    const first = student.name.split(" ")[0];
    const lower = sessionText.toLowerCase();
    const spoken = lineForStudent(lines, student);
    const events: ParticipationEvent[] = spoken.slice(0, 2).map((line, index) => {
      const clean = cleanLine(line);
      const type = eventTypeFromText(clean);
      return {
        id: `p-${student.id}-${index}-${suffix}`,
        studentId: student.id,
        type,
        text:
          type === "asked_question"
            ? `Asked: ${clean}`
            : type === "answered_question"
              ? `Contributed: ${clean}`
              : `Shared: ${clean}`,
        confidence: 0.86,
        approved: true,
      };
    });

    if (lower.includes(`${first.toLowerCase()} is absent`) || attendance[student.id] === "absent") {
      events.push({
        id: `p-${student.id}-absent-${suffix}`,
        studentId: student.id,
        type: "absent",
        text: "Marked absent and needs catch-up materials.",
        confidence: 0.94,
        approved: true,
      });
    }

    if (lower.includes(`${first.toLowerCase()} is quiet`) || lower.includes(`${first.toLowerCase()} was quiet`)) {
      events.push({
        id: `p-${student.id}-quiet-${suffix}`,
        studentId: student.id,
        type: "quiet",
        text: "Present but flagged for a private confidence check-in.",
        confidence: 0.82,
        approved: true,
      });
    }

    return events;
  });

  const followUps: StudentFollowUp[] = roster.map((student) => {
    const events = participationEvents.filter((event) => event.studentId === student.id);
    const isAbsent = attendance[student.id] === "absent";
    const isQuiet = events.some((event) => event.type === "quiet");
    const askedQuestion = events.find((event) => event.type === "asked_question");
    const answeredQuestion = events.find((event) => event.type === "answered_question");
    const usefulChat = events.some((event) => event.type === "chat");
    const misconceptionEvent = events.find((event) => detectsMisconception(event.text));
    const baseTasks = [assignment];
    if (isAbsent) baseTasks.unshift("Read the catch-up recap");
    if (isQuiet) baseTasks.push("Submit a quick confidence check-in");
    if (askedQuestion) baseTasks.push(`Review the answer to your question: ${shortText(askedQuestion.text.replace(/^Asked:\s*/i, ""), 72)}`);
    if (misconceptionEvent) baseTasks.push(`Redo the step connected to: ${shortText(misconceptionEvent.text.replace(/^(Asked|Contributed|Shared):\s*/i, ""), 72)}`);
    if (answeredQuestion && !misconceptionEvent) baseTasks.push("Write one sentence explaining the idea you contributed in class.");

    const readinessScore = studentReadinessScore({
      attendance: attendance[student.id],
      isQuiet,
      askedQuestion: Boolean(askedQuestion),
      hasMisconception: Boolean(misconceptionEvent),
      answeredQuestion: Boolean(answeredQuestion),
      usefulChat,
    });

    return {
      studentId: student.id,
      reminder: isAbsent
        ? `Catch up on ${topics[0]} before starting the assigned work.`
        : isQuiet
          ? `Use the recap to check your confidence on ${topics[0]}, then send a quick check-in.`
          : misconceptionEvent
            ? `Revisit the part of ${topics[0]} that caused confusion, then complete the class follow-up.`
            : askedQuestion
              ? `Start with the answer to your question, then complete the shared class follow-up.`
              : `Review ${topics[0]} and complete the assigned follow-up.`,
      catchUp: isAbsent
        ? "You were marked absent for this session. Start with the recap, then use the resources and assigned work to catch up."
        : events.length
          ? misconceptionEvent
            ? "Your dashboard includes the shared class recap plus extra review for the part that seemed confusing during class."
            : askedQuestion
              ? "Your dashboard includes the shared class recap plus a review task tied to the question you asked."
              : "Your dashboard connects your class participation to the follow-up work."
          : "You were marked present. Use the recap and resources to confirm the main takeaways.",
      tasks: unique(baseTasks),
      dueDate,
      status: "todo",
      score: readinessScore,
    };
  });

  const actionItems: ActionItem[] = [
    {
      id: `task-class-${suffix}`,
      title: assignment.length > 72 ? "Complete assigned follow-up work" : assignment,
      description: `Class-level follow-up generated from the imported ${input.template.toLowerCase()} record.`,
      dueDate,
      status: "todo",
      source: "Detected from transcript, notes, or teacher-entered session details.",
    },
    ...followUps
      .filter((followUp) => attendance[followUp.studentId] === "absent" || followUp.score < 55)
      .map((followUp, index) => ({
        id: `task-student-${index}-${suffix}`,
        title: `${roster.find((student) => student.id === followUp.studentId)?.name ?? "Student"} support check`,
        description: followUp.reminder,
        ownerId: followUp.studentId,
        dueDate: followUp.dueDate,
        status: followUp.status,
        source: "Generated from attendance and participation signals.",
      })),
  ];

  return {
    id: `session-generated-${suffix}`,
    title: sessionTitle,
    type: input.template,
    date: toDateInput(new Date()),
    status: "draft",
    students: roster,
    transcript: input.transcript,
    notes: input.notes,
    recap: sessionText
      ? `This ${input.template.toLowerCase()} focused on ${topics.slice(0, 3).join(", ")}. Students leave with a shared recap, class-wide follow-up work, and personal review steps based on attendance, questions, and participation from the session.`
      : `ClassLoop created a blank ${input.template.toLowerCase()} draft. Add transcript details or teacher notes to make the recap more specific.`,
    essentialQuestions: [
      `What were the most important takeaways about ${topics[0]}?`,
      "Which students need support or catch-up before the next session?",
      `What follow-up work should be completed by ${dueDate}?`,
    ],
    attendance,
    resources,
    actionItems,
    participationEvents,
    followUps,
    unmatchedParticipants,
    transcriptAliases: {},
  };
}
