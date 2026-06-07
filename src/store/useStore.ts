import { create } from 'zustand';

export interface ActivityDefinition {
  key: string;
  name: string;
  description: string;
  defaultPoints: number;
  section: 'A' | 'B' | 'C' | 'D';
  isBinary?: boolean;
}

export const ACTIVITIES: ActivityDefinition[] = [
  // Section A
  { key: 'client_meeting_new', name: 'New Client Meeting', description: 'Face-to-face or virtual prospect meeting', defaultPoints: 5, section: 'A' },
  { key: 'client_meeting_review', name: 'Client Review Meeting', description: 'Portfolio review with existing client', defaultPoints: 3, section: 'A' },
  { key: 'client_connect', name: 'Client Reference / Connect', description: 'Referral received or connection made', defaultPoints: 2, section: 'A' },
  { key: 'client_followup', name: 'Client Follow-Up Call', description: 'Systematic follow-up on prospect/lead', defaultPoints: 2, section: 'A' },
  { key: 'client_onboarding', name: 'Client Onboarding', description: 'New account opening / KYC completion', defaultPoints: 10, section: 'A' },
  // Section B
  { key: 'bizdev_plan', name: 'Financial Plan Writing', description: 'Complete financial plan for a client', defaultPoints: 15, section: 'B' },
  { key: 'bizdev_awareness', name: 'Investor Awareness Program', description: 'Seminar/webinar organised or attended', defaultPoints: 10, section: 'B' },
  { key: 'bizdev_sip', name: 'SIP Book Addition', description: 'New SIP registered — 10% of monthly AUM target', defaultPoints: 10, section: 'B' },
  { key: 'bizdev_cross_sell', name: 'Cross-Sell Product', description: 'MF / LI / GI / FD / Bonds / HI sold', defaultPoints: 5, section: 'B' },
  { key: 'bizdev_lead_gen', name: 'Lead Generation', description: 'New prospect identified and recorded', defaultPoints: 2, section: 'B' },
  // Section C
  { key: 'learn_reading', name: 'Reading / Self-Learning', description: 'Min 1 hr financial/industry reading', defaultPoints: 5, section: 'C' },
  { key: 'learn_certification', name: 'Certification Progress', description: 'Study session for NISM / CFP / other', defaultPoints: 5, section: 'C' },
  { key: 'learn_research', name: 'Market Research', description: 'Macro/sector research done', defaultPoints: 5, section: 'C' },
  { key: 'learn_training', name: 'Team / Peer Training', description: 'Internal knowledge-sharing session', defaultPoints: 5, section: 'C', isBinary: true },
  // Section D
  { key: 'digital_post', name: 'LinkedIn / Social Post', description: 'Post/article published on any platform', defaultPoints: 1, section: 'D' },
  { key: 'digital_broadcast', name: 'WhatsApp Broadcast', description: 'Client-value broadcast sent', defaultPoints: 2, section: 'D' },
  { key: 'digital_reviews', name: 'Google Maps / Reviews', description: 'Update listing or respond to review', defaultPoints: 2, section: 'D' },
  { key: 'digital_web_update', name: 'Website Content Update', description: 'Blog, testimonial or page updated', defaultPoints: 2, section: 'D' },
  { key: 'digital_team_player', name: 'Team Player', description: 'Teach something new to a junior', defaultPoints: 2, section: 'D', isBinary: true },
  { key: 'digital_new_cert', name: 'New Certification', description: 'Got a new certification', defaultPoints: 5, section: 'D', isBinary: true }
];

export interface DayLog {
  activityKey: string;
  count: number;
  pointsEarned: number;
}

export interface StoreState {
  // Screen Router
  activeScreen: 'dashboard' | 'daily-log' | 'calendar' | 'analytics' | 'history' | 'settings';
  setActiveScreen: (screen: StoreState['activeScreen']) => void;

  // Settings
  settings: Record<string, string>;
  loadSettings: () => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
  getPoints: (key: string) => number;
  getName: (key: string) => string;
  getDescription: (key: string) => string;

  // Selected Date state
  activeDate: string;
  activeNotes: string;
  activeLogs: Record<string, number>;
  setActiveDate: (date: string) => Promise<void>;
  updateActivityCount: (key: string, count: number) => void;
  updateNotes: (notes: string) => void;
  saveCurrentDay: () => Promise<void>;

  // Aggregated data
  allTimeDays: Array<{
    id: number;
    date: string;
    notes: string;
    score: number;
    sectionA: number;
    sectionB: number;
    sectionC: number;
    sectionD: number;
  }>;
  loadAllTimeData: () => Promise<void>;

  // Streak Information
  currentStreak: number;

  // Onboarding
  onboarded: boolean;
  setOnboarded: (val: boolean) => void;
}

// Helper to determine status by score
export function getScoreStatus(score: number): 'excellent' | 'productive' | 'average' | 'poor' {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'productive';
  if (score >= 50) return 'average';
  return 'poor';
}

let autoSaveTimeout: any = null;

export const useStore = create<StoreState>((set, get) => ({
  activeScreen: 'dashboard',
  setActiveScreen: (screen) => set({ activeScreen: screen }),

  settings: {},
  
  loadSettings: async () => {
    const settings = await window.api.getSettings();
    const onboarded = !!settings['userName'] && settings['userName'] !== 'Adviser';
    set({ settings, onboarded });
    
    // Apply styling options globally
    const theme = settings['theme'] || 'system';
    const accent = settings['accent'] || 'blue';
    const fontSize = settings['fontSize'] || 'normal';
    
    document.documentElement.setAttribute('data-theme', theme === 'system' ? 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme);
    document.documentElement.setAttribute('data-size', fontSize);
    document.documentElement.style.setProperty('--accent', `var(--accent-${accent})`);
  },

  updateSetting: async (key, value) => {
    await window.api.updateSetting(key, value);
    set((state) => {
      const updatedSettings = { ...state.settings, [key]: value };
      
      // Update visual styles if necessary
      if (key === 'theme') {
        document.documentElement.setAttribute('data-theme', value === 'system' ? 
          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value);
      } else if (key === 'accent') {
        document.documentElement.style.setProperty('--accent', `var(--accent-${value})`);
      } else if (key === 'fontSize') {
        document.documentElement.setAttribute('data-size', value);
      }

      return { settings: updatedSettings };
    });
  },

  getPoints: (key) => {
    const customPoints = get().settings[`points:${key}`];
    if (customPoints !== undefined) return parseInt(customPoints) || 0;
    const def = ACTIVITIES.find(a => a.key === key);
    return def ? def.defaultPoints : 0;
  },

  getName: (key) => {
    const customName = get().settings[`name:${key}`];
    if (customName !== undefined && customName !== '') return customName;
    const def = ACTIVITIES.find(a => a.key === key);
    return def ? def.name : key;
  },

  getDescription: (key) => {
    const customDesc = get().settings[`description:${key}`];
    if (customDesc !== undefined && customDesc !== '') return customDesc;
    const def = ACTIVITIES.find(a => a.key === key);
    return def ? def.description : '';
  },

  activeDate: new Date().toISOString().split('T')[0],
  activeNotes: '',
  activeLogs: {},
  
  setActiveDate: async (date) => {
    set({ activeDate: date });
    const dayData = await window.api.getDayLogs(date);
    
    const logsMap: Record<string, number> = {};
    ACTIVITIES.forEach(a => {
      logsMap[a.key] = 0;
    });
    dayData.logs.forEach((log) => {
      logsMap[log.activityKey] = log.count;
    });

    set({
      activeNotes: dayData.notes || '',
      activeLogs: logsMap
    });
  },

  updateActivityCount: (key, count) => {
    set((state) => {
      const updatedLogs = { ...state.activeLogs, [key]: Math.max(0, count) };
      
      // Setup debounced auto-save
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        get().saveCurrentDay();
      }, 500);

      return { activeLogs: updatedLogs };
    });
  },

  updateNotes: (notes) => {
    set({ activeNotes: notes });
    
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      get().saveCurrentDay();
    }, 500);
  },

  saveCurrentDay: async () => {
    const { activeDate, activeNotes, activeLogs } = get();
    const payload = ACTIVITIES.map((act) => {
      const count = activeLogs[act.key] || 0;
      const ptsPerUnit = get().getPoints(act.key);
      return {
        activityKey: act.key,
        count,
        pointsEarned: count * ptsPerUnit
      };
    }).filter(p => p.count > 0);

    await window.api.saveDayLogs(activeDate, activeNotes, payload);
    
    // Refresh all-time data and streak
    await get().loadAllTimeData();
  },

  allTimeDays: [],
  currentStreak: 0,
  
  loadAllTimeData: async () => {
    const data = await window.api.getAllTimeData();
    
    // Compute current streak of days above target (default target = 70)
    const settings = get().settings;
    const target = parseInt(settings['dailyTarget'] || '70') || 70;
    
    let streak = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Sort reverse chronological to check streak going backwards
    const sortedDays = [...data].sort((a,b) => b.date.localeCompare(a.date));
    const todayIndex = sortedDays.findIndex(d => d.date === todayStr);
    
    let checkIdx = todayIndex !== -1 ? todayIndex : 0;
    // If today hasn't crossed target yet, check if yesterday was above target to maintain streak
    if (checkIdx < sortedDays.length && sortedDays[checkIdx].score < target && sortedDays[checkIdx].date === todayStr) {
      checkIdx++;
    }

    for (let i = checkIdx; i < sortedDays.length; i++) {
      if (sortedDays[i].score >= target) {
        streak++;
      } else {
        break; // Streak broken
      }
    }

    set({ allTimeDays: data, currentStreak: streak });
  },

  onboarded: false,
  setOnboarded: (val) => set({ onboarded: val })
}));
