// src/pages/student/StudentDashboard.jsx
// Final version — adds Dashboard tab, CGPA cumulative trend, failed semester filter
// Everything else preserved exactly from previous version.

import { useState, useEffect } from 'react';
import { api, getUser, logout } from '../../utils/api';

const ACCENT = '#00e5a0';

export default function StudentDashboard() {
  const user = getUser();

  const [activeTab,     setActiveTab]     = useState('dashboard');
  const [results,       setResults]       = useState([]);
  const [sgpaList,      setSgpaList]      = useState([]);
  const [cgpaData,      setCgpaData]      = useState(null);
  const [failed,        setFailed]        = useState([]);
  const [rankData,      setRankData]      = useState(null);
  const [semesters,     setSemesters]     = useState([]);
  const [semFilter,     setSemFilter]     = useState('');
  const [failSemFilter, setFailSemFilter] = useState('');
  const [search,        setSearch]        = useState('');
  const [dlLoading,     setDlLoading]     = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [allResults, sgpa, cgpa, fail, rank] = await Promise.all([
        api.get('/student/results'),
        api.get('/student/sgpa'),
        api.get('/student/cgpa'),
        api.get('/student/failed'),
        api.get('/student/rank').catch(() => null),
      ]);
      setResults(allResults);
      setSgpaList(sgpa);
      setCgpaData(cgpa);
      setFailed(fail);
      setRankData(rank);
      const sems = [...new Set(allResults.map(r => r.semester))].sort((a, b) => a - b);
      setSemesters(sems);
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }

  // Latest semester derived values
  const latestSem     = semesters.length > 0 ? semesters[semesters.length - 1] : null;
  const latestResults = results.filter(r => r.semester === latestSem);
  const latestSGPA    = sgpaList.find(s => s.semester === latestSem)?.sgpa ?? null;
  const latestPassed  = latestResults.filter(r => r.grade_letter !== 'F').length;
  const latestFailed  = latestResults.filter(r => r.grade_letter === 'F').length;

  // Cumulative CGPA after each semester (running weighted average)
  const cumulativeCGPA = (() => {
    let totalWeighted = 0;
    let totalCredits  = 0;
    return sgpaList.map(({ semester }) => {
      const semRows = results.filter(r => r.semester === semester && r.credits > 0);
      for (const r of semRows) {
        totalWeighted += Number(r.grade_points) * Number(r.credits);
        totalCredits  += Number(r.credits);
      }
      return {
        semester,
        cgpa: totalCredits > 0 ? parseFloat((totalWeighted / totalCredits).toFixed(2)) : 0,
      };
    });
  })();

  // Results tab filtering + grouping
  const visibleResults = results.filter(r => {
    const semOk    = semFilter === '' || String(r.semester) === String(semFilter);
    const searchOk = search === '' ||
      r.course_code.toLowerCase().includes(search.toLowerCase()) ||
      r.course_name.toLowerCase().includes(search.toLowerCase());
    return semOk && searchOk;
  });
  const groupedResults = visibleResults.reduce((acc, r) => {
    if (!acc[r.semester]) acc[r.semester] = [];
    acc[r.semester].push(r);
    return acc;
  }, {});
  const groupedKeys = Object.keys(groupedResults).map(Number).sort((a, b) => a - b);

  // Failed tab filtering
  const visibleFailed = failSemFilter === ''
    ? failed
    : failed.filter(r => String(r.semester) === String(failSemFilter));

  async function downloadMarksheet(sem) {
    setDlLoading(sem);
    try {
      const res  = await api.blob(`/student/marksheet/${sem}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `marksheet_${user?.id}_sem${sem}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed: ' + err.message);
    } finally {
      setDlLoading(false);
    }
  }

  if (loading) return <Loader />;

  return (
    <div style={S.shell}>

      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.logo}>
          <span style={{ color: ACCENT }}>◆</span> MGIT Student
          <div style={{ paddingLeft: '1.1rem', marginTop: '0.15rem' }}>Result Portal</div>
        </div>

        <div style={S.sideLabel}>STUDENT</div>

        <div style={{ padding: '0 1.2rem', marginBottom: '1.8rem' }}>
          <div style={{ color: '#c0c0c0', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.15rem' }}>
            {user?.id || '—'}
          </div>
          {rankData?.section
            ? <div style={{ color: '#555', fontSize: '0.68rem' }}>{rankData.section} · Year {rankData.year}</div>
            : <div style={{ color: '#444', fontSize: '0.68rem' }}>—</div>
          }
        </div>

        {[
          { id: 'dashboard', label: 'Dashboard'        },
          { id: 'results',   label: 'Results'          },
          { id: 'gpa',       label: 'GPA Overview'     },
          { id: 'failed',    label: 'Failed Subjects',  badge: failed.length > 0 ? failed.length : null },
          { id: 'marksheet', label: 'Marksheet'        },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={S.navBtn(activeTab === tab.id)}>
            <span>{tab.label}</span>
            {tab.badge && <span style={S.badge}>{tab.badge}</span>}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button onClick={logout} style={{ ...S.navBtn(false), color: '#ff5252', borderLeft: '2px solid transparent' }}>
          Sign Out
        </button>
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>

        {error && (
          <div style={S.errorBanner}>
            ⚠ {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ff7070', cursor: 'pointer', marginLeft: '0.5rem' }}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            DASHBOARD TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <section style={{ position: 'relative' }}>
            <img
              src="/logo.jpg"
              alt="MGIT"
              style={{ position: 'absolute', top: '0', right: '0', width: '180px', height: '180px', objectFit: 'contain', opacity: 0.85 }}
            />
            <h2 style={S.h2}>Dashboard</h2>

            <div style={S.sectionLabel2}>LATEST SEMESTER {latestSem ? `— SEM ${latestSem}` : ''}</div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>

              <div style={{ ...S.bigCard, borderColor: `${ACCENT}44` }}>
                <div style={S.cardLabel}>SGPA</div>
                <div style={{ fontSize: '2.6rem', fontWeight: '700', color: ACCENT, lineHeight: 1.1 }}>
                  {latestSGPA ?? '—'}
                </div>
                <div style={{ color: '#444', fontSize: '0.68rem', marginTop: '0.3rem' }}>Semester {latestSem}</div>
              </div>

              <div style={S.bigCard}>
                <div style={S.cardLabel}>CGPA</div>
                <div style={{ fontSize: '2.6rem', fontWeight: '700', color: '#4fc3f7', lineHeight: 1.1 }}>
                  {cgpaData?.cgpa ?? '—'}
                </div>
                <div style={{ color: '#444', fontSize: '0.68rem', marginTop: '0.3rem' }}>Overall</div>
              </div>

              <div style={S.bigCard}>
                <div style={S.cardLabel}>PASSED</div>
                <div style={{ fontSize: '2.6rem', fontWeight: '700', color: '#00e5a0', lineHeight: 1.1 }}>
                  {latestPassed}
                </div>
                <div style={{ color: '#444', fontSize: '0.68rem', marginTop: '0.3rem' }}>subjects this sem</div>
              </div>

              {latestFailed > 0 && (
                <div style={{ ...S.bigCard, borderColor: '#ff525244' }}>
                  <div style={{ ...S.cardLabel, color: '#ff5252' }}>FAILED</div>
                  <div style={{ fontSize: '2.6rem', fontWeight: '700', color: '#ff5252', lineHeight: 1.1 }}>
                    {latestFailed}
                  </div>
                  <div style={{ color: '#444', fontSize: '0.68rem', marginTop: '0.3rem' }}>subjects this sem</div>
                </div>
              )}

              {rankData?.batch_rank && (
                <div style={S.bigCard}>
                  <div style={S.cardLabel}>BATCH RANK</div>
                  <div style={{ fontSize: '2.6rem', fontWeight: '700', color: '#7c6af7', lineHeight: 1.1 }}>
                    #{rankData.batch_rank}
                  </div>
                  <div style={{ color: '#444', fontSize: '0.68rem', marginTop: '0.3rem' }}>
                    of {rankData.batch_total} · Year {rankData.year}
                  </div>
                </div>
              )}
            </div>

            {latestResults.length > 0 && (
              <>
                <div style={S.sectionLabel2}>SUBJECTS — SEM {latestSem}</div>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Course Code', 'Course Name', 'Total', 'Grade', 'Points', 'Credits'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {latestResults.map((r, i) => (
                        <tr key={i} style={r.grade_letter === 'F' ? S.failRow : S.row}>
                          <td style={S.td}><code style={{ color: ACCENT, fontSize: '0.78rem' }}>{r.course_code}</code></td>
                          <td style={S.td}>{r.course_name}</td>
                          <td style={S.tdR}><strong>{r.total_marks}</strong></td>
                          <td style={S.tdR}><span style={gradeBadge(r.grade_letter)}>{r.grade_letter}</span></td>
                          <td style={S.tdR}>{r.grade_points}</td>
                          <td style={S.tdR}>{r.credits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            RESULTS TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'results' && (
          <section>
            <div style={S.pageHeader}>
              <h2 style={S.h2}>Subject Results</h2>
              <div style={{ display: 'flex', gap: '0.6rem', marginLeft: 'auto', flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Search code or subject…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={S.searchInput}
                />
                <select
                  value={semFilter}
                  onChange={e => setSemFilter(e.target.value)}
                  style={S.semSelect}
                >
                  <option value="">All Semesters</option>
                  {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>
            </div>

            {visibleResults.length === 0 ? (
              <div style={S.empty}>No subjects match your filter.</div>
            ) : (
              groupedKeys.map(sem => (
                <div key={sem} style={{ marginBottom: '1.8rem' }}>
                  {(semFilter === '' && semesters.length > 1) || search !== '' ? (
                    <div style={S.semHeader}>
                      Semester {sem}
                      <span style={{ color: '#444', fontWeight: '400', marginLeft: '0.6rem' }}>
                        · {groupedResults[sem].length} subjects
                        · SGPA {sgpaList.find(s => s.semester === sem)?.sgpa ?? '—'}
                      </span>
                    </div>
                  ) : null}
                  <div style={S.tableWrap}>
                    <table style={S.table}>
                      <thead>
                        <tr>
                          {['Sem', 'Course Code', 'Course Name', 'CIE', 'SEE', 'Total', 'Grade', 'Points', 'Credits'].map(h => (
                            <th key={h} style={S.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupedResults[sem].map((r, i) => (
                          <tr key={i} style={r.grade_letter === 'F' ? S.failRow : S.row}>
                            <td style={S.td}>{r.semester}</td>
                            <td style={S.td}><code style={{ color: ACCENT, fontSize: '0.78rem' }}>{r.course_code}</code></td>
                            <td style={S.td}>{r.course_name}</td>
                            <td style={S.tdR}>{r.cie_marks ?? '—'}</td>
                            <td style={S.tdR}>{r.see_marks  ?? '—'}</td>
                            <td style={S.tdR}><strong>{r.total_marks}</strong></td>
                            <td style={S.tdR}><span style={gradeBadge(r.grade_letter)}>{r.grade_letter}</span></td>
                            <td style={S.tdR}>{r.grade_points}</td>
                            <td style={S.tdR}>{r.credits}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            GPA OVERVIEW TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'gpa' && (
          <section>
            <h2 style={S.h2}>GPA Overview</h2>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <div style={{ ...S.bigCard, borderColor: `${ACCENT}44` }}>
                <div style={S.cardLabel}>CGPA</div>
                <div style={{ fontSize: '2.8rem', fontWeight: '700', color: ACCENT, lineHeight: 1.1 }}>
                  {cgpaData?.cgpa ?? '—'}
                </div>
                {cgpaData?.failed_count > 0 && (
                  <div style={{ color: '#ff5252', fontSize: '0.72rem', marginTop: '0.3rem' }}>
                    {cgpaData.failed_count} failed subject{cgpaData.failed_count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              {rankData?.batch_rank && (
                <div style={S.bigCard}>
                  <div style={S.cardLabel}>BATCH RANK</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: '700', color: '#7c6af7', lineHeight: 1.1 }}>
                    #{rankData.batch_rank}
                  </div>
                  <div style={{ color: '#444', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                    of {rankData.batch_total} · Year {rankData.year}
                  </div>
                </div>
              )}
              {rankData?.section_rank && (
                <div style={S.bigCard}>
                  <div style={S.cardLabel}>SECTION RANK</div>
                  <div style={{ fontSize: '2.8rem', fontWeight: '700', color: '#f5a623', lineHeight: 1.1 }}>
                    #{rankData.section_rank}
                  </div>
                  <div style={{ color: '#444', fontSize: '0.7rem', marginTop: '0.3rem' }}>
                    of {rankData.section_total} · {rankData.section}
                  </div>
                </div>
              )}
            </div>

            {sgpaList.length > 0 && (
              <>
                <div style={{ ...S.sectionLabel, marginTop: '2rem' }}>SEMESTER GPA</div>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  {sgpaList.map(({ semester, sgpa }) => (
                    <div key={semester} style={S.sgpaCard}>
                      <div style={{ color: '#555', fontSize: '0.62rem', letterSpacing: '0.1em' }}>SEM {semester}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: '700', color: sgpaColor(sgpa), lineHeight: 1.1 }}>{sgpa}</div>
                      <div style={{ color: '#444', fontSize: '0.62rem', marginTop: '0.1rem' }}>SGPA</div>
                    </div>
                  ))}
                </div>

                {/* SGPA bar chart */}
                <div style={{ marginTop: '2rem' }}>
                  <div style={S.sectionLabel}>SGPA TREND</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', marginTop: '0.5rem' }}>
                    {sgpaList.map(({ semester, sgpa }) => (
                      <div key={semester} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '64px' }}>
                        <div style={{ color: sgpaColor(sgpa), fontSize: '0.62rem', marginBottom: '3px' }}>{sgpa}</div>
                        <div style={{
                          width: '100%',
                          height: `${(sgpa / 10) * 96}px`,
                          maxHeight: '96px', minHeight: '4px',
                          background: `linear-gradient(to top, ${sgpaColor(sgpa)}dd, ${sgpaColor(sgpa)}44)`,
                          borderRadius: '3px 3px 0 0',
                        }} />
                        <div style={{ color: '#555', fontSize: '0.6rem', marginTop: '4px' }}>S{semester}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CGPA cumulative line chart — only meaningful with 2+ semesters */}
                {cumulativeCGPA.length > 1 && (
                  <div style={{ marginTop: '2.5rem' }}>
                    <div style={S.sectionLabel}>CGPA CUMULATIVE TREND</div>
                    <CumulativeLineChart data={cumulativeCGPA} />
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            FAILED SUBJECTS TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'failed' && (
          <section>
            <div style={S.pageHeader}>
              <h2 style={S.h2}>Failed Subjects</h2>
              {failed.length > 0 && (
                <select
                  value={failSemFilter}
                  onChange={e => setFailSemFilter(e.target.value)}
                  style={{ ...S.semSelect, marginLeft: 'auto' }}
                >
                  <option value="">All Semesters</option>
                  {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              )}
            </div>

            {failed.length === 0 ? (
              <div style={S.successState}>
                <div style={{ fontSize: '1.6rem', color: ACCENT, marginBottom: '0.4rem' }}>✓</div>
                No failed subjects. Keep it up.
              </div>
            ) : visibleFailed.length === 0 ? (
              <div style={S.empty}>No failed subjects in Semester {failSemFilter}.</div>
            ) : (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={S.tableWrap}>
                  <table style={S.table}>
                    <thead>
                      <tr>
                        {['Semester', 'Course Code', 'Course Name', 'CIE', 'SEE', 'Total'].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleFailed.map((r, i) => (
                        <tr key={i} style={S.failRow}>
                          <td style={S.td}>{r.semester}</td>
                          <td style={S.td}><code style={{ color: '#ff5252', fontSize: '0.78rem' }}>{r.course_code}</code></td>
                          <td style={S.td}>{r.course_name}</td>
                          <td style={S.tdR}>{r.cie_marks ?? '—'}</td>
                          <td style={S.tdR}>{r.see_marks  ?? '—'}</td>
                          <td style={S.tdR}><strong style={{ color: '#ff5252' }}>{r.total_marks}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ color: '#555', fontSize: '0.7rem', marginTop: '0.5rem' }}>
                  {visibleFailed.length} failed subject{visibleFailed.length !== 1 ? 's' : ''}
                  {failSemFilter ? ` in Semester ${failSemFilter}` : ' across all semesters'}.
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════════════════
            MARKSHEET TAB
        ══════════════════════════════════════════════════ */}
        {activeTab === 'marksheet' && (
          <section>
            <h2 style={S.h2}>Download Marksheet</h2>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              {semesters.map(sem => (
                <button
                  key={sem}
                  onClick={() => downloadMarksheet(sem)}
                  disabled={dlLoading === sem}
                  style={S.dlBtn(dlLoading === sem)}
                >
                  {dlLoading === sem ? 'Generating…' : `Semester ${sem}  ↓`}
                </button>
              ))}
            </div>
            <p style={{ color: '#444', fontSize: '0.75rem', marginTop: '1.5rem', lineHeight: 1.6 }}>
              PDF marksheets are generated on demand. Each download reflects the latest recorded marks.
            </p>
          </section>
        )}

      </main>
    </div>
  );
}

// ── CGPA Cumulative Line Chart — pure SVG, zero dependencies ─────────────────

function CumulativeLineChart({ data }) {
  const W  = 520, H = 150;
  const PAD = { top: 22, right: 24, bottom: 30, left: 42 };
  const cW  = W - PAD.left - PAD.right;
  const cH  = H - PAD.top  - PAD.bottom;

  const vals    = data.map(d => d.cgpa);
  const minVal  = Math.max(0,  Math.min(...vals) - 0.5);
  const maxVal  = Math.min(10, Math.max(...vals) + 0.5);
  const range   = maxVal - minVal || 1;

  const xS = i    => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * cW : cW / 2);
  const yS = val  => PAD.top  + cH - ((val - minVal) / range) * cH;

  const pts      = data.map((d, i) => `${xS(i)},${yS(d.cgpa)}`).join(' ');
  const areaFill = `${pts} ${xS(data.length - 1)},${PAD.top + cH} ${xS(0)},${PAD.top + cH}`;

  const yTicks   = [minVal, (minVal + maxVal) / 2, maxVal].map(v => parseFloat(v.toFixed(1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: `${W}px`, height: `${H}px`, display: 'block' }}>
      {/* Grid + Y labels */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PAD.left} y1={yS(t)} x2={PAD.left + cW} y2={yS(t)} stroke="#161b22" strokeWidth="1" />
          <text x={PAD.left - 6} y={yS(t) + 4} fill="#444" fontSize="9" textAnchor="end">{t}</text>
        </g>
      ))}

      {/* Area fill */}
      <polygon points={areaFill} fill="#4fc3f711" />

      {/* Line */}
      <polyline points={pts} fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* Points + value labels + X labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xS(i)} cy={yS(d.cgpa)} r="3.5" fill="#4fc3f7" />
          <text x={xS(i)} y={yS(d.cgpa) - 8} fill="#4fc3f7" fontSize="9" textAnchor="middle">{d.cgpa}</text>
          <text x={xS(i)} y={PAD.top + cH + 14} fill="#555" fontSize="9" textAnchor="middle">S{d.semester}</text>
        </g>
      ))}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + cH} stroke="#21262d" strokeWidth="1" />
      <line x1={PAD.left} y1={PAD.top + cH} x2={PAD.left + cW} y2={PAD.top + cH} stroke="#21262d" strokeWidth="1" />
    </svg>
  );
}

// ── Style tokens ──────────────────────────────────────────────────────────────

const S = {
  shell:        { display: 'flex', minHeight: '100vh', background: '#0d1117', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: '#c0c0c0' },
  sidebar:      { width: '230px', minHeight: '100vh', background: '#0d1117', borderRight: '1px solid #161b22', display: 'flex', flexDirection: 'column', padding: '1.4rem 0', flexShrink: 0 },
  logo:         { fontSize: '0.82rem', fontWeight: '700', padding: '0 1.2rem', marginBottom: '1.4rem', letterSpacing: '0.04em', color: '#e0e0e0' },
  sideLabel:    { color: '#444', fontSize: '0.62rem', letterSpacing: '0.14em', padding: '0 1.2rem', marginBottom: '0.6rem' },
  sectionLabel: { color: '#444', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '0.6rem' },
  sectionLabel2:{ color: '#444', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '0.8rem', marginTop: '0.2rem' },
  navBtn:       (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '0.6rem 1.2rem',
    background:   active ? `${ACCENT}14` : 'transparent',
    border:       'none',
    borderLeft:   active ? `2px solid ${ACCENT}` : '2px solid transparent',
    color:        active ? ACCENT : '#555',
    fontSize:     '0.78rem', cursor: 'pointer', textAlign: 'left',
    fontFamily:   'inherit', letterSpacing: '0.04em', transition: 'color 0.15s',
  }),
  badge:        { background: '#ff4d4d', color: '#fff', borderRadius: '9px', padding: '1px 6px', fontSize: '0.58rem', fontWeight: '700' },
  main:         { flex: 1, padding: '2rem 2.5rem', overflowY: 'auto', minWidth: 0 },
  pageHeader:   { display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.2rem', flexWrap: 'wrap' },
  h2:           { fontSize: '1rem', fontWeight: '600', color: '#e0e0e0', letterSpacing: '0.04em', margin: 0 },
  searchInput:  { background: '#161b22', border: '1px solid #21262d', borderRadius: '4px', color: '#aaa', padding: '0.35rem 0.7rem', fontSize: '0.72rem', fontFamily: 'inherit', outline: 'none', width: '180px' },
  semSelect: { background: '#161b22', border: '1px solid #21262d', borderRadius: '4px', color: '#aaa', padding: '0.35rem 1.6rem 0.35rem 0.6rem', fontSize: '0.72rem', fontFamily: 'inherit', cursor: 'pointer', appearance: 'none' },
  semHeader:    { color: ACCENT, fontSize: '0.72rem', fontWeight: '600', letterSpacing: '0.06em', marginBottom: '0.5rem', padding: '0.2rem 0' },
  tableWrap:    { overflowX: 'auto', borderRadius: '6px', border: '1px solid #161b22' },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' },
  th:           { background: '#0d1117', color: '#444', padding: '0.55rem 0.8rem', textAlign: 'left', fontWeight: '500', letterSpacing: '0.07em', fontSize: '0.67rem', whiteSpace: 'nowrap', borderBottom: '1px solid #161b22' },
  td:           { padding: '0.52rem 0.8rem', borderBottom: '1px solid #111519', color: '#bbb', whiteSpace: 'nowrap' },
  tdR:          { padding: '0.52rem 0.8rem', borderBottom: '1px solid #111519', color: '#bbb', textAlign: 'right', whiteSpace: 'nowrap' },
  row:          { background: 'transparent' },
  failRow:      { background: '#3d000a22' },
  empty:        { color: '#444', fontSize: '0.8rem', padding: '2rem 0' },
  successState: { textAlign: 'center', color: ACCENT, padding: '3rem 2rem', fontSize: '0.85rem' },
  errorBanner:  { background: '#3d000a', border: '1px solid #ff4d4d44', color: '#ff7070', borderRadius: '4px', padding: '0.6rem 1rem', fontSize: '0.78rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center' },
  cardLabel:    { color: '#555', fontSize: '0.62rem', letterSpacing: '0.14em', marginBottom: '0.4rem' },
  bigCard:      { background: '#161b22', border: '1px solid #21262d', borderRadius: '8px', padding: '1.2rem 1.6rem', minWidth: '130px' },
  sgpaCard:     { background: '#161b22', border: '1px solid #21262d', borderRadius: '6px', padding: '0.8rem 1.2rem', minWidth: '80px', textAlign: 'center' },
  dlBtn:        (dis) => ({ padding: '0.6rem 1.3rem', background: dis ? '#161b22' : `${ACCENT}18`, border: `1px solid ${dis ? '#21262d' : ACCENT + '55'}`, color: dis ? '#444' : ACCENT, borderRadius: '4px', cursor: dis ? 'not-allowed' : 'pointer', fontSize: '0.78rem', fontFamily: 'inherit', letterSpacing: '0.04em' }),
};

function gradeBadge(l) { const c = gradeColor(l); return { background: `${c}20`, color: c, borderRadius: '4px', padding: '2px 7px', fontSize: '0.72rem', fontWeight: '600', display: 'inline-block' }; }
function gradeColor(l) { return ({ 'O': '#00e5a0', 'A+': '#4fc3f7', 'A': '#4fc3f7', 'B+': '#f5a623', 'B': '#ffd54f', 'C': '#e0e0e0', 'D': '#9e9e9e', 'E': '#9e9e9e', 'F': '#ff5252' })[l] || '#888'; }
function sgpaColor(v)  { return v >= 8.5 ? '#00e5a0' : v >= 7.0 ? '#4fc3f7' : v >= 5.5 ? '#f5a623' : '#ff5252'; }
function Loader()      { return <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', color: '#333', fontSize: '0.8rem' }}>Loading…</div>; }