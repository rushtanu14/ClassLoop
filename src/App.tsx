import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Link2,
  Link as LinkIcon,
  ListChecks,
  LogOut,
  Mail,
  MessageSquare,
  Mic2,
  Palette,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UploadCloud,
  Trash2,
  UserPlus,
  UserRound,
  UserRoundCheck,
  UserX,
  Users,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  createGeneratedSession,
  extractTranscriptSpeakers,
  readTranscriptFileText,
  sampleNotes,
  sampleRoster,
  sampleTranscript,
} from "./data";
import type {
  ActionItem,
  AttendanceStatus,
  ParticipationEvent,
  ParticipationType,
  Resource,
  Session,
  SessionType,
  Student,
  StudentFollowUp,
  TaskStatus,
  UnmatchedParticipant,
} from "./types";

type RouteKey =
  | "dashboard"
  | "new-session"
  | "processing"
  | "review"
  | "publish-preview"
  | "report"
  | "student"
  | "student-session"
  | "analytics"
  | "tutorial"
  | "appearance";

type NavItem = {
  route: RouteKey;
  label: string;
  icon: typeof LayoutDashboard;
};

type AuthRole = "teacher" | "student";

type AuthSession = {
  accountId: string;
  role: AuthRole;
  email: string;
  name: string;
  studentId?: string;
  demo?: boolean;
};

type Account = {
  id: string;
  role: AuthRole;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  demo?: boolean;
};

type AccountSettingsInput = {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
};

type PasswordResetRecord = {
  code: string;
  expiresAt: number;
};

type SharedState = {
  accounts: Account[];
  sessions: Session[];
  draft: Session | null;
  demoLoaded: boolean;
  updatedAt?: string;
};

type SyncStatus = "connecting" | "shared" | "local";

type ThemeKey = "abyssal" | "classroom" | "botanical" | "graphite";

type ThemeSettings = {
  key: ThemeKey;
  accent: string;
  imageUrl: string;
};

const navItems: NavItem[] = [
  { route: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { route: "new-session", label: "New session", icon: PlusCircle },
  { route: "review", label: "Draft review", icon: Sparkles },
  { route: "report", label: "Session report", icon: ClipboardCheck },
  { route: "student", label: "Student view", icon: GraduationCap },
  { route: "analytics", label: "Analytics", icon: BarChart3 },
  { route: "tutorial", label: "How it works", icon: BookOpen },
  { route: "appearance", label: "Appearance", icon: Palette },
];

const studentNavItems: NavItem[] = [
  { route: "student", label: "My portal", icon: GraduationCap },
  { route: "tutorial", label: "How it works", icon: BookOpen },
];

const studentRoutes = new Set<RouteKey>(["student", "student-session", "tutorial"]);
const demoTeacherEmail = "teacher@classloop.demo";
const demoStudentEmail = "maya@classloop.demo";
const teacherPasswordHash = "92d96446c5fa184300fb96631d4ca0b18e536cfab5c0da5eead1edb535190e84";
const studentPasswordHash = "fecc0c0136b0cc27f320c7bdf5ffb1f6b902f517595f243cfa07999ef9035fe7";
const demoAccounts: Account[] = [
  {
    id: "demo-teacher",
    role: "teacher",
    email: demoTeacherEmail,
    name: "Ms. Rivera",
    passwordHash: teacherPasswordHash,
    createdAt: "2026-01-01T00:00:00.000Z",
    demo: true,
  },
  {
    id: "demo-student-maya",
    role: "student",
    email: demoStudentEmail,
    name: "Maya Chen",
    passwordHash: studentPasswordHash,
    createdAt: "2026-01-01T00:00:00.000Z",
    demo: true,
  },
];

const templateOptions: SessionType[] = [
  "General classroom",
  "Math review",
  "CS workshop",
  "Club meeting",
  "Study group",
];

const templateDescriptions: Record<SessionType, string> = {
  "Math review": "Homework, misconceptions, problem sets, and targeted practice.",
  "CS workshop": "Debugging notes, code blockers, project tasks, and help requests.",
  "General classroom": "Recaps, attendance, resources, and daily student follow-ups.",
  "Club meeting": "Roles, decisions, owners, deadlines, and meeting catch-up.",
  "Study group": "Shared notes, peer questions, practice goals, and check-ins.",
};

const templateDetailFields: Record<SessionType, Array<{ id: string; label: string; placeholder: string }>> = {
  "Math review": [
    { id: "practiceProblems", label: "Practice problems", placeholder: "Problems 7-12, worksheet B, textbook p. 144" },
    { id: "focusSkills", label: "Skills to reinforce", placeholder: "Similar triangles, proportions, cross multiplication" },
    { id: "commonMistakes", label: "Common mistakes", placeholder: "Wrong corresponding sides, diagonal products mixed up" },
  ],
  "CS workshop": [
    { id: "projectLinks", label: "Project or repo", placeholder: "GitHub link, Replit, starter file, or branch name" },
    { id: "debugTargets", label: "Debug targets", placeholder: "Array indexing, event handlers, state updates" },
    { id: "deliverable", label: "Workshop deliverable", placeholder: "Submit fixed function, write reflection, push commit" },
  ],
  "General classroom": [],
  "Club meeting": [
    { id: "decisions", label: "Decisions made", placeholder: "Event theme, budget choice, outreach plan" },
    { id: "owners", label: "Owners", placeholder: "Who owns each next step" },
    { id: "nextCheckpoint", label: "Next checkpoint", placeholder: "Deadline, meeting date, milestone" },
  ],
  "Study group": [
    { id: "topics", label: "Topics", placeholder: "Exam units, readings, problem types" },
    { id: "peerQuestions", label: "Peer questions", placeholder: "Questions the group could not fully answer" },
    { id: "practiceGoals", label: "Practice goals", placeholder: "Timed practice, explain one solution, review flashcards" },
  ],
};

const defaultTheme: ThemeSettings = {
  key: "classroom",
  accent: "#0f766e",
  imageUrl: "",
};

const themePresets: Record<
  ThemeKey,
  {
    name: string;
    summary: string;
    accent: string;
    previewClass: string;
  }
> = {
  abyssal: {
    name: "Abyssal glass",
    summary: "Image-led, bioluminescent, high-contrast screens with cinematic depth.",
    accent: "#38bdf8",
    previewClass: "abyssal",
  },
  classroom: {
    name: "Classroom calm",
    summary: "Clean, warm, and easy to scan for daily school use.",
    accent: "#0f766e",
    previewClass: "classroom",
  },
  botanical: {
    name: "Botanical studio",
    summary: "Soft green visual backdrop with calm cards and a natural feel.",
    accent: "#16a34a",
    previewClass: "botanical",
  },
  graphite: {
    name: "Graphite focus",
    summary: "Dark, minimal workspace with bright accents and strong contrast.",
    accent: "#8b5cf6",
    previewClass: "graphite",
  },
};

const accentOptions = ["#0f766e", "#2563eb", "#38bdf8", "#8b5cf6", "#e11d48", "#f59e0b", "#16a34a"];

const routeLabels: Record<RouteKey, string> = {
  dashboard: "Teacher dashboard",
  "new-session": "Import session",
  processing: "Draft processing",
  review: "Draft review",
  "publish-preview": "Publish preview",
  report: "Session report",
  student: "Student dashboard",
  "student-session": "Student session detail",
  analytics: "Teacher analytics",
  tutorial: "How it works",
  appearance: "Appearance",
};

function getRoute(): RouteKey {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const route = hash.split("?")[0] as RouteKey;
  return navItems.some((item) => item.route === route) ||
    route === "processing" ||
    route === "student-session" ||
    route === "publish-preview"
    ? route
    : "dashboard";
}

function getParam(name: string): string | null {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const query = hash.split("?")[1] ?? "";
  return new URLSearchParams(query).get(name);
}

function navigate(route: RouteKey, params?: Record<string, string>) {
  const query = params ? `?${new URLSearchParams(params).toString()}` : "";
  window.location.hash = `/${route}${query}`;
}

async function hashSecret(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function makeAccountId(role: AuthRole) {
  return `${role}-${crypto.randomUUID()}`;
}

function mergeAccounts(accounts: Account[] = []) {
  const merged = new Map<string, Account>();
  [...demoAccounts, ...accounts].forEach((account) => {
    merged.set(`${account.role}:${normalizeEmail(account.email)}`, {
      ...account,
      email: normalizeEmail(account.email),
    });
  });
  return Array.from(merged.values());
}

function createDemoSession(): Session {
  const session = createGeneratedSession({
    title: "Geometry Review: Similar Triangles + Algebra",
    template: "Math review",
    transcript: sampleTranscript,
    notes: sampleNotes,
    roster: sampleRoster,
    resources: "https://example.com/similar-triangles-review",
  });
  return {
    ...session,
    id: "demo-geometry-review",
    ownerEmail: demoTeacherEmail,
    isDemo: true,
    date: "2026-04-27",
    status: "published",
  };
}

function sessionOwnerEmail(session: Session) {
  return normalizeEmail(session.ownerEmail ?? demoTeacherEmail);
}

function teacherSessionsFor(sessions: Session[], email: string) {
  const owner = normalizeEmail(email);
  return sessions.filter((session) => sessionOwnerEmail(session) === owner);
}

function studentSessionsFor(sessions: Session[], email: string) {
  const normalizedEmail = normalizeEmail(email);
  return sessions.filter(
    (session) =>
      session.status === "published" &&
      session.students.some((student) => normalizeEmail(student.email) === normalizedEmail),
  );
}

function formatDate(date: string) {
  const localDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00`) : new Date(date);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(localDate);
}

function publishedRoster(sessions: Session[]) {
  return Array.from(
    new Map(
      sessions
        .filter((session) => session.status === "published")
        .flatMap((session) => session.students)
        .map((student) => [student.email.toLowerCase(), student]),
    ).values(),
  );
}

function findStudentByEmail(sessions: Session[], email: string) {
  return publishedRoster(sessions).find((student) => normalizeEmail(student.email) === normalizeEmail(email));
}

function studentById(id: string, roster: Student[] = []) {
  return (
    roster.find((student) => student.id === id) ?? {
      id,
      name: id
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "Unknown student",
      email: "",
      avatarColor: "#64748b",
    }
  );
}

const rosterAvatarColors = ["#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#14b8a6", "#6366f1", "#d946ef"];

function slugify(value: string, fallback: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || fallback;
}

function uniqueText(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function makeRosterStudent(name: string, email = "", index = 0, aliases: string[] = []): Student {
  const cleanName = name.trim() || `Student ${index + 1}`;
  const id = `${slugify(cleanName, `student-${index + 1}`)}-${Date.now().toString(36)}`;
  return {
    id,
    name: cleanName,
    email: normalizeEmail(email || `${slugify(cleanName, `student-${index + 1}`)}@classloop.local`),
    avatarColor: rosterAvatarColors[index % rosterAvatarColors.length],
    aliases: uniqueText(aliases),
  };
}

function blankFollowUpForStudent(student: Student, session: Session): StudentFollowUp {
  const dueDate = session.actionItems[0]?.dueDate ?? new Date().toISOString().slice(0, 10);
  return {
    studentId: student.id,
    reminder: `Review ${session.title} and complete the assigned follow-up.`,
    catchUp: "You were added to this session roster. Use the recap, resources, and tasks to stay current.",
    tasks: session.actionItems[0]?.title ? [session.actionItems[0].title] : ["Review the session recap"],
    dueDate,
    status: "todo",
    score: 60,
  };
}

function syncSessionRoster(session: Session, students: Student[]): Session {
  const normalizedStudents = students
    .filter((student) => student.name.trim() || student.email.trim())
    .map((student, index) => ({
      ...student,
      name: student.name.trim() || `Student ${index + 1}`,
      email: normalizeEmail(student.email || `${slugify(student.name || `student-${index + 1}`, `student-${index + 1}`)}@classloop.local`),
      avatarColor: student.avatarColor || rosterAvatarColors[index % rosterAvatarColors.length],
      aliases: uniqueText(student.aliases ?? []),
    }));
  const studentIds = new Set(normalizedStudents.map((student) => student.id));
  const nextAttendance = normalizedStudents.reduce<Record<string, AttendanceStatus>>((acc, student) => {
    acc[student.id] = session.attendance[student.id] ?? "present";
    return acc;
  }, {});
  const nextFollowUps = normalizedStudents.map(
    (student) => session.followUps.find((followUp) => followUp.studentId === student.id) ?? blankFollowUpForStudent(student, session),
  );
  return {
    ...session,
    students: normalizedStudents,
    attendance: nextAttendance,
    followUps: nextFollowUps,
    actionItems: session.actionItems.filter((item) => !item.ownerId || studentIds.has(item.ownerId)),
    participationEvents: session.participationEvents.filter((event) => studentIds.has(event.studentId)),
  };
}

function patchFollowUp(session: Session, studentId: string, changes: Partial<StudentFollowUp>) {
  return {
    ...session,
    followUps: session.followUps.map((followUp) =>
      followUp.studentId === studentId ? { ...followUp, ...changes } : followUp,
    ),
  };
}

function participationTypeFromText(text: string): ParticipationType {
  if (text.includes("?")) return "asked_question";
  if (/(because|so|should|equals|answer|i think|we can|it is|therefore)/i.test(text)) return "answered_question";
  return "chat";
}

function participantEventsFor(session: Session, participantName: string, studentId: string) {
  const suffix = Date.now().toString(36);
  const existingTexts = new Set(session.participationEvents.map((event) => `${event.studentId}:${event.text}`));
  return extractTranscriptSpeakers(`${session.transcript}\n${session.notes}`)
    .filter((line) => line.speaker.trim().toLowerCase() === participantName.trim().toLowerCase())
    .slice(0, 3)
    .map((line, index): ParticipationEvent => {
      const type = participationTypeFromText(line.text);
      const text =
        type === "asked_question"
          ? `Asked: ${line.text}`
          : type === "answered_question"
            ? `Contributed: ${line.text}`
            : `Shared: ${line.text}`;
      return {
        id: `p-${studentId}-linked-${index}-${suffix}`,
        studentId,
        type,
        text,
        confidence: 0.84,
        approved: !existingTexts.has(`${studentId}:${text}`),
      };
    })
    .filter((event) => event.approved);
}

function resolveParticipant(session: Session, participant: UnmatchedParticipant, mode: "add" | "link", studentId?: string): Session {
  const students =
    mode === "add"
      ? [
          ...session.students,
          makeRosterStudent(participant.name, "", session.students.length, [participant.name]),
        ]
      : session.students.map((student) =>
          student.id === studentId
            ? { ...student, aliases: uniqueText([...(student.aliases ?? []), participant.name]) }
            : student,
        );
  const targetStudent = mode === "add" ? students[students.length - 1] : students.find((student) => student.id === studentId);
  if (!targetStudent) return session;
  const synced = syncSessionRoster(session, students);
  const nextEvents = participantEventsFor(synced, participant.name, targetStudent.id);
  const currentFollowUp = synced.followUps.find((followUp) => followUp.studentId === targetStudent.id);
  return {
    ...synced,
    participationEvents: [...synced.participationEvents, ...nextEvents],
    followUps: synced.followUps.map((followUp) =>
      followUp.studentId === targetStudent.id
        ? {
            ...followUp,
            catchUp:
              currentFollowUp?.catchUp && currentFollowUp.catchUp !== "You were added to this session roster. Use the recap, resources, and tasks to stay current."
                ? currentFollowUp.catchUp
                : "ClassLoop matched this transcript speaker to the roster and connected their participation to this dashboard.",
            score: Math.max(followUp.score, nextEvents.length ? 72 : followUp.score),
          }
        : followUp,
    ),
    unmatchedParticipants: (synced.unmatchedParticipants ?? []).filter((item) => item.name !== participant.name),
    transcriptAliases: {
      ...(synced.transcriptAliases ?? {}),
      [participant.name]: targetStudent.id,
    },
  };
}

function statusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    todo: "To do",
    in_progress: "In progress",
    complete: "Complete",
    overdue: "Overdue",
  };
  return labels[status];
}

function participationLabel(type: ParticipationEvent["type"]) {
  const labels: Record<ParticipationEvent["type"], string> = {
    asked_question: "Asked question",
    answered_question: "Answered question",
    chat: "Useful chat",
    quiet: "Quiet flag",
    absent: "Missed session",
  };
  return labels[type];
}

function attendanceLabel(status: AttendanceStatus) {
  const labels: Record<AttendanceStatus, string> = {
    present: "Present",
    absent: "Absent",
    late: "Late",
  };
  return labels[status];
}

function completionRate(sessions: Session[]) {
  const followUps = sessions.flatMap((session) => session.followUps);
  if (followUps.length === 0) return 0;
  return Math.round((followUps.filter((followUp) => followUp.status === "complete").length / followUps.length) * 100);
}

function attentionCount(sessions: Session[]) {
  const latest = sessions[0];
  if (!latest) return 0;
  const absent = Object.values(latest.attendance).filter((status) => status === "absent").length;
  const quiet = latest.participationEvents.filter((event) => event.type === "quiet" && event.approved).length;
  const overdue = latest.followUps.filter((followUp) => followUp.status === "overdue").length;
  return absent + quiet + overdue;
}

function classParticipationRate(session: Session) {
  const activeIds = new Set(
    session.participationEvents
      .filter((event) => event.approved && !["quiet", "absent"].includes(event.type))
      .map((event) => event.studentId),
  );
  const present = Object.entries(session.attendance).filter(([, status]) => status !== "absent").length;
  if (!present) return 0;
  return Math.round((activeIds.size / present) * 100);
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function normalizeSharedState(data: Partial<SharedState>): SharedState {
  return {
    accounts: mergeAccounts(Array.isArray(data.accounts) ? data.accounts : []),
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    draft: data.draft ?? null,
    demoLoaded: Boolean(data.demoLoaded),
    updatedAt: data.updatedAt,
  };
}

function sharedStateJson(state: Pick<SharedState, "accounts" | "sessions" | "draft" | "demoLoaded">) {
  return JSON.stringify({
    accounts: state.accounts,
    sessions: state.sessions,
    draft: state.draft,
    demoLoaded: state.demoLoaded,
  });
}

function safeBackgroundUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "linear-gradient(transparent, transparent)";
  const sanitized = trimmed.replace(/["\\\n\r]/g, "");
  return `url("${sanitized}")`;
}

function App() {
  const [route, setRoute] = useState<RouteKey>(getRoute);
  const [accounts, setAccounts] = useState<Account[]>(demoAccounts);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [draft, setDraft] = useState<Session | null>(null);
  const [selectedStudentId, setSelectedStudentId] = usePersistentState<string>("classloop:selected-student", "maya");
  const [auth, setAuth] = usePersistentState<AuthSession | null>("classloop:auth:v1", null);
  const [theme, setTheme] = usePersistentState<ThemeSettings>("classloop:theme:main:v1", defaultTheme);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [sharedReady, setSharedReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("connecting");
  const [passwordResetCodes, setPasswordResetCodes] = useState<Record<string, PasswordResetRecord>>({});
  const serverSyncRef = useRef(false);
  const isSavingRef = useRef(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSharedJsonRef = useRef(
    sharedStateJson({ accounts: demoAccounts, sessions: [], draft: null, demoLoaded: false }),
  );
  const lastServerUpdatedAtRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const key = themePresets[theme.key] ? theme.key : defaultTheme.key;
    document.documentElement.dataset.theme = key;
    document.documentElement.style.setProperty("--green", theme.accent ?? defaultTheme.accent);
    document.documentElement.style.setProperty("--primary", theme.accent ?? defaultTheme.accent);
    document.documentElement.style.setProperty("--custom-backdrop", safeBackgroundUrl(theme.imageUrl ?? ""));
  }, [theme]);

  useEffect(() => {
    let active = true;
    fetch("/api/state")
      .then(async (response) => {
        const contentType = response.headers.get("content-type") ?? "";
        if (!response.ok || !contentType.includes("application/json")) {
          throw new Error("Shared state API is unavailable.");
        }
        return normalizeSharedState(await response.json());
      })
      .then((state) => {
        if (!active) return;
        setAccounts(state.accounts);
        setSessions(state.sessions);
        setDraft(state.draft);
        setDemoLoaded(state.demoLoaded);
        lastSharedJsonRef.current = sharedStateJson(state);
        lastServerUpdatedAtRef.current = state.updatedAt;
        serverSyncRef.current = true;
        setSyncStatus("shared");
      })
      .catch(() => {
        if (!active) return;
        const storedAccounts = localStorage.getItem("classloop:accounts:v1");
        const storedSessions = localStorage.getItem("classloop:sessions:v3");
        const storedDraft = localStorage.getItem("classloop:draft:v3");
        const storedDemo = localStorage.getItem("classloop:demo-loaded:v1");
        const localState = normalizeSharedState({
          accounts: storedAccounts ? JSON.parse(storedAccounts) : [],
          sessions: storedSessions ? JSON.parse(storedSessions) : [],
          draft: storedDraft ? JSON.parse(storedDraft) : null,
          demoLoaded: storedDemo ? JSON.parse(storedDemo) : false,
        });
        setAccounts(localState.accounts);
        setSessions(localState.sessions);
        setDraft(localState.draft);
        setDemoLoaded(localState.demoLoaded);
        lastSharedJsonRef.current = sharedStateJson(localState);
        serverSyncRef.current = false;
        setSyncStatus("local");
      })
      .finally(() => {
        if (active) setSharedReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sharedReady) return;
    if (!serverSyncRef.current) {
      localStorage.setItem("classloop:accounts:v1", JSON.stringify(accounts));
      localStorage.setItem("classloop:sessions:v3", JSON.stringify(sessions));
      localStorage.setItem("classloop:draft:v3", JSON.stringify(draft));
      localStorage.setItem("classloop:demo-loaded:v1", JSON.stringify(demoLoaded));
      return;
    }

    const nextJson = sharedStateJson({ accounts, sessions, draft, demoLoaded });
    if (nextJson === lastSharedJsonRef.current) return;

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => {
      isSavingRef.current = true;
      fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: nextJson,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to save shared state.");
          const state = normalizeSharedState(await response.json());
          lastSharedJsonRef.current = sharedStateJson(state);
          lastServerUpdatedAtRef.current = state.updatedAt;
          setSyncStatus("shared");
        })
        .catch(() => setSyncStatus("local"))
        .finally(() => {
          isSavingRef.current = false;
          writeTimerRef.current = null;
        });
    }, 300);
  }, [accounts, demoLoaded, draft, sessions, sharedReady]);

  useEffect(() => {
    if (!sharedReady || !serverSyncRef.current) return;
    const interval = window.setInterval(() => {
      if (isSavingRef.current) return;
      fetch("/api/state")
        .then(async (response) => {
          if (!response.ok) throw new Error("Unable to refresh shared state.");
          return normalizeSharedState(await response.json());
        })
        .then((state) => {
          if (state.updatedAt === lastServerUpdatedAtRef.current) return;
          const nextJson = sharedStateJson(state);
          if (nextJson !== lastSharedJsonRef.current) {
            setAccounts(state.accounts);
            setSessions(state.sessions);
            setDraft(state.draft);
            setDemoLoaded(state.demoLoaded);
          }
          lastSharedJsonRef.current = nextJson;
          lastServerUpdatedAtRef.current = state.updatedAt;
          setSyncStatus("shared");
        })
        .catch(() => setSyncStatus("local"));
    }, 2500);

    return () => window.clearInterval(interval);
  }, [sharedReady]);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) navigate("dashboard");
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (auth?.role === "student" && !studentRoutes.has(route)) {
      navigate("student");
    }
  }, [auth, route]);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [sessions],
  );

  const teacherSessions = useMemo(
    () => (auth?.role === "teacher" ? teacherSessionsFor(sortedSessions, auth.email) : []),
    [auth, sortedSessions],
  );
  const activeTheme = useMemo(
    () => ({
      ...defaultTheme,
      ...theme,
      key: themePresets[theme.key] ? theme.key : defaultTheme.key,
      imageUrl: theme.imageUrl ?? "",
    }),
    [theme],
  );
  const studentPortalSessions = useMemo(
    () => (auth?.role === "student" ? studentSessionsFor(sortedSessions, auth.email) : teacherSessions),
    [auth, sortedSessions, teacherSessions],
  );
  const visibleDraft = auth?.role === "teacher" && draft && sessionOwnerEmail(draft) === normalizeEmail(auth.email) ? draft : null;
  const latestPublished = teacherSessions.find((session) => session.status === "published") ?? teacherSessions[0];
  const effectiveRoute = auth?.role === "student" && !studentRoutes.has(route) ? "student" : route;

  const updateSession = (session: Session) => {
    setSessions((current) => {
      const existing = current.some((item) => item.id === session.id);
      const next = existing ? current.map((item) => (item.id === session.id ? session : item)) : [session, ...current];
      return [...next].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  };

  const updateSessionById = (sessionId: string, updater: (session: Session) => Session) => {
    setSessions((current) =>
      current
        .map((session) => (session.id === sessionId ? updater(session) : session))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    );
    setDraft((current) => (current?.id === sessionId ? updater(current) : current));
  };

  const ensureDemoSession = () => {
    const demoSession = createDemoSession();
    setSessions((current) =>
      current.some((session) => session.id === demoSession.id) ? current : [demoSession, ...current],
    );
    setDemoLoaded(true);
    return demoSession;
  };

  const publishDraft = () => {
    if (!visibleDraft || !auth) return;
    const published = { ...visibleDraft, ownerEmail: auth.email, status: "published" as const };
    updateSession(published);
    setDraft(published);
    navigate("report", { session: published.id });
  };

  const markFollowUpComplete = (sessionId: string, studentId: string) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              followUps: session.followUps.map((followUp) =>
                followUp.studentId === studentId ? { ...followUp, status: "complete", score: 100 } : followUp,
              ),
              actionItems: session.actionItems.map((item) =>
                item.ownerId === studentId || !item.ownerId ? { ...item, status: "complete" } : item,
              ),
            }
          : session,
      ),
    );
  };

  const handleLogin = async (role: AuthRole, email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const passwordHash = await hashSecret(password);
    const account = accounts.find(
      (item) => item.role === role && normalizeEmail(item.email) === normalizedEmail,
    );

    if (!account || account.passwordHash !== passwordHash) {
      return { ok: false, message: "Email or password is incorrect." };
    }

    const demoSession = account.demo ? ensureDemoSession() : undefined;

    if (role === "teacher") {
      setAuth({
        accountId: account.id,
        role: "teacher",
        email: normalizedEmail,
        name: account.name,
        demo: account.demo,
      });
      navigate("dashboard");
      return { ok: true };
    }

    const availableSessions = demoSession ? [demoSession, ...sortedSessions] : sortedSessions;
    const student = findStudentByEmail(studentSessionsFor(availableSessions, normalizedEmail), normalizedEmail);

    if (student) setSelectedStudentId(student.id);
    setAuth({
      accountId: account.id,
      role: "student",
      email: normalizedEmail,
      name: student?.name ?? account.name,
      studentId: student?.id,
      demo: account.demo,
    });
    navigate("student");
    return { ok: true };
  };

  const handleCreateAccount = async (role: AuthRole, name: string, email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = name.trim();

    if (!trimmedName) return { ok: false, message: "Enter a name for the account." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { ok: false, message: "Enter a valid email address." };
    }
    if (password.length < 8) return { ok: false, message: "Use at least 8 characters for the password." };
    if (
      accounts.some(
        (account) => account.role === role && normalizeEmail(account.email) === normalizedEmail,
      )
    ) {
      return { ok: false, message: "An account with that email already exists for this role." };
    }

    const account: Account = {
      id: makeAccountId(role),
      role,
      email: normalizedEmail,
      name: trimmedName,
      passwordHash: await hashSecret(password),
      createdAt: new Date().toISOString(),
    };
    setAccounts((current) => mergeAccounts([...current, account]));
    setAuth({ accountId: account.id, role, email: normalizedEmail, name: trimmedName });
    navigate(role === "teacher" ? "dashboard" : "student");
    return { ok: true };
  };

  const handleUpdateAccount = async (settings: AccountSettingsInput) => {
    if (!auth) return { ok: false, message: "Sign in again before changing account settings." };
    const account = accounts.find((item) => item.id === auth.accountId);
    if (!account) return { ok: false, message: "This account could not be found." };

    const nextName = settings.name.trim();
    const nextEmail = normalizeEmail(settings.email);
    if (!nextName) return { ok: false, message: "Enter a name for the account." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return { ok: false, message: "Enter a valid email address." };
    }
    if (
      accounts.some(
        (item) =>
          item.id !== account.id &&
          item.role === account.role &&
          normalizeEmail(item.email) === nextEmail,
      )
    ) {
      return { ok: false, message: "Another account already uses that email." };
    }
    if (auth.demo && (nextEmail !== normalizeEmail(account.email) || settings.newPassword)) {
      return { ok: false, message: "Sample account sign-in details stay fixed. Create your own account to change them." };
    }

    let passwordHash = account.passwordHash;
    if (settings.newPassword) {
      if (settings.newPassword.length < 8) {
        return { ok: false, message: "Use at least 8 characters for the new password." };
      }
      const currentHash = await hashSecret(settings.currentPassword);
      if (currentHash !== account.passwordHash) {
        return { ok: false, message: "Current password is incorrect." };
      }
      passwordHash = await hashSecret(settings.newPassword);
    }

    const nextAccount = { ...account, name: nextName, email: nextEmail, passwordHash };
    setAccounts((current) => current.map((item) => (item.id === account.id ? nextAccount : item)));
    setAuth((current) =>
      current
        ? {
            ...current,
            name: nextName,
            email: nextEmail,
          }
        : current,
    );
    return { ok: true, message: "Settings saved." };
  };

  const handleRequestPasswordReset = async (role: AuthRole, email: string) => {
    const normalizedEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return { ok: false, message: "Enter the email for the account you want to reset." };
    }

    const account = accounts.find((item) => item.role === role && normalizeEmail(item.email) === normalizedEmail);
    if (!account) {
      return { ok: true, message: "If an account exists for that email, a reset code can be sent." };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `${role}:${normalizedEmail}`;
    setPasswordResetCodes((current) => ({
      ...current,
      [key]: {
        code,
        expiresAt: Date.now() + 15 * 60 * 1000,
      },
    }));
    return {
      ok: true,
      message: "Reset code ready.",
      code,
      email: normalizedEmail,
      name: account.name,
    };
  };

  const handleCompletePasswordReset = async (
    role: AuthRole,
    email: string,
    code: string,
    newPassword: string,
  ) => {
    const normalizedEmail = normalizeEmail(email);
    const key = `${role}:${normalizedEmail}`;
    const resetRecord = passwordResetCodes[key];
    const account = accounts.find((item) => item.role === role && normalizeEmail(item.email) === normalizedEmail);

    if (!account || !resetRecord || resetRecord.expiresAt < Date.now() || resetRecord.code !== code.trim()) {
      return { ok: false, message: "Reset code is incorrect or expired." };
    }
    if (newPassword.length < 8) return { ok: false, message: "Use at least 8 characters for the new password." };
    if (account.demo) return { ok: false, message: "Sample account passwords stay fixed. Create your own account to change it." };

    const passwordHash = await hashSecret(newPassword);
    setAccounts((current) =>
      current.map((item) =>
        item.id === account.id
          ? {
              ...item,
              passwordHash,
            }
          : item,
      ),
    );
    setPasswordResetCodes((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    return { ok: true, message: "Password reset. You can sign in now." };
  };

  const logout = () => {
    setAuth(null);
    navigate("dashboard");
  };

  if (!auth) {
    return (
      <LoginPage
        onLogin={handleLogin}
        onCreateAccount={handleCreateAccount}
        onRequestPasswordReset={handleRequestPasswordReset}
        onCompletePasswordReset={handleCompletePasswordReset}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar route={effectiveRoute} auth={auth} onLogout={logout} showDemoCard={Boolean(auth.demo && demoLoaded)} />
      <main className="main-area">
        <Topbar
          route={effectiveRoute}
          latestSession={latestPublished}
          auth={auth}
          syncStatus={syncStatus}
          onUpdateAccount={handleUpdateAccount}
        />
        {effectiveRoute === "dashboard" && <TeacherDashboard sessions={teacherSessions} draft={visibleDraft} />}
        {effectiveRoute === "new-session" && (
          <ImportSession
            ownerEmail={auth.email}
            setDraft={setDraft}
            onUseDemo={() => setDemoLoaded(true)}
          />
        )}
        {effectiveRoute === "processing" && <Processing draft={visibleDraft} />}
        {effectiveRoute === "review" && (
          <ReviewDraft
            draft={visibleDraft}
            setDraft={setDraft}
            studentAccountEmails={accounts
              .filter((account) => account.role === "student")
              .map((account) => normalizeEmail(account.email))}
          />
        )}
        {effectiveRoute === "publish-preview" && (
          <PublishPreview
            draft={visibleDraft}
            selectedStudentId={selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            setDraft={setDraft}
            publishDraft={publishDraft}
          />
        )}
        {effectiveRoute === "report" && (
          <SessionReport
            sessions={teacherSessions}
            fallback={latestPublished}
            editSession={(session) => {
              setDraft({ ...session, ownerEmail: auth.email, status: "draft" });
              navigate("review");
            }}
          />
        )}
        {effectiveRoute === "student" && (
          <StudentDashboard
            sessions={studentPortalSessions}
            selectedStudentId={auth.role === "student" ? auth.studentId ?? selectedStudentId : selectedStudentId}
            setSelectedStudentId={setSelectedStudentId}
            markFollowUpComplete={markFollowUpComplete}
            auth={auth}
            updateSession={auth.role === "teacher" ? updateSessionById : undefined}
          />
        )}
        {effectiveRoute === "student-session" && (
          <StudentSessionDetail
            sessions={studentPortalSessions}
            selectedStudentId={auth.role === "student" ? auth.studentId ?? selectedStudentId : selectedStudentId}
            markFollowUpComplete={markFollowUpComplete}
            auth={auth}
            updateSession={auth.role === "teacher" ? updateSessionById : undefined}
          />
        )}
        {effectiveRoute === "analytics" && <TeacherAnalytics sessions={teacherSessions} />}
        {effectiveRoute === "tutorial" && <TutorialPage auth={auth} />}
        {effectiveRoute === "appearance" && <DesignSystemPage theme={activeTheme} setTheme={setTheme} />}
      </main>
    </div>
  );
}

function LoginPage({
  onLogin,
  onCreateAccount,
  onRequestPasswordReset,
  onCompletePasswordReset,
}: {
  onLogin: (role: AuthRole, email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  onCreateAccount: (
    role: AuthRole,
    name: string,
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message?: string }>;
  onRequestPasswordReset: (
    role: AuthRole,
    email: string,
  ) => Promise<{ ok: boolean; message?: string; code?: string; email?: string; name?: string }>;
  onCompletePasswordReset: (
    role: AuthRole,
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [role, setRole] = useState<AuthRole>("teacher");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "confirm">("request");
  const [resetCode, setResetCode] = useState("");
  const [issuedResetCode, setIssuedResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const demoEmail = role === "teacher" ? demoTeacherEmail : demoStudentEmail;
  const demoPassword = role === "teacher" ? "classloop-teacher" : "classloop-student";

  const chooseRole = (nextRole: AuthRole) => {
    setRole(nextRole);
    setError("");
    setNotice("");
    setResetMessage("");
  };

  const chooseMode = (nextMode: "signin" | "create") => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setResetOpen(false);
    if (nextMode === "create") {
      setEmail("");
      setName("");
    }
  };

  const fillDemo = () => {
    setMode("signin");
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
    setNotice("");
  };

  const closeResetModal = () => {
    setResetOpen(false);
    setResetStep("request");
    setResetCode("");
    setIssuedResetCode("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetMessage("");
  };

  const requestReset = async () => {
    setResetMessage("");
    const result = await onRequestPasswordReset(role, email);
    setResetMessage(result.message ?? "Reset request received.");
    if (result.ok && result.code && result.email) {
      setResetStep("confirm");
      setIssuedResetCode(result.code);
      setEmail(result.email);
    }
  };

  const openResetEmailDraft = () => {
    if (!issuedResetCode || !email) return;
    const subject = encodeURIComponent("ClassLoop password reset code");
    const body = encodeURIComponent(
      `Your ClassLoop password reset code is ${issuedResetCode}.\n\nThis code expires in 15 minutes.\n`,
    );
    window.open(`mailto:${normalizeEmail(email)}?subject=${subject}&body=${body}`);
  };

  const copyResetCode = async () => {
    if (!issuedResetCode) return;
    try {
      await navigator.clipboard.writeText(issuedResetCode);
      setResetMessage("Reset code copied.");
    } catch {
      setResetMessage("Copy failed. Select the code and copy it manually.");
    }
  };

  const completeReset = async () => {
    setResetMessage("");
    if (resetPassword !== resetConfirmPassword) {
      setResetMessage("New passwords do not match.");
      return;
    }
    const result = await onCompletePasswordReset(role, email, resetCode, resetPassword);
    setResetMessage(result.message ?? "Password reset.");
    if (result.ok) {
      setMode("signin");
      setPassword("");
      setConfirmPassword("");
      closeResetModal();
      setNotice(result.message ?? "Password reset. You can sign in now.");
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setNotice("");
    if (mode === "create" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsSubmitting(false);
      return;
    }
    try {
      const result =
        mode === "signin"
          ? await onLogin(role, email, password)
          : await onCreateAccount(role, name, email, password);
      if (!result.ok) setError(result.message ?? "Unable to sign in.");
    } catch {
      setError("Unable to verify credentials in this browser.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark">
            <BrainCircuit size={26} />
          </span>
          <div>
            <strong>ClassLoop</strong>
            <small>Secure classroom workspace</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to ClassLoop.</h1>
          <p>
            Keep class follow-ups organized in one place. Teachers publish updates when they are ready, and students see
            the work meant for them.
          </p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="auth-switch" aria-label="Sign in or create an account">
            <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => chooseMode("signin")}>
              Sign in
            </button>
            <button type="button" className={mode === "create" ? "active" : ""} onClick={() => chooseMode("create")}>
              Create account
            </button>
          </div>
          <div className="role-tabs" role="tablist" aria-label="Choose account type">
            <button type="button" className={role === "teacher" ? "active" : ""} onClick={() => chooseRole("teacher")}>
              <UserRound size={17} />
              Teacher
            </button>
            <button type="button" className={role === "student" ? "active" : ""} onClick={() => chooseRole("student")}>
              <GraduationCap size={17} />
              Student
            </button>
          </div>
          {mode === "create" && (
            <label className="field compact">
              <span>Name</span>
              <div className="input-with-icon">
                <UserRound size={17} />
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
              </div>
            </label>
          )}
          <label className="field compact">
            <span>Email</span>
            <div className="input-with-icon">
              <Mail size={17} />
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
            </div>
          </label>
          <label className="field compact">
            <span>Password</span>
            <div className="input-with-icon password-control">
              <KeyRound size={17} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
              />
              <button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          {mode === "signin" && (
            <button
              type="button"
              className="text-button forgot-password-link"
              onClick={() => {
                setResetOpen(true);
                setResetStep("request");
                setResetMessage("");
              }}
            >
              Forgot password?
            </button>
          )}
          {mode === "create" && (
            <label className="field compact">
              <span>Confirm password</span>
              <div className="input-with-icon password-control">
                <KeyRound size={17} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          )}
          {error && <p className="login-error">{error}</p>}
          {notice && <p className="login-success">{notice}</p>}
          <button className="primary-button full" type="submit" disabled={isSubmitting}>
            <KeyRound size={17} />
            {isSubmitting ? "Working..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="login-help">
          <strong>Sample accounts</strong>
          <span>Teacher: {demoTeacherEmail} / classloop-teacher</span>
          <span>Student: {demoStudentEmail} / classloop-student</span>
          <button type="button" className="text-button sample-account-button" onClick={fillDemo}>
            Use sample {role} account
            <ChevronRight size={16} />
          </button>
        </div>
      </section>
      {mode === "signin" && resetOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Reset password">
          <section className="password-reset-modal">
            <div className="modal-header">
              <div>
                <span className="eyebrow">Account recovery</span>
                <h2>Reset password</h2>
                <p>Choose the account, get a short reset code, then set a new password.</p>
              </div>
              <button type="button" className="text-button" onClick={closeResetModal}>
                Close
              </button>
            </div>
            <div className="reset-account-row">
              <span>{role === "teacher" ? "Teacher" : "Student"} account</span>
              <strong>{email || "Enter email on the sign-in form"}</strong>
            </div>
            {resetStep === "request" ? (
              <button type="button" className="primary-button full" onClick={requestReset}>
                <KeyRound size={17} />
                Get reset code
              </button>
            ) : (
              <div className="reset-confirm-grid">
                {issuedResetCode && (
                  <div className="reset-code-card">
                    <span>Reset code</span>
                    <button type="button" onClick={copyResetCode}>{issuedResetCode}</button>
                  </div>
                )}
                <button type="button" className="ghost-button full" onClick={openResetEmailDraft}>
                  <Mail size={17} />
                  Open email draft
                </button>
                <label className="field compact">
                  <span>Code</span>
                  <input value={resetCode} onChange={(event) => setResetCode(event.target.value)} placeholder="6-digit code" />
                </label>
                <label className="field compact">
                  <span>New password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={resetPassword}
                    onChange={(event) => setResetPassword(event.target.value)}
                    placeholder="New password"
                  />
                </label>
                <label className="field compact">
                  <span>Confirm new password</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={resetConfirmPassword}
                    onChange={(event) => setResetConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                  />
                </label>
                <button type="button" className="primary-button full" onClick={completeReset}>
                  <KeyRound size={17} />
                  Reset password
                </button>
              </div>
            )}
            {resetMessage && (
              <p className={/incorrect|expired|match|enter|failed/i.test(resetMessage) ? "settings-message" : "settings-message success"}>
                {resetMessage}
              </p>
            )}
          </section>
        </div>
      )}
      <section className="login-side">
        <div className="security-card">
          <span>
            <ShieldCheck size={22} />
          </span>
          <strong>Private by default</strong>
          <p>Class notes, participation signals, and follow-ups stay in the teacher workspace until they are published.</p>
        </div>
        <div className="security-card">
          <span>
            <LockIcon />
          </span>
          <strong>Student-specific sharing</strong>
          <p>Students only receive the recap, resources, and tasks connected to their own roster account.</p>
        </div>
      </section>
    </main>
  );
}

function LockIcon() {
  return <KeyRound size={22} />;
}

function Sidebar({
  route,
  auth,
  onLogout,
  showDemoCard,
}: {
  route: RouteKey;
  auth: AuthSession;
  onLogout: () => void;
  showDemoCard: boolean;
}) {
  const visibleNav = auth.role === "teacher" ? navItems : studentNavItems;
  return (
    <aside className="sidebar">
      <button
        className="brand"
        onClick={() => navigate(auth.role === "teacher" ? "dashboard" : "student")}
        aria-label="Go to dashboard"
      >
        <span className="brand-mark">
          <BrainCircuit size={24} />
        </span>
        <span>
          <strong>ClassLoop</strong>
          <small>Classroom continuity</small>
        </span>
      </button>
      <nav className="nav-list" aria-label="Primary">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = route === item.route;
          return (
            <button key={item.route} className={active ? "nav-item active" : "nav-item"} onClick={() => navigate(item.route)}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      {showDemoCard && (
        <section className="sidebar-panel">
          <div className="mini-visual" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p>Demo scenario</p>
          <strong>Geometry review</strong>
          <small>Transcript to student follow-ups in one flow.</small>
        </section>
      )}
      <button className="logout-button" onClick={onLogout}>
        <LogOut size={17} />
        Sign out
      </button>
    </aside>
  );
}

function Topbar({
  route,
  latestSession,
  auth,
  syncStatus,
  onUpdateAccount,
}: {
  route: RouteKey;
  latestSession?: Session;
  auth: AuthSession;
  syncStatus: SyncStatus;
  onUpdateAccount: (settings: AccountSettingsInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">{routeLabels[route]}</span>
        <h1>
          {auth.role === "student"
            ? "My ClassLoop"
            : route === "dashboard"
              ? "Today in ClassLoop"
              : routeLabels[route]}
        </h1>
      </div>
      <div className="topbar-actions">
        <div className="profile-control">
          <button className="account-pill" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen}>
            {auth.role === "teacher" ? <UserRound size={16} /> : <GraduationCap size={16} />}
            {auth.name}
          </button>
          {profileOpen && (
            <ProfileMenu auth={auth} syncStatus={syncStatus} onUpdateAccount={onUpdateAccount} onClose={() => setProfileOpen(false)} />
          )}
        </div>
        {auth.role === "teacher" && (
          <>
            <button className="ghost-button" onClick={() => navigate("student")}>
              <GraduationCap size={17} />
              Student preview
            </button>
            <button
              className="primary-button"
              onClick={() => navigate("new-session")}
              aria-label={latestSession ? `Create a new session after ${latestSession.title}` : "Create a new session"}
            >
              <PlusCircle size={18} />
              New session
            </button>
          </>
        )}
      </div>
    </header>
  );
}

function ProfileMenu({
  auth,
  syncStatus,
  onUpdateAccount,
  onClose,
}: {
  auth: AuthSession;
  syncStatus: SyncStatus;
  onUpdateAccount: (settings: AccountSettingsInput) => Promise<{ ok: boolean; message?: string }>;
  onClose: () => void;
}) {
  const [name, setName] = useState(auth.name);
  const [email, setEmail] = useState(auth.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    if (newPassword && newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    setSaving(true);
    const result = await onUpdateAccount({ name, email, currentPassword, newPassword });
    setSaving(false);
    setMessage(result.message ?? (result.ok ? "Settings saved." : "Unable to save settings."));
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <form className="profile-menu" onSubmit={saveSettings}>
      <div className="profile-menu-header">
        <div>
          <strong>Profile settings</strong>
          <small>{syncStatus === "shared" ? "Saved on this device" : "Saved in this browser"}</small>
        </div>
        <button type="button" className="text-button" onClick={onClose}>
          Done
        </button>
      </div>
      <label className="field compact">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field compact">
        <span>Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <label className="field compact">
        <span>Current password</span>
        <div className="input-with-icon password-control">
          <KeyRound size={17} />
          <input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Required to change password"
          />
          <button type="button" onClick={() => setShowPassword((show) => !show)} aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>
      <label className="field compact">
        <span>New password</span>
        <input
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Leave blank to keep current"
        />
      </label>
      <label className="field compact">
        <span>Confirm new password</span>
        <input
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirm new password"
        />
      </label>
      {message && <p className={message.includes("saved") ? "settings-message success" : "settings-message"}>{message}</p>}
      <div className="profile-actions">
        {auth.role === "teacher" && (
          <button type="button" className="ghost-button" onClick={() => navigate("appearance")}>
            <Palette size={17} />
            Appearance
          </button>
        )}
        <button className="primary-button" type="submit" disabled={saving}>
          <Save size={17} />
          {saving ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function TeacherDashboard({ sessions, draft }: { sessions: Session[]; draft: Session | null }) {
  const latest = sessions[0];
  const published = sessions.filter((session) => session.status === "published");
  const hasSessions = sessions.length > 0;
  const latestRoster = latest?.students ?? [];
  const overdue = latest?.followUps.filter((followUp) => followUp.status === "overdue") ?? [];
  const absentStudents = latest ? Object.entries(latest.attendance).filter(([, status]) => status === "absent") : [];
  const quietStudents = latest?.participationEvents.filter((event) => event.approved && event.type === "quiet") ?? [];
  const hasAttention = absentStudents.length > 0 || quietStudents.length > 0 || overdue.length > 0;

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="eyebrow">Live class follow-up loop</span>
          <h2>Turn messy class records into edited recaps, personal tasks, and completion check-ins.</h2>
          <p>
            The teacher stays in control while ClassLoop extracts what happened, who needs support, and what should happen
            next.
          </p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={() => navigate("new-session")}>
              <Wand2 size={19} />
              Create a session
            </button>
            {draft && (
              <button className="ghost-button large" onClick={() => navigate("review")}>
                <Sparkles size={18} />
                Continue draft
              </button>
            )}
          </div>
        </div>
        {hasSessions && <TranscriptTransformVisual />}
      </section>

      {hasSessions && (
        <section className="metric-grid">
          <MetricCard
            icon={ClipboardCheck}
            label="Published sessions"
            value={published.length.toString()}
            detail="This month"
            accent="green"
          />
          <MetricCard
            icon={Target}
            label="Follow-through"
            value={`${completionRate(published)}%`}
            detail="Completed student check-ins"
            accent="blue"
          />
          <MetricCard
            icon={CircleAlert}
            label="Needs attention"
            value={attentionCount(sessions).toString()}
            detail="Quiet, absent, or overdue"
            accent="amber"
          />
          <MetricCard
            icon={MessageSquare}
            label="Participation"
            value={latest ? `${classParticipationRate(latest)}%` : "0%"}
            detail="Present students with signals"
            accent="rose"
          />
        </section>
      )}

      <section className="content-grid two-columns">
        <Panel title="Recent sessions" icon={CalendarDays} action="View report" onAction={() => navigate("report")}>
          {hasSessions ? (
            <div className="session-list">
              {sessions.slice(0, 4).map((session) => (
                <button
                  key={session.id}
                  className="session-row"
                  onClick={() => navigate("report", { session: session.id })}
                >
                  <span className="session-icon">
                    <BookOpen size={18} />
                  </span>
                  <span>
                    <strong>{session.title}</strong>
                    <small>
                      {formatDate(session.date)} · {session.type}
                    </small>
                  </span>
                  <StatusPill status={session.status === "published" ? "complete" : "in_progress"} />
                </button>
              ))}
            </div>
          ) : (
            <InlineEmpty
              icon={BookOpen}
              title="No sessions yet"
              detail="Create a session or load the geometry sample to populate this dashboard."
              action="New session"
              onAction={() => navigate("new-session")}
            />
          )}
        </Panel>

        <Panel title="Attention queue" icon={AlertTriangle} action="Open analytics" onAction={() => navigate("analytics")}>
          {hasSessions ? (
            <div className="attention-list">
              {hasAttention ? (
                <>
                  {absentStudents.map(([studentId]) => (
                    <AttentionItem
                      key={studentId}
                      icon={UserX}
                      title={`${studentById(studentId, latestRoster).name} missed the latest session`}
                      detail="Catch-up recap and review video assigned."
                    />
                  ))}
                  {quietStudents.map((event) => (
                    <AttentionItem
                      key={event.id}
                      icon={Mic2}
                      title={`${studentById(event.studentId, latestRoster).name} was quiet`}
                      detail="Confidence check-in and practice pair recommended."
                    />
                  ))}
                  {overdue.slice(0, 2).map((followUp) => (
                    <AttentionItem
                      key={`${followUp.studentId}-${followUp.dueDate}`}
                      icon={Clock3}
                      title={`${studentById(followUp.studentId, latestRoster).name} has an overdue check-in`}
                      detail={followUp.reminder}
                    />
                  ))}
                </>
              ) : (
                <SupportSnapshotChart session={latest} />
              )}
            </div>
          ) : (
            <InlineEmpty
              icon={AlertTriangle}
              title="No student signals yet"
              detail="Attendance, quiet flags, and overdue follow-ups appear after a session is published."
            />
          )}
        </Panel>
      </section>

      <section className="content-grid two-columns">
        <Panel title="Completion trend" icon={LineChart}>
          {hasSessions ? (
            <TrendChart sessions={published} />
          ) : (
            <InlineEmpty
              icon={LineChart}
              title="No trend data yet"
              detail="Completion trends start once students receive follow-ups."
            />
          )}
        </Panel>
        <Panel title="Plan options" icon={ShieldCheck}>
          <div className="plan-stack">
            <PlanRow tier="Free" detail="Limited sessions, basic recaps, and class action items." />
            <PlanRow tier="Pro" detail="Unlimited sessions, transcript processing, student dashboards, analytics, exports." />
          </div>
        </Panel>
      </section>
    </div>
  );
}

function TranscriptTransformVisual() {
  return (
    <div className="transform-visual" aria-label="Transcript transformed into dashboard cards">
      <div className="visual-window">
        <div className="visual-line short" />
        <div className="visual-line" />
        <div className="visual-line mid" />
        <div className="visual-line tiny" />
      </div>
      <div className="visual-arrow">
        <Sparkles size={21} />
      </div>
      <div className="visual-cards">
        <span>Recap</span>
        <span>Tasks</span>
        <span>Signals</span>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  accent,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  value: string;
  detail: string;
  accent: "green" | "blue" | "amber" | "rose";
}) {
  return (
    <article className={`metric-card ${accent}`}>
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  action,
  onAction,
}: {
  title: string;
  icon: typeof LayoutDashboard;
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <Icon size={18} />
          <h3>{title}</h3>
        </div>
        {action && (
          <button className="text-button" onClick={onAction}>
            {action}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  return <span className={`status-pill ${status}`}>{statusLabel(status)}</span>;
}

function AttentionItem({
  icon: Icon,
  title,
  detail,
}: {
  icon: typeof AlertTriangle;
  title: string;
  detail: string;
}) {
  return (
    <div className="attention-item">
      <span>
        <Icon size={17} />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function PlanRow({ tier, detail }: { tier: string; detail: string }) {
  return (
    <div className="plan-row">
      <strong>{tier}</strong>
      <span>{detail}</span>
    </div>
  );
}

function TrendChart({ sessions }: { sessions: Session[] }) {
  const ordered = [...sessions].reverse();
  return (
    <div className="trend-chart">
      {ordered.map((session) => {
        const rate = completionRate([session]);
        return (
          <div key={session.id} className="trend-bar">
            <span style={{ height: `${Math.max(rate, 8)}%` }} />
            <small>{rate}%</small>
          </div>
        );
      })}
    </div>
  );
}

function SupportSnapshotChart({ session }: { session?: Session }) {
  if (!session) return null;
  const completed = completionRate([session]);
  const participation = classParticipationRate(session);
  const averageReadiness = session.followUps.length
    ? Math.round(session.followUps.reduce((sum, followUp) => sum + followUp.score, 0) / session.followUps.length)
    : 0;
  const rows = [
    { label: "Participation", value: participation },
    { label: "Completion", value: completed },
    { label: "Readiness", value: averageReadiness },
  ];

  return (
    <div className="support-snapshot">
      <div>
        <strong>No urgent follow-ups</strong>
        <small>Latest session snapshot</small>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="snapshot-row">
          <span>{row.label}</span>
          <div>
            <i style={{ width: `${Math.max(row.value, 4)}%` }} />
          </div>
          <small>{row.value}%</small>
        </div>
      ))}
    </div>
  );
}

function ImportSession({
  ownerEmail,
  setDraft,
  onUseDemo,
}: {
  ownerEmail: string;
  setDraft: (session: Session) => void;
  onUseDemo: () => void;
}) {
  const [title, setTitle] = useState("");
  const [template, setTemplate] = useState<SessionType>("General classroom");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [roster, setRoster] = useState("");
  const [resources, setResources] = useState("");
  const [fileName, setFileName] = useState("");
  const [templateDetails, setTemplateDetails] = useState<Record<string, string>>({});
  const activeTemplateFields = templateDetailFields[template];

  const loadSample = () => {
    setTitle("Geometry Review: Similar Triangles + Algebra");
    setTemplate("Math review");
    setTranscript(sampleTranscript);
    setNotes(sampleNotes);
    setRoster(sampleRoster);
    setResources("https://example.com/similar-triangles-review");
    setTemplateDetails({
      practiceProblems: "Problems 7-12 on the similar triangles worksheet",
      focusSkills: "AA similarity, corresponding sides, proportions, and missing side lengths",
      commonMistakes: "Cross-multiplication order and matching the wrong sides",
    });
    onUseDemo();
  };

  const handleTranscriptFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setTranscript(await readTranscriptFileText(file));
  };

  const generateDraft = () => {
    const detailNotes = activeTemplateFields
      .map((field) => {
        const value = templateDetails[field.id]?.trim();
        return value ? `${field.label}: ${value}` : "";
      })
      .filter(Boolean)
      .join("\n");
    const session = createGeneratedSession({
      title,
      template,
      transcript,
      notes: [notes, detailNotes].filter(Boolean).join("\n\n"),
      roster,
      resources,
    });
    setDraft({ ...session, ownerEmail });
    navigate("processing", { session: session.id });
  };

  const updateTemplateDetail = (id: string, value: string) => {
    setTemplateDetails((current) => ({ ...current, [id]: value }));
  };

  return (
    <div className="page-stack">
      <section className="import-layout">
        <div className="import-main">
          <div className="section-heading">
            <span className="eyebrow">New class record</span>
            <h2>Import a transcript, notes, or both.</h2>
            <p>ClassLoop will draft the teacher review page, then wait for approval before students see anything.</p>
          </div>

          <div className="form-grid">
            <label className="field wide">
              <span>Session title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <div className="field wide">
              <span>Session template</span>
              <div className="template-grid">
                {templateOptions.map((option) => (
                  <button
                    key={option}
                    className={template === option ? "template-card selected" : "template-card"}
                    onClick={() => setTemplate(option)}
                  >
                    <strong>{option}</strong>
                    <small>{templateDescriptions[option]}</small>
                  </button>
                ))}
              </div>
            </div>
            {activeTemplateFields.length > 0 && (
              <div className="template-detail-card wide">
                <div>
                  <strong>{template} details</strong>
                  <small>These optional fields shape the draft without adding extra review work later.</small>
                </div>
                <div className="template-detail-grid">
                  {activeTemplateFields.map((field) => (
                    <label key={field.id} className="field compact">
                      <span>{field.label}</span>
                      <textarea
                        value={templateDetails[field.id] ?? ""}
                        onChange={(event) => updateTemplateDetail(field.id, event.target.value)}
                        placeholder={field.placeholder}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}
            <label className="upload-zone wide">
              <UploadCloud size={24} />
              <strong>{fileName || "Upload transcript file"}</strong>
              <small>Zoom, Meet, text, or VTT file.</small>
              <input
                type="file"
                accept=".txt,.vtt,.srt"
                onChange={(event) => handleTranscriptFile(event.target.files?.[0])}
              />
            </label>
            <label className="field paste-field large-paste wide">
              <span>Paste transcript text</span>
              <textarea
                value={transcript}
                onChange={(event) => setTranscript(event.target.value)}
                placeholder="Paste the raw transcript here..."
              />
            </label>
            <label className="field paste-field wide">
              <span>Paste meeting notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Paste teacher notes, chat summaries, reminders, and homework here..."
              />
            </label>
            <label className="field paste-field large-paste wide">
              <span>Bulk roster</span>
              <textarea
                value={roster}
                onChange={(event) => setRoster(event.target.value)}
                placeholder="Name, email per line"
              />
            </label>
            <label className="field paste-field wide">
              <span>Resources and links</span>
              <textarea
                value={resources}
                onChange={(event) => setResources(event.target.value)}
                placeholder="Paste links or resources mentioned in class"
              />
            </label>
          </div>
        </div>

        <aside className="import-summary">
          <div className="summary-card">
            <span className="summary-icon">
              <Sparkles size={22} />
            </span>
            <h3>Draft will include</h3>
            <ul>
              <li>Clean teacher recap</li>
              <li>Homework and due dates</li>
              <li>Personal student reminders</li>
              <li>Attendance and quiet flags</li>
              <li>Student dashboard updates</li>
            </ul>
            <button className="text-button sample-link" onClick={loadSample}>
              <PlayCircle size={18} />
              Use geometry sample
            </button>
            <button className="primary-button full" onClick={generateDraft}>
              <Wand2 size={18} />
              Generate draft
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Processing({ draft }: { draft: Session | null }) {
  const [step, setStep] = useState(0);
  const steps = [
    "Reading transcript and notes",
    "Finding participation signals",
    "Drafting student follow-ups",
    "Preparing teacher review",
  ];

  useEffect(() => {
    const timers = steps.map((_, index) => window.setTimeout(() => setStep(index), index * 520));
    const finish = window.setTimeout(() => navigate("review"), 2500);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finish);
    };
  }, []);

  return (
    <div className="processing-page">
      <div className="processing-core">
        <span className="processing-orbit">
          <Sparkles size={34} />
        </span>
        <span className="eyebrow">Draft in progress</span>
        <h2>{draft?.title ?? "Preparing draft"}</h2>
        <p>ClassLoop is turning the messy record into a teacher-editable follow-up loop.</p>
        <div className="processing-steps">
          {steps.map((item, index) => (
            <div key={item} className={index <= step ? "processing-step active" : "processing-step"}>
              <CheckCircle2 size={17} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewDraft({
  draft,
  setDraft,
  studentAccountEmails,
}: {
  draft: Session | null;
  setDraft: (session: Session | null) => void;
  studentAccountEmails: string[];
}) {
  const [saveMessage, setSaveMessage] = useState("");

  if (!draft) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No draft yet"
        detail="Import the sample geometry transcript to generate a teacher review page."
        action="Create new session"
        onAction={() => navigate("new-session")}
      />
    );
  }

  const update = (changes: Partial<Session>) => setDraft({ ...draft, ...changes });

  const updateAction = (id: string, changes: Partial<ActionItem>) => {
    update({ actionItems: draft.actionItems.map((item) => (item.id === id ? { ...item, ...changes } : item)) });
  };

  const updateResource = (id: string, changes: Partial<Resource>) => {
    update({ resources: draft.resources.map((resource) => (resource.id === id ? { ...resource, ...changes } : resource)) });
  };

  const updateFollowUp = (studentId: string, changes: Partial<StudentFollowUp>) => {
    update({
      followUps: draft.followUps.map((followUp) =>
        followUp.studentId === studentId ? { ...followUp, ...changes } : followUp,
      ),
    });
  };

  const updateParticipation = (id: string, changes: Partial<ParticipationEvent>) => {
    update({
      participationEvents: draft.participationEvents.map((event) => (event.id === id ? { ...event, ...changes } : event)),
    });
  };

  const updateRoster = (students: Student[]) => setDraft(syncSessionRoster(draft, students));

  const updateAttendance = (studentId: string, status: AttendanceStatus) => {
    update({ attendance: { ...draft.attendance, [studentId]: status } });
  };

  const resolveUnmatchedParticipant = (participant: UnmatchedParticipant, mode: "add" | "link", studentId?: string) => {
    setDraft(resolveParticipant(draft, participant, mode, studentId));
  };

  const saveDraft = () => {
    setDraft({ ...draft });
    setSaveMessage("Draft saved.");
    window.setTimeout(() => setSaveMessage(""), 1800);
  };

  return (
    <div className="page-stack review-page">
      <section className="review-banner">
        <div>
          <span className="eyebrow">Teacher control center</span>
          <h2>Edit the draft before publishing.</h2>
          <p>
            Student dashboards stay private until the teacher approves the recap, assignments, resources, and participation
            labels.
          </p>
        </div>
        <div className="review-actions">
          <button className="ghost-button" onClick={saveDraft}>
            <Save size={17} />
            {saveMessage || "Save draft"}
          </button>
          <button className="primary-button" onClick={() => navigate("publish-preview")}>
            <Send size={17} />
            Preview and publish
          </button>
        </div>
      </section>

      <section className="content-grid two-columns align-start">
        <RosterManager
          students={draft.students}
          attendance={draft.attendance}
          studentAccountEmails={studentAccountEmails}
          sessionTitle={draft.title}
          onStudentsChange={updateRoster}
          onAttendanceChange={updateAttendance}
        />
        <ParticipantResolutionPanel
          participants={draft.unmatchedParticipants ?? []}
          students={draft.students}
          onResolve={resolveUnmatchedParticipant}
        />
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="Class recap" icon={FileText}>
          <label className="field compact">
            <span>Approved recap</span>
            <textarea value={draft.recap} onChange={(event) => update({ recap: event.target.value })} />
          </label>
          <div className="question-list">
            {draft.essentialQuestions.map((question, index) => (
              <label key={question} className="field compact">
                <span>Essential question {index + 1}</span>
                <input
                  value={question}
                  onChange={(event) => {
                    const next = [...draft.essentialQuestions];
                    next[index] = event.target.value;
                    update({ essentialQuestions: next });
                  }}
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel title="Action items" icon={ListChecks}>
          <div className="editable-stack">
            {draft.actionItems.map((item) => (
              <div key={item.id} className="editable-item">
                <input value={item.title} onChange={(event) => updateAction(item.id, { title: event.target.value })} />
                <textarea
                  value={item.description}
                  onChange={(event) => updateAction(item.id, { description: event.target.value })}
                />
                <div className="inline-fields">
                  <input
                    type="date"
                    value={item.dueDate}
                    onChange={(event) => updateAction(item.id, { dueDate: event.target.value })}
                  />
                  <select
                    value={item.status}
                    onChange={(event) => updateAction(item.id, { status: event.target.value as TaskStatus })}
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="complete">Complete</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <small>{item.source}</small>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Student-specific follow-ups" icon={Users}>
        <div className="followup-grid">
          {draft.followUps.map((followUp) => {
            const student = studentById(followUp.studentId, draft.students);
            return (
              <article key={followUp.studentId} className="followup-card">
                <div className="student-line">
                  <Avatar student={student} />
                  <div>
                    <strong>{student.name}</strong>
                    <small>{attendanceLabel(draft.attendance[student.id] ?? "present")}</small>
                  </div>
                  <StatusPill status={followUp.status} />
                </div>
                <label className="field compact">
                  <span>Personal reminder</span>
                  <textarea
                    value={followUp.reminder}
                    onChange={(event) => updateFollowUp(followUp.studentId, { reminder: event.target.value })}
                  />
                </label>
                <label className="field compact">
                  <span>Catch-up note</span>
                  <textarea
                    value={followUp.catchUp}
                    onChange={(event) => updateFollowUp(followUp.studentId, { catchUp: event.target.value })}
                  />
                </label>
                <div className="inline-fields">
                  <input
                    type="date"
                    value={followUp.dueDate}
                    onChange={(event) => updateFollowUp(followUp.studentId, { dueDate: event.target.value })}
                  />
                  <select
                    value={followUp.status}
                    onChange={(event) => updateFollowUp(followUp.studentId, { status: event.target.value as TaskStatus })}
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="complete">Complete</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>

      <section className="content-grid two-columns align-start">
        <Panel title="Resources" icon={LinkIcon}>
          <div className="editable-stack">
            {draft.resources.map((resource) => (
              <div key={resource.id} className="editable-item">
                <input
                  value={resource.title}
                  onChange={(event) => updateResource(resource.id, { title: event.target.value })}
                />
                <input value={resource.url} onChange={(event) => updateResource(resource.id, { url: event.target.value })} />
                <input
                  value={resource.relatedTopic}
                  onChange={(event) => updateResource(resource.id, { relatedTopic: event.target.value })}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Participation signals" icon={SlidersHorizontal}>
          <div className="signal-list">
            {draft.participationEvents.map((event) => (
              <div key={event.id} className="signal-row">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={event.approved}
                    onChange={(inputEvent) => updateParticipation(event.id, { approved: inputEvent.target.checked })}
                  />
                  <span />
                </label>
                <div>
                  <strong>
                    {studentById(event.studentId, draft.students).name} · {participationLabel(event.type)}
                  </strong>
                  <input value={event.text} onChange={(inputEvent) => updateParticipation(event.id, { text: inputEvent.target.value })} />
                  <small>{Math.round(event.confidence * 100)}% confidence</small>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function RosterManager({
  students,
  attendance,
  studentAccountEmails,
  sessionTitle,
  onStudentsChange,
  onAttendanceChange,
}: {
  students: Student[];
  attendance: Record<string, AttendanceStatus>;
  studentAccountEmails: string[];
  sessionTitle: string;
  onStudentsChange: (students: Student[]) => void;
  onAttendanceChange: (studentId: string, status: AttendanceStatus) => void;
}) {
  const updateStudent = (studentId: string, changes: Partial<Student>) => {
    onStudentsChange(students.map((student) => (student.id === studentId ? { ...student, ...changes } : student)));
  };
  const addStudent = () => onStudentsChange([...students, makeRosterStudent("", "", students.length)]);
  const removeStudent = (studentId: string) => onStudentsChange(students.filter((student) => student.id !== studentId));
  const linkAccount = (student: Student) => {
    updateStudent(student.id, { linkedAccountEmail: normalizeEmail(student.email) });
  };
  const sendInvite = (student: Student) => {
    const email = normalizeEmail(student.email);
    if (!email) return;
    const subject = encodeURIComponent(`ClassLoop follow-up for ${sessionTitle}`);
    const body = encodeURIComponent(
      `Hi ${student.name},\n\nYour teacher prepared a ClassLoop follow-up for ${sessionTitle}.\n\nYou can create or sign in to your ClassLoop student account with this email address to see your recap, resources, and tasks.\n\nThanks!`,
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    updateStudent(student.id, { inviteSentAt: new Date().toISOString() });
  };

  return (
    <Panel title="Roster manager" icon={Users}>
      <div className="roster-manager">
        {students.map((student, index) => (
          <article key={student.id} className="roster-row">
            <Avatar student={student} />
            <label className="field compact roster-name-field">
              <span>Name</span>
              <input value={student.name} onChange={(event) => updateStudent(student.id, { name: event.target.value })} />
            </label>
            <label className="field compact roster-email-field">
              <span>Email</span>
              <input value={student.email} onChange={(event) => updateStudent(student.id, { email: event.target.value })} />
            </label>
            <label className="field compact roster-attendance-field">
              <span>Attendance</span>
              <select
                value={attendance[student.id] ?? "present"}
                onChange={(event) => onAttendanceChange(student.id, event.target.value as AttendanceStatus)}
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </label>
            <label className="field compact roster-aliases-field">
              <span>Zoom names</span>
              <input
                value={(student.aliases ?? []).join(", ")}
                onChange={(event) =>
                  updateStudent(student.id, {
                    aliases: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder={index === 0 ? "Maya C, Maya iPad" : "Optional aliases"}
              />
            </label>
            <div className="student-access-cell">
              <span>Student access</span>
              <small>
                {student.linkedAccountEmail
                  ? `Linked to ${student.linkedAccountEmail}`
                  : studentAccountEmails.includes(normalizeEmail(student.email))
                    ? "Matching account found"
                    : student.inviteSentAt
                      ? "Email invite prepared"
                      : "No account linked"}
              </small>
              <div>
                <button className="text-button" type="button" onClick={() => linkAccount(student)} disabled={!student.email}>
                  <Link2 size={16} />
                  Link
                </button>
                <button className="text-button" type="button" onClick={() => sendInvite(student)} disabled={!student.email}>
                  <Mail size={16} />
                  Email
                </button>
              </div>
            </div>
            <button className="icon-button danger roster-remove-button" type="button" onClick={() => removeStudent(student.id)} aria-label={`Remove ${student.name}`}>
              <Trash2 size={17} />
            </button>
          </article>
        ))}
        <button className="ghost-button full" type="button" onClick={addStudent}>
          <UserPlus size={17} />
          Add student
        </button>
      </div>
    </Panel>
  );
}

function ParticipantResolutionPanel({
  participants,
  students,
  onResolve,
}: {
  participants: UnmatchedParticipant[];
  students: Student[];
  onResolve: (participant: UnmatchedParticipant, mode: "add" | "link", studentId?: string) => void;
}) {
  const [selectedLinks, setSelectedLinks] = useState<Record<string, string>>({});

  if (!participants.length) {
    return (
      <Panel title="Transcript speaker matching" icon={Link2}>
        <div className="inline-empty compact-empty">
          <span>
            <CheckCircle2 size={20} />
          </span>
          <div>
            <strong>All transcript speakers match the roster</strong>
            <p>When a Zoom display name does not match a student, ClassLoop will pause here before using it.</p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Resolve transcript speakers" icon={Link2}>
      <div className="participant-stack">
        {participants.map((participant) => {
          const selectedStudentId =
            selectedLinks[participant.name] ?? participant.suggestedStudentId ?? students[0]?.id ?? "";
          return (
            <article key={participant.name} className="participant-card">
              <div>
                <span className="eyebrow">Zoom name found</span>
                <h4>{participant.name}</h4>
                <p>
                  Add this exact display name as a new student, or link it to an existing roster student for future sessions.
                </p>
                {participant.lines[0] && <small>{participant.lines[0]}</small>}
              </div>
              <div className="participant-actions">
                <button className="ghost-button" type="button" onClick={() => onResolve(participant, "add")}>
                  <UserPlus size={17} />
                  Add to roster
                </button>
                <div className="link-student-control">
                  <select
                    value={selectedStudentId}
                    onChange={(event) =>
                      setSelectedLinks((current) => ({ ...current, [participant.name]: event.target.value }))
                    }
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => onResolve(participant, "link", selectedStudentId)}
                    disabled={!selectedStudentId}
                  >
                    <Link2 size={17} />
                    Link name
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

function PublishPreview({
  draft,
  selectedStudentId,
  setSelectedStudentId,
  setDraft,
  publishDraft,
}: {
  draft: Session | null;
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  setDraft: (session: Session | null) => void;
  publishDraft: () => void;
}) {
  if (!draft) {
    return (
      <EmptyState
        icon={Eye}
        title="No draft to preview"
        detail="Generate a draft first, then preview exactly what students will receive."
        action="Back to review"
        onAction={() => navigate("review")}
      />
    );
  }

  const activeStudentId = draft.students.some((student) => student.id === selectedStudentId)
    ? selectedStudentId
    : draft.students[0]?.id ?? selectedStudentId;
  const student = studentById(activeStudentId, draft.students);
  const followUp = draft.followUps.find((item) => item.studentId === activeStudentId);
  const personalEvents = draft.participationEvents.filter((event) => event.studentId === activeStudentId && event.approved);
  const updatePreviewSession = (sessionId: string, updater: (session: Session) => Session) => {
    if (sessionId === draft.id) setDraft(updater(draft));
  };

  return (
    <div className="page-stack publish-preview-page">
      <section className="review-banner">
        <div>
          <span className="eyebrow">Publish preview</span>
          <h2>Review the student view before anything goes live.</h2>
          <p>
            Pick a student, scan the recap, tasks, resources, and check-in state, then publish when the student-facing
            version looks right.
          </p>
        </div>
        <div className="review-actions">
          <button className="ghost-button" onClick={() => navigate("review")}>
            <ChevronRight size={17} />
            Back to edit
          </button>
          <button className="primary-button" onClick={publishDraft}>
            <Send size={17} />
            Publish to students
          </button>
        </div>
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="Choose student preview" icon={GraduationCap}>
          <div className="student-picker preview-picker">
            {draft.students.map((item) => (
              <button
                key={item.id}
                className={item.id === activeStudentId ? "student-picker-item active" : "student-picker-item"}
                onClick={() => setSelectedStudentId(item.id)}
              >
                <Avatar student={item} />
                <span>{item.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </Panel>
        <StudentVisibleEditor session={draft} studentId={activeStudentId} updateSession={updatePreviewSession} />
      </section>

      <section className="student-preview-frame" aria-label={`Preview for ${student.name}`}>
        <div className="student-preview-top">
          <div>
            <span className="eyebrow">Student portal preview</span>
            <h3>{student.name}'s dashboard</h3>
            <p>{student.email}</p>
          </div>
          <StatusPill status={followUp?.status ?? "todo"} />
        </div>
        {followUp && (
          <div className="student-preview-card">
            <span className="eyebrow">Latest class</span>
            <h4>{draft.title}</h4>
            <p>{followUp.catchUp}</p>
            <div className="tag-row">
              <span>Due {formatDate(followUp.dueDate)}</span>
              <span>{followUp.tasks.length} tasks</span>
              <span>{draft.resources.length} resources</span>
            </div>
          </div>
        )}
        <div className="student-preview-columns">
          <div>
            <strong>Class-wide recap</strong>
            <p>{draft.recap}</p>
          </div>
          <div>
            <strong>Personal next steps</strong>
            {followUp?.reminder && <p>{followUp.reminder}</p>}
            <ul>
              {(followUp?.tasks ?? []).map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong>Why this is assigned</strong>
            {personalEvents.length ? (
              <ul>
                {personalEvents.slice(0, 3).map((event) => (
                  <li key={event.id}>{event.text}</li>
                ))}
              </ul>
            ) : (
              <p>This student receives the shared recap and any class-wide work for the session.</p>
            )}
          </div>
          <div>
            <strong>Resources</strong>
            <ul>
              {draft.resources.map((resource) => (
                <li key={resource.id}>{resource.title}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function SessionReport({
  sessions,
  fallback,
  editSession,
}: {
  sessions: Session[];
  fallback?: Session;
  editSession: (session: Session) => void;
}) {
  const sessionId = getParam("session");
  const session = sessions.find((item) => item.id === sessionId) ?? fallback;

  if (!session) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="No sessions yet"
        detail="Create a session to see the teacher report."
        action="Create new session"
        onAction={() => navigate("new-session")}
      />
    );
  }

  const activeSignals = session.participationEvents.filter((event) => event.approved);
  const absent = Object.entries(session.attendance).filter(([, status]) => status === "absent");
  const quiet = activeSignals.filter((event) => event.type === "quiet");

  return (
    <div className="page-stack">
      <section className="report-hero">
        <div>
          <span className="eyebrow">{formatDate(session.date)}</span>
          <h2>{session.title}</h2>
          <p>{session.recap}</p>
        </div>
        <div className="report-actions">
          <button className="ghost-button" onClick={() => editSession(session)}>
            <Settings2 size={17} />
            Edit draft
          </button>
          <button className="primary-button" onClick={() => navigate("student")}>
            <GraduationCap size={17} />
            View student dashboard
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          icon={UserRoundCheck}
          label="Present"
          value={`${session.students.length - absent.length}/${session.students.length}`}
          detail="Roster attendance"
          accent="green"
        />
        <MetricCard
          icon={MessageSquare}
          label="Signals"
          value={activeSignals.length.toString()}
          detail="Approved participation events"
          accent="blue"
        />
        <MetricCard icon={UserX} label="Absent" value={absent.length.toString()} detail="Catch-up assigned" accent="amber" />
        <MetricCard icon={Mic2} label="Quiet flags" value={quiet.length.toString()} detail="Private support" accent="rose" />
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="Essential questions" icon={BookOpen}>
          <div className="question-chips">
            {session.essentialQuestions.map((question) => (
              <span key={question}>{question}</span>
            ))}
          </div>
        </Panel>

        <Panel title="Resources" icon={LinkIcon}>
          <div className="resource-list">
            {session.resources.map((resource) => (
              <a key={resource.id} className="resource-row" href={resource.url} target="_blank" rel="noreferrer">
                <span>
                  <BookOpen size={17} />
                </span>
                <div>
                  <strong>{resource.title}</strong>
                  <small>{resource.relatedTopic}</small>
                </div>
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Follow-through tracker" icon={Target}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Attendance</th>
                <th>Follow-up</th>
                <th>Due</th>
                <th>Status</th>
                <th>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {session.followUps.map((followUp) => {
                const student = studentById(followUp.studentId, session.students);
                return (
                  <tr key={followUp.studentId}>
                    <td>
                      <span className="table-student">
                        <Avatar student={student} />
                        {student.name}
                      </span>
                    </td>
                    <td>{attendanceLabel(session.attendance[student.id] ?? "present")}</td>
                    <td>{followUp.reminder}</td>
                    <td>{formatDate(followUp.dueDate)}</td>
                    <td>
                      <StatusPill status={followUp.status} />
                    </td>
                    <td>
                      <ProgressBar value={followUp.score} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function StudentDashboard({
  sessions,
  selectedStudentId,
  setSelectedStudentId,
  markFollowUpComplete,
  auth,
  updateSession,
}: {
  sessions: Session[];
  selectedStudentId: string;
  setSelectedStudentId: (id: string) => void;
  markFollowUpComplete: (sessionId: string, studentId: string) => void;
  auth: AuthSession;
  updateSession?: (sessionId: string, updater: (session: Session) => Session) => void;
}) {
  const published = sessions.filter((session) => session.status === "published");
  const visibleSessions =
    auth.role === "student"
      ? published.filter((session) => session.students.some((student) => normalizeEmail(student.email) === auth.email))
      : published;

  if (!visibleSessions.length) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No student dashboard yet"
        detail={
          auth.role === "teacher"
            ? "Publish a session first, then ClassLoop will create personalized student recaps and check-ins."
            : "Your teacher has not published any sessions for this account yet."
        }
        action={auth.role === "teacher" ? "Create a session" : undefined}
        onAction={auth.role === "teacher" ? () => navigate("new-session") : undefined}
      />
    );
  }

  const latest = visibleSessions[0];
  const roster = latest.students;

  if (!roster.length) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No student roster yet"
        detail="Add a roster when creating the session to publish personalized student dashboards."
        action="Create a session"
        onAction={() => navigate("new-session")}
      />
    );
  }

  const matchedStudent =
    auth.role === "student" ? roster.find((item) => normalizeEmail(item.email) === auth.email) : undefined;
  const activeStudentId = matchedStudent?.id ?? (roster.some((student) => student.id === selectedStudentId) ? selectedStudentId : roster[0].id);
  const student = studentById(activeStudentId, roster);
  const latestFollowUp = latest?.followUps.find((followUp) => followUp.studentId === activeStudentId);
  const studentTasks = visibleSessions.flatMap((session) =>
    session.followUps
      .filter((followUp) => followUp.studentId === activeStudentId)
      .map((followUp) => ({ session, followUp })),
  );

  return (
    <div className="page-stack student-page">
      <section className="student-hero">
        <div>
          <span className="eyebrow">{auth.role === "teacher" ? "Student preview" : "My dashboard"}</span>
          <h2>{student.name}'s follow-up dashboard</h2>
          <p>
            Personalized recaps, resources, and completion check-ins stay calm and simple for students.
          </p>
        </div>
        {auth.role === "teacher" ? (
          <div className="student-picker">
            {roster.map((item) => (
              <button
                key={item.id}
                className={item.id === activeStudentId ? "student-picker-item active" : "student-picker-item"}
                onClick={() => setSelectedStudentId(item.id)}
              >
                <Avatar student={item} />
                <span>{item.name.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="student-identity">
            <Avatar student={student} />
            <span>{student.email}</span>
          </div>
        )}
      </section>

      {latest && latestFollowUp && (
        <section className="today-card">
          <div>
            <span className="eyebrow">Latest class</span>
            <h3>{latest.title}</h3>
            <p>{latestFollowUp.catchUp}</p>
            <div className="tag-row">
              <StatusPill status={latestFollowUp.status} />
              <span>{formatDate(latest.date)}</span>
              <span>Due {formatDate(latestFollowUp.dueDate)}</span>
            </div>
          </div>
          <div className="today-actions">
            <button className="ghost-button" onClick={() => navigate("student-session", { session: latest.id })}>
              <BookOpen size={17} />
              Open detail
            </button>
            <button className="primary-button" onClick={() => markFollowUpComplete(latest.id, activeStudentId)}>
              <CheckCircle2 size={17} />
              Mark complete
            </button>
          </div>
        </section>
      )}

      {auth.role === "teacher" && latest && latestFollowUp && updateSession && (
        <StudentVisibleEditor session={latest} studentId={activeStudentId} updateSession={updateSession} compact />
      )}

      <section className="content-grid two-columns align-start">
        <Panel title="My tasks" icon={ListChecks}>
          <div className="task-list">
            {studentTasks.map(({ session, followUp }) => (
              <button
                key={`${session.id}-${followUp.studentId}`}
                className="task-row"
                onClick={() => navigate("student-session", { session: session.id })}
              >
                <span className="task-check">
                  {followUp.status === "complete" ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}
                </span>
                <span>
                  <strong>{followUp.tasks[0]}</strong>
                  <small>
                    {session.title} · due {formatDate(followUp.dueDate)}
                  </small>
                </span>
                <StatusPill status={followUp.status} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Resources for me" icon={BookOpen}>
          <div className="resource-list">
            {(latest?.resources ?? []).map((resource) => (
              <a key={resource.id} className="resource-row" href={resource.url} target="_blank" rel="noreferrer">
                <span>
                  <BookOpen size={17} />
                </span>
                <div>
                  <strong>{resource.title}</strong>
                  <small>{resource.relatedTopic}</small>
                </div>
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StudentSessionDetail({
  sessions,
  selectedStudentId,
  markFollowUpComplete,
  auth,
  updateSession,
}: {
  sessions: Session[];
  selectedStudentId: string;
  markFollowUpComplete: (sessionId: string, studentId: string) => void;
  auth: AuthSession;
  updateSession?: (sessionId: string, updater: (session: Session) => Session) => void;
}) {
  const sessionId = getParam("session");
  const session = sessions.find((item) => item.id === sessionId) ?? sessions[0];
  const roster = session?.students ?? [];
  const emailMatchedStudent =
    auth.role === "student" ? roster.find((student) => normalizeEmail(student.email) === auth.email) : undefined;
  const activeStudentId = emailMatchedStudent?.id ?? (roster.some((student) => student.id === selectedStudentId)
    ? selectedStudentId
    : roster[0]?.id ?? selectedStudentId);
  const student = studentById(activeStudentId, roster);
  const followUp = session?.followUps.find((item) => item.studentId === activeStudentId);
  const events = session?.participationEvents.filter((event) => event.studentId === activeStudentId && event.approved) ?? [];

  if (!session || !followUp) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No student detail found"
        detail="Open the student dashboard to choose a current session."
        action="Student dashboard"
        onAction={() => navigate("student")}
      />
    );
  }

  return (
    <div className="page-stack student-detail">
      <section className="student-session-header">
        <div>
          <button className="back-button" onClick={() => navigate("student")}>
            <ChevronRight size={16} />
            Back to student dashboard
          </button>
          <span className="eyebrow">{student.name}</span>
          <h2>{session.title}</h2>
          <p>{followUp.catchUp}</p>
        </div>
        <button className="primary-button" onClick={() => markFollowUpComplete(session.id, activeStudentId)}>
          <CheckCircle2 size={17} />
          Complete check-in
        </button>
      </section>

      {auth.role === "teacher" && updateSession && (
        <StudentVisibleEditor session={session} studentId={activeStudentId} updateSession={updateSession} />
      )}

      <section className="content-grid two-columns align-start">
        <Panel title="What happened" icon={FileText}>
          <p className="readable">{session.recap}</p>
          <div className="question-chips">
            {session.essentialQuestions.map((question) => (
              <span key={question}>{question}</span>
            ))}
          </div>
        </Panel>
        <Panel title="My next steps" icon={ListChecks}>
          <div className="checklist">
            {followUp.tasks.map((task) => (
              <div key={task} className="checklist-row">
                <CheckCircle2 size={18} />
                <span>{task}</span>
              </div>
            ))}
          </div>
          <div className="student-note">
            <strong>Reminder</strong>
            <p>{followUp.reminder}</p>
          </div>
        </Panel>
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="My participation" icon={MessageSquare}>
          {events.length ? (
            <div className="signal-list">
              {events.map((event) => (
                <div key={event.id} className="student-signal">
                  <strong>{participationLabel(event.type)}</strong>
                  <span>{event.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="readable">No public participation notes for this session.</p>
          )}
        </Panel>
        <Panel title="Resources" icon={BookOpen}>
          <div className="resource-list">
            {session.resources.map((resource) => (
              <a key={resource.id} className="resource-row" href={resource.url} target="_blank" rel="noreferrer">
                <span>
                  <BookOpen size={17} />
                </span>
                <div>
                  <strong>{resource.title}</strong>
                  <small>{resource.relatedTopic}</small>
                </div>
                <ArrowUpRight size={16} />
              </a>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function StudentVisibleEditor({
  session,
  studentId,
  updateSession,
  compact = false,
}: {
  session: Session;
  studentId: string;
  updateSession: (sessionId: string, updater: (session: Session) => Session) => void;
  compact?: boolean;
}) {
  const followUp = session.followUps.find((item) => item.studentId === studentId);
  const student = studentById(studentId, session.students);

  if (!followUp) return null;

  const updateCurrentSession = (updater: (session: Session) => Session) => updateSession(session.id, updater);
  const updateFollowUp = (changes: Partial<StudentFollowUp>) => {
    updateCurrentSession((current) => patchFollowUp(current, studentId, changes));
  };
  const updateTask = (index: number, value: string) => {
    const tasks = [...followUp.tasks];
    tasks[index] = value;
    updateFollowUp({ tasks: tasks.filter((task) => task.trim()) });
  };
  const addTask = () => updateFollowUp({ tasks: [...followUp.tasks, "New follow-up task"] });
  const removeTask = (index: number) => updateFollowUp({ tasks: followUp.tasks.filter((_, taskIndex) => taskIndex !== index) });
  const updateResource = (resourceId: string, changes: Partial<Resource>) => {
    updateCurrentSession((current) => ({
      ...current,
      resources: current.resources.map((resource) => (resource.id === resourceId ? { ...resource, ...changes } : resource)),
    }));
  };
  const addResource = () => {
    updateCurrentSession((current) => ({
      ...current,
      resources: [
        ...current.resources,
        {
          id: `res-${Date.now().toString(36)}`,
          title: "New resource",
          url: "https://",
          type: "link",
          relatedTopic: current.title,
        },
      ],
    }));
  };
  const removeResource = (resourceId: string) => {
    updateCurrentSession((current) => ({
      ...current,
      resources: current.resources.filter((resource) => resource.id !== resourceId),
    }));
  };

  return (
    <Panel title={`Edit ${student.name}'s student view`} icon={Settings2}>
      <div className={compact ? "student-visible-editor compact-editor" : "student-visible-editor"}>
        <label className="field compact">
          <span>Student-facing recap</span>
          <textarea
            value={session.recap}
            onChange={(event) => updateCurrentSession((current) => ({ ...current, recap: event.target.value }))}
          />
        </label>
        <label className="field compact">
          <span>Catch-up note</span>
          <textarea value={followUp.catchUp} onChange={(event) => updateFollowUp({ catchUp: event.target.value })} />
        </label>
        <label className="field compact">
          <span>Personal reminder</span>
          <textarea value={followUp.reminder} onChange={(event) => updateFollowUp({ reminder: event.target.value })} />
        </label>
        <div className="inline-fields">
          <label className="field compact">
            <span>Due date</span>
            <input type="date" value={followUp.dueDate} onChange={(event) => updateFollowUp({ dueDate: event.target.value })} />
          </label>
          <label className="field compact">
            <span>Status</span>
            <select value={followUp.status} onChange={(event) => updateFollowUp({ status: event.target.value as TaskStatus })}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="complete">Complete</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
        </div>
        <div className="editable-subsection">
          <div className="subsection-header">
            <strong>Tasks</strong>
            <button className="text-button" type="button" onClick={addTask}>
              <PlusCircle size={16} />
              Add task
            </button>
          </div>
          {followUp.tasks.map((task, index) => (
            <div key={`${task}-${index}`} className="editable-line">
              <input value={task} onChange={(event) => updateTask(index, event.target.value)} />
              <button className="icon-button danger" type="button" onClick={() => removeTask(index)} aria-label="Remove task">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {!compact && (
          <div className="editable-subsection">
            <div className="subsection-header">
              <strong>Resources</strong>
              <button className="text-button" type="button" onClick={addResource}>
                <PlusCircle size={16} />
                Add resource
              </button>
            </div>
            {session.resources.map((resource) => (
              <div key={resource.id} className="resource-edit-row">
                <input value={resource.title} onChange={(event) => updateResource(resource.id, { title: event.target.value })} />
                <input value={resource.url} onChange={(event) => updateResource(resource.id, { url: event.target.value })} />
                <input
                  value={resource.relatedTopic}
                  onChange={(event) => updateResource(resource.id, { relatedTopic: event.target.value })}
                />
                <button
                  className="icon-button danger"
                  type="button"
                  onClick={() => removeResource(resource.id)}
                  aria-label={`Remove ${resource.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function TeacherAnalytics({ sessions }: { sessions: Session[] }) {
  const published = sessions.filter((session) => session.status === "published");

  if (!published.length) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No analytics yet"
        detail="Participation, completion, and follow-through reports appear after the first session is published."
        action="Create a session"
        onAction={() => navigate("new-session")}
      />
    );
  }

  const latest = published[0];
  const totalFollowUps = published.flatMap((session) => session.followUps);
  const completed = totalFollowUps.filter((followUp) => followUp.status === "complete").length;
  const overdue = totalFollowUps.filter((followUp) => followUp.status === "overdue").length;
  const roster = Array.from(new Map(published.flatMap((session) => session.students).map((student) => [student.id, student])).values());
  const participationTotals = roster.map((student) => {
    const events = published.flatMap((session) =>
      session.participationEvents.filter(
        (event) => event.studentId === student.id && event.approved && !["quiet", "absent"].includes(event.type),
      ),
    );
    const quiet = published.flatMap((session) =>
      session.participationEvents.filter((event) => event.studentId === student.id && event.approved && event.type === "quiet"),
    );
    const absent = published.filter((session) => session.attendance[student.id] === "absent");
    const followUps = totalFollowUps.filter((followUp) => followUp.studentId === student.id);
    const avgScore = followUps.length
      ? Math.round(followUps.reduce((sum, followUp) => sum + followUp.score, 0) / followUps.length)
      : 0;
    return { student, eventCount: events.length, quiet: quiet.length, absent: absent.length, avgScore };
  });

  return (
    <div className="page-stack">
      <section className="analytics-header">
        <div>
          <span className="eyebrow">Participation and follow-through</span>
          <h2>See who spoke, who needs support, and who completed the loop.</h2>
          <p>
            These analytics are private to the teacher and focused on support, not public ranking.
          </p>
        </div>
        <button className="ghost-button" onClick={() => navigate("new-session")}>
          <RefreshCw size={17} />
          Process another session
        </button>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Target} label="Completion" value={`${completionRate(published)}%`} detail={`${completed} finished`} accent="green" />
        <MetricCard
          icon={MessageSquare}
          label="Latest participation"
          value={latest ? `${classParticipationRate(latest)}%` : "0%"}
          detail="Present students with signals"
          accent="blue"
        />
        <MetricCard icon={Clock3} label="Overdue" value={overdue.toString()} detail="Needs follow-up" accent="amber" />
        <MetricCard icon={Users} label="Tracked learners" value={roster.length.toString()} detail="Current roster" accent="rose" />
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="Participation distribution" icon={BarChart3}>
          <div className="analytics-bars">
            {participationTotals.map(({ student, eventCount, quiet, absent }) => (
              <div key={student.id} className="analytics-bar-row">
                <span>{student.name.split(" ")[0]}</span>
                <div>
                  <i style={{ width: `${Math.max(eventCount * 22, 6)}%` }} />
                </div>
                <small>{eventCount} signals</small>
                {(quiet > 0 || absent > 0) && (
                  <em>
                    {quiet > 0 ? "Quiet" : ""}
                    {quiet > 0 && absent > 0 ? " · " : ""}
                    {absent > 0 ? "Absent" : ""}
                  </em>
                )}
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Follow-through readiness" icon={LineChart}>
          <div className="readiness-list">
            {participationTotals.map(({ student, avgScore }) => (
              <div key={student.id} className="readiness-row">
                <span className="table-student">
                  <Avatar student={student} />
                  {student.name}
                </span>
                <ProgressBar value={avgScore} />
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Teacher action queue" icon={Search}>
        <div className="action-queue">
          {participationTotals
            .filter((row) => row.quiet || row.absent || row.avgScore < 70)
            .map((row) => (
              <AttentionItem
                key={row.student.id}
                icon={row.absent ? UserX : row.quiet ? Mic2 : AlertTriangle}
                title={`${row.student.name} may need a teacher touchpoint`}
                detail={
                  row.absent
                    ? "Missed a recent session and has assigned catch-up."
                    : row.quiet
                      ? "Quiet participation pattern detected."
                      : "Follow-through readiness is below the class target."
                }
              />
            ))}
        </div>
      </Panel>
    </div>
  );
}

function TutorialPage({ auth }: { auth: AuthSession }) {
  const isTeacher = auth.role === "teacher";
  const homeRoute: RouteKey = isTeacher ? "dashboard" : "student";
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const teacherSteps = [
    {
      title: "Create a session",
      eyebrow: "Start the loop",
      detail: "Choose a template, paste a transcript or notes, add your roster, and include any links students should use.",
      checklist: ["Open New session", "Pick the closest template", "Add transcript, notes, roster, and resources"],
      action: "Create a session",
      route: "new-session" as RouteKey,
      icon: PlusCircle,
    },
    {
      title: "Resolve speaker names",
      eyebrow: "Match participation",
      detail: "If a Zoom display name is not on the roster, add it as a student or link it to the right student account.",
      checklist: ["Review unknown Zoom names", "Add real new students", "Link nicknames or device names to existing students"],
      action: "Open draft review",
      route: "review" as RouteKey,
      icon: Link2,
    },
    {
      title: "Review before publishing",
      eyebrow: "Teacher control",
      detail: "Edit the recap, action items, resources, attendance, participation labels, due dates, and each student preview.",
      checklist: ["Fix the class recap", "Check due dates and resources", "Edit student-specific follow-ups"],
      action: "Review draft",
      route: "review" as RouteKey,
      icon: ClipboardCheck,
    },
    {
      title: "Publish the follow-up",
      eyebrow: "Student-ready view",
      detail: "Students only see the approved version. They get their own recap, tasks, resources, and completion check-in.",
      checklist: ["Open publish preview", "Switch between students", "Publish once each preview looks right"],
      action: "Preview publishing",
      route: "publish-preview" as RouteKey,
      icon: Send,
    },
    {
      title: "Track follow-through",
      eyebrow: "Close the loop",
      detail: "Use analytics to see completion, quiet or absent students, and private support opportunities.",
      checklist: ["Check completion", "Look for quiet or absent students", "Plan the next support touchpoint"],
      action: "Open analytics",
      route: "analytics" as RouteKey,
      icon: BarChart3,
    },
  ];
  const studentSteps = [
    {
      title: "Open your portal",
      eyebrow: "Your class hub",
      detail: "Sign in with the email your teacher used on the roster or the invite sent to you.",
      checklist: ["Use your roster email", "Open My portal", "Choose the latest class"],
      action: "Open my portal",
      route: "student" as RouteKey,
      icon: GraduationCap,
    },
    {
      title: "Read the latest recap",
      eyebrow: "Catch the context",
      detail: "Start with what happened in class, then review the resources your teacher approved.",
      checklist: ["Read the class recap", "Open the resources", "Check anything marked for catch-up"],
      action: "View portal",
      route: "student" as RouteKey,
      icon: BookOpen,
    },
    {
      title: "Complete your tasks",
      eyebrow: "Do the work",
      detail: "Your task list includes class-wide work plus any follow-up connected to your questions or catch-up needs.",
      checklist: ["Review due dates", "Finish assigned work", "Use resources before marking complete"],
      action: "View tasks",
      route: "student" as RouteKey,
      icon: ListChecks,
    },
    {
      title: "Check in",
      eyebrow: "Close your loop",
      detail: "Mark work complete when you finish so your teacher can see that the loop is closed.",
      checklist: ["Mark complete", "Revisit anything unfinished", "Ask for help if a task is unclear"],
      action: "Open my portal",
      route: "student" as RouteKey,
      icon: CheckCircle2,
    },
  ];
  const walkthroughSteps = isTeacher ? teacherSteps : studentSteps;
  const activeStep = walkthroughSteps[activeStepIndex] ?? walkthroughSteps[0];
  const ActiveIcon = activeStep.icon;
  const isFirstStep = activeStepIndex === 0;
  const isLastStep = activeStepIndex === walkthroughSteps.length - 1;
  const progress = Math.round(((activeStepIndex + 1) / walkthroughSteps.length) * 100);
  const skipWalkthrough = () => navigate(homeRoute);
  const useCases = isTeacher
    ? [
        ["Daily classes", "Turn class notes and transcripts into next-step dashboards."],
        ["Tutoring", "Send each learner a clean recap and targeted practice after a session."],
        ["Clubs", "Track decisions, owners, quiet members, and follow-up tasks."],
        ["Study groups", "Convert peer questions into shared resources and personal reminders."],
      ]
    : [
        ["Missed class", "Catch up from the approved recap without searching through chat logs."],
        ["Homework", "See what is due, why it matters, and when to finish it."],
        ["Questions", "Review explanations connected to what you asked in class."],
        ["Resources", "Keep links and practice materials in one place."],
      ];

  return (
    <div className="page-stack tutorial-page">
      <section className="walkthrough-hero">
        <div>
          <span className="eyebrow">Interactive walkthrough</span>
          <h2>{isTeacher ? "Learn the class follow-up loop one step at a time." : "Learn how to use your student portal."}</h2>
          <p>
            {isTeacher
              ? "Move through the workflow in order, or skip whenever you are ready to return to the dashboard."
              : "Move through the portal basics, or skip whenever you want to return home."}
          </p>
        </div>
        <button className="ghost-button large" onClick={skipWalkthrough}>
          <ChevronRight size={18} />
          Skip tutorial
        </button>
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title={`Step ${activeStepIndex + 1} of ${walkthroughSteps.length}`} icon={ActiveIcon}>
          <div className="walkthrough-card">
            <div className="walkthrough-progress-header">
              <span>{activeStep.eyebrow}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="walkthrough-progress-bar" aria-label={`Tutorial progress ${progress}%`}>
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="walkthrough-step-main">
              <span className="walkthrough-icon">
                <ActiveIcon size={24} />
              </span>
              <div>
                <h3>{activeStep.title}</h3>
                <p>{activeStep.detail}</p>
              </div>
            </div>
            <ul className="walkthrough-checklist">
              {activeStep.checklist.map((item) => (
                <li key={item}>
                  <CheckCircle2 size={17} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="walkthrough-controls">
              <button
                className="ghost-button"
                type="button"
                onClick={() => setActiveStepIndex((index) => Math.max(0, index - 1))}
                disabled={isFirstStep}
              >
                Back
              </button>
              <button className="text-button" type="button" onClick={() => navigate(activeStep.route)}>
                {activeStep.action}
                <ChevronRight size={16} />
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={() => (isLastStep ? skipWalkthrough() : setActiveStepIndex((index) => Math.min(walkthroughSteps.length - 1, index + 1)))}
              >
                {isLastStep ? "Finish" : "Next"}
                <ChevronRight size={16} />
              </button>
            </div>
            <button className="text-button walkthrough-skip" type="button" onClick={skipWalkthrough}>
              Skip and return home
            </button>
          </div>
        </Panel>

        <Panel title={isTeacher ? "Workflow map" : "Portal map"} icon={ListChecks}>
          <div className="walkthrough-map">
            {walkthroughSteps.map((step, index) => (
              <button
                key={step.title}
                className={index === activeStepIndex ? "walkthrough-map-item active" : "walkthrough-map-item"}
                type="button"
                onClick={() => setActiveStepIndex(index)}
              >
                <span>{index + 1}</span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.eyebrow}</small>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="Common uses" icon={BookOpen}>
          <div className="usage-grid">
            {useCases.map(([title, detail]) => (
              <article key={title} className="usage-card">
                <strong>{title}</strong>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </Panel>
        {isTeacher && (
          <Panel title="What to prepare for each session" icon={ClipboardCheck}>
            <div className="session-prep-grid">
              <div>
                <strong>Required</strong>
                <p>Session title, template, roster names, and either a transcript or teacher notes.</p>
              </div>
              <div>
                <strong>Helpful</strong>
                <p>Homework details, due date, resource links, student absences, and any participation notes.</p>
              </div>
              <div>
                <strong>Before publishing</strong>
                <p>Check speaker matches, review each student preview, and confirm the publish button sends the right follow-up.</p>
              </div>
            </div>
          </Panel>
        )}
      </section>
    </div>
  );
}

function DesignSystemPage({
  theme,
  setTheme,
}: {
  theme: ThemeSettings;
  setTheme: React.Dispatch<React.SetStateAction<ThemeSettings>>;
}) {
  const selectedPreset = themePresets[theme.key];
  const choosePreset = (key: ThemeKey) => {
    const preset = themePresets[key];
    setTheme((current) => ({ ...current, key, accent: preset.accent }));
  };

  return (
    <div className="page-stack appearance-page">
      <section className="appearance-hero">
        <div>
          <span className="eyebrow">Experience settings</span>
          <h2>Customize ClassLoop around your classroom.</h2>
          <p>
            Choose a calmer workspace, tune the accent color, or use an image backdrop so the product feels comfortable
            for your teaching style while staying easy to scan during a busy school day.
          </p>
        </div>
        <div className={`live-theme-preview ${themePresets[theme.key].previewClass}`}>
          <span className="preview-glow" />
          <div className="preview-nav" />
          <div className="preview-card large">
            <strong>{selectedPreset.name}</strong>
            <span />
            <span />
          </div>
          <div className="preview-card row">
            <i />
            <i />
            <i />
          </div>
        </div>
      </section>

      <section className="content-grid two-columns align-start">
        <Panel title="Screen style presets" icon={Palette}>
          <div className="theme-option-grid">
            {(Object.keys(themePresets) as ThemeKey[]).map((key) => {
              const preset = themePresets[key];
              return (
                <button
                  key={key}
                  className={theme.key === key ? "theme-option selected" : "theme-option"}
                  onClick={() => choosePreset(key)}
                >
                  <span className={`theme-swatch ${preset.previewClass}`}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>{preset.name}</strong>
                  <small>{preset.summary}</small>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="Color and imagery" icon={SlidersHorizontal}>
          <div className="accent-grid" aria-label="Accent colors">
            {accentOptions.map((accent) => (
              <button
                key={accent}
                className={theme.accent === accent ? "accent-swatch selected" : "accent-swatch"}
                style={{ background: accent }}
                onClick={() => setTheme((current) => ({ ...current, accent }))}
                aria-label={`Use accent ${accent}`}
              />
            ))}
          </div>
          <label className="field compact">
            <span>Custom accent</span>
            <input
              type="color"
              value={theme.accent}
              onChange={(event) => setTheme((current) => ({ ...current, accent: event.target.value }))}
            />
          </label>
          <label className="field compact">
            <span>Image backdrop URL</span>
            <input
              value={theme.imageUrl}
              onChange={(event) => setTheme((current) => ({ ...current, imageUrl: event.target.value }))}
              placeholder="Paste an image URL for a custom background"
            />
          </label>
          <div className="appearance-actions">
            <button className="ghost-button" onClick={() => setTheme(defaultTheme)}>
              Reset
            </button>
            {theme.imageUrl && (
              <button className="text-button" onClick={() => setTheme((current) => ({ ...current, imageUrl: "" }))}>
                Remove image
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
  action,
  onAction,
}: {
  icon: typeof Sparkles;
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="empty-state">
      <span>
        <Icon size={30} />
      </span>
      <h2>{title}</h2>
      <p>{detail}</p>
      {action && onAction && (
        <button className="primary-button" onClick={onAction}>
          {action}
        </button>
      )}
    </section>
  );
}

function InlineEmpty({
  icon: Icon,
  title,
  detail,
  action,
  onAction,
}: {
  icon: typeof Sparkles;
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="inline-empty">
      <span>
        <Icon size={20} />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action && onAction && (
        <button className="text-button" onClick={onAction}>
          {action}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}

function Avatar({ student }: { student: Student }) {
  return (
    <span className="avatar" style={{ background: student.avatarColor }}>
      {student.name
        .split(" ")
        .map((part) => part[0])
        .join("")}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-bar" aria-label={`${value}%`}>
      <span style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      <small>{value}%</small>
    </div>
  );
}

export default App;
