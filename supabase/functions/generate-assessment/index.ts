import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import { verifyAuth, rateLimit, corsHeaders, jsonError, sanitizeString, RateLimitError } from "../_shared/auth.ts";

function normaliseQuestions(raw: unknown, paperType: string, count: number) {
  const items = Array.isArray(raw) ? raw : [];
  if (paperType === "paper1") {
    return items
      .filter((q: any) => q?.question && q?.options?.A && q?.options?.B && q?.options?.C && q?.options?.D && q?.correctAnswer)
      .slice(0, count);
  }
  return items
    .map((q: any) => typeof q === "string" ? q : q?.question)
    .filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 10)
    .slice(0, count);
}

function fallbackQuestions(subject: string, topic: string, paperType: string, count: number) {
  if (paperType === "paper1") {
    // Real ZIMSEC-style MCQ fallbacks with plausible distractors per subject
    const mcqBank: Record<string, { q: string; opts: Record<string, string>; ans: string }[]> = {
      "Mathematics A": [
        { q: "Solve: 2x + 5 = 13", opts: { A: "x = 4", B: "x = 9", C: "x = 3", D: "x = 6" }, ans: "A" },
        { q: "What is the value of 3² + 4²?", opts: { A: "25", B: "14", C: "49", D: "7" }, ans: "A" },
        { q: "Simplify: 12a ÷ 4a", opts: { A: "3", B: "8a", C: "3a", D: "16a" }, ans: "A" },
        { q: "Find the next term in the sequence: 2, 5, 8, 11, ...", opts: { A: "14", B: "13", C: "15", D: "12" }, ans: "A" },
        { q: "What is 15% of 200?", opts: { A: "30", B: "15", C: "35", D: "20" }, ans: "A" },
        { q: "If a rectangle has length 8 cm and width 5 cm, what is its area?", opts: { A: "40 cm²", B: "26 cm²", C: "13 cm²", D: "45 cm²" }, ans: "A" },
        { q: "Factorise: x² + 5x + 6", opts: { A: "(x + 2)(x + 3)", B: "(x + 1)(x + 6)", C: "(x - 2)(x - 3)", D: "(x + 2)(x - 3)" }, ans: "A" },
        { q: "What is the gradient of the line y = 3x + 2?", opts: { A: "3", B: "2", C: "5", D: "1" }, ans: "A" },
        { q: "Convert 0.75 to a fraction in its simplest form.", opts: { A: "3/4", B: "75/100", C: "1/4", D: "2/3" }, ans: "A" },
        { q: "If 5 pens cost $2.50, what is the cost of 8 pens?", opts: { A: "$4.00", B: "$3.50", C: "$4.50", D: "$20.00" }, ans: "A" },
      ],
      "Mathematics B": [
        { q: "Solve the quadratic equation x² - 5x + 6 = 0", opts: { A: "x = 2 or x = 3", B: "x = -2 or x = -3", C: "x = 1 or x = 6", D: "x = -1 or x = -6" }, ans: "A" },
        { q: "Find the value of sin 30°", opts: { A: "0.5", B: "1", C: "0.866", D: "0" }, ans: "A" },
        { q: "What is the volume of a sphere with radius 3 cm? (Use π = 3.14)", opts: { A: "113.04 cm³", B: "37.68 cm³", C: "339.12 cm³", D: "28.26 cm³" }, ans: "A" },
        { q: "Differentiate y = 3x² + 2x - 1", opts: { A: "dy/dx = 6x + 2", B: "dy/dx = 6x - 1", C: "dy/dx = 3x + 2", D: "dy/dx = 6x² + 2" }, ans: "A" },
        { q: "The bearing of B from A is 065°. What is the bearing of A from B?", opts: { A: "245°", B: "065°", C: "115°", D: "295°" }, ans: "A" },
        { q: "Simplify: (x² - 9)/(x + 3)", opts: { A: "x - 3", B: "x + 3", C: "x² - 3", D: "x - 9" }, ans: "A" },
        { q: "If log₂ 8 = x, find x", opts: { A: "3", B: "4", C: "2", D: "16" }, ans: "A" },
        { q: "Find the midpoint of (2, 8) and (6, 4)", opts: { A: "(4, 6)", B: "(8, 12)", C: "(3, 5)", D: "(4, 4)" }, ans: "A" },
        { q: "What is the sum of interior angles of a hexagon?", opts: { A: "720°", B: "540°", C: "1080°", D: "360°" }, ans: "A" },
        { q: "Solve: |2x - 3| = 7", opts: { A: "x = 5 or x = -2", B: "x = 5 or x = 2", C: "x = -5 or x = 2", D: "x = 10 or x = -4" }, ans: "A" },
      ],
      "Combined Science": [
        { q: "What is the chemical formula for water?", opts: { A: "H₂O", B: "HO₂", C: "H₂O₂", D: "OH" }, ans: "A" },
        { q: "Which gas is produced when acids react with metals?", opts: { A: "Hydrogen", B: "Oxygen", C: "Carbon dioxide", D: "Nitrogen" }, ans: "A" },
        { q: "What is the function of red blood cells?", opts: { A: "Transport oxygen", B: "Fight infections", C: "Clot blood", D: "Produce hormones" }, ans: "A" },
        { q: "What type of reaction occurs when magnesium burns in air?", opts: { A: "Combination", B: "Decomposition", C: "Displacement", D: "Neutralisation" }, ans: "A" },
        { q: "Which organ produces bile in the human body?", opts: { A: "Liver", B: "Gall bladder", C: "Pancreas", D: "Stomach" }, ans: "A" },
        { q: "What is the SI unit of force?", opts: { A: "Newton", B: "Joule", C: "Watt", D: "Pascal" }, ans: "A" },
        { q: "Which element has the atomic number 6?", opts: { A: "Carbon", B: "Nitrogen", C: "Oxygen", D: "Boron" }, ans: "A" },
        { q: "What happens to the rate of a chemical reaction when temperature increases?", opts: { A: "Increases", B: "Decreases", C: "Stays the same", D: "First increases then decreases" }, ans: "A" },
        { q: "What is the pH of a neutral solution?", opts: { A: "7", B: "0", C: "14", D: "1" }, ans: "A" },
        { q: "Which part of the plant cell absorbs light for photosynthesis?", opts: { A: "Chloroplast", B: "Mitochondria", C: "Nucleus", D: "Cell wall" }, ans: "A" },
      ],
      Physics: [
        { q: "What is the speed of light in a vacuum?", opts: { A: "3 × 10⁸ m/s", B: "3 × 10⁶ m/s", C: "3 × 10¹⁰ m/s", D: "3 × 10⁴ m/s" }, ans: "A" },
        { q: "A car travels 100 km in 2 hours. What is its average speed?", opts: { A: "50 km/h", B: "200 km/h", C: "98 km/h", D: "52 km/h" }, ans: "A" },
        { q: "What type of lens is used to correct short-sightedness?", opts: { A: "Concave", B: "Convex", C: "Bifocal", D: "Cylindrical" }, ans: "A" },
        { q: "What is the unit of electrical resistance?", opts: { A: "Ohm", B: "Volt", C: "Ampere", D: "Watt" }, ans: "A" },
        { q: "Which colour of light has the shortest wavelength?", opts: { A: "Violet", B: "Red", C: "Green", D: "Yellow" }, ans: "A" },
      ],
      Chemistry: [
        { q: "What is the chemical symbol for sodium?", opts: { A: "Na", B: "So", C: "Sd", D: "Sn" }, ans: "A" },
        { q: "Which gas is released during photosynthesis?", opts: { A: "Oxygen", B: "Carbon dioxide", C: "Nitrogen", D: "Hydrogen" }, ans: "A" },
        { q: "What type of bond is formed between sodium and chlorine?", opts: { A: "Ionic", B: "Covalent", C: "Metallic", D: "Hydrogen" }, ans: "A" },
        { q: "What is the common name for calcium carbonate?", opts: { A: "Limestone", B: "Quicklime", C: "Slaked lime", D: "Chalk" }, ans: "A" },
        { q: "Which acid is found in the stomach?", opts: { A: "Hydrochloric acid", B: "Sulphuric acid", C: "Nitric acid", D: "Ethanoic acid" }, ans: "A" },
      ],
      Biology: [
        { q: "What is the process by which plants make their own food?", opts: { A: "Photosynthesis", B: "Respiration", C: "Transpiration", D: "Fermentation" }, ans: "A" },
        { q: "Which blood vessel carries blood away from the heart?", opts: { A: "Artery", B: "Vein", C: "Capillary", D: "Aorta" }, ans: "A" },
        { q: "What is the function of the small intestine?", opts: { A: "Absorption of digested food", B: "Production of bile", C: "Storage of faeces", D: "Mechanical digestion" }, ans: "A" },
        { q: "Which organelle is known as the 'powerhouse of the cell'?", opts: { A: "Mitochondria", B: "Nucleus", C: "Ribosome", D: "Golgi body" }, ans: "A" },
        { q: "What type of reproduction involves only one parent?", opts: { A: "Asexual", B: "Sexual", C: "Binary fission", D: "Conjugation" }, ans: "A" },
      ],
      "English Language": [
        { q: "Which of the following is a simile?", opts: { A: "As brave as a lion", B: "The wind whispered", C: "Time is money", D: "The classroom was a zoo" }, ans: "A" },
        { q: "What is the past tense of 'run'?", opts: { A: "Ran", B: "Runned", C: "Running", D: "Runs" }, ans: "A" },
        { q: "Which sentence uses the correct form of 'there/their/they're'?", opts: { A: "They're going to the shops", B: "Their going to the shops", C: "There going to the shops", D: "Theyre going to the shops" }, ans: "A" },
        { q: "What is a noun?", opts: { A: "A naming word", B: "An action word", C: "A describing word", D: "A joining word" }, ans: "A" },
        { q: "Which word is an adjective?", opts: { A: "Beautiful", B: "Quickly", C: "Running", D: "However" }, ans: "A" },
      ],
      "Geography": [
        { q: "What is the capital city of Zimbabwe?", opts: { A: "Harare", B: "Bulawayo", C: "Chitungwiza", D: "Mutare" }, ans: "A" },
        { q: "Which river is the longest in Africa?", opts: { A: "Nile", B: "Congo", C: "Niger", D: "Zambezi" }, ans: "A" },
        { q: "What type of climate does Zimbabwe have?", opts: { A: "Tropical", B: "Arctic", C: "Mediterranean", D: "Desert" }, ans: "A" },
        { q: "What causes seasons on Earth?", opts: { A: "Tilt of Earth's axis", B: "Distance from the sun", C: "Rotation of the Earth", D: "The moon's gravity" }, ans: "A" },
        { q: "Which is the largest province in Zimbabwe by area?", opts: { A: "Matabeleland North", B: "Mashonaland Central", C: "Manicaland", D: "Midlands" }, ans: "A" },
      ],
      "History": [
        { q: "In which year did Zimbabwe gain independence?", opts: { A: "1980", B: "1964", C: "1990", D: "1975" }, ans: "A" },
        { q: "Who was the first President of Zimbabwe?", opts: { A: "Canaan Banana", B: "Robert Mugabe", C: "Joshua Nkomo", D: "Ian Smith" }, ans: "A" },
        { q: "What was the name of the liberation war in Zimbabwe?", opts: { A: "Chimurenga", B: "Intaba", C: "Uhuru", D: "Imbizo" }, ans: "A" },
        { q: "The Great Zimbabwe ruins were built by which people?", opts: { A: "Shona", B: "Ndebele", C: "Portuguese", D: "British" }, ans: "A" },
        { q: "What was the Berlin Conference of 1884-85 about?", opts: { A: "Partitioning Africa among European powers", B: "Ending slavery", C: "Trade agreements", D: "African independence" }, ans: "A" },
      ],
      "Shona": [
        { q: "Chii chinonzi 'mutauro'?", opts: { A: "Mutauro iroyo yekutaurirana", B: "Mutauro irovo", C: "Mutauro igonzo", D: "Mutauro ichembere" }, ans: "A" },
        { q: "Zviratidzo zvekupedzisira muzita rechikamu chii?", opts: { A: "Majino", B: "Zvivakwa", C: "Zviratidzo", D: "Mashoko" }, ans: "A" },
        { q: "Mashoko anonzi 'tsumo' ari kudii?", opts: { A: "Mazwi ane mutsindo uye anopa nharo", B: "Mazwi matsva", C: "Mazwi echinyakare", D: "Mazwi ekurumbidza" }, ans: "A" },
        { q: "Chii chinonzi 'ngano'?", opts: { A: "Nhetembo yechinyakare inotsanangura zvakaitika", B: "Nhoroondo yehupfumi", C: "Mutauro wekutaurirana", D: "Rudzi rwemutauro" }, ans: "A" },
        { q: "Ko 'madziro' chii muShona?", opts: { A: "Chinhu chakavakwa chekudzivirira", B: "Chikafu", C: "Nguo", D: "Chombo" }, ans: "A" },
      ],
    };

    // Get subject-specific fallbacks or use generic
    const subjectQs = mcqBank[subject] || mcqBank["Combined Science"];
    const letters = ["A", "B", "C", "D"];
    return Array.from({ length: count }, (_, i) => {
      const fb = subjectQs[i % subjectQs.length];
      // Shuffle options so correct answer isn't always A
      const entries = Object.entries(fb.opts);
      const correctEntry = entries.find(([k]) => k === fb.ans)!;
      const wrongEntries = entries.filter(([k]) => k !== fb.ans);
      // Rotate position based on question index
      const correctPos = i % 4;
      const shuffled: Record<string, string> = {};
      let wIdx = 0;
      for (let pos = 0; pos < 4; pos++) {
        if (pos === correctPos) {
          shuffled[letters[pos]] = correctEntry[1];
        } else {
          shuffled[letters[pos]] = wrongEntries[wIdx % wrongEntries.length][1];
          wIdx++;
        }
      }
      return {
        question: `${i + 1}. ${fb.q}`,
        options: shuffled,
        correctAnswer: letters[correctPos],
      };
    });
  }
  const mathsNote = subject === "Mathematics A"
    ? "Use Maths A syllabus scope."
    : subject === "Mathematics B"
      ? "Use Maths B syllabus scope, including extended problem solving where appropriate."
      : "";
  return [
    `1. Define two key terms used in ${topic}. ${mathsNote} [4 marks | 2 min]`,
    `2. State and explain two important principles of ${topic} in ${subject}. [4 marks | 2 min]`,
    `3. Apply your knowledge of ${topic} to solve a short ZIMSEC-style problem. Show all working where calculations are needed. [6 marks | 5 min]`,
    `4. A learner is revising ${topic}. Describe and explain the steps they should follow to answer a structured examination question on this area. [8 marks | 5 min]`,
    `5. Evaluate the importance of ${topic} in ${subject}, using clear examples from the ZIMSEC O-Level syllabus. [10 marks | 8 min]`,
  ].slice(0, count);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const { subject, topic, questionCount = 5, examMode = false, paperType = "paper2" } = await req.json();

    const safeSubject = sanitizeString(subject, "subject", 100);
    const safeTopic = sanitizeString(topic, "topic", 200);
    const requestedCount = paperType === "paper1" ? Math.max(Number(questionCount) || 10, 10) : Math.min(Math.max(Number(questionCount) || 5, 1), 5);
    const subjectVariant = safeSubject === "Mathematics A"
      ? "This is Mathematics A. Keep the questions within Maths A scope."
      : safeSubject === "Mathematics B"
        ? "This is Mathematics B. Use Maths B scope and extended ZIMSEC problem solving."
        : "";

    const timeNote = `
TIME ALLOCATION per question:
- Questions 1-2: 2 minutes each (easy recall/definitions)
- Question 3: 5 minutes (medium application)
- Questions 4-5: 8 minutes each (hard analysis/evaluation)
Include [X marks | Y min] at the end of each question to show marks AND suggested time.`;

    const tableNote = `
TABLE FORMATTING (for Accounting and any tabular data):
- Use proper markdown table syntax with pipes and dashes
- Always include a header row with column names
- Align columns neatly`;

    const systemPrompt = paperType === "paper1"
      ? `You are OVI, an expert ZIMSEC O-Level examiner for ${safeSubject}, following the Heritage-Based Curriculum (HBC) syllabus.

Generate exactly ${requestedCount} multiple-choice questions on the topic "${safeTopic}" following ZIMSEC Paper 1 format.
${subjectVariant}

${FORMATTING_PREAMBLE}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Questions 1-3: EASY — Knowledge/Recall level. Test definitions, naming, identifying, stating facts.
- Questions 4-6: MODERATE — Comprehension level. Test understanding and explanation.
- Questions 7-8: MODERATE-HARD — Application level. Test problem-solving and applying concepts.
- Questions 9-10: HARD — Analysis/Evaluation level. Test higher-order thinking.

Each question MUST have exactly 4 options (A, B, C, D) and one correct answer.

DISTRACTOR RULES (CRITICAL — read carefully):
- All 3 wrong options MUST be PLAUSIBLE — they should look like real answers to a student who studied poorly
- For calculation questions: include answers from COMMON ERRORS (wrong formula, arithmetic mistake, forgot to convert units)
- For definition questions: include partial definitions or definitions of RELATED but DIFFERENT terms
- For factual questions: include commonly confused facts or similar-sounding terms
- NEVER use "none of the above" or "all of the above"
- NEVER make distractors obviously silly, unrelated, or generic
- All 4 options should be the SAME TYPE (all numbers, all names, all chemical formulas, etc.)
- Randomise which letter is the correct answer — do NOT always make A correct

Use ZIMSEC-standard language and reflect Zimbabwean context where appropriate.
Time: ~1 minute per question.

EXAMPLE of a GOOD MCQ:
Q: "Solve: 3x - 7 = 14"
Options: A) x = 7  B) x = 3  C) x = 21  D) x = 7/3
Correct: A
Why B is wrong: forgot to add 7 (3x = 7, x = 3)
Why C is wrong: forgot to divide by 3 (x = 21)
Why D is wrong: subtracted instead of added

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": {"A": "option A text", "B": "option B text", "C": "option C text", "D": "option D text"},
      "correctAnswer": "A"
    }
  ]
}`
      : safeSubject === "Principles of Accounting"
        ? `You are OVI, an expert ZIMSEC O-Level Principles of Accounting examiner following the Heritage-Based Curriculum (HBC) syllabus. Generate exactly ${requestedCount} exam-style Paper 2 structured questions on the topic "${safeTopic}" following ZIMSEC format.

${FORMATTING_PREAMBLE}
${timeNote}
${tableNote}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Question 1: EASY (2 min) — Definitions and basic knowledge. [2-4 marks | 2 min]
- Question 2: EASY-MODERATE (2 min) — Short answer comprehension. [4-6 marks | 2 min]
- Question 3: MODERATE (5 min) — Application. A practical question requiring preparation of a simple account, journal entry, or calculation. [6-8 marks | 5 min]
- Question 4: MODERATE-HARD (5 min) — Extended application. A more complex account preparation or multi-step calculation. [8-10 marks | 5 min]
- Question 5: HARD (8 min) — Analysis/Evaluation. Analyse financial data, explain errors, reconcile accounts. [8-12 marks | 8 min]

For questions requiring accounting tables/statements, include a PROPERLY FORMATTED markdown table.
Mark the question with [TABLE] at the start if it requires an accounting table response.
Use realistic Zimbabwean business scenarios with USD amounts.

Return a JSON object: { "questions": ["question 1 text", "question 2 text", ...] }
Each question must include mark allocations AND time allocation like [4 marks | 2 min].`
        : safeSubject === "Literature in English"
          ? `You are OVI, an expert ZIMSEC O-Level Literature in English examiner following the Heritage-Based Curriculum (HBC) syllabus. Generate exactly ${requestedCount} exam-style Paper 2 structured questions on "${safeTopic}" following ZIMSEC format.

ZIMSEC SET BOOKS:
1. "Valley of Tantalika" by Shimmer Chinodya
2. "Jabu" by Tonderai Matasva
3. "Animal Farm" by George Orwell

${timeNote}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Question 1: EASY (2 min) — Recall/Identification. [2-4 marks | 2 min]
- Question 2: EASY-MODERATE (2 min) — Comprehension. Context-based. [4-6 marks | 2 min]
- Question 3: MODERATE (5 min) — Character analysis. [6-8 marks | 5 min]
- Question 4: MODERATE-HARD (5 min) — Thematic analysis. [8-10 marks | 5 min]
- Question 5: HARD (8 min) — Comparative/Evaluative essay. [10-12 marks | 8 min]

${examMode ? "Include passage-based questions with representative quotes from the set books." : ""}

Return a JSON object: { "questions": ["question 1 text", "question 2 text", ...] }
Each question must include mark allocations AND time like [4 marks | 2 min].`
          : `You are OVI, an expert ZIMSEC O-Level examiner for ${safeSubject}, following the Heritage-Based Curriculum (HBC) syllabus. Generate exactly ${requestedCount} exam-style Paper 2 structured questions on the topic "${safeTopic}" following ZIMSEC format.
${subjectVariant}

${FORMATTING_PREAMBLE}
${timeNote}

QUESTION ORDER AND DIFFICULTY PROGRESSION (CRITICAL):
- Question 1: EASY (2 min) — Definitions and basic recall. [2-4 marks | 2 min]
- Question 2: EASY-MODERATE (2 min) — Short comprehension. [4-6 marks | 2 min]
- Question 3: MODERATE (5 min) — Application. [6-8 marks | 5 min]
- Question 4: MODERATE-HARD (5 min) — Extended response. [8-10 marks | 5 min]
- Question 5: HARD (8 min) — Analysis/Evaluation. [8-12 marks | 8 min]

${examMode ? "This is a full mock exam. Include realistic difficulty progression matching actual ZIMSEC papers." : ""}

Include questions that relate to Zimbabwean context where appropriate.

Return a JSON object: { "questions": ["question 1 text", "question 2 text", ...] }
Each question must include mark allocations AND time like [4 marks | 2 min]. Use ZIMSEC command words.`;

    const toolSchema = paperType === "paper1"
      ? {
          type: "function",
          function: {
            name: "return_questions",
            description: "Return the generated MCQ questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      options: {
                        type: "object",
                        properties: {
                          A: { type: "string" },
                          B: { type: "string" },
                          C: { type: "string" },
                          D: { type: "string" },
                        },
                        required: ["A", "B", "C", "D"],
                        additionalProperties: false,
                      },
                      correctAnswer: { type: "string" },
                    },
                    required: ["question", "options", "correctAnswer"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        }
      : {
          type: "function",
          function: {
            name: "return_questions",
            description: "Return the generated exam questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of exam question strings",
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        };

    let questions: any[] = [];
    let provider = "fallback";
    try {
      const result = await aiComplete({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate exactly ${requestedCount} ${paperType === "paper1" ? "multiple-choice" : "Paper 2 structured"} ZIMSEC O-Level HBC ${safeSubject} questions on: ${safeTopic}. Question 1 = easiest (definitions/recall, 2 min); end with the hardest (analysis/evaluation, 8 min). Include per-question time allocation.` },
        ],
        tools: [toolSchema],
        toolChoice: { type: "function", function: { name: "return_questions" } },
        timeoutMs: 20_000,
        maxTokens: paperType === "paper1" ? 3000 : 2600,
      });

      if ("stream" in result) throw new Error("unexpected stream");
      if (!result.toolCall) throw new Error("No questions returned");
      questions = normaliseQuestions(result.toolCall.arguments.questions, paperType, requestedCount);
      provider = result.provider;
    } catch (e) {
      console.error("AI generation failed, using stable fallback questions:", e);
    }

    if (questions.length < requestedCount) {
      questions = fallbackQuestions(safeSubject, safeTopic, paperType, requestedCount);
      provider = provider === "fallback" ? "fallback" : `${provider}+fallback`;
    }

    return new Response(JSON.stringify({ questions, paperType, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-assessment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
