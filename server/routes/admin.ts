import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { dbQuery, dbRun, getDbStatus } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Admin Users
router.get('/users', authenticate, authorize('settings', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await dbQuery(`
      SELECT a.id, a.first_name, a.last_name, a.username, a.email, a.phone, a.status, a.role_id,
             a.last_login_at, a.last_login_ip, a.two_factor_enabled, a.created_at,
             r.name as role_name, r.slug as role_slug
      FROM admins a
      JOIN admin_roles r ON a.role_id = r.id
      WHERE a.deleted_at IS NULL
      ORDER BY a.id ASC
    `);
    res.json({ success: true, data: users });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/users', authenticate, authorize('settings', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, username, email, phone, role_id, password, status } = req.body;

    const existing = await dbQuery(`SELECT id FROM admins WHERE (username = ? OR email = ?) AND deleted_at IS NULL`, [username, email]);
    if (existing.length > 0) {
      res.status(400).json({ success: false, message: 'Admin username or email already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password || 'Hajji2026!Admin', 10);

    const result = await dbRun(`
      INSERT INTO admins (first_name, last_name, username, email, phone, role_id, password, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [first_name, last_name, username, email, phone || '', role_id || 3, hashedPassword, status || 'active']);

    await logActivity(req.user!.id, 'admin', 'create_user', result.insertId, `Created admin user ${username} (${first_name} ${last_name})`, req);
    res.json({ success: true, id: result.insertId, message: 'Admin user created successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/users/:id/status', authenticate, authorize('settings', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    const { status } = req.body;

    if (targetId === 1 && status !== 'active') {
      res.status(400).json({ success: false, message: 'The primary Super Administrator cannot be deactivated' });
      return;
    }

    await dbRun(`UPDATE admins SET status = ? WHERE id = ?`, [status, targetId]);
    await logActivity(req.user!.id, 'admin', 'update_user_status', targetId, `Changed user #${targetId} status to ${status}`, req);
    res.json({ success: true, message: 'User status updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Roles & Permissions Matrix
router.get('/roles', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const roles = await dbQuery(`SELECT * FROM admin_roles ORDER BY id ASC`);
    const permissions = await dbQuery(`SELECT * FROM admin_permissions ORDER BY module ASC, action ASC`);
    const rolePermissions = await dbQuery(`SELECT * FROM role_permissions`);

    res.json({ success: true, roles, permissions, rolePermissions });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/roles/:id/permissions', authenticate, authorize('settings', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roleId = Number(req.params.id);
    const { permission_ids = [] } = req.body;

    if (roleId === 1) {
      res.status(400).json({ success: false, message: 'Super Administrator role permissions cannot be altered' });
      return;
    }

    // Reset and assign new permissions
    await dbRun(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    for (const pId of permission_ids) {
      await dbRun(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleId, pId]);
    }

    await logActivity(req.user!.id, 'admin', 'update_role_permissions', roleId, `Updated permission matrix for Role #${roleId}`, req);
    res.json({ success: true, message: 'Role permissions matrix updated successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 3. System & Site Settings
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const system = await dbQuery(`SELECT * FROM system_settings ORDER BY group_name ASC`);
    const [site] = await dbQuery(`SELECT * FROM site_settings LIMIT 1`);
    const currencies = await dbQuery(`SELECT * FROM currencies ORDER BY id ASC`);

    res.json({ success: true, system, site: site || {}, currencies });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/settings/site', authenticate, authorize('settings', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { site_name, tagline, email, phone, whatsapp, address, makkah_office, madinah_office } = req.body;
    await dbRun(`
      UPDATE site_settings
      SET site_name = ?, tagline = ?, email = ?, phone = ?, whatsapp = ?, address = ?, makkah_office = ?, madinah_office = ?
      WHERE id = 1
    `, [site_name, tagline, email, phone, whatsapp, address, makkah_office || '', madinah_office || '']);

    await logActivity(req.user!.id, 'settings', 'update_site_settings', 1, 'Updated company and website configuration', req);
    res.json({ success: true, message: 'Site settings updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Audit & Activity Logs
router.get('/audit-logs', authenticate, authorize('audit', 'view'), async (req: AuthRequest, res: Response) => {
  try {
    const { module, limit = 50 } = req.query;
    let sql = `
      SELECT aal.*, a.first_name || ' ' || a.last_name as admin_name, a.username
      FROM admin_activity_logs aal
      LEFT JOIN admins a ON aal.admin_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (module) {
      sql += ` AND aal.module = ?`;
      params.push(module);
    }
    sql += ` ORDER BY aal.id DESC LIMIT ${Number(limit)}`;

    const logs = await dbQuery(sql, params);
    res.json({ success: true, data: logs });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. Notifications
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await dbQuery(`
      SELECT * FROM notifications
      WHERE admin_id = ? OR admin_id IS NULL
      ORDER BY id DESC LIMIT 20
    `, [req.user!.id]);

    const [unread] = await dbQuery(`
      SELECT COUNT(*) as count FROM notifications
      WHERE (admin_id = ? OR admin_id IS NULL) AND is_read = 0
    `, [req.user!.id]);

    res.json({ success: true, data: notifications, unreadCount: unread?.count || 0 });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await dbRun(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 6. DB Status & Hostinger SQL Download
router.get('/db-status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = await getDbStatus();
    res.json({ success: true, status });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/download-sql', authenticate, (req: AuthRequest, res: Response): void => {
  const sqlPath = path.join(process.cwd(), 'hajji_original_tours_database.sql');
  if (fs.existsSync(sqlPath)) {
    res.download(sqlPath, 'hajji_original_tours_database.sql');
  } else {
    res.status(404).json({ success: false, message: 'Schema file not found' });
  }
});

export default router;
