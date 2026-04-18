const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ── Rate limiter: max 25 requests/min (safely under Groq free tier 30/min) ──
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 25;
const requestTimestamps: number[] = [];

// ── In-memory response cache (24h TTL) ──────────────────────────────────────
const responseCache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { responseCache.delete(key); return null; }
  return entry.value;
}

function setCache(key: string, value: string) {
  responseCache.set(key, { value, ts: Date.now() });
}

export async function waitForRateLimit(): Promise<void> {
  while (true) {
    const now = Date.now();
    while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_WINDOW_MS) {
      requestTimestamps.shift();
    }
    if (requestTimestamps.length < MAX_REQUESTS_PER_WINDOW) {
      requestTimestamps.push(now);
      return;
    }
    const waitMs = RATE_WINDOW_MS - (now - requestTimestamps[0]) + 200;
    console.log(`[RateLimit] Throttling — waiting ${Math.round(waitMs / 1000)}s`);
    await new Promise(r => setTimeout(r, waitMs));
  }
}

export interface Question {
  id: string;
  topicId: string;
  type: 'MCQ' | 'ShortAnswer';
  difficulty: number;
  text: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

function stripJson(text: string): string {
  return text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function callGroq(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY || '';
  if (!key || key === 'your_groq_api_key_here' || key.length < 10) {
    throw new Error('GROQ_API_KEY not configured');
  }
  const cacheKey = prompt.slice(0, 200);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[Cache] HIT — skipping Groq call');
    return cached;
  }
  await waitForRateLimit();
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });
  const data = await response.json() as any;
  if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
  const text = data?.choices?.[0]?.message?.content || '';
  setCache(cacheKey, text);
  return text;
}

// ── Domain context: question style + terminology + example topics per domain ──
const DOMAIN_CONTEXT: Record<string, {
  style: string;
  terminology: string;
  exampleQuestions: string;
}> = {
  DSA: {
    style: 'Focus on time/space complexity analysis, code tracing, algorithm selection, and edge cases. Include questions about Big-O notation, comparing algorithms, and choosing the right data structure.',
    terminology: 'Use terms like: O(n), O(log n), in-place, stable sort, amortized, memoization, dynamic programming, adjacency list, traversal, recursion base case.',
    exampleQuestions: 'What is the time complexity of...? Which data structure is best suited for...? Trace through this algorithm with input [1,3,2]... What is the space complexity of...?',
  },
  ML: {
    style: 'Focus on model behavior, math intuition, hyperparameter effects, and when to use which algorithm. Include questions about overfitting, evaluation metrics, and data preprocessing.',
    terminology: 'Use terms like: gradient descent, learning rate, epoch, loss function, regularization (L1/L2), precision, recall, F1-score, train/val/test split, feature engineering, activation function.',
    exampleQuestions: 'What happens to a model when the learning rate is too high? Which metric is most appropriate when classes are imbalanced? What is the effect of adding L2 regularization?',
  },
  WebDev: {
    style: 'Focus on how the web works, browser behavior, API design, and real-world code patterns. Include questions about HTTP, DOM, React hooks, async JavaScript, and security.',
    terminology: 'Use terms like: event loop, closure, promise, REST, HTTP status codes, CORS, virtual DOM, useState, useEffect, SQL JOIN, middleware, JWT.',
    exampleQuestions: 'What is the output of this JavaScript code? What HTTP status code should be returned when...? What is wrong with this React component? How would you fix this SQL query?',
  },
  SystemDesign: {
    style: 'Focus on trade-offs, scalability decisions, and real-world architecture scenarios. Ask about why one approach is better than another, not just definitions.',
    terminology: 'Use terms like: horizontal scaling, CAP theorem, eventual consistency, single point of failure, sharding key, cache eviction policy, message queue, service mesh, rate limiting.',
    exampleQuestions: 'You need to design a URL shortener for 1 billion users. What bottleneck would appear first? Why would you choose Redis over Memcached for...? What is the trade-off between consistency and availability?',
  },
  CloudComputing: {
    style: 'Focus on practical cloud decisions, cost optimisation, and when to use which cloud service. Include questions about deployment, networking, and managed services.',
    terminology: 'Use terms like: auto-scaling group, VPC, subnet, IAM role, S3 bucket, Lambda cold start, Kubernetes pod, container registry, ingress controller, cloud-native.',
    exampleQuestions: 'Which AWS service would you use for...? What is the difference between a security group and a NACL? When should you use serverless vs containers? What causes a Lambda cold start?',
  },
  DataScience: {
    style: 'Focus on data analysis decisions, statistical reasoning, and practical Python/SQL tasks. Include questions about choosing the right visualization, handling missing data, and interpreting results.',
    terminology: 'Use terms like: p-value, null hypothesis, standard deviation, quartile, outlier, correlation vs causation, NaN, pivot table, GROUP BY, window function, cross-validation.',
    exampleQuestions: 'A dataset has 20% missing values. What would you do? What does a p-value of 0.03 indicate? Which type of chart best represents...? What is the difference between INNER JOIN and LEFT JOIN?',
  },
  CyberSecurity: {
    style: 'Focus on attack scenarios, defence mechanisms, and identifying vulnerabilities. Include questions about recognising attack types, applying the right control, and understanding protocols.',
    terminology: 'Use terms like: SQL injection, XSS, CSRF, phishing, man-in-the-middle, symmetric encryption, hash collision, privilege escalation, zero-day, penetration test, SIEM, CIA triad.',
    exampleQuestions: 'A user receives an email asking for their password. What type of attack is this? Which HTTP header prevents XSS? What is the difference between authentication and authorisation? How does TLS prevent MITM attacks?',
  },
  ProductManagement: {
    style: 'Focus on prioritisation frameworks, stakeholder scenarios, and product decision making. Ask about real product situations — not definitions. Include questions about metrics, trade-offs, and user research.',
    terminology: 'Use terms like: OKR, North Star metric, RICE score, MoSCoW, user story, acceptance criteria, A/B test, churn rate, NPS, product-market fit, MVP, sprint backlog.',
    exampleQuestions: 'Your North Star metric dropped 15% this week. What is your first step? Two features have equal RICE scores. How do you decide? A stakeholder wants to add a feature not on the roadmap. How do you handle it?',
  },
  BusinessAnalytics: {
    style: 'Focus on interpreting data, choosing the right analysis, and business decision scenarios. Include questions about Excel functions, SQL queries, chart selection, and KPI interpretation.',
    terminology: 'Use terms like: VLOOKUP, pivot table, DAX, CAGR, conversion rate, cohort analysis, variance analysis, regression, confidence interval, dashboard KPI, YoY growth.',
    exampleQuestions: 'Sales dropped 20% in Q3 vs Q2. What analysis would you run? Which Excel function retrieves a value from a table by row and column? What does a negative R-squared value indicate? Write a SQL query that shows monthly revenue.',
  },
  DigitalMarketing: {
    style: 'Focus on campaign decisions, metric interpretation, and platform-specific knowledge. Ask about choosing the right channel, diagnosing campaign problems, and optimising ROI.',
    terminology: 'Use terms like: CTR, CPC, ROAS, conversion rate, bounce rate, impression share, Quality Score, meta description, backlink, engagement rate, lookalike audience, attribution model.',
    exampleQuestions: 'Your Google Ads CTR is 0.5% but conversion rate is 8%. What does this tell you? Which SEO factor has the highest impact on ranking? A campaign has high impressions but low clicks — what would you change? What is the difference between first-touch and last-touch attribution?',
  },
  UXDesign: {
    style: 'Focus on design decisions, usability principles, and interpreting user research. Ask about when to use which design method, identifying UX problems, and Figma/prototyping concepts.',
    terminology: 'Use terms like: affordance, mental model, cognitive load, information architecture, wireframe, prototype fidelity, usability test, heuristic evaluation, gestalt principles, accessibility (WCAG), SUS score.',
    exampleQuestions: 'A user repeatedly misses a key button in testing. What might be causing this? What is the difference between a wireframe and a prototype? Which Nielsen heuristic is violated when error messages are unclear? How would you prioritise findings from a usability study?',
  },
  Finance: {
    style: 'Focus on financial calculations, interpreting financial statements, and investment decision making. Include questions about reading ratios, understanding valuations, and applying financial concepts.',
    terminology: 'Use terms like: P/E ratio, EBITDA, DCF, NPV, IRR, current ratio, ROE, free cash flow, depreciation, amortisation, dividend yield, beta, risk-free rate, working capital.',
    exampleQuestions: 'A company has a P/E of 5x while its industry average is 15x. What might this indicate? Calculate the NPV of a project with cash flows of... Which financial statement shows a company\'s liquidity? What does a high debt-to-equity ratio suggest?',
  },
  Psychology: {
    style: 'Focus on psychological theories, research studies, clinical applications, and behaviour explanation. Ask about applying psychological concepts to real scenarios, not just reciting definitions.',
    terminology: 'Use terms like: cognitive dissonance, classical conditioning, operant conditioning, reinforcement schedule, attachment theory, defense mechanism, confirmation bias, self-efficacy, schema, neuroplasticity, DSM-5.',
    exampleQuestions: 'A child fears dogs after being bitten. Which conditioning explains this? According to Maslow, why might a person in poverty struggle to pursue education? What cognitive bias leads people to seek information that confirms their beliefs? How does serotonin relate to mood disorders?',
  },
  Medicine: {
    style: 'Focus on clinical scenarios, pathophysiology, diagnosis, and treatment decisions. Present patient cases and ask about diagnosis, mechanism of disease, or appropriate management. Do not ask pure memorisation questions.',
    terminology: 'Use terms like: pathophysiology, aetiology, differential diagnosis, contraindication, half-life, pharmacokinetics, systolic/diastolic, tachycardia, homeostasis, inflammation, necrosis, biopsy, prognosis.',
    exampleQuestions: 'A 45-year-old presents with chest pain radiating to the left arm and diaphoresis. What is the most likely diagnosis? Which drug class is contraindicated in patients with severe renal failure? What is the mechanism of action of beta-blockers? Explain the Frank-Starling law of the heart.',
  },
};

function getDomainContext(domain: string) {
  return DOMAIN_CONTEXT[domain] || {
    style: 'Focus on practical application, real scenarios, and conceptual understanding rather than simple definitions.',
    terminology: `Use domain-specific terminology appropriate for ${domain}.`,
    exampleQuestions: `Ask questions that require applying ${domain} knowledge to realistic situations.`,
  };
}

export async function generateQuestions(
  domain: string, topicTitle: string, topicId: string, difficulty: number, count = 20
): Promise<Question[]> {
  const diffLabel = difficulty <= 3 ? 'beginner' : difficulty <= 6 ? 'intermediate' : 'advanced';
  const ctx = getDomainContext(domain);

  const prompt = `You are an expert ${domain} educator. Generate exactly ${count} multiple-choice quiz questions about "${topicTitle}" for ${domain} students at ${diffLabel} level (difficulty ${difficulty}/10).

DOMAIN STYLE: ${ctx.style}

TERMINOLOGY TO USE: ${ctx.terminology}

EXAMPLE QUESTION STYLES: ${ctx.exampleQuestions}

STRICT RULES:
- Every question must be SPECIFICALLY about "${topicTitle}" within ${domain} — not generic
- DO NOT ask "What is the primary purpose of X?" or "Which characteristic best defines X?" — these are too generic
- Each question must have exactly 4 answer options
- Wrong answers must be plausible and domain-appropriate (not obviously wrong)
- correctAnswer must be the FULL TEXT of the correct option
- explanation must be 1-2 sentences with specific reasoning
- Questions must vary in style: some scenario-based, some calculation/tracing, some "what would happen if...", some comparison questions
- At ${diffLabel} level: ${difficulty <= 3 ? 'focus on core concepts with clear examples' : difficulty <= 6 ? 'include application and analysis questions' : 'require synthesis, evaluation, and edge-case reasoning'}

Respond ONLY with a valid JSON array, no markdown, no preamble:
[{"id":"q1","topicId":"${topicId}","type":"MCQ","difficulty":${difficulty},"text":"question text?","options":["option1","option2","option3","option4"],"correctAnswer":"option1","explanation":"explanation here"}]`;

  try {
    const raw = await callGroq(prompt);
    const parsed = JSON.parse(stripJson(raw));
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty response');
    return parsed.map((q: any, i: number) => ({ ...q, id: q.id || `${topicId}-q${i}`, topicId }));
  } catch (e) {
    console.error(`AI generateQuestions error for ${topicTitle}:`, e);
    return fallbackQuestions(topicId, topicTitle, domain, difficulty, count);
  }
}

export async function generateDiagnosticQuestions(domain: string): Promise<Question[]> {
  const ctx = getDomainContext(domain);

  const prompt = `You are an expert ${domain} educator. Generate 20 diagnostic MCQ questions to assess a student's knowledge of ${domain}.

DOMAIN STYLE: ${ctx.style}

TERMINOLOGY TO USE: ${ctx.terminology}

EXAMPLE QUESTION STYLES: ${ctx.exampleQuestions}

REQUIREMENTS:
- 5 easy questions (difficulty 2) — core fundamentals of ${domain}
- 8 medium questions (difficulty 5) — application and analysis  
- 7 hard questions (difficulty 8) — synthesis, edge cases, advanced reasoning
- Cover DIFFERENT sub-topics within ${domain} to identify gaps
- Every question must be SPECIFIC to ${domain} — no generic "what is the goal of X" questions
- Wrong options must be plausible ${domain}-specific alternatives
- Each question has exactly 4 options. correctAnswer is the FULL TEXT of the correct option

Respond ONLY with valid JSON array, no markdown:
[{"id":"d1","topicId":"${domain.toLowerCase()}-general","type":"MCQ","difficulty":2,"text":"specific ${domain} question?","options":["a","b","c","d"],"correctAnswer":"a","explanation":"why a is correct"}]`;

  try {
    const raw = await callGroq(prompt);
    const parsed = JSON.parse(stripJson(raw));
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty response');
    return parsed;
  } catch (e) {
    console.error('AI diagnostic error:', e);
    return fallbackDiagnostic(domain);
  }
}

export async function generateAdaptiveLearningPath(
  domain: string,
  masteryData: { topicId: string; title: string; mastery: number }[]
): Promise<{ topicId: string; topicTitle: string; reason: string; priority: number }[]> {
  const context = masteryData.map(t => `${t.title}: ${t.mastery}%`).join('\n');
  const prompt = `You are an adaptive learning AI. Recommend a prioritized learning path for domain: ${domain}.

Current student mastery:
${context}

Rules:
- Prioritize topics where mastery < 60% (these are knowledge gaps)
- Don't recommend topics already mastered (>= 80%)
- Respect prerequisites — foundational topics first
- Return top 5 recommendations in priority order

Respond ONLY with valid JSON array:
[{"topicId":"exact-topic-id","topicTitle":"Topic Name","reason":"brief specific reason","priority":1}]`;

  try {
    const raw = await callGroq(prompt);
    const parsed = JSON.parse(stripJson(raw));
    if (!Array.isArray(parsed)) throw new Error('Not array');
    return parsed;
  } catch {
    return masteryData
      .filter(t => t.mastery < 80)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 5)
      .map((t, i) => ({
        topicId: t.topicId, topicTitle: t.title,
        reason: t.mastery < 60 ? 'Knowledge gap — needs reinforcement' : 'Building toward mastery',
        priority: i + 1,
      }));
  }
}

const CODING_DOMAINS = ['DSA', 'ML', 'WebDev', 'SystemDesign', 'CloudComputing', 'DataScience', 'CyberSecurity'];

export async function generatePracticeExercise(
  domain: string, topicTitle: string, mastery: number
): Promise<{ problem: string; hints: string[]; solution: string; language: string }> {
  const level = mastery < 40 ? 'beginner' : mastery < 70 ? 'intermediate' : 'advanced';
  const isCoding = CODING_DOMAINS.includes(domain);
  const ctx = getDomainContext(domain);

  const prompt = isCoding
    ? `Generate a ${level} coding exercise SPECIFICALLY about "${topicTitle}" in ${domain}.
${ctx.style}
The problem must require writing actual code — not just answering a question.
Include a concrete example with input and expected output.
Respond ONLY with valid JSON (no markdown):
{"problem":"Clear problem statement with example input/output","hints":["specific algorithmic hint","edge case to consider","optimization tip"],"solution":"// Complete working solution with comments explaining each step","language":"javascript"}`
    : `Generate a ${level} case-study or applied question SPECIFICALLY about "${topicTitle}" in ${domain}.
${ctx.style}
Make it a realistic scenario a practitioner would actually face — not a definition question.
${domain === 'Medicine' ? 'Present it as a clinical case with patient details.' : ''}
${domain === 'Finance' ? 'Include specific numbers that require calculation or interpretation.' : ''}
${domain === 'Psychology' ? 'Present a real human behaviour scenario to analyse.' : ''}
Respond ONLY with valid JSON (no markdown):
{"problem":"Detailed realistic scenario requiring written analysis","hints":["key concept to apply","framework or theory to consider","common mistake to avoid"],"solution":"Comprehensive model answer covering the key points with explanation","language":"text"}`;

  try {
    const raw = await callGroq(prompt);
    return JSON.parse(stripJson(raw));
  } catch {
    if (isCoding) {
      return {
        problem: `Implement a solution that demonstrates your understanding of ${topicTitle}.\n\nExample:\nInput: [1, 2, 3]\nOutput: (based on ${topicTitle} concept)`,
        hints: [`Think about how ${topicTitle} works fundamentally`, 'Consider edge cases like empty inputs', 'Optimize for time complexity'],
        solution: `// ${topicTitle} Solution\nfunction solve(input) {\n  // Implement your ${topicTitle} solution here\n  if (!input || input.length === 0) return null;\n  \n  // Your logic here\n  return input;\n}\n\nconsole.log(solve([1, 2, 3]));`,
        language: 'javascript',
      };
    } else {
      return {
        problem: `Scenario: You are working as a ${domain} professional and encounter a situation involving ${topicTitle}. Analyse the situation and explain your reasoning and approach in detail.`,
        hints: [
          `Recall the core principles of ${topicTitle}`,
          `Consider how ${topicTitle} applies to real-world situations in ${domain}`,
          `Think about potential complications or exceptions`,
        ],
        solution: `A strong answer on ${topicTitle} should cover:\n\n1. Core concept — what ${topicTitle} is and its significance in ${domain}\n2. Practical application — how it applies to the scenario\n3. Key considerations — important factors to weigh\n4. Common pitfalls — mistakes practitioners often make\n5. Conclusion — recommended approach with justification`,
        language: 'text',
      };
    }
  }
}

// ── Domain-specific fallback questions ────────────────────────────────────────

const DOMAIN_FALLBACKS: Record<string, (topicTitle: string, topicId: string, difficulty: number) => Omit<Question, 'id'>[]> = {
  DSA: (t, tid, d) => [
    { topicId: tid, type: 'MCQ', difficulty: d, text: `What is the time complexity of a linear search through an unsorted array of n elements for "${t}"?`, options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], correctAnswer: 'O(n)', explanation: 'Linear search checks each element one by one, so in the worst case it examines all n elements.' },
    { topicId: tid, type: 'MCQ', difficulty: d, text: `When implementing "${t}", which scenario would cause the worst-case performance?`, options: ['The target element is at the beginning', 'The target element is in the middle', 'The target element is at the end or not present', 'The array is sorted in ascending order'], correctAnswer: 'The target element is at the end or not present', explanation: 'Worst case occurs when the algorithm must examine every element before finding the answer or determining absence.' },
  ],
  Medicine: (t, tid, d) => [
    { topicId: tid, type: 'MCQ', difficulty: d, text: `A patient presents with classic signs related to "${t}". Which of the following is the most important initial assessment?`, options: ['Complete blood count', 'Patient history and physical examination', 'Imaging study', 'Specialist referral'], correctAnswer: 'Patient history and physical examination', explanation: 'Clinical assessment always begins with history and physical exam to guide further investigation.' },
    { topicId: tid, type: 'MCQ', difficulty: d, text: `Regarding "${t}", which mechanism best explains the pathophysiology?`, options: ['Autoimmune destruction of target tissue', 'Altered ion channel function affecting cellular signalling', 'Disruption of normal physiological homeostasis', 'Impaired enzymatic metabolism of substrates'], correctAnswer: 'Disruption of normal physiological homeostasis', explanation: `${t} fundamentally involves disruption of the body's homeostatic mechanisms.` },
  ],
  Psychology: (t, tid, d) => [
    { topicId: tid, type: 'MCQ', difficulty: d, text: `A therapist notices a client repeatedly avoids situations related to "${t}". According to cognitive-behavioural theory, what maintains this behaviour?`, options: ['Unconscious repression of traumatic memories', 'Negative reinforcement through anxiety reduction', 'Classical conditioning from childhood', 'Lack of social modelling'], correctAnswer: 'Negative reinforcement through anxiety reduction', explanation: 'Avoidance is maintained by negative reinforcement — the reduction of anxiety when the situation is avoided.' },
    { topicId: tid, type: 'MCQ', difficulty: d, text: `Research on "${t}" consistently shows which of the following?`, options: ['Effects are identical across all cultural contexts', 'Individual differences significantly moderate outcomes', 'Biological factors alone determine outcomes', 'Environmental factors have no measurable impact'], correctAnswer: 'Individual differences significantly moderate outcomes', explanation: 'Psychological phenomena like ${t} are consistently moderated by individual difference variables such as personality and prior experience.' },
  ],
  Finance: (t, tid, d) => [
    { topicId: tid, type: 'MCQ', difficulty: d, text: `When analysing a company using "${t}", an investor notices the ratio has deteriorated over three consecutive quarters. What is the most likely implication?`, options: ['The company is becoming more profitable', 'There may be underlying financial stress or operational inefficiency', 'The stock price will definitely increase', 'The company should immediately pay a dividend'], correctAnswer: 'There may be underlying financial stress or operational inefficiency', explanation: 'A deteriorating financial ratio over multiple periods signals potential problems that warrant further investigation.' },
  ],
  DigitalMarketing: (t, tid, d) => [
    { topicId: tid, type: 'MCQ', difficulty: d, text: `Your "${t}" campaign has a high impression count but a CTR of 0.2%. What is the most actionable first step?`, options: ['Increase the daily budget', 'Review and improve the ad copy and creative', 'Pause the campaign immediately', 'Switch to a different platform'], correctAnswer: 'Review and improve the ad copy and creative', explanation: 'A low CTR with high impressions indicates the ad is being seen but not compelling users to click — the creative or copy needs improvement.' },
  ],
};

function fallbackQuestions(topicId: string, topicTitle: string, domain: string, difficulty: number, count: number): Question[] {
  // Try domain-specific fallback first
  const domainFn = DOMAIN_FALLBACKS[domain];
  const domainSpecific = domainFn ? domainFn(topicTitle, topicId, difficulty) : [];

  // Generic but well-structured fallback questions (no coding-specific language)
  const generic = [
    {
      topicId, type: 'MCQ' as const, difficulty,
      text: `A practitioner in ${domain} needs to apply "${topicTitle}" to solve a real problem. Which approach demonstrates the deepest understanding?`,
      options: [
        `Identify the core principles of "${topicTitle}" and adapt them to the specific context`,
        `Apply "${topicTitle}" identically to every situation regardless of context`,
        `Avoid using "${topicTitle}" and rely on more familiar methods instead`,
        `Memorise the definition of "${topicTitle}" without practising application`,
      ],
      correctAnswer: `Identify the core principles of "${topicTitle}" and adapt them to the specific context`,
      explanation: `Deep understanding of "${topicTitle}" means knowing its principles well enough to apply them flexibly across different situations.`,
    },
    {
      topicId, type: 'MCQ' as const, difficulty,
      text: `Which scenario would most likely expose a gap in someone's understanding of "${topicTitle}"?`,
      options: [
        `Asking them to recite the definition of "${topicTitle}"`,
        `Presenting an edge case or unusual scenario involving "${topicTitle}"`,
        `Asking them to list examples they have already studied`,
        `Asking whether they have heard of "${topicTitle}" before`,
      ],
      correctAnswer: `Presenting an edge case or unusual scenario involving "${topicTitle}"`,
      explanation: `Knowledge gaps in "${topicTitle}" are best revealed through edge cases that require genuine understanding rather than memorisation.`,
    },
    {
      topicId, type: 'MCQ' as const, difficulty,
      text: `When comparing "${topicTitle}" to related concepts in ${domain}, what is its most distinctive characteristic?`,
      options: [
        `It addresses a specific set of problems that other ${domain} approaches do not handle as well`,
        `It is always superior to every other approach in ${domain}`,
        `It is only relevant at the beginner level and has no advanced use`,
        `It is entirely separate from the rest of ${domain} with no interactions`,
      ],
      correctAnswer: `It addresses a specific set of problems that other ${domain} approaches do not handle as well`,
      explanation: `"${topicTitle}" has a distinctive niche within ${domain} — its value comes from the specific problems it is designed to address.`,
    },
  ];

  const combined = [...domainSpecific, ...generic];
  return combined.slice(0, Math.min(count, combined.length)).map((q, i) => ({
    ...q,
    id: `fb-${topicId}-${i}`,
  }));
}

function fallbackDiagnostic(domain: string): Question[] {
  const tid = `${domain.toLowerCase().replace(/\s+/g, '-')}-general`;
  const ctx = getDomainContext(domain);

  // These fallbacks are domain-aware and never generic
  const domainFallbacks: Record<string, Question[]> = {
    DSA: [
      { id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2, text: 'What is the time complexity of accessing an element by index in an array?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], correctAnswer: 'O(1)', explanation: 'Array indexing is O(1) because elements are stored contiguously in memory, enabling direct address calculation.' },
      { id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5, text: 'Which data structure gives O(1) average-case lookup, insert, and delete?', options: ['Array', 'Linked List', 'Hash Map', 'Binary Search Tree'], correctAnswer: 'Hash Map', explanation: 'Hash Maps use a hash function to compute the index directly, giving O(1) average-case for all three operations.' },
      { id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8, text: 'What is the space complexity of a recursive Fibonacci implementation without memoization?', options: ['O(1)', 'O(n)', 'O(2ⁿ)', 'O(n²)'], correctAnswer: 'O(n)', explanation: 'The call stack grows to depth n (the longest chain of recursive calls), so space complexity is O(n) even though the tree has 2ⁿ nodes.' },
    ],
    Medicine: [
      { id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2, text: 'A patient with type 2 diabetes has a fasting blood glucose of 9.2 mmol/L. Which finding is most consistent with this?', options: ['Hypoglycaemia', 'Insulin resistance with reduced glucose uptake', 'Complete absence of insulin production', 'Excessive glucagon suppression'], correctAnswer: 'Insulin resistance with reduced glucose uptake', explanation: 'Type 2 diabetes is characterised by insulin resistance — cells do not respond normally to insulin, leading to elevated blood glucose.' },
      { id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5, text: 'Which mechanism best explains why ACE inhibitors are used in hypertension?', options: ['Blocking calcium entry into cardiac cells', 'Preventing conversion of angiotensin I to angiotensin II, reducing vasoconstriction', 'Directly dilating peripheral blood vessels', 'Increasing renal sodium excretion through diuresis'], correctAnswer: 'Preventing conversion of angiotensin I to angiotensin II, reducing vasoconstriction', explanation: 'ACE inhibitors block the ACE enzyme, reducing angiotensin II levels, which decreases vasoconstriction and lowers blood pressure.' },
      { id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8, text: 'A 60-year-old with known heart failure develops sudden worsening dyspnoea at rest and orthopnoea. Chest X-ray shows bilateral infiltrates. What is the most likely diagnosis?', options: ['Community-acquired pneumonia', 'Pulmonary embolism', 'Acute pulmonary oedema', 'Spontaneous pneumothorax'], correctAnswer: 'Acute pulmonary oedema', explanation: 'Bilateral infiltrates with acute dyspnoea and orthopnoea in a known heart failure patient is classic acute pulmonary oedema from left ventricular failure.' },
    ],
    Psychology: [
      { id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2, text: 'A dog begins to salivate upon hearing a bell that was previously paired with food. This is an example of:', options: ['Operant conditioning', 'Classical conditioning', 'Observational learning', 'Insight learning'], correctAnswer: 'Classical conditioning', explanation: 'Pavlov\'s classical conditioning involves pairing a neutral stimulus (bell) with an unconditioned stimulus (food) until the neutral stimulus alone elicits the response.' },
      { id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5, text: 'According to cognitive dissonance theory, what happens when a person holds two contradictory beliefs simultaneously?', options: ['They effortlessly accept both beliefs without conflict', 'They experience psychological discomfort and are motivated to reduce it', 'They always choose the belief supported by evidence', 'They suppress both beliefs into the unconscious'], correctAnswer: 'They experience psychological discomfort and are motivated to reduce it', explanation: 'Festinger\'s cognitive dissonance theory states that conflicting cognitions create uncomfortable tension, motivating the person to change one belief or rationalise the conflict.' },
      { id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8, text: 'A researcher finds that children raised in orphanages with minimal human interaction show persistent emotional dysregulation as adults. Which theoretical framework best explains this?', options: ['Piaget\'s concrete operational stage', 'Bowlby\'s attachment theory and the critical period for secure attachment', 'Freud\'s Oedipus complex resolution', 'Bandura\'s self-efficacy development'], correctAnswer: 'Bowlby\'s attachment theory and the critical period for secure attachment', explanation: 'Bowlby proposed that early attachment bonds during a critical developmental window are essential for emotional regulation. Deprivation during this period causes lasting deficits.' },
    ],
    Finance: [
      { id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2, text: 'A company has current assets of $500,000 and current liabilities of $250,000. What is its current ratio?', options: ['0.5', '1.0', '2.0', '4.0'], correctAnswer: '2.0', explanation: 'Current ratio = Current Assets / Current Liabilities = $500,000 / $250,000 = 2.0, indicating the company can cover its short-term liabilities twice over.' },
      { id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5, text: 'An investor compares two bonds: Bond A yields 4% with a 10-year maturity, Bond B yields 4% with a 2-year maturity. If interest rates rise, which bond\'s price will fall more?', options: ['Bond A, because longer duration means greater price sensitivity', 'Bond B, because shorter bonds are riskier', 'Both will fall by the same amount', 'Neither will change since yields are equal'], correctAnswer: 'Bond A, because longer duration means greater price sensitivity', explanation: 'Duration measures price sensitivity to interest rate changes. Longer-maturity bonds have higher duration, making their prices more sensitive to rate movements.' },
      { id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8, text: 'A DCF analysis gives an intrinsic value of $80/share, but the stock trades at $120. Assuming the model is correct, what should a value investor conclude?', options: ['Buy immediately — the market will catch up', 'The stock appears overvalued; a value investor should avoid or short it', 'The DCF model must be wrong since markets are efficient', 'Wait until the price reaches $80 before calculating DCF'], correctAnswer: 'The stock appears overvalued; a value investor should avoid or short it', explanation: 'Value investing principles hold that when intrinsic value (DCF) is below market price, the stock is overvalued and offers no margin of safety.' },
    ],
    DigitalMarketing: [
      { id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2, text: 'A Google Ads campaign has 10,000 impressions and 200 clicks. What is its CTR?', options: ['0.2%', '2%', '5%', '20%'], correctAnswer: '2%', explanation: 'CTR = (Clicks / Impressions) × 100 = (200 / 10,000) × 100 = 2%.' },
      { id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5, text: 'An SEO audit reveals a page with strong content but zero backlinks ranking on page 3. What is the highest-priority action?', options: ['Rewrite all the content', 'Build high-quality backlinks from authoritative sites', 'Add more keywords to the meta description', 'Increase page loading speed'], correctAnswer: 'Build high-quality backlinks from authoritative sites', explanation: 'Backlinks are a primary off-page SEO factor. A page with good content but no backlinks is missing one of the most important ranking signals.' },
      { id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8, text: 'An e-commerce brand\'s last-touch attribution model shows Facebook Ads driving 60% of conversions. After switching to data-driven attribution, Facebook drops to 25%. What does this suggest?', options: ['Facebook Ads are ineffective and should be paused', 'Facebook Ads are primarily an upper-funnel channel that assists rather than closes conversions', 'The data-driven model has an error', 'Last-touch attribution is always more accurate'], correctAnswer: 'Facebook Ads are primarily an upper-funnel channel that assists rather than closes conversions', explanation: 'Last-touch over-credits the final channel. Data-driven attribution reveals Facebook is more effective at awareness/consideration — it assists conversions rather than closing them.' },
    ],
    ProductManagement: [
      { id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2, text: 'A product team is deciding between features using the RICE framework. What does RICE stand for?', options: ['Revenue, Impact, Cost, Effort', 'Reach, Impact, Confidence, Effort', 'Risk, Impact, Cost, Execution', 'Reach, Intent, Confidence, Evaluation'], correctAnswer: 'Reach, Impact, Confidence, Effort', explanation: 'RICE = Reach × Impact × Confidence ÷ Effort. It helps PMs prioritise features objectively by quantifying their expected value relative to cost.' },
      { id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5, text: 'Your North Star metric (weekly active users) dropped 12% after a recent feature launch. What is your first step?', options: ['Roll back the feature immediately', 'Segment the drop by user cohort, platform, and geography to identify the root cause', 'Increase marketing spend to compensate', 'Run a survey asking users why they left'], correctAnswer: 'Segment the drop by user cohort, platform, and geography to identify the root cause', explanation: 'Before acting, a PM must diagnose the root cause. Segmenting reveals whether the drop is correlated with the new feature or an external factor.' },
      { id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8, text: 'Your team has strong evidence that Feature A will drive retention, but the CEO is pushing Feature B based on a personal belief. How should you handle this?', options: ['Build Feature B — the CEO always has final say', 'Present the data supporting Feature A and propose a structured A/B test to validate both hypotheses', 'Ignore the CEO and build Feature A anyway', 'Build both features simultaneously to avoid conflict'], correctAnswer: 'Present the data supporting Feature A and propose a structured A/B test to validate both hypotheses', explanation: 'Good product management means using data to influence decisions while respecting leadership. Proposing an A/B test is the collaborative, evidence-based resolution.' },
    ],
  };

  // Return domain-specific fallback or a generic domain-aware one
  if (domainFallbacks[domain]) return domainFallbacks[domain];

  return [
    {
      id: 'diag-fb-1', topicId: tid, type: 'MCQ', difficulty: 2,
      text: `In ${domain}, which of the following best represents a foundational principle that underpins most other concepts?`,
      options: [
        `Systematic analysis of ${domain} problems using established frameworks`,
        `Applying solutions from unrelated fields without adaptation`,
        `Relying solely on intuition without evidence`,
        `Specialising in one narrow area while ignoring the broader field`,
      ],
      correctAnswer: `Systematic analysis of ${domain} problems using established frameworks`,
      explanation: `${domain} is built on systematic, evidence-based frameworks that provide a structured approach to its core problems.`,
    },
    {
      id: 'diag-fb-2', topicId: tid, type: 'MCQ', difficulty: 5,
      text: `A professional in ${domain} encounters conflicting evidence about the best approach for a client. What is the most appropriate response?`,
      options: [
        `Choose the approach supported by the strongest and most recent evidence`,
        `Always apply the oldest established method regardless of context`,
        `Ask the client to decide without professional input`,
        `Apply all approaches simultaneously`,
      ],
      correctAnswer: `Choose the approach supported by the strongest and most recent evidence`,
      explanation: `Evidence-based practice in ${domain} requires evaluating the quality and recency of evidence before making professional decisions.`,
    },
    {
      id: 'diag-fb-3', topicId: tid, type: 'MCQ', difficulty: 8,
      text: `Two experienced ${domain} practitioners reach different conclusions from the same data. What most likely explains this?`,
      options: [
        `One of them is incompetent and should not be practising`,
        `Differences in their theoretical frameworks, assumptions, and contextual interpretation`,
        `${domain} has no valid methodology for analysing data`,
        `Data in ${domain} is never reliable enough to draw conclusions`,
      ],
      correctAnswer: `Differences in their theoretical frameworks, assumptions, and contextual interpretation`,
      explanation: `Expert disagreement in ${domain} often reflects different theoretical lenses and contextual factors — not incompetence. Critical appraisal skills help navigate such disagreements.`,
    },
  ];
}
