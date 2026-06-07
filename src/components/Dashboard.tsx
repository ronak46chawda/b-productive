import { useState, useMemo } from 'react';
import { useStore, getScoreStatus } from '../store/useStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, ReferenceLine } from 'recharts';
import { Award, Calendar, TrendingUp, CheckCircle, ChevronRight, Activity } from 'lucide-react';

export default function Dashboard() {
  const { allTimeDays, settings, setActiveDate, setActiveScreen } = useStore();
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const target = useMemo(() => {
    return parseInt(settings['dailyTarget'] || '70') || 70;
  }, [settings]);

  const monthOptions = [
    { value: 'all', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // 1. Filtered data for breakdown calculations
  const filteredDays = useMemo(() => {
    if (selectedMonth === 'all') return allTimeDays;
    return allTimeDays.filter(d => d.date.split('-')[1] === selectedMonth);
  }, [allTimeDays, selectedMonth]);

  // 2. Calculations for top KPI cards row
  const kpis = useMemo(() => {
    const totalPoints = filteredDays.reduce((acc, d) => acc + d.score, 0);
    const trackedDays = filteredDays.filter(d => d.score > 0);
    const trackedCount = trackedDays.length;
    const avgScore = trackedCount > 0 ? Math.round(totalPoints / trackedCount) : 0;
    
    // Target achievement % (days >= target / total tracked days with score > 0, or total logged days? Let's say out of all logged days with score > 0)
    const targetMetCount = filteredDays.filter(d => d.score >= target).length;
    const achievementRate = filteredDays.length > 0 ? Math.round((targetMetCount / filteredDays.length) * 100) : 0;

    return {
      totalPoints,
      trackedCount,
      avgScore,
      achievementRate
    };
  }, [filteredDays, target]);

  // 3. Status Breakdown
  const statusCounts = useMemo(() => {
    let excellent = 0;
    let productive = 0;
    let average = 0;
    let poor = 0;

    filteredDays.forEach(d => {
      // If a day is completely unlogged (score = 0), is it counted as poor?
      // Typically, days logged in the database with score 0 are 'poor'.
      if (d.score === 0) {
        poor++;
        return;
      }
      const status = getScoreStatus(d.score);
      if (status === 'excellent') excellent++;
      else if (status === 'productive') productive++;
      else if (status === 'average') average++;
      else poor++;
    });

    return { excellent, productive, average, poor };
  }, [filteredDays]);

  // 4. Pillar Breakdown
  const pillarChartData = useMemo(() => {
    let secA = 0;
    let secB = 0;
    let secC = 0;
    let secD = 0;

    filteredDays.forEach(d => {
      secA += d.sectionA || 0;
      secB += d.sectionB || 0;
      secC += d.sectionC || 0;
      secD += d.sectionD || 0;
    });

    return [
      { name: '🤝 Client Work', value: secA, fill: '#0284c7' },
      { name: '📈 Biz Dev', value: secB, fill: '#8b5cf6' },
      { name: '📚 Knowledge', value: secC, fill: '#14b8a6' },
      { name: '🌐 Digital Brand', value: secD, fill: '#f97316' }
    ];
  }, [filteredDays]);

  // 5. Monthly Trend (Daily Performance Timeline - Line chart with 12 monthly data points)
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((monthName, idx) => {
      const monthStr = String(idx + 1).padStart(2, '0');
      const monthDays = allTimeDays.filter(d => d.date.split('-')[1] === monthStr);
      
      const loggedDays = monthDays.filter(d => d.score > 0);
      const sum = loggedDays.reduce((acc, d) => acc + d.score, 0);
      const avg = loggedDays.length > 0 ? Math.round(sum / loggedDays.length) : 0;
      
      return {
        name: monthName,
        score: avg
      };
    });
  }, [allTimeDays]);

  // 6. Recent Activity Feed (last 7 tracked days, newest first)
  const recentDays = useMemo(() => {
    // Return last 7 days that are not ahead of today
    const todayStr = new Date().toISOString().split('T')[0];
    return [...allTimeDays]
      .filter(d => d.date <= todayStr)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);
  }, [allTimeDays]);

  const handleDayClick = (date: string) => {
    setActiveDate(date);
    setActiveScreen('daily-log');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="content-header">
        <h1 className="header-title">
          <Activity size={20} style={{ color: 'var(--accent)' }} /> Dashboard
        </h1>
        <div className="header-actions">
          <select 
            className="select-input"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="grid-container grid-kpis" style={{ paddingBottom: 0 }}>
        {/* KPI Row */}
        <div className="card">
          <div className="card-title">
            Total Points YTD <Award size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="card-value">{kpis.totalPoints}</div>
          <div className="card-subtext">Cumulative points logged</div>
        </div>

        <div className="card">
          <div className="card-title">
            Tracked Working Days <Calendar size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="card-value">{kpis.trackedCount}</div>
          <div className="card-subtext">Days with logged activity</div>
        </div>

        <div className="card">
          <div className="card-title">
            Average Daily Score <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="card-value">{kpis.avgScore}</div>
          <div className="card-subtext">Points per active day</div>
        </div>

        <div className="card">
          <div className="card-title">
            Target Achievement % <CheckCircle size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="card-value">{kpis.achievementRate}%</div>
          <div className="card-subtext">Days meeting {target} pts target</div>
        </div>
      </div>

      <div className="grid-container grid-charts" style={{ paddingBottom: 0 }}>
        {/* Activity Breakdown Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Points Breakdown by Pillar
          </h3>
          <div style={{ flexGrow: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={pillarChartData} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" fontSize={11} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pillarChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Performance Timeline */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Monthly Score Average (Target: {target} pts)
          </h3>
          <div style={{ flexGrow: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={monthlyTrendData} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                />
                <ReferenceLine y={target} stroke="var(--target-line)" strokeDasharray="3 3" label={{ value: `Target (${target})`, fill: 'var(--target-line)', position: 'insideTopRight', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--accent)" 
                  strokeWidth={3} 
                  dot={{ r: 4, stroke: 'var(--accent)', strokeWidth: 1, fill: 'var(--bg-secondary)' }}
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-container grid-dashboard-bottom">
        {/* Daily Outcome Status Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Outcome Status Counts
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexGrow: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-excellent)', textTransform: 'uppercase' }}>Excellent (≥90)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{statusCounts.excellent}</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-productive)', textTransform: 'uppercase' }}>Productive (70-89)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{statusCounts.productive}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(217, 119, 6, 0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-average)', textTransform: 'uppercase' }}>Average (50-69)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{statusCounts.average}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'rgba(225, 29, 72, 0.05)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--status-poor)', textTransform: 'uppercase' }}>Poor (&lt;50)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{statusCounts.poor}</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Recent Activity (Last 7 Days)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexGrow: 1, overflowY: 'auto', maxHeight: '235px' }}>
            {recentDays.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                No recent days logged
              </div>
            ) : (
              recentDays.map((day) => {
                const dateObj = new Date(day.date);
                const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const status = day.score === 0 ? 'unlogged' : getScoreStatus(day.score);

                return (
                  <div 
                    key={day.date} 
                    onClick={() => handleDayClick(day.date)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.65rem 0.75rem', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    className="sidebar-item"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dateFormatted} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({weekday})</span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {day.notes ? (day.notes.length > 40 ? `${day.notes.slice(0, 40)}...` : day.notes) : 'No notes written'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                        {day.score} pts
                      </span>
                      <span className={`badge ${status}`} style={{ textTransform: 'capitalize', minWidth: '75px', textAlign: 'center', display: 'inline-block' }}>
                        {status}
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
