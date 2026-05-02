import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { TrendingUp, Award, AlertTriangle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const gradeClass = (g) => {
  if (!g) return '';
  if (g === 'O')  return 'grade-O';
  if (g === 'A+') return 'grade-Apl';
  if (g === 'A')  return 'grade-A';
  if (g === 'B')  return 'grade-B';
  if (g === 'C')  return 'grade-C';
  if (g === 'F')  return 'grade-F';
  return '';
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [cgpaData, setCgpa]     = useState(null);
  const [sgpaData, setSgpa]     = useState([]);
  const [failed, setFailed]     = useState([]);
  const [recent, setRecent]     = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cgpaRes, sgpaRes, failedRes, resultsRes] = await Promise.all([
          api.get('/student/cgpa'),
          api.get('/student/sgpa'),
          api.get('/student/failed'),
          api.get('/student/results'),
        ]);
        setCgpa(cgpaRes.data);
        setSgpa(sgpaRes.data);
        setFailed(failedRes.data);
        // Most recent semester's results
        const allResults = resultsRes.data;
        const maxSem = Math.max(...allResults.map(r => r.semester));
        setRecent(allResults.filter(r => r.semester === maxSem));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const chartData = {
    labels: sgpaData.map(s => `Sem ${s.semester}`),
    datasets: [{
      label: 'SGPA',
      data: sgpaData.map(s => s.sgpa),
      borderColor: '#2444e3',
      backgroundColor: 'rgba(36,68,227,0.08)',
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#2444e3',
      pointRadius: 5,
      pointHoverRadius: 7,
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0, max: 10,
        grid: { color: '#f1f5f9' },
        ticks: { font: { family: 'DM Sans', size: 11 }, color: '#94a3b8' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'DM Sans', size: 11 }, color: '#94a3b8' },
      }
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-slate-400">Loading your results...</span>
      </div>
    </div>
  );

  const maxSem = recent[0]?.semester;

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-navy-950">
          Welcome back
        </h1>
        <p className="text-slate-400 mt-1 font-mono text-sm">{user?.id}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={<Award size={20} className="text-navy-600" />}
          label="Overall CGPA"
          value={cgpaData?.cgpa ?? '—'}
          sub={`Out of 10.0`}
          accent="bg-navy-50"
        />
        <StatCard
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          label="Latest SGPA"
          value={sgpaData.at(-1)?.sgpa ?? '—'}
          sub={`Semester ${sgpaData.at(-1)?.semester ?? '—'}`}
          accent="bg-emerald-50"
        />
        <StatCard
          icon={<BookOpen size={20} className="text-sky-600" />}
          label="Semesters Completed"
          value={sgpaData.length}
          sub="Recorded in system"
          accent="bg-sky-50"
        />
        <StatCard
          icon={<AlertTriangle size={20} className="text-red-500" />}
          label="Failed Subjects"
          value={cgpaData?.failed_count ?? 0}
          sub={cgpaData?.failed_count === 0 ? 'All clear 🎉' : 'Needs attention'}
          accent="bg-red-50"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* SGPA trend chart */}
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-navy-950 text-lg">SGPA Trend</h3>
              <p className="text-slate-400 text-xs mt-0.5">Performance across semesters</p>
            </div>
          </div>
          {sgpaData.length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-300 text-sm">No data yet</div>
          )}
        </div>

        {/* Failed subjects panel */}
        <div className="card">
          <h3 className="font-display font-semibold text-navy-950 text-lg mb-1">Backlogs</h3>
          <p className="text-slate-400 text-xs mb-5">Subjects with F grade</p>
          {failed.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
              <div className="text-3xl">🎉</div>
              <p className="text-sm text-slate-400">No failed subjects</p>
            </div>
          ) : (
            <div className="space-y-2">
              {failed.map((f, i) => (
                <div key={i} className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
                  <span className="text-red-500 mt-0.5"><AlertTriangle size={14} /></span>
                  <div>
                    <p className="text-sm font-medium text-red-800">{f.course_name}</p>
                    <p className="text-xs text-red-400 font-mono">{f.course_code} · Sem {f.semester}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest semester results */}
      {recent.length > 0 && (
        <div className="card fade-in-delay-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-navy-950 text-lg">Semester {maxSem} Results</h3>
              <p className="text-slate-400 text-xs mt-0.5">Your most recent semester</p>
            </div>
            <Link to="/student/results" className="btn-secondary text-xs">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Subject</th>
                  <th>CIE</th>
                  <th>SEE</th>
                  <th>Total</th>
                  <th>Grade</th>
                  <th>Credits</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr key={i}>
                    <td className="font-mono text-xs text-slate-500">{r.course_code}</td>
                    <td className="font-medium text-slate-800">{r.course_name}</td>
                    <td>{r.cie_marks ?? '—'}</td>
                    <td>{r.see_marks ?? '—'}</td>
                    <td className="font-semibold">{r.total_marks}</td>
                    <td>
                      <span className={`badge text-xs font-semibold px-2.5 py-1 rounded-lg ${gradeClass(r.grade_letter)}`}>
                        {r.grade_letter}
                      </span>
                    </td>
                    <td>{r.credits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="stat-card fade-in">
      <div className={`w-10 h-10 rounded-xl ${accent} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-display font-bold text-navy-950">{value}</div>
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <div className="text-xs text-slate-400">{sub}</div>
    </div>
  );
}
