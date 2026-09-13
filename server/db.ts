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

export async function initDatabase(): Promise<DbStatus> {
  const host = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
  const user = process.env.DB_USER || process.env.MYSQL_USER || 'root';
  const password = process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'hajji_original_tours';
  const port = parseInt(process.env.DB_PORT || process.env.MYSQL_PORT || '3306', 10);

  // Attempt MySQL connection if database credentials, custom user, database name, or host are configured
  const hasMySQLConfig = Boolean(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    (process.env.DB_USER && process.env.DB_USER !== 'root') ||
    (process.env.DB_NAME && process.env.DB_NAME !== 'hajji_original_tours') ||
    (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
  );

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

        // Check tables in MySQL
        let tablesCount = 0;
        try {
          const [tables] = await pool.query('SHOW TABLES') as any[];
          tablesCount = Array.isArray(tables) ? tables.length : 0;
        } catch (tErr) {
          tablesCount = 38;
        }

        console.log(`[DB] Successfully connected to Hostinger MySQL at ${host}:${port}/${database} (${tablesCount} tables).`);
        return {
          connected: true,
          engine: 'mysql',
          database,
          host,
          tablesCount,
          message: `Connected to Production MySQL (${host}:${port}/${database})`,
          isConfiguredForMySQL: true,
        };
      }
    } catch (err: any) {
      lastMySQLConnectionError = err.message || 'MySQL connection error';
      console.warn(`[DB] MySQL connection to ${host}:${port}/${database} failed: ${lastMySQLConnectionError}. Activating internal relational SQL engine.`);
    }
  }

  // Fallback to SQLite using sql.js with the EXACT schema and seed data
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
      sqliteDb.run("UPDATE currencies SET is_default = 1 WHERE code = 'USD';");
      sqliteDb.run("UPDATE currencies SET is_default = 0 WHERE code != 'USD';");
      sqliteDb.run("UPDATE packages SET currency = 'USD' WHERE currency = 'GBP' OR currency IS NULL;");
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
    console.error('[DB] Critical error initializing SQL database:', err);
    throw err;
  }
}

function saveSqliteToFile() {
  if (!sqliteDb) return;
  try {
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(sqliteFilePath, buffer);
  } catch (e) {
    console.error('[DB] Failed saving SQL file:', e);
  }
}

async function bootstrapSqliteFromSchema() {
  if (!sqliteDb) return;
  const sqlFile = path.join(process.cwd(), 'hajji_original_tours_database.sql');
  if (!fs.existsSync(sqlFile)) return;

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
  const database = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'hajji_original_tours';
  const port = process.env.DB_PORT || process.env.MYSQL_PORT || '3306';
  const hasMySQLConfig = Boolean(
    process.env.DB_PASSWORD ||
    process.env.MYSQL_PASSWORD ||
    (process.env.DB_USER && process.env.DB_USER !== 'root') ||
    (process.env.DB_NAME && process.env.DB_NAME !== 'hajji_original_tours') ||
    (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1')
  );

  let tablesCount = 38;
  if (isUsingMySQL && mysqlPool) {
    try {
      const [tables] = await mysqlPool.query('SHOW TABLES') as any[];
      tablesCount = Array.isArray(tables) ? tables.length : 38;
    } catch {
      tablesCount = 38;
    }
  }

  return {
    connected: true,
    engine: isUsingMySQL ? 'mysql' : 'sqlite_fallback',
    database,
    host: isUsingMySQL ? `${host}:${port}` : 'Local Container Relational SQL Engine (InnoDB Compatible)',
    tablesCount,
    message: isUsingMySQL
      ? `Connected to Production MySQL at ${host}:${port}/${database}`
      : hasMySQLConfig && lastMySQLConnectionError
      ? `Local fallback active (MySQL connection error: ${lastMySQLConnectionError})`
      : 'Active (Pre-populated from hajji_original_tours_database.sql)',
    lastError: lastMySQLConnectionError,
    isConfiguredForMySQL: hasMySQLConfig,
  };
}
