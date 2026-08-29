import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const activeAdminTokens = new Set<string>();

export function createAdminSession(): string {
  const token = uuidv4();
  activeAdminTokens.add(token);
  return token;
}

export function invalidateAdminSession(token?: string): void {
  if (token) {
    activeAdminTokens.delete(token);
  }
}

export function isValidAdminToken(token?: string): boolean {
  if (!token) return false;
  return activeAdminTokens.has(token);
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
