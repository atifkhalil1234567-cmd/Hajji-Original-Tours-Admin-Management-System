import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { initDatabase, getDbStatus, testMySQLQuery } from './server/db';
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
import customerRoutes from './server/routes/customerAuth';

// Process-level safety guards to prevent unhandled errors from terminating Node
process.on('unhandledRejection', (reason) => {
  console.warn('[Server] Handled unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Handled uncaught exception:', err);
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  // 1. CORS and Security Headers Middleware (Mounted FIRST before body parsers and routes)
  const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const KNOWN_ALLOWED_ORIGINS = new Set([
    'https://hajjioriginaltours.com',
    'http://hajjioriginaltours.com',
    'https://www.hajjioriginaltours.com',
    'http://www.hajjioriginaltours.com',
    'https://admin.hajjioriginaltours.com',
    'https://api.hajjioriginaltours.com',
    'https://myc.hajjioriginaltours.com',
  ]);

  app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && typeof origin === 'string') {
      let isAllowed = false;

      // Unconditionally allow exact production frontend origins
      if (KNOWN_ALLOWED_ORIGINS.has(origin)) {
        isAllowed = true;
      } else {
        try {
          const originHost = new URL(origin).hostname;
          if (originHost === 'hajjioriginaltours.com' || originHost.endsWith('.hajjioriginaltours.com')) {
            isAllowed = true;
          }
        } catch {
          // ignore parsing error
        }
      }

      // Check env-configured CORS origins or default to true if none configured
      if (!isAllowed) {
        if (configuredCorsOrigins.length === 0) {
          isAllowed = true;
        } else {
          isAllowed = configuredCorsOrigins.some((allowed) => {
            if (allowed === '*' || allowed === origin) return true;
            const cleanAllowed = allowed.replace(/^https?:\/\//, '');
            if (cleanAllowed.startsWith('*.')) {
              const rootDomain = cleanAllowed.slice(2);
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
      }

      if (isAllowed) {
        if (origin === 'null') {
          res.setHeader('Access-Control-Allow-Origin', '*');
        } else {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
      }
    } else {
      // Direct or server-side requests without Origin header
      res.setHeader('Access-Control-Allow-Origin', 'https://hajjioriginaltours.com');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

    // Dynamically allow requested headers from the browser preflight, ensuring Content-Type and Authorization are always included
    const reqHeaders = req.headers['access-control-request-headers'];
    if (reqHeaders && typeof reqHeaders === 'string') {
      const headerSet = new Set(reqHeaders.split(',').map((h) => h.trim()));
      headerSet.add('Content-Type');
      headerSet.add('Authorization');
      res.setHeader('Access-Control-Allow-Headers', Array.from(headerSet).join(', '));
    } else {
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, Origin, X-Requested-With, Accept, X-Refreshed-Token, Access-Control-Request-Method, Access-Control-Request-Headers'
      );
    }

    res.setHeader('Access-Control-Expose-Headers', 'X-Refreshed-Token');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Safe server-side logging for incoming requests to /api/auth routes
    if (req.originalUrl?.includes('/auth/') || req.url?.includes('/auth/')) {
      const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';
      console.log(`[HTTP ${req.method}] ${req.originalUrl || req.url} - Origin: "${origin || 'none'}" - IP: ${clientIp}`);
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Ensure uploads directory exists and is statically served (safely guarded)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (mkdirErr) {
      console.warn('[Uploads Directory Notice]:', mkdirErr);
    }
  }
  app.use('/uploads', express.static(uploadsDir));

  // Initialize relational database asynchronously so server binds to port immediately
  initDatabase()
    .then((status) => {
      console.log(`[DB Engine] Status: ${status.message}`);
    })
    .catch((err) => {
      console.log('[DB Engine] Initial database notice:', err?.message || err);
    });

  // API Routes - Safe /api/health status check
  app.get('/api/health', async (req, res) => {
    const dbStatus = await getDbStatus();
    const isConnected = Boolean(dbStatus.connected);
    res.status(isConnected ? 200 : 503).json({
      status: isConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      app: 'Hajji Original Tours Admin Management System',
      version: '1.0.0',
    });
  });

  // Temporary safe MySQL test endpoint for Hostinger deployment verification
  app.get('/api/db-test', async (req, res) => {
    try {
      const isConnected = await testMySQLQuery();
      if (isConnected) {
        res.status(200).json({
          success: true,
          database: 'connected',
        });
      } else {
        res.status(500).json({
          success: false,
          database: 'connection_failed',
        });
      }
    } catch {
      res.status(500).json({
        success: false,
        database: 'connection_failed',
      });
    }
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
  app.use('/api/customer', customerRoutes);

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

  // Determine production vs dev environment safely
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(typeof __filename !== 'undefined' && (__filename.endsWith('.cjs') || __filename.includes('dist'))) ||
    Boolean(process.argv[1] && (process.argv[1].endsWith('.cjs') || process.argv[1].includes('dist'))) ||
    fs.existsSync(path.join(process.cwd(), 'dist', 'index.html')) ||
    (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html')));

  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn('[Vite Dev Server Notice]:', viteError);
    }
  } else {
    const possibleDistPaths = [
      path.join(process.cwd(), 'dist'),
      typeof __dirname !== 'undefined' ? __dirname : '',
      typeof __dirname !== 'undefined' ? path.join(__dirname, 'dist') : '',
    ].filter(Boolean);

    const distPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><title>Hajji Original Tours Admin</title></head><body><h1>Hajji Original Tours Admin</h1><p>System is online.</p></body></html>');
      }
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`[Hajji Original Tours Admin] Running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('[HTTP Server Listen Error]:', err?.message || err);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]:', err);
});
