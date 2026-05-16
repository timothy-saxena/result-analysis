// src/pages/faculty/FacultyDashboard.jsx

import { useState, useEffect } from 'react';
import { api, getUser, logout } from '../../utils/api';

const ACCENT = '#f5a623';

export default function FacultyDashboard() {
  const user = getUser();

  const [classResults,   setClassResults]   = useState([]);
  const [analytics,      setAnalytics]      = useState(null);
  const [semester,       setSemester]       = useState('');
  const [activeTab,      setActiveTab]      = useState('class');
  const [loading,        setLoading]        = useState(true);
  const [editRow,        setEditRow]        = useState(null);   // { ht_no, semester, cie_marks, see_marks }
  const [editVals,       setEditVals]       = useState({});
  const [saveMsg,        setSaveMsg]        = useState('');
  const [exportLoading,  setExportLoading]  = useState(false);

  useEffect(() => { loadAll(); }, [semester]);

  async function loadAll() {
    setLoading(true);
    try {
      const semParam = semester ? `?semester=${semester}` : '';
      const [cls, ana] = await Promise.all([
        api.get(`/faculty/class-results${semParam}`),
        api.get(`/faculty/analytics${semParam}`),
      ]);
      setClassResults(cls);
      setAnalytics(ana);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function startEdit(row) {
    setEditRow(`${row.ht_no}_${row.semester}`);
    setEditVals({ cie_marks: row.cie_marks, see_marks: row.see_marks ?? '' });
    setSaveMsg('');
  }

  async function saveEdit(row) {
    try {
      await api.post('/faculty/update-marks', {
        ht_no:     row.ht_no,
        semester:  row.semester,
        cie_marks: parseInt(editVals.cie_marks),
        see_marks: editVals.see_marks !== '' ? parseInt(editVals.see_marks) : null,
      });
      setSaveMsg('Saved ✓');
      setEditRow(null);
      loadAll();
    } catch (err) {
      setSaveMsg('Error: ' + err.message);
    }
  }

  async function exportCSV() {
    setExportLoading(true);
    try {
      const semParam = semester ? `?semester=${semester}` : '';
      const res  = await api.blob(`/faculty/export${semParam}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `class_results.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Export failed: ' + err.message); }
    finally { setExportLoading(false); }
  }

  const semesters = [...new Set(classResults.map(r => r.semester))].sort((a,b) => a-b);

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ color: ACCENT }}>◉</span> MGIT Resuts Portal
        </div>
        <div style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.12em', padding: '0 1.2rem', marginBottom: '1.5rem' }}>
          FACULTY
        </div>
        <div style={{ color: '#aaa', fontSize: '0.78rem', padding: '0 1.2rem', marginBottom: '0.2rem' }}>
          {user?.name || user?.username || '—'}
        </div>
        <div style={{ color: '#555', fontSize: '0.68rem', padding: '0 1.2rem', marginBottom: '2rem', fontFamily: 'monospace' }}>
          {user?.course_code || '—'}
        </div>

        {[
          { id: 'class',     label: 'Class Results' },
          { id: 'analytics', label: 'Analytics'     },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={styles.navBtn(activeTab === tab.id)}>
            {tab.label}
          </button>
        ))}

        <div style={{ padding: '0 1.2rem', marginTop: '1rem' }}>
          <select
            value={semester}
            onChange={e => setSemester(e.target.value)}
            style={styles.select}
          >
            <option value="">All Semesters</option>
            {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>

        <button onClick={logout} style={{ ...styles.navBtn(false), marginTop: 'auto', color: '#ff6060' }}>
          Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>

        {/* ── CLASS RESULTS ── */}
        {activeTab === 'class' && (
          <section>
            <div style={styles.pageHeader}>
              <h2 style={styles.h2}>Class Results</h2>
              <div style={{ display: 'flex', gap: '0.6rem', marginLeft: 'auto', alignItems: 'center' }}>
                {saveMsg && <span style={{ color: saveMsg.startsWith('Error') ? '#ff6060' : ACCENT, fontSize: '0.75rem' }}>{saveMsg}</span>}
                <button onClick={exportCSV} disabled={exportLoading} style={styles.exportBtn}>
                  {exportLoading ? 'Exporting...' : 'Export CSV ↓'}
                </button>
              </div>
            </div>

            {loading ? <div style={styles.loadText}>Loading...</div> : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['HT No','Section','Sem','CIE','SEE','Total','Grade','Points',''].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {classResults.map((r, i) => {
                      const key    = `${r.ht_no}_${r.semester}`;
                      const isEdit = editRow === key;
                      return (
                        <tr key={i} style={r.grade_letter === 'F' ? styles.failRow : styles.row}>
                          <td style={styles.td}><code style={{ color: ACCENT, fontSize: '0.75rem' }}>{r.ht_no}</code></td>
                          <td style={styles.td}>{r.section}</td>
                          <td style={styles.tdNum}>{r.semester}</td>

                          {/* Editable CIE */}
                          <td style={styles.tdNum}>
                            {isEdit
                              ? <input type="number" value={editVals.cie_marks} onChange={e => setEditVals(v => ({...v, cie_marks: e.target.value}))} style={styles.editInput} />
                              : r.cie_marks ?? '—'}
                          </td>

                          {/* Editable SEE */}
                          <td style={styles.tdNum}>
                            {isEdit
                              ? <input type="number" value={editVals.see_marks} onChange={e => setEditVals(v => ({...v, see_marks: e.target.value}))} style={styles.editInput} placeholder="—" />
                              : r.see_marks ?? '—'}
                          </td>

                          <td style={styles.tdNum}><strong>{r.total_marks}</strong></td>
                          <td style={styles.tdNum}>
                            <span style={gradeBadge(r.grade_letter)}>{r.grade_letter}</span>
                          </td>
                          <td style={styles.tdNum}>{r.grade_points}</td>
                          <td style={styles.tdNum}>
                            {isEdit
                              ? <div style={{ display: 'flex', gap: '0.3rem' }}>
                                  <button onClick={() => saveEdit(r)}   style={styles.microBtn(ACCENT)}>✓</button>
                                  <button onClick={() => setEditRow(null)} style={styles.microBtn('#555')}>✕</button>
                                </div>
                              : <button onClick={() => startEdit(r)} style={styles.microBtn('#555')}>edit</button>
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && analytics && (
          <section>
            <h2 style={styles.h2}>Subject Analytics</h2>

            {/* Summary cards */}
            <div style={styles.cardRow}>
              {[
                { label: 'Students',   value: analytics.summary.total_students },
                { label: 'Avg Marks',  value: analytics.summary.avg_marks },
                { label: 'Highest',    value: analytics.summary.highest_marks },
                { label: 'Lowest',     value: analytics.summary.lowest_marks },
                { label: 'Pass',       value: analytics.summary.pass_count, color: '#00e5a0' },
                { label: 'Fail',       value: analytics.summary.fail_count, color: '#ff5252' },
              ].map(card => (
                <div key={card.label} style={styles.statCard}>
                  <div style={{ color: '#555', fontSize: '0.62rem', letterSpacing: '0.12em' }}>{card.label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700', color: card.color || ACCENT }}>{card.value ?? '—'}</div>
                </div>
              ))}
            </div>

            {/* Top performers */}
            <div style={{ marginTop: '2rem' }}>
              <div style={styles.sectionLabel}>TOP PERFORMERS</div>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>{['Rank','HT No','Section','Semester','Total Marks','Grade'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {analytics.top_performers.map((s, i) => (
                      <tr key={i} style={styles.row}>
                        <td style={styles.td}><span style={{ color: ACCENT }}>#{i + 1}</span></td>
                        <td style={styles.td}><code style={{ color: ACCENT, fontSize: '0.75rem' }}>{s.ht_no}</code></td>
                        <td style={styles.td}>{s.section}</td>
                        <td style={styles.tdNum}>{s.semester}</td>
                        <td style={styles.tdNum}><strong>{s.total_marks}</strong></td>
                        <td style={styles.tdNum}><span style={gradeBadge(s.grade_letter)}>{s.grade_letter}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grade distribution bars */}
            <div style={{ marginTop: '2rem' }}>
              <div style={styles.sectionLabel}>GRADE DISTRIBUTION</div>
              <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                {analytics.grade_distribution.map(({ grade_letter, count }) => {
                  const total = analytics.summary.total_students || 1;
                  const pct   = Math.round((count / total) * 100);
                  return (
                    <div key={grade_letter} style={{ textAlign: 'center', minWidth: '50px' }}>
                      <div style={{ color: '#555', fontSize: '0.62rem', marginBottom: '4px' }}>{pct}%</div>
                      <div style={{
                        height:       `${Math.max(pct, 4)}px`,
                        background:   `${gradeColor(grade_letter)}88`,
                        borderRadius: '3px 3px 0 0',
                        maxHeight:    '80px',
                        minHeight:    '4px',
                      }} />
                      <div style={{ color: gradeColor(grade_letter), fontSize: '0.7rem', marginTop: '4px', fontWeight: '600' }}>{grade_letter}</div>
                      <div style={{ color: '#444', fontSize: '0.62rem' }}>{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section breakdown */}
            {analytics.section_breakdown.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <div style={styles.sectionLabel}>SECTION BREAKDOWN</div>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>{['Section','Students','Avg Marks','Pass','Fail'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {analytics.section_breakdown.map((s, i) => (
                        <tr key={i} style={styles.row}>
                          <td style={styles.td}>{s.section}</td>
                          <td style={styles.tdNum}>{s.students}</td>
                          <td style={styles.tdNum}>{s.avg_marks}</td>
                          <td style={styles.tdNum} style={{ ...styles.tdNum, color: '#00e5a0' }}>{s.pass_count}</td>
                          <td style={styles.tdNum} style={{ ...styles.tdNum, color: '#ff5252' }}>{s.fail_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  shell:     { display: 'flex', minHeight: '100vh', background: '#0d0f14', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: '#c8c8c8' },
  sidebar:   { width: '230px', minHeight: '100vh', background: '#10131a', borderRight: '1px solid #1e2130', display: 'flex', flexDirection: 'column', padding: '1.5rem 0', flexShrink: 0 },
  logo:      { fontSize: '0.85rem', fontWeight: '700', padding: '0 1.2rem', marginBottom: '1.5rem', letterSpacing: '0.05em' },
  navBtn:    (active) => ({ display: 'flex', alignItems: 'center', width: '100%', padding: '0.65rem 1.2rem', background: active ? `${ACCENT}18` : 'transparent', border: 'none', borderLeft: active ? `2px solid ${ACCENT}` : '2px solid transparent', color: active ? ACCENT : '#555', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', letterSpacing: '0.05em' }),
  select:    { width: '100%', background: '#1a1d24', border: '1px solid #2a2d36', color: '#aaa', padding: '0.35rem 0.5rem', borderRadius: '4px', fontSize: '0.72rem', fontFamily: 'inherit', cursor: 'pointer' },
  main:      { flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' },
  pageHeader:{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem', flexWrap: 'wrap' },
  h2:        { fontSize: '1rem', fontWeight: '600', color: '#e0e0e0', letterSpacing: '0.05em', margin: 0 },
  loadText:  { color: '#333', fontSize: '0.8rem', padding: '2rem' },
  tableWrap: { overflowX: 'auto', borderRadius: '6px', border: '1px solid #1e2130' },
  table:     { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
  th:        { background: '#13161e', color: '#555', padding: '0.6rem 0.8rem', textAlign: 'left', fontWeight: '500', letterSpacing: '0.08em', fontSize: '0.67rem', whiteSpace: 'nowrap', borderBottom: '1px solid #1e2130' },
  td:        { padding: '0.55rem 0.8rem', borderBottom: '1px solid #181b22', color: '#bbb', whiteSpace: 'nowrap' },
  tdNum:     { padding: '0.55rem 0.8rem', borderBottom: '1px solid #181b22', color: '#bbb', textAlign: 'right', whiteSpace: 'nowrap' },
  row:       { background: 'transparent' },
  failRow:   { background: '#ff4d4d08' },
  editInput: { width: '56px', background: '#0d0f14', border: `1px solid ${ACCENT}55`, color: '#e0e0e0', padding: '2px 4px', borderRadius: '3px', fontSize: '0.75rem', fontFamily: 'inherit', textAlign: 'right' },
  microBtn:  (color) => ({ padding: '2px 7px', background: `${color}22`, border: `1px solid ${color}55`, color: color, borderRadius: '3px', cursor: 'pointer', fontSize: '0.65rem', fontFamily: 'inherit' }),
  exportBtn: { padding: '0.4rem 0.9rem', background: `${ACCENT}22`, border: `1px solid ${ACCENT}55`, color: ACCENT, borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' },
  cardRow:   { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' },
  statCard:  { background: '#13161e', border: '1px solid #1e2130', borderRadius: '6px', padding: '0.8rem 1.2rem', minWidth: '90px' },
  sectionLabel: { color: '#444', fontSize: '0.65rem', letterSpacing: '0.14em', marginBottom: '0.8rem' },
};

function gradeBadge(letter) {
  const colors = { 'O': '#00e5a0', 'A+': '#4fc3f7', 'A': '#81d4fa', 'B+': '#ffb74d', 'B': '#ffd54f', 'C': '#e0e0e0', 'D': '#bdbdbd', 'E': '#9e9e9e', 'F': '#ff5252' };
  const c = colors[letter] || '#888';
  return { background: `${c}22`, color: c, borderRadius: '4px', padding: '1px 6px', fontSize: '0.72rem', fontWeight: '600' };
}

function gradeColor(letter) {
  const colors = { 'O': '#00e5a0', 'A+': '#4fc3f7', 'A': '#81d4fa', 'B+': '#ffb74d', 'B': '#ffd54f', 'C': '#e0e0e0', 'D': '#bdbdbd', 'E': '#9e9e9e', 'F': '#ff5252' };
  return colors[letter] || '#888';
}