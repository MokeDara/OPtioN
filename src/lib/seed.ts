// Demo data based on the MEGSI study plan (2026/2027).
// Dates are built relative to "now" so the Year 2 round is open the first time you run it.
// Course codes other than Corporate Strategy are placeholders — replace them with the official ones.
import type { Announcement, CalendarEvent, Course, CourseDetails, DB, OptionGroup, Professor, Programme, Selection, Semester, SupportTicket, User, Year } from "./types";

const P = "megsi";

const DAY = 86_400_000;

export const AREAS: Record<string, string> = {
  TSI: "Information Systems and Technologies",
  G: "Management",
  D: "Law",
  TInt: "TInt",
};

const FIRST = ["Ana", "Bruno", "Carla", "Diogo", "Eva", "Filipe", "Gabriela", "Hugo", "Inês", "João", "Kai", "Lara", "Miguel", "Nadia", "Omar", "Paula", "Rui", "Sofia", "Tiago", "Vera", "Wei", "Yara", "Amara", "Chidi", "Priya", "Lucas", "Marta", "Noah", "Olga", "Tomás"];
const LAST = ["Silva", "Costa", "Okafor", "Pereira", "Santos", "Mendes", "Ferreira", "Adeyemi", "Rocha", "Lopes", "Nunes", "Chen", "Ribeiro", "Martins", "Kowalski"];

const u = (id: string, w = 900) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Photo for each course (Unsplash, free to use). Directors can replace them in the course editor. */
const COURSE_IMAGES: Record<string, string> = {
  "Corporate Strategy": "1557804506-669a67965ba0",
  "Information Presentation and Visualization": "1551288049-bebda4e38f71",
  "Information Systems Analysis and Design": "1552664730-d307ca884978",
  "Information Technologies Infrastructures": "1558494949-ef010cbdcc31",
  "Machine Learning for Enterprise Systems": "1620712943543-bcc4688e7485",
  "Design of Organizational Processes": "1519389950473-47ba0277781c",
  "Digital Innovation": "1563986768609-322da13575f3",
  "Digital Twins": "1581091226825-a6a2a5aee158",
  "Information Systems Security Management": "1550751827-4bd374c3f58b",
  "Initiation to Research in Information Systems and Technologies": "1434030216411-0b793f4b4173",
  "Intelligent Business Processes": "1485827404703-89b55fcc595e",
  "Law and Information": "1454165804606-c3d57bc86b40",
  "Open Innovation Using Information Technologies": "1600880292203-757bb62b4baf",
  "Organizational and Process Innovation": "1521737604893-d14cc237f11d",
  "Semantic Web": "1488590528505-98d2b5aba04b",
  "Systems and Organizations Dynamic Modeling": "1543286386-713bdd548da4",
  "Testing and Validation of Information Systems": "1542831371-29b0f74f9713",
  "Virtual and Augmented Reality": "1592478411213-6153e4ebc07d",
  "Architectures for Distributed Information Systems": "1544197150-b99a580bb7a8",
  "Engineering and Innovation of Services": "1556761175-5973dc0f32e7",
  "Information Systems Security Engineering": "1526374965328-7f61d4dc18c5",
  "Management of Information Systems": "1531482615713-2afd69097998",
  "Predictive and Prescriptive Business Analytics": "1460925895917-afdab827c52f",
  "Automatic Software Modeling and Generation": "1515879218367-8466d910aaa4",
  "Decision Support Systems": "1516321318423-f06f85e504b3",
  "Development of Analytical Information Systems": "1593642632559-0c6d3fc62b89",
  "Digital Games": "1612287230202-1ff1d85d1bdf",
  "Digital Transformation": "1480694313141-fce5e697ee25",
  "Information Systems and Technologies in Government": "1504384308090-c894fdcc538d",
  "Information Systems Auditing": "1501504905252-473c47e087f8",
  "Leadership and Change Management": "1529156069898-49953e39b3ac",
  "Management of Knowledge, Learning and Organizational Intelligence": "1503676260728-1c00da094a0b",
  "Omnichannel Marketing": "1556155092-490a1ba16284",
  "Urban Informatics": "1451187580459-43490279c0fa",
  Dissertation: "1513258496099-48168024aec0",
  "Project Work": "1522202176988-66273c2fd55f",
  "Project Management in Information Systems and Technologies": "1497032628192-86f99bcd76bc",
  "Research and Development in Information Systems and Technologies": "1573164713988-8665fc963095",
  "Trends and Impacts of Information Systems and Technologies": "1677442136019-21780ecad995",
};

/** Extra photos for the home-page carousel. */
export const HERO_PHOTOS = {
  graduation: u("1541339907198-e08756dedf3f", 700),
  lecture: u("1524178232363-1fb2b075b655", 700),
  studying: u("1434030216411-0b793f4b4173", 700),
};

const PORTRAITS = [
  "1507003211169-0a1dd7228f2d", "1494790108377-be9c29b29330", "1438761681033-6461ffad8d80", "1544005313-94ddf0286df2",
  "1506794778202-cad84cf45f1d", "1534528741775-53994a69daeb", "1539571696357-5a69c17a67c6", "1580489944761-15a19d654956",
  "1517841905240-472988babdf9",
].map((id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=70`);

const BACHELORS = [
  { degree: "Information Systems Engineering and Management", institution: "Universidade do Minho" },
  { degree: "Computer Science", institution: "University of Lagos" },
  { degree: "Informatics Engineering", institution: "Universidade do Porto" },
  { degree: "Business Information Systems", institution: "Universidade de Aveiro" },
  { degree: "Software Engineering", institution: "Instituto Politécnico de Bragança" },
];
const ASPIRATIONS = ["Data & BI consultant", "IT project manager", "Information security officer", "Product manager", "PhD researcher in IS", "Enterprise architect", "Start-up founder"];
const BIOS = ["Curious about how data changes decisions.", "Ex-developer moving into management.", "Loves games, UX and clean dashboards.", "Working part-time in an IT consultancy.", "Into security, CTFs and coffee."];

const STANDARD_5: CourseDetails = { teachingType: "Presential", classHours: 30, classType: "Theory Practice", autonomousHours: 110 };

const groups: OptionGroup[] = [
  { id: "g1", programmeId: P, year: 1, semester: "S1", name: "Opção 1", ects: 5 },
  { id: "g2", programmeId: P, year: 1, semester: "S2", name: "Opção 2", ects: 5 },
  { id: "g3", programmeId: P, year: 2, semester: "A", name: "Opção 3", ects: 45 },
];

let n = 0;
function c(
  year: Year,
  semester: Semester,
  name: string,
  area: string,
  description: string,
  extra: Partial<Course> = {},
): Course {
  n++;
  return {
    id: `c${n}`,
    programmeId: P,
    code: `${extra.groupId ? "OP" : "UC"}${year}${String(n).padStart(2, "0")}`,
    name,
    year,
    semester,
    area,
    ects: 5,
    capacity: extra.groupId ? 10 : 0,
    requiresApproval: false,
    description,
    image: COURSE_IMAGES[name] ? u(COURSE_IMAGES[name]) : undefined,
    details: { ...STANDARD_5 },
    ...extra,
  };
}

const corporateStrategy: CourseDetails = {
  ...STANDARD_5,
  objectives:
    "Each learning outcome corresponds to one or several chapters of the syllabus.\n- The student is able to develop an up-to-date and integrated view of the firm's strategic management system and context in all chapters of the program but more strongly in chapter 1.\n- The identification of competitiveness as a core concept in strategy is achieved in chapter 2.\n- The identification of the firm's position in its context is presented in chapters 3 and 4.\n- The identification of firm' strategies to develop competitive advantage is presented in chapter 5.\n- The comprehension of the firm as a system of relationships is achieved in chapter 6.\n- The explanation of the innovation processes and strategic change is carried out in chapter 7.",
  outcomes: [
    "To acquire an up-to-date and integrated view of the firm's strategic management system and context",
    "To identify competitiveness as a core concept in strategy",
    "To identify the firm's position in its context",
    "To identify strategies to develop competitive advantage",
    "To understand the firm as a system of relationships",
    "To explain innovation processes and strategic change",
  ],
  program: [
    { title: "Strategy", text: "The concept of strategy, its different meanings, and its utility and role in the firm." },
    { title: "Strategy and competitiveness", text: "Competitiveness as the basis of strategy and distinguishes related concepts such as performance and competition." },
    { title: "Strategy and context", text: "The context of strategy including the macro-environment, industry, and strategic groups." },
    { title: "Resources, activities and competencies", text: "The firm as a complex set of resources, activities and competencies." },
    { title: "Strategic options and business models", text: "Business strategies, business models, and corporate strategies." },
    { title: "Organizational relationships and networks", text: "The firm as a system of intra and inter-organizational relationships that involve strategic alliances, mergers and acquisitions, and other more complex forms of relationships such as networks." },
    { title: "Innovation and organizational dynamics", text: "Types and strategies of innovation, and explains organizational change from a strategic perspective." },
  ],
  bibliography: [
    "Dess, Gregory D.; McNamara, G.; Eisner, Alan; Lee, Seung-Hyun (2019). Strategic Management: Creating Competitive Advantage, 9/e, McGraw-Hill Higher Education, New York.",
    "Grant, Robert M. (2018). Contemporary Strategy Analysis, 10/e, Wiley, Chichester.",
    "Johnson, Gerry; Whittington, Richard; Scholes, Kevan; Angwin, Duncan; Regnér, Patrick (2017). Exploring Strategy, 11/e, Pearson Education, Harlow.",
    "Paroutis, Sotirios; Heracleous, Loizos; Angwin, Duncan (2016). Practicing Strategy: Text and Cases, 2/e, Sage Publications, London.",
    "Wit, Bob de (2017). Strategy: An International Perspective, 6/e, Cengage Learning, Andover.",
  ],
  teachingMethods:
    "The classes combine theoretical-practical exposition of the syllabus contents with the analysis and practical discussion of projects and/or case studies. Attendance of classes is compulsory under the terms of the academic regulations. Participation, attendance, and punctuality of students are strongly recommended.\nStudents' evaluation can integrate several instruments according to the academic regulations, such as: participation in class, which includes not only attendance but also the active participation in class and the resolution of practical questions/cases (either in group or individually); individual works; group work; projects; essays; and tests.",
  assessment:
    "The instruments and weights are specified each year in the course unit dossier. For instance, there may be two assessment elements as follows: participation, discussion and presentation of case studies (30-50%); and final test (50-70%).",
};

const O1 = { groupId: "g1" };
const O2 = { groupId: "g2" };

const courses: Course[] = [
  // ── Year 1 · S1 mandatory
  c(1, "S1", "Corporate Strategy", "G", "The firm's strategic management system: competitiveness, context, competitive advantage and strategic change.", { code: "14724", details: corporateStrategy }),
  c(1, "S1", "Information Presentation and Visualization", "TSI", "Turning data into clear visual representations that support understanding and decisions."),
  c(1, "S1", "Information Systems Analysis and Design", "TSI", "Methods and models for analysing requirements and designing information systems."),
  c(1, "S1", "Information Technologies Infrastructures", "TSI", "The hardware, network and platform foundations that information systems run on."),
  c(1, "S1", "Machine Learning for Enterprise Systems", "TSI", "Applying machine learning techniques inside enterprise information systems."),
  // ── Year 1 · S1 Opção 1
  c(1, "S1", "Design of Organizational Processes", "TSI", "Modelling and redesigning the processes through which organisations work.", O1),
  c(1, "S1", "Digital Innovation", "TInt", "How digital technologies create new products, services and business models.", O1),
  c(1, "S1", "Digital Twins", "TSI", "Virtual replicas of physical systems and how they are built and used.", { ...O1, capacity: 8 }),
  c(1, "S1", "Information Systems Security Management", "TSI", "Managing information security risk, policy and controls in organisations.", { ...O1, capacity: 12 }),
  c(1, "S1", "Initiation to Research in Information Systems and Technologies", "TSI", "A first hands-on introduction to doing research in IST.", { ...O1, capacity: 6, requiresApproval: true, courseDirector: "Course Director", requestPrompt: "Briefly describe the research area you're interested in." }),
  c(1, "S1", "Intelligent Business Processes", "TSI", "Business processes enhanced with automation and intelligent techniques.", O1),
  c(1, "S1", "Law and Information", "D", "The legal framework around information, data and its use.", O1),
  c(1, "S1", "Open Innovation Using Information Technologies", "TSI", "Using IT to innovate together with partners, users and communities.", O1),
  c(1, "S1", "Organizational and Process Innovation", "TSI", "Introducing and managing innovation in organisations and their processes.", O1),
  c(1, "S1", "Semantic Web", "TSI", "Ontologies, linked data and machine-readable meaning on the web.", O1),
  c(1, "S1", "Systems and Organizations Dynamic Modeling", "TSI", "Simulating how systems and organisations behave over time.", O1),
  c(1, "S1", "Testing and Validation of Information Systems", "TSI", "Techniques to verify and validate information systems.", O1),
  c(1, "S1", "Virtual and Augmented Reality", "TInt", "Designing and building immersive VR and AR experiences.", { ...O1, capacity: 8 }),
  // ── Year 1 · S2 mandatory
  c(1, "S2", "Architectures for Distributed Information Systems", "TSI", "Architectural styles and patterns for distributed information systems."),
  c(1, "S2", "Engineering and Innovation of Services", "TSI", "Designing, engineering and improving services."),
  c(1, "S2", "Information Systems Security Engineering", "TSI", "Building security into information systems from the design stage."),
  c(1, "S2", "Management of Information Systems", "TSI", "Planning, organising and governing the IS function."),
  c(1, "S2", "Predictive and Prescriptive Business Analytics", "TSI", "Forecasting outcomes and recommending decisions from business data."),
  // ── Year 1 · S2 Opção 2
  c(1, "S2", "Automatic Software Modeling and Generation", "TSI", "Model-driven engineering and generating software from models.", O2),
  c(1, "S2", "Decision Support Systems", "TSI", "Systems that help managers make better-informed decisions.", O2),
  c(1, "S2", "Development of Analytical Information Systems", "TSI", "Building data warehouses and analytical systems.", { ...O2, capacity: 12 }),
  c(1, "S2", "Digital Games", "TInt", "Design and development of digital games.", { ...O2, capacity: 8 }),
  c(1, "S2", "Digital Transformation", "TSI", "How organisations transform their operations and models with digital technology.", O2),
  c(1, "S2", "Information Systems and Technologies in Government", "TSI", "IST in public administration and e-government.", O2),
  c(1, "S2", "Information Systems Auditing", "TSI", "Auditing information systems, controls and compliance.", O2),
  c(1, "S2", "Initiation to Research in Information Systems and Technologies", "TSI", "A first hands-on introduction to doing research in IST.", { ...O2, capacity: 6, requiresApproval: true, courseDirector: "Course Director", requestPrompt: "Briefly describe the research area you're interested in." }),
  c(1, "S2", "Leadership and Change Management", "G", "Leading people and managing organisational change.", O2),
  c(1, "S2", "Management of Knowledge, Learning and Organizational Intelligence", "TSI", "How organisations capture, share and learn from knowledge.", O2),
  c(1, "S2", "Omnichannel Marketing", "G", "Marketing across integrated digital and physical channels.", O2),
  c(1, "S2", "Urban Informatics", "TSI", "Data and information systems for cities and urban life.", O2),
  // ── Year 2 · Opção 3 (annual, 45 ECTS) — needs acceptance
  c(2, "A", "Dissertation", "TSI", "An individual research dissertation, supervised by a faculty member.", {
    groupId: "g3", ects: 45, capacity: 30, requiresApproval: true, courseDirector: "Course Director",
    requestPrompt: "Proposed topic and preferred supervisor (if you have one).", details: { teachingType: "Presential" },
  }),
  c(2, "A", "Project Work", "TSI", "An applied project, usually developed with a partner organisation.", {
    groupId: "g3", ects: 45, capacity: 12, requiresApproval: true, courseDirector: "Course Director",
    requestPrompt: "Project idea, partner organisation (if any) and preferred supervisor.", details: { teachingType: "Presential" },
  }),
  // ── Year 2 · S1 mandatory
  c(2, "S1", "Project Management in Information Systems and Technologies", "TSI", "Planning, running and controlling IST projects."),
  c(2, "S1", "Research and Development in Information Systems and Technologies", "TSI", "Research methods and R&D practice in IST, preparing the dissertation or project."),
  c(2, "S1", "Trends and Impacts of Information Systems and Technologies", "TSI", "Emerging IST trends and their impact on organisations and society."),
];

// Demo professors (fictional). Replace with the department's real staff in the portal.
const face = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=70`;
const PROFESSORS: Professor[] = [
  { id: "p1", name: "Helena Duarte", title: "Prof.", email: "hduarte@dept.option.demo", area: "Information Systems", office: "Building 1, 2.14", photo: face("1580489944761-15a19d654956"), bio: "Information systems analysis, process modelling." },
  { id: "p2", name: "Marco Teixeira", title: "Prof.", email: "mteixeira@dept.option.demo", area: "Management", office: "Building 1, 1.08", photo: face("1507003211169-0a1dd7228f2d"), bio: "Strategy and IT governance." },
  { id: "p3", name: "Rita Alves", title: "Prof.", email: "ralves@dept.option.demo", area: "Interactive Technologies", office: "Building 2, 0.21", photo: face("1438761681033-6461ffad8d80"), bio: "HCI, games and immersive media." },
  { id: "p4", name: "Samuel Neves", title: "Prof.", email: "sneves@dept.option.demo", area: "Research Methods", office: "Building 1, 2.02", photo: face("1506794778202-cad84cf45f1d"), bio: "Research methods in IS; dissertation coordination." },
  { id: "p5", name: "Joana Lima", title: "Prof.", email: "jlima@dept.option.demo", area: "Data & AI", office: "Building 2, 1.11", photo: face("1534528741775-53994a69daeb"), bio: "Machine learning and analytics for organisations." },
  { id: "p6", name: "André Sousa", title: "Prof.", email: "asousa@dept.option.demo", area: "Infrastructures", office: "Building 2, 1.03", bio: "Distributed systems and cloud architecture." },
  { id: "p7", name: "Beatriz Gomes", title: "Prof.", email: "bgomes@dept.option.demo", area: "Security", office: "Building 1, 1.17", photo: face("1544005313-94ddf0286df2"), bio: "Information security management and engineering." },
  { id: "p8", name: "Tiago Fonseca", title: "Prof.", email: "tfonseca@dept.option.demo", area: "Software Engineering", office: "Building 2, 2.06", bio: "Model-driven engineering and testing." },
  { id: "p9", name: "Carolina Matos", title: "Prof.", email: "cmatos@dept.option.demo", area: "Law", office: "Law School, 3.02", bio: "Information law and data protection." },
  { id: "p10", name: "Paulo Rebelo", title: "Prof.", email: "prebelo@dept.option.demo", area: "Innovation", office: "Building 1, 0.09", bio: "Digital innovation and transformation." },
];

const PROF_BY_COURSE: Record<string, string> = {
  "Corporate Strategy": "p2", "Information Presentation and Visualization": "p3", "Information Systems Analysis and Design": "p1",
  "Information Technologies Infrastructures": "p6", "Machine Learning for Enterprise Systems": "p5", "Design of Organizational Processes": "p1",
  "Digital Innovation": "p10", "Digital Twins": "p6", "Information Systems Security Management": "p7",
  "Initiation to Research in Information Systems and Technologies": "p4", "Intelligent Business Processes": "p1", "Law and Information": "p9",
  "Open Innovation Using Information Technologies": "p10", "Organizational and Process Innovation": "p10", "Semantic Web": "p5",
  "Systems and Organizations Dynamic Modeling": "p1", "Testing and Validation of Information Systems": "p8", "Virtual and Augmented Reality": "p3",
  "Architectures for Distributed Information Systems": "p6", "Engineering and Innovation of Services": "p10", "Information Systems Security Engineering": "p7",
  "Management of Information Systems": "p2", "Predictive and Prescriptive Business Analytics": "p5", "Automatic Software Modeling and Generation": "p8",
  "Decision Support Systems": "p5", "Development of Analytical Information Systems": "p5", "Digital Games": "p3", "Digital Transformation": "p10",
  "Information Systems and Technologies in Government": "p2", "Information Systems Auditing": "p7", "Leadership and Change Management": "p2",
  "Management of Knowledge, Learning and Organizational Intelligence": "p1", "Omnichannel Marketing": "p2", "Urban Informatics": "p6",
  Dissertation: "p4", "Project Work": "p4", "Project Management in Information Systems and Technologies": "p8",
  "Research and Development in Information Systems and Technologies": "p4", "Trends and Impacts of Information Systems and Technologies": "p5",
};
for (const c of courses) c.professorId = PROF_BY_COURSE[c.name];

export function createSeed(now = new Date()): DB {
  const t = now.getTime();
  const at = (offsetDays: number) => new Date(t + offsetDays * DAY).toISOString();
  const users: User[] = [
    { id: "u_admin", username: "admin", password: "option", name: "Engineering Management Team", email: "support@eng.option.demo", role: "admin", title: "School of Engineering" },
    { id: "u_tech", username: "tech", password: "option", name: "Rui Barbosa", email: "rbarbosa@eng.option.demo", role: "admin", title: "Technical support, School of Engineering", photo: face("1500648767791-00dcc994a43e") },
    {
      id: "u_assistant", username: "assistant", password: "option", name: "Programme Assistant", email: "assistant@option.demo", role: "assistant", programmeId: P,
      title: "Programme assistant", bio: "Helps with schedules, lists and student questions.", invitedAt: at(-60),
    },
    {
      id: "u_director", username: "director", password: "option", name: "Course Director", email: "director@option.demo", role: "director", programmeId: P,
      title: "Programme Director, MEGSI", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=70",
      bio: "Reviews Dissertation and Project Work requests.", about: "Contact me here for anything about option selection — no need to email.", invitedAt: at(-90),
    },
    {
      id: "u_demo", username: "pg50001", password: "option", name: "Moke (demo)", email: "pg50001@option.demo", role: "student", year: 2, programmeId: P,
      bio: "Building things at the edge of IT and business.", aspiration: "Digital product manager",
      about: "Second-year MEGSI student. I like turning messy processes into simple tools.",
      bachelor: { degree: "Computer Science", institution: "—", graduated: "2023" },
      createdAt: at(-400),
    },
    {
      id: "u_demo1", username: "pg50101", password: "option", name: "Ana Ferreira", email: "pg50101@option.demo", role: "student", year: 1, programmeId: P,
      photo: PORTRAITS[3], bio: "First-year, data-curious.", aspiration: "BI analyst",
      about: "Just started the master's after a degree in management.", bachelor: { degree: "Business Information Systems", institution: "Universidade de Aveiro", graduated: "2026" },
      createdAt: at(-40),
    },
  ];
  // 19 more Year 2 students and 19 more Year 1 students
  for (let i = 0; i < 38; i++) {
    const year: Year = i < 19 ? 2 : 1;
    const num = year === 2 ? 50002 + i : 50102 + (i - 19);
    users.push({
      id: `u_${num}`, username: `pg${num}`, password: "option", role: "student", year, programmeId: P,
      name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`, email: `pg${num}@option.demo`,
      photo: i % 4 === 0 ? PORTRAITS[(i / 4) % PORTRAITS.length] : undefined,
      bio: BIOS[i % BIOS.length], aspiration: ASPIRATIONS[i % ASPIRATIONS.length],
      bachelor: BACHELORS[i % BACHELORS.length], createdAt: at(year === 2 ? -400 : -40),
    });
  }
  const y2 = users.filter((u) => u.role === "student" && u.year === 2);
  const y1 = users.filter((u) => u.role === "student" && u.year === 1);
  const selections: Selection[] = [];
  const taken = (id: string) => selections.filter((s) => s.courseId === id && s.status === "enrolled").length;
  const byName = (name: string, groupId: string) => courses.find((x) => x.name === name && x.groupId === groupId)!;

  // Year 2 students completed Opção 1 and 2 last year (history, doesn't use this year's seats).
  y2.forEach((s, i) => {
    const o1 = courses.filter((x) => x.groupId === "g1" && !x.requiresApproval);
    const o2 = courses.filter((x) => x.groupId === "g2" && !x.requiresApproval);
    s.pastOptions = { g1: o1[(i * 3) % o1.length].id, g2: o2[(i * 5) % o2.length].id };
  });
  users.find((u) => u.id === "u_demo")!.pastOptions = { g1: byName("Digital Twins", "g1").id, g2: byName("Digital Games", "g2").id };

  // Year 1 round (closed): every Year 1 student chose Opção 1 and Opção 2.
  for (const gid of ["g1", "g2"]) {
    const opts = courses.filter((x) => x.groupId === gid && !x.requiresApproval);
    y1.forEach((s, i) => {
      const course = [...opts.slice((i * 2) % opts.length), ...opts].find((x) => taken(x.id) < x.capacity)!;
      selections.push({ id: `s_${gid}_${s.id}`, studentId: s.id, courseId: course.id, status: "enrolled", createdAt: at(-20), decidedAt: at(-20) });
    });
  }

  // Year 2 round (open): some already accepted, some waiting. The demo student hasn't chosen yet.
  const diss = byName("Dissertation", "g3");
  const proj = byName("Project Work", "g3");
  const motivations = [
    "Process mining in hospital information systems — hoping to work with the BI research group.",
    "Explainable ML for credit decisions. No supervisor yet.",
    "Digital twin of a textile production line with a company in Guimarães.",
    "Data governance maturity model for SMEs.",
    "Chatbot for student academic advising.",
    "ERP migration project at my current employer.",
  ];
  y2.filter((s) => s.id !== "u_demo").slice(0, 15).forEach((s, i) => {
    const pending = i >= 10;
    selections.push({
      id: `s_y2_${i}`, studentId: s.id, courseId: i % 2 === 0 ? diss.id : proj.id,
      status: pending ? "pending" : "enrolled", motivation: motivations[i % motivations.length],
      createdAt: at(pending ? -0.4 : -1), decidedAt: pending ? undefined : at(-0.6),
    });
  });

  const day = (offset: number) => {
    const d = new Date(t + offset * DAY);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const events: CalendarEvent[] = [
    { id: "e1", programmeId: P, date: day(3), time: "14:00", title: "Dissertation & Project Work info session", description: "How to pick a topic and a supervisor, and what the director looks for in a request.", kind: "event", audience: 2, location: "Auditorium B", createdBy: "u_director" },
    { id: "e2", programmeId: P, date: day(9), time: "10:00", title: "Supervisor fair", description: "Meet professors offering dissertation topics.", kind: "event", audience: 2, location: "Main hall", createdBy: "u_assistant" },
    { id: "e3", programmeId: P, date: day(20), title: "Project proposals due", kind: "deadline", audience: 2, createdBy: "u_director" },
    { id: "e4", programmeId: P, date: day(6), time: "09:00", title: "Corporate Strategy — mid-term test", kind: "exam", audience: 1, location: "Room 1.12", createdBy: "u_assistant" },
    { id: "e5", programmeId: P, date: day(16), endDate: day(18), title: "Week of research seminars", kind: "event", audience: 0, createdBy: "u_director" },
  ];
  const announcements: Announcement[] = [
    { id: "a1", programmeId: P, title: "Year 2 option selection is open", body: "Request Dissertation or Project Work by the deadline. Include your proposed topic and, if you have one, your preferred supervisor. Pending requests don't hold a seat.", audience: 2, pinned: true, createdAt: at(-1), authorId: "u_director" },
    { id: "a2", programmeId: P, title: "Room change for Corporate Strategy", body: "From next week, classes move to room 1.12.", audience: 1, createdAt: at(-3), authorId: "u_assistant" },
  ];

  const megsi: Programme = {
    id: P,
    department: "Department of Information Systems",
    name: "Engineering and Management of Information Systems",
    short: "MEGSI",
    degree: "Master's degree",
    ects: 120,
    duration: "4 curricular semesters",
    regime: "Daytime",
  };
  const tickets: SupportTicket[] = [
    {
      id: "t1", userId: "u_50003", name: "Bruno Adeyemi", email: "pg50003@option.demo", role: "student", programmeId: P, topic: "selection",
      subject: "Can I change from Project Work to Dissertation?", page: "/student", status: "open", createdAt: at(-0.2), updatedAt: at(-0.2),
      messages: [{ from: "user", authorName: "Bruno Adeyemi", body: "I was accepted into Project Work but my company partnership fell through. Can I switch to Dissertation?", at: at(-0.2) }],
    },
    {
      id: "t2", userId: "u_director", name: "Course Director", email: "director@option.demo", role: "director", programmeId: P, topic: "courses",
      subject: "Please make Semantic Web mandatory next year", page: "/director", status: "in_progress", createdAt: at(-2), updatedAt: at(-1.5),
      messages: [
        { from: "user", authorName: "Course Director", body: "The scientific committee decided Semantic Web becomes mandatory in Year 1 from next year.", at: at(-2) },
        { from: "team", authorName: "Rui Barbosa", body: "Noted — we'll switch it once the current round closes so no student loses their seat.", at: at(-1.5) },
      ],
    },
  ];

  return {
    version: 5,
    school: "School of Engineering",
    programmes: [megsi],
    programme: megsi,
    users,
    groups,
    courses,
    selections,
    rounds: [
      { id: "r1", programmeId: P, year: 1, label: "Year 1 option selection", opensAt: at(-30), closesAt: at(-16), emailSentAt: at(-30) },
      { id: "r2", programmeId: P, year: 2, label: "Year 2 option selection", opensAt: at(-1), closesAt: at(13) },
    ],
    emails: [],
    professors: PROFESSORS.map((p) => ({ ...p })),
    events,
    announcements,
    tickets,
  };
}
