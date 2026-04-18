import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'codeblaze-dev-secret-change-in-production';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) { res.status(401).json({ error: 'No token provided' }); return; }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
}
