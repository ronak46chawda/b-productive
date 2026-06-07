"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("./db");
const isDev = !electron_1.app.isPackaged;
let mainWindow = null;
let reminderInterval = null;
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1100,
        minHeight: 700,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
            }
            catch (err) {
                if (attempts > 0) {
                    setTimeout(() => loadDevServer(attempts - 1), 1000);
                }
                else {
                    console.error('Failed to connect to Vite dev server', err);
                }
            }
        };
        loadDevServer();
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '..', 'dist', 'index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// Setup background reminder checks
function startReminderService() {
    if (reminderInterval)
        clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
        try {
            const settings = db_1.dbOperations.getSettings();
            const enabled = settings['remindersEnabled'] === 'true';
            if (!enabled)
                return;
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
                    db_1.dbOperations.updateSetting(lastRemindedKey, todayStr);
                    new electron_1.Notification({
                        title: 'ProTrack Reminder',
                        body: "Don't forget to log your productivity for today!",
                        silent: false
                    }).show();
                }
            }
        }
        catch (err) {
            console.error('Reminder service error:', err);
        }
    }, 30000); // Check every 30 seconds
}
electron_1.app.whenReady().then(async () => {
    // Initialize Database
    await (0, db_1.initDatabase)(electron_1.app.getPath('userData'));
    createWindow();
    startReminderService();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Register IPC handlers
electron_1.ipcMain.handle('db:getSettings', () => {
    return db_1.dbOperations.getSettings();
});
electron_1.ipcMain.handle('db:updateSetting', (_, key, value) => {
    db_1.dbOperations.updateSetting(key, value);
    return true;
});
electron_1.ipcMain.handle('db:getDayLogs', (_, date) => {
    return db_1.dbOperations.getDayLogs(date);
});
electron_1.ipcMain.handle('db:saveDayLogs', (_, date, notes, logs) => {
    db_1.dbOperations.saveDayLogs(date, notes, logs);
    return true;
});
electron_1.ipcMain.handle('db:getAllTimeData', () => {
    return db_1.dbOperations.getAllTimeData();
});
electron_1.ipcMain.handle('db:getActivityFrequencies', (_, year) => {
    return db_1.dbOperations.getActivityFrequencies(year);
});
electron_1.ipcMain.handle('db:clearAllData', (_, year) => {
    db_1.dbOperations.clearAllData(year);
    return true;
});
electron_1.ipcMain.handle('db:exportCsv', async () => {
    if (!mainWindow)
        return null;
    const allData = db_1.dbOperations.getAllTimeData();
    const settings = db_1.dbOperations.getSettings();
    // Create CSV Header
    const headers = ['Date', 'Weekday', 'Score', 'Section A', 'Section B', 'Section C', 'Section D', 'Notes'];
    const rows = allData.map(day => {
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
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const { filePath } = await electron_1.dialog.showSaveDialog(mainWindow, {
        title: 'Export CSV Data',
        defaultPath: path_1.default.join(electron_1.app.getPath('documents'), 'protrack-export.csv'),
        filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (filePath) {
        fs_1.default.writeFileSync(filePath, csvContent, 'utf-8');
        return true;
    }
    return false;
});
electron_1.ipcMain.handle('db:importCsv', async (_, csvContent) => {
    try {
        const lines = csvContent.split('\n');
        if (lines.length < 2)
            throw new Error('Empty CSV file');
        // Simple CSV parser
        const parsedRows = [];
        const headers = lines[0].split(',').map(h => h.trim());
        // We expect headers: Date, Weekday, Score, Section A, Section B, Section C, Section D, Notes
        const dateIdx = headers.indexOf('Date');
        const notesIdx = headers.indexOf('Notes');
        if (dateIdx === -1)
            throw new Error("CSV must contain a 'Date' column");
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            // Handle comma inside quotes for notes
            const columns = [];
            let currentVal = '';
            let inQuotes = false;
            for (let c = 0; c < line.length; c++) {
                const char = line[c];
                if (char === '"') {
                    inQuotes = !inQuotes;
                }
                else if (char === ',' && !inQuotes) {
                    columns.push(currentVal.trim());
                    currentVal = '';
                }
                else {
                    currentVal += char;
                }
            }
            columns.push(currentVal.trim());
            const dateStr = columns[dateIdx];
            if (!dateStr)
                continue;
            // Ensure valid ISO date YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateStr))
                continue;
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
            const logs = {};
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
        db_1.dbOperations.importCsvData(parsedRows);
        return true;
    }
    catch (err) {
        console.error('Import error:', err);
        throw new Error(`Failed to parse CSV: ${err.message}`);
    }
});
electron_1.ipcMain.handle('db:backup', async (_, destFolder) => {
    try {
        const backupBase64 = db_1.dbOperations.getRawBackup();
        const destPath = path_1.default.join(destFolder, `protrack-backup-${new Date().toISOString().split('T')[0]}.json`);
        const backupJson = JSON.stringify({
            version: '1.0',
            timestamp: new Date().toISOString(),
            database: backupBase64
        }, null, 2);
        fs_1.default.writeFileSync(destPath, backupJson, 'utf-8');
        return destPath;
    }
    catch (err) {
        throw new Error(`Backup failed: ${err.message}`);
    }
});
electron_1.ipcMain.handle('db:restore', async (_, filePath) => {
    try {
        const jsonStr = fs_1.default.readFileSync(filePath, 'utf-8');
        const backup = JSON.parse(jsonStr);
        if (!backup.database)
            throw new Error('Invalid backup file structure');
        db_1.dbOperations.restoreBackup(backup.database);
        return true;
    }
    catch (err) {
        throw new Error(`Restore failed: ${err.message}`);
    }
});
electron_1.ipcMain.handle('dialog:selectFolder', async () => {
    if (!mainWindow)
        return null;
    const { filePaths } = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    return filePaths[0] || null;
});
electron_1.ipcMain.handle('dialog:selectFile', async () => {
    if (!mainWindow)
        return null;
    const { filePaths } = await electron_1.dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'JSON Backups', extensions: ['json'] },
            { name: 'CSV Files', extensions: ['csv'] }
        ]
    });
    return filePaths[0] || null;
});
