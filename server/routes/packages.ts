import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// Canonical Currency Mapping (aligned with production `currencies` table: 1=USD, 2=SAR, 3=GBP, 4=EUR, 5=CAD, 6=PKR)
export const CURRENCY_ID_MAP: Record<string, number> = {
  USD: 1,
  SAR: 2,
  GBP: 3,
  EUR: 4,
  CAD: 5,
  PKR: 6,
};

export const CURRENCY_CODE_MAP: Record<number, string> = {
  1: 'USD',
  2: 'SAR',
  3: 'GBP',
  4: 'EUR',
  5: 'CAD',
  6: 'PKR',
};

export function resolveCurrency(currencyId?: any, currencyCode?: any): { currency_id: number; currency: string } {
  const cId = Number(currencyId);
  const cCode = typeof currencyCode === 'string' ? currencyCode.trim().toUpperCase() : '';

  if (cId && CURRENCY_CODE_MAP[cId]) {
    const matchedCode = CURRENCY_CODE_MAP[cId];
    const finalCode = cCode && CURRENCY_ID_MAP[cCode] === cId ? cCode : matchedCode;
    return { currency_id: cId, currency: finalCode };
  }

  if (cCode && CURRENCY_ID_MAP[cCode]) {
    const matchedId = CURRENCY_ID_MAP[cCode];
    return { currency_id: matchedId, currency: cCode };
  }

  return { currency_id: 1, currency: 'USD' };
}

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

// 3. Departures List & Create (Before /:id so /departures is never matched as an ID)
router.get('/departures', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { package_id } = req.query;
    let sql = `
      SELECT pd.*, p.title as package_title, p.origin_city
      FROM package_departures pd
      JOIN packages p ON pd.package_id = p.id
      WHERE p.deleted_at IS NULL
    `;
    const params: any[] = [];
    if (package_id) {
      sql += ` AND pd.package_id = ?`;
      params.push(Number(package_id));
    }
    sql += ` ORDER BY pd.departure_date ASC`;
    const departures = await dbQuery(sql, params);
    res.json({ success: true, data: departures });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/departures', authenticate, authorize('packages', 'manage'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { package_id, departure_title, departure_date, return_date, total_seats, status } = req.body;
    if (!package_id) {
      res.status(400).json({ success: false, message: 'package_id is required' });
      return;
    }
    const result = await dbRun(
      `INSERT INTO package_departures (package_id, departure_title, departure_date, return_date, total_seats, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(package_id), departure_title, departure_date, return_date, total_seats || 50, status || 'available']
    );

    await logActivity(req.user!.id, 'packages', 'add_departure', result.insertId, `Added departure "${departure_title}" for pkg #${package_id}`, req);
    res.json({ success: true, id: result.insertId, message: 'Departure created successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Package Detail (with child tables: departures, prices, itineraries, inclusions, exclusions, services, hotels)
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pkgId = req.params.id;
    const isNum = !isNaN(Number(pkgId));
    const pkgs = await dbQuery(
      `SELECT p.*, pc.name as category_name FROM packages p JOIN package_categories pc ON p.category_id = pc.id WHERE ${isNum ? 'p.id = ?' : 'p.slug = ?'} AND p.deleted_at IS NULL`,
      [pkgId]
    );
    if (pkgs.length === 0) {
      res.status(404).json({ success: false, message: 'Package not found' });
      return;
    }

    const pkg = pkgs[0];
    const actualId = pkg.id;
    const departures = await dbQuery(`SELECT * FROM package_departures WHERE package_id = ? ORDER BY departure_date ASC`, [actualId]);
    const prices = await dbQuery(`SELECT * FROM package_prices WHERE package_id = ?`, [actualId]);
    const itineraries = await dbQuery(`SELECT * FROM package_itineraries WHERE package_id = ? ORDER BY day_number ASC`, [actualId]);
    const inclusions = await dbQuery(`SELECT * FROM package_inclusions WHERE package_id = ? ORDER BY display_order ASC`, [actualId]);
    const exclusions = await dbQuery(`SELECT * FROM package_exclusions WHERE package_id = ? ORDER BY display_order ASC`, [actualId]);
    const services = await dbQuery(`SELECT * FROM package_services WHERE package_id = ?`, [actualId]);
    const hotels = await dbQuery(
      `SELECT ph.*, h.name as hotel_name, h.city as hotel_city, h.star_rating
       FROM package_hotels ph
       JOIN hotels h ON ph.hotel_id = h.id
       WHERE ph.package_id = ?`,
      [actualId]
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
      currency_id,
      total_seats,
      flights_included,
      visa_included,
      ziyarat_included,
      qurbani_included,
      short_summary,
      detailed_description,
      status,
    } = req.body;

    const { currency_id: resolvedCurrencyId, currency: resolvedCurrency } = resolveCurrency(currency_id, currency);

    const generatedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);

    const result = await dbRun(
      `INSERT INTO packages (
        category_id, title, slug, package_type, hajj_type, gregorian_year, duration_days,
        origin_city, starting_price, currency, currency_id, total_seats, flights_included, visa_included,
        ziyarat_included, qurbani_included, short_summary, detailed_description, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        resolvedCurrency,
        resolvedCurrencyId,
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
      currency_id,
      total_seats,
      flights_included,
      visa_included,
      ziyarat_included,
      qurbani_included,
      short_summary,
      detailed_description,
      status,
    } = req.body;

    const { currency_id: resolvedCurrencyId, currency: resolvedCurrency } = resolveCurrency(currency_id, currency);

    await dbRun(
      `UPDATE packages SET
        category_id = ?, title = ?, package_type = ?, hajj_type = ?, gregorian_year = ?,
        duration_days = ?, origin_city = ?, starting_price = ?, currency = ?, currency_id = ?, total_seats = ?,
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
        resolvedCurrency,
        resolvedCurrencyId,
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
