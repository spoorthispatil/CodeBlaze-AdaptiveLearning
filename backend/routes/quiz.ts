import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/database.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { generateQuestions, generateDiagnosticQuestions } from './ai.service.js';

const router = Router();

// Diagnostic quiz
router.get('/diagnostic', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await dbGet('SELECT domain FROM users WHERE id = ?', [req.userId]);
    const domain = (user?.domain as string) || 'DSA';
    const questions = await generateDiagnosticQuestions(domain);
    res.json({ questions, domain });
  } catch (e) {
    console.error('Diagnostic error:', e);
    res.status(500).json({ error: 'Failed to generate diagnostic quiz' });
  }
});

// Topic quiz
router.get('/topic/:topicId', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const topicId = req.params.topicId as string;
    const topic = await dbGet('SELECT * FROM topics WHERE id = ?', [topicId]);
    if (!topic) { res.status(404).json({ error: 'Topic not found' }); return; }

    const masteryRow = await dbGet(
      'SELECT mastery_score FROM user_mastery WHERE user_id = ? AND topic_id = ?',
      [req.userId, topicId]
    );
    const currentMastery = Number(masteryRow?.mastery_score ?? 0);

    let difficulty = Number(topic.difficulty_level);
    if (currentMastery < 40) difficulty = Math.max(1, difficulty - 1);
    if (currentMastery > 70) difficulty = Math.min(10, difficulty + 2);

    // Try cache first
    const cached = await dbAll(
      `SELECT * FROM question_cache WHERE topic_id = ? AND difficulty = ? ORDER BY RANDOM() LIMIT 20`,
      [topicId, difficulty]
    );

    let questions;
    if (cached.length >= 20) {
      questions = cached.map((q: any) => ({
        id: q.id, topicId: q.topic_id, type: q.question_type, difficulty: Number(q.difficulty),
        text: q.question_text, options: q.options ? JSON.parse(q.options as string) : undefined,
        correctAnswer: q.correct_answer, explanation: q.explanation
      }));
    } else {
      questions = await generateQuestions(
        topic.domain as string, topic.title as string, topicId, difficulty, 20
      );
      for (const q of questions) {
        await dbRun(
          `INSERT INTO question_cache (id,topic_id,domain,difficulty,question_type,question_text,options,correct_answer,explanation) VALUES (?,?,?,?,?,?,?,?,?)`,
          [uuidv4(), topicId, topic.domain, q.difficulty, q.type, q.text, JSON.stringify(q.options ?? null), q.correctAnswer, q.explanation]
        );
      }
    }

    res.json({ questions, topic: { id: topic.id, title: topic.title, domain: topic.domain }, currentMastery });
  } catch (e) {
    console.error('Topic quiz error:', e);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Submit quiz
router.post('/submit', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { topicId, answers, isDiagnostic, timeTaken } = req.body;
    if (!answers || typeof answers !== 'object') { res.status(400).json({ error: 'Invalid answers' }); return; }

    const total = Object.keys(answers).length;
    const correct = Object.values(answers as Record<string, any>).filter((a: any) => a.isCorrect).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const attemptId = uuidv4();
    await dbRun(
      `INSERT INTO quiz_attempts (id,user_id,topic_id,score,total_questions,is_diagnostic,answers,time_taken) VALUES (?,?,?,?,?,?,?,?)`,
      [attemptId, req.userId, topicId || 'diagnostic', score, total, isDiagnostic ? 1 : 0, JSON.stringify(answers), timeTaken || 0]
    );

    let newMastery: number | undefined;

    if (topicId && !isDiagnostic) {
      const existing = await dbGet(
        'SELECT mastery_score, attempts FROM user_mastery WHERE user_id = ? AND topic_id = ?',
        [req.userId, topicId]
      );
      if (existing) {
        const attempts = Number(existing.attempts) + 1;
        const weight = Math.min(0.7, 1 / Math.sqrt(attempts));
        newMastery = Math.round(Number(existing.mastery_score) * (1 - weight) + score * weight);
        await dbRun(
          `UPDATE user_mastery SET mastery_score=?, attempts=?, last_updated=datetime('now') WHERE user_id=? AND topic_id=?`,
          [newMastery, attempts, req.userId, topicId]
        );
      } else {
        newMastery = score;
        await dbRun(
          `INSERT OR REPLACE INTO user_mastery (id,user_id,topic_id,mastery_score,attempts) VALUES (?,?,?,?,1)`,
          [uuidv4(), req.userId, topicId, score]
        );
      }

      // Update streak
      const user = await dbGet('SELECT learning_streak, last_active FROM users WHERE id = ?', [req.userId]);
      const daysDiff = Math.floor((Date.now() - new Date(user.last_active as string).getTime()) / 86400000);
      const newStreak = daysDiff <= 1 ? Number(user.learning_streak) + 1 : 1;
      await dbRun(`UPDATE users SET learning_streak=?, last_active=datetime('now') WHERE id=?`, [newStreak, req.userId]);

    } else {
      // Diagnostic — update mastery per topic from answers
      const topicMap = new Map<string, { correct: number; total: number }>();
      for (const a of Object.values(answers as Record<string, any>)) {
        const tid = a.topicId || topicId;
        if (!tid) continue;
        const cur = topicMap.get(tid) || { correct: 0, total: 0 };
        topicMap.set(tid, { correct: cur.correct + (a.isCorrect ? 1 : 0), total: cur.total + 1 });
      }
      for (const [tid, stats] of topicMap) {
        const ts = Math.round((stats.correct / stats.total) * 100);
        const existing = await dbGet('SELECT id FROM user_mastery WHERE user_id=? AND topic_id=?', [req.userId, tid]);
        if (existing) {
          await dbRun(`UPDATE user_mastery SET mastery_score=?, last_updated=datetime('now') WHERE user_id=? AND topic_id=?`, [ts, req.userId, tid]);
        } else {
          await dbRun(`INSERT OR IGNORE INTO user_mastery (id,user_id,topic_id,mastery_score,attempts) VALUES (?,?,?,?,1)`, [uuidv4(), req.userId, tid, ts]);
        }
      }
      await dbRun(`UPDATE users SET last_active=datetime('now') WHERE id=?`, [req.userId]);
    }

    res.json({ success: true, score, correctCount: correct, totalQuestions: total, newMastery, attemptId });
  } catch (e) {
    console.error('Submit error:', e);
    res.status(500).json({ error: 'Failed to submit quiz' });
  }
});

// Quiz history
router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const attempts = await dbAll(
      `SELECT qa.*, t.title as topic_title FROM quiz_attempts qa LEFT JOIN topics t ON qa.topic_id = t.id WHERE qa.user_id = ? ORDER BY qa.created_at DESC LIMIT 30`,
      [req.userId]
    );
    res.json({ attempts });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

export default router;
