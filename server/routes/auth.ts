import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { dbQuery, dbRun, getDbStatus } from '../db';
import { generateToken, authenticate, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// In-memory circular buffer for safe auth request logging (NEVER logs passwords or tokens)
export interface SafeAuthLog {
  timestamp: string;
  method: string;
  path: string;
  origin: string;
  ip: string;
  identifier?: string;
  status: number;
  message?: string;
}

const safeAuthLogs: SafeAuthLog[] = [];

export function recordAuthLog(entry: SafeAuthLog): void {
  safeAuthLogs.unshift(entry);
  if (safeAuthLogs.length > 30) {
    safeAuthLogs.pop();
  }
}

export function getSafeAuthLogs(): SafeAuthLog[] {
  return [...safeAuthLogs];
}

// Explicit OPTIONS handler for /login preflights
router.options('/login', (req: Request, res: Response): void => {
  const origin = (req.headers.origin as string) || 'none';
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  console.log(`[Auth Login Preflight] OPTIONS /api/auth/login from Origin: "${origin}", IP: ${ip}`);
  recordAuthLog({
    timestamp: new Date().toISOString(),
    method: 'OPTIONS',
    path: '/api/auth/login',
    origin,
    ip,
    status: 204,
    message: 'Preflight OK',
  });
  res.status(204).end();
});

// 1. Diagnostic endpoint for Hostinger verification (safe, zero credentials exposed)
router.get('/diagnostic', async (req: Request, res: Response) => {
  try {
    const dbStatus = await getDbStatus();
    let adminsTableExists = false;
    let adminCount = 0;
    let superadminFound = false;
    let superadminActive = false;
    let superadminEmail: string | null = null;
    let queryError: string | null = null;

    try {
      const countRes = await dbQuery(`SELECT COUNT(*) as cnt FROM admins WHERE deleted_at IS NULL`);
      adminsTableExists = true;
      adminCount = Number(countRes[0]?.cnt || 0);

      const superCheck = await dbQuery(
        `SELECT id, username, email, status, role_id FROM admins WHERE username = 'superadmin' OR email = 'admin@hajjioriginal.com' OR email = 'admin@hajjioriginaltours.com' LIMIT 1`
      );
      if (superCheck.length > 0) {
        superadminFound = true;
        superadminActive = superCheck[0].status === 'active';
        superadminEmail = superCheck[0].email;
      }
    } catch (e: any) {
      queryError = e.message || 'Database query error';
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      apiUrl: '/api/auth/login',
      database: {
        connected: dbStatus.connected,
        engine: dbStatus.engine,
        host: dbStatus.host,
        databaseName: dbStatus.database,
        tablesCount: dbStatus.tablesCount,
        lastError: dbStatus.lastError || null,
        adminsTableExists,
        adminCount,
        superadminFound,
        superadminActive,
        superadminEmail,
        queryError,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        corsEnabled: true,
      },
      recentAuthLogs: getSafeAuthLogs(),
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to run authentication diagnostic',
      error: err.message,
    });
  }
});

// 2. Main Login Endpoint
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  const origin = (req.headers.origin as string) || 'none';
  const ua = (req.headers['user-agent'] as string) || '';
  const { username, password } = req.body || {};
  const cleanUsername = username ? String(username).trim() : '';

  console.log(`[Auth Login Request] POST /api/auth/login - Identifier: "${cleanUsername || 'empty'}" - Origin: "${origin}" - IP: ${ip}`);

  try {
    if (!username || !password) {
      recordAuthLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        origin,
        ip,
        identifier: cleanUsername || undefined,
        status: 400,
        message: 'Missing username or password',
      });
      console.log(`[Auth Login Response] POST /api/auth/login -> Status 400 (Missing fields)`);
      res.status(400).json({ success: false, message: 'Username and password are required' });
      return;
    }

    // Query admin using LEFT JOIN so missing admin_roles row won't block authentication
    let admins: any[] = [];
    try {
      admins = await dbQuery(
        `SELECT a.*, r.slug as role_slug, r.name as role_name
         FROM admins a
         LEFT JOIN admin_roles r ON a.role_id = r.id
         WHERE (
           LOWER(a.username) = LOWER(?)
           OR LOWER(a.email) = LOWER(?)
           OR (
             (a.username = 'superadmin' OR a.id = 1)
             AND LOWER(?) IN ('admin', 'superadmin', 'admin@hajjioriginal.com', 'admin@hajjioriginaltours.com', 'atif', 'atifkhalil', 'atif khalil', 'atifkhalil1234567@gmail.com')
           )
         )
           AND a.deleted_at IS NULL
         LIMIT 1`,
        [cleanUsername, cleanUsername, cleanUsername]
      );
    } catch (sqlErr: any) {
      console.error('[Auth SQL Error]:', sqlErr.message);
      // Check if table missing
      if (sqlErr.message?.includes("doesn't exist") || sqlErr.message?.includes('no such table')) {
        res.status(500).json({
          success: false,
          message: 'Database schema incomplete: "admins" table not found in Hostinger MySQL. Please import hajji_original_tours_database.sql in phpMyAdmin.',
        });
        return;
      }
      throw sqlErr;
    }

    // Auto-heal: If no admin is found but table is empty, auto-create the superadmin account
    if (admins.length === 0) {
      try {
        const totalAdmins = await dbQuery(`SELECT COUNT(*) as cnt FROM admins`);
        const count = Number(totalAdmins[0]?.cnt || 0);
        if (count === 0 && (cleanUsername.toLowerCase() === 'superadmin' || cleanUsername.toLowerCase() === 'admin@hajjioriginal.com')) {
          console.log('[Auth] Database has 0 admins. Auto-seeding initial superadmin record...');
          try {
            await dbRun(
              `INSERT INTO admin_roles (id, name, slug, description) VALUES (1, 'Super Administrator', 'super_admin', 'Full system access')`
            );
          } catch {}

          // Default bcrypt hash for 'admin123'
          const defaultHash = '$2b$10$3LarB2UPSbdPa4MwL5IGduX1.JQpylso2pE5rYU0OONmYx7Qp60oC';
          await dbRun(
            `INSERT INTO admins (id, role_id, first_name, last_name, username, email, phone, password, status)
             VALUES (1, 1, 'Atif', 'Khalil', 'superadmin', 'admin@hajjioriginal.com', '+966 50 123 4567', ?, 'active')`,
            [defaultHash]
          );

          admins = await dbQuery(
            `SELECT a.*, r.slug as role_slug, r.name as role_name
             FROM admins a
             LEFT JOIN admin_roles r ON a.role_id = r.id
             WHERE (LOWER(a.username) = LOWER(?) OR LOWER(a.email) = LOWER(?))
               AND a.deleted_at IS NULL
             LIMIT 1`,
            [cleanUsername, cleanUsername]
          );
        }
      } catch (autoErr: any) {
        console.warn('[Auth] Auto-heal check notice:', autoErr.message);
      }
    }

    if (admins.length === 0) {
      console.warn(`[Auth Login Response] POST /api/auth/login -> Status 401 (User not found for identifier "${cleanUsername}")`);
      recordAuthLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        origin,
        ip,
        identifier: cleanUsername,
        status: 401,
        message: 'User not found',
      });
      try {
        await dbRun(
          `INSERT INTO login_attempts (username_or_email, ip_address, user_agent, status) VALUES (?, ?, ?, 'failed')`,
          [cleanUsername, ip, ua]
        );
      } catch {}
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    const admin = admins[0];

    if (admin.status !== 'active') {
      console.warn(`[Auth Login Response] POST /api/auth/login -> Status 403 (Account status "${admin.status}" for "${admin.username}")`);
      recordAuthLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        origin,
        ip,
        identifier: cleanUsername,
        status: 403,
        message: `Account status: ${admin.status}`,
      });
      try {
        await dbRun(
          `INSERT INTO login_attempts (username_or_email, ip_address, user_agent, status) VALUES (?, ?, ?, 'blocked')`,
          [cleanUsername, ip, ua]
        );
      } catch {}
      res.status(403).json({ success: false, message: `Account is currently ${admin.status}. Please contact the Super Administrator.` });
      return;
    }

    // Password verification: Validate submitted password against stored hash using bcrypt
    let isValid = false;
    const storedPassword = String(admin.password || '');

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      isValid = await bcrypt.compare(password, storedPassword);
    }

    if (!isValid) {
      console.warn(`[Auth Login Response] POST /api/auth/login -> Status 401 (Password mismatch for admin "${admin.username}")`);
      recordAuthLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/auth/login',
        origin,
        ip,
        identifier: cleanUsername,
        status: 401,
        message: 'Password mismatch',
      });
      try {
        await dbRun(`UPDATE admins SET failed_login_count = failed_login_count + 1 WHERE id = ?`, [admin.id]);
        await dbRun(
          `INSERT INTO login_attempts (username_or_email, ip_address, user_agent, status) VALUES (?, ?, ?, 'failed')`,
          [cleanUsername, ip, ua]
        );
      } catch {}
      res.status(401).json({ success: false, message: 'Invalid username or password' });
      return;
    }

    // Fetch permissions with fallback
    let perms: string[] = [];
    try {
      if (admin.role_slug === 'super_admin' || admin.role_id === 1 || admin.username === 'superadmin') {
        const allPerms = await dbQuery(`SELECT module, action FROM admin_permissions`);
        perms = allPerms.map((p: any) => `${p.module}:${p.action}`);
      } else {
        const rolePerms = await dbQuery(
          `SELECT ap.module, ap.action
           FROM role_permissions rp
           JOIN admin_permissions ap ON rp.permission_id = ap.id
           WHERE rp.role_id = ?`,
          [admin.role_id]
        );
        perms = rolePerms.map((p: any) => `${p.module}:${p.action}`);
      }
    } catch (permErr: any) {
      console.warn('[Auth] Permissions query fallback notice:', permErr.message);
    }

    // Fallback full permissions if permissions table was empty or not joined
    if (perms.length === 0 && (admin.role_id === 1 || admin.username === 'superadmin' || admin.role_slug === 'super_admin')) {
      perms = [
        'dashboard:view', 'packages:view', 'packages:manage', 'hotels:view', 'hotels:manage',
        'bookings:view', 'bookings:manage', 'crm:view', 'crm:manage', 'finance:view', 'finance:manage',
        'travel:view', 'travel:manage', 'cms:view', 'cms:manage', 'admin:view', 'admin:manage'
      ];
    }

    // Update last login (CURRENT_TIMESTAMP is compatible with both MySQL and SQLite)
    try {
      await dbRun(
        `UPDATE admins SET failed_login_count = 0, last_login_at = CURRENT_TIMESTAMP, last_login_ip = ? WHERE id = ?`,
        [ip, admin.id]
      );
      await dbRun(
        `INSERT INTO login_attempts (username_or_email, ip_address, user_agent, status) VALUES (?, ?, ?, 'success')`,
        [cleanUsername, ip, ua]
      );
    } catch (logErr: any) {
      console.warn('[Auth] Update last login non-critical notice:', logErr.message);
    }

    const userPayload = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      role_id: admin.role_id || 1,
      role_slug: admin.role_slug || 'super_admin',
      role_name: admin.role_name || 'Super Administrator',
      permissions: perms,
    };

    const token = generateToken(userPayload);
    console.log(`[Auth Login Response] POST /api/auth/login -> Status 200 (Success for "${admin.username}", Role: ${admin.role_name || admin.role_slug})`);
    recordAuthLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/login',
      origin,
      ip,
      identifier: cleanUsername,
      status: 200,
      message: 'Login successful',
    });

    try {
      await logActivity(admin.id, 'auth', 'login', admin.id, `Admin ${admin.username} logged in successfully.`, req);
    } catch {}

    res.json({
      success: true,
      token,
      user: userPayload,
      message: 'Login successful',
    });
  } catch (err: any) {
    console.error('[Auth Error]', err.message, err.stack);
    recordAuthLog({
      timestamp: new Date().toISOString(),
      method: 'POST',
      path: '/api/auth/login',
      origin,
      ip,
      identifier: cleanUsername || undefined,
      status: 500,
      message: `Server error: ${err.message}`,
    });
    res.status(500).json({
      success: false,
      message: `Authentication failed: ${err.message || 'Server error'}`,
    });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({ success: true, user: req.user });
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await dbRun(`UPDATE admins SET password = ? WHERE id = ?`, [hashed, req.user!.id]);

    await logActivity(req.user!.id, 'auth', 'password_change', req.user!.id, `Password changed by ${req.user!.username}`, req);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await logActivity(req.user.id, 'auth', 'logout', req.user.id, `Admin ${req.user.username} logged out`, req);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
