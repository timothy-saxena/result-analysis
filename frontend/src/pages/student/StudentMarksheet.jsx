import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { FileDown, FileText } from 'lucide-react';

export default function StudentMarksheet() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDl]      = useState(null);

  useEffect(() => {
    api.get('/student/sgpa')
      .then(res => setSemesters(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const download = async (sem) => {
    setDl(sem);
    try {
      const res = await api.get(`/student/marksheet/${sem}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `marksheet_sem${sem}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to download. Please try again.');
    } finally {
      setDl(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy-950">Marksheets</h1>
        <p className="text-slate-400 text-sm mt-1">Download your semester marksheets as PDF</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {semesters.map(({ semester, sgpa }) => (
          <div key={semester} className="card hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-navy-50 rounded-2xl flex items-center justify-center">
                <FileText size={22} className="text-navy-600" />
              </div>
              <span className="badge badge-blue font-mono">Sem {semester}</span>
            </div>
            <h3 className="font-display font-semibold text-navy-950 text-lg">Semester {semester}</h3>
            <p className="text-slate-400 text-sm mt-1 mb-5">SGPA: <span className="font-semibold text-navy-700">{sgpa}</span></p>
            <button
              onClick={() => download(semester)}
              disabled={downloading === semester}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {downloading === semester ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating...
                </>
              ) : (
                <><FileDown size={15} /> Download PDF</>
              )}
            </button>
          </div>
        ))}
      </div>

      {semesters.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 gap-3 text-center">
          <FileText size={36} className="text-slate-200" />
          <p className="text-slate-400 text-sm">No semester data found</p>
        </div>
      )}
    </div>
  );
}
