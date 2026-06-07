import { useEffect, useMemo } from 'react';
import { useStore, getScoreStatus } from './store/useStore';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import DailyLog from './components/DailyLog';
import CalendarView from './components/CalendarView';
import Analytics from './components/Analytics';
import HistoryTable from './components/HistoryTable';
import SettingsView from './components/Settings';
import { LayoutDashboard, Calendar, BarChart3, Clock, Settings, FileSpreadsheet, Moon, Sun, Monitor } from 'lucide-react';

export default function App() {
  const {
    activeScreen,
    setActiveScreen,
    settings,
    loadSettings,
    allTimeDays,
    loadAllTimeData,
    activeDate,
    setActiveDate,
    saveCurrentDay,
    currentStreak,
    onboarded
  } = useStore();

  // Initialize Settings and load YTD Data
  useEffect(() => {
    const initApp = async () => {
      await loadSettings();
      await loadAllTimeData();
      // Auto-load today's date in store
      await setActiveDate(new Date().toISOString().split('T')[0]);
    };
    initApp();
  }, [loadSettings, loadAllTimeData, setActiveDate]);

  // Today's Score calculator for sidebar badge
  const todayScore = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntry = allTimeDays.find(d => d.date === todayStr);
    return todayEntry ? todayEntry.score : 0;
  }, [allTimeDays]);

  const todayStatus = useMemo(() => {
    return todayScore === 0 ? 'unlogged' : getScoreStatus(todayScore);
  }, [todayScore]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      
      if (isCmdOrCtrl) {
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          setActiveScreen('daily-log');
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          saveCurrentDay();
        } else if (e.key === ',') {
          e.preventDefault();
          setActiveScreen('settings');
        } else if (e.key === 'ArrowLeft') {
          if (activeScreen === 'daily-log') {
            e.preventDefault();
            const d = new Date(activeDate);
            d.setDate(d.getDate() - 1);
            setActiveDate(d.toISOString().split('T')[0]);
          }
        } else if (e.key === 'ArrowRight') {
          if (activeScreen === 'daily-log') {
            e.preventDefault();
            const d = new Date(activeDate);
            d.setDate(d.getDate() + 1);
            setActiveDate(d.toISOString().split('T')[0]);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScreen, activeDate, setActiveDate, setActiveScreen, saveCurrentDay]);

  // Accent and Theme controls
  const handleToggleTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    await useStore.getState().updateSetting('theme', newTheme);
  };

  return (
    <div className="app-container">
      {/* Onboarding Overlay */}
      {!onboarded && <Onboarding />}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo">PT</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="sidebar-brand-name">ProTrack</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {settings['userName'] || 'Adviser'}'s {settings['year'] || '2026'}
              </span>
            </div>
          </div>

          <nav className="sidebar-menu">
            <div 
              className={`sidebar-item ${activeScreen === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveScreen('dashboard')}
            >
              <div className="sidebar-item-content">
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </div>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'daily-log' ? 'active' : ''}`}
              onClick={() => setActiveScreen('daily-log')}
            >
              <div className="sidebar-item-content">
                <Clock size={18} />
                <span>Daily Log</span>
              </div>
              <span className={`sidebar-badge ${todayStatus}`} style={{ fontSize: '0.7rem' }}>
                {todayScore}
              </span>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveScreen('calendar')}
            >
              <div className="sidebar-item-content">
                <Calendar size={18} />
                <span>Calendar View</span>
              </div>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveScreen('analytics')}
            >
              <div className="sidebar-item-content">
                <BarChart3 size={18} />
                <span>Analytics</span>
              </div>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'history' ? 'active' : ''}`}
              onClick={() => setActiveScreen('history')}
            >
              <div className="sidebar-item-content">
                <FileSpreadsheet size={18} />
                <span>History Log</span>
              </div>
            </div>

            <div 
              className={`sidebar-item ${activeScreen === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveScreen('settings')}
            >
              <div className="sidebar-item-content">
                <Settings size={18} />
                <span>Settings</span>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* Streak Tracker */}
          {currentStreak > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.08)', color: '#f43f5e', fontSize: '0.85rem', fontWeight: 600 }}>
              <span>🔥 Streak: {currentStreak} days</span>
            </div>
          )}

          {/* Theme buttons in footer */}
          <div className="theme-toggle-row">
            <span>Theme</span>
            <div className="theme-btn-group">
              <button 
                className={`theme-btn ${settings['theme'] === 'light' ? 'active' : ''}`}
                onClick={() => handleToggleTheme('light')}
                title="Light mode"
              >
                <Sun size={12} />
              </button>
              <button 
                className={`theme-btn ${settings['theme'] === 'dark' ? 'active' : ''}`}
                onClick={() => handleToggleTheme('dark')}
                title="Dark mode"
              >
                <Moon size={12} />
              </button>
              <button 
                className={`theme-btn ${settings['theme'] === 'system' || !settings['theme'] ? 'active' : ''}`}
                onClick={() => handleToggleTheme('system')}
                title="System preferences"
              >
                <Monitor size={12} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Panel Content Routing */}
      <main className="main-content">
        {activeScreen === 'dashboard' && <Dashboard />}
        {activeScreen === 'daily-log' && <DailyLog />}
        {activeScreen === 'calendar' && <CalendarView />}
        {activeScreen === 'analytics' && <Analytics />}
        {activeScreen === 'history' && <HistoryTable />}
        {activeScreen === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}
