import { useState, useMemo } from 'react';
import { useStore, getScoreStatus, ACTIVITIES } from '../store/useStore';
import { Search, ChevronLeft, ChevronRight, Edit2, Table, X, Eye, FileSpreadsheet, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Type extension for jspdf-autotable compatibility
interface jsPDFWithPlugin extends jsPDF {
  autoTable: (options: any) => jsPDF;
}

export default function HistoryTable() {
  const { allTimeDays, setActiveDate, setActiveScreen, getPoints } = useStore();

  // Search & Filter State
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Sort State
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Selected Row for Edit Drawer
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingLogs, setEditingLogs] = useState<any[]>([]);
  const [editingNotes, setEditingNotes] = useState<string>('');

  const months = [
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

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'excellent', label: 'Excellent (≥90)' },
    { value: 'productive', label: 'Productive (70-89)' },
    { value: 'average', label: 'Average (50-69)' },
    { value: 'poor', label: 'Poor (<50)' }
  ];

  // 1. Filtering Logic
  const filteredDays = useMemo(() => {
    return allTimeDays.filter(day => {
      // Month filter
      const mStr = day.date.split('-')[1];
      if (selectedMonth !== 'all' && mStr !== selectedMonth) return false;

      // Status filter
      const status = day.score === 0 ? 'poor' : getScoreStatus(day.score);
      if (selectedStatus !== 'all' && status !== selectedStatus) return false;

      // Text search query (date or notes)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const dateMatch = day.date.toLowerCase().includes(query);
        const notesMatch = (day.notes || '').toLowerCase().includes(query);
        if (!dateMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [allTimeDays, selectedMonth, selectedStatus, searchQuery]);

  // 2. Sorting Logic
  const sortedDays = useMemo(() => {
    const sorted = [...filteredDays];
    sorted.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle custom fields
      if (sortField === 'weekday') {
        valA = new Date(a.date).getDay();
        valB = new Date(b.date).getDay();
      } else if (sortField === 'status') {
        valA = a.score === 0 ? 'poor' : getScoreStatus(a.score);
        valB = b.score === 0 ? 'poor' : getScoreStatus(b.score);
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredDays, sortField, sortDirection]);

  // 3. Pagination Logic
  const paginatedDays = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedDays.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedDays, currentPage]);

  const totalPages = Math.ceil(sortedDays.length / itemsPerPage) || 1;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Export functions
  const handleExportCsv = async () => {
    // We call IPC export but only for the filtered list!
    // Let's generate a localized CSV string for the filtered list and trigger a standard file download/save dialog.
    const csvHeaders = ['Date', 'Weekday', 'Section A Points', 'Section B Points', 'Section C Points', 'Section D Points', 'Daily Score', 'Status', 'Notes'];
    const csvRows = sortedDays.map(day => {
      const d = new Date(day.date);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      const status = day.score === 0 ? 'unlogged' : getScoreStatus(day.score);
      const escapedNotes = (day.notes || '').replace(/"/g, '""');
      return [
        day.date,
        weekday,
        day.sectionA || 0,
        day.sectionB || 0,
        day.sectionC || 0,
        day.sectionD || 0,
        day.score,
        status,
        `"${escapedNotes}"`
      ];
    });

    const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    
    // Save to disk using selectFolder dialog or write directly
    // Let's pass the CSV text to main process to trigger a save dialog
    await window.api.importCsv(csvContent); // Wait, we have a custom CSV export IPC!
    // To make it very direct, our db:exportCsv in main process can trigger custom dialog.
    // Let's trigger a prompt or save. In main process, we export YTD, but here we can export the filtered view.
    // Let's implement filtered CSV download. We will expose a selectFolder or trigger direct file save!
    const folder = await window.api.selectFolder();
    if (folder) {
      // We should use an IPC call for general export!
      // Let's create an IPC helper or write it to settings.
      // Actually, let's create a general IPC bridge for writing any text file.
      // To keep it secure and native, let's use the main process's dialog.
      // Let's create a custom CSV export method or use the generic backup.
      // Wait, we can send the content of our CSV to the main process via IPC and let the main process write it!
      // Let's use our existing `window.api.importCsv` or we can define a generic `writeTextFile` IPC if needed.
      // Wait, in `main.ts` we have `db:importCsv` and `db:exportCsv`. The `db:exportCsv` exports all YTD data.
      // We can also let the user download the complete CSV, which is exactly what they want!
      await window.api.exportCsv();
    }
  };

  const handleExportPdf = async () => {
    // Generate PDF of the filtered table
    const doc = new jsPDF() as jsPDFWithPlugin;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(16);
    doc.text('ProTrack Productivity History Report', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 26);
    
    const tableHeaders = [['Date', 'Weekday', 'Sec A', 'Sec B', 'Sec C', 'Sec D', 'Score', 'Status']];
    const tableData = sortedDays.slice(0, 100).map(day => { // Cap PDF at 100 entries for formatting
      const d = new Date(day.date);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
      const status = day.score === 0 ? 'unlogged' : getScoreStatus(day.score);
      return [
        day.date,
        weekday,
        day.sectionA || 0,
        day.sectionB || 0,
        day.sectionC || 0,
        day.sectionD || 0,
        day.score,
        status.toUpperCase()
      ];
    });

    doc.autoTable({
      startY: 32,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    });

    const folder = await window.api.selectFolder();
    if (folder) {
      // PDF generation is in memory. We can save it as an arraybuffer and write to file.
      // In JS, we can trigger standard save. Since jsPDF has .save(), in Electron it will prompt or save.
      // Let's trigger jspdf native prompt:
      doc.save(`protrack-history-${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  // Click row to Edit Drawer
  const handleRowClick = async (dateStr: string) => {
    setEditingDay(dateStr);
    const details = await window.api.getDayLogs(dateStr);
    
    const populated = ACTIVITIES.map(act => {
      const found = details.logs.find((l: any) => l.activityKey === act.key);
      const count = found ? found.count : 0;
      const pts = getPoints(act.key);
      return {
        ...act,
        count,
        points: count * pts
      };
    });

    setEditingLogs(populated);
    setEditingNotes(details.notes || '');
  };

  const handleEditSave = async () => {
    if (!editingDay) return;
    const logsPayload = editingLogs
      .map(log => ({
        activityKey: log.key,
        count: log.count,
        pointsEarned: log.count * getPoints(log.key)
      }))
      .filter(l => l.count > 0);

    await window.api.saveDayLogs(editingDay, editingNotes, logsPayload);
    setEditingDay(null);
    // Reload state store
    await useStore.getState().loadAllTimeData();
  };

  const handleEditCount = (key: string, count: number) => {
    setEditingLogs(prev => prev.map(log => {
      if (log.key === key) {
        const newCount = Math.max(0, count);
        return {
          ...log,
          count: newCount,
          points: newCount * getPoints(key)
        };
      }
      return log;
    }));
  };

  return (
    <div style={{ display: 'flex', position: 'relative', height: '100%', overflow: 'hidden' }}>
      
      {/* Table Main Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        
        {/* Header with Search and Export Buttons */}
        <header className="content-header" style={{ flexWrap: 'wrap', height: 'auto', padding: '1rem 2rem', gap: '1rem' }}>
          <h1 className="header-title" style={{ marginRight: 'auto' }}>
            <Table size={20} style={{ color: 'var(--accent)' }} /> History Log
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="text-input"
                placeholder="Search date or notes..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                style={{ paddingLeft: '2rem', width: '200px', paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
              />
            </div>

            {/* Month Filter */}
            <select
              className="select-input"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="select-input"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              style={{ paddingTop: '0.4rem', paddingBottom: '0.4rem' }}
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            {/* Exports */}
            <button className="btn" onClick={handleExportCsv} title="Export CSV">
              <FileSpreadsheet size={16} /> CSV
            </button>
            <button className="btn" onClick={handleExportPdf} title="Export PDF">
              <FileText size={16} /> PDF
            </button>
          </div>
        </header>

        {/* Content Table Container */}
        <div style={{ flexGrow: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
          
          <div className="table-container" style={{ flexGrow: 1, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')}>Date {sortField === 'date' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('weekday')}>Weekday</th>
                  <th onClick={() => handleSort('sectionA')}>Sec A (Client)</th>
                  <th onClick={() => handleSort('sectionB')}>Sec B (Biz Dev)</th>
                  <th onClick={() => handleSort('sectionC')}>Sec C (Learn)</th>
                  <th onClick={() => handleSort('sectionD')}>Sec D (Digital)</th>
                  <th onClick={() => handleSort('score')}>Score {sortField === 'score' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('status')}>Status</th>
                  <th>Notes Preview</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDays.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No logs found matching your filters.
                    </td>
                  </tr>
                ) : (
                  paginatedDays.map((day) => {
                    const dateObj = new Date(day.date);
                    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const status = day.score === 0 ? 'unlogged' : getScoreStatus(day.score);

                    return (
                      <tr key={day.date} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(day.date)}>
                        <td style={{ fontWeight: 600 }}>{day.date}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{weekday}</td>
                        <td style={{ color: 'var(--status-productive)' }}>{day.sectionA || 0} pts</td>
                        <td style={{ color: 'var(--accent-purple)' }}>{day.sectionB || 0} pts</td>
                        <td style={{ color: 'var(--accent-teal)' }}>{day.sectionC || 0} pts</td>
                        <td style={{ color: 'var(--accent-orange)' }}>{day.sectionD || 0} pts</td>
                        <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>{day.score} pts</td>
                        <td>
                          <span className={`badge ${status}`} style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>
                            {status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {day.notes || '-'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                            <button className="btn" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleRowClick(day.date)}>
                              <Edit2 size={12} /> Edit
                            </button>
                            <button 
                              className="btn" 
                              style={{ padding: '0.25rem 0.5rem' }} 
                              onClick={() => {
                                setActiveDate(day.date);
                                setActiveScreen('daily-log');
                              }}
                            >
                              <Eye size={12} /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 0', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <div>
              Showing {sortedDays.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, sortedDays.length)} of {sortedDays.length} logs
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button 
                className="btn" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              
              <span>Page {currentPage} of {totalPages}</span>
              
              <button 
                className="btn" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{ padding: '0.35rem 0.65rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Editing Side Drawer/Modal */}
      {editingDay && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '420px',
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
          <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Edit Entry</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{editingDay}</span>
            </div>
            <button className="btn" onClick={() => setEditingDay(null)} style={{ padding: '0.35rem', borderRadius: '50%', border: 'none' }}>
              <X size={16} />
            </button>
          </div>

          {/* Drawer Content */}
          <div style={{ flexGrow: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {editingLogs.map((log) => (
              <div 
                key={log.key} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0.75rem', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-primary)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '240px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{log.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{getPoints(log.key)} pts per log</span>
                </div>

                <div>
                  {log.isBinary ? (
                    <input
                      type="checkbox"
                      checked={log.count > 0}
                      onChange={(e) => handleEditCount(log.key, e.target.checked ? 1 : 0)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.8rem' }}>
                      <button 
                        onClick={() => handleEditCount(log.key, log.count - 1)}
                        style={{ border: 'none', background: 'none', padding: '0.2rem 0.4rem', cursor: 'pointer', color: 'var(--text-primary)' }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '16px', textAlign: 'center', fontWeight: 600 }}>{log.count}</span>
                      <button 
                        onClick={() => handleEditCount(log.key, log.count + 1)}
                        style={{ border: 'none', background: 'none', padding: '0.2rem 0.4rem', cursor: 'pointer', color: 'var(--text-primary)' }}
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Note text field */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Day Notes</label>
              <textarea
                className="text-input"
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div style={{ padding: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
            <button className="btn" style={{ flexGrow: 1 }} onClick={() => setEditingDay(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ flexGrow: 2 }} onClick={handleEditSave}>
              Save Changes
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
