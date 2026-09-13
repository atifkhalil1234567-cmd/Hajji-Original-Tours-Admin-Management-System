import { Router, Response } from 'express';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { city, star, search } = req.query;
    let sql = `SELECT h.*, 
               (SELECT COUNT(*) FROM hotel_rooms hr WHERE hr.hotel_id = h.id) as rooms_count
               FROM hotels h WHERE 1=1`;
    const params: any[] = [];

    if (city) {
      sql += ` AND h.city = ?`;
      params.push(city);
    }
    if (star) {
      sql += ` AND h.star_rating = ?`;
      params.push(Number(star));
    }
    if (search) {
      sql += ` AND (h.name LIKE ? OR h.address LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY h.city ASC, h.star_rating DESC`;
    const hotels = await dbQuery(sql, params);
    res.json({ success: true, data: hotels });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const hotelId = req.params.id;
    const hotels = await dbQuery(`SELECT * FROM hotels WHERE id = ?`, [hotelId]);
    if (hotels.length === 0) {
      res.status(404).json({ success: false, message: 'Hotel not found' });
      return;
    }

    const rooms = await dbQuery(`SELECT * FROM hotel_rooms WHERE hotel_id = ?`, [hotelId]);
    const facilities = await dbQuery(
      `SELECT hf.* FROM hotel_facility_relations hfr
       JOIN hotel_facilities hf ON hfr.facility_id = hf.id
       WHERE hfr.hotel_id = ?`,
      [hotelId]
    );

    res.json({
      success: true,
      data: {
        ...hotels[0],
        rooms,
        facilities,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', authenticate, authorize('hotels', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, city, star_rating, distance_meters, shuttle_available, address, phone, email, description, status } = req.body;
    const result = await dbRun(
      `INSERT INTO hotels (name, city, star_rating, distance_meters, shuttle_available, address, phone, email, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        city || 'Makkah',
        star_rating || 5,
        distance_meters || 100,
        shuttle_available ? 1 : 0,
        address,
        phone || '',
        email || '',
        description || '',
        status || 'active',
      ]
    );

    await logActivity(req.user!.id, 'hotels', 'create', result.insertId, `Created hotel "${name}" in ${city}`, req);
    res.json({ success: true, id: result.insertId, message: 'Hotel added successfully' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/:id/rooms', authenticate, authorize('hotels', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const hotel_id = req.params.id;
    const { room_name, room_type, view_type, capacity_adults, capacity_children, amenities, status } = req.body;

    const result = await dbRun(
      `INSERT INTO hotel_rooms (hotel_id, room_name, room_type, view_type, capacity_adults, capacity_children, amenities, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [hotel_id, room_name, room_type || 'double', view_type || 'city_view', capacity_adults || 2, capacity_children || 0, amenities || '', status || 'available']
    );

    await logActivity(req.user!.id, 'hotels', 'create_room', result.insertId, `Added room "${room_name}" to hotel #${hotel_id}`, req);
    res.json({ success: true, id: result.insertId, message: 'Room added' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
