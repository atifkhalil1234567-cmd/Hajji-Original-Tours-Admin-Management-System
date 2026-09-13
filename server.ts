import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { initDatabase, getDbStatus } from './server/db';
import authRoutes from './server/routes/auth';
import dashboardRoutes from './server/routes/dashboard';
import packageRoutes from './server/routes/packages';
import hotelRoutes from './server/routes/hotels';
import crmRoutes from './server/routes/crm';
import bookingRoutes from './server/routes/bookings';
import financeRoutes from './server/routes/finance';
import travelRoutes from './server/routes/travel';
import cmsRoutes from './server/routes/cms';
import adminRoutes from './server/routes/admin';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS and Security Headers
  // Express backend allows requests from Vercel frontend domain without insecure wildcard credentials
  const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && typeof origin === 'string') {
      let isAllowed = false;

      if (configuredCorsOrigins.length === 0) {
        // By default, allow incoming web origin (e.g. Vercel deployment, custom domain, or localhost)
        isAllowed = true;
      } else {
        isAllowed = configuredCorsOrigins.some((allowed) => {
          if (allowed === '*' || allowed === origin) return true;
          // Support wildcard subdomain matching like *.vercel.app
          if (allowed.startsWith('*.')) {
            const rootDomain = allowed.slice(2);
            try {
              const originHost = new URL(origin).hostname;
              return originHost === rootDomain || originHost.endsWith(`.${rootDomain}`);
            } catch {
              return false;
            }
          }
          return false;
        });
      }

      if (isAllowed) {
        // Set the specific allowed origin (never '*' when credentials are used)
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Refreshed-Token');
    res.setHeader('Access-Control-Expose-Headers', 'X-Refreshed-Token');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Ensure uploads directory exists and is statically served
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Initialize relational database (MySQL or embedded schema)
  try {
    const status = await initDatabase();
    console.log(`[DB Engine] Status: ${status.message}`);
  } catch (err) {
    console.error('[DB Engine] Failed to initialize database:', err);
  }

  // API Routes
  app.get('/api/health', async (req, res) => {
    const dbStatus = await getDbStatus();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      app: 'Hajji Original Tours Admin Management System',
      version: '1.0.0',
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/packages', packageRoutes);
  app.use('/api/hotels', hotelRoutes);
  app.use('/api/crm', crmRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/travel', travelRoutes);
  app.use('/api/cms', cmsRoutes);
  app.use('/api/admin', adminRoutes);

  // Return 404 JSON for non-existent API routes before SPA fallback
  app.all('/api', (req, res) => {
    res.status(404).json({ success: false, message: `API endpoint "${req.originalUrl}" not found` });
  });
  app.all('/api/*', (req, res) => {
    res.status(404).json({ success: false, message: `API endpoint "${req.originalUrl}" not found` });
  });

  // Global Error Handler for friendly messages
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error]', err);
    res.status(500).json({
      success: false,
      message: err.message || 'An unexpected internal server error occurred',
    });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Hajji Original Tours Admin] Running on http://${HOST}:${PORT}`);
  });
}

startServer();
