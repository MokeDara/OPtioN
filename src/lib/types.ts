export type Year = 1 | 2;
export type Semester = "S1" | "S2" | "A"; // A = annual

/** admin = School of Engineering team (portal); director/assistant = programme staff; student. */
export type Role = "student" | "director" | "assistant" | "admin";
export const STAFF_ROLES: Role[] = ["director", "assistant"];

export interface User {
  id: string;
  username: string; // student number, e.g. pg55000
  password: string; // demo only — real auth comes with Supabase
  name: string; // full name
  email: string;
  role: Role;
  photo?: string; // URL or resized data URL
  // Profile
  programmeId?: string; // students: their Master's. Directors/assistants: the Master's they direct/assist
  /** Staff: other Master's they may open (granted in the portal). They pick one after signing in. */
  programmeIds?: string[];
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

/** A programme (e.g. MEGSI) run by a department of the School of Engineering. */
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
  ects: number; // total ECTS students take in this slot
  choose?: number; // how many courses students pick in this slot (default 1)
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

/** A message sent with the floating support button to the School of Engineering team. */
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

export interface DB {
  version: number; // bump when the demo data shape changes
  school: string; // "School of Engineering"
  schoolContact?: string; // address, phone, email of the School
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
}

export type RoundState = "upcoming" | "open" | "closed";
