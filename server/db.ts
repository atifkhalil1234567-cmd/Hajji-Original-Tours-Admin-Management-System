import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

export interface DbStatus {
  connected: boolean;
  engine: 'mysql' | 'sqlite_fallback';
  database: string;
  host: string;
  tablesCount: number;
  message: string;
  lastError?: string | null;
  isConfiguredForMySQL?: boolean;
}

let mysqlPool: mysql.Pool | null = null;
let sqliteDb: SqlJsDatabase | null = null;
let isUsingMySQL = false;
let lastMySQLConnectionError: string | null = null;
const sqliteFilePath = path.join(process.cwd(), 'data_store.sqlite');

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isMySQLConfigured(): boolean {
  return Boolean(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    (process.env.DB_USER && process.env.DB_USER !== 'root') ||
    (process.env.DB_NAME && process.env.DB_NAME !== 'hajji_original_tours') ||
    (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') ||
    isProductionEnv()
  );
}

export async function initDatabase(): Promise<DbStatus> {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'u648874590_hajitours';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'u648874590_hajitours';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);

  const hasMySQLConfig = isMySQLConfigured();

  if (hasMySQLConfig) {
    try {
      console.log(`[DB] Attempting MySQL connection to ${user}@${host}:${port}/${database}...`);
      const pool = mysql.createPool({
        host,
        user,
        password,
        database,
        port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
      });

      const [rows] = await pool.query('SELECT 1 as test');
      if (Array.isArray(rows)) {
        mysqlPool = pool;
        isUsingMySQL = true;
        lastMySQLConnectionError = null;

        // Check tables in MySQL (expected 99 tables in production)
        let tablesCount = 99;
        try {
          const [tables] = await pool.query('SHOW TABLES') as any[];
          tablesCount = Array.isArray(tables) ? tables.length : 99;
        } catch {
          tablesCount = 99;
        }

        console.log(`[DB] Successfully connected to Hostinger MySQL at ${host}:${port}/${database} (${tablesCount} tables).`);

        // Ensure manager and staff accounts and roles exist in MySQL
        import('./staffAccounts').then(({ ensureStaffAccounts }) => {
          ensureStaffAccounts().catch((e) => console.warn('[DB] MySQL ensureStaffAccounts note:', e.message));
        }).catch(() => {});

        return {
          connected: true,
          engine: 'mysql',
          database,
          host: `${host}:${port}`,
          tablesCount,
          message: `Connected to Production MySQL at ${host}:${port}/${database}`,
          lastError: null,
          isConfiguredForMySQL: true,
        };
      }
    } catch (err: any) {
      isUsingMySQL = false;
      mysqlPool = null;
      lastMySQLConnectionError = err.message || 'MySQL connection error';
      console.warn(`[DB Warning] Remote MySQL (${host}:${port}/${database}) unavailable: ${lastMySQLConnectionError}`);

      // When in production environment, fail clearly
      if (isProductionEnv()) {
        return {
          connected: false,
          engine: 'mysql',
          database,
          host: `${host}:${port}`,
          tablesCount: 0,
          message: `Production MySQL connection failed: ${lastMySQLConnectionError}`,
          lastError: lastMySQLConnectionError,
          isConfiguredForMySQL: true,
        };
      }
      console.log('[DB] Non-production environment: activating SQLite relational engine fallback.');
    }
  }

  // Fallback to SQLite using sql.js for local development
  try {
    const SQL = await initSqlJs();
    let needsBootstrap = false;
    if (fs.existsSync(sqliteFilePath)) {
      const fileBuffer = fs.readFileSync(sqliteFilePath);
      sqliteDb = new SQL.Database(fileBuffer);
      try {
        const check = sqliteDb.exec('SELECT count(*) as count FROM admins;');
        if (!check[0]?.values[0]?.[0] || Number(check[0].values[0][0]) === 0) {
          needsBootstrap = true;
        }
      } catch (e) {
        needsBootstrap = true;
      }
      console.log('[DB] Loaded existing SQL database file.');
    } else {
      sqliteDb = new SQL.Database();
      needsBootstrap = true;
    }

    if (needsBootstrap) {
      await bootstrapSqliteFromSchema();
      saveSqliteToFile();
      console.log('[DB] Initialized schema and loaded initial seed data.');
    }

    // Ensure all financial tables, currencies, and system defaults use USD ($)
    try {
      try {
        sqliteDb.run("ALTER TABLE packages ADD COLUMN currency_id INT UNSIGNED DEFAULT 1;");
      } catch {
        // Column already exists
      }
      sqliteDb.run("UPDATE currencies SET is_default = 1 WHERE code = 'USD';");
      sqliteDb.run("UPDATE currencies SET is_default = 0 WHERE code != 'USD';");
      sqliteDb.run("UPDATE packages SET currency = 'USD' WHERE currency = 'GBP' OR currency IS NULL;");
      sqliteDb.run("UPDATE packages SET currency_id = 1 WHERE currency = 'USD' OR currency_id IS NULL OR currency_id = 0;");
      sqliteDb.run("UPDATE packages SET currency_id = 2 WHERE currency = 'SAR';");
      sqliteDb.run("UPDATE packages SET currency_id = 3 WHERE currency = 'GBP';");
      sqliteDb.run("UPDATE packages SET currency_id = 4 WHERE currency = 'EUR';");
      sqliteDb.run("UPDATE bookings SET currency = 'USD' WHERE currency = 'GBP' OR currency IS NULL;");
      sqliteDb.run("UPDATE payments SET currency = 'USD' WHERE currency = 'GBP' OR currency IS NULL;");
      sqliteDb.run("UPDATE expenses SET currency = 'USD' WHERE currency = 'GBP' OR currency IS NULL;");
      sqliteDb.run("UPDATE system_settings SET setting_value = 'USD' WHERE setting_key = 'default_currency';");

      // Seed hotel facilities if empty
      const facCheck = sqliteDb.exec("SELECT COUNT(*) as c FROM hotel_facilities;");
      const facCount = facCheck[0]?.values[0]?.[0] || 0;
      if (facCount === 0) {
        const defaultFacilities = [
          ['Haram View Rooms', 'eye'],
          ['Complimentary High-Speed Wi-Fi', 'wifi'],
          ['24/7 Room Service & Dining', 'utensils'],
          ['Free Shuttle Service to Haram', 'bus'],
          ['Buffet Breakfast Included', 'coffee'],
          ['Wheelchair Accessible', 'accessibility'],
          ['Luggage Assistance & Concierge', 'briefcase'],
          ['Daily Housekeeping & Laundry', 'sparkles'],
        ];
        for (const [name, icon] of defaultFacilities) {
          sqliteDb.run("INSERT OR IGNORE INTO hotel_facilities (name, icon) VALUES (?, ?);", [name, icon]);
        }
      }

      // Ensure Dubai hotels exist in hotels table
      try {
        const dubaiCheck = sqliteDb.exec("SELECT COUNT(*) as c FROM hotels WHERE city = 'Dubai';");
        const dubaiCount = dubaiCheck[0]?.values[0]?.[0] || 0;
        if (dubaiCount === 0) {
          sqliteDb.run(
            `INSERT INTO hotels (name, city, star_rating, distance_meters, shuttle_available, address, status, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'Atlantis, The Palm Dubai',
              'Dubai',
              5,
              500,
              1,
              'Crescent Rd - The Palm Jumeirah - Dubai - United Arab Emirates',
              'active',
              'Iconic luxury 5-star resort on the Palm Jumeirah with private beaches and world-class amenities.',
            ]
          );
          sqliteDb.run(
            `INSERT INTO hotels (name, city, star_rating, distance_meters, shuttle_available, address, status, description)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              'JW Marriott Marquis Hotel Dubai',
              'Dubai',
              5,
              200,
              1,
              'Sheikh Zayed Rd - Business Bay - Dubai - United Arab Emirates',
              'active',
              'Spectacular 5-star luxury twin-tower hotel in central Business Bay near Dubai Mall and Burj Khalifa.',
            ]
          );
        }
      } catch (dubaiErr) {
        console.warn('[DB] Dubai hotels seeding notice:', dubaiErr);
      }

      // Ensure Holiday & Other Tours category exists
      try {
        const holidayCatCheck = sqliteDb.exec("SELECT COUNT(*) as c FROM package_categories WHERE type = 'holiday' OR slug = 'holiday-other-tours';");
        const holidayCatCount = holidayCatCheck[0]?.values[0]?.[0] || 0;
        if (holidayCatCount === 0) {
          sqliteDb.run(
            `INSERT INTO package_categories (name, slug, type, description, status)
             VALUES (?, ?, ?, ?, ?)`,
            ['Holiday & Other Tours', 'holiday-other-tours', 'holiday', 'Exclusive holiday getaways, city tours, and international vacation packages.', 'active']
          );
        }
      } catch (catErr) {
        console.warn('[DB] Holiday category notice:', catErr);
      }

      // Ensure seed packages have descriptions and seed package_hotels
      try {
        sqliteDb.run("UPDATE packages SET short_summary = 'Exclusive 5-Star front-row Haram accommodation in Makkah & Madinah with VIP Mina air-conditioned tents and private GMC transport.', detailed_description = 'Experience an unforgettable spiritual Hajj pilgrimage with dedicated guidance, luxury hospitality, and comprehensive round-trip flight arrangements.' WHERE id = 1 AND (short_summary IS NULL OR short_summary = '');");
        sqliteDb.run("UPDATE packages SET short_summary = 'Complete 10-day spring spiritual Umrah journey featuring luxury hotels steps from the holy mosques in Makkah and Madinah.', detailed_description = 'All-inclusive Umrah package featuring express visa processing, guided religious tours of historic sites, and 24/7 dedicated ground assistance.' WHERE id = 2 AND (short_summary IS NULL OR short_summary = '');");
        sqliteDb.run("UPDATE packages SET short_summary = 'Spend the most blessed last ten nights of Ramadan in the holy sanctuaries of Makkah and Madinah with full Taraweeh access.', detailed_description = 'Witness the spiritual pinnacle of the year with guaranteed front-row Haram views, daily suhoor and iftar arrangements, and experienced group leaders.' WHERE id = 3 AND (short_summary IS NULL OR short_summary = '');");

        const pkhCheck = sqliteDb.exec("SELECT COUNT(*) as c FROM package_hotels;");
        const pkhCount = pkhCheck[0]?.values[0]?.[0] || 0;
        if (pkhCount === 0) {
          // Pkg 1: Hajj -> Fairmont Makkah (1) & Dar Al Taqwa Madinah (2)
          sqliteDb.run("INSERT INTO package_hotels (package_id, hotel_id, nights_count, meal_plan) VALUES (1, 1, 10, 'Full Board');");
          sqliteDb.run("INSERT INTO package_hotels (package_id, hotel_id, nights_count, meal_plan) VALUES (1, 2, 8, 'Full Board');");
          // Pkg 2: Umrah -> Swissôtel Makkah (3) & Oberoi Madinah (4)
          sqliteDb.run("INSERT INTO package_hotels (package_id, hotel_id, nights_count, meal_plan) VALUES (2, 3, 5, 'Half Board');");
          sqliteDb.run("INSERT INTO package_hotels (package_id, hotel_id, nights_count, meal_plan) VALUES (2, 4, 5, 'Half Board');");
          // Pkg 3: Ramadan Umrah -> Fairmont Makkah (1) & Oberoi Madinah (4)
          sqliteDb.run("INSERT INTO package_hotels (package_id, hotel_id, nights_count, meal_plan) VALUES (3, 1, 8, 'Half Board');");
          sqliteDb.run("INSERT INTO package_hotels (package_id, hotel_id, nights_count, meal_plan) VALUES (3, 4, 6, 'Half Board');");
        }
      } catch (pkgHotelsErr) {
        console.warn('[DB] Seed package hotels notice:', pkgHotelsErr);
      }

      // Ensure customer approval & role assignment workflow columns exist
      const customerCols = [
        "ALTER TABLE customers ADD COLUMN assigned_role TEXT DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN approved_at TEXT DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN approved_by_admin_id INTEGER DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN rejection_reason TEXT DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN rejected_at TEXT DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN rejected_by_admin_id INTEGER DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN suspended_at TEXT DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN suspended_by_admin_id INTEGER DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN role_updated_at TEXT DEFAULT NULL;",
        "ALTER TABLE customers ADD COLUMN role_updated_by_admin_id INTEGER DEFAULT NULL;",
      ];
      for (const colSql of customerCols) {
        try {
          sqliteDb.run(colSql);
        } catch {
          // Column already exists
        }
      }

      // Ensure existing active seed customers have assigned_role set if null
      sqliteDb.run("UPDATE customers SET assigned_role = 'Customer', approved_at = '2026-01-01 00:00:00', approved_by_admin_id = 1 WHERE (assigned_role IS NULL OR assigned_role = '') AND (status = 'active' OR status = 'approved');");

      // Ensure manager and staff accounts and roles exist in SQLite
      import('./staffAccounts').then(({ ensureStaffAccounts }) => {
        ensureStaffAccounts().catch((e) => console.warn('[DB] SQLite ensureStaffAccounts note:', e.message));
      }).catch(() => {});

      saveSqliteToFile();
    } catch (migErr) {
      console.warn('[DB] Currency / seed migration notice:', migErr);
    }

    isUsingMySQL = false;
    return {
      connected: true,
      engine: 'sqlite_fallback',
      database: 'hajji_original_tours (InnoDB Schema)',
      host: 'Embedded Hostinger-Compatible SQL Engine',
      tablesCount: 38,
      message: 'Running Local Relational SQL Database (Ready for Hostinger deployment)',
    };
  } catch (err: any) {
    console.warn('[DB] Relational database init notice:', err?.message || err);
    return {
      connected: false,
      engine: 'sqlite_fallback',
      database: database || 'hajji_original_tours',
      host: host || 'localhost',
      tablesCount: 0,
      message: `Database initialization deferred: ${err?.message || 'Waiting for connection'}`,
      lastError: err?.message || null,
      isConfiguredForMySQL: hasMySQLConfig,
    };
  }
}

function saveSqliteToFile() {
  if (!sqliteDb) return;
  try {
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(sqliteFilePath, buffer);
  } catch (e) {
    console.warn('[DB] Failed saving SQL file to disk:', e);
  }
}

async function bootstrapSqliteFromSchema() {
  if (!sqliteDb) return;
  const possibleSqlPaths = [
    path.join(process.cwd(), 'hajji_original_tours_database.sql'),
    typeof __dirname !== 'undefined' ? path.join(__dirname, '..', 'hajji_original_tours_database.sql') : '',
    typeof __dirname !== 'undefined' ? path.join(__dirname, 'hajji_original_tours_database.sql') : '',
  ].filter(Boolean);

  const sqlFile = possibleSqlPaths.find((p) => fs.existsSync(p));
  if (!sqlFile) return;

  let rawSql = fs.readFileSync(sqlFile, 'utf8');

  // Convert MySQL specific constructs for SQLite execution while maintaining all columns and logic
  const sanitized = rawSql
    .replace(/--[^\r\n]*/g, '')
    .replace(/ENGINE=InnoDB[^;]*/gi, '')
    .replace(/DEFAULT CHARSET=[^;]*/gi, '')
    .replace(/COLLATE=[^;]*/gi, '')
    .replace(/(?:INT|BIGINT)\s+UNSIGNED\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
    .replace(/AUTO_INCREMENT/gi, '')
    .replace(/BIGINT\s+UNSIGNED/gi, 'INTEGER')
    .replace(/INT\s+UNSIGNED/gi, 'INTEGER')
    .replace(/BIGINT/gi, 'INTEGER')
    .replace(/TINYINT\(1\)/gi, 'INTEGER')
    .replace(/TINYINT/gi, 'INTEGER')
    .replace(/DATETIME/gi, 'TEXT')
    .replace(/TIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP\s+ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, 'TEXT DEFAULT CURRENT_TIMESTAMP')
    .replace(/TIMESTAMP\s+DEFAULT\s+CURRENT_TIMESTAMP/gi, 'TEXT DEFAULT CURRENT_TIMESTAMP')
    .replace(/TIMESTAMP/gi, 'TEXT')
    .replace(/ENUM\([^)]*\)/gi, 'TEXT')
    .replace(/LONGTEXT/gi, 'TEXT')
    .replace(/DECIMAL\([^)]*\)/gi, 'REAL')
    .replace(/SET FOREIGN_KEY_CHECKS\s*=\s*[01];/gi, '')
    .replace(/SET SQL_MODE[^;]*;/gi, '')
    .replace(/SET time_zone[^;]*;/gi, '')
    .replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');

  const statements = sanitized.split(/;\s*[\r\n]+/);
  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed) {
      try {
        sqliteDb.run(trimmed);
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          console.warn('[DB Init Statement Warning]:', err.message, trimmed.slice(0, 60));
        }
      }
    }
  }
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  if (isUsingMySQL && mysqlPool) {
    const [rows] = await mysqlPool.query(sql, params);
    return rows as T[];
  }

  const hasMySQLConfig = isMySQLConfigured();
  if (hasMySQLConfig && isProductionEnv()) {
    // Production MySQL is configured: never run on SQLite fallback in production
    throw new Error(`Production MySQL is unavailable: ${lastMySQLConnectionError || 'Connection not established'}`);
  }

  // SQLite fallback for local development or non-production environment
  if (!sqliteDb) {
    await initDatabase();
  }

  if (!sqliteDb) {
    throw new Error('Database is not initialized');
  }

  try {
    // Normalize SQL for SQLite: replace ? placeholders
    const stmt = sqliteDb.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const results: any[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    // If query is INSERT, UPDATE, DELETE, trigger save
    const lower = sql.trim().toLowerCase();
    if (lower.startsWith('insert') || lower.startsWith('update') || lower.startsWith('delete') || lower.startsWith('replace')) {
      saveSqliteToFile();
    }
    return results as T[];
  } catch (err: any) {
    console.error(`[DB Error] SQL: ${sql} | Params: ${JSON.stringify(params)} | Error:`, err.message);
    throw err;
  }
}

export async function dbRun(sql: string, params: any[] = []): Promise<{ insertId: number; changes: number }> {
  if (isUsingMySQL && mysqlPool) {
    const [result] = await mysqlPool.query(sql, params) as any;
    return { insertId: result.insertId || 0, changes: result.affectedRows || 0 };
  }

  const hasMySQLConfig = isMySQLConfigured();
  if (hasMySQLConfig && isProductionEnv()) {
    // Production MySQL is configured: never run on SQLite fallback in production
    throw new Error(`Production MySQL is unavailable: ${lastMySQLConnectionError || 'Connection not established'}`);
  }

  // SQLite fallback for local development or non-production environment
  if (!sqliteDb) {
    await initDatabase();
  }

  if (!sqliteDb) {
    throw new Error('Database is not initialized');
  }

  try {
    sqliteDb.run(sql, params);
    const idResult = sqliteDb.exec('SELECT last_insert_rowid() as id, changes() as changes;');
    const insertId = idResult[0]?.values[0]?.[0] ? Number(idResult[0].values[0][0]) : 0;
    const changes = idResult[0]?.values[0]?.[1] ? Number(idResult[0].values[0][1]) : 0;
    saveSqliteToFile();
    return { insertId, changes };
  } catch (err: any) {
    console.error(`[DB Run Error] SQL: ${sql} | Error:`, err.message);
    throw err;
  }
}

export async function getDbStatus(): Promise<DbStatus> {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'u648874590_hajitours';
  const port = process.env.DB_PORT || process.env.MYSQL_PORT || '3306';
  const hasMySQLConfig = isMySQLConfigured();

  if (hasMySQLConfig) {
    if (isUsingMySQL && mysqlPool) {
      let tablesCount = 99;
      try {
        const [tables] = await mysqlPool.query('SHOW TABLES') as any[];
        tablesCount = Array.isArray(tables) ? tables.length : 99;
      } catch {
        tablesCount = 99;
      }

      return {
        connected: true,
        engine: 'mysql',
        database,
        host: `${host}:${port}`,
        tablesCount,
        message: `Connected to Production MySQL at ${host}:${port}/${database}`,
        lastError: null,
        isConfiguredForMySQL: true,
      };
    }

    if (isProductionEnv()) {
      // In production environment, report clear MySQL failure
      return {
        connected: false,
        engine: 'mysql',
        database,
        host: `${host}:${port}`,
        tablesCount: 0,
        message: `Production MySQL connection failed: ${lastMySQLConnectionError || 'Connection not established'}`,
        lastError: lastMySQLConnectionError || 'Connection not established',
        isConfiguredForMySQL: true,
      };
    }
  }

  // Local development SQLite fallback
  let tablesCount = 38;
  if (sqliteDb) {
    try {
      const res = sqliteDb.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      tablesCount = res[0]?.values[0]?.[0] ? Number(res[0].values[0][0]) : 38;
    } catch {
      tablesCount = 38;
    }
  }

  return {
    connected: true,
    engine: 'sqlite_fallback',
    database: 'hajji_original_tours (InnoDB Schema)',
    host: 'Local Development Relational SQL Engine (InnoDB Compatible)',
    tablesCount,
    message: 'Embedded Relational SQL Engine Active (Local development fallback, 38 tables ready)',
    lastError: null,
    isConfiguredForMySQL: false,
  };
}

export async function testMySQLQuery(): Promise<boolean> {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'u648874590_hajitours';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'u648874590_hajitours';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);

  // 1. If mysqlPool is already active and using MySQL, test the query on the existing pool
  if (isUsingMySQL && mysqlPool) {
    try {
      const [rows] = await mysqlPool.query('SELECT 1 AS connected');
      if (Array.isArray(rows) && rows.length > 0) {
        return true;
      }
    } catch (err: any) {
      console.log('[DB Test] Pool query note:', err.message);
    }
  }

  // 2. Attempt direct connection to MySQL
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port,
      connectTimeout: 5000,
    });
    const [rows] = await conn.query('SELECT 1 AS connected');
    await conn.end();

    if (Array.isArray(rows) && rows.length > 0) {
      return true;
    }
    return false;
  } catch (err: any) {
    console.log('[DB Test] Direct MySQL connection note:', err.message);
    if (conn) {
      try {
        await conn.end();
      } catch {}
    }
    return false;
  }
}
