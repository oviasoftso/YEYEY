import { Stream, PracticalSubject, LocalLanguage } from "./types";

/**
 * Waterfalls Academy — ZIMSEC O-Level subject taxonomy.
 * Single source of truth used by Onboarding, Dashboard, Assessment, Notes, Flashcards.
 *
 * Rules (locked):
 *   School subjects: Maths, English, Ndebele, Heritage, Combined Science,
 *   Physics, Chemistry, Biology, FRS, BES, Accounts.
 *   Sciences   : all except FRS and BES                                      → Maths B
 *   Commercials: all except Physics, Chemistry, Biology                       → Maths B
 *   Arts       : like Commercials, but also excludes Accounts and BES         → Maths A
 */

export const STREAMS: { value: Stream; label: string; description: string }[] = [
  {
    value: "science",
    label: "Sciences",
    description: "Maths B, pure sciences, Combined Science, Accounts (no FRS/BES).",
  },
  {
    value: "commercial",
    label: "Commercials",
    description: "Maths B, FRS, BES, Accounts, core subjects (no pure sciences).",
  },
  {
    value: "arts",
    label: "Arts",
    description: "Maths A, English, Ndebele, Heritage, Combined Science, FRS.",
  },
];

const CORE_WITH_MATHS_A = ["Mathematics A", "English Language", "Ndebele", "Heritage Studies", "Combined Science"];
const CORE_WITH_MATHS_B = ["Mathematics B", "English Language", "Ndebele", "Heritage Studies", "Combined Science"];

export const STREAM_SUBJECTS: Record<Stream, string[]> = {
  science: [
    ...CORE_WITH_MATHS_B,
    "Physics",
    "Chemistry",
    "Biology",
    "Principles of Accounting",
  ],
  commercial: [
    ...CORE_WITH_MATHS_B,
    "FRS",
    "Business Entrepreneurial Skills",
    "Principles of Accounting",
  ],
  arts: [
    ...CORE_WITH_MATHS_A,
    "FRS",
  ],
};

export const SCHOOL_SUBJECTS: string[] = Array.from(new Set([
  ...STREAM_SUBJECTS.science,
  ...STREAM_SUBJECTS.commercial,
  ...STREAM_SUBJECTS.arts,
]));

export const getSubjectsForStream = (stream: Stream): string[] => [...STREAM_SUBJECTS[stream]];

// Onboarding no longer needs ad-hoc electives — subject set is fully derived from stream.
export const ELECTIVE_STREAMS: Stream[] = [];
export const ELECTIVE_CHOICES: string[] = [];

export const LOCAL_LANGUAGES: { value: LocalLanguage; label: string; subjects: string[] }[] = [
  { value: "Ndebele", label: "Ndebele", subjects: ["Ndebele"] },
];

export const PRACTICAL_SUBJECTS: PracticalSubject[] = [
  "Computer Science",
  "Textiles and Design",
  "Food Technology and Design",
  "Woodwork",
  "Motor Mechanics",
  "Agriculture",
  "Physical Education and Mass Displays",
];

export const SUBJECT_TOPICS: Record<string, string[]> = {
  Physics: ["Measurements", "Forces and Motion", "Energy", "Waves", "Electricity and Magnetism", "Thermal Physics", "Atomic Physics", "Pressure"],
  Chemistry: ["Atomic Structure", "Chemical Bonding", "Acids and Bases", "Organic Chemistry", "Rates of Reaction", "Electrolysis", "Metals", "The Periodic Table"],
  Biology: ["Cell Biology", "Nutrition", "Transport in Living Things", "Respiration", "Reproduction", "Ecology", "Genetics", "Evolution"],
  "Combined Science": ["Cell Biology", "Atomic Structure", "Forces and Motion", "Ecology", "Chemical Reactions", "Energy", "Reproduction", "Electricity"],
  Mathematics: ["Number", "Algebra", "Geometry", "Trigonometry", "Statistics", "Probability", "Mensuration", "Sets", "Graphs", "Vectors", "Matrices"],
  "Mathematics A": ["Number", "Algebra", "Geometry", "Trigonometry", "Statistics", "Probability", "Mensuration", "Sets", "Graphs"],
  "Mathematics B": ["Number", "Algebra", "Geometry", "Trigonometry", "Statistics", "Probability", "Mensuration", "Sets", "Graphs", "Vectors", "Matrices"],
  "English Language": ["Comprehension", "Summary Writing", "Composition", "Grammar", "Vocabulary", "Letter Writing", "Report Writing"],
  "Heritage Studies": ["Culture and Society", "National Heritage", "Citizenship", "Democracy", "Human Rights", "Economic History", "Pre-Colonial Zimbabwe"],
  "Literature in English": ["Valley of Tantalika", "Jabu", "Animal Farm", "Poetry Analysis", "Literary Devices", "Essay Writing", "Character Analysis"],
  History: ["Pre-Colonial Africa", "Colonialism", "Nationalism", "Independence Movements", "Post-Independence Zimbabwe", "World Wars", "Cold War"],
  FRS: ["Christianity", "Islam", "African Traditional Religion", "Ethics", "Family and Relationships", "Social Issues"],
  "Principles of Accounting": ["Double Entry", "Trial Balance", "Final Accounts", "Bank Reconciliation", "Depreciation", "Cash Book", "Budgeting"],
  "Business Entrepreneurial Skills": ["Business Organisation", "Marketing", "Finance", "Human Resources", "Entrepreneurship", "Business Ethics", "E-Commerce"],
  "Computer Science": ["Data Representation", "Programming", "Databases", "Networking", "Web Development", "Algorithms", "Computer Systems"],
  Agriculture: ["Crop Production", "Animal Husbandry", "Soil Science", "Farm Management", "Agricultural Economics", "Pest and Disease Control"],
  Ndebele: [
    "Ulimi (Grammar)", "Amasiko leMikhuba (Culture & Traditions)",
    "Izindaba (Short Stories)", "Izinkondlo (Poetry)", "Imidlalo (Drama/Plays)",
    "Ubuciko Bolimi (Language Arts)", "Izaga leziThakazelo (Proverbs & Clan Praises)", "Ukubhala (Composition)"
  ],
  "Textiles and Design": ["Fibres and Fabrics", "Pattern Making", "Sewing Techniques", "Design Elements", "Textile Care"],
  "Food Technology and Design": ["Nutrition", "Food Preparation", "Menu Planning", "Food Preservation", "Kitchen Safety"],
  Woodwork: ["Wood Types", "Joint Making", "Finishing Techniques", "Design and Planning", "Workshop Safety"],
  "Motor Mechanics": ["Engine Systems", "Electrical Systems", "Braking Systems", "Transmission", "Vehicle Maintenance"],
  "Physical Education and Mass Displays": ["Fitness Training", "Sports Skills", "Health Education", "Mass Display Choreography", "Rules and Regulations"],
};

// School science subjects have an MCQ Paper 1 in ZIMSEC HBC.
export const SUBJECTS_WITH_PAPER1: string[] = [
  "Physics", "Chemistry", "Biology", "Combined Science",
];

export const QUESTION_TIME_MINUTES = [2, 2, 5, 5, 8];
export const MCQ_TIME_PER_QUESTION = 1;

export const getAssessmentTime = (paperType: "paper1" | "paper2", questionCount: number): number => {
  if (paperType === "paper1") return questionCount * MCQ_TIME_PER_QUESTION;
  let total = 0;
  for (let i = 0; i < questionCount; i++) total += QUESTION_TIME_MINUTES[i] ?? 5;
  return total;
};

export const getQuestionTime = (index: number): number => QUESTION_TIME_MINUTES[index] ?? 5;

// Lucide icons are used in components — these emoji glyphs are only for inline labels.
export const SUBJECT_ICONS: Record<string, string> = {
  Physics: "⚡",
  Chemistry: "🧪",
  Biology: "🧬",
  "Combined Science": "🔬",
  Mathematics: "📐",
  "Mathematics A": "📐",
  "Mathematics B": "📐",
  "English Language": "📝",
  "Heritage Studies": "🏛️",
  "Literature in English": "📚",
  History: "📜",
  FRS: "🕊️",
  "Principles of Accounting": "💰",
  "Business Entrepreneurial Skills": "💼",
  "Computer Science": "💻",
  Agriculture: "🌾",
  Ndebele: "🗣️",
  "Textiles and Design": "🧵",
  "Food Technology and Design": "🍳",
  Woodwork: "🪵",
  "Motor Mechanics": "🔧",
  "Physical Education and Mass Displays": "🏃",
};
