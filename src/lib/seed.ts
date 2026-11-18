// Demo data based on the MEGSI study plan (2026/2027).
// Dates are built relative to "now" so the Year 2 round is open the first time you run it.
// Course codes other than Corporate Strategy are placeholders — replace them with the official ones.
import type { Announcement, CalendarEvent, Course, CourseDetails, DB, OptionGroup, Professor, Programme, Round, Selection, Semester, SupportTicket, User, Year } from "./types";

const P = "megsi";

const DAY = 86_400_000;

export const AREAS: Record<string, string> = {
  TSI: "Information Systems and Technologies",
  G: "Management",
  D: "Law",
  TInt: "TInt",
  EngT: "Telecommunications Engineering",
  EngI: "Informatics Engineering",
  EEIC: "Industrial Electronics and Computers Engineering",
  Fis: "Physics",
  EIS: "Industrial and Systems Engineering",
  M: "Mathematics",
  EC: "Civil Engineering",
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
let cur = P; // programme the next c() call belongs to
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
    programmeId: cur,
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

// ───────────── Study plans of the other DSI Master's (from the programme documents) ─────────────
// Units shared with MEGSI reuse its description. Scientific areas are given by the METI and MSI
// plans; for MECD and MGPE units not shared with MEGSI they are best guesses — fix them in the portal.
const DESC: Record<string, string> = Object.fromEntries(courses.map((x) => [x.name, x.description]));
const RESEARCH: Partial<Course> = { capacity: 6, requiresApproval: true, courseDirector: "Course Director", requestPrompt: "Briefly describe the research area you're interested in." };
const THESIS = (capacity: number, prompt: string): Partial<Course> => ({ ects: 45, capacity, requiresApproval: true, courseDirector: "Course Director", requestPrompt: prompt, details: { teachingType: "Presential" } });
type Row = [name: string, area: string, description?: string, extra?: Partial<Course>];

/** Mandatory units of one semester. */
function core(year: Year, semester: Semester, rows: Row[]) {
  for (const [name, area, d, extra] of rows) courses.push(c(year, semester, name, area, d ?? DESC[name] ?? name, extra));
}
/** One Opção slot and the list of units students choose from. */
function option(pid: string, num: number, year: Year, semester: Semester, rows: Row[], ects = 5) {
  const id = `${pid}_o${num}`;
  groups.push({ id, programmeId: pid, year, semester, name: `Opção ${num}`, ects });
  for (const [name, area, d, extra] of rows) courses.push(c(year, semester, name, area, d ?? DESC[name] ?? name, { groupId: id, ...(name.startsWith("Initiation to Research") ? RESEARCH : {}), ...extra }));
}

// ── MECD · Data Engineering and Science
cur = "mecd";
core(1, "S1", [
  ["Project Analysis and Risk Management", "EIS", "Evaluating projects and managing their risk."],
  ["Data and Machine Learning", "EngI", "Data preparation and the core machine learning algorithms."],
  ["Methodologies for Data Science", "TSI", "Process models and methods for running data science projects."],
  ["Methods and Algorithms for Multi-objective Optimization", "M", "Optimising several conflicting objectives at once."],
  ["Data and Information Visualization", "TSI", "Visual representations of data that support analysis and decisions."],
]);
const MECD_OPT_I: Row[] = [
  ["Integrated Project Management", "EIS", "Planning and controlling projects across scope, time, cost and quality."],
  ["Information Technologies Infrastructures", "TSI"],
  ["Metrics in Machine Learning", "EngI", "Measuring and comparing the performance of machine learning models."],
  ["Nonlinear Modelling and Optimization", "M", "Modelling and solving nonlinear optimisation problems."],
  ["Modelling and Simulation", "EIS", "Building simulation models of systems and processes."],
  ["Semantic Web", "TSI"],
];
option("mecd", 1, 1, "S1", MECD_OPT_I);
core(1, "S2", [
  ["Deep Learning", "EngI", "Neural networks and deep architectures for complex data."],
  ["Development of Analytical Information Systems", "TSI"],
  ["Requirements Engineering for Data Science", "TSI", "Eliciting and specifying requirements for data-driven solutions."],
  ["Bayesian Statistics and Applications", "M", "Bayesian inference and its use on real data."],
  ["Adaptive Systems for Predictive and Prescriptive Analytics", "EIS", "Systems that learn and adapt to forecast and recommend decisions."],
]);
option("mecd", 2, 1, "S2", [
  ["Reinforcement Learning", "EngI", "Agents that learn to act by trial, error and reward."],
  ["Architectures for Distributed Information Systems", "TSI"],
  ["Urban Economics", "G", "The economics of cities, location and urban policy."],
  ["Engineering and Innovation of Services", "TSI"],
  ["Integrated Project Management", "EIS", "Planning and controlling projects across scope, time, cost and quality."],
  ["Optimization in Machine Learning", "M", "The optimisation methods behind training machine learning models."],
  ["Decision Support Systems", "TSI"],
  ["Data Classification and Clustering Techniques", "M", "Supervised classification and unsupervised clustering of data."],
]);
core(2, "A", [["Dissertation", "TSI", "An individual research dissertation in Data Engineering and Science, supervised by a faculty member.", { ects: 45 }]]);
core(2, "S1", [
  ["Law and Information", "D"],
  ["Decision Models and Methods", "EIS", "Quantitative models and methods to support decisions."],
]);
option("mecd", 3, 2, "S1", MECD_OPT_I.filter(([name]) => ["Integrated Project Management", "Metrics in Machine Learning", "Nonlinear Modelling and Optimization", "Modelling and Simulation"].includes(name)));

// ── METI · Telecommunications and Informatics Engineering
cur = "meti";
core(1, "S1", [
  ["Digital Communications", "EngT", "Modulation, error control, OFDM and spread-spectrum systems."],
  ["Emulation and Simulation of Telecommunication Networks", "EngT", "Testing and designing protocols with network emulation and simulation.", { ects: 10 }],
  ["Network Management and Virtualization", "EngT", "Managing networks, network function virtualisation and SDN."],
]);
const METI_A: Row[] = [
  ["Machine Learning for Enterprise Systems", "TSI"],
  ["Mobile Computing", "TSI", "Computing and applications for mobile environments."],
  ["Traffic Routing", "EngT", "Routing protocols and traffic engineering in IP networks."],
  ["Artificial Intelligence for Telecommunications", "EngI", "AI techniques applied to networks and communication systems."],
  ["Wireless Networks for the Internet of Things", "EEIC", "Low-power wireless technologies that connect IoT devices."],
];
option("meti", 1, 1, "S1", METI_A);
option("meti", 2, 1, "S1", METI_A);
core(1, "S2", [
  ["Integrative Project in Telecommunications and Informatics", "EngT", "A team project bringing the year's telecommunications and informatics together.", { ects: 10 }],
  ["Access and Core Networks", "EngT", "Access and core network architectures, transmission, multiplexing and switching."],
  ["Network Services and Multimedia Applications", "EngI", "Encoding, compressing and distributing multimedia over networks."],
]);
const METI_B: Row[] = [
  ["Cybersecurity", "EngT", "Protecting networks and systems against attacks."],
  ["Radio Frequency Electronics", "EEIC", "Design and implementation of RF circuits and systems."],
  ["Optics and Lasers", "Fis", "Optical physics and lasers behind optical communications."],
  ["Information Retrieval", "EngI", "Indexing, searching and ranking large collections of information."],
  ["Vehicular Networks", "EngT", "Communication between vehicles and road infrastructure."],
  ["Network Optimization Topics", "EIS", "Optimisation models for planning and operating networks."],
];
option("meti", 3, 1, "S2", METI_B);
option("meti", 4, 1, "S2", METI_B);
core(2, "A", [["Dissertation", "EngT", "An individual research dissertation in Telecommunications and Informatics, supervised by a faculty member.", { ects: 45 }]]);
core(2, "S1", [
  ["Business Training and Entrepreneurship", "EIS", "Starting and running technology-based ventures."],
  ["Information Technology Project Management", "TSI", "Planning, running and controlling IT projects."],
  ["Telecommunications and Informatics Seminars", "EngT", "Talks and discussion on current research and industry practice."],
]);

// ── MGPE · Engineering Project Management
cur = "mgpe";
core(1, "S1", [
  ["Economic Evaluation of Engineering Projects", "G", "Assessing the economic and financial viability of engineering projects."],
  ["Information Systems for Project Management", "TSI", "Software and information systems that support project management."],
  ["Introduction to Project Management", "EIS", "Project life cycle, processes and the main management domains."],
  ["Strategic and Organizational Management", "G", "Strategy and organisational design in project-based organisations."],
  ["Team Management and Communication", "G", "Leading project teams and managing communication."],
]);
option("mgpe", 1, 1, "S1", [
  ["Analysis and Design of Production Systems in Construction", "EC", "Planning production systems for building and civil engineering works."],
  ["Design of Production Systems", "EIS", "Designing manufacturing and service production systems."],
  ["Innovation Management and Marketing", "G", "Managing innovation and bringing it to market."],
  ["Intelligent Business Processes", "TSI"],
  ["Project Scheduling", "EIS", "Scheduling techniques and resource levelling for projects."],
  ["Software Engineering for Information Systems", "TSI", "Engineering practices for building information systems software."],
  ["Systems and Organizations Dynamic Modeling", "TSI"],
]);
core(1, "S2", [
  ["Emerging Topics in Project Management", "EIS", "New approaches and trends in project management."],
  ["Quality, Safety and Sustainability Management", "EIS", "Managing quality, safety and sustainability in projects."],
  ["Program and Portfolio Management", "EIS", "Managing groups of projects and aligning them with strategy."],
  ["Project Risk Management", "EIS", "Identifying, analysing and responding to project risk."],
]);
const MGPE_S2: Row[] = [
  ["Analysis and Design of Production Systems in Construction", "EC", "Planning production systems for building and civil engineering works."],
  ["Automatic Software Modeling and Generation", "TSI"],
  ["Design of Production Systems", "EIS", "Designing manufacturing and service production systems."],
  ["Development of Project Management Competences", "EIS", "Developing the competences of a professional project manager."],
  ["Information Systems Auditing", "TSI"],
  ["Innovation Management and Marketing", "G", "Managing innovation and bringing it to market."],
  ["Logistic Systems", "EIS", "Design and management of logistics and supply systems."],
  ["Manufacturing Planning and Control Systems", "EIS", "Planning and controlling production in manufacturing."],
  ["Maturity and Quality in Information Systems Projects Development", "TSI", "Maturity models and quality in IS development projects."],
  ["Project Cost Management", "EIS", "Estimating, budgeting and controlling project costs."],
  ["Project Scheduling", "EIS", "Scheduling techniques and resource levelling for projects."],
];
option("mgpe", 2, 1, "S2", MGPE_S2);
option("mgpe", 3, 1, "S2", MGPE_S2);
core(2, "S1", [
  ["Research Methodologies in Engineering Project Management", "EIS", "Research methods for the dissertation in project management."],
  ["Seminars in Engineering Project Management", "EIS", "Seminars on current practice and research in project management."],
]);
core(2, "A", [["Dissertation", "EIS", "An individual research dissertation in Engineering Project Management, supervised by a faculty member.", { ects: 45 }]]);

// ── MSI · Information Systems
cur = "msi";
core(1, "S1", [
  ["Information Technology in Organizations", "TSI", "The role of IT in how organisations work and compete."],
  ["Software Engineering for Information Systems", "TSI", "Engineering practices for building information systems software."],
  ["Strategy and Competitiveness", "G", "Strategy as the basis of a firm's competitiveness."],
]);
const MSI_ALL: Record<string, Row> = Object.fromEntries(
  ([
    ["Databases for Information Systems", "TSI", "Designing and using databases that support information systems."],
    ["Information Systems for Project Management", "TSI", "Software and information systems that support project management."],
    ["Information Systems Security Management", "TSI"],
    ["Intelligent Business Processes", "TSI"],
    ["Open Innovation Using Information Technologies", "TSI"],
    ["Project Management in Information Systems and Technologies", "TSI", "Planning, running and controlling IST projects."],
    ["Semantic Web", "TSI"],
    ["Systems and Organizations Dynamic Modeling", "TSI"],
    ["Testing and Validation of Information Systems", "TSI"],
    ["Digital Innovation", "TInt"],
    ["Financial Evaluation of Projects", "G", "Financial appraisal of investment projects."],
    ["Law and Information", "D"],
    ["Virtual and Augmented Reality", "TInt"],
    ["Initiation to Research in Information Systems and Technologies", "TSI"],
    ["Automatic Software Modeling and Generation", "TSI"],
    ["Computing Systems and Communications", "TSI", "Computer systems, networks and communications for IS professionals."],
    ["Decision Support Systems", "TSI"],
    ["Information Systems and Technologies in Government", "TSI"],
    ["Information Systems Auditing", "TSI"],
    ["Urban Informatics", "TSI"],
    ["Digital Games", "TInt"],
    ["e-Business", "TSI", "Business models and systems for electronic business."],
    ["Leadership and Change Management", "G"],
  ] as Row[]).map((r) => [r[0], r]),
);
const msi = (...names: string[]) => names.map((x) => MSI_ALL[x]);
const MSI_S1_COMMON = ["Information Systems for Project Management", "Information Systems Security Management", "Intelligent Business Processes", "Open Innovation Using Information Technologies", "Project Management in Information Systems and Technologies", "Semantic Web", "Systems and Organizations Dynamic Modeling", "Testing and Validation of Information Systems"];
option("msi", 1, 1, "S1", msi("Databases for Information Systems", ...MSI_S1_COMMON));
option("msi", 2, 1, "S1", msi("Databases for Information Systems", "Digital Innovation", "Financial Evaluation of Projects", ...MSI_S1_COMMON, "Law and Information", "Virtual and Augmented Reality"));
option("msi", 3, 1, "S1", msi("Databases for Information Systems", "Digital Innovation", "Initiation to Research in Information Systems and Technologies", ...MSI_S1_COMMON, "Law and Information", "Virtual and Augmented Reality"));
core(1, "S2", [
  ["Business Analysis for Decision Making", "TSI", "Analysing business data and processes to support decisions."],
  ["Information Technology-Based Organizational Development", "TSI", "Developing organisations through information technology."],
  ["Management of Information Systems", "TSI"],
  ["Organizational Performance Management", "G", "Measuring and managing organisational performance."],
]);
option("msi", 4, 1, "S2", msi("Automatic Software Modeling and Generation", "Computing Systems and Communications", "Decision Support Systems", "Information Systems and Technologies in Government", "Information Systems Auditing", "Initiation to Research in Information Systems and Technologies", "Urban Informatics"));
option("msi", 5, 1, "S2", msi("Automatic Software Modeling and Generation", "Computing Systems and Communications", "Decision Support Systems", "Digital Games", "e-Business", "Financial Evaluation of Projects", "Information Systems and Technologies in Government", "Information Systems Auditing", "Initiation to Research in Information Systems and Technologies", "Leadership and Change Management", "Urban Informatics"));
core(2, "S1", [
  ["Research and Development in Information Systems and Technologies", "TSI"],
  ["Trends and Impacts of Information Systems and Technologies", "TSI"],
]);
option("msi", 6, 2, "S1", msi("Digital Innovation", ...MSI_S1_COMMON, "Law and Information", "Virtual and Augmented Reality"));
option("msi", 7, 2, "A", [
  ["Dissertation", "TSI", DESC["Dissertation"], THESIS(30, "Proposed topic and preferred supervisor (if you have one).")],
  ["Project Work", "TSI", DESC["Project Work"], THESIS(12, "Project idea, partner organisation (if any) and preferred supervisor.")],
], 45);
cur = P;

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
// One professor ↔ one curricular unit: each professor gets the first MEGSI unit listed for them
// (the same unit offered in several Opção slots counts as one). Other units wait for the DSI team to assign them.
{
  const unitOf = new Map<string, string>(); // professorId → unit name
  for (const c of courses) {
    const pid = PROF_BY_COURSE[c.name];
    if (c.programmeId !== P || !pid) continue;
    if (!unitOf.has(pid) && ![...unitOf.values()].includes(c.name)) unitOf.set(pid, c.name);
    if (unitOf.get(pid) === c.name) c.professorId = pid;
  }
}

// ───────────── Master's degrees (official information, 2026/2027 unless noted) ─────────────
const SCHOOL_CONTACT = "Department of Information Systems, University of Minho · Azurém Campus, 4800-058 Guimarães, Portugal · www.dsi.uminho.pt";
const DSI = "Department of Information Systems";

const PROGRAMMES: Programme[] = [
  {
    id: P,
    department: DSI,
    name: "Information Systems Engineering and Management",
    short: "MEGSI",
    degree: "Master's degree",
    ects: 120,
    duration: "4 academic semesters",
    regime: "Daytime",
    academicYear: "2026/2027",
    location: "Azurém Campus, Guimarães",
    scientificArea: "Information Technologies and Systems",
    contacts: [
      { role: "Course Director", name: "Luís Gonzaga Mendes Magalhães", email: "lmagalhaes@dsi.uminho.pt", phone: "253510319" },
      { role: "Course Direction", name: "MEGSI Direction", email: "direcaomegsi@dsi.uminho.pt", phone: "(+351) 253 510 319" },
      { role: "Academic Mobility Coordinator", name: "Ana Alice Rodrigues Pereira Baptista", email: "analice@dsi.uminho.pt", phone: "510319" },
    ],
    description:
      "The MEGSI program aims to provide advanced training for IT engineers and managers whose main professional functions combine IT, organizational, and management skills.\nIt also aims for MEGSI graduates to be familiar with the R&D process to keep up with the evolution of the field's body of knowledge and participate in its exploration and development, particularly in a context of evidence-based practices.\nMEGSI graduates should also demonstrate: a sense of responsibility and professional ethics; the ability to learn and adapt to new situations; analytical, synthetic, and critical thinking skills; creativity; self-confidence; attention to the evolution of IT and the opportunities for its application; a reflective attitude; and a leadership posture.\nProfessional roles in IT engineers and managers can be performed in any organization, regardless of its size (including small and medium-sized enterprises) or sector, as well as in management consulting and IT firms.",
    learningOutcomes: [
      "Managing (curating) information",
      "Exploring IT applications to galvanize informational objects",
      "Developing IT applications",
      "Deploying IT applications",
      "Maintaining portfolios of IT applications",
      "Designing information systems architectures",
      "Establishing organizational capabilities centered on information and enhanced by IT",
      "Supervising IT infrastructures",
      "Controlling the fit between information systems architecture and reality",
      "Studying the impacts of information technologies and systems on society",
      "Managing information technology and systems units",
      "Conduct R&D in IT",
    ],
    higherEducation: "This course provides the technical and scientific skills necessary for access to third-cycle (Doctoral) programs.",
    careers: [
      "Large companies where the IT function is formalized: the graduate will integrate this function, potentially leading it, with responsibilities compatible with their training, profile and professional experience.",
      "Small companies where the IT function is not necessarily autonomous: a valuable asset given their preparation for the challenges of adopting and using IT.",
      "Consulting firms, leading or integrating project teams.",
      "Software development companies, potentially as entrepreneur, leading product and service innovation and managing software development projects.",
    ],
  },
  {
    id: "msi",
    department: DSI,
    name: "Information Systems",
    short: "MSI",
    degree: "Master's degree",
    ects: 120,
    duration: "4 academic semesters",
    regime: "Mixed",
    academicYear: "2026/2027",
    location: "Azurém Campus, Guimarães",
    scientificArea: "Information Technologies and Systems",
    contacts: [
      { role: "Course Director", name: "Teresa Pereira", email: "tpereira@dsi.uminho.pt", phone: "253 510 319" },
      { role: "Academic Mobility Coordinator", name: "Ana Alice Baptista", email: "analice@dsi.uminho.pt", phone: "510319" },
    ],
    description:
      "The Master Program in Information Systems (MSI) provides advanced specialization in the development, implementation and management of corporate information systems and emerging technologies.\nThe Master's Degree in Information Systems aims to train professionals capable of: understanding the role of information and information technologies and systems (ITS) in organizations and society; explaining the technological, organizational, political, social, and cultural reasons for the successful adoption and management of ITS; diagnosing problems associated with the use of ITS; defining ITS solutions to solve organizational or societal problems and take advantage of opportunities arising from market and societal changes.\nMasters in Information Systems should be able to contribute to the definition of the technological infrastructure supporting the business strategy, participate in innovation and organizational change processes in which ITS plays a central role, and manage the organization's ITS to support the business model within its objectives and constraints.",
    learningOutcomes: [
      "Improving organizational work and processes",
      "Exploring opportunities created by technological innovations",
      "Understanding and meeting information requirements",
      "Designing and managing organizational architecture",
      "Identifying and evaluating alternative solutions and ways to obtain them",
      "Ensuring information security and supporting infrastructure",
      "Understanding, managing, and controlling IT-related risks",
      "Collaboration, communication, negotiation, analytical and critical thinking, creativity and leadership (AIS recommendations)",
    ],
    higherEducation: "This course provides the technical and scientific skills necessary for access to a PhD program.",
    careers: [
      "Large companies with a formal Information Systems function (e.g. reporting to a CIO) — integrating and possibly leading it.",
      "Consulting firms, leading or integrating project teams.",
      "Small companies where the IS function is not autonomous — a particularly valuable asset.",
      "Public organizations, from IT services support to management.",
      "Software development companies, as entrepreneur, innovation lead or software project manager.",
    ],
  },
  {
    id: "mecd",
    department: DSI,
    name: "Data Engineering and Science",
    short: "MECD",
    degree: "Master's degree",
    ects: 120,
    duration: "4 academic semesters",
    regime: "Daytime",
    academicYear: "2026/2027",
    location: "Azurém Campus, Guimarães",
    scientificArea: "Engineering",
    contacts: [
      { role: "Course Director", name: "Lino António Antunes Fernandes Costa", email: "dir-mecd@eng.uminho.pt" },
      { role: "Course Direction", name: "César Analide · Tiago Guimarães", email: "mecd@eng.uminho.pt" },
      { role: "Secretariat", name: "Ana Rita Rodrigues", email: "mecd@eng.uminho.pt", phone: "(+351) 253 510 342" },
    ],
    description:
      "The Master's degree in Data Engineering and Science (MECD) provides second-cycle training in the scientific field of Data Engineering and Science at the University of Minho, continuing the first-cycle training in the same area with the Bachelor's degree in Data Science (LCD), which began operating in 2022/23.\nThe MECD aims to train professionals and researchers capable of integrating into the business and industrial sector in an emerging and highly sought-after application area, as well as teaching and research units in a scientific area of current relevance and future prominence.",
    learningOutcomes: [
      "Understand advanced scientific knowledge associated with Engineering and Data Science (e.g. Data Engineering, Artificial Intelligence, Methodologies), as well as the legal issues of data collection, storage and processing",
      "Process and visualize data using information technologies to extract useful knowledge and support decision-making",
      "Design, develop, integrate and monitor data-driven computational products (e.g. Big Data Analytics and Artificial Intelligence systems)",
      "Apply data science methodologies for descriptive, predictive and prescriptive analyses",
      "Solve real-world problems involving advanced data processing and analysis (high volume and complexity)",
    ],
    careers: [
      "Data Engineer, Data Scientist, Machine Learning Engineer or Systems Analyst in the corporate and industrial sector.",
      "Advanced R&D roles in academic teaching and research units.",
    ],
  },
  {
    id: "meti",
    department: DSI,
    name: "Telecommunications and Informatics Engineering",
    short: "METI",
    degree: "Master's degree",
    ects: 120,
    duration: "4 academic semesters",
    regime: "Daytime",
    academicYear: "2026/2027",
    location: "Azurém Campus, Guimarães",
    scientificArea: "Telecommunications Engineering",
    contacts: [
      { role: "Course Director", name: "Adriano Jorge Cardoso Moreira", email: "adriano@dsi.uminho.pt", phone: "510305" },
      { role: "Academic Mobility Coordinator", name: "António Luís Duarte Costa", email: "costa@di.uminho.pt", phone: "253604442" },
    ],
    description:
      "The general objectives of the Master's course are to provide a second-cycle education in Engineering with a specialization in Telecommunications and Informatics, complementing a first-cycle education in the same area.\nThe aim is to train masters who deeply understand telecommunications systems at their different levels of conceptualization and implementation, and who can specify, design, develop, implement, operate and maintain them.\nIt is a specialized profile with strong R&D, communication and scientific dissemination skills in network management and virtualization, communications and digital systems, access and core networks, network services and multimedia applications, network emulation and simulation, traffic routing, vehicular networks, mobile computing, IoT, RF system implementation, machine learning, information retrieval, knowledge representation and reasoning.",
    learningOutcomes: [
      "Understand in depth the functioning of telecommunications systems",
      "Specify, design, implement, operate and maintain telecommunications systems",
      "Understand digital communications, modulation techniques, error control, OFDM systems and spread spectrum",
      "Understand access and core network architectures, digital transmission systems and the principles of multiplexing and switching",
      "Identify and apply the appropriate paradigm for managing distributed networks, services and applications",
      "Understand network virtualization and software-defined networks",
      "Apply information theory to digitizing, encoding and compressing multimedia data; choose technologies for processing, storing and distributing it",
      "Understand the differences between emulation and simulation and their importance in testing and designing new protocols and technologies",
    ],
    higherEducation:
      "Complemented by the doctoral program in Telecommunications (MAPTele), a joint program of the universities of Minho, Porto and Aveiro, and by other doctoral programs in related areas such as Informatics, Electronics and Computers, and Information Systems.",
    careers: [
      "Telecommunications operators — specification, design, operation and maintenance of systems, infrastructures and services",
      "Service providers — services for telecommunications and computer networks",
      "Content providers — content and applications to support access to and provision of content",
      "IT companies — computer networks and network services",
      "R&D companies — research and development of new communication systems",
    ],
  },
  {
    id: "mgpe",
    department: DSI,
    name: "Engineering Project Management",
    short: "MGPE",
    degree: "Master's degree",
    ects: 120,
    duration: "4 academic semesters",
    regime: "Mixed",
    academicYear: "2026/2027",
    location: "Azurém Campus, Guimarães",
    scientificArea: "Engineering",
    contacts: [
      { role: "Course Director", name: "Pedro Ribeiro" },
      { role: "Secretariat", name: "Carina Freitas", email: "mgpe@eng.uminho.pt", phone: "(+351) 253 510 219" },
    ],
    description:
      "The Master's in Engineering Project Management (MGPE) trains professionals of various profiles to manage technology development and implementation processes within highly complex engineering projects.\nIt combines scientific and technological knowledge with the ability to plan, control and manage projects economically and to adequate standards, with specialization in three project areas: Construction (building and civil engineering works), Industrial Engineering (manufacturing industry and services) and Information Systems (information technology and information systems).\nThe first year covers general project management training and the specialization tracks; the second year is dedicated to seminars and the dissertation.",
    learningOutcomes: [
      "Define the preliminary plan of an engineering project",
      "Plan and implement project execution across scope, time, cost, quality, resources, communication, risk, changes and acquisitions",
      "Implement the defined global management plan",
      "Organize, control and lead human resources, equipment and materials within an engineering project",
      "Implement the stakeholder management plan",
      "Close the project, evaluating whether its objectives were met and producing the formal documentation of its completion",
    ],
    careers: [
      "Any productive sector that works through projects or uses project structures to develop new products, implement new technologies or introduce new ways of working.",
      "Construction — building and civil engineering works.",
      "Industrial manufacturing and services.",
      "Information systems and information technology.",
    ],
  },
];

export function createSeed(now = new Date()): DB {
  const t = now.getTime();
  const at = (offsetDays: number) => new Date(t + offsetDays * DAY).toISOString();
  // Semester 2 options are chosen 12–26 January, just before Semester 2 starts (open now if we're already there).
  const s2Window = (() => {
    const m = now.getMonth();
    if (m >= 1 && m <= 7) return { opensAt: at(-1), closesAt: at(13) };
    const y = m === 0 ? now.getFullYear() : now.getFullYear() + 1;
    return { opensAt: new Date(y, 0, 12, 10).toISOString(), closesAt: new Date(y, 0, 26, 18).toISOString() };
  })();
  const users: User[] = [
    { id: "u_admin", username: "admin", password: "option", name: "DSI Management Team", email: "support@dsi.option.demo", role: "admin", title: "Department of Information Systems" },
    { id: "u_tech", username: "tech", password: "option", name: "Rui Barbosa", email: "rbarbosa@dsi.option.demo", role: "admin", title: "Technical support, Department of Information Systems", photo: face("1500648767791-00dcc994a43e") },
    {
      id: "u_assistant", username: "assistant", password: "option", name: "Programme Assistant", email: "assistant@option.demo", role: "assistant", programmeId: P,
      title: "Programme assistant", bio: "Helps with schedules, lists and student questions.", invitedAt: at(-60),
    },
    {
      id: "u_director", username: "director", password: "option", name: "Course Director", email: "director@option.demo", role: "director", programmeId: P, professorId: "p1",
      title: "Programme Director, MEGSI", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2.5&w=256&h=256&q=70",
      bio: "Reviews Dissertation and Project Work requests.", about: "Contact me here for anything about option selection — no need to email.", invitedAt: at(-90),
    },
    {
      id: "u_professor", username: "professor", password: "option", name: "Joana Lima", email: "jlima@dept.option.demo", role: "professor", programmeId: P,
      professorId: "p5", title: "Prof.", invitedAt: at(-30),
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

  // Year 1 · Semester 1 round (closed): every Year 1 student chose Opção 1. Opção 2 (Semester 2) opens later.
  for (const gid of ["g1"]) {
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

  const megsi: Programme = { ...PROGRAMMES[0], createdAt: at(-500) };
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
    version: 11,
    school: "Department of Information Systems",
    programmes: [megsi, ...PROGRAMMES.slice(1).map((p) => ({ ...p, createdAt: at(-30) }))],
    schoolContact: SCHOOL_CONTACT,
    programme: megsi,
    users,
    groups,
    courses,
    selections,
    rounds: [
      // Year 1 picks per semester: Semester 1 slots in the autumn, Semester 2 slots shortly before Semester 2 starts.
      { id: "r1", programmeId: P, year: 1, semester: "S1", label: "Year 1 · Semester 1 option selection", opensAt: at(-30), closesAt: at(-16), emailSentAt: at(-30) },
      { id: "r1s2", programmeId: P, year: 1, semester: "S2", label: "Year 1 · Semester 2 option selection", ...s2Window },
      { id: "r2", programmeId: P, year: 2, label: "Year 2 option selection", opensAt: at(-1), closesAt: at(13) },
      // The other Master's: Year 1 Semester 1 opens next week, Semester 2 before it starts; Year 2 is open where the plan has Year 2 options.
      ...PROGRAMMES.slice(1).flatMap((p) => {
        const has = (y: Year, sem?: string) => groups.some((g) => g.programmeId === p.id && g.year === y && (!sem || g.semester === sem));
        const list: Round[] = [];
        if (has(1, "S1")) list.push({ id: `r_${p.id}_1`, programmeId: p.id, year: 1, semester: "S1", label: "Year 1 · Semester 1 option selection", opensAt: at(7), closesAt: at(21) });
        if (has(1, "S2")) list.push({ id: `r_${p.id}_1s2`, programmeId: p.id, year: 1, semester: "S2", label: "Year 1 · Semester 2 option selection", ...s2Window });
        if (has(2)) list.push({ id: `r_${p.id}_2`, programmeId: p.id, year: 2, label: "Year 2 option selection", opensAt: at(-1), closesAt: at(13) });
        return list;
      }),
    ],
    emails: [],
    professors: PROFESSORS.map((p) => ({ ...p })),
    events,
    announcements,
    tickets,
    // A professor waiting for approval, so the portal shows how requests look.
    accessRequests: [
      {
        id: "req_demo", name: "Marta Oliveira", email: "moliveira@dsi.uminho.pt", programmeId: "msi", status: "pending", createdAt: at(-0.1),
        courseIds: courses.filter((x) => x.programmeId === "msi" && ["Databases for Information Systems", "e-Business"].includes(x.name)).map((x) => x.id),
      },
    ],
  };
}
