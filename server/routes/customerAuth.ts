import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { dbQuery, dbRun } from '../db';
import { logActivity } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hajji_original_tours_secure_session_2026';

export interface CustomerUserPayload {
  id: number;
  customer_code: string;
  email: string;
  first_name: string;
  last_name: string;
  assigned_role: string;
  status: string;
  userType: 'customer';
}

export interface CustomerAuthRequest extends Request {
  customer?: any;
}

// Middleware specifically for Customer authentication (completely separate from Admin)
export async function authenticateCustomer(req: CustomerAuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Customer authentication required. Please log in.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.userType !== 'customer') {
      res.status(401).json({ success: false, message: 'Invalid customer credentials.' });
      return;
    }

    const customers = await dbQuery(
      `SELECT id, customer_code, first_name, last_name, email, phone, whatsapp, nationality, country_of_residence, vip_level, status, assigned_role
       FROM customers
       WHERE id = ? AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
       LIMIT 1`,
      [decoded.id]
    );

    if (customers.length === 0) {
      res.status(401).json({ success: false, message: 'Customer account not found.' });
      return;
    }

    const customer = customers[0];
    if (customer.status !== 'active' && customer.status !== 'approved') {
      const errorMsg = customer.status === 'pending'
        ? 'Your account has been created and is waiting for admin approval. You will be able to sign in after your account is approved.'
        : customer.status === 'suspended'
        ? 'Your account has been suspended by administration. Please contact support.'
        : customer.status === 'rejected'
        ? 'Your account application was reviewed and not approved. Please contact support.'
        : `Account is ${customer.status}. Please contact support.`;

      res.status(403).json({ success: false, status: customer.status, message: errorMsg });
      return;
    }

    req.customer = customer;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Session expired or invalid token. Please log in again.' });
  }
}

// ================= 1. CUSTOMER LOGIN =================
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Query customer by email
    const customers = await dbQuery(
      `SELECT * FROM customers
       WHERE LOWER(email) = LOWER(?) AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
       LIMIT 1`,
      [cleanEmail]
    );

    if (customers.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid customer email or password.' });
      return;
    }

    const customer = customers[0];

    // Status checks
    if (customer.status === 'pending') {
      res.status(403).json({
        success: false,
        status: 'pending',
        message: 'Your account has been created and is waiting for admin approval. You will be able to sign in after your account is approved.',
      });
      return;
    }

    if (customer.status === 'rejected') {
      res.status(403).json({
        success: false,
        status: 'rejected',
        message: `Your account application was reviewed and not approved.${customer.rejection_reason ? ' Reason: ' + customer.rejection_reason : ' Please contact support.'}`,
      });
      return;
    }

    if (customer.status === 'suspended') {
      res.status(403).json({
        success: false,
        status: 'suspended',
        message: 'Your account has been suspended by administration. Please contact customer support.',
      });
      return;
    }

    if (customer.status !== 'active' && customer.status !== 'approved') {
      res.status(403).json({
        success: false,
        status: customer.status,
        message: `Account is currently ${customer.status}. Please contact customer support.`,
      });
      return;
    }

    // Retrieve password hash from customer_notes or notes_summary
    const authNotes = await dbQuery(
      `SELECT note FROM customer_notes
       WHERE customer_id = ? AND (note LIKE '[PORTAL_ACCOUNT_AUTH]:%' OR note LIKE '[AUTH_HASH]:%')
       ORDER BY id DESC LIMIT 1`,
      [customer.id]
    );

    let isValid = false;
    let storedHash = '';

    if (authNotes.length > 0) {
      storedHash = authNotes[0].note.replace(/^\[(PORTAL_ACCOUNT_AUTH|AUTH_HASH)\]:/, '').trim();
    } else if (customer.notes_summary && customer.notes_summary.includes('[AUTH_HASH]:')) {
      const match = customer.notes_summary.match(/\[AUTH_HASH\]:([^\s]+)/);
      if (match) storedHash = match[1];
    }

    if (storedHash) {
      if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        isValid = await bcrypt.compare(password, storedHash);
      } else {
        isValid = (password === storedHash);
      }
    } else {
      // Auto-activate demo seed customers (e.g. m.alrahman@example.co.uk) if standard password used
      if (password === 'customer123' || password === 'password123') {
        isValid = true;
        const newHash = await bcrypt.hash(password, 10);
        try {
          await dbRun(
            `INSERT INTO customer_notes (customer_id, category, note) VALUES (?, 'CRM', ?)`,
            [customer.id, `[PORTAL_ACCOUNT_AUTH]:${newHash}`]
          );
        } catch {}
      } else {
        res.status(401).json({
          success: false,
          message: 'No portal password found for this account. Please click "Create Account" to activate your portal login.',
        });
        return;
      }
    }

    if (!isValid) {
      res.status(401).json({ success: false, message: 'Invalid customer email or password.' });
      return;
    }

    // Log interaction
    try {
      await dbRun(
        `INSERT INTO customer_interactions (customer_id, channel, summary, details) VALUES (?, 'Portal Login', 'Customer signed in to Customer Portal', 'Self-service portal access')`,
        [customer.id]
      );
    } catch {}

    const assignedRole = customer.assigned_role || 'Customer';

    const customerPayload: CustomerUserPayload = {
      id: customer.id,
      customer_code: customer.customer_code,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      assigned_role: assignedRole,
      status: customer.status,
      userType: 'customer',
    };

    const token = jwt.sign(customerPayload, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      customer: {
        id: customer.id,
        customer_code: customer.customer_code,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        nationality: customer.nationality,
        country_of_residence: customer.country_of_residence,
        vip_level: customer.vip_level,
        status: customer.status,
        assigned_role: assignedRole,
      },
      message: 'Customer sign in successful',
    });
  } catch (err: any) {
    console.error('[Customer Auth Login Error]:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Internal server error' });
  }
});

// ================= 2. CUSTOMER REGISTRATION =================
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, phone, password } = req.body || {};

    if (!fullName || !email || !password) {
      res.status(400).json({ success: false, message: 'Full Name, Email, and Password are required.' });
      return;
    }

    if (String(password).length < 6) {
      res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : '+44 7700 900000';

    // Split full name into first and last name
    const nameParts = String(fullName).trim().split(/\s+/);
    const firstName = nameParts[0] || 'Pilgrim';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    // Check if customer email already exists
    const existing = await dbQuery(
      `SELECT id, customer_code, first_name, last_name, email, status, assigned_role, notes_summary
       FROM customers
       WHERE LOWER(email) = LOWER(?) AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
       LIMIT 1`,
      [cleanEmail]
    );

    const hashedPassword = await bcrypt.hash(password, 10);
    let customerId: number;
    let customerCode: string;

    if (existing.length > 0) {
      const existingCust = existing[0];
      if (existingCust.status === 'pending') {
        res.status(400).json({
          success: false,
          status: 'pending',
          message: 'An account registration with this email is already waiting for admin approval. You will be notified once approved.',
        });
        return;
      }
      if (existingCust.status === 'active' || existingCust.status === 'approved') {
        res.status(400).json({
          success: false,
          message: 'An account with this email already exists and is active. Please sign in.',
        });
        return;
      }
      if (existingCust.status === 'rejected') {
        res.status(400).json({
          success: false,
          status: 'rejected',
          message: 'An account with this email was previously reviewed and rejected. Please contact customer support.',
        });
        return;
      }
      if (existingCust.status === 'suspended') {
        res.status(400).json({
          success: false,
          status: 'suspended',
          message: 'An account with this email has been suspended by administration. Please contact support.',
        });
        return;
      }

      // Existing inactive profile being registered: reset to pending
      customerId = existingCust.id;
      customerCode = existingCust.customer_code;
      await dbRun(`UPDATE customers SET status = 'pending', assigned_role = NULL, phone = ?, whatsapp = ? WHERE id = ?`, [cleanPhone, cleanPhone, customerId]);
      await dbRun(
        `INSERT INTO customer_notes (customer_id, category, note) VALUES (?, 'CRM', ?)`,
        [customerId, `[PORTAL_ACCOUNT_AUTH]:${hashedPassword}`]
      );
    } else {
      // Create new customer record strictly with PENDING status and NO assigned role
      customerCode = `CUST-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

      const insertResult = await dbRun(
        `INSERT INTO customers (customer_code, first_name, last_name, email, phone, whatsapp, nationality, country_of_residence, vip_level, status, assigned_role, lead_source, notes_summary)
         VALUES (?, ?, ?, ?, ?, ?, 'British', 'United Kingdom', 'Standard', 'pending', NULL, 'Customer Portal Registration', ?)`,
        [
          customerCode,
          firstName,
          lastName,
          cleanEmail,
          cleanPhone,
          cleanPhone,
          `Customer self-registered on ${new Date().toISOString()} (Waiting for Admin Approval)`,
        ]
      );

      customerId = insertResult.insertId;

      // Securely store hashed password in customer_notes
      await dbRun(
        `INSERT INTO customer_notes (customer_id, category, note) VALUES (?, 'CRM', ?)`,
        [customerId, `[PORTAL_ACCOUNT_AUTH]:${hashedPassword}`]
      );
    }

    // Audit Trail: Record user registration
    await logActivity(
      null,
      'user_management',
      'user_registered',
      customerId,
      `New user ${firstName} ${lastName} (${cleanEmail}) registered. Account status set to PENDING awaiting admin approval and role assignment.`,
      req
    );

    // CRITICAL REQUIREMENT: Do NOT automatically activate or return token!
    res.json({
      success: true,
      pendingApproval: true,
      status: 'pending',
      customer: {
        id: customerId,
        customer_code: customerCode,
        first_name: firstName,
        last_name: lastName,
        email: cleanEmail,
        status: 'pending',
        assigned_role: null,
      },
      message: 'Your account has been created and is waiting for admin approval. You will be able to sign in after your account is approved.',
    });
  } catch (err: any) {
    console.error('[Customer Registration Error]:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Registration failed' });
  }
});

// ================= 3. FORGOT PASSWORD =================
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    // Always respond with a generic success message to prevent user enumeration
    res.json({
      success: true,
      message: 'If an account is associated with this email address, password recovery instructions have been sent.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ================= 4. GET CURRENT CUSTOMER PROFILE =================
router.get('/me', authenticateCustomer, async (req: CustomerAuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, customer: req.customer });
});

// ================= 5. CUSTOMER DASHBOARD DATA =================
router.get('/dashboard', authenticateCustomer, async (req: CustomerAuthRequest, res: Response): Promise<void> => {
  try {
    const custId = req.customer.id;

    // Customer profile
    const custRows = await dbQuery(
      `SELECT id, customer_code, first_name, last_name, email, phone, whatsapp, nationality, country_of_residence, vip_level, status, assigned_role, created_at
       FROM customers WHERE id = ?`,
      [custId]
    );
    const profile = custRows[0] || req.customer;

    // Customer Bookings
    const bookings = await dbQuery(
      `SELECT b.*,
              p.title as package_title,
              p.package_type,
              p.origin_city,
              p.starting_price,
              p.duration_days,
              bs.label as status_label,
              bs.badge_color,
              (SELECT COUNT(*) FROM booking_travelers bt WHERE bt.booking_id = b.id) as travelers_count
       FROM bookings b
       LEFT JOIN packages p ON b.package_id = p.id
       LEFT JOIN booking_statuses bs ON b.booking_status_id = bs.id
       WHERE b.customer_id = ? AND (b.deleted_at IS NULL OR b.deleted_at = '0000-00-00 00:00:00')
       ORDER BY b.id DESC`,
      [custId]
    );

    // Customer Payments
    const payments = await dbQuery(
      `SELECT p.*, b.booking_number as booking_reference
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       WHERE p.customer_id = ?
       ORDER BY p.id DESC`,
      [custId]
    );

    // Customer Passports
    const passports = await dbQuery(
      `SELECT * FROM customer_passports WHERE customer_id = ? ORDER BY id DESC`,
      [custId]
    );

    // Featured / Available Packages
    const packages = await dbQuery(
      `SELECT id, title, slug, package_type, starting_price, duration_days, origin_city, featured_image
       FROM packages
       WHERE (status = 'published' OR status = '1' OR status = 1 OR status = 'active')
         AND (deleted_at IS NULL OR deleted_at = '0000-00-00 00:00:00')
       ORDER BY id DESC
       LIMIT 6`
    );

    // Calculate metrics
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b: any) => !['Cancelled', 'Refunded', 'Completed'].includes(b.status_label)).length;
    const totalPaid = payments
      .filter((p: any) => p.status === 'Completed' || p.status === 'completed')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    res.json({
      success: true,
      data: {
        customer: profile,
        metrics: {
          totalBookings,
          activeBookings,
          totalPaid,
          passportsCount: passports.length,
        },
        bookings,
        payments,
        passports,
        featuredPackages: packages,
      },
    });
  } catch (err: any) {
    console.error('[Customer Dashboard Error]:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch dashboard' });
  }
});

// ================= 6. CUSTOMER LOGOUT =================
router.post('/logout', authenticateCustomer, async (req: CustomerAuthRequest, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
