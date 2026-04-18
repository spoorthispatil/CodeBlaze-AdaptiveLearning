import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Groq free tier: 30 req/min, no credit card needed
// Get your free key at: https://console.groq.com/keys
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

function isMissingKey(): boolean {
  const k = process.env.GROQ_API_KEY;
  return !k || k === 'your_groq_api_key_here' || k.length < 10;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

// POST /api/ai/chat — used by AIChat.tsx
router.post('/chat', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.setTimeout(25000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'timeout', text: '⚠️ The AI took too long. Please try again!' });
  });

  try {
    const { messages, systemPrompt } = req.body as {
      messages: { role: string; content: string }[];
      systemPrompt: string;
    };

    if (!messages?.length) { res.status(400).json({ error: 'No messages provided' }); return; }

    if (isMissingKey()) {
      res.json({ text: '⚠️ AI not configured. Add your free GROQ_API_KEY to .env — get it free at https://console.groq.com/keys' });
      return;
    }

    // Build messages for Groq (OpenAI-compatible format)
    const groqMessages = [
      { role: 'system', content: systemPrompt || 'You are a helpful coding mentor.' },
      ...messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    ];

    const response = await withTimeout(
      fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: groqMessages,
          max_tokens: 400,
          temperature: 0.85,
        }),
      }),
      20000
    );

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const text = data?.choices?.[0]?.message?.content || 'Something went wrong. Try again!';
    if (!res.headersSent) res.json({ text });

  } catch (e: any) {
    const msg: string = e?.message || '';
    console.error('AI chat error:', msg);
    if (res.headersSent) return;

    let friendlyText: string;
    if (msg === 'TIMEOUT') {
      friendlyText = '⚠️ AI took too long. Please try again!';
    } else if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('Too Many Requests')) {
      friendlyText = '⚠️ Rate limit hit. Wait a few seconds and try again.';
    } else if (msg.includes('401') || msg.includes('invalid_api_key')) {
      friendlyText = '⚠️ Invalid API key. Check your GROQ_API_KEY in the .env file.';
    } else {
      friendlyText = '⚠️ AI is temporarily unavailable. Please try again in a moment.';
    }

    res.status(500).json({ error: 'AI request failed', text: friendlyText });
  }
});

// POST /api/ai/insight — used by SkillGapAnalyzer.tsx
router.post('/insight', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.setTimeout(25000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'timeout', text: 'Focus on your critical gaps first. Build foundations before advancing.' });
  });

  try {
    const { prompt } = req.body as { prompt: string };
    if (!prompt) { res.status(400).json({ error: 'No prompt provided' }); return; }

    if (isMissingKey()) {
      res.json({ text: 'Focus on your critical gaps first — build foundations before advancing. Every session moves you forward!' });
      return;
    }

    const response = await withTimeout(
      fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.7,
        }),
      }),
      20000
    );

    const data = await response.json() as any;
    const text = data?.choices?.[0]?.message?.content || 'Focus on your critical gaps first. Build foundations before advancing.';
    if (!res.headersSent) res.json({ text });

  } catch (e: any) {
    console.error('AI insight error:', e?.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI request failed', text: 'Focus on your critical gaps first. Build foundations before advancing.' });
    }
  }
});

export default router;

// GET /api/ai/history?avatarId=xxx — load chat history
router.get('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { getDb } = await import('../db/database.js');
    const db = getDb();
    const avatarId = req.query.avatarId as string;
    const where = avatarId
      ? `WHERE user_id = '${req.userId}' AND avatar_id = '${avatarId}'`
      : `WHERE user_id = '${req.userId}'`;
    const rows = await db.select(`SELECT * FROM chat_messages ${where} ORDER BY created_at ASC LIMIT 100`);
    res.json({ messages: rows });
  } catch (e) {
    res.status(500).json({ messages: [] });
  }
});

// POST /api/ai/history — save messages
router.post('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { getDb } = await import('../db/database.js');
    const db = getDb();
    const { messages } = req.body as { messages: { id: string; avatar_id: string; role: string; content: string }[] };
    for (const m of messages) {
      await db.execute(
        `INSERT OR IGNORE INTO chat_messages (id, user_id, avatar_id, role, content) VALUES (?, ?, ?, ?, ?)`,
        [m.id, req.userId, m.avatar_id, m.role, m.content]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

// DELETE /api/ai/history?avatarId=xxx — clear chat history
router.delete('/history', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { getDb } = await import('../db/database.js');
    const db = getDb();
    const avatarId = req.query.avatarId as string;
    if (avatarId) {
      await db.execute(`DELETE FROM chat_messages WHERE user_id = ? AND avatar_id = ?`, [req.userId, avatarId]);
    } else {
      await db.execute(`DELETE FROM chat_messages WHERE user_id = ?`, [req.userId]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});
