import { app, BrowserWindow, ipcMain, dialog, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, dbOperations } from './db';

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;
let reminderInterval: NodeJS.Timeout | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
  });

  // Load the app
  if (isDev) {
    // Retry loading Vite server in case it is starting up
    const loadDevServer = async (attempts = 15) => {
      try {
        await mainWindow?.loadURL('http://localhost:5173');
      } catch (err) {
        if (attempts > 0) {
          setTimeout(() => loadDevServer(attempts - 1), 1000);
        } else {
          console.error('Failed to connect to Vite dev server', err);
        }
      }
    };
    loadDevServer();
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup background reminder checks
function startReminderService() {
  if (reminderInterval) clearInterval(reminderInterval);
  
  reminderInterval = setInterval(() => {
    try {
      const settings = dbOperations.getSettings();
      const enabled = settings['remindersEnabled'] === 'true';
      if (!enabled) return;

      const reminderTime = settings['reminderTime'] || '20:00'; // HH:MM
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Trigger notification at exact HH:MM and seconds < 60
      if (currentHHMM === reminderTime) {
        // Double check we only notify once per day
        const todayStr = now.toISOString().split('T')[0];
        const lastRemindedKey = `lastNotificationDate`;
        const lastDate = settings[lastRemindedKey];

        if (lastDate !== todayStr) {
          dbOperations.updateSetting(lastRemindedKey, todayStr);
          
          new Notification({
            title: 'ProTrack Reminder',
            body: "Don't forget to log your productivity for today!",
            silent: false
          }).show();
        }
      }
    } catch (err) {
      console.error('Reminder service error:', err);
    }
  }, 30000); // Check every 30 seconds
}

app.whenReady().then(async () => {
  // Initialize Database
  await initDatabase(app.getPath('userData'));
  
  createWindow();
  startReminderService();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Register IPC handlers
ipcMain.handle('db:getSettings', () => {
  return dbOperations.getSettings();
});

ipcMain.handle('db:updateSetting', (_, key: string, value: string) => {
  dbOperations.updateSetting(key, value);
  return true;
});

ipcMain.handle('db:getDayLogs', (_, date: string) => {
  return dbOperations.getDayLogs(date);
});

ipcMain.handle('db:saveDayLogs', (_, date: string, notes: string, logs: any[]) => {
  dbOperations.saveDayLogs(date, notes, logs);
  return true;
});

ipcMain.handle('db:getAllTimeData', () => {
  return dbOperations.getAllTimeData();
});

ipcMain.handle('db:getActivityFrequencies', (_, year: number) => {
  return dbOperations.getActivityFrequencies(year);
});

ipcMain.handle('db:clearAllData', (_, year: number) => {
  dbOperations.clearAllData(year);
  return true;
});

ipcMain.handle('db:exportCsv', async () => {
  if (!mainWindow) return null;
  
  const allData = dbOperations.getAllTimeData();
  const settings = dbOperations.getSettings();
  
  // Create CSV Header
  const headers = ['Date', 'Weekday', 'Score', 'Section A', 'Section B', 'Section C', 'Section D', 'Notes'];
  const rows = allData.map((day: any) => {
    const d = new Date(day.date);
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    // Escape notes field for CSV
    const escapedNotes = (day.notes || '').replace(/"/g, '""');
    return [
      day.date,
      weekday,
      day.score,
      day.sectionA,
      day.sectionB,
      day.sectionC,
      day.sectionD,
      `"${escapedNotes}"`
    ];
  });
  
  const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');

  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export CSV Data',
    defaultPath: path.join(app.getPath('documents'), 'protrack-export.csv'),
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, csvContent, 'utf-8');
    return true;
  }
  return false;
});

ipcMain.handle('db:importCsv', async (_, csvContent: string) => {
  try {
    const lines = csvContent.split('\n');
    if (lines.length < 2) throw new Error('Empty CSV file');

    // Simple CSV parser
    const parsedRows: any[] = [];
    const headers = lines[0].split(',').map(h => h.trim());

    // We expect headers: Date, Weekday, Score, Section A, Section B, Section C, Section D, Notes
    const dateIdx = headers.indexOf('Date');
    const notesIdx = headers.indexOf('Notes');
    
    if (dateIdx === -1) throw new Error("CSV must contain a 'Date' column");

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle comma inside quotes for notes
      const columns: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      columns.push(currentVal.trim());

      const dateStr = columns[dateIdx];
      if (!dateStr) continue;

      // Ensure valid ISO date YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) continue;

      let notes = '';
      if (notesIdx !== -1 && columns[notesIdx]) {
        notes = columns[notesIdx].replace(/^"|"$/g, '').replace(/""/g, '"');
      }

      // We'll import counts by saving activities back.
      // Since standard CSV export only has aggregates, if it's imported we'll write notes and empty activity logs,
      // or we can structure import to parse activities if they exist.
      // For compatibility, if the CSV contains granular activities (or just aggregates),
      // we'll store notes and rebuild empty logs, or write a flexible structure.
      // Let's implement full parsing for granular import if they have activities columns.
      const logs: Record<string, { count: number, points: number }> = {};
      
      // Look for columns containing activity keys
      headers.forEach((h, idx) => {
        if (h.startsWith('act:')) {
          const key = h.substring(4);
          const count = parseInt(columns[idx]) || 0;
          logs[key] = { count, points: 0 }; // We'll recalculate points in DB or accept them
        }
      });

      parsedRows.push({
        date: dateStr,
        notes,
        logs
      });
    }

    dbOperations.importCsvData(parsedRows);
    return true;
  } catch (err: any) {
    console.error('Import error:', err);
    throw new Error(`Failed to parse CSV: ${err.message}`);
  }
});

ipcMain.handle('db:backup', async (_, destFolder: string) => {
  try {
    const backupBase64 = dbOperations.getRawBackup();
    const destPath = path.join(destFolder, `protrack-backup-${new Date().toISOString().split('T')[0]}.json`);
    const backupJson = JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      database: backupBase64
    }, null, 2);

    fs.writeFileSync(destPath, backupJson, 'utf-8');
    return destPath;
  } catch (err: any) {
    throw new Error(`Backup failed: ${err.message}`);
  }
});

ipcMain.handle('db:restore', async (_, filePath: string) => {
  try {
    const jsonStr = fs.readFileSync(filePath, 'utf-8');
    const backup = JSON.parse(jsonStr);
    if (!backup.database) throw new Error('Invalid backup file structure');
    
    dbOperations.restoreBackup(backup.database);
    return true;
  } catch (err: any) {
    throw new Error(`Restore failed: ${err.message}`);
  }
});

ipcMain.handle('dialog:selectFolder', async () => {
  if (!mainWindow) return null;
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  return filePaths[0] || null;
});

ipcMain.handle('dialog:selectFile', async () => {
  if (!mainWindow) return null;
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Backups', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });
  return filePaths[0] || null;
});
