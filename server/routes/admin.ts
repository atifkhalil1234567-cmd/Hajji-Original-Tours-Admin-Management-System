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

// ================= 7. USER MANAGEMENT (CUSTOMER APPROVAL & ROLE WORKFLOW) =================

const ASSIGNABLE_ROLES = [
  { id: 'Customer', name: 'Customer', description: 'Standard pilgrim self-service portal: own profile, bookings, passports & packages' },
  { id: 'VIP Customer', name: 'VIP Customer', description: 'VIP Pilgrim portal: priority support, luxury concierge, executive baggage & lounge perks' },
  { id: 'Travel Agent', name: 'Travel Agent', description: 'External agency partner: group reservations, B2B package allocation & pilgrim manifests' },
  { id: 'Booking Agent', name: 'Booking Agent', description: 'Internal reservation agent: booking verification, client manifests & inquiry handling' },
  { id: 'Finance', name: 'Finance', description: 'Accounts officer: invoices, payment receipts, balance audits & transaction reconciliation' },
  { id: 'Operations', name: 'Operations', description: 'Field logistics coordinator: flight manifests, hotel room blocks & ground fleet' },
  { id: 'Manager', name: 'Manager', description: 'Team leader & department manager: operational oversight, team reporting & pilgrim audits' },
];

router.get('/roles-list', authenticate, (req: AuthRequest, res: Response) => {
  res.json({ success: true, roles: ASSIGNABLE_ROLES });
});

// List customer users with filtering, search and metrics
router.get('/customer-users', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statusFilter = (req.query.status as string) || 'all';
    const searchQuery = (req.query.search as string || '').trim().toLowerCase();

    // Query status counts
    const countsResult = await dbQuery(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'active' OR status = 'approved' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended
      FROM customers
      WHERE deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00'
    `);

    const counts = {
      total: Number(countsResult[0]?.total || 0),
      pending: Number(countsResult[0]?.pending || 0),
      active: Number(countsResult[0]?.active || 0),
      rejected: Number(countsResult[0]?.rejected || 0),
      suspended: Number(countsResult[0]?.suspended || 0),
    };

    let sql = `
      SELECT c.id, c.customer_code, c.first_name, c.last_name, c.email, c.phone, c.whatsapp,
             c.nationality, c.country_of_residence, c.vip_level, c.status, c.assigned_role,
             c.approved_at, c.approved_by_admin_id, c.rejection_reason, c.rejected_at,
             c.suspended_at, c.role_updated_at, c.created_at, c.updated_at,
             a.first_name as approved_by_first_name, a.last_name as approved_by_last_name, a.username as approved_by_username
      FROM customers c
      LEFT JOIN admins a ON c.approved_by_admin_id = a.id
      WHERE (c.deleted_at IS NULL OR c.deleted_at = '0000-00-00 00:00:00')
    `;
    const params: any[] = [];

    if (statusFilter === 'pending') {
      sql += ` AND c.status = 'pending'`;
    } else if (statusFilter === 'active' || statusFilter === 'approved') {
      sql += ` AND (c.status = 'active' OR c.status = 'approved')`;
    } else if (statusFilter === 'rejected') {
      sql += ` AND c.status = 'rejected'`;
    } else if (statusFilter === 'suspended') {
      sql += ` AND c.status = 'suspended'`;
    }

    if (searchQuery) {
      sql += ` AND (LOWER(c.first_name) LIKE ? OR LOWER(c.last_name) LIKE ? OR LOWER(c.email) LIKE ? OR LOWER(c.customer_code) LIKE ? OR c.phone LIKE ?)`;
      const term = `%${searchQuery}%`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY CASE WHEN c.status = 'pending' THEN 0 ELSE 1 END, c.id DESC`;

    const users = await dbQuery(sql, params);

    const formattedUsers = users.map((u: any) => ({
      ...u,
      approved_by_name: u.approved_by_first_name
        ? `${u.approved_by_first_name} ${u.approved_by_last_name || ''} (@${u.approved_by_username || ''})`.trim()
        : null,
    }));

    res.json({
      success: true,
      counts,
      users: formattedUsers,
    });
  } catch (e: any) {
    console.error('[Admin Customer Users Error]:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// APPROVE USER: Admin MUST select a role before approval is completed
router.post('/customer-users/:id/approve', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body || {};

    if (!role || typeof role !== 'string' || !role.trim()) {
      res.status(400).json({
        success: false,
        message: 'A role must be assigned by the administrator before confirming approval.',
      });
      return;
    }

    const cleanRole = role.trim();
    const existing = await dbQuery(`SELECT id, first_name, last_name, email, status FROM customers WHERE id = ?`, [targetId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    const user = existing[0];
    const nowIso = new Date().toISOString();
    const adminId = req.user!.id;
    const adminName = `${req.user!.first_name} ${req.user!.last_name}`.trim();

    // Update customer status to active, assign role, record approval date and admin ID
    await dbRun(
      `UPDATE customers
       SET status = 'active', assigned_role = ?, approved_at = ?, approved_by_admin_id = ?, rejection_reason = NULL
       WHERE id = ?`,
      [cleanRole, nowIso, adminId, targetId]
    );

    // Audit logs
    await logActivity(
      adminId,
      'user_management',
      'user_approved',
      targetId,
      `Admin ${adminName} (@${req.user!.username}) approved user account #${targetId} (${user.first_name} ${user.last_name}, ${user.email})`,
      req
    );

    await logActivity(
      adminId,
      'user_management',
      'role_assigned',
      targetId,
      `Assigned role "${cleanRole}" to user #${targetId} upon approval by Admin ${adminName}`,
      req
    );

    res.json({
      success: true,
      message: `User ${user.first_name} ${user.last_name} approved successfully with role "${cleanRole}".`,
      user: {
        id: targetId,
        status: 'active',
        assigned_role: cleanRole,
        approved_at: nowIso,
        approved_by_admin_id: adminId,
        approved_by_name: `${adminName} (@${req.user!.username})`,
      },
    });
  } catch (e: any) {
    console.error('[Admin Approve User Error]:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// REJECT USER: Change status to rejected with optional reason
router.post('/customer-users/:id/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    const { reason } = req.body || {};
    const rejectionReason = reason && String(reason).trim() ? String(reason).trim() : 'Registration rejected by administrator';

    const existing = await dbQuery(`SELECT id, first_name, last_name, email FROM customers WHERE id = ?`, [targetId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    const user = existing[0];
    const nowIso = new Date().toISOString();
    const adminId = req.user!.id;
    const adminName = `${req.user!.first_name} ${req.user!.last_name}`.trim();

    await dbRun(
      `UPDATE customers
       SET status = 'rejected', rejection_reason = ?, rejected_at = ?, rejected_by_admin_id = ?
       WHERE id = ?`,
      [rejectionReason, nowIso, adminId, targetId]
    );

    await logActivity(
      adminId,
      'user_management',
      'user_rejected',
      targetId,
      `Admin ${adminName} rejected user #${targetId} (${user.first_name} ${user.last_name}). Reason: ${rejectionReason}`,
      req
    );

    res.json({
      success: true,
      message: `User ${user.first_name} ${user.last_name} has been rejected.`,
      user: {
        id: targetId,
        status: 'rejected',
        rejection_reason: rejectionReason,
      },
    });
  } catch (e: any) {
    console.error('[Admin Reject User Error]:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// CHANGE USER ROLE: Admin assigns a new role
router.post('/customer-users/:id/role', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body || {};

    if (!role || typeof role !== 'string' || !role.trim()) {
      res.status(400).json({ success: false, message: 'Valid role is required' });
      return;
    }

    const cleanRole = role.trim();
    const existing = await dbQuery(`SELECT id, first_name, last_name, email, assigned_role FROM customers WHERE id = ?`, [targetId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    const user = existing[0];
    const oldRole = user.assigned_role || 'None';
    const nowIso = new Date().toISOString();
    const adminId = req.user!.id;
    const adminName = `${req.user!.first_name} ${req.user!.last_name}`.trim();

    await dbRun(
      `UPDATE customers
       SET assigned_role = ?, role_updated_at = ?, role_updated_by_admin_id = ?
       WHERE id = ?`,
      [cleanRole, nowIso, adminId, targetId]
    );

    await logActivity(
      adminId,
      'user_management',
      'role_changed',
      targetId,
      `Admin ${adminName} changed role of user #${targetId} (${user.first_name} ${user.last_name}) from "${oldRole}" to "${cleanRole}"`,
      req
    );

    res.json({
      success: true,
      message: `Role for ${user.first_name} ${user.last_name} updated to "${cleanRole}".`,
      user: {
        id: targetId,
        assigned_role: cleanRole,
        role_updated_at: nowIso,
      },
    });
  } catch (e: any) {
    console.error('[Admin Update User Role Error]:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// SUSPEND USER: Status becomes 'suspended'
router.post('/customer-users/:id/suspend', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    const existing = await dbQuery(`SELECT id, first_name, last_name, email, status FROM customers WHERE id = ?`, [targetId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    const user = existing[0];
    const nowIso = new Date().toISOString();
    const adminId = req.user!.id;
    const adminName = `${req.user!.first_name} ${req.user!.last_name}`.trim();

    await dbRun(
      `UPDATE customers
       SET status = 'suspended', suspended_at = ?, suspended_by_admin_id = ?
       WHERE id = ?`,
      [nowIso, adminId, targetId]
    );

    await logActivity(
      adminId,
      'user_management',
      'user_suspended',
      targetId,
      `Admin ${adminName} suspended user #${targetId} (${user.first_name} ${user.last_name}, ${user.email})`,
      req
    );

    res.json({
      success: true,
      message: `User ${user.first_name} ${user.last_name} has been suspended.`,
      user: {
        id: targetId,
        status: 'suspended',
        suspended_at: nowIso,
      },
    });
  } catch (e: any) {
    console.error('[Admin Suspend User Error]:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// REACTIVATE USER: Status returns to 'active'
router.post('/customer-users/:id/reactivate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    const existing = await dbQuery(`SELECT id, first_name, last_name, email, status FROM customers WHERE id = ?`, [targetId]);
    if (existing.length === 0) {
      res.status(404).json({ success: false, message: 'User account not found' });
      return;
    }

    const user = existing[0];
    const adminId = req.user!.id;
    const adminName = `${req.user!.first_name} ${req.user!.last_name}`.trim();

    await dbRun(
      `UPDATE customers
       SET status = 'active'
       WHERE id = ?`,
      [targetId]
    );

    await logActivity(
      adminId,
      'user_management',
      'user_reactivated',
      targetId,
      `Admin ${adminName} reactivated user #${targetId} (${user.first_name} ${user.last_name}, ${user.email})`,
      req
    );

    res.json({
      success: true,
      message: `User ${user.first_name} ${user.last_name} has been reactivated.`,
      user: {
        id: targetId,
        status: 'active',
      },
    });
  } catch (e: any) {
    console.error('[Admin Reactivate User Error]:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET AUDIT TRAIL FOR A USER
router.get('/customer-users/:id/audit', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const targetId = String(req.params.id);
    const logs = await dbQuery(`
      SELECT al.*, a.first_name as admin_first_name, a.last_name as admin_last_name, a.username as admin_username
      FROM audit_logs al
      LEFT JOIN admins a ON al.admin_id = a.id
      WHERE (al.entity_type = 'user_management' OR al.entity_type = 'customer')
        AND al.entity_id = ?
      ORDER BY al.id DESC
      LIMIT 50
    `, [targetId]);

    res.json({ success: true, logs });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
