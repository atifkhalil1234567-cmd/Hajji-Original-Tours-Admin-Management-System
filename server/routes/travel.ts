import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Visa Applications
router.get('/visas', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    let whereSql = `WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      whereSql += ` AND va.status = ?`;
      params.push(status);
    }
    if (search) {
      whereSql += ` AND (va.application_number LIKE ? OR bt.first_name LIKE ? OR bt.last_name LIKE ? OR bt.passport_number LIKE ? OR b.booking_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    const visas = await dbQuery(`
      SELECT va.*,
             bt.first_name || ' ' || bt.last_name as traveler_name, bt.nationality, bt.passport_number, bt.passport_expiry,
             b.booking_number, b.travel_start_date,
             p.title as package_title
      FROM visa_applications va
      JOIN booking_travelers bt ON va.traveler_id = bt.id
      JOIN bookings b ON va.booking_id = b.id
      JOIN packages p ON b.package_id = p.id
      ${whereSql}
      ORDER BY va.id DESC
    `, params);

    res.json({ success: true, data: visas });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put('/visas/:id', authenticate, authorize('visas', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const visaId = req.params.id;
    const { status, mofa_number, visa_number, rejection_reason, submission_date, approval_date } = req.body;

    await dbRun(`
      UPDATE visa_applications
      SET status = ?, mofa_number = ?, visa_number = ?, rejection_reason = ?, submission_date = ?, approval_date = ?
      WHERE id = ?
    `, [status, mofa_number, visa_number, rejection_reason || '', submission_date || null, approval_date || null, visaId]);

    // If approved, update traveler visa status too
    if (status === 'Approved') {
      const [va] = await dbQuery(`SELECT traveler_id, booking_id FROM visa_applications WHERE id = ?`, [visaId]);
      if (va) {
        await dbRun(`UPDATE booking_travelers SET visa_status = 'Approved', visa_number = ? WHERE id = ?`, [visa_number, va.traveler_id]);
      }
    }

    await logActivity(req.user!.id, 'visas', 'update_visa', visaId, `Updated visa #${visaId} status to ${status}`, req);
    res.json({ success: true, message: 'Visa application updated' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Flights
router.get('/flights', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const flights = await dbQuery(`SELECT * FROM flights ORDER BY departure_time ASC`);
    res.json({ success: true, data: flights });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/flights', authenticate, authorize('flights', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { airline_name, airline_code, flight_number, departure_airport, arrival_airport, departure_city, arrival_city, departure_time, arrival_time, flight_type, baggage_allowance } = req.body;
    const result = await dbRun(`
      INSERT INTO flights (airline_name, airline_code, flight_number, departure_airport, arrival_airport, departure_city, arrival_city, departure_time, arrival_time, flight_type, baggage_allowance, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')
    `, [
      airline_name, airline_code || '', flight_number, departure_airport, arrival_airport,
      departure_city, arrival_city, departure_time, arrival_time, flight_type || 'Direct', baggage_allowance || '2 x 23kg'
    ]);

    await logActivity(req.user!.id, 'flights', 'create_flight', result.insertId, `Scheduled flight ${airline_code} ${flight_number}`, req);
    res.json({ success: true, id: result.insertId, message: 'Flight added' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/flights/assign-to-booking', authenticate, authorize('flights', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { booking_id, flight_id, pnr_number, ticket_number } = req.body;
    const result = await dbRun(`
      INSERT INTO flight_bookings (booking_id, flight_id, pnr_number, ticket_number, status)
      VALUES (?, ?, ?, ?, 'Confirmed')
    `, [booking_id, flight_id, pnr_number, ticket_number || '']);

    await dbRun(`UPDATE bookings SET flight_status = 'Booked' WHERE id = ?`, [booking_id]);

    await logActivity(req.user!.id, 'flights', 'assign_pnr', result.insertId, `Assigned PNR ${pnr_number} to Booking #${booking_id}`, req);
    res.json({ success: true, id: result.insertId, message: 'Flight booking assigned' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 3. Transport
router.get('/transports', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const transports = await dbQuery(`SELECT * FROM transports ORDER BY id ASC`);
    const transportBookings = await dbQuery(`
      SELECT tb.*, t.service_type, t.vehicle_type, t.driver_name, t.driver_phone,
             b.booking_number, c.first_name || ' ' || c.last_name as customer_name
      FROM transport_bookings tb
      JOIN transports t ON tb.transport_id = t.id
      JOIN bookings b ON tb.booking_id = b.id
      JOIN customers c ON b.customer_id = c.id
      ORDER BY tb.scheduled_time ASC
    `);

    res.json({ success: true, transports, transportBookings });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/transports', authenticate, authorize('transport', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { service_type, vehicle_type, capacity, driver_name, driver_phone, plate_number, status } = req.body;
    const result = await dbRun(`
      INSERT INTO transports (service_type, vehicle_type, capacity, driver_name, driver_phone, plate_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [service_type, vehicle_type, Number(capacity) || 7, driver_name, driver_phone, plate_number || '', status || 'Available']);

    await logActivity(req.user!.id, 'transport', 'create_transport', result.insertId, `Added vehicle ${vehicle_type} (${driver_name})`, req);
    res.json({ success: true, id: result.insertId, message: 'Transport vehicle added' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
