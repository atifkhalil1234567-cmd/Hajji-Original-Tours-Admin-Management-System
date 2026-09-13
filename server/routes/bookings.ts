import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Booking Statuses
router.get('/statuses', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const statuses = await dbQuery(`SELECT * FROM booking_statuses WHERE is_active = 1 ORDER BY id ASC`);
    res.json({ success: true, data: statuses });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Bookings Listing
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, statusId, paymentStatus, visaStatus, packageId, page = 1, limit = 15 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereSql = `WHERE b.deleted_at IS NULL`;
    const params: any[] = [];

    if (search) {
      whereSql += ` AND (b.booking_number LIKE ? OR c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.customer_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (statusId) {
      whereSql += ` AND b.booking_status_id = ?`;
      params.push(Number(statusId));
    }
    if (paymentStatus) {
      whereSql += ` AND b.payment_status = ?`;
      params.push(paymentStatus);
    }
    if (visaStatus) {
      whereSql += ` AND b.visa_status = ?`;
      params.push(visaStatus);
    }
    if (packageId) {
      whereSql += ` AND b.package_id = ?`;
      params.push(Number(packageId));
    }

    const [countRow] = await dbQuery(`
      SELECT COUNT(*) as total
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      ${whereSql}
    `, params);

    const bookings = await dbQuery(`
      SELECT b.*,
             c.customer_code, c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email, c.phone as customer_phone,
             p.title as package_title, p.origin_city,
             pd.departure_title, pd.departure_date, pd.return_date,
             bs.label as status_label, bs.badge_color,
             a.first_name || ' ' || a.last_name as assigned_agent_name,
             (SELECT COUNT(*) FROM booking_travelers bt WHERE bt.booking_id = b.id) as travelers_count
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON b.package_id = p.id
      LEFT JOIN package_departures pd ON b.departure_id = pd.id
      JOIN booking_statuses bs ON b.booking_status_id = bs.id
      LEFT JOIN admins a ON b.assigned_admin_id = a.id
      ${whereSql}
      ORDER BY b.id DESC
      LIMIT ${Number(limit)} OFFSET ${offset}
    `, params);

    res.json({
      success: true,
      data: bookings,
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

// 3. Booking Details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const bookingId = req.params.id;
    const bookings = await dbQuery(`
      SELECT b.*,
             c.customer_code, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone, c.nationality, c.vip_level,
             p.title as package_title, p.package_type, p.duration_days, p.origin_city,
             pd.departure_title, pd.departure_date, pd.return_date,
             bs.label as status_label, bs.badge_color,
             a.first_name || ' ' || a.last_name as assigned_agent_name
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON b.package_id = p.id
      LEFT JOIN package_departures pd ON b.departure_id = pd.id
      JOIN booking_statuses bs ON b.booking_status_id = bs.id
      LEFT JOIN admins a ON b.assigned_admin_id = a.id
      WHERE b.id = ? AND b.deleted_at IS NULL
    `, [bookingId]);

    if (bookings.length === 0) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const booking = bookings[0];
    const travelers = await dbQuery(`SELECT * FROM booking_travelers WHERE booking_id = ? ORDER BY id ASC`, [bookingId]);
    const payments = await dbQuery(`
      SELECT p.*, pm.name as payment_method_name
      FROM payments p
      JOIN payment_methods pm ON p.payment_method_id = pm.id
      WHERE p.booking_id = ? ORDER BY p.id DESC
    `, [bookingId]);
    const invoices = await dbQuery(`SELECT * FROM invoices WHERE booking_id = ? ORDER BY id DESC`, [bookingId]);
    const flightBookings = await dbQuery(`
      SELECT fb.*, f.airline_name, f.flight_number, f.departure_airport, f.arrival_airport, f.departure_time, f.arrival_time
      FROM flight_bookings fb
      JOIN flights f ON fb.flight_id = f.id
      WHERE fb.booking_id = ?
    `, [bookingId]);
    const visaApps = await dbQuery(`
      SELECT va.*, bt.first_name || ' ' || bt.last_name as traveler_name, bt.passport_number
      FROM visa_applications va
      JOIN booking_travelers bt ON va.traveler_id = bt.id
      WHERE va.booking_id = ?
    `, [bookingId]);
    const transportBookings = await dbQuery(`
      SELECT tb.*, t.service_type, t.vehicle_type, t.driver_name, t.driver_phone
      FROM transport_bookings tb
      JOIN transports t ON tb.transport_id = t.id
      WHERE tb.booking_id = ?
    `, [bookingId]);

    res.json({
      success: true,
      data: {
        ...booking,
        travelers,
        payments,
        invoices,
        flightBookings,
        visaApps,
        transportBookings,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Create Booking
router.post('/', authenticate, authorize('bookings', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      customer_id,
      package_id,
      departure_id,
      num_adults = 1,
      num_children = 0,
      num_infants = 0,
      subtotal_amount,
      discount_amount = 0,
      tax_amount = 0,
      total_amount,
      currency = 'USD',
      travel_start_date,
      travel_end_date,
      special_requests,
      internal_notes,
      travelers = [],
    } = req.body;

    const totalTravelers = Number(num_adults) + Number(num_children) + Number(num_infants);
    const finalSubtotal = Number(subtotal_amount) || 0;
    const finalDiscount = Number(discount_amount) || 0;
    const finalTax = Number(tax_amount) || 0;
    const calculatedTotal = Number(total_amount) || (finalSubtotal - finalDiscount + finalTax);

    if (calculatedTotal < 0) {
      res.status(400).json({ success: false, message: 'Total amount cannot be negative' });
      return;
    }

    // Generate unique booking number
    const bookingNum = `BK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await dbRun(`
      INSERT INTO bookings (
        booking_number, customer_id, package_id, departure_id, assigned_admin_id,
        booking_status_id, payment_status, visa_status, flight_status, hotel_status,
        num_adults, num_children, num_infants, total_travelers,
        subtotal_amount, discount_amount, tax_amount, total_amount, paid_amount, remaining_amount,
        currency, travel_start_date, travel_end_date, special_requests, internal_notes
      ) VALUES (?, ?, ?, ?, ?, 3, 'Unpaid', 'Documents Pending', 'Unassigned', 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)
    `, [
      bookingNum, customer_id, package_id, departure_id || null, req.user!.id,
      num_adults, num_children, num_infants, totalTravelers,
      finalSubtotal, finalDiscount, finalTax, calculatedTotal, calculatedTotal,
      currency, travel_start_date || null, travel_end_date || null, special_requests || '', internal_notes || ''
    ]);

    const bookingId = result.insertId;

    // Insert travelers if provided
    if (Array.isArray(travelers) && travelers.length > 0) {
      for (const trav of travelers) {
        if (trav.first_name && trav.last_name) {
          const travResult = await dbRun(`
            INSERT INTO booking_travelers (
              booking_id, linked_customer_id, first_name, last_name, gender,
              date_of_birth, nationality, passport_number, passport_expiry,
              traveler_type, room_type, visa_status, special_requirements
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
          `, [
            bookingId,
            trav.linked_customer_id || null,
            trav.first_name,
            trav.last_name,
            trav.gender || 'Male',
            trav.date_of_birth || '1990-01-01',
            trav.nationality || 'British',
            trav.passport_number || 'TBD',
            trav.passport_expiry || '2030-01-01',
            trav.traveler_type || 'Adult',
            trav.room_type || 'Double',
            trav.special_requirements || ''
          ]);

          // Create visa application placeholder for each traveler
          const appNum = `VISA-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
          await dbRun(`
            INSERT INTO visa_applications (booking_id, traveler_id, application_number, visa_type, status)
            VALUES (?, ?, ?, 'Umrah E-Visa', 'Application Started')
          `, [bookingId, travResult.insertId, appNum]);
        }
      }
    }

    // Auto-generate invoice
    const invNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    await dbRun(`
      INSERT INTO invoices (invoice_number, booking_id, customer_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, status)
      VALUES (?, ?, ?, date('now'), date('now', '+14 days'), ?, ?, ?, ?, 'Sent')
    `, [invNum, bookingId, customer_id, finalSubtotal, finalTax, finalDiscount, calculatedTotal]);

    // Increment booked seats if departure is attached
    if (departure_id) {
      await dbRun(`UPDATE package_departures SET booked_seats = booked_seats + ? WHERE id = ?`, [totalTravelers, departure_id]);
      await dbRun(`UPDATE packages SET booked_seats = booked_seats + ? WHERE id = ?`, [totalTravelers, package_id]);
    }

    await logActivity(req.user!.id, 'bookings', 'create', bookingId, `Created booking ${bookingNum} for total ${currency} ${calculatedTotal}`, req);

    res.json({
      success: true,
      id: bookingId,
      bookingNumber: bookingNum,
      message: 'Booking created successfully with invoice and visa applications initialized',
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. Update Booking Status / Tracking
router.put('/:id/status', authenticate, authorize('bookings', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = req.params.id;
    const { booking_status_id, visa_status, flight_status, hotel_status } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (booking_status_id) {
      updates.push(`booking_status_id = ?`);
      params.push(Number(booking_status_id));
    }
    if (visa_status) {
      updates.push(`visa_status = ?`);
      params.push(visa_status);
    }
    if (flight_status) {
      updates.push(`flight_status = ?`);
      params.push(flight_status);
    }
    if (hotel_status) {
      updates.push(`hotel_status = ?`);
      params.push(hotel_status);
    }

    if (updates.length > 0) {
      params.push(bookingId);
      await dbRun(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`, params);
      await logActivity(req.user!.id, 'bookings', 'update_status', bookingId, `Updated status parameters for Booking #${bookingId}`, req);
    }

    res.json({ success: true, message: 'Status updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
