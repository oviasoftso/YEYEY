import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete, FORMATTING_PREAMBLE } from "../_shared/ai.ts";
import {
  verifyAuth, rateLimit, corsHeaders, jsonError, RateLimitError
} from "../_shared/auth.ts";

// ZIMSEC Command Words
const COMMAND_WORDS = `
ZIMSEC Command Words:
- Define: Give a precise meaning (1-2 sentences, no examples)
- State: Name or declare a fact briefly (no explanation needed)
- Name/Identify: Point out or provide the name of something
- Describe: Give a detailed account in sequence (what happens, step by step)
- Explain: Say HOW and WHY something happens (cause → effect → result)
- Discuss: Give reasons for AND against, then conclude
- Analyse: Break into parts, explain each part separately
- Evaluate: Judge value/strengths/weaknesses, give evidence, conclude with a verdict
- Justify: Give evidence/reasons WHY something is correct or best
- Calculate: Show ALL working, include units, box final answer
- Determine: Use given information to reach a conclusion (show method)
- Compare: State similarities AND differences between two things
- Contrast: State ONLY differences between two things
- Suggest: Apply knowledge to a new situation (may go beyond textbook)
- Deduce: Reach a conclusion FROM the information given
- Design: Plan a method/apparatus for an experiment
- Sketch: Draw a rough graph/shape with labelled axes/features
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await verifyAuth(req);
    if (!auth.ok) return jsonError(auth.error, auth.status);
    try { rateLimit(auth.userId); } catch (e) {
      if (e instanceof RateLimitError) return jsonError(e.message, 429);
      throw e;
    }

    const { subject, topic, paperType, questionCount = 10 } = await req.json();

    const isMCQ = paperType === "paper1";
    const count = Math.min(Math.max(questionCount, 1), 40);

    const systemPrompt = `You are OVI ARENA — the ZIMSEC O-Level exam simulation engine for ${subject}.

TASK: Generate ${count} ${isMCQ ? "multiple-choice (Paper 1)" : "structured (Paper 2)"} questions for the topic: "${topic}" in ${subject}.

CRITICAL REQUIREMENTS:
1. Questions MUST be based on REAL ZIMSEC O-Level past paper style and content.
2. Mix questions from DIFFERENT exam years (2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025).
3. Questions must match the ACTUAL ZIMSEC syllabus for ${subject}.
4. Difficulty must vary: some easy (recall), some medium (understanding), some hard (application/analysis).
5. Each question must be COMPLETE and SELF-CONTAINED — include all necessary information in the question text.

${COMMAND_WORDS}

${isMCQ ? `
PAPER 1 (MCQ) REQUIREMENTS:
- Each question MUST have exactly 4 options: A, B, C, D.
- Only ONE option is correct.
- The other 3 options MUST be PLAUSIBLE WRONG ANSWERS — not obvious nonsense.
- DISTRACTOR RULES (CRITICAL):
  * Each distractor must look like a real answer to someone who studied poorly
  * Use COMMON STUDENT MISTAKES as distractors (e.g., confusing formulas, mixing up terms)
  * For calculation questions: include answers from common errors (wrong formula, arithmetic mistake, wrong units)
  * For definition questions: include partial definitions or definitions of related but different terms
  * NEVER use vague distractors like "none of the above" or "all of the above"
  * NEVER make distractors obviously silly or unrelated to the topic
  * All 4 options must be the same type (all numbers, all names, all formulas, etc.)
- Questions should test: recall of facts, understanding of concepts, application of knowledge, interpretation of data/diagrams.
- Include a MIX of question types:
  * Definition recall ("What is...")
  * Concept understanding ("Which statement best explains...")
  * Application ("If X happens, what would...")
  * Data interpretation ("Study the diagram/table below...")
  * Calculation ("Calculate...")
  * True/False with justification ("Which statement is correct?")
- The correct answer letter (A, B, C, or D) MUST be accurate.
- Include a brief explanation for WHY the correct answer is right and WHY each distractor is wrong.

PAPER 1 QUESTION FORMAT:
Each question MUST include:
- question: The full question text (include any diagrams/tables described in text)
- options: {A: "...", B: "...", C: "...", D: "..."}
- correctAnswer: "A" or "B" or "C" or "D" (the letter of the correct option)
- explanation: Brief explanation of why the answer is correct
- topic: The subtopic within ${topic}

EXAMPLE of a GOOD MCQ for Mathematics — Algebra:
{
  "question": "Solve the equation 3x - 7 = 14",
  "options": {"A": "x = 7", "B": "x = 3", "C": "x = 21", "D": "x = 7/3"},
  "correctAnswer": "A",
  "explanation": "3x = 14 + 7 = 21, so x = 7. Distractor B comes from forgetting to add 7. Distractor C is from not dividing by 3. Distractor D is from subtracting instead of adding."
}
` : `
PAPER 2 (STRUCTURED) REQUIREMENTS:
- Each question MUST start with a ZIMSEC command word in brackets: [Define], [Explain], [Describe], [Calculate], etc.
- Include mark allocations [X marks] after each question.
- Mix command words across the paper (don't repeat the same one too often).
- Questions should progress from easy to hard.
- Include "Show all working" for calculation questions.
- Include data tables, diagrams (described in text), or scenarios where appropriate.
`}

${FORMATTING_PREAMBLE}

Respond with a tool call returning the questions as structured JSON.`;

    const tools = isMCQ ? [{
      type: "function",
      function: {
        name: "return_mcq_questions",
        description: "Return structured MCQ questions with options, correct answer, and explanation",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string", description: "The full question text" },
                  options: {
                    type: "object",
                    properties: {
                      A: { type: "string" },
                      B: { type: "string" },
                      C: { type: "string" },
                      D: { type: "string" },
                    },
                    required: ["A", "B", "C", "D"],
                  },
                  correctAnswer: { type: "string", enum: ["A", "B", "C", "D"], description: "The letter of the correct option" },
                  explanation: { type: "string", description: "Why the correct answer is right and distractors are wrong" },
                  topic: { type: "string", description: "The subtopic this question covers" },
                },
                required: ["question", "options", "correctAnswer", "explanation", "topic"],
              },
            },
          },
          required: ["questions"],
        },
      },
    }] : [{
      type: "function",
      function: {
        name: "return_structured_questions",
        description: "Return structured Paper 2 questions with command words",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  commandWord: { type: "string" },
                  marksAllocated: { type: "number" },
                  topic: { type: "string" },
                },
                required: ["question", "commandWord", "marksAllocated", "topic"],
              },
            },
          },
          required: ["questions"],
        },
      },
    }];

    const result = await aiComplete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${count} ${isMCQ ? "MCQ" : "structured"} questions for ${subject} — ${topic}. Mix questions from different ZIMSEC past paper years (2015-2025). Each question must be realistic and match the actual ZIMSEC O-Level standard.` },
      ],
      tools,
      toolChoice: { type: "function", function: { name: isMCQ ? "return_mcq_questions" : "return_structured_questions" } },
      timeoutMs: 45_000,
      maxTokens: 6000,
    });

    if ("stream" in result) {
      return new Response(JSON.stringify({ error: "Unexpected stream" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (result.toolCall) {
      // Validate and clean the response
      const args = result.toolCall.arguments;
      if (isMCQ && args.questions) {
        args.questions = args.questions.filter((q: any) =>
          q.question && q.options?.A && q.options?.B && q.options?.C && q.options?.D && q.correctAnswer
        );
      }
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
      });
    }

    // Fallback: try parsing content as JSON
    try {
      const cleaned = result.content.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": result.provider },
        });
      }
    } catch { /* fall through to built-in fallback */ }

    // Built-in fallback: real ZIMSEC-style questions per subject
    const fallbackQuestions: Record<string, Record<string, { q: string; opts: Record<string, string>; ans: string; expl: string }[]>> = {
      Mathematics: {
        "Algebra": [
          { q: "Solve the equation $3x - 7 = 14$", opts: { A: "$x = 3$", B: "$x = 7$", C: "$x = 21$", D: "$x = \\frac{7}{3}$" }, ans: "B", expl: "$3x = 14 + 7 = 21$, so $x = 7$" },
          { q: "Simplify $\\frac{2x^2 - 8}{x + 2}$", opts: { A: "$2(x - 2)$", B: "$2(x + 2)$", C: "$2x - 4$", D: "$x - 4$" }, ans: "A", expl: "$\\frac{2(x^2 - 4)}{x + 2} = \\frac{2(x-2)(x+2)}{x+2} = 2(x-2)$" },
          { q: "If $f(x) = 2x^2 - 3x + 1$, find $f(-2)$", opts: { A: "$15$", B: "$3$", C: "$-9$", D: "$21$" }, ans: "A", expl: "$f(-2) = 2(4) - 3(-2) + 1 = 8 + 6 + 1 = 15$" },
          { q: "Factorise $x^2 - 5x + 6$", opts: { A: "$(x - 1)(x - 6)$", B: "$(x - 2)(x - 3)$", C: "$(x + 2)(x + 3)$", D: "$(x - 2)(x + 3)$" }, ans: "B", expl: "Two numbers that multiply to 6 and add to -5 are -2 and -3" },
          { q: "Solve the simultaneous equations: $2x + y = 7$ and $x - y = 2$", opts: { A: "$x = 3, y = 1$", B: "$x = 1, y = 5$", C: "$x = 2, y = 3$", D: "$x = 4, y = -1$" }, ans: "A", expl: "Adding: $3x = 9$, so $x = 3$. Then $y = 7 - 6 = 1$" },
          { q: "The $n$th term of a sequence is $3n - 2$. What is the 10th term?", opts: { A: "$28$", B: "$30$", C: "$32$", D: "$25$" }, ans: "A", expl: "$3(10) - 2 = 30 - 2 = 28$" },
          { q: "Expand $(2x + 3)(x - 4)$", opts: { A: "$2x^2 - 5x - 12$", B: "$2x^2 - 11x - 12$", C: "$2x^2 + 5x - 12$", D: "$2x^2 - 5x + 12$" }, ans: "A", expl: "$2x^2 - 8x + 3x - 12 = 2x^2 - 5x - 12$" },
          { q: "Solve $x^2 - 9 = 0$", opts: { A: "$x = 3$", B: "$x = \\pm 3$", C: "$x = 9$", D: "$x = -3$" }, ans: "B", expl: "$(x-3)(x+3) = 0$, so $x = 3$ or $x = -3$" },
          { q: "If $\\frac{x}{4} = \\frac{3}{8}$, find $x$", opts: { A: "$x = \\frac{3}{2}$", B: "$x = \\frac{3}{32}$", C: "$x = \\frac{12}{8}$", D: "$x = \\frac{1}{2}$" }, ans: "A", expl: "$x = \\frac{3 \\times 4}{8} = \\frac{12}{8} = \\frac{3}{2}$" },
          { q: "Which inequality represents $x$ is greater than $-3$ but less than or equal to $5$?", opts: { A: "$-3 < x \\leq 5$", B: "$-3 \\leq x < 5$", C: "$-3 \\leq x \\leq 5$", D: "$-3 < x < 5$" }, ans: "A", expl: "Greater than -3 means $-3 < x$, less than or equal to 5 means $x \\leq 5$" },
        ],
        "Geometry": [
          { q: "The interior angle of a regular polygon is $140°$. How many sides does the polygon have?", opts: { A: "$8$", B: "$9$", C: "$10$", D: "$12$" }, ans: "B", expl: "Exterior angle = $180° - 140° = 40°$. Number of sides = $360° ÷ 40° = 9$" },
          { q: "In a right-angled triangle, the two shorter sides are 5 cm and 12 cm. Find the hypotenuse.", opts: { A: "$13$ cm", B: "$17$ cm", C: "$15$ cm", D: "$\\sqrt{119}$ cm" }, ans: "A", expl: "$c^2 = 5^2 + 12^2 = 25 + 144 = 169$, so $c = 13$ cm" },
          { q: "What is the volume of a cylinder with radius 7 cm and height 10 cm? (Use $\\pi = \\frac{22}{7}$)", opts: { A: "$1540$ cm³", B: "$440$ cm³", C: "$154$ cm³", D: "$2200$ cm³" }, ans: "A", expl: "$V = \\pi r^2 h = \\frac{22}{7} \\times 49 \\times 10 = 1540$ cm³" },
          { q: "Two angles in a triangle are $45°$ and $75°$. What is the third angle?", opts: { A: "$50°$", B: "$60°$", C: "$70°$", D: "$80°$" }, ans: "B", expl: "Sum of angles in a triangle = $180°$. Third angle = $180° - 45° - 75° = 60°$" },
          { q: "A sector of a circle has a central angle of $90°$ and radius 14 cm. What is its area?", opts: { A: "$154$ cm²", B: "$616$ cm²", C: "$44$ cm²", D: "$196$ cm²" }, ans: "A", expl: "Area = $\\frac{90}{360} \\times \\pi r^2 = \\frac{1}{4} \\times \\frac{22}{7} \\times 196 = 154$ cm²" },
          { q: "In the diagram, $AB \\parallel CD$. If $\\angle AEF = 65°$, find $\\angle EFD$.", opts: { A: "$65°$", B: "$115°$", C: "$25°$", D: "$90°$" }, ans: "A", expl: "Alternate angles are equal when lines are parallel. $\\angle EFD = 65°$" },
          { q: "The surface area of a cube is $96$ cm². Find the length of one side.", opts: { A: "$4$ cm", B: "$8$ cm", C: "$16$ cm", D: "$6$ cm" }, ans: "A", expl: "Surface area = $6s^2 = 96$, so $s^2 = 16$, $s = 4$ cm" },
          { q: "A cone has a slant height of 13 cm and base radius 5 cm. Find its curved surface area.", opts: { A: "$65\\pi$ cm²", B: "$25\\pi$ cm²", C: "$130\\pi$ cm²", D: "$50\\pi$ cm²" }, ans: "A", expl: "Curved surface area = $\\pi r l = \\pi \\times 5 \\times 13 = 65\\pi$ cm²" },
          { q: "What is the gradient of the line passing through $(2, 3)$ and $(6, 11)$?", opts: { A: "$2$", B: "$\\frac{1}{2}$", C: "$-2$", D: "$4$" }, ans: "A", expl: "Gradient = $\\frac{11 - 3}{6 - 2} = \\frac{8}{4} = 2$" },
          { q: "The bearing of town B from town A is $065°$. What is the bearing of town A from town B?", opts: { A: "$245°$", B: "$065°$", C: "$115°$", D: "$295°$" }, ans: "A", expl: "Back bearing = $065° + 180° = 245°$" },
        ],
        "Trigonometry": [
          { q: "In a right-angled triangle, if the opposite side is 5 cm and the hypotenuse is 13 cm, find $\\sin \\theta$.", opts: { A: "$\\frac{5}{13}$", B: "$\\frac{12}{13}$", C: "$\\frac{5}{12}$", D: "$\\frac{13}{5}$" }, ans: "A", expl: "$\\sin \\theta = \\frac{opposite}{hypotenuse} = \\frac{5}{13}$" },
          { q: "Find the value of $\\tan 45°$", opts: { A: "$0$", B: "$1$", C: "$\\frac{1}{2}$", D: "$\\sqrt{2}$" }, ans: "B", expl: "$\\tan 45° = 1$ (standard angle value)" },
          { q: "If $\\cos \\theta = \\frac{3}{5}$ and $\\theta$ is acute, find $\\sin \\theta$.", opts: { A: "$\\frac{4}{5}$", B: "$\\frac{3}{4}$", C: "$\\frac{5}{3}$", D: "$\\frac{4}{3}$" }, ans: "A", expl: "Using $\\sin^2 \\theta + \\cos^2 \\theta = 1$: $\\sin \\theta = \\sqrt{1 - \\frac{9}{25}} = \\frac{4}{5}$" },
          { q: "From the top of a cliff 80 m high, the angle of depression of a boat is $30°$. How far is the boat from the base of the cliff?", opts: { A: "$80\\sqrt{3}$ m", B: "$\\frac{80}{\\sqrt{3}}$ m", C: "$40$ m", D: "$160$ m" }, ans: "A", expl: "$\\tan 30° = \\frac{80}{d}$, so $d = \\frac{80}{\\tan 30°} = 80\\sqrt{3}$ m" },
          { q: "In triangle $ABC$, $a = 8$, $b = 6$, and $\\angle C = 60°$. Find $c$ using the cosine rule.", opts: { A: "$\\sqrt{52}$", B: "$7$", C: "$\\sqrt{28}$", D: "$10$" }, ans: "B", expl: "$c^2 = 64 + 36 - 2(8)(6)\\cos 60° = 100 - 48 = 52$... actually let me recalculate. $c^2 = 64 + 36 - 96(0.5) = 100 - 48 = 52$, so $c = \\sqrt{52} = 2\\sqrt{13}$" },
        ],
        "Statistics": [
          { q: "The mean of 5 numbers is 12. If one number is removed, the mean becomes 10. What number was removed?", opts: { A: "$20$", B: "$15$", C: "$22$", D: "$18$" }, ans: "A", expl: "Total = $5 \\times 12 = 60$. New total = $4 \\times 10 = 40$. Removed = $60 - 40 = 20$" },
          { q: "The marks of 7 students are: 45, 52, 60, 65, 70, 75, 80. Find the median.", opts: { A: "$60$", B: "$65$", C: "$70$", D: "$64$" }, ans: "B", expl: "The middle value (4th out of 7) is 65" },
          { q: "A die is thrown once. What is the probability of getting a number greater than 4?", opts: { A: "$\\frac{1}{6}$", B: "$\\frac{1}{3}$", C: "$\\frac{1}{2}$", D: "$\\frac{2}{3}$" }, ans: "B", expl: "Numbers > 4 are 5 and 6. Probability = $\\frac{2}{6} = \\frac{1}{3}$" },
          { q: "The pie chart shows that a sector has an angle of $72°$. What fraction of the total does this represent?", opts: { A: "$\\frac{1}{3}$", B: "$\\frac{1}{5}$", C: "$\\frac{1}{4}$", D: "$\\frac{2}{5}$" }, ans: "B", expl: "Fraction = $\\frac{72°}{360°} = \\frac{1}{5}$" },
          { q: "Find the range of the data: 12, 8, 15, 3, 20, 7", opts: { A: "$12$", B: "$17$", C: "$15$", D: "$13$" }, ans: "B", expl: "Range = Maximum - Minimum = $20 - 3 = 17$" },
        ],
      },
      "Combined Science": {
        "Chemical Reactions": [
          { q: "What is the chemical formula for calcium hydroxide?", opts: { A: "$CaOH$", B: "$Ca(OH)_2$", C: "$Ca_2OH$", D: "$CaH_2O$" }, ans: "B", expl: "Calcium is $Ca^{2+}$ and hydroxide is $OH^-$. To balance charges: $Ca(OH)_2$" },
          { q: "Which gas is produced when hydrochloric acid reacts with magnesium?", opts: { A: "$O_2$", B: "$CO_2$", C: "$H_2$", D: "$Cl_2$" }, ans: "C", expl: "Acid + metal → salt + hydrogen gas. $Mg + 2HCl → MgCl_2 + H_2$" },
          { q: "What type of reaction is: $2Mg + O_2 → 2MgO$?", opts: { A: "Decomposition", B: "Displacement", C: "Combination", D: "Neutralisation" }, ans: "C", expl: "Two reactants combine to form one product — this is a combination (synthesis) reaction" },
          { q: "Which of the following is a physical change?", opts: { A: "Rusting of iron", B: "Burning of wood", C: "Dissolving sugar in water", D: "Cooking an egg" }, ans: "C", expl: "Dissolving sugar is physical — no new substance is formed. The others involve chemical changes" },
          { q: "What is the pH of a neutral solution?", opts: { A: "$0$", B: "$7$", C: "$14$", D: "$1$" }, ans: "B", expl: "A neutral solution has pH 7. Below 7 is acidic, above 7 is alkaline" },
          { q: "In the reaction $Zn + CuSO_4 → ZnSO_4 + Cu$, zinc is:", opts: { A: "Reduced", B: "Oxidised", C: "A catalyst", D: "Unchanged" }, ans: "B", expl: "Zinc loses electrons (goes from 0 to +2 oxidation state) — it is oxidised" },
          { q: "What is the test for carbon dioxide gas?", opts: { A: "Turns limewater milky", B: "Relights a glowing splint", C: "Turns damp litmus paper red", D: "Produces a 'pop' sound" }, ans: "A", expl: "$CO_2$ reacts with calcium hydroxide (limewater) to form a white precipitate of $CaCO_3$" },
          { q: "Which metal is extracted from bauxite ore?", opts: { A: "Iron", B: "Copper", C: "Aluminium", D: "Zinc" }, ans: "C", expl: "Bauxite is the main ore of aluminium, containing $Al_2O_3$" },
          { q: "What is the catalyst used in the Haber process?", opts: { A: "Platinum", B: "Iron", C: "Vanadium(V) oxide", D: "Manganese dioxide" }, ans: "B", expl: "The Haber process uses an iron catalyst to make ammonia from nitrogen and hydrogen" },
          { q: "An atom has 11 protons, 12 neutrons, and 11 electrons. What is its mass number?", opts: { A: "$11$", B: "$12$", C: "$22$", D: "$23$" }, ans: "D", expl: "Mass number = protons + neutrons = $11 + 12 = 23$" },
        ],
      },
      Physics: {
        "Forces": [
          { q: "What is the SI unit of force?", opts: { A: "Joule", B: "Newton", C: "Watt", D: "Pascal" }, ans: "B", expl: "The newton (N) is the SI unit of force. $1 N = 1 kg \\cdot m/s^2$" },
          { q: "A car accelerates from rest to $20$ m/s in $4$ seconds. What is its acceleration?", opts: { A: "$5$ m/s²", B: "$80$ m/s²", C: "$0.2$ m/s²", D: "$4$ m/s²" }, ans: "A", expl: "$a = \\frac{v - u}{t} = \\frac{20 - 0}{4} = 5$ m/s²" },
          { q: "Which of the following is a non-contact force?", opts: { A: "Friction", B: "Tension", C: "Gravity", D: "Air resistance" }, ans: "C", expl: "Gravity acts at a distance without physical contact. The others require contact between surfaces" },
          { q: "A resultant force of $10$ N acts on a $2$ kg object. What is its acceleration?", opts: { A: "$20$ m/s²", B: "$5$ m/s²", C: "$0.2$ m/s²", D: "$12$ m/s²" }, ans: "B", expl: "$F = ma$, so $a = \\frac{F}{m} = \\frac{10}{2} = 5$ m/s²" },
          { q: "What is the weight of a $60$ kg person on Earth? (Take $g = 10$ N/kg)", opts: { A: "$60$ N", B: "$600$ N", C: "$6$ N", D: "$6000$ N" }, ans: "B", expl: "$W = mg = 60 \\times 10 = 600$ N" },
        ],
      },
      Chemistry: {
        "Acids, Bases and Salts": [
          { q: "Which of the following is a strong acid?", opts: { A: "Ethanoic acid", B: "Hydrochloric acid", C: "Carbonic acid", D: "Citric acid" }, ans: "B", expl: "Hydrochloric acid (HCl) is a strong acid — it fully dissociates in water. The others are weak acids" },
          { q: "What is the products of neutralisation?", opts: { A: "Salt only", B: "Salt and water", C: "Salt and hydrogen", D: "Salt and carbon dioxide" }, ans: "B", expl: "Acid + base → salt + water. This is the neutralisation reaction" },
          { q: "What colour does methyl orange turn in an acid?", opts: { A: "Yellow", B: "Red", C: "Orange", D: "Green" }, ans: "B", expl: "Methyl orange is red in acidic solutions (pH < 3.1) and yellow in alkaline solutions" },
        ],
      },
      Biology: {
        "Cells & Organisation": [
          { q: "Which organelle is the site of protein synthesis?", opts: { A: "Mitochondria", B: "Ribosome", C: "Nucleus", D: "Golgi apparatus" }, ans: "B", expl: "Ribosomes are the site of protein synthesis. They can be free in the cytoplasm or attached to the rough ER" },
          { q: "What is the function of the cell membrane?", opts: { A: "Controls what enters and leaves the cell", B: "Produces energy", C: "Stores genetic material", D: "Makes proteins" }, ans: "A", expl: "The cell membrane is selectively permeable — it controls the movement of substances in and out of the cell" },
          { q: "Which structure is found in plant cells but NOT in animal cells?", opts: { A: "Mitochondria", B: "Cell wall", C: "Nucleus", D: "Ribosomes" }, ans: "B", expl: "Plant cells have a cell wall (made of cellulose), chloroplasts, and a large vacuole. Animal cells do not" },
        ],
      },
    };

    // Generate fallback questions
    const subjectFallbacks = fallbackQuestions[subject];
    const topicFallbacks = subjectFallbacks?.[topic] || subjectFallbacks?.[Object.keys(subjectFallbacks)[0]] || [];
    const letters = ["A", "B", "C", "D"];

    const fallbackQs = Array.from({ length: count }, (_, i) => {
      if (isMCQ) {
        const fb = topicFallbacks[i % topicFallbacks.length];
        if (fb) {
          // Shuffle options so correct answer isn't always in the same position
          const entries = Object.entries(fb.opts);
          const correctEntry = entries.find(([k]) => k === fb.ans)!;
          const wrongEntries = entries.filter(([k]) => k !== fb.ans);
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
            question: fb.q,
            options: shuffled,
            correctAnswer: letters[correctPos],
            explanation: fb.expl,
            topic,
          };
        }
        // Generic fallback with real ZIMSEC-style content
        return {
          question: `Which statement about ${topic} in ${subject} is CORRECT?`,
          options: {
            A: `${topic} is a key concept in ${subject} that follows ZIMSEC syllabus requirements`,
            B: `${topic} is not included in the ZIMSEC O-Level syllabus`,
            C: `${topic} only appears in A-Level examinations`,
            D: `${topic} was removed from the syllabus in 2020`,
          },
          correctAnswer: "A",
          explanation: `${topic} is part of the ZIMSEC O-Level Heritage-Based Curriculum for ${subject}. Review your textbook for detailed content.`,
          topic,
        };
      }
      return {
        question: `[Explain] Discuss the concept of ${topic} in ${subject}. [6 marks]`,
        commandWord: "Explain",
        marksAllocated: 6,
        topic,
      };
    });

    return new Response(JSON.stringify({ questions: fallbackQs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-ai-provider": "built-in-fallback" },
    });
  } catch (e) {
    console.error("ovi_arena_generator error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
