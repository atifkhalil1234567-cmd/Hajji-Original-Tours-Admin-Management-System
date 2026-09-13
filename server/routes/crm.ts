import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// ================= CUSTOMERS =================

router.get('/customers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, vip, status, page = 1, limit = 15 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereSql = `WHERE c.deleted_at IS NULL`;
    const params: any[] = [];

    if (search) {
      whereSql += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.customer_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (vip) {
      whereSql += ` AND c.vip_level = ?`;
      params.push(vip);
    }
    if (status) {
      whereSql += ` AND c.status = ?`;
      params.push(status);
    }

    const [countRow] = await dbQuery(`SELECT COUNT(*) as total FROM customers c ${whereSql}`, params);
    const customers = await dbQuery(
      `SELECT c.*,
              (SELECT COUNT(*) FROM bookings b WHERE b.customer_id = c.id AND b.deleted_at IS NULL) as total_bookings,
              (SELECT cp.passport_number FROM customer_passports cp WHERE cp.customer_id = c.id ORDER BY cp.id DESC LIMIT 1) as passport_number,
              (SELECT cp.status FROM customer_passports cp WHERE cp.customer_id = c.id ORDER BY cp.id DESC LIMIT 1) as passport_status
       FROM customers c
       ${whereSql}
       ORDER BY c.id DESC
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: customers,
      pagination: {
        total: countRow?.total || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((countRow?.total || 0) / Number(limit)),
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/customers/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const custId = req.params.id;
    const customers = await dbQuery(`SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL`, [custId]);
    if (customers.length === 0) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const customer = customers[0];
    const addresses = await dbQuery(`SELECT * FROM customer_addresses WHERE customer_id = ?`, [custId]);
    const passports = await dbQuery(`SELECT * FROM customer_passports WHERE customer_id = ? ORDER BY id DESC`, [custId]);
    const emergencyContacts = await dbQuery(`SELECT * FROM customer_emergency_contacts WHERE customer_id = ?`, [custId]);
    const notes = await dbQuery(
      `SELECT cn.*, a.first_name || ' ' || a.last_name as admin_name
       FROM customer_notes cn
       LEFT JOIN admins a ON cn.admin_id = a.id
       WHERE cn.customer_id = ? ORDER BY cn.id DESC`,
      [custId]
    );
    const interactions = await dbQuery(
      `SELECT ci.*, a.first_name || ' ' || a.last_name as admin_name
       FROM customer_interactions ci
       LEFT JOIN admins a ON ci.admin_id = a.id
       WHERE ci.customer_id = ? ORDER BY ci.id DESC`,
      [custId]
    );
    const bookings = await dbQuery(
      `SELECT b.*, p.title as package_title, bs.label as status_label, bs.badge_color
       FROM bookings b
       JOIN packages p ON b.package_id = p.id
       JOIN booking_statuses bs ON b.booking_status_id = bs.id
       WHERE b.customer_id = ? AND b.deleted_at IS NULL ORDER BY b.id DESC`,
      [custId]
    );
    const tags = await dbQuery(
      `SELECT t.* FROM customer_tag_relations ctr
       JOIN tags t ON ctr.tag_id = t.id
       WHERE ctr.customer_id = ?`,
      [custId]
    );

    res.json({
      success: true,
      data: {
        ...customer,
        addresses,
        passports,
        emergencyContacts,
        notes,
        interactions,
        bookings,
        tags,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/customers', authenticate, authorize('customers', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { first_name, last_name, email, phone, whatsapp, nationality, country_of_residence, vip_level, lead_source, passport_number, passport_expiry } = req.body;

    // Check existing email
    const existing = await dbQuery(`SELECT id FROM customers WHERE email = ? AND deleted_at IS NULL`, [email]);
    if (existing.length > 0) {
      res.status(400).json({ success: false, message: 'A customer with this email already exists' });
      return;
    }

    const code = `CUST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await dbRun(
      `INSERT INTO customers (customer_code, first_name, last_name, email, phone, whatsapp, nationality, country_of_residence, vip_level, lead_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, first_name, last_name, email, phone, whatsapp || phone, nationality || 'British', country_of_residence || 'United Kingdom', vip_level || 'Standard', lead_source || 'Direct']
    );

    const newCustId = result.insertId;

    // If passport provided, add it
    if (passport_number && passport_expiry) {
      await dbRun(
        `INSERT INTO customer_passports (customer_id, passport_number, issuing_country, nationality, issue_date, expiry_date, status)
         VALUES (?, ?, ?, ?, date('now'), ?, 'Valid')`,
        [newCustId, passport_number, country_of_residence || 'United Kingdom', nationality || 'British', passport_expiry]
      );
    }

    await logActivity(req.user!.id, 'customers', 'create', newCustId, `Created customer profile for ${first_name} ${last_name}`, req);
    res.json({ success: true, id: newCustId, message: 'Customer created successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/customers/:id/notes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const custId = req.params.id;
    const { category, note } = req.body;
    const result = await dbRun(
      `INSERT INTO customer_notes (customer_id, admin_id, category, note) VALUES (?, ?, ?, ?)`,
      [custId, req.user!.id, category || 'General', note]
    );
    res.json({ success: true, id: result.insertId, message: 'Note added' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/customers/:id/interactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const custId = req.params.id;
    const { channel, summary, details } = req.body;
    const result = await dbRun(
      `INSERT INTO customer_interactions (customer_id, admin_id, channel, summary, details) VALUES (?, ?, ?, ?, ?)`,
      [custId, req.user!.id, channel, summary, details || '']
    );
    res.json({ success: true, id: result.insertId, message: 'Interaction recorded' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ================= LEADS / CRM =================

router.get('/leads', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, search } = req.query;
    let sql = `
      SELECT l.*, a.first_name || ' ' || a.last_name as assigned_agent_name,
             c.customer_code as converted_customer_code
      FROM leads l
      LEFT JOIN admins a ON l.assigned_admin_id = a.id
      LEFT JOIN customers c ON l.converted_customer_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND l.status = ?`;
      params.push(status);
    }
    if (priority) {
      sql += ` AND l.priority = ?`;
      params.push(priority);
    }
    if (search) {
      sql += ` AND (l.full_name LIKE ? OR l.email LIKE ? OR l.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY l.id DESC`;
    const leads = await dbQuery(sql, params);
    res.json({ success: true, data: leads });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/leads', authenticate, authorize('leads', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, email, phone, package_interest, destination, num_travelers, budget_range, source, status, priority, followup_due_date, notes } = req.body;
    const result = await dbRun(
      `INSERT INTO leads (full_name, email, phone, package_interest, destination, num_travelers, budget_range, source, assigned_admin_id, status, priority, followup_due_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name,
        email,
        phone,
        package_interest || '',
        destination || 'Umrah',
        num_travelers || 2,
        budget_range || '',
        source || 'Website',
        req.user!.id,
        status || 'New',
        priority || 'Medium',
        followup_due_date || null,
        notes || '',
      ]
    );

    await logActivity(req.user!.id, 'leads', 'create', result.insertId, `Created inquiry lead for ${full_name}`, req);
    res.json({ success: true, id: result.insertId, message: 'Lead recorded' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/leads/:id', authenticate, authorize('leads', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const leadId = req.params.id;
    const { status, priority, assigned_admin_id, followup_due_date, notes } = req.body;

    await dbRun(
      `UPDATE leads SET status = ?, priority = ?, assigned_admin_id = ?, followup_due_date = ?, notes = ? WHERE id = ?`,
      [status, priority, assigned_admin_id, followup_due_date, notes, leadId]
    );

    await logActivity(req.user!.id, 'leads', 'update', leadId, `Updated lead #${leadId} status to ${status}`, req);
    res.json({ success: true, message: 'Lead updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Convert Lead to Customer
router.post('/leads/:id/convert', authenticate, authorize('leads', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const leadId = req.params.id;
    const leads = await dbQuery(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (leads.length === 0) {
      res.status(404).json({ success: false, message: 'Lead not found' });
      return;
    }

    const lead = leads[0];
    // Check if customer already exists with this email or phone
    const existing = await dbQuery(`SELECT id, customer_code FROM customers WHERE (email = ? OR phone = ?) AND deleted_at IS NULL LIMIT 1`, [lead.email, lead.phone]);

    let customerId: number;
    if (existing.length > 0) {
      customerId = existing[0].id;
    } else {
      const parts = lead.full_name.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || 'Pilgrim';
      const code = `CUST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const custResult = await dbRun(
        `INSERT INTO customers (customer_code, first_name, last_name, email, phone, lead_source, notes_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [code, firstName, lastName, lead.email, lead.phone, lead.source || 'Lead Conversion', `Converted from Lead #${lead.id}: ${lead.package_interest || ''}`]
      );
      customerId = custResult.insertId;
    }

    // Update lead
    await dbRun(`UPDATE leads SET status = 'Converted', converted_customer_id = ? WHERE id = ?`, [customerId, leadId]);

    await logActivity(req.user!.id, 'leads', 'convert', leadId, `Converted lead #${leadId} to Customer #${customerId}`, req);
    res.json({ success: true, customerId, message: 'Lead converted into customer profile successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
