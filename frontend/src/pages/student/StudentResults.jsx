import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Filter } from 'lucide-react';

const gradeClass = (g) => {
  if (g === 'O')  return 'grade-O';
  if (g === 'A+') return 'grade-Apl';
  if (g === 'A')  return 'grade-A';
  if (g === 'B')  return 'grade-B';
  if (g === 'C')  return 'grade-C';
  if (g === 'F')  return 'grade-F';
  return 'bg-slate-100 text-slate-600';
};

export default function StudentResults() {
  const [allResults, setAll]     = useState([]);
  const [semester, setSemester]  = useState('');
  const [loading, setLoading]    = useState(true);
  const [sgpaMap, setSgpaMap]    = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const [resultsRes, sgpaRes] = await Promise.all([
          api.get('/student/results'),
          api.get('/student/sgpa'),
        ]);
        setAll(resultsRes.data);
        const map = {};
        sgpaRes.data.forEach(s => { map[s.semester] = s.sgpa; });
        setSgpaMap(map);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const semesters = [...new Set(allResults.map(r => r.semester))].sort();
  const filtered  = semester ? allResults.filter(r => r.semester === parseInt(semester)) : allResults;

  // Group by semester for display
  const grouped = filtered.reduce((acc, r) => {
    if (!acc[r.semester]) acc[r.semester] = [];
    acc[r.semester].push(r);
    return acc;
  }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-950">My Results</h1>
          <p className="text-slate-400 text-sm mt-1">All subject results across semesters</p>
        </div>

        {/* Semester filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={semester}
            onChange={e => setSemester(e.target.value)}
            className="input w-40"
          >
            <option value="">All Semesters</option>
            {semesters.map(s => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </select>
        </div>
      </div>

      {Object.entries(grouped).sort(([a], [b]) => b - a).map(([sem, rows]) => (
        <div key={sem} className="card fade-in">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-navy-600 text-white text-sm font-bold flex items-center justify-center">
                {sem}
              </div>
              <div>
                <h3 className="font-display font-semibold text-navy-950">Semester {sem}</h3>
                <p className="text-xs text-slate-400">{rows.length} subjects</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-display font-bold text-navy-700">{sgpaMap[sem] ?? '—'}</div>
              <div className="text-xs text-slate-400">SGPA</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Subject Name</th>
                  <th>Credits</th>
                  <th>CIE</th>
                  <th>SEE</th>
                  <th>Total</th>
                  <th>Grade</th>
                  <th>Grade Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.grade_letter === 'F' ? 'bg-red-50/50' : ''}>
                    <td className="font-mono text-xs text-slate-500">{r.course_code}</td>
                    <td className="font-medium text-slate-800 max-w-[220px]">
                      <div className="flex items-center gap-2">
                        {r.grade_letter === 'F' && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                        {r.course_name}
                      </div>
                    </td>
                    <td>{r.credits > 0 ? r.credits : <span className="text-slate-300">—</span>}</td>
                    <td>{r.cie_marks ?? '—'}</td>
                    <td>{r.see_marks ?? '—'}</td>
                    <td className="font-semibold text-slate-900">{r.total_marks}</td>
                    <td>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${gradeClass(r.grade_letter)}`}>
                        {r.grade_letter}
                      </span>
                    </td>
                    <td className="font-mono text-sm">{r.grade_points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="text-4xl">📭</div>
          <p className="text-slate-400 text-sm">No results found</p>
        </div>
      )}
    </div>
  );
}
