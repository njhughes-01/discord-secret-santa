import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb, DatabaseInstance } from '../db.js';

const activeAdminTokens = new Set<string>();

export function createAdminSession(db?: DatabaseInstance): string {
  const token = uuidv4();
  activeAdminTokens.add(token);

  try {
    const targetDb = db || getDb();
    targetDb.prepare('INSERT OR REPLACE INTO admin_sessions (token, created_at) VALUES (?, ?)').run(token, new Date().toISOString());
  } catch (err) {
    // Memory fallback
  }

  return token;
}

export function invalidateAdminSession(token?: string, db?: DatabaseInstance): void {
  if (token) {
    activeAdminTokens.delete(token);
    try {
      const targetDb = db || getDb();
      targetDb.prepare('DELETE FROM admin_sessions WHERE token = ?').run(token);
    } catch (err) {}
  }
}

export function isValidAdminToken(token?: string, db?: DatabaseInstance): boolean {
  if (!token) return false;
  if (activeAdminTokens.has(token)) return true;

  try {
    const targetDb = db || getDb();
    const row = targetDb.prepare('SELECT token FROM admin_sessions WHERE token = ?').get(token);
    if (row) {
      activeAdminTokens.add(token);
      return true;
    }
  } catch (err) {}

  return false;
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.admin_session;

  let token = cookieToken;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!isValidAdminToken(token)) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Admin authentication required.',
    });
  }

  next();
}
