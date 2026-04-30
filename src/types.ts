export type AttendanceStatus = "present" | "absent" | "late";

export type SessionStatus = "draft" | "published";

export type SessionType =
  | "Math review"
  | "CS workshop"
  | "General classroom"
  | "Club meeting"
  | "Study group";

export type ParticipationType =
  | "asked_question"
  | "answered_question"
  | "chat"
  | "quiet"
  | "absent";

export type TaskStatus = "todo" | "in_progress" | "complete" | "overdue";

export type Student = {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  guardian?: string;
};

export type Resource = {
  id: string;
  title: string;
  url: string;
  type: "video" | "worksheet" | "link" | "slides";
  relatedTopic: string;
};

export type ActionItem = {
  id: string;
  title: string;
  description: string;
  ownerId?: string;
  dueDate: string;
  status: TaskStatus;
  source: string;
};

export type ParticipationEvent = {
  id: string;
  studentId: string;
  type: ParticipationType;
  text: string;
  confidence: number;
  approved: boolean;
};

export type StudentFollowUp = {
  studentId: string;
  reminder: string;
  catchUp: string;
  tasks: string[];
  dueDate: string;
  status: TaskStatus;
  score: number;
};

export type Session = {
  id: string;
  ownerEmail?: string;
  isDemo?: boolean;
  title: string;
  type: SessionType;
  date: string;
  status: SessionStatus;
  students: Student[];
  transcript: string;
  notes: string;
  recap: string;
  essentialQuestions: string[];
  attendance: Record<string, AttendanceStatus>;
  resources: Resource[];
  actionItems: ActionItem[];
  participationEvents: ParticipationEvent[];
  followUps: StudentFollowUp[];
};
