export {};

declare global {
  interface Window {
    api: {
      getSettings: () => Promise<Record<string, string>>;
      updateSetting: (key: string, value: string) => Promise<boolean>;
      getDayLogs: (date: string) => Promise<{
        id: number;
        date: string;
        notes: string;
        logs: Array<{ activityKey: string; count: number; pointsEarned: number }>;
      }>;
      saveDayLogs: (date: string, notes: string, logs: any[]) => Promise<boolean>;
      getAllTimeData: () => Promise<
        Array<{
          id: number;
          date: string;
          notes: string;
          score: number;
          sectionA: number;
          sectionB: number;
          sectionC: number;
          sectionD: number;
        }>
      >;
      getActivityFrequencies: (year: number) => Promise<
        Array<{ activityKey: string; count: number; points: number }>
      >;
      clearAllData: (year: number) => Promise<boolean>;
      importCsv: (csvContent: string) => Promise<boolean>;
      exportCsv: () => Promise<boolean>;
      backupDb: (destFolder: string) => Promise<string>;
      restoreDb: (filePath: string) => Promise<boolean>;
      selectFolder: () => Promise<string | null>;
      selectFile: () => Promise<string | null>;
      onThemeChanged: (callback: (theme: string) => void) => void;
      onShortcut: (action: string, callback: () => void) => () => void;
    };
  }
}
