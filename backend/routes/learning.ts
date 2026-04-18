import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { generateAdaptiveLearningPath, generatePracticeExercise } from './ai.service.js';

// Cache learning-path per user for 10 minutes to avoid spamming Gemini on every page load
const pathCache = new Map<string, { data: any; ts: number }>();
const PATH_CACHE_TTL = 10 * 60 * 1000;

// Cache learning-path per user for 10 minutes to avoid spamming Gemini on every page load

const router = Router();

// All available domains
router.get('/domains', (_req: any, res: Response): void => {
  res.json({
    domains: [
      { id: 'DSA', label: 'Data Structures & Algorithms', category: 'Technology' },
      { id: 'ML', label: 'Machine Learning & AI', category: 'Technology' },
      { id: 'WebDev', label: 'Full-Stack Web Dev', category: 'Technology' },
      { id: 'SystemDesign', label: 'System Design', category: 'Technology' },
      { id: 'CloudComputing', label: 'Cloud Computing', category: 'Technology' },
      { id: 'CyberSecurity', label: 'Cyber Security', category: 'Technology' },
      { id: 'DataScience', label: 'Data Science', category: 'Technology' },
      { id: 'ProductManagement', label: 'Product Management', category: 'Business' },
      { id: 'BusinessAnalytics', label: 'Business Analytics', category: 'Business' },
      { id: 'Finance', label: 'Finance & Investing', category: 'Business' },
      { id: 'DigitalMarketing', label: 'Digital Marketing', category: 'Business' },
      { id: 'UXDesign', label: 'UX / UI Design', category: 'Design' },
      { id: 'Psychology', label: 'Psychology', category: 'Humanities' },
      { id: 'Medicine', label: 'Medicine & Health', category: 'Humanities' },
    ]
  });
});

// Topics for user's domain
router.get('/topics', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await dbGet('SELECT domain FROM users WHERE id = ?', [req.userId]);
    const domain = (req.query.domain as string) || (user?.domain as string) || 'DSA';

    const topics = await dbAll(
      `SELECT t.*, um.mastery_score, um.attempts, um.last_updated
       FROM topics t
       LEFT JOIN user_mastery um ON t.id = um.topic_id AND um.user_id = ?
       WHERE t.domain = ?
       ORDER BY t.order_index ASC`,
      [req.userId, domain]
    );

    res.json({
      topics: topics.map((t: any) => ({
        id: t.id, title: t.title, description: t.description, domain: t.domain,
        prerequisites: JSON.parse((t.prerequisites as string) || '[]'),
        difficultyLevel: Number(t.difficulty_level),
        orderIndex: Number(t.order_index),
        mastery: Number(t.mastery_score ?? 0),
        attempts: Number(t.attempts ?? 0),
        lastUpdated: t.last_updated,
      })),
      domain
    });
  } catch (e) {
    console.error('Topics error:', e);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
});

// Knowledge graph
router.get('/knowledge-graph', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await dbGet('SELECT domain FROM users WHERE id = ?', [req.userId]);
    const domain = (user?.domain as string) || 'DSA';

    const topics = await dbAll(
      `SELECT t.id, t.title, t.prerequisites, COALESCE(um.mastery_score, 0) as mastery, t.difficulty_level
       FROM topics t
       LEFT JOIN user_mastery um ON t.id = um.topic_id AND um.user_id = ?
       WHERE t.domain = ? ORDER BY t.order_index`,
      [req.userId, domain]
    );

    const nodes = topics.map((t: any) => ({
      id: t.id, label: t.title, mastery: Number(t.mastery), difficulty: Number(t.difficulty_level)
    }));

    const links: { source: string; target: string }[] = [];
    for (const t of topics) {
      const prereqs: string[] = JSON.parse((t.prerequisites as string) || '[]');
      for (const pid of prereqs) links.push({ source: pid, target: t.id as string });
    }

    res.json({ nodes, links, domain });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate knowledge graph' });
  }
});

// Adaptive learning path
router.get('/learning-path', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await dbGet('SELECT domain FROM users WHERE id = ?', [req.userId]);
    const domain = (user?.domain as string) || 'DSA';

    const rows = await dbAll(
      `SELECT t.id as topicId, t.title, COALESCE(um.mastery_score, 0) as mastery
       FROM topics t
       LEFT JOIN user_mastery um ON t.id = um.topic_id AND um.user_id = ?
       WHERE t.domain = ? ORDER BY t.order_index`,
      [req.userId, domain]
    );

    const masteryData = rows.map((r: any) => ({
      topicId: r.topicId as string, title: r.title as string, mastery: Number(r.mastery)
    }));

    // Return cached path if fresh (saves Gemini quota on repeated loads)
    const cacheKey = `${req.userId}:${domain}`;
    const cached = pathCache.get(cacheKey);
    const avgMastery = masteryData.length
      ? Math.round(masteryData.reduce((s, t) => s + t.mastery, 0) / masteryData.length)
      : 0;

    let recommendations;
    if (cached && Date.now() - cached.ts < PATH_CACHE_TTL) {
      recommendations = cached.data;
    } else {
      recommendations = await generateAdaptiveLearningPath(domain, masteryData);
      pathCache.set(cacheKey, { data: recommendations, ts: Date.now() });
    }

    res.json({
      recommendations,
      stats: {
        avgMastery,
        atRiskCount: masteryData.filter(t => t.mastery < 60 && t.mastery > 0).length,
        masteredCount: masteryData.filter(t => t.mastery >= 80).length,
        totalTopics: masteryData.length,
      }
    });
  } catch (e) {
    console.error('Learning path error:', e);
    res.status(500).json({ error: 'Failed to generate learning path' });
  }
});

// Practice exercise
router.get('/practice/:topicId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { topicId } = req.params;
    const topic = await dbGet('SELECT * FROM topics WHERE id = ?', [topicId]);
    if (!topic) { res.status(404).json({ error: 'Topic not found' }); return; }

    const mr = await dbGet('SELECT mastery_score FROM user_mastery WHERE user_id=? AND topic_id=?', [req.userId, topicId]);
    const mastery = Number(mr?.mastery_score ?? 0);
    const exercise = await generatePracticeExercise(topic.domain as string, topic.title as string, mastery);

    res.json({ exercise, topic: { id: topic.id, title: topic.title } });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate exercise' });
  }
});

// Analytics
router.get('/analytics', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await dbGet('SELECT domain, learning_streak FROM users WHERE id = ?', [req.userId]);
    const domain = (user?.domain as string) || 'DSA';

    const [quizHistory, topicMastery, stats, weakAreas, recentCount] = await Promise.all([
      dbAll(
        `SELECT DATE(created_at) as date, ROUND(AVG(score),0) as avg_score, COUNT(*) as quiz_count
         FROM quiz_attempts WHERE user_id=? AND created_at >= datetime('now','-30 days')
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [req.userId]
      ),
      dbAll(
        `SELECT t.title, t.difficulty_level, COALESCE(um.mastery_score,0) as mastery
         FROM topics t LEFT JOIN user_mastery um ON t.id=um.topic_id AND um.user_id=?
         WHERE t.domain=? ORDER BY t.order_index`,
        [req.userId, domain]
      ),
      dbGet(
        `SELECT COUNT(*) as total_quizzes, ROUND(AVG(score),0) as avg_score,
                MAX(score) as best_score, SUM(time_taken) as total_time
         FROM quiz_attempts WHERE user_id=?`,
        [req.userId]
      ),
      dbAll(
        `SELECT t.title, t.id, COALESCE(um.mastery_score,0) as mastery
         FROM topics t LEFT JOIN user_mastery um ON t.id=um.topic_id AND um.user_id=?
         WHERE t.domain=? AND COALESCE(um.mastery_score,0) < 60
         ORDER BY COALESCE(um.mastery_score,0) ASC LIMIT 5`,
        [req.userId, domain]
      ),
      dbGet(
        `SELECT COUNT(*) as count FROM quiz_attempts WHERE user_id=? AND created_at >= datetime('now','-7 days')`,
        [req.userId]
      ),
    ]);

    const mastered = (topicMastery as any[]).filter((t: any) => Number(t.mastery) >= 80).length;
    const remaining = topicMastery.length - mastered;
    const velocity = Math.max(Number(recentCount?.count ?? 1), 1);
    const weeksLeft = Math.ceil(remaining / velocity);
    const predicted = new Date();
    predicted.setDate(predicted.getDate() + weeksLeft * 7);

    res.json({
      quizHistory: (quizHistory as any[]).map((r: any) => ({ date: r.date, avg_score: Number(r.avg_score), quiz_count: Number(r.quiz_count) })),
      topicMastery: (topicMastery as any[]).map((t: any) => ({ title: t.title, difficulty_level: Number(t.difficulty_level), mastery: Number(t.mastery) })),
      stats: {
        totalQuizzes: Number(stats?.total_quizzes ?? 0),
        avgScore: Number(stats?.avg_score ?? 0),
        bestScore: Number(stats?.best_score ?? 0),
        totalTimeMinutes: Math.round(Number(stats?.total_time ?? 0) / 60),
        learningStreak: Number(user?.learning_streak ?? 0),
      },
      weakAreas: (weakAreas as any[]).map((a: any) => ({ title: a.title, id: a.id, mastery: Number(a.mastery) })),
      predictedCompletion: predicted.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      masteredCount: mastered,
      totalTopics: topicMastery.length,
    });
  } catch (e) {
    console.error('Analytics error:', e);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;
