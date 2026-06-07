import { useState, useMemo, useEffect } from 'react';
import { useStore, ACTIVITIES, getScoreStatus } from '../store/useStore';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell, PieChart, Pie } from 'recharts';
import { BarChart3, Grid, Filter, Calendar } from 'lucide-react';

export default function Analytics() {
  const { allTimeDays, settings, getName } = useStore();
  
  // States for filters
  const [startMonth, setStartMonth] = useState<number>(1);
  const [endMonth, setEndMonth] = useState<number>(12);
  const [selectedPillar, setSelectedPillar] = useState<string>('all');

  const trackingYear = useMemo(() => {
    return parseInt(settings['year'] || '2026') || 2026;
  }, [settings]);

  const target = useMemo(() => {
    return parseInt(settings['dailyTarget'] || '70') || 70;
  }, [settings]);

  // Filtered days based on month range selection
  const rangeFilteredDays = useMemo(() => {
    return allTimeDays.filter(d => {
      const m = parseInt(d.date.split('-')[1]);
      return m >= startMonth && m <= endMonth;
    });
  }, [allTimeDays, startMonth, endMonth]);

  // Computed score for each day considering only the active pillar filter if one is selected
  const daysWithFilteredScores = useMemo(() => {
    return rangeFilteredDays.map(d => {
      let score = 0;
      if (selectedPillar === 'all') {
        score = d.score;
      } else if (selectedPillar === 'A') {
        score = d.sectionA;
      } else if (selectedPillar === 'B') {
        score = d.sectionB;
      } else if (selectedPillar === 'C') {
        score = d.sectionC;
      } else if (selectedPillar === 'D') {
        score = d.sectionD;
      }
      return { ...d, computedScore: score };
    });
  }, [rangeFilteredDays, selectedPillar]);

  // 1. Monthly Score Trend (12 months)
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const mDays = daysWithFilteredScores.filter(d => d.date.split('-')[1] === mStr);
      const activeDays = mDays.filter(d => d.computedScore > 0);
      const sum = activeDays.reduce((acc, d) => acc + d.computedScore, 0);
      const avg = activeDays.length > 0 ? Math.round(sum / activeDays.length) : 0;
      return { name: mName, score: avg };
    });
  }, [daysWithFilteredScores]);

  // 2. Pillar Contribution Over Time (Stacked Bar Chart by Month)
  const pillarContributionData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((mName, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const mDays = rangeFilteredDays.filter(d => d.date.split('-')[1] === mStr);
      
      let secA = 0, secB = 0, secC = 0, secD = 0;
      mDays.forEach(d => {
        secA += d.sectionA || 0;
        secB += d.sectionB || 0;
        secC += d.sectionC || 0;
        secD += d.sectionD || 0;
      });

      return {
        name: mName,
        'Client Work': secA,
        'Biz Dev': secB,
        'Knowledge': secC,
        'Digital': secD
      };
    });
  }, [rangeFilteredDays]);

  // 3. Best Day of Week (Mon - Sun)
  const dayOfWeekData = useMemo(() => {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);

    daysWithFilteredScores.forEach(d => {
      if (d.computedScore > 0) {
        const dayIdx = new Date(d.date).getDay();
        sums[dayIdx] += d.computedScore;
        counts[dayIdx]++;
      }
    });

    const order = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
    return order.map(idx => {
      const avg = counts[idx] > 0 ? Math.round(sums[idx] / counts[idx]) : 0;
      return {
        name: weekdays[idx].substring(0, 3),
        score: avg
      };
    });
  }, [daysWithFilteredScores]);

  // 4. Score Distribution (Excellent / Productive / Average / Poor)
  const scoreDistributionData = useMemo(() => {
    let excellent = 0, productive = 0, average = 0, poor = 0;
    daysWithFilteredScores.forEach(d => {
      if (d.computedScore === 0) return;
      const status = getScoreStatus(d.computedScore);
      if (status === 'excellent') excellent++;
      else if (status === 'productive') productive++;
      else if (status === 'average') average++;
      else poor++;
    });

    return [
      { name: 'Excellent', value: excellent, fill: '#10b981' },
      { name: 'Productive', value: productive, fill: '#0284c7' },
      { name: 'Average', value: average, fill: '#d97706' },
      { name: 'Poor', value: poor, fill: '#e11d48' }
    ].filter(v => v.value > 0);
  }, [daysWithFilteredScores]);

  // We will load frequencies inside useEffect below.

  const [frequencies, setFrequencies] = useState<Array<{ name: string, points: number, fill: string }>>([]);

  useEffect(() => {
    const fetchFrequencies = async () => {
      const rawFreqs = await window.api.getActivityFrequencies(trackingYear);
      const mapped = rawFreqs.map((f: any) => {
        const act = ACTIVITIES.find(a => a.key === f.activityKey);
        let color = '#3b82f6';
        if (act?.section === 'A') color = '#0284c7';
        else if (act?.section === 'B') color = '#8b5cf6';
        else if (act?.section === 'C') color = '#14b8a6';
        else if (act?.section === 'D') color = '#f97316';

        return {
          name: getName(f.activityKey),
          points: f.points,
          fill: color
        };
      });

      // Sort descending and take top 10
      mapped.sort((a: any, b: any) => b.points - a.points);
      setFrequencies(mapped.slice(0, 10));
    };

    fetchFrequencies();
  }, [allTimeDays, trackingYear]);

  // 6. GitHub-style Activity Heatmap (365 days)
  const heatmapWeeks = useMemo(() => {
    // Generate dates for the entire trackingYear
    const startDate = new Date(trackingYear, 0, 1);
    const endDate = new Date(trackingYear, 11, 31);
    
    // Quick lookup for scores
    const scoresLookup: Record<string, number> = {};
    allTimeDays.forEach(d => {
      scoresLookup[d.date] = d.score;
    });

    const days: Array<{ date: string; dayOfWeek: number; score: number }> = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        dayOfWeek: d.getDay(), // 0 = Sun, 1 = Mon ...
        score: scoresLookup[dateStr] || 0
      });
    }

    // Grid holds columns of weeks. Each week has 7 slots (Index 0 = Sunday, ..., 6 = Saturday)
    const weeks: Array<Array<{ date: string; score: number } | null>> = [];
    let currentWeek: Array<{ date: string; score: number } | null> = Array(7).fill(null);

    days.forEach(day => {
      currentWeek[day.dayOfWeek] = { date: day.date, score: day.score };
      if (day.dayOfWeek === 6 || day.date === endDate.toISOString().split('T')[0]) {
        weeks.push(currentWeek);
        currentWeek = Array(7).fill(null);
      }
    });

    return weeks;
  }, [allTimeDays, trackingYear]);

  // Function to map score to a heatmap cell background color
  const getHeatmapColor = (score: number) => {
    if (score === 0) return 'var(--bg-tertiary)'; // Unlogged / Empty
    if (score >= 90) return '#10b981'; // Excellent (green)
    if (score >= 70) return '#0284c7'; // Productive (blue)
    if (score >= 50) return '#f59e0b'; // Average (amber)
    return '#ef4444'; // Poor (rose red)
  };

  const getHeatmapTitle = (date: string, score: number) => {
    const dStr = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${dStr}: ${score} points (${score === 0 ? 'Not Logged' : getScoreStatus(score)})`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Analytics Header with Filters */}
      <header className="content-header" style={{ flexWrap: 'wrap', height: 'auto', padding: '1rem 2rem', gap: '1rem' }}>
        <h1 className="header-title" style={{ marginRight: 'auto' }}>
          <BarChart3 size={20} style={{ color: 'var(--accent)' }} /> Rich Analytics
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>Pillar:</span>
            <select
              className="select-input"
              value={selectedPillar}
              onChange={(e) => setSelectedPillar(e.target.value)}
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <option value="all">All Pillars</option>
              <option value="A">🤝 Client Activities</option>
              <option value="B">📈 Business Dev</option>
              <option value="C">📚 Knowledge & Learning</option>
              <option value="D">🌐 Brand & Digital</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
            <span>Range:</span>
            <select
              className="select-input"
              value={startMonth}
              onChange={(e) => setStartMonth(parseInt(e.target.value))}
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <option value="1">Jan</option>
              <option value="2">Feb</option>
              <option value="3">Mar</option>
              <option value="4">Apr</option>
              <option value="5">May</option>
              <option value="6">Jun</option>
              <option value="7">Jul</option>
              <option value="8">Aug</option>
              <option value="9">Sep</option>
              <option value="10">Oct</option>
              <option value="11">Nov</option>
              <option value="12">Dec</option>
            </select>
            <span>to</span>
            <select
              className="select-input"
              value={endMonth}
              onChange={(e) => setEndMonth(parseInt(e.target.value))}
              style={{ padding: '0.35rem 0.5rem' }}
            >
              <option value="1">Jan</option>
              <option value="2">Feb</option>
              <option value="3">Mar</option>
              <option value="4">Apr</option>
              <option value="5">May</option>
              <option value="6">Jun</option>
              <option value="7">Jul</option>
              <option value="8">Aug</option>
              <option value="9">Sep</option>
              <option value="10">Oct</option>
              <option value="11">Nov</option>
              <option value="12">Dec</option>
            </select>
          </div>
        </div>
      </header>

      {/* Analytics Content Scroll */}
      <div style={{ flexGrow: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Heatmap Panel */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Grid size={16} /> 365-Day Activity Heatmap
          </h3>
          <div style={{ display: 'flex', gap: '0.25rem', paddingBottom: '0.5rem', minWidth: '720px' }}>
            
            {/* Weekday labels */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '0.5rem', fontSize: '10px', color: 'var(--text-muted)', height: '84px', paddingTop: '12px' }}>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>

            {/* Heatmap Grid columns */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {heatmapWeeks.map((week, wIdx) => (
                <div key={`week-${wIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {week.map((day, dIdx) => (
                    day ? (
                      <div
                        key={day.date}
                        title={getHeatmapTitle(day.date, day.score)}
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '2px',
                          backgroundColor: getHeatmapColor(day.score),
                          transition: 'transform 0.1s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                      />
                    ) : (
                      <div key={`empty-${dIdx}`} style={{ width: '10px', height: '10px' }} />
                    )
                  ))}
                </div>
              ))}
            </div>
          </div>
          
          {/* Heatmap Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
            <span>Less</span>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--bg-tertiary)' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#0284c7' }} />
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981' }} />
            <span>More</span>
          </div>
        </div>

        {/* Chart Rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
          
          {/* 1. Monthly score trend */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Monthly Average Score Trend
            </h3>
            <div style={{ flexGrow: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={monthlyTrendData} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                  <ReferenceLine y={target} stroke="var(--target-line)" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Stacked bar chart for Pillar contribution */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Pillar Contribution Over Time
            </h3>
            <div style={{ flexGrow: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={pillarContributionData} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  <Bar dataKey="Client Work" stackId="a" fill="#0284c7" />
                  <Bar dataKey="Biz Dev" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="Knowledge" stackId="a" fill="#14b8a6" />
                  <Bar dataKey="Digital" stackId="a" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Best Day of Week */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Average Score by Day of Week
            </h3>
            <div style={{ flexGrow: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={dayOfWeekData} margin={{ left: -10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                  <Bar dataKey="score" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Score Distribution Donut */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Outcome Score Distribution
            </h3>
            <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {scoreDistributionData.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No logged data inside this range</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={scoreDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {scoreDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* 5. Top Activities rankings */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
            Top 10 Activities by YTD Contribution
          </h3>
          {frequencies.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              No logged activities YTD
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {frequencies.map((freq, idx) => (
                <div key={freq.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '24px', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    #{idx + 1}
                  </div>
                  <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span style={{ fontWeight: 500 }}>{freq.name}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{freq.points} pts</strong>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${(freq.points / frequencies[0].points) * 100}%`,
                          backgroundColor: freq.fill,
                          borderRadius: '3px'
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
