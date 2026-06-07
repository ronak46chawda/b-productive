"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    getSettings: () => electron_1.ipcRenderer.invoke('db:getSettings'),
    updateSetting: (key, value) => electron_1.ipcRenderer.invoke('db:updateSetting', key, value),
    getDayLogs: (date) => electron_1.ipcRenderer.invoke('db:getDayLogs', date),
    saveDayLogs: (date, notes, logs) => electron_1.ipcRenderer.invoke('db:saveDayLogs', date, notes, logs),
    getAllTimeData: () => electron_1.ipcRenderer.invoke('db:getAllTimeData'),
    getActivityFrequencies: (year) => electron_1.ipcRenderer.invoke('db:getActivityFrequencies', year),
    clearAllData: (year) => electron_1.ipcRenderer.invoke('db:clearAllData', year),
    importCsv: (csvContent) => electron_1.ipcRenderer.invoke('db:importCsv', csvContent),
    exportCsv: () => electron_1.ipcRenderer.invoke('db:exportCsv'),
    backupDb: (destFolder) => electron_1.ipcRenderer.invoke('db:backup', destFolder),
    restoreDb: (filePath) => electron_1.ipcRenderer.invoke('db:restore', filePath),
    selectFolder: () => electron_1.ipcRenderer.invoke('dialog:selectFolder'),
    selectFile: () => electron_1.ipcRenderer.invoke('dialog:selectFile'),
    // Theme and window notifications
    onThemeChanged: (callback) => {
        electron_1.ipcRenderer.on('theme-changed', (_, theme) => callback(theme));
    },
    // Listen to keyboard shortcut triggers from main process
    onShortcut: (action, callback) => {
        const listener = () => callback();
        electron_1.ipcRenderer.on(`shortcut:${action}`, listener);
        return () => {
            electron_1.ipcRenderer.removeListener(`shortcut:${action}`, listener);
        };
    }
});
