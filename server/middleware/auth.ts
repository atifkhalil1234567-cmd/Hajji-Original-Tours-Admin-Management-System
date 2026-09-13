import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { dbQuery, dbRun } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'hajji_original_tours_secure_session_2026';

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  permissions: string[];
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (err: any) {
    // Seamless session recovery: if token has valid signature from our JWT_SECRET but expired,
    // verify the admin account is still active in the database and re-issue a fresh token
    if (err && (err.name === 'TokenExpiredError' || err.message?.includes('expired'))) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as AuthenticatedUser;
        if (decoded && decoded.id) {
          const admins = await dbQuery('SELECT id, status FROM admins WHERE id = ? AND deleted_at IS NULL', [decoded.id]);
          if (admins.length > 0 && admins[0].status === 'active') {
            const { exp, iat, ...userPayload } = decoded as any;
            req.user = userPayload as AuthenticatedUser;
            // Generate a fresh 30-day token and expose via header for client storage
            const freshToken = generateToken(userPayload as AuthenticatedUser);
            res.setHeader('X-Refreshed-Token', freshToken);
            res.setHeader('Access-Control-Expose-Headers', 'X-Refreshed-Token');
            return next();
          }
        }
      } catch {
        // Fall through to 401
      }
    }

    res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
  }
}

export function authorize(module: string, action: string = 'view') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // Super Administrator has unrestricted access
    if (req.user.role_slug === 'super_admin' || req.user.role_id === 1) {
      return next();
    }

    const permKey = `${module}:${action}`;
    const permWildcard = `${module}:manage`;

    if (req.user.permissions?.includes(permKey) || req.user.permissions?.includes(permWildcard)) {
      return next();
    }

    res.status(403).json({
      success: false,
      message: `Access denied. You do not have permission to ${action} in ${module}.`,
    });
  };
}

export async function logActivity(
  adminId: number | null,
  module: string,
  action: string,
  recordId: string | number | null,
  description: string,
  req?: Request
) {
  try {
    const ip = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
    const ua = req?.headers['user-agent'] || '';
    await dbRun(
      `INSERT INTO admin_activity_logs (admin_id, module, action, record_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [adminId, module, action, recordId ? String(recordId) : null, description, ip, ua]
    );

    // Also write into general audit_logs
    await dbRun(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, action, module, recordId ? String(recordId) : null, description, ip]
    );
  } catch (e) {
    console.warn('[Audit Log] Failed to record activity:', e);
  }
}
