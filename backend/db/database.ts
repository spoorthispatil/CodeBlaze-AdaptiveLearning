import { createClient, type Client } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'codeblaze.db');

let _client: Client | null = null;
let _initialized = false;

export function getDb(): Client {
  if (!_client) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    _client = createClient({ url: `file:${DB_PATH}` });
  }
  return _client;
}

export async function dbAll(sql: string, args: any[] = []): Promise<any[]> {
  const rs = await getDb().execute({ sql, args });
  return rs.rows as any[];
}

export async function dbGet(sql: string, args: any[] = []): Promise<any | undefined> {
  const rs = await getDb().execute({ sql, args });
  return rs.rows[0] as any ?? undefined;
}

export async function dbRun(sql: string, args: any[] = []): Promise<void> {
  await getDb().execute({ sql, args });
}

export async function dbBatch(stmts: { sql: string; args?: any[] }[]): Promise<void> {
  await getDb().batch(stmts.map(s => ({ sql: s.sql, args: s.args ?? [] })), 'write');
}

export async function initDb(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  const db = getDb();

  // Create tables one by one (executeMultiple not always available)
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      domain TEXT DEFAULT NULL,
      onboarded INTEGER DEFAULT 0,
      learning_streak INTEGER DEFAULT 0,
      last_active TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      prerequisites TEXT DEFAULT '[]',
      difficulty_level INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS user_mastery (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      mastery_score INTEGER DEFAULT 0,
      attempts INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, topic_id)
    )`,
    `CREATE TABLE IF NOT EXISTS quiz_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      topic_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      is_diagnostic INTEGER DEFAULT 0,
      answers TEXT DEFAULT '{}',
      time_taken INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      avatar_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS question_cache (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      difficulty INTEGER NOT NULL,
      question_type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT DEFAULT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of tables) {
    await db.execute(sql);
  }

  await seedTopics();

  // Clear question cache if schema version changes or on first run after fix
  // This ensures stale/wrong-topic questions are regenerated fresh
  await clearStaleQuestionCache();

  console.log('✅ Database initialized');
}

async function seedTopics(): Promise<void> {
  const row = await dbGet('SELECT COUNT(*) as count FROM topics');
  // Re-seed if we have fewer topics than expected (handles schema upgrades)
  if (Number(row?.count) >= 80) return;

  const topics = [
    // DSA
    { id: 'dsa-arrays', domain: 'DSA', title: 'Arrays & Strings', description: 'Foundation of data manipulation. Master indexing, sliding window, two pointers.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'dsa-linked-lists', domain: 'DSA', title: 'Linked Lists', description: 'Pointers, node traversal, reversal, cycle detection.', prerequisites: '["dsa-arrays"]', difficulty_level: 2, order_index: 2 },
    { id: 'dsa-stacks-queues', domain: 'DSA', title: 'Stacks & Queues', description: 'LIFO/FIFO structures, monotonic stacks, deque problems.', prerequisites: '["dsa-arrays"]', difficulty_level: 2, order_index: 3 },
    { id: 'dsa-hash-maps', domain: 'DSA', title: 'Hash Maps & Sets', description: 'O(1) lookup, frequency counting, anagram detection.', prerequisites: '["dsa-arrays"]', difficulty_level: 2, order_index: 4 },
    { id: 'dsa-trees', domain: 'DSA', title: 'Binary Trees & BST', description: 'Tree traversal (BFS/DFS), height, diameter, BST operations.', prerequisites: '["dsa-linked-lists"]', difficulty_level: 3, order_index: 5 },
    { id: 'dsa-graphs', domain: 'DSA', title: 'Graphs & BFS/DFS', description: 'Graph representations, BFS, DFS, topological sort, cycle detection.', prerequisites: '["dsa-trees"]', difficulty_level: 4, order_index: 6 },
    { id: 'dsa-recursion', domain: 'DSA', title: 'Recursion & Backtracking', description: 'Recursive thinking, subsets, permutations, N-Queens.', prerequisites: '["dsa-trees"]', difficulty_level: 4, order_index: 7 },
    { id: 'dsa-dp', domain: 'DSA', title: 'Dynamic Programming', description: 'Memoization, tabulation, Fibonacci, knapsack, LCS.', prerequisites: '["dsa-recursion"]', difficulty_level: 5, order_index: 8 },
    { id: 'dsa-sorting', domain: 'DSA', title: 'Sorting Algorithms', description: 'QuickSort, MergeSort, HeapSort and complexities.', prerequisites: '["dsa-arrays"]', difficulty_level: 3, order_index: 9 },
    { id: 'dsa-heaps', domain: 'DSA', title: 'Heaps & Priority Queues', description: 'Min/Max heap, K largest elements, merge K sorted lists.', prerequisites: '["dsa-trees"]', difficulty_level: 4, order_index: 10 },
    // ML
    { id: 'ml-fundamentals', domain: 'ML', title: 'ML Fundamentals', description: 'Supervised vs unsupervised, bias-variance tradeoff, train/test split.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'ml-linear-regression', domain: 'ML', title: 'Linear Regression', description: 'Least squares, gradient descent, feature scaling, regularization.', prerequisites: '["ml-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'ml-classification', domain: 'ML', title: 'Classification Algorithms', description: 'Logistic regression, KNN, Decision Trees, SVM.', prerequisites: '["ml-linear-regression"]', difficulty_level: 3, order_index: 3 },
    { id: 'ml-neural-networks', domain: 'ML', title: 'Neural Networks', description: 'Perceptrons, activation functions, backpropagation, deep learning.', prerequisites: '["ml-classification"]', difficulty_level: 4, order_index: 4 },
    { id: 'ml-cnn', domain: 'ML', title: 'Convolutional Neural Networks', description: 'Convolutions, pooling, image classification, transfer learning.', prerequisites: '["ml-neural-networks"]', difficulty_level: 5, order_index: 5 },
    { id: 'ml-nlp', domain: 'ML', title: 'Natural Language Processing', description: 'Tokenization, embeddings, transformers, BERT, GPT architecture.', prerequisites: '["ml-neural-networks"]', difficulty_level: 5, order_index: 6 },
    { id: 'ml-clustering', domain: 'ML', title: 'Clustering & Unsupervised', description: 'K-Means, DBSCAN, PCA, dimensionality reduction.', prerequisites: '["ml-fundamentals"]', difficulty_level: 3, order_index: 7 },
    // WebDev
    { id: 'web-html-css', domain: 'WebDev', title: 'HTML & CSS Mastery', description: 'Semantic HTML, Flexbox, Grid, responsive design, accessibility.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'web-javascript', domain: 'WebDev', title: 'JavaScript Fundamentals', description: 'ES6+, closures, async/await, prototypes, event loop.', prerequisites: '["web-html-css"]', difficulty_level: 2, order_index: 2 },
    { id: 'web-react', domain: 'WebDev', title: 'React & State Management', description: 'Components, hooks, context, Redux, performance optimization.', prerequisites: '["web-javascript"]', difficulty_level: 3, order_index: 3 },
    { id: 'web-nodejs', domain: 'WebDev', title: 'Node.js & Express', description: 'REST APIs, middleware, authentication, file system, streams.', prerequisites: '["web-javascript"]', difficulty_level: 3, order_index: 4 },
    { id: 'web-databases', domain: 'WebDev', title: 'Databases & SQL', description: 'SQL queries, joins, indexing, NoSQL, ORM patterns.', prerequisites: '["web-nodejs"]', difficulty_level: 3, order_index: 5 },
    { id: 'web-security', domain: 'WebDev', title: 'Web Security', description: 'XSS, CSRF, SQL injection, JWT, OAuth, HTTPS.', prerequisites: '["web-nodejs","web-databases"]', difficulty_level: 4, order_index: 6 },
    // SystemDesign
    { id: 'sd-fundamentals', domain: 'SystemDesign', title: 'System Design Basics', description: 'Scalability, availability, consistency, CAP theorem.', prerequisites: '[]', difficulty_level: 2, order_index: 1 },
    { id: 'sd-load-balancing', domain: 'SystemDesign', title: 'Load Balancing', description: 'Round robin, consistent hashing, health checks, Layer 4 vs 7.', prerequisites: '["sd-fundamentals"]', difficulty_level: 3, order_index: 2 },
    { id: 'sd-caching', domain: 'SystemDesign', title: 'Caching Strategies', description: 'Redis, CDN, cache invalidation, write-through vs write-back.', prerequisites: '["sd-fundamentals"]', difficulty_level: 3, order_index: 3 },
    { id: 'sd-databases', domain: 'SystemDesign', title: 'Database Design & Sharding', description: 'Vertical vs horizontal scaling, sharding strategies, replication.', prerequisites: '["sd-load-balancing"]', difficulty_level: 4, order_index: 4 },
    { id: 'sd-microservices', domain: 'SystemDesign', title: 'Microservices Architecture', description: 'Service decomposition, API gateways, inter-service communication.', prerequisites: '["sd-databases"]', difficulty_level: 5, order_index: 5 },
    // CloudComputing
    { id: 'cloud-fundamentals', domain: 'CloudComputing', title: 'Cloud Fundamentals', description: 'IaaS, PaaS, SaaS, public/private/hybrid cloud models.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'cloud-containers', domain: 'CloudComputing', title: 'Containers & Docker', description: 'Docker images, containers, volumes, networking, Docker Compose.', prerequisites: '["cloud-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'cloud-kubernetes', domain: 'CloudComputing', title: 'Kubernetes', description: 'Pods, deployments, services, ingress, autoscaling, Helm.', prerequisites: '["cloud-containers"]', difficulty_level: 4, order_index: 3 },
    { id: 'cloud-serverless', domain: 'CloudComputing', title: 'Serverless & Functions', description: 'Lambda, cloud functions, event-driven architecture, cold starts.', prerequisites: '["cloud-fundamentals"]', difficulty_level: 3, order_index: 4 },
    { id: 'cloud-networking', domain: 'CloudComputing', title: 'Cloud Networking', description: 'VPC, subnets, security groups, VPNs, Route 53, CDN.', prerequisites: '["cloud-fundamentals"]', difficulty_level: 3, order_index: 5 },
    // DataScience
    { id: 'ds-python', domain: 'DataScience', title: 'Python for Data Science', description: 'NumPy, Pandas, data wrangling, exploratory analysis.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'ds-stats', domain: 'DataScience', title: 'Statistics & Probability', description: 'Descriptive stats, distributions, hypothesis testing, p-values.', prerequisites: '[]', difficulty_level: 2, order_index: 2 },
    { id: 'ds-visualization', domain: 'DataScience', title: 'Data Visualization', description: 'Matplotlib, Seaborn, Plotly, storytelling with charts.', prerequisites: '["ds-python"]', difficulty_level: 2, order_index: 3 },
    { id: 'ds-ml-basics', domain: 'DataScience', title: 'Applied Machine Learning', description: 'Scikit-learn, model evaluation, cross-validation, pipelines.', prerequisites: '["ds-stats"]', difficulty_level: 3, order_index: 4 },
    { id: 'ds-sql', domain: 'DataScience', title: 'SQL & Database Querying', description: 'Joins, aggregations, window functions, query optimization.', prerequisites: '[]', difficulty_level: 2, order_index: 5 },
    { id: 'ds-big-data', domain: 'DataScience', title: 'Big Data & Spark', description: 'Hadoop, Spark, distributed computing, data pipelines.', prerequisites: '["ds-sql"]', difficulty_level: 4, order_index: 6 },
    // CyberSecurity
    { id: 'sec-fundamentals', domain: 'CyberSecurity', title: 'Security Fundamentals', description: 'CIA triad, threat models, attack surfaces, risk assessment.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'sec-networking', domain: 'CyberSecurity', title: 'Network Security', description: 'Firewalls, VPNs, intrusion detection, packet analysis.', prerequisites: '["sec-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'sec-crypto', domain: 'CyberSecurity', title: 'Cryptography', description: 'Symmetric/asymmetric encryption, hashing, PKI, TLS/SSL.', prerequisites: '["sec-fundamentals"]', difficulty_level: 3, order_index: 3 },
    { id: 'sec-pentesting', domain: 'CyberSecurity', title: 'Penetration Testing', description: 'OWASP Top 10, vulnerability scanning, ethical hacking methodology.', prerequisites: '["sec-networking"]', difficulty_level: 4, order_index: 4 },
    { id: 'sec-incident', domain: 'CyberSecurity', title: 'Incident Response', description: 'SIEM, forensics, malware analysis, recovery playbooks.', prerequisites: '["sec-pentesting"]', difficulty_level: 4, order_index: 5 },
    // ProductManagement
    { id: 'pm-fundamentals', domain: 'ProductManagement', title: 'PM Fundamentals', description: 'Product lifecycle, roadmaps, stakeholder management, OKRs.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'pm-discovery', domain: 'ProductManagement', title: 'User Research & Discovery', description: 'User interviews, surveys, personas, jobs-to-be-done framework.', prerequisites: '["pm-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'pm-strategy', domain: 'ProductManagement', title: 'Product Strategy', description: 'Market sizing, competitive analysis, positioning, go-to-market.', prerequisites: '["pm-discovery"]', difficulty_level: 3, order_index: 3 },
    { id: 'pm-metrics', domain: 'ProductManagement', title: 'Metrics & Analytics', description: 'North star metric, funnels, A/B testing, cohort analysis.', prerequisites: '["pm-fundamentals"]', difficulty_level: 3, order_index: 4 },
    { id: 'pm-execution', domain: 'ProductManagement', title: 'Agile & Execution', description: 'Sprints, backlog grooming, prioritization frameworks (RICE, MoSCoW).', prerequisites: '["pm-fundamentals"]', difficulty_level: 2, order_index: 5 },
    // BusinessAnalytics
    { id: 'ba-fundamentals', domain: 'BusinessAnalytics', title: 'Business Analytics Basics', description: 'KPIs, business metrics, data-driven decision making, reporting.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'ba-excel', domain: 'BusinessAnalytics', title: 'Excel & Spreadsheet Mastery', description: 'Pivot tables, VLOOKUP, advanced formulas, dashboards.', prerequisites: '[]', difficulty_level: 1, order_index: 2 },
    { id: 'ba-sql', domain: 'BusinessAnalytics', title: 'SQL for Business', description: 'Reporting queries, aggregation, business intelligence extracts.', prerequisites: '["ba-fundamentals"]', difficulty_level: 2, order_index: 3 },
    { id: 'ba-powerbi', domain: 'BusinessAnalytics', title: 'Power BI & Tableau', description: 'Dashboards, DAX formulas, data modeling, visual storytelling.', prerequisites: '["ba-excel"]', difficulty_level: 2, order_index: 4 },
    { id: 'ba-statistics', domain: 'BusinessAnalytics', title: 'Statistical Analysis', description: 'Regression, forecasting, time series, Monte Carlo simulation.', prerequisites: '["ba-fundamentals"]', difficulty_level: 3, order_index: 5 },
    // DigitalMarketing
    { id: 'mkt-fundamentals', domain: 'DigitalMarketing', title: 'Digital Marketing Basics', description: 'Marketing funnel, channels overview, campaign planning, budgeting.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'mkt-seo', domain: 'DigitalMarketing', title: 'SEO & Content Marketing', description: 'On-page, off-page, technical SEO, keyword research, content strategy.', prerequisites: '["mkt-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'mkt-paid', domain: 'DigitalMarketing', title: 'Paid Advertising (PPC)', description: 'Google Ads, Meta Ads, bidding strategies, ROAS, campaign optimization.', prerequisites: '["mkt-fundamentals"]', difficulty_level: 3, order_index: 3 },
    { id: 'mkt-social', domain: 'DigitalMarketing', title: 'Social Media Marketing', description: 'Platform strategies, content calendars, influencer marketing, analytics.', prerequisites: '["mkt-fundamentals"]', difficulty_level: 2, order_index: 4 },
    { id: 'mkt-analytics', domain: 'DigitalMarketing', title: 'Marketing Analytics', description: 'GA4, attribution models, conversion tracking, LTV calculation.', prerequisites: '["mkt-paid"]', difficulty_level: 3, order_index: 5 },
    // UXDesign
    { id: 'ux-fundamentals', domain: 'UXDesign', title: 'UX Fundamentals', description: 'Design thinking, user-centered design, heuristics, accessibility.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'ux-research', domain: 'UXDesign', title: 'User Research Methods', description: 'Usability testing, card sorting, contextual inquiry, affinity mapping.', prerequisites: '["ux-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'ux-wireframing', domain: 'UXDesign', title: 'Wireframing & Prototyping', description: 'Figma, low/high fidelity prototypes, interactive mockups.', prerequisites: '["ux-fundamentals"]', difficulty_level: 2, order_index: 3 },
    { id: 'ux-visual', domain: 'UXDesign', title: 'Visual Design & UI', description: 'Typography, color theory, design systems, component libraries.', prerequisites: '["ux-wireframing"]', difficulty_level: 3, order_index: 4 },
    { id: 'ux-metrics', domain: 'UXDesign', title: 'UX Metrics & Testing', description: 'SUS scores, task completion rates, A/B testing, heatmaps.', prerequisites: '["ux-research"]', difficulty_level: 3, order_index: 5 },
    // Finance
    { id: 'fin-fundamentals', domain: 'Finance', title: 'Financial Fundamentals', description: 'Time value of money, financial statements, ratio analysis, budgeting.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'fin-investing', domain: 'Finance', title: 'Investing & Markets', description: 'Stocks, bonds, mutual funds, ETFs, portfolio diversification.', prerequisites: '["fin-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'fin-accounting', domain: 'Finance', title: 'Accounting Principles', description: 'Balance sheet, income statement, cash flow, GAAP principles.', prerequisites: '["fin-fundamentals"]', difficulty_level: 2, order_index: 3 },
    { id: 'fin-valuation', domain: 'Finance', title: 'Business Valuation', description: 'DCF analysis, comparable company analysis, precedent transactions.', prerequisites: '["fin-accounting"]', difficulty_level: 4, order_index: 4 },
    { id: 'fin-risk', domain: 'Finance', title: 'Risk Management', description: 'VaR, derivatives, hedging strategies, credit risk, market risk.', prerequisites: '["fin-investing"]', difficulty_level: 4, order_index: 5 },
    // Psychology
    { id: 'psy-fundamentals', domain: 'Psychology', title: 'Psychology Fundamentals', description: 'History, major schools of thought, research methods, brain basics.', prerequisites: '[]', difficulty_level: 1, order_index: 1 },
    { id: 'psy-cognitive', domain: 'Psychology', title: 'Cognitive Psychology', description: 'Memory, attention, perception, decision-making, cognitive biases.', prerequisites: '["psy-fundamentals"]', difficulty_level: 2, order_index: 2 },
    { id: 'psy-social', domain: 'Psychology', title: 'Social Psychology', description: 'Conformity, persuasion, group dynamics, attribution theory, prejudice.', prerequisites: '["psy-fundamentals"]', difficulty_level: 2, order_index: 3 },
    { id: 'psy-developmental', domain: 'Psychology', title: 'Developmental Psychology', description: 'Piaget, Erikson, attachment theory, lifespan development stages.', prerequisites: '["psy-fundamentals"]', difficulty_level: 3, order_index: 4 },
    { id: 'psy-clinical', domain: 'Psychology', title: 'Clinical & Abnormal Psychology', description: 'DSM disorders, therapy approaches, CBT, diagnosis criteria.', prerequisites: '["psy-cognitive"]', difficulty_level: 4, order_index: 5 },
    // Medicine
    { id: 'med-anatomy', domain: 'Medicine', title: 'Human Anatomy', description: 'Body systems, organs, tissues, anatomical terminology and planes.', prerequisites: '[]', difficulty_level: 2, order_index: 1 },
    { id: 'med-physiology', domain: 'Medicine', title: 'Physiology', description: 'How body systems function: cardiovascular, respiratory, nervous, renal.', prerequisites: '["med-anatomy"]', difficulty_level: 3, order_index: 2 },
    { id: 'med-pharmacology', domain: 'Medicine', title: 'Pharmacology Basics', description: 'Drug classes, mechanisms of action, pharmacokinetics, side effects.', prerequisites: '["med-physiology"]', difficulty_level: 4, order_index: 3 },
    { id: 'med-pathology', domain: 'Medicine', title: 'Pathology', description: 'Disease mechanisms, inflammation, neoplasia, organ-specific diseases.', prerequisites: '["med-physiology"]', difficulty_level: 4, order_index: 4 },
    { id: 'med-clinical', domain: 'Medicine', title: 'Clinical Medicine', description: 'History taking, physical examination, diagnosis, evidence-based medicine.', prerequisites: '["med-pathology"]', difficulty_level: 5, order_index: 5 },
  ];

  for (const t of topics) {
    await dbRun(
      `INSERT OR IGNORE INTO topics (id,domain,title,description,prerequisites,difficulty_level,order_index) VALUES (?,?,?,?,?,?,?)`,
      [t.id, t.domain, t.title, t.description, t.prerequisites, t.difficulty_level, t.order_index]
    );
  }
  console.log(`✅ Seeded ${topics.length} topics`);
}

async function clearStaleQuestionCache(): Promise<void> {
  try {
    // Check if a schema_version table exists; if not, this is a fresh or old install
    const hasVersionTable = await dbGet(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'`
    );
    const CURRENT_VERSION = 4; // bumped: domain-specific question prompts — regenerate all questions
    if (!hasVersionTable) {
      await dbRun(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`);
      await dbRun(`INSERT INTO schema_version VALUES (?)`, [CURRENT_VERSION]);
      // First time — wipe any stale cache from previous versions
      const deleted = await dbRun('DELETE FROM question_cache');
      console.log('✅ Question cache cleared (fresh install)');
    } else {
      const row = await dbGet('SELECT version FROM schema_version');
      if (!row || Number(row.version) < CURRENT_VERSION) {
        await dbRun('DELETE FROM question_cache');
        await dbRun('DELETE FROM schema_version');
        await dbRun(`INSERT INTO schema_version VALUES (?)`, [CURRENT_VERSION]);
        console.log('✅ Question cache cleared (schema upgrade)');
      }
    }
  } catch (e) {
    console.warn('Cache version check failed (non-fatal):', e);
  }
}
