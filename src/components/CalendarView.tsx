import { useState, useMemo } from 'react';
import { useStore, getScoreStatus, ACTIVITIES } from '../store/useStore';
import { ChevronLeft, ChevronRight, X, Calendar, Edit2, AlertCircle } from 'lucide-react';

export default function CalendarView() {
  const { allTimeDays, setActiveDate, setActiveScreen, getPoints } = useStore();
  
  // State for calendar month navigation
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  
  // Selected day detail side drawer
  const [selectedDayDetail, setSelectedDayDetail] = useState<string | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 0) {
        setCurrentYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      if (prev === 11) {
        setCurrentYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Number of days in the selected month
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  // First day of the month weekday index (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayIndex = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  // Map database dates to a quick lookup map
  const daysLookup = useMemo(() => {
    const map: Record<string, typeof allTimeDays[0]> = {};
    allTimeDays.forEach(d => {
      map[d.date] = d;
    });
    return map;
  }, [allTimeDays]);

  // Days list for the grid cells
  const calendarCells = useMemo(() => {
    const cells: Array<{ dateString: string | null; dayNumber: number | null }> = [];
    
    // Add empty cell slots for offset days of previous month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ dateString: null, dayNumber: null });
    }

    // Add days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateString, dayNumber: d });
    }

    return cells;
  }, [currentYear, currentMonth, daysInMonth, firstDayIndex]);

  // Selected Month's Stats for the bottom strip
  const monthStats = useMemo(() => {
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const monthLogs = allTimeDays.filter(d => d.date.startsWith(prefix));
    const activeLogs = monthLogs.filter(d => d.score > 0);

    const sum = activeLogs.reduce((acc, d) => acc + d.score, 0);
    const avg = activeLogs.length > 0 ? Math.round(sum / activeLogs.length) : 0;

    let bestDay = 'None';
    let maxScore = -1;
    activeLogs.forEach(d => {
      if (d.score > maxScore) {
        maxScore = d.score;
        const dobj = new Date(d.date);
        bestDay = dobj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` (${d.score} pts)`;
      }
    });

    let excellent = 0;
    let productive = 0;
    let average = 0;
    let poor = 0;
    let unlogged = monthLogs.length - activeLogs.length;

    activeLogs.forEach(d => {
      const status = getScoreStatus(d.score);
      if (status === 'excellent') excellent++;
      else if (status === 'productive') productive++;
      else if (status === 'average') average++;
      else poor++;
    });

    return {
      avgScore: avg,
      bestDay,
      excellent,
      productive,
      average,
      poor,
      unlogged
    };
  }, [allTimeDays, currentYear, currentMonth]);

  // Selected Day Details for the Drawer (fetched async/reactive via hook)
  const detailData = useMemo(() => {
    if (!selectedDayDetail) return null;
    const dbDay = daysLookup[selectedDayDetail];
    
    // We will query window.api.getDayLogs to get full activities count since allTimeDays only has sums
    // But since this is a synchronous compute, we can render the basic data from lookup,
    // and wait for details, or we can load logs on click.
    return dbDay || { date: selectedDayDetail, score: 0, notes: '', sectionA: 0, sectionB: 0, sectionC: 0, sectionD: 0 };
  }, [selectedDayDetail, daysLookup]);

  // Fetch full details of day on click
  const [dayDetailsList, setDayDetailsList] = useState<any[]>([]);
  const [dayNotes, setDayNotes] = useState<string>('');

  const handleCellClick = async (dateStr: string) => {
    setSelectedDayDetail(dateStr);
    const details = await window.api.getDayLogs(dateStr);
    
    const populatedLogs = ACTIVITIES.map(act => {
      const found = details.logs.find((l: any) => l.activityKey === act.key);
      const count = found ? found.count : 0;
      const pts = getPoints(act.key);
      return {
        ...act,
        count,
        points: count * pts
      };
    }).filter(l => l.count > 0);

    setDayDetailsList(populatedLogs);
    setDayNotes(details.notes || '');
  };

  const handleEditClick = (dateStr: string) => {
    setActiveDate(dateStr);
    setActiveScreen('daily-log');
  };

  return (
    <div style={{ display: 'flex', position: 'relative', height: '100%', overflow: 'hidden' }}>
      
      {/* Calendar Grid Container */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '70px' }}>
        
        {/* Navigation Header */}
        <header className="content-header">
          <h1 className="header-title">
            <Calendar size={20} style={{ color: 'var(--accent)' }} /> Calendar View
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn" onClick={handlePrevMonth} style={{ padding: '0.4rem 0.6rem' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, minWidth: '150px', textAlign: 'center', fontSize: '1.1rem' }}>
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button className="btn" onClick={handleNextMonth} style={{ padding: '0.4rem 0.6rem' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* Grid Cells */}
        <div style={{ flexGrow: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          
          {/* Weekday Names Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', textAlign: 'center', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Body Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', flexGrow: 1, minHeight: '350px' }}>
            {calendarCells.map((cell, idx) => {
              if (!cell.dayNumber || !cell.dateString) {
                return <div key={`empty-${idx}`} style={{ backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid transparent', borderRadius: '8px' }} />;
              }

              const dbDay = daysLookup[cell.dateString];
              const score = dbDay ? dbDay.score : 0;
              const status = score === 0 ? 'unlogged' : getScoreStatus(score);

              return (
                <div
                  key={cell.dateString}
                  onClick={() => handleCellClick(cell.dateString!)}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: selectedDayDetail === cell.dateString ? '2px solid var(--accent)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '75px',
                    transition: 'all 0.15s ease'
                  }}
                  className="sidebar-item"
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {cell.dayNumber}
                  </div>
                  
                  {dbDay && score > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{score}</span>
                      <span className={`badge ${status}`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', marginTop: '0.15rem' }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--text-muted)', opacity: 0.3 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>

        {/* Summary strip at bottom */}
        <footer
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '70px',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            padding: '0 2rem',
            zIndex: 4
          }}
        >
          <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Month Average: </span>
              <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{monthStats.avgScore} pts</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Best Day: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{monthStats.bestDay}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <span className="badge excellent">Excellent: {monthStats.excellent}</span>
            <span className="badge productive">Productive: {monthStats.productive}</span>
            <span className="badge average">Average: {monthStats.average}</span>
            <span className="badge poor">Poor: {monthStats.poor}</span>
            <span className="badge unlogged">Unlogged: {monthStats.unlogged}</span>
          </div>
        </footer>

      </div>

      {/* Side Slide-over Drawer for Day Detail */}
      {selectedDayDetail && detailData && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '380px',
            height: '100%',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--border-color)',
            boxShadow: '-4px 0 15px rgba(0,0,0,0.2)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.2s ease-out'
          }}
        >
          {/* Drawer Header */}
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {new Date(selectedDayDetail).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Day Details
              </span>
            </div>
            <button 
              className="btn" 
              onClick={() => setSelectedDayDetail(null)} 
              style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Drawer Body Scroll */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Score box */}
            <div style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'var(--bg-tertiary)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Total Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0' }}>{detailData.score}</div>
              <span className={`badge ${detailData.score === 0 ? 'unlogged' : getScoreStatus(detailData.score)}`} style={{ textTransform: 'capitalize' }}>
                {detailData.score === 0 ? 'Empty' : getScoreStatus(detailData.score)}
              </span>
            </div>

            {/* List Activities logged */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Logged Activities</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dayDetailsList.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px dashed var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    <AlertCircle size={14} /> No activities logged on this day
                  </div>
                ) : (
                  dayDetailsList.map((log) => (
                    <div 
                      key={log.key}
                      style={{ 
                        padding: '0.5rem 0.75rem', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '6px', 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-primary)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{log.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.count} logged</span>
                      </div>
                      <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>
                        +{log.points} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes box */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Notes</h4>
              <div style={{ 
                padding: '0.75rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                backgroundColor: 'var(--bg-primary)', 
                fontSize: '0.85rem', 
                lineHeight: '1.5',
                color: dayNotes ? 'var(--text-primary)' : 'var(--text-muted)',
                minHeight: '80px',
                whiteSpace: 'pre-wrap'
              }}>
                {dayNotes || 'No notes written for this day.'}
              </div>
            </div>

          </div>

          {/* Drawer Footer Edit Button */}
          <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '0.65rem' }} 
              onClick={() => handleEditClick(selectedDayDetail)}
            >
              <Edit2 size={14} /> Open in Daily Log
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
