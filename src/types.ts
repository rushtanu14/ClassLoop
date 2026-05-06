export type AttendanceStatus = "present" | "absent" | "late";

export type SessionStatus = "draft" | "published";

export type SessionCaptureMode = "transcript" | "audio" | "live_call";

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
  aliases?: string[];
  linkedAccountEmail?: string;
  inviteSentAt?: string;
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

export type SessionCapture = {
  mode: SessionCaptureMode;
  sourceLabel: string;
  capturedAt: string;
  durationSeconds?: number;
  transcriptSource: "file" | "paste" | "live_transcription" | "audio_recording";
};

export type SessionEmailDelivery = {
  status: "not_sent" | "sent";
  sentAt?: string;
  provider?: string;
  recipients: string[];
  skipped: string[];
  failed?: string[];
  lastError?: string;
};

export type DeliveryLog = {
  id: string;
  provider: "email" | "google_classroom" | "lms";
  target: string;
  status: "sent" | "posted" | "failed" | "skipped";
  message: string;
  createdAt: string;
  recipientCount?: number;
};

export type SessionIntegrations = {
  googleClassroomConnected?: boolean;
  googleClassroomCourseId?: string;
  googleClassroomCourseName?: string;
  googleClassroomPostedAt?: string;
  lmsConnected?: boolean;
  lmsName?: string;
  lmsUrl?: string;
  lmsCourseId?: string;
  lmsCourseName?: string;
  lmsPostedAt?: string;
};

export type UnmatchedParticipant = {
  name: string;
  lines: string[];
  suggestedStudentId?: string;
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
  capture?: SessionCapture;
  recap: string;
  essentialQuestions: string[];
  attendance: Record<string, AttendanceStatus>;
  resources: Resource[];
  actionItems: ActionItem[];
  participationEvents: ParticipationEvent[];
  followUps: StudentFollowUp[];
  unmatchedParticipants?: UnmatchedParticipant[];
  transcriptAliases?: Record<string, string>;
  emailDelivery?: SessionEmailDelivery;
  deliveryLogs?: DeliveryLog[];
  integrations?: SessionIntegrations;
};
