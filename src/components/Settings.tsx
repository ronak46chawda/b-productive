import { useState } from 'react';
import { useStore, ACTIVITIES } from '../store/useStore';
import { Settings, Save, RotateCcw, AlertTriangle, FileSpreadsheet, Download, RefreshCw, Moon, Sun, Monitor, Type } from 'lucide-react';

export default function SettingsView() {
  const { 
    settings, 
    updateSetting, 
    loadSettings, 
    getPoints, 
    getName,
    getDescription,
    loadAllTimeData 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'general' | 'points' | 'data'>('general');

  // Input states
  const [name, setName] = useState(settings['userName'] || 'Adviser');
  const [year, setYear] = useState(settings['year'] || '2026');
  const [dailyTarget, setDailyTarget] = useState(settings['dailyTarget'] || '70');
  const [reminderTime, setReminderTime] = useState(settings['reminderTime'] || '20:00');
  const [remindersEnabled, setRemindersEnabled] = useState(settings['remindersEnabled'] === 'true');

  // Appearance states
  const [theme, setTheme] = useState(settings['theme'] || 'system');
  const [accent, setAccent] = useState(settings['accent'] || 'blue');
  const [fontSize, setFontSize] = useState(settings['fontSize'] || 'normal');

  // Success message states
  const [saveMessage, setSaveMessage] = useState('');

  // Accent presets
  const accentPresets = [
    { value: 'blue', label: 'Classic Blue', color: '#3b82f6' },
    { value: 'purple', label: 'Vibrant Purple', color: '#8b5cf6' },
    { value: 'teal', label: 'Ocean Teal', color: '#14b8a6' },
    { value: 'orange', label: 'Warm Orange', color: '#f97316' },
    { value: 'rose', label: 'Sunset Rose', color: '#f43f5e' }
  ];

  // Save General settings
  const handleSaveGeneral = async () => {
    await updateSetting('userName', name);
    await updateSetting('year', year);
    await updateSetting('dailyTarget', dailyTarget);
    await updateSetting('reminderTime', reminderTime);
    await updateSetting('remindersEnabled', remindersEnabled ? 'true' : 'false');
    
    // Save appearance states
    await updateSetting('theme', theme);
    await updateSetting('accent', accent);
    await updateSetting('fontSize', fontSize);

    // Refresh state
    await loadSettings();
    await loadAllTimeData();

    setSaveMessage('General settings saved successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Custom Points Edit Handler
  const handlePointChange = async (key: string, val: string) => {
    const intVal = parseInt(val) || 0;
    await updateSetting(`points:${key}`, intVal.toString());
  };

  const handleSettingChange = async (key: string, val: string) => {
    await updateSetting(key, val);
  };

  // Reset Points to defaults
  const handleResetPoints = async () => {
    if (confirm('Are you sure you want to reset all activity names, descriptions, and point values to default?')) {
      for (const act of ACTIVITIES) {
        await updateSetting(`points:${act.key}`, act.defaultPoints.toString());
        await updateSetting(`name:${act.key}`, act.name);
        await updateSetting(`description:${act.key}`, act.description);
      }
      await loadSettings();
      setSaveMessage('Activity customisations reset to defaults.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Data management handlers
  const handleBackup = async () => {
    const dest = await window.api.selectFolder();
    if (dest) {
      try {
        const filePath = await window.api.backupDb(dest);
        alert(`Backup saved successfully to: ${filePath}`);
      } catch (err: any) {
        alert(`Backup failed: ${err.message}`);
      }
    }
  };

  const handleRestore = async () => {
    const file = await window.api.selectFile();
    if (file) {
      if (confirm('Are you sure you want to restore this database? Current data will be completely overwritten.')) {
        try {
          await window.api.restoreDb(file);
          await loadSettings();
          await loadAllTimeData();
          alert('Database restored successfully!');
        } catch (err: any) {
          alert(`Restore failed: ${err.message}`);
        }
      }
    }
  };

  const handleClearAll = async () => {
    const typedConfirmation = prompt('This will clear all logged days and reset all activity details. Type "DELETE" to confirm:');
    if (typedConfirmation === 'DELETE') {
      await window.api.clearAllData(parseInt(year) || 2026);
      await loadSettings();
      await loadAllTimeData();
      alert('All activity data has been successfully cleared.');
    }
  };



  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (confirm('Importing data will insert entries. Existing notes or counts for matching dates will be replaced. Continue?')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          await window.api.importCsv(content);
          await loadAllTimeData();
          alert('CSV Data imported successfully!');
        } catch (err: any) {
          alert(`Import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      <header className="content-header">
        <h1 className="header-title">
          <Settings size={20} style={{ color: 'var(--accent)' }} /> App Settings
        </h1>
      </header>

      {/* Tabs list */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', padding: '0 2rem' }}>
        <button 
          onClick={() => setActiveTab('general')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'general' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 600,
            borderBottom: activeTab === 'general' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          General & Appearance
        </button>
        <button 
          onClick={() => setActiveTab('points')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'points' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 600,
            borderBottom: activeTab === 'points' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Score & Items Customisation
        </button>
        <button 
          onClick={() => setActiveTab('data')}
          style={{
            padding: '1rem 1.5rem',
            border: 'none',
            background: 'none',
            color: activeTab === 'data' ? 'var(--accent)' : 'var(--text-secondary)',
            fontWeight: 600,
            borderBottom: activeTab === 'data' ? '2px solid var(--accent)' : '2px solid transparent',
            cursor: 'pointer'
          }}
        >
          Data Management
        </button>
      </div>

      {/* Scrollable Form Fields */}
      <div style={{ flexGrow: 1, padding: '2rem', overflowY: 'auto' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          
          {saveMessage && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: '6px', backgroundColor: 'var(--status-excellent-bg)', color: 'var(--status-excellent)', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
              {saveMessage}
            </div>
          )}

          {/* TAB 1: General & Appearance */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* User settings card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>User Preferences</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Advisor Name</label>
                    <input type="text" className="text-input" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Log Year</label>
                    <select className="select-input" value={year} onChange={e => setYear(e.target.value)}>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Daily Target Points</label>
                    <input type="number" className="text-input" value={dailyTarget} onChange={e => setDailyTarget(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reminder Time</label>
                    <input type="time" className="text-input" value={reminderTime} onChange={e => setReminderTime(e.target.value)} disabled={!remindersEnabled} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input type="checkbox" id="reminder-check" checked={remindersEnabled} onChange={e => setRemindersEnabled(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  <label htmlFor="reminder-check" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>Enable daily macOS notifications reminder</label>
                </div>
              </div>

              {/* Theme customisation card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Appearance Settings</h3>
                
                {/* Theme toggle row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Application Theme</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className={`btn ${theme === 'dark' ? 'btn-primary' : ''}`} onClick={() => setTheme('dark')} style={{ flex: 1 }}>
                      <Moon size={14} /> Dark Mode
                    </button>
                    <button className={`btn ${theme === 'light' ? 'btn-primary' : ''}`} onClick={() => setTheme('light')} style={{ flex: 1 }}>
                      <Sun size={14} /> Light Mode
                    </button>
                    <button className={`btn ${theme === 'system' ? 'btn-primary' : ''}`} onClick={() => setTheme('system')} style={{ flex: 1 }}>
                      <Monitor size={14} /> System
                    </button>
                  </div>
                </div>

                {/* Accent presets list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Brand Accent Color</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {accentPresets.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => setAccent(preset.value)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: accent === preset.value ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                      >
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: preset.color }} />
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Font Size (Accessibility)</label>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className={`btn ${fontSize === 'normal' ? 'btn-primary' : ''}`} onClick={() => setFontSize('normal')} style={{ flex: 1 }}>
                      <Type size={14} /> Normal
                    </button>
                    <button className={`btn ${fontSize === 'large' ? 'btn-primary' : ''}`} onClick={() => setFontSize('large')} style={{ flex: 1 }}>
                      <Type size={16} /> Large Text
                    </button>
                  </div>
                </div>

              </div>

              <button className="btn btn-primary" onClick={handleSaveGeneral} style={{ padding: '0.65rem', display: 'flex', gap: '0.5rem', alignSelf: 'flex-end' }}>
                <Save size={16} /> Save Settings
              </button>

            </div>
          )}

          {/* TAB 2: Points configuration */}
          {activeTab === 'points' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Adjust activity details and score multipliers. Changes save instantly.</p>
                <button className="btn" onClick={handleResetPoints} style={{ color: 'var(--status-poor)', borderColor: 'rgba(225, 29, 72, 0.2)' }}>
                  <RotateCcw size={14} /> Reset Defaults
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {ACTIVITIES.map(act => {
                  const currentPoints = getPoints(act.key);
                  const currentName = getName(act.key);
                  const currentDesc = getDescription(act.key);

                  return (
                    <div 
                      key={act.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        padding: '1rem 1.25rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-secondary)'
                      }}
                    >
                      {/* Top Row: Section Label and Points Input */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', fontWeight: 600 }}>
                          Section {act.section}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Multiplier:</span>
                          <input
                            type="number"
                            className="text-input"
                            value={currentPoints}
                            onChange={e => handlePointChange(act.key, e.target.value)}
                            style={{ width: '64px', textAlign: 'center', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                          />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>pts</span>
                        </div>
                      </div>

                      {/* Inputs for Title and Description */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Activity Name</label>
                          <input
                            type="text"
                            className="text-input"
                            value={currentName}
                            onChange={e => handleSettingChange(`name:${act.key}`, e.target.value)}
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', width: '100%', fontWeight: 500 }}
                            placeholder="Activity Name"
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
                          <input
                            type="text"
                            className="text-input"
                            value={currentDesc}
                            onChange={e => handleSettingChange(`description:${act.key}`, e.target.value)}
                            style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', width: '100%', color: 'var(--text-secondary)' }}
                            placeholder="Description"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Data Management */}
          {activeTab === 'data' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Backups Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Database Backup & Restore</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Save copies of the local database or restore existing backup JSON files.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button className="btn" onClick={handleBackup} style={{ padding: '0.75rem' }}>
                    <Download size={16} /> Backup Database File
                  </button>
                  <button className="btn" onClick={handleRestore} style={{ padding: '0.75rem' }}>
                    <RefreshCw size={16} /> Restore Backup JSON
                  </button>
                </div>
              </div>

              {/* Imports Card */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Import Log History</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pre-populate past entries by uploading a CSV sheet. Columns should align with Date, Weekday, Score, Sec A, Sec B, Sec C, Sec D, Notes.</p>
                
                <div style={{ position: 'relative' }}>
                  <button className="btn btn-primary" style={{ padding: '0.75rem', width: '100%' }}>
                    <FileSpreadsheet size={16} /> Choose CSV File to Import
                  </button>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileChange}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  />
                </div>
              </div>

              {/* Danger zone */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderColor: 'var(--status-poor)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--status-poor)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} /> Danger Zone
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Permanently erase all entries, settings customization, and scores from the local SQLite database. This operation is irreversible.</p>
                
                <button className="btn btn-danger" onClick={handleClearAll} style={{ padding: '0.75rem', width: '150px', alignSelf: 'flex-start' }}>
                  Clear All Data
                </button>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
