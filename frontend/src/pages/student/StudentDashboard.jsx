// src/pages/student/StudentDashboard.jsx

import { useState, useEffect } from 'react';
import { api, getUser, logout } from '../../utils/api';

const ACCENT = '#00e5a0';

export default function StudentDashboard() {
  const user = getUser();

  const [results,      setResults]      = useState([]);
  const [sgpaList,     setSgpaList]     = useState([]);
  const [cgpaData,     setCgpaData]     = useState(null);
  const [failed,       setFailed]       = useState([]);
  const [semester,     setSemester]     = useState('');
  const [semesters,    setSemesters]    = useState([]);
  const [activeTab,    setActiveTab]    = useState('results');
  const [loading,      setLoading]      = useState(true);
  const [dlLoading,    setDlLoading]    = useState(false);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadResults(); }, [semester]);

  async function loadAll() {
    try {
      const [sgpa, cgpa, fail, allResults] = await Promise.all([
        api.get('/student/sgpa'),
        api.get('/student/cgpa'),
        api.get('/student/failed'),
        api.get('/student/results'),
      ]);
      setSgpaList(sgpa);
      setCgpaData(cgpa);
      setFailed(fail);
      setResults(allResults);
      // Extract unique semesters
      const sems = [...new Set(allResults.map(r => r.semester))].sort((a,b) => a-b);
      setSemesters(sems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadResults() {
    try {
      const url = semester ? `/student/results?semester=${semester}` : '/student/results';
      const data = await api.get(url);
      setResults(data);
    } catch (err) { console.error(err); }
  }

  async function downloadMarksheet(sem) {
    setDlLoading(sem);
    try {
      const res  = await api.blob(`/student/marksheet/${sem}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `marksheet_sem${sem}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { alert('Download failed: ' + err.message); }
    finally { setDlLoading(false); }
  }

  if (loading) return <Loader />;

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ color: ACCENT }}>◈</span> MGIT Results Portal
        </div>
        <div style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.12em', padding: '0 1.2rem', marginBottom: '1.5rem' }}>
          STUDENT
        </div>
        <div style={{ color: '#aaa', fontSize: '0.78rem', padding: '0 1.2rem', marginBottom: '0.3rem' }}>
          {user?.id}
        </div>
        <div style={{ color: '#555', fontSize: '0.7rem', padding: '0 1.2rem', marginBottom: '2rem' }}>
          {user?.section || '—'}
        </div>

        {[
          { id: 'results',  label: 'Results'       },
          { id: 'gpa',      label: 'GPA Overview'   },
          { id: 'failed',   label: 'Failed Subjects' },
          { id: 'marksheet',label: 'Marksheet'      },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={styles.navBtn(activeTab === tab.id)}
          >
            {tab.label}
            {tab.id === 'failed' && failed.length > 0 && (
              <span style={styles.badge}>{failed.length}</span>
            )}
          </button>
        ))}

        <button onClick={logout} style={{ ...styles.navBtn(false), marginTop: 'auto', color: '#ff6060' }}>
          Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main style={styles.main}>

        {/* ── RESULTS TAB ── */}
        {activeTab === 'results' && (
          <section>
            <div style={styles.pageHeader}>
              <h2 style={styles.h2}>Subject Results</h2>
              <select
                value={semester}
                onChange={e => setSemester(e.target.value)}
                style={styles.select}
              >
                <option value="">All Semesters</option>
                {semesters.map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Sem','Course Code','Course Name','CIE','SEE','Total','Grade','Points','Credits'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} style={r.grade_letter === 'F' ? styles.failRow : styles.row}>
                      <td style={styles.td}>{r.semester}</td>
                      <td style={styles.td}><code style={{ color: ACCENT, fontSize: '0.78rem' }}>{r.course_code}</code></td>
                      <td style={styles.td}>{r.course_name}</td>
                      <td style={styles.tdNum}>{r.cie_marks ?? '—'}</td>
                      <td style={styles.tdNum}>{r.see_marks ?? '—'}</td>
                      <td style={styles.tdNum}><strong>{r.total_marks}</strong></td>
                      <td style={styles.tdNum}>
                        <span style={gradeBadge(r.grade_letter)}>{r.grade_letter}</span>
                      </td>
                      <td style={styles.tdNum}>{r.grade_points}</td>
                      <td style={styles.tdNum}>{r.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── GPA TAB ── */}
        {activeTab === 'gpa' && (
          <section>
            <h2 style={styles.h2}>GPA Overview</h2>

            {/* CGPA card */}
            <div style={styles.cgpaCard}>
              <div style={{ color: '#666', fontSize: '0.7rem', letterSpacing: '0.15em' }}>CGPA</div>
              <div style={{ fontSize: '3rem', fontWeight: '700', color: ACCENT, lineHeight: 1.1 }}>
                {cgpaData?.cgpa ?? '—'}
              </div>
              {cgpaData?.failed_count > 0 && (
                <div style={{ color: '#ff6060', fontSize: '0.75rem', marginTop: '0.4rem' }}>
                  {cgpaData.failed_count} failed subject{cgpaData.failed_count > 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* SGPA per semester */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
              {sgpaList.map(({ semester, sgpa }) => (
                <div key={semester} style={styles.sgpaCard}>
                  <div style={{ color: '#555', fontSize: '0.65rem', letterSpacing: '0.12em' }}>SEM {semester}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: '700', color: sgpaColor(sgpa) }}>{sgpa}</div>
                  <div style={{ fontSize: '0.65rem', color: '#444' }}>SGPA</div>
                </div>
              ))}
            </div>

            {/* Mini bar chart */}
            {sgpaList.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <div style={{ color: '#444', fontSize: '0.7rem', letterSpacing: '0.1em', marginBottom: '0.8rem' }}>
                  SGPA TREND
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', height: '100px' }}>
                  {sgpaList.map(({ semester, sgpa }) => (
                    <div key={semester} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                      <div style={{ fontSize: '0.6rem', color: '#666', marginBottom: '3px' }}>{sgpa}</div>
                      <div style={{
                        width:        '100%',
                        height:       `${(sgpa / 10) * 80}px`,
                        background:   `linear-gradient(to top, ${ACCENT}cc, ${ACCENT}44)`,
                        borderRadius: '3px 3px 0 0',
                        minHeight:    '4px',
                      }} />
                      <div style={{ fontSize: '0.6rem', color: '#555', marginTop: '4px' }}>S{semester}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── FAILED TAB ── */}
        {activeTab === 'failed' && (
          <section>
            <h2 style={styles.h2}>Failed Subjects</h2>
            {failed.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                No failed subjects. Keep it up.
              </div>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Semester','Course Code','Course Name','CIE','SEE','Total'].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {failed.map((r, i) => (
                      <tr key={i} style={styles.failRow}>
                        <td style={styles.td}>{r.semester}</td>
                        <td style={styles.td}><code style={{ color: '#ff6060', fontSize: '0.78rem' }}>{r.course_code}</code></td>
                        <td style={styles.td}>{r.course_name}</td>
                        <td style={styles.tdNum}>{r.cie_marks ?? '—'}</td>
                        <td style={styles.tdNum}>{r.see_marks ?? '—'}</td>
                        <td style={styles.tdNum}><strong style={{ color: '#ff6060' }}>{r.total_marks}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── MARKSHEET TAB ── */}
        {activeTab === 'marksheet' && (
          <section>
            <h2 style={styles.h2}>Download Marksheet</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {semesters.map(sem => (
                <button
                  key={sem}
                  onClick={() => downloadMarksheet(sem)}
                  disabled={dlLoading === sem}
                  style={styles.dlBtn(dlLoading === sem)}
                >
                  {dlLoading === sem ? 'Generating...' : `Semester ${sem}  ↓`}
                </button>
              ))}
            </div>
            <p style={{ color: '#444', fontSize: '0.75rem', marginTop: '1.5rem' }}>
              PDF marksheets are generated on demand. Each download reflects the latest recorded marks.
            </p>
          </section>
        )}

      </main>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  shell: {
    display:    'flex',
    minHeight:  '100vh',
    background: '#0d0f14',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    color:      '#c8c8c8',
  },
  sidebar: {
    width:          '230px',
    minHeight:      '100vh',
    background:     '#10131a',
    borderRight:    '1px solid #1e2130',
    display:        'flex',
    flexDirection:  'column',
    padding:        '1.5rem 0',
    flexShrink:     0,
  },
  logo: {
    fontSize:      '0.85rem',
    fontWeight:    '700',
    padding:       '0 1.2rem',
    marginBottom:  '1.5rem',
    letterSpacing: '0.05em',
  },
  navBtn: (active) => ({
    display:       'block',
    width:         '100%',
    padding:       '0.65rem 1.2rem',
    background:    active ? `${ACCENT}18` : 'transparent',
    border:        'none',
    borderLeft:    active ? `2px solid ${ACCENT}` : '2px solid transparent',
    color:         active ? ACCENT : '#555',
    fontSize:      '0.75rem',
    cursor:        'pointer',
    textAlign:     'left',
    fontFamily:    'inherit',
    letterSpacing: '0.05em',
    display:       'flex',
    alignItems:    'center',
    gap:           '0.5rem',
  }),
  badge: {
    background:   '#ff4d4d',
    color:        '#fff',
    borderRadius: '9px',
    padding:      '1px 6px',
    fontSize:     '0.6rem',
    marginLeft:   'auto',
  },
  main: {
    flex:     1,
    padding:  '2rem 2.5rem',
    overflowY: 'auto',
  },
  pageHeader: {
    display:       'flex',
    alignItems:    'center',
    gap:           '1rem',
    marginBottom:  '1.2rem',
    flexWrap:      'wrap',
  },
  h2: {
    fontSize:      '1rem',
    fontWeight:    '600',
    color:         '#e0e0e0',
    letterSpacing: '0.05em',
    margin:        0,
  },
  select: {
    background:   '#1a1d24',
    border:       '1px solid #2a2d36',
    color:        '#aaa',
    padding:      '0.35rem 0.7rem',
    borderRadius: '4px',
    fontSize:     '0.75rem',
    fontFamily:   'inherit',
    cursor:       'pointer',
  },
  tableWrap: {
    overflowX:    'auto',
    borderRadius: '6px',
    border:       '1px solid #1e2130',
  },
  table: {
    width:           '100%',
    borderCollapse:  'collapse',
    fontSize:        '0.78rem',
  },
  th: {
    background:    '#13161e',
    color:         '#555',
    padding:       '0.6rem 0.8rem',
    textAlign:     'left',
    fontWeight:    '500',
    letterSpacing: '0.08em',
    fontSize:      '0.67rem',
    whiteSpace:    'nowrap',
    borderBottom:  '1px solid #1e2130',
  },
  td: {
    padding:       '0.55rem 0.8rem',
    borderBottom:  '1px solid #181b22',
    color:         '#bbb',
    whiteSpace:    'nowrap',
  },
  tdNum: {
    padding:       '0.55rem 0.8rem',
    borderBottom:  '1px solid #181b22',
    color:         '#bbb',
    textAlign:     'right',
    whiteSpace:    'nowrap',
  },
  row:     { background: 'transparent' },
  failRow: { background: '#ff4d4d08' },
  cgpaCard: {
    background:   '#13161e',
    border:       `1px solid ${ACCENT}33`,
    borderRadius: '8px',
    padding:      '1.5rem 2rem',
    display:      'inline-block',
    marginTop:    '0.5rem',
  },
  sgpaCard: {
    background:   '#13161e',
    border:       '1px solid #1e2130',
    borderRadius: '6px',
    padding:      '1rem 1.5rem',
    minWidth:     '90px',
    textAlign:    'center',
  },
  emptyState: {
    textAlign:  'center',
    color:      ACCENT,
    padding:    '3rem',
    fontSize:   '0.85rem',
  },
  dlBtn: (disabled) => ({
    padding:      '0.65rem 1.4rem',
    background:   disabled ? '#1a1d24' : `${ACCENT}22`,
    border:       `1px solid ${disabled ? '#2a2d36' : ACCENT + '55'}`,
    color:        disabled ? '#444' : ACCENT,
    borderRadius: '4px',
    cursor:       disabled ? 'not-allowed' : 'pointer',
    fontSize:     '0.78rem',
    fontFamily:   'inherit',
    letterSpacing:'0.05em',
  }),
};

function gradeBadge(letter) {
  const colors = {
    'O': '#00e5a0', 'A+': '#4fc3f7', 'A': '#81d4fa',
    'B+': '#ffb74d', 'B': '#ffd54f', 'C': '#e0e0e0',
    'D': '#bdbdbd',  'E': '#9e9e9e', 'F': '#ff5252',
  };
  return {
    background:   `${colors[letter] || '#888'}22`,
    color:        colors[letter] || '#888',
    borderRadius: '4px',
    padding:      '1px 6px',
    fontSize:     '0.72rem',
    fontWeight:   '600',
  };
}

function sgpaColor(sgpa) {
  if (sgpa >= 8.5) return '#00e5a0';
  if (sgpa >= 7)   return '#4fc3f7';
  if (sgpa >= 5.5) return '#ffb74d';
  return '#ff5252';
}

function Loader() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#333' }}>
      Loading...
    </div>
  );
}