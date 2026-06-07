import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSetting: (key: string, value: string) => ipcRenderer.invoke('db:updateSetting', key, value),
  getDayLogs: (date: string) => ipcRenderer.invoke('db:getDayLogs', date),
  saveDayLogs: (date: string, notes: string, logs: any[]) => ipcRenderer.invoke('db:saveDayLogs', date, notes, logs),
  getAllTimeData: () => ipcRenderer.invoke('db:getAllTimeData'),
  getActivityFrequencies: (year: number) => ipcRenderer.invoke('db:getActivityFrequencies', year),
  clearAllData: (year: number) => ipcRenderer.invoke('db:clearAllData', year),
  importCsv: (csvContent: string) => ipcRenderer.invoke('db:importCsv', csvContent),
  exportCsv: () => ipcRenderer.invoke('db:exportCsv'),
  backupDb: (destFolder: string) => ipcRenderer.invoke('db:backup', destFolder),
  restoreDb: (filePath: string) => ipcRenderer.invoke('db:restore', filePath),
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: () => ipcRenderer.invoke('dialog:selectFile'),
  
  // Theme and window notifications
  onThemeChanged: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme-changed', (_, theme) => callback(theme));
  },

  // Listen to keyboard shortcut triggers from main process
  onShortcut: (action: string, callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on(`shortcut:${action}`, listener);
    return () => {
      ipcRenderer.removeListener(`shortcut:${action}`, listener);
    };
  }
});
