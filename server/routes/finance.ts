import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Payment Methods
router.get('/methods', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const methods = await dbQuery(`SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY id ASC`);
    res.json({ success: true, data: methods });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Payments List
router.get('/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, status, page = 1, limit = 15 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereSql = `WHERE 1=1`;
    const params: any[] = [];

    if (search) {
      whereSql += ` AND (p.payment_number LIKE ? OR p.transaction_reference LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR b.booking_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      whereSql += ` AND p.status = ?`;
      params.push(status);
    }

    const [countRow] = await dbQuery(`
      SELECT COUNT(*) as total FROM payments p
      JOIN customers c ON p.customer_id = c.id
      JOIN bookings b ON p.booking_id = b.id
      ${whereSql}
    `, params);

    const payments = await dbQuery(`
      SELECT p.*, pm.name as payment_method_name,
             c.customer_code, c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email,
             b.booking_number, b.total_amount as booking_total,
             a.first_name || ' ' || a.last_name as received_by_name
      FROM payments p
      JOIN payment_methods pm ON p.payment_method_id = pm.id
      JOIN customers c ON p.customer_id = c.id
      JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN admins a ON p.received_by_admin_id = a.id
      ${whereSql}
      ORDER BY p.id DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `, params);

    res.json({
      success: true,
      data: payments,
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

// 3. Record Payment
router.post('/payments', authenticate, authorize('finance', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { booking_id, customer_id, payment_method_id, amount, currency = 'USD', payment_date, transaction_reference, notes } = req.body;

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid payment amount is required' });
      return;
    }

    const bookings = await dbQuery(`SELECT * FROM bookings WHERE id = ? AND deleted_at IS NULL`, [booking_id]);
    if (bookings.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const bk = bookings[0];
    const newPaid = Number(bk.paid_amount) + paymentAmount;
    const newRemaining = Math.max(0, Number(bk.total_amount) - newPaid);

    if (newPaid > Number(bk.total_amount) + 0.01) {
      res.status(400).json({
        success: false,
        message: `Payment amount (${currency} ${paymentAmount}) exceeds current remaining balance (${currency} ${bk.remaining_amount}).`,
      });
      return;
    }

    const newPaymentStatus = newRemaining <= 0 ? 'Fully Paid' : 'Partially Paid';
    const payNum = `PAY-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const payResult = await dbRun(`
      INSERT INTO payments (payment_number, booking_id, customer_id, payment_method_id, amount, currency, payment_date, transaction_reference, status, notes, received_by_admin_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed', ?, ?)
    `, [
      payNum, booking_id, customer_id || bk.customer_id, payment_method_id || 1,
      paymentAmount, currency, payment_date || new Date().toISOString().split('T')[0],
      transaction_reference || 'REF-' + Date.now().toString().slice(-6), notes || '', req.user!.id
    ]);

    // Update booking financial totals
    await dbRun(`
      UPDATE bookings
      SET paid_amount = ?, remaining_amount = ?, payment_status = ?
      WHERE id = ?
    `, [newPaid, newRemaining, newPaymentStatus, booking_id]);

    // Update invoices
    await dbRun(`
      UPDATE invoices
      SET status = ?
      WHERE booking_id = ? AND status != 'Draft'
    `, [newPaymentStatus === 'Fully Paid' ? 'Paid' : 'Partially Paid', booking_id]);

    await logActivity(req.user!.id, 'finance', 'record_payment', payResult.insertId, `Recorded payment of ${currency} ${paymentAmount} for Booking #${bk.booking_number}`, req);

    res.json({
      success: true,
      id: payResult.insertId,
      paymentNumber: payNum,
      message: 'Payment recorded successfully',
      newBalance: {
        paid: newPaid,
        remaining: newRemaining,
        status: newPaymentStatus,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Invoices List
router.get('/invoices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const invoices = await dbQuery(`
      SELECT inv.*,
             c.customer_code, c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email,
             b.booking_number, b.currency, b.paid_amount, b.remaining_amount,
             p.title as package_title
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      JOIN bookings b ON inv.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      ORDER BY inv.id DESC
    `);
    res.json({ success: true, data: invoices });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. Printable Invoice Details
router.get('/invoices/:id/print', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const invId = req.params.id;
    const invoices = await dbQuery(`
      SELECT inv.*,
             c.customer_code, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone,
             c.nationality, c.country_of_residence,
             b.booking_number, b.currency, b.num_adults, b.num_children, b.travel_start_date, b.travel_end_date,
             b.paid_amount, b.remaining_amount,
             p.title as package_title, p.origin_city
      FROM invoices inv
      JOIN customers c ON inv.customer_id = c.id
      JOIN bookings b ON inv.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      WHERE inv.id = ?
    `, [invId]);

    if (invoices.length === 0) {
      res.status(404).json({ success: false, message: 'Invoice not found' });
      return;
    }

    const inv = invoices[0];
    const payments = await dbQuery(`
      SELECT p.*, pm.name as method_name
      FROM payments p
      JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.booking_id = ? AND p.status = 'Completed'
      ORDER BY p.id ASC
    `, [inv.booking_id]);

    const siteSettings = await dbQuery(`SELECT * FROM site_settings LIMIT 1`);

    res.json({
      success: true,
      data: {
        invoice: inv,
        payments,
        company: siteSettings[0] || { site_name: 'Hajji Original Tours' },
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 6. Expenses
router.get('/expenses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await dbQuery(`
      SELECT e.*, p.title as package_title
      FROM expenses e
      LEFT JOIN packages p ON e.package_id = p.id
      ORDER BY e.expense_date DESC
    `);
    res.json({ success: true, data: expenses });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/expenses', authenticate, authorize('finance', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { category, title, amount, currency = 'USD', expense_date, vendor, package_id, notes } = req.body;
    const result = await dbRun(`
      INSERT INTO expenses (category, title, amount, currency, expense_date, vendor, package_id, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [category, title, Number(amount) || 0, currency, expense_date || new Date().toISOString().split('T')[0], vendor || '', package_id || null, notes || '']);

    await logActivity(req.user!.id, 'finance', 'record_expense', result.insertId, `Logged expense "${title}" of ${currency} ${amount}`, req);
    res.json({ success: true, id: result.insertId, message: 'Expense recorded' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
