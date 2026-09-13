import { Router, Response } from 'express';
import { dbQuery } from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // 1. KPI Counts
    const [custRow] = await dbQuery(`SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL`);
    const [travelerRow] = await dbQuery(`SELECT COUNT(*) as count FROM booking_travelers`);
    const [pkgRow] = await dbQuery(`SELECT COUNT(*) as count FROM packages WHERE status = 'published' AND deleted_at IS NULL`);
    const [depRow] = await dbQuery(`SELECT COUNT(*) as count FROM package_departures WHERE departure_date >= date('now') AND status != 'closed'`);
    
    // Bookings
    const [bookingCounts] = await dbQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN payment_status = 'Unpaid' OR payment_status = 'Partially Paid' THEN 1 ELSE 0 END) as pending_payment,
        SUM(CASE WHEN booking_status_id = 3 THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN booking_status_id = 1 THEN 1 ELSE 0 END) as inquiries,
        SUM(CASE WHEN booking_status_id = 6 THEN 1 ELSE 0 END) as cancelled,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as total_outstanding
      FROM bookings WHERE deleted_at IS NULL
    `);

    // Leads
    const [leadCounts] = await dbQuery(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'New' THEN 1 ELSE 0 END) as new_leads,
        SUM(CASE WHEN status = 'Follow-up' OR followup_due_date <= date('now') THEN 1 ELSE 0 END) as followups_due
      FROM leads
    `);

    // Visas & Passports
    const [visaRow] = await dbQuery(`SELECT COUNT(*) as count FROM visa_applications`);
    const [pendingDocsRow] = await dbQuery(`
      SELECT COUNT(*) as count FROM customer_passports WHERE status = 'Expiring Soon' OR status = 'Rejected'
    `);
    const [confirmedFlightsRow] = await dbQuery(`SELECT COUNT(*) as count FROM flight_bookings WHERE status = 'Confirmed' OR status = 'Issued'`);
    const [hotelCountRow] = await dbQuery(`SELECT COUNT(*) as count FROM hotels WHERE status = 'active'`);

    // 2. Recent Bookings
    const recentBookings = await dbQuery(`
      SELECT b.id, b.booking_number, b.total_amount, b.paid_amount, b.remaining_amount, 
             b.payment_status, b.visa_status, b.created_at, b.currency,
             c.first_name || ' ' || c.last_name as customer_name, c.email as customer_email,
             p.title as package_title, bs.label as status_label, bs.badge_color
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      JOIN packages p ON b.package_id = p.id
      JOIN booking_statuses bs ON b.booking_status_id = bs.id
      WHERE b.deleted_at IS NULL
      ORDER BY b.id DESC LIMIT 5
    `);

    // 3. Recent Leads
    const recentLeads = await dbQuery(`
      SELECT id, full_name, email, phone, package_interest, destination, status, priority, created_at
      FROM leads
      ORDER BY id DESC LIMIT 5
    `);

    // 4. Recent Payments
    const recentPayments = await dbQuery(`
      SELECT p.id, p.payment_number, p.amount, p.currency, p.payment_date, p.status, p.transaction_reference,
             pm.name as payment_method_name,
             c.first_name || ' ' || c.last_name as customer_name,
             b.booking_number
      FROM payments p
      JOIN payment_methods pm ON p.payment_method_id = pm.id
      JOIN customers c ON p.customer_id = c.id
      JOIN bookings b ON p.booking_id = b.id
      ORDER BY p.id DESC LIMIT 5
    `);

    // 5. Upcoming Departures
    const upcomingDepartures = await dbQuery(`
      SELECT d.id, d.departure_title, d.departure_date, d.return_date, d.total_seats, d.booked_seats, d.status,
             p.title as package_title, p.origin_city
      FROM package_departures d
      JOIN packages p ON d.package_id = p.id
      ORDER BY d.departure_date ASC LIMIT 5
    `);

    // 6. Expiring Passports
    const expiringPassports = await dbQuery(`
      SELECT cp.id, cp.passport_number, cp.issuing_country, cp.expiry_date, cp.status,
             c.first_name || ' ' || c.last_name as customer_name, c.phone, c.email
      FROM customer_passports cp
      JOIN customers c ON cp.customer_id = c.id
      WHERE cp.status = 'Expiring Soon' OR cp.status = 'Expired'
      ORDER BY cp.expiry_date ASC LIMIT 5
    `);

    // 7. Recent Admin Activity
    const recentActivity = await dbQuery(`
      SELECT aal.id, aal.module, aal.action, aal.description, aal.created_at,
             adm.first_name || ' ' || adm.last_name as admin_name, adm.username
      FROM admin_activity_logs aal
      LEFT JOIN admins adm ON aal.admin_id = adm.id
      ORDER BY aal.id DESC LIMIT 6
    `);

    // 8. Lead Source Distribution
    const leadsBySource = await dbQuery(`
      SELECT source, COUNT(*) as count FROM leads GROUP BY source
    `);

    // 9. Booking Status Distribution
    const bookingStatusDist = await dbQuery(`
      SELECT bs.label, COUNT(b.id) as count, bs.badge_color
      FROM booking_statuses bs
      LEFT JOIN bookings b ON b.booking_status_id = bs.id AND b.deleted_at IS NULL
      GROUP BY bs.id, bs.label, bs.badge_color
    `);

    res.json({
      success: true,
      stats: {
        totalCustomers: custRow?.count || 0,
        totalPilgrims: travelerRow?.count || 0,
        activePackages: pkgRow?.count || 0,
        upcomingDeparturesCount: depRow?.count || 0,
        totalBookings: bookingCounts?.total || 0,
        confirmedBookings: bookingCounts?.confirmed || 0,
        pendingBookings: bookingCounts?.pending_payment || 0,
        cancelledBookings: bookingCounts?.cancelled || 0,
        inquiriesCount: bookingCounts?.inquiries || 0,
        totalRevenue: Number(bookingCounts?.total_revenue || 0),
        totalPaid: Number(bookingCounts?.total_paid || 0),
        totalOutstanding: Number(bookingCounts?.total_outstanding || 0),
        totalLeads: leadCounts?.total || 0,
        newLeads: leadCounts?.new_leads || 0,
        followupsDue: leadCounts?.followups_due || 0,
        visaApplications: visaRow?.count || 0,
        pendingVisaDocs: pendingDocsRow?.count || 0,
        confirmedFlights: confirmedFlightsRow?.count || 0,
        totalHotels: hotelCountRow?.count || 0,
      },
      recentBookings,
      recentLeads,
      recentPayments,
      upcomingDepartures,
      expiringPassports,
      recentActivity,
      distribution: {
        leadsBySource,
        bookingStatus: bookingStatusDist,
      },
    });
  } catch (err: any) {
    console.error('[Dashboard Stats Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

export default router;
