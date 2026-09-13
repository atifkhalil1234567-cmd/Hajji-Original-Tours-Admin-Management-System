import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Categories
router.get('/categories', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const categories = await dbQuery(`SELECT * FROM package_categories ORDER BY id ASC`);
    res.json({ success: true, data: categories });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/categories', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, type, description, status } = req.body;
    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await dbRun(
      `INSERT INTO package_categories (name, slug, type, description, status) VALUES (?, ?, ?, ?, ?)`,
      [name, finalSlug, type || 'umrah', description || '', status || 'active']
    );
    await logActivity(req.user!.id, 'packages', 'create_category', result.insertId, `Created category ${name}`, req);
    res.json({ success: true, id: result.insertId, message: 'Category created' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Packages List (Search, filter, paginate)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, type, status, categoryId, page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereSql = `WHERE p.deleted_at IS NULL`;
    const params: any[] = [];

    if (search) {
      whereSql += ` AND (p.title LIKE ? OR p.origin_city LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    if (type) {
      whereSql += ` AND p.package_type = ?`;
      params.push(type);
    }
    if (status) {
      whereSql += ` AND p.status = ?`;
      params.push(status);
    }
    if (categoryId) {
      whereSql += ` AND p.category_id = ?`;
      params.push(Number(categoryId));
    }

    const [countRow] = await dbQuery(`SELECT COUNT(*) as total FROM packages p ${whereSql}`, params);
    const packages = await dbQuery(
      `SELECT p.*, pc.name as category_name, pc.type as category_type,
              (SELECT COUNT(*) FROM package_departures pd WHERE pd.package_id = p.id) as departures_count
       FROM packages p
       JOIN package_categories pc ON p.category_id = pc.id
       ${whereSql}
       ORDER BY p.id DESC
       LIMIT ${Number(limit)} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: packages,
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

// 3. Package Detail (with child tables: departures, prices, itineraries, inclusions, exclusions, services, hotels)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkgId = req.params.id;
    const pkgs = await dbQuery(`SELECT p.*, pc.name as category_name FROM packages p JOIN package_categories pc ON p.category_id = pc.id WHERE p.id = ? AND p.deleted_at IS NULL`, [pkgId]);
    if (pkgs.length === 0) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    const pkg = pkgs[0];
    const departures = await dbQuery(`SELECT * FROM package_departures WHERE package_id = ? ORDER BY departure_date ASC`, [pkgId]);
    const prices = await dbQuery(`SELECT * FROM package_prices WHERE package_id = ?`, [pkgId]);
    const itineraries = await dbQuery(`SELECT * FROM package_itineraries WHERE package_id = ? ORDER BY day_number ASC`, [pkgId]);
    const inclusions = await dbQuery(`SELECT * FROM package_inclusions WHERE package_id = ? ORDER BY display_order ASC`, [pkgId]);
    const exclusions = await dbQuery(`SELECT * FROM package_exclusions WHERE package_id = ? ORDER BY display_order ASC`, [pkgId]);
    const services = await dbQuery(`SELECT * FROM package_services WHERE package_id = ?`, [pkgId]);
    const hotels = await dbQuery(
      `SELECT ph.*, h.name as hotel_name, h.city as hotel_city, h.star_rating
       FROM package_hotels ph
       JOIN hotels h ON ph.hotel_id = h.id
       WHERE ph.package_id = ?`,
      [pkgId]
    );

    res.json({
      success: true,
      data: {
        ...pkg,
        departures,
        prices,
        itineraries,
        inclusions,
        exclusions,
        services,
        hotels,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Create Package
router.post('/', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      category_id,
      title,
      slug,
      package_type,
      hajj_type,
      gregorian_year,
      duration_days,
      origin_city,
      starting_price,
      currency,
      total_seats,
      flights_included,
      visa_included,
      ziyarat_included,
      qurbani_included,
      short_summary,
      detailed_description,
      status,
    } = req.body;

    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const result = await dbRun(
      `INSERT INTO packages (
        category_id, title, slug, package_type, hajj_type, gregorian_year, duration_days,
        origin_city, starting_price, currency, total_seats, flights_included, visa_included,
        ziyarat_included, qurbani_included, short_summary, detailed_description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category_id,
        title,
        generatedSlug,
        package_type || 'umrah',
        hajj_type || 'not_applicable',
        gregorian_year || 2026,
        duration_days || 14,
        origin_city || 'London',
        starting_price || 0,
        currency || 'USD',
        total_seats || 50,
        flights_included ? 1 : 0,
        visa_included ? 1 : 0,
        ziyarat_included ? 1 : 0,
        qurbani_included ? 1 : 0,
        short_summary || '',
        detailed_description || '',
        status || 'published',
      ]
    );

    await logActivity(req.user!.id, 'packages', 'create', result.insertId, `Created package "${title}"`, req);
    res.json({ success: true, id: result.insertId, message: 'Package created successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. Update Package
router.put('/:id', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const pkgId = req.params.id;
    const {
      category_id,
      title,
      package_type,
      hajj_type,
      gregorian_year,
      duration_days,
      origin_city,
      starting_price,
      currency,
      total_seats,
      flights_included,
      visa_included,
      ziyarat_included,
      qurbani_included,
      short_summary,
      detailed_description,
      status,
    } = req.body;

    await dbRun(
      `UPDATE packages SET
        category_id = ?, title = ?, package_type = ?, hajj_type = ?, gregorian_year = ?,
        duration_days = ?, origin_city = ?, starting_price = ?, currency = ?, total_seats = ?,
        flights_included = ?, visa_included = ?, ziyarat_included = ?, qurbani_included = ?,
        short_summary = ?, detailed_description = ?, status = ?
       WHERE id = ?`,
      [
        category_id,
        title,
        package_type,
        hajj_type,
        gregorian_year,
        duration_days,
        origin_city,
        starting_price,
        currency,
        total_seats,
        flights_included ? 1 : 0,
        visa_included ? 1 : 0,
        ziyarat_included ? 1 : 0,
        qurbani_included ? 1 : 0,
        short_summary,
        detailed_description,
        status,
        pkgId,
      ]
    );

    await logActivity(req.user!.id, 'packages', 'update', pkgId, `Updated package "${title}"`, req);
    res.json({ success: true, message: 'Package updated successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5b. Toggle Package Status (ON / OFF)
router.patch('/:id/toggle-status', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkgId = req.params.id;
    const explicitStatus = req.body?.status; // 'published' (ON) or 'draft' (OFF)

    const pkgs = await dbQuery(
      `SELECT id, title, status FROM packages WHERE id = ? AND deleted_at IS NULL`,
      [pkgId]
    );
    if (pkgs.length === 0) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    const currentStatus = pkgs[0].status;
    let nextStatus: string;
    if (explicitStatus) {
      nextStatus = explicitStatus;
    } else {
      // If currently published (ON), toggle to draft (OFF), and vice versa
      nextStatus = currentStatus === 'published' ? 'draft' : 'published';
    }

    await dbRun(`UPDATE packages SET status = ? WHERE id = ?`, [nextStatus, pkgId]);
    const stateLabel = nextStatus === 'published' ? 'ON (Active)' : 'OFF (Inactive)';
    await logActivity(
      req.user!.id,
      'packages',
      'toggle_status',
      Number(pkgId),
      `Package "${pkgs[0].title}" turned ${stateLabel}`,
      req
    );

    res.json({
      success: true,
      id: Number(pkgId),
      status: nextStatus,
      isOn: nextStatus === 'published',
      message: `Package turned ${stateLabel}`,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5c. Delete Package (Soft delete)
router.delete('/:id', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkgId = req.params.id;
    const pkgs = await dbQuery(`SELECT title FROM packages WHERE id = ? AND deleted_at IS NULL`, [pkgId]);
    if (pkgs.length === 0) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }
    await dbRun(`UPDATE packages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`, [pkgId]);
    await logActivity(req.user!.id, 'packages', 'delete', Number(pkgId), `Deleted package "${pkgs[0].title}"`, req);
    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 6. Departures
router.post('/:id/departures', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const package_id = req.params.id;
    const { departure_title, departure_date, return_date, total_seats, status } = req.body;

    const result = await dbRun(
      `INSERT INTO package_departures (package_id, departure_title, departure_date, return_date, total_seats, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [package_id, departure_title, departure_date, return_date, total_seats || 50, status || 'available']
    );

    await logActivity(req.user!.id, 'packages', 'add_departure', result.insertId, `Added departure "${departure_title}" for pkg #${package_id}`, req);
    res.json({ success: true, id: result.insertId, message: 'Departure created' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
