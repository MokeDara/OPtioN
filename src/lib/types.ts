export type Year = 1 | 2;
export type Semester = "S1" | "S2" | "A"; // A = annual

/** admin = DSI team (portal); director/assistant = programme staff; student. */
export type Role = "student" | "director" | "assistant" | "professor" | "admin";
/** Programme staff. Professors come in through an access request and see their courses and the calendar. */
export const STAFF_ROLES: Role[] = ["director", "assistant", "professor"];

export interface User {
  id: string;
  username: string; // student number, e.g. pg55000
  password: string; // never stored: set only when the DSI portal creates or resets a login (sent to Supabase Auth)
  name: string; // full name
  email: string;
  role: Role;
  photo?: string; // URL or resized data URL
  // Profile
  programmeId?: string; // students and programme staff; unset for the DSI team
  year?: Year; // students: current year of the master's
  title?: string; // directors: e.g. "Associate Professor"
  bio?: string; // one-liner
  about?: string; // longer "about me"
  aspiration?: string; // what they want to become
  bachelor?: { degree: string; institution?: string; graduated?: string };
  dob?: string; // YYYY-MM-DD, optional
  /** Options taken in earlier years (Year 2 students' Opção 1 and 2): groupId → courseId */
  pastOptions?: Record<string, string>;
  /** Staff who also teach: the professor record they appear as on courses. */
  professorId?: string;
  createdAt?: string;
  active?: boolean; // staff accounts can be disabled from the portal (undefined = active)
  invitedAt?: string; // when the portal sent the credentials
}

/** A professor of the department. Not a login — the people who teach the courses. */
export interface Professor {
  id: string;
  name: string;
  title: string; // e.g. "Associate Professor"
  email: string;
  area?: string;
  office?: string;
  photo?: string;
  bio?: string;
}

export type EventKind = "deadline" | "exam" | "event" | "class";

export interface CalendarEvent {
  id: string;
  programmeId: string;
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, for multi-day events
  time?: string; // HH:MM
  title: string;
  description?: string;
  kind: EventKind;
  audience: 0 | Year; // 0 = everyone
  location?: string;
  createdBy: string;
}

export interface Announcement {
  id: string;
  programmeId: string;
  title: string;
  body: string;
  audience: 0 | Year;
  pinned?: boolean;
  createdAt: string;
  authorId: string;
}

/** A programme (e.g. MEGSI) run by a department of the Department of Information Systems. */
export interface Programme {
  id: string;
  department: string; // e.g. "Department of Information Systems"
  name: string;
  short: string;
  degree: string;
  ects: number;
  duration: string;
  regime: string;
  createdAt?: string;
  // Official information, shown to students on their profile
  academicYear?: string; // e.g. "2026/2027"
  location?: string;
  scientificArea?: string;
  contacts?: ProgrammeContact[];
  description?: string;
  learningOutcomes?: string[];
  higherEducation?: string; // "Access to higher education"
  careers?: string[];
}

export interface ProgrammeContact {
  role: string; // "Course Director", "Academic Mobility Coordinator"
  name: string;
  email?: string;
  phone?: string;
}

export interface Round {
  id: string;
  programmeId: string;
  year: Year;
  /** S1 or S2: the round covers only that semester's Opção slots. Unset = every slot of the year (incl. annual). */
  semester?: "S1" | "S2";
  label: string;
  opensAt: string; // ISO
  closesAt: string; // ISO
  emailSentAt?: string;
}

/** An "Opção" slot in the study plan: the student picks `ects` worth of courses from it. */
export interface OptionGroup {
  id: string;
  programmeId: string;
  year: Year;
  semester: Semester;
  name: string; // e.g. "Opção 1"
  ects: number;
}

export interface CourseDetails {
  teachingType?: string;
  language?: string;
  classHours?: number;
  classType?: string;
  autonomousHours?: number;
  objectives?: string;
  outcomes?: string[];
  program?: { title: string; text: string }[];
  bibliography?: string[];
  teachingMethods?: string;
  assessment?: string;
}

export interface Course {
  id: string;
  programmeId: string;
  code: string;
  name: string;
  year: Year;
  semester: Semester;
  area: string; // scientific area code: TSI, G, TInt, D
  ects: number;
  groupId?: string; // set → optional course inside that Opção; unset → mandatory
  capacity: number; // seats (optional courses only)
  requiresApproval: boolean;
  courseDirector?: string; // who decides on seat requests (shown on the request form)
  professorId?: string; // the professor who teaches it — receives the student list
  requestPrompt?: string; // what to write when requesting a seat
  description: string;
  image?: string; // URL or resized data URL
  details: CourseDetails;
}

export type SelectionStatus = "enrolled" | "pending" | "rejected";

export interface Selection {
  id: string;
  studentId: string;
  courseId: string;
  status: SelectionStatus;
  motivation?: string;
  note?: string; // director's note on decision
  createdAt: string;
  decidedAt?: string;
}

export interface Email {
  id: string;
  to: string[]; // user ids (shown in their OPtioN! inbox)
  toAddresses?: string[]; // external recipients, e.g. a professor or a newly invited director
  subject: string;
  body: string;
  sentAt: string;
  kind?: "invite" | "list" | "announcement" | "system" | "support";
}

export type TicketStatus = "open" | "in_progress" | "resolved";
export type TicketTopic = "access" | "selection" | "technical" | "courses" | "other";

/** A message sent with the floating support button to the DSI team. */
export interface SupportTicket {
  id: string;
  userId?: string; // set when signed in
  name: string;
  email: string;
  role?: Role;
  programmeId?: string;
  topic: TicketTopic;
  subject: string;
  page?: string; // where they were when they wrote
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: { from: "user" | "team"; authorName: string; body: string; at: string }[];
}

export type AccessRequestStatus = "pending" | "approved" | "declined";

/** A professor asking for access from the staff sign-in page. The portal approves it and the login is emailed. */
export interface AccessRequest {
  id: string;
  name: string;
  email: string; // institutional (…uminho.pt)
  programmeId: string; // the Master's they teach in
  courseIds: string[]; // curricular units they teach (optional)
  status: AccessRequestStatus;
  createdAt: string;
  decidedAt?: string;
  userId?: string; // the account created on approval
}

export interface DB {
  version: number;
  school: string; // "Department of Information Systems"
  schoolContact?: string; // address, phone, email of the department
  programmes: Programme[];
  /** The programme this view is about (set by scope()); for unscoped data, the first programme. */
  programme: Programme;
  users: User[];
  rounds: Round[];
  groups: OptionGroup[];
  courses: Course[];
  selections: Selection[];
  emails: Email[];
  professors: Professor[];
  events: CalendarEvent[];
  announcements: Announcement[];
  tickets: SupportTicket[];
  accessRequests?: AccessRequest[];
  /** Seats held by choices this person can't see (other students), from the database's seat counts. */
  hiddenSeats?: Record<string, { enrolled: number; pending: number }>;
}

export type RoundState = "upcoming" | "open" | "closed";
