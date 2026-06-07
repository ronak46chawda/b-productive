import { useState, useMemo } from 'react';
import { useStore, ACTIVITIES, getScoreStatus } from '../store/useStore';
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, FileText, CheckCircle2 } from 'lucide-react';

export default function DailyLog() {
  const { 
    activeDate, 
    activeNotes, 
    activeLogs, 
    setActiveDate, 
    updateActivityCount, 
    updateNotes,
    saveCurrentDay,
    getPoints,
    getName,
    getDescription,
    settings
  } = useStore();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'A': true,
    'B': true,
    'C': true,
    'D': true
  });

  const target = useMemo(() => {
    return parseInt(settings['dailyTarget'] || '70') || 70;
  }, [settings]);

  // Expand / collapse section
  const toggleSection = (sec: string) => {
    setOpenSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Date Navigation
  const navigateDay = (offset: number) => {
    const d = new Date(activeDate);
    d.setDate(d.getDate() + offset);
    setActiveDate(d.toISOString().split('T')[0]);
  };

  // Group activities by Section
  const groupedActivities = useMemo(() => {
    return {
      'A': ACTIVITIES.filter(a => a.section === 'A'),
      'B': ACTIVITIES.filter(a => a.section === 'B'),
      'C': ACTIVITIES.filter(a => a.section === 'C'),
      'D': ACTIVITIES.filter(a => a.section === 'D')
    };
  }, []);

  // Section names and emojis
  const sectionMeta: Record<string, { name: string, emoji: string }> = {
    'A': { name: 'Client Activities', emoji: '🤝' },
    'B': { name: 'Business Development', emoji: '📈' },
    'C': { name: 'Knowledge & Learning', emoji: '📚' },
    'D': { name: 'Brand & Digital Presence', emoji: '🌐' }
  };

  // Live subtotals per section
  const subtotals = useMemo(() => {
    const totals: Record<string, number> = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
    ACTIVITIES.forEach(act => {
      const count = activeLogs[act.key] || 0;
      const pts = getPoints(act.key);
      totals[act.section] += count * pts;
    });
    return totals;
  }, [activeLogs, getPoints]);

  const totalScore = useMemo(() => {
    return Object.values(subtotals).reduce((sum, val) => sum + val, 0);
  }, [subtotals]);

  const scoreStatus = useMemo(() => {
    return totalScore === 0 ? 'unlogged' : getScoreStatus(totalScore);
  }, [totalScore]);

  // Format date display
  const formattedDate = useMemo(() => {
    const d = new Date(activeDate);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }, [activeDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Date Header */}
      <header className="content-header" style={{ justifyContent: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn" onClick={() => navigateDay(-1)} style={{ padding: '0.4rem 0.6rem' }}>
            <ChevronLeft size={16} />
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
            <Calendar size={16} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, fontSize: '1.05rem', minWidth: '220px', textAlign: 'center' }}>
              {formattedDate}
            </span>
            <input 
              type="date" 
              value={activeDate}
              onChange={(e) => {
                if (e.target.value) setActiveDate(e.target.value);
              }}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%'
              }}
            />
          </div>

          <button className="btn" onClick={() => navigateDay(1)} style={{ padding: '0.4rem 0.6rem' }}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Sync Indicator */}
        <div style={{ position: 'absolute', right: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <CheckCircle2 size={12} style={{ color: 'var(--status-excellent)' }} />
          Auto-saved
        </div>
      </header>

      {/* Main Form Fields */}
      <div style={{ flexGrow: 1, padding: '2rem', overflowY: 'auto', paddingBottom: '120px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Pillar Accordions */}
          {Object.entries(groupedActivities).map(([sectionKey, activities]) => {
            const isOpen = openSections[sectionKey];
            const meta = sectionMeta[sectionKey];
            const subtotal = subtotals[sectionKey];

            return (
              <div 
                key={sectionKey} 
                className="card" 
                style={{ padding: 0, overflow: 'hidden' }}
              >
                {/* Header */}
                <div 
                  onClick={() => toggleSection(sectionKey)}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderBottom: isOpen ? '1px solid var(--border-color)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{meta.emoji}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{meta.name}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '0.2rem 0.6rem', border: '1px solid var(--border-color)' }}>
                      {subtotal} pts
                    </span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Rows List */}
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {activities.map((act) => {
                      const count = activeLogs[act.key] || 0;
                      const pts = getPoints(act.key);

                      return (
                        <div 
                          key={act.key}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-color)'
                          }}
                        >
                          <div style={{ flexGrow: 1, paddingRight: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 500 }}>{getName(act.key)}</span>
                              <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>
                                +{pts} pts
                              </span>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.775rem', marginTop: '0.15rem' }}>
                              {getDescription(act.key)}
                            </p>
                          </div>

                          {/* Controls */}
                          <div>
                            {act.isBinary ? (
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <input 
                                  type="checkbox"
                                  checked={count > 0}
                                  onChange={(e) => updateActivityCount(act.key, e.target.checked ? 1 : 0)}
                                  style={{
                                    width: '20px',
                                    height: '20px',
                                    cursor: 'pointer'
                                  }}
                                />
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)' }}>
                                <button 
                                  onClick={() => updateActivityCount(act.key, count - 1)}
                                  disabled={count === 0}
                                  style={{ 
                                    border: 'none', 
                                    background: 'none', 
                                    padding: '0.4rem 0.6rem', 
                                    cursor: count === 0 ? 'not-allowed' : 'pointer',
                                    color: count === 0 ? 'var(--text-muted)' : 'var(--text-primary)'
                                  }}
                                >
                                  -
                                </button>
                                <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
                                  {count}
                                </span>
                                <button 
                                  onClick={() => updateActivityCount(act.key, count + 1)}
                                  style={{ border: 'none', background: 'none', padding: '0.4rem 0.6rem', cursor: 'pointer', color: 'var(--text-primary)' }}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes field */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <FileText size={16} /> Optional Day Notes
            </h3>
            <textarea
              className="text-input"
              rows={4}
              placeholder="Record any client feedback, market events, or specific highlights of the day here..."
              value={activeNotes}
              onChange={(e) => updateNotes(e.target.value)}
              style={{ width: '100%', resize: 'vertical', fontSize: '0.85rem' }}
            />
          </div>

        </div>
      </div>

      {/* Sticky Bottom score bar */}
      <footer 
        style={{ 
          position: 'absolute', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          backgroundColor: 'var(--bg-secondary)', 
          borderTop: '1px solid var(--border-color)', 
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 5,
          backdropFilter: 'blur(10px)',
          boxShadow: '0 -4px 10px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexGrow: 1 }}>
          
          {/* Large Score */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Daily Score</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalScore}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {target} target</span>
            </div>
          </div>

          {/* Status Badge */}
          <span className={`badge ${scoreStatus}`} style={{ textTransform: 'capitalize', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            {scoreStatus === 'unlogged' ? 'Empty' : scoreStatus}
          </span>

          {/* Progress Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              <span>A: {subtotals['A']} | B: {subtotals['B']} | C: {subtotals['C']} | D: {subtotals['D']}</span>
              <span>{Math.round(Math.min(100, (totalScore / target) * 100))}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${Math.min(100, (totalScore / target) * 100)}%`,
                  backgroundColor: totalScore >= target ? 'var(--status-excellent)' : 'var(--accent)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease, background-color 0.3s ease'
                }}
              />
            </div>
          </div>
        </div>

        {/* Manual Save Button */}
        <button 
          className="btn btn-primary" 
          onClick={saveCurrentDay}
          style={{ padding: '0.65rem 1.25rem' }}
        >
          <Save size={16} /> Save Day
        </button>
      </footer>
    </div>
  );
}
