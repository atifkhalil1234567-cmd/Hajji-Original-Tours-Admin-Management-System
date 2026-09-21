import bcrypt from 'bcryptjs';
import { dbQuery, dbRun } from './db';

// Fixed bcrypt hashes generated with 10 salt rounds
// Manager@2026! -> $2b$10$89J8oGz0z.JbN3f6p4b0.ORbV1g8B2w.0LwL3W9B0K4N6E7S1U7Y.
// Note: We compute with bcrypt.hash to ensure fresh standard compliance
const MANAGER_PASSWORD_PLAIN = 'Manager@2026!';
const STAFF_PASSWORD_PLAIN = 'Staff@2026!';

export async function ensureStaffAccounts(): Promise<{
  manager: { created: boolean; active: boolean; role: string };
  staff: { created: boolean; active: boolean; role: string };
}> {
  const result = {
    manager: { created: false, active: false, role: 'manager' },
    staff: { created: false, active: false, role: 'staff' },
  };

  try {
    // 1. Ensure 'manager' role exists in admin_roles
    let managerRoleId: number | null = null;
    try {
      const existingManagerRoles = await dbQuery(
        `SELECT id, slug, name FROM admin_roles WHERE slug = 'manager' OR slug = 'operations_manager' ORDER BY CASE WHEN slug = 'manager' THEN 1 ELSE 2 END LIMIT 1`
      );

      if (existingManagerRoles.length === 0) {
        const insertRes = await dbRun(
          `INSERT INTO admin_roles (slug, name, description, is_system, status)
           VALUES ('manager', 'Manager', 'Department & Operations Manager with team oversight', 1, 'active')`
        );
        managerRoleId = insertRes.insertId || 7;
      } else {
        // If the role is operations_manager, also make sure a dedicated 'manager' role slug exists
        const exact = existingManagerRoles.find((r: any) => r.slug === 'manager');
        if (exact) {
          managerRoleId = exact.id;
        } else {
          try {
            const insertRes = await dbRun(
              `INSERT INTO admin_roles (slug, name, description, is_system, status)
               VALUES ('manager', 'Manager', 'Department & Operations Manager with team oversight', 1, 'active')`
            );
            managerRoleId = insertRes.insertId || 7;
          } catch {
            managerRoleId = existingManagerRoles[0].id;
          }
        }
      }
    } catch (roleErr: any) {
      console.warn('[Staff Accounts] Manager role resolution warning:', roleErr.message);
    }

    // 2. Ensure 'staff' role exists in admin_roles
    let staffRoleId: number | null = null;
    try {
      const existingStaffRoles = await dbQuery(
        `SELECT id, slug, name FROM admin_roles WHERE slug = 'staff' OR slug = 'crm_sales_agent' ORDER BY CASE WHEN slug = 'staff' THEN 1 ELSE 2 END LIMIT 1`
      );

      if (existingStaffRoles.length === 0) {
        const insertRes = await dbRun(
          `INSERT INTO admin_roles (slug, name, description, is_system, status)
           VALUES ('staff', 'Staff', 'Operational Staff with core CRM, bookings & traveler workflow access', 1, 'active')`
        );
        staffRoleId = insertRes.insertId || 8;
      } else {
        const exact = existingStaffRoles.find((r: any) => r.slug === 'staff');
        if (exact) {
          staffRoleId = exact.id;
        } else {
          try {
            const insertRes = await dbRun(
              `INSERT INTO admin_roles (slug, name, description, is_system, status)
               VALUES ('staff', 'Staff', 'Operational Staff with core CRM, bookings & traveler workflow access', 1, 'active')`
            );
            staffRoleId = insertRes.insertId || 8;
          } catch {
            staffRoleId = existingStaffRoles[0].id;
          }
        }
      }
    } catch (roleErr: any) {
      console.warn('[Staff Accounts] Staff role resolution warning:', roleErr.message);
    }

    // Default fallback IDs if needed
    if (!managerRoleId) managerRoleId = 2;
    if (!staffRoleId) staffRoleId = 3;

    // 3. Grant appropriate role permissions for Manager and Staff
    try {
      const allPerms = await dbQuery(`SELECT id, module, action FROM admin_permissions`);
      const permMap = new Map<string, number>();
      for (const p of allPerms) {
        permMap.set(`${p.module}:${p.action}`, p.id);
      }

      // Manager permissions (comprehensive operational & department management)
      const managerPermKeys = [
        'dashboard:view', 'packages:view', 'packages:manage',
        'hotels:view', 'hotels:manage', 'customers:view', 'customers:manage',
        'leads:view', 'leads:manage', 'bookings:view', 'bookings:manage',
        'finance:view', 'finance:manage', 'visas:view', 'visas:manage',
        'flights:manage', 'transport:manage', 'cms:manage', 'media:manage',
        'audit:view'
      ];

      for (const key of managerPermKeys) {
        const pId = permMap.get(key);
        if (pId) {
          const check = await dbQuery(
            `SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
            [managerRoleId, pId]
          );
          if (check.length === 0) {
            await dbRun(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [managerRoleId, pId]);
          }
        }
      }

      // Staff permissions (core front-desk, customer CRM, bookings and inquiry workflows)
      const staffPermKeys = [
        'dashboard:view', 'packages:view', 'hotels:view',
        'customers:view', 'customers:manage', 'leads:view', 'leads:manage',
        'bookings:view', 'bookings:manage', 'visas:view', 'media:manage'
      ];

      for (const key of staffPermKeys) {
        const pId = permMap.get(key);
        if (pId) {
          const check = await dbQuery(
            `SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?`,
            [staffRoleId, pId]
          );
          if (check.length === 0) {
            await dbRun(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [staffRoleId, pId]);
          }
        }
      }
    } catch (permErr: any) {
      console.warn('[Staff Accounts] Permissions assignment warning:', permErr.message);
    }

    // 4. Generate bcrypt hashes securely
    const managerHash = await bcrypt.hash(MANAGER_PASSWORD_PLAIN, 10);
    const staffHash = await bcrypt.hash(STAFF_PASSWORD_PLAIN, 10);

    // 5. Manager account insertion or update
    const managerAdmins = await dbQuery(
      `SELECT id, username, email, status, role_id FROM admins WHERE (LOWER(username) = 'manager' OR LOWER(email) = 'manager@hajjioriginaltours.com') AND deleted_at IS NULL`
    );

    if (managerAdmins.length === 0) {
      await dbRun(
        `INSERT INTO admins (role_id, first_name, last_name, username, email, phone, password, status)
         VALUES (?, 'Operations', 'Manager', 'manager', 'manager@hajjioriginaltours.com', '', ?, 'active')`,
        [managerRoleId, managerHash]
      );
      result.manager = { created: true, active: true, role: 'manager' };
    } else {
      await dbRun(
        `UPDATE admins SET password = ?, status = 'active', role_id = ?, deleted_at = NULL WHERE id = ?`,
        [managerHash, managerRoleId, managerAdmins[0].id]
      );
      result.manager = { created: true, active: true, role: 'manager' };
    }

    // 6. Staff account insertion or update
    const staffAdmins = await dbQuery(
      `SELECT id, username, email, status, role_id FROM admins WHERE (LOWER(username) = 'staff' OR LOWER(email) = 'staff@hajjioriginaltours.com') AND deleted_at IS NULL`
    );

    if (staffAdmins.length === 0) {
      await dbRun(
        `INSERT INTO admins (role_id, first_name, last_name, username, email, phone, password, status)
         VALUES (?, 'Operations', 'Staff', 'staff', 'staff@hajjioriginaltours.com', '', ?, 'active')`,
        [staffRoleId, staffHash]
      );
      result.staff = { created: true, active: true, role: 'staff' };
    } else {
      await dbRun(
        `UPDATE admins SET password = ?, status = 'active', role_id = ?, deleted_at = NULL WHERE id = ?`,
        [staffHash, staffRoleId, staffAdmins[0].id]
      );
      result.staff = { created: true, active: true, role: 'staff' };
    }
  } catch (err: any) {
    console.error('[Staff Accounts] Setup error:', err.message);
  }

  return result;
}
