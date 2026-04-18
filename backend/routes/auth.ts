import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/database.js';
import { generateToken, authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) { res.status(400).json({ error: 'All fields required' }); return; }
    if (password.length < 6) { res.status(400).json({ error: 'Password must be at least 6 characters' }); return; }

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    await dbRun(
      `INSERT INTO users (id, email, password_hash, display_name, onboarded, learning_streak) VALUES (?,?,?,?,0,0)`,
      [userId, email.toLowerCase(), passwordHash, displayName]
    );

    const token = generateToken(userId, email);
    res.status(201).json({
      token,
      user: { id: userId, email: email.toLowerCase(), displayName, domain: null, onboarded: false, learningStreak: 0, mastery: {} }
    });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: 'Email and password required' }); return; }

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user) { res.status(401).json({ error: 'Invalid email or password' }); return; }

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) { res.status(401).json({ error: 'Invalid email or password' }); return; }

    const masteryRows = await dbAll(
      `SELECT t.title, um.mastery_score FROM user_mastery um JOIN topics t ON um.topic_id = t.id WHERE um.user_id = ?`,
      [user.id]
    );
    const mastery: Record<string, number> = {};
    for (const row of masteryRows) mastery[row.title as string] = Number(row.mastery_score);

    await dbRun(`UPDATE users SET last_active = datetime('now') WHERE id = ?`, [user.id]);

    const token = generateToken(user.id as string, user.email as string);
    res.json({
      token,
      user: {
        id: user.id, email: user.email, displayName: user.display_name,
        domain: user.domain, onboarded: Number(user.onboarded) === 1,
        learningStreak: Number(user.learning_streak), mastery
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const masteryRows = await dbAll(
      `SELECT t.title, um.mastery_score FROM user_mastery um JOIN topics t ON um.topic_id = t.id WHERE um.user_id = ?`,
      [req.userId]
    );
    const mastery: Record<string, number> = {};
    for (const row of masteryRows) mastery[row.title as string] = Number(row.mastery_score);

    res.json({
      id: user.id, email: user.email, displayName: user.display_name,
      domain: user.domain, onboarded: Number(user.onboarded) === 1,
      learningStreak: Number(user.learning_streak), lastActive: user.last_active, mastery
    });
  } catch (e) {
    console.error('Profile error:', e);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile / complete onboarding
router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { displayName, domain } = req.body;

    if (domain) {
      await dbRun(
        `UPDATE users SET domain = ?, onboarded = 1, display_name = COALESCE(?, display_name) WHERE id = ?`,
        [domain, displayName ?? null, req.userId]
      );
      // seed mastery rows for this domain
      const topics = await dbAll('SELECT id FROM topics WHERE domain = ?', [domain]);
      for (const t of topics) {
        await dbRun(
          `INSERT OR IGNORE INTO user_mastery (id, user_id, topic_id, mastery_score) VALUES (?,?,?,0)`,
          [uuidv4(), req.userId, t.id]
        );
      }
    } else if (displayName) {
      await dbRun('UPDATE users SET display_name = ? WHERE id = ?', [displayName, req.userId]);
    }

    res.json({ success: true });
  } catch (e) {
    console.error('Profile update error:', e);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
