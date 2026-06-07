import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

let dbInstance: any = null;
let dbFilePath: string = '';
let saveTimeout: NodeJS.Timeout | null = null;
let SQL: any = null;

// Initialize SQL.js and load/create database
export async function initDatabase(userDataPath: string) {
  if (dbInstance) return dbInstance;

  // Resolve DB file path
  const dbDir = path.join(userDataPath, 'ProTrack');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  dbFilePath = path.join(dbDir, 'protrack.db');

  // Load WASM file
  // In development, the WASM file is in node_modules/sql.js/dist/
  // In production, we'll want to locate it. We'll handle both.
  let wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  if (!fs.existsSync(wasmPath)) {
    // If running from dist-electron in production
    wasmPath = path.join(__dirname, 'sql-wasm.wasm');
  }
  if (!fs.existsSync(wasmPath)) {
    // Fallback search in parents
    wasmPath = path.resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
  }

  const wasmBinary = fs.readFileSync(wasmPath);
  SQL = await initSqlJs({ wasmBinary: wasmBinary as any });

  if (fs.existsSync(dbFilePath)) {
    const fileBuffer = fs.readFileSync(dbFilePath);
    dbInstance = new SQL.Database(new Uint8Array(fileBuffer));
  } else {
    dbInstance = new SQL.Database();
    createTables(dbInstance);
    // Auto-prepopulate current year
    prepopulateYear(dbInstance, new Date().getFullYear());
    saveDatabaseSync();
  }

  return dbInstance;
}

function createTables(db: any) {
  db.run(`
    CREATE TABLE IF NOT EXISTS days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id INTEGER NOT NULL,
      activity_key TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      points_earned INTEGER DEFAULT 0,
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE,
      UNIQUE(day_id, activity_key)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Insert default settings
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('userName', 'Adviser');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('year', '2026');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('dailyTarget', '70');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'system');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('accent', 'blue');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('fontSize', 'normal');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('reminderTime', '20:00');`);
  db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('remindersEnabled', 'true');`);
  
  // Custom points settings
  const defaultPoints: Record<string, number> = {
    // Section A
    'client_meeting_new': 5,
    'client_meeting_review': 3,
    'client_connect': 2,
    'client_followup': 2,
    'client_onboarding': 10,
    // Section B
    'bizdev_plan': 15,
    'bizdev_awareness': 10,
    'bizdev_sip': 10,
    'bizdev_cross_sell': 5,
    'bizdev_lead_gen': 2,
    // Section C
    'learn_reading': 5,
    'learn_certification': 5,
    'learn_research': 5,
    'learn_training': 5,
    // Section D
    'digital_post': 1,
    'digital_broadcast': 2,
    'digital_reviews': 2,
    'digital_web_update': 2,
    'digital_team_player': 2,
    'digital_new_cert': 5
  };

  for (const [key, value] of Object.entries(defaultPoints)) {
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?);`, [`points:${key}`, value.toString()]);
  }
}

// Prepopulate the days table for a given year
export function prepopulateYear(db: any, year: number) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  db.run('BEGIN TRANSACTION;');
  try {
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateString = d.toISOString().split('T')[0];
      db.run(`INSERT OR IGNORE INTO days (date, notes) VALUES (?, '');`, [dateString]);
    }
    db.run('COMMIT;');
  } catch (e) {
    db.run('ROLLBACK;');
    throw e;
  }
}

// Synchronously save database to disk
function saveDatabaseSync() {
  if (!dbInstance || !dbFilePath) return;
  const binaryData = dbInstance.export();
  const buffer = Buffer.from(binaryData);
  fs.writeFileSync(dbFilePath, buffer);
}

// Debounced save to prevent excessive disk writes
export function triggerSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabaseSync();
    saveTimeout = null;
  }, 500);
}

// DB Operations wrapper
export const dbOperations = {
  getSettings: () => {
    const res = dbInstance.exec(`SELECT key, value FROM settings;`);
    if (!res || res.length === 0) return {};
    const settings: Record<string, string> = {};
    for (const row of res[0].values) {
      settings[row[0]] = row[1];
    }
    return settings;
  },

  updateSetting: (key: string, value: string) => {
    dbInstance.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);`, [key, value]);
    triggerSave();
  },

  getDayLogs: (date: string) => {
    // Get day entry
    const dayRes = dbInstance.exec(`SELECT id, notes FROM days WHERE date = ?;`, [date]);
    if (!dayRes || dayRes.length === 0 || dayRes[0].values.length === 0) {
      // Create day on the fly if it doesn't exist
      dbInstance.run(`INSERT OR IGNORE INTO days (date, notes) VALUES (?, '');`, [date]);
      triggerSave();
      const newDay = dbInstance.exec(`SELECT id, notes FROM days WHERE date = ?;`, [date]);
      return { id: newDay[0].values[0][0], date, notes: '', logs: [] };
    }

    const dayId = dayRes[0].values[0][0];
    const notes = dayRes[0].values[0][1];

    // Get activity logs
    const logsRes = dbInstance.exec(`
      SELECT activity_key, count, points_earned 
      FROM activity_logs 
      WHERE day_id = ?;
    `, [dayId]);

    const logs: any[] = [];
    if (logsRes && logsRes.length > 0) {
      for (const row of logsRes[0].values) {
        logs.push({
          activityKey: row[0],
          count: row[1],
          pointsEarned: row[2]
        });
      }
    }

    return { id: dayId, date, notes, logs };
  },

  saveDayLogs: (date: string, notes: string, logs: Array<{ activityKey: string, count: number, pointsEarned: number }>) => {
    // Get day ID
    let dayRes = dbInstance.exec(`SELECT id FROM days WHERE date = ?;`, [date]);
    let dayId: number;
    if (!dayRes || dayRes.length === 0 || dayRes[0].values.length === 0) {
      dbInstance.run(`INSERT INTO days (date, notes) VALUES (?, ?);`, [date, notes]);
      dayRes = dbInstance.exec(`SELECT id FROM days WHERE date = ?;`, [date]);
      dayId = dayRes[0].values[0][0];
    } else {
      dayId = dayRes[0].values[0][0];
      dbInstance.run(`UPDATE days SET notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;`, [notes, dayId]);
    }

    // Save logs
    dbInstance.run('BEGIN TRANSACTION;');
    try {
      dbInstance.run(`DELETE FROM activity_logs WHERE day_id = ?;`, [dayId]);
      for (const log of logs) {
        if (log.count > 0) {
          dbInstance.run(`
            INSERT INTO activity_logs (day_id, activity_key, count, points_earned) 
            VALUES (?, ?, ?, ?);
          `, [dayId, log.activityKey, log.count, log.pointsEarned]);
        }
      }
      dbInstance.run('COMMIT;');
    } catch (e) {
      dbInstance.run('ROLLBACK;');
      throw e;
    }

    triggerSave();
  },

  getAllTimeData: () => {
    // Select all days and aggregate points
    const res = dbInstance.exec(`
      SELECT d.id, d.date, d.notes, 
             IFNULL(SUM(a.points_earned), 0) as total_points,
             SUM(CASE WHEN a.activity_key LIKE 'client%' THEN a.points_earned ELSE 0 END) as sec_a,
             SUM(CASE WHEN a.activity_key LIKE 'bizdev%' THEN a.points_earned ELSE 0 END) as sec_b,
             SUM(CASE WHEN a.activity_key LIKE 'learn%' THEN a.points_earned ELSE 0 END) as sec_c,
             SUM(CASE WHEN a.activity_key LIKE 'digital%' THEN a.points_earned ELSE 0 END) as sec_d
      FROM days d
      LEFT JOIN activity_logs a ON d.id = a.day_id
      GROUP BY d.id
      ORDER BY d.date ASC;
    `);

    if (!res || res.length === 0) return [];
    
    return res[0].values.map((row: any) => ({
      id: row[0],
      date: row[1],
      notes: row[2],
      score: row[3],
      sectionA: row[4],
      sectionB: row[5],
      sectionC: row[6],
      sectionD: row[7]
    }));
  },

  getActivityFrequencies: (year: number) => {
    const res = dbInstance.exec(`
      SELECT al.activity_key, SUM(al.count) as total_count, SUM(al.points_earned) as total_points
      FROM activity_logs al
      JOIN days d ON al.day_id = d.id
      WHERE d.date LIKE ?
      GROUP BY al.activity_key;
    `, [`${year}%`]);

    if (!res || res.length === 0) return [];
    return res[0].values.map((row: any) => ({
      activityKey: row[0],
      count: row[1],
      points: row[2]
    }));
  },

  clearAllData: (year: number) => {
    dbInstance.run(`DELETE FROM activity_logs;`);
    dbInstance.run(`DELETE FROM days;`);
    prepopulateYear(dbInstance, year);
    triggerSave();
  },

  importCsvData: (rows: Array<{ date: string, notes: string, logs: Record<string, { count: number, points: number }> }>) => {
    dbInstance.run('BEGIN TRANSACTION;');
    try {
      for (const row of rows) {
        // Find or create day
        let dayRes = dbInstance.exec(`SELECT id FROM days WHERE date = ?;`, [row.date]);
        let dayId: number;
        if (!dayRes || dayRes.length === 0 || dayRes[0].values.length === 0) {
          dbInstance.run(`INSERT INTO days (date, notes) VALUES (?, ?);`, [row.date, row.notes]);
          dayRes = dbInstance.exec(`SELECT id FROM days WHERE date = ?;`, [row.date]);
          dayId = dayRes[0].values[0][0];
        } else {
          dayId = dayRes[0].values[0][0];
          dbInstance.run(`UPDATE days SET notes = ? WHERE id = ?;`, [row.notes, dayId]);
        }

        // Write activity logs
        dbInstance.run(`DELETE FROM activity_logs WHERE day_id = ?;`, [dayId]);
        for (const [key, details] of Object.entries(row.logs)) {
          if (details.count > 0) {
            dbInstance.run(`
              INSERT INTO activity_logs (day_id, activity_key, count, points_earned) 
              VALUES (?, ?, ?, ?);
            `, [dayId, key, details.count, details.points]);
          }
        }
      }
      dbInstance.run('COMMIT;');
    } catch (e) {
      dbInstance.run('ROLLBACK;');
      throw e;
    }
    triggerSave();
  },

  getRawBackup: () => {
    const binaryData = dbInstance.export();
    return Buffer.from(binaryData).toString('base64');
  },

  restoreBackup: (base64Data: string) => {
    const buffer = Buffer.from(base64Data, 'base64');
    dbInstance = new SQL.Database(buffer);
    triggerSave();
  }
};
