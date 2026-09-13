import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { dbQuery, dbRun } from '../db';
import { authenticate, authorize, logActivity, AuthRequest } from '../middleware/auth';

const router = Router();

// Setup Multer for upload storage
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|pdf|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and docs are permitted'));
    }
  },
});

// 1. Pages
router.get('/pages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const pages = await dbQuery(`SELECT * FROM pages ORDER BY id DESC`);
    res.json({ success: true, data: pages });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/pages', authenticate, authorize('cms', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, slug, summary, content, meta_title, meta_description, status } = req.body;
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const result = await dbRun(`
      INSERT INTO pages (slug, title, summary, content, meta_title, meta_description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [finalSlug, title, summary || '', content || '', meta_title || title, meta_description || summary || '', status || 'published']);

    await logActivity(req.user!.id, 'cms', 'create_page', result.insertId, `Created CMS page "${title}"`, req);
    res.json({ success: true, id: result.insertId, message: 'Page saved' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 2. Sliders
router.get('/sliders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sliders = await dbQuery(`SELECT * FROM sliders ORDER BY display_order ASC`);
    res.json({ success: true, data: sliders });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/sliders', authenticate, authorize('cms', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, subtitle, badge, primary_btn_text, primary_btn_url, image_url, status } = req.body;
    const result = await dbRun(`
      INSERT INTO sliders (title, subtitle, badge, primary_btn_text, primary_btn_url, image_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [title, subtitle || '', badge || '', primary_btn_text || 'View Packages', primary_btn_url || '/packages', image_url || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1600&q=80', status || 'active']);

    await logActivity(req.user!.id, 'cms', 'create_slider', result.insertId, `Created homepage slider "${title}"`, req);
    res.json({ success: true, id: result.insertId, message: 'Slider added' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 3. FAQs
router.get('/faqs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const faqs = await dbQuery(`SELECT * FROM faqs ORDER BY display_order ASC, id ASC`);
    res.json({ success: true, data: faqs });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/faqs', authenticate, authorize('cms', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { category, question, answer } = req.body;
    const result = await dbRun(`
      INSERT INTO faqs (category, question, answer, is_published)
      VALUES (?, ?, ?, 1)
    `, [category || 'General', question, answer]);

    await logActivity(req.user!.id, 'cms', 'create_faq', result.insertId, `Added FAQ: "${question.substring(0, 40)}..."`, req);
    res.json({ success: true, id: result.insertId, message: 'FAQ added' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 4. Testimonials
router.get('/testimonials', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const testimonials = await dbQuery(`SELECT * FROM testimonials ORDER BY id DESC`);
    res.json({ success: true, data: testimonials });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/testimonials', authenticate, authorize('cms', 'manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { pilgrim_name, location, package_name, rating, review, is_featured, status } = req.body;
    const result = await dbRun(`
      INSERT INTO testimonials (pilgrim_name, location, package_name, rating, review, is_featured, is_verified, status)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?)
    `, [pilgrim_name, location || 'London, UK', package_name || '', rating || 5, review, is_featured ? 1 : 0, status || 'published']);

    await logActivity(req.user!.id, 'cms', 'create_testimonial', result.insertId, `Added testimonial from ${pilgrim_name}`, req);
    res.json({ success: true, id: result.insertId, message: 'Testimonial created' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 5. Media Library
router.get('/media', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { folder, search } = req.query;
    let sql = `SELECT * FROM media_library WHERE 1=1`;
    const params: any[] = [];
    if (folder && folder !== 'all') {
      sql += ` AND folder = ?`;
      params.push(folder);
    }
    if (search) {
      sql += ` AND (filename LIKE ? OR original_name LIKE ? OR title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY id DESC`;
    const media = await dbQuery(sql, params);
    res.json({ success: true, data: media });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/media/upload', authenticate, authorize('media', 'manage'), upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const { folder = 'general', title, alt_text } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;

    const result = await dbRun(`
      INSERT INTO media_library (filename, original_name, file_path, file_url, file_type, file_size, folder, alt_text, title, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.file.filename,
      req.file.originalname,
      req.file.path,
      fileUrl,
      req.file.mimetype,
      req.file.size,
      folder,
      alt_text || req.file.originalname,
      title || req.file.originalname,
      req.user!.id
    ]);

    await logActivity(req.user!.id, 'media', 'upload_file', result.insertId, `Uploaded file ${req.file.originalname}`, req);

    res.json({
      success: true,
      data: {
        id: result.insertId,
        filename: req.file.filename,
        url: fileUrl,
        size: req.file.size,
        name: req.file.originalname,
      },
      message: 'File uploaded successfully',
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
