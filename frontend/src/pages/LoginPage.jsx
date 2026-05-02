import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { GraduationCap, BookOpen, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const TABS = [
  { key: 'student', label: 'Student',  icon: GraduationCap, placeholder: 'Hall Ticket Number' },
  { key: 'faculty', label: 'Faculty',  icon: BookOpen,       placeholder: 'Username' },
  { key: 'admin',   label: 'Admin',    icon: ShieldCheck,    placeholder: 'Username' },
];

export default function LoginPage() {
  const [tab, setTab]         = useState('student');
  const [identifier, setId]   = useState('');
  const [password, setPass]   = useState('');
  const [showPass, setShow]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const active = TABS.find(t => t.key === tab);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body = tab === 'student'
        ? { ht_no: identifier, password }
        : { username: identifier, password };

      const { data } = await api.post(`/auth/${tab}-login`, body);
      login(data.token, { role: data.role, id: data.ht_no || data.name || identifier });
      navigate(`/${tab}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="login-bg hidden lg:flex flex-col justify-between w-[45%] p-12 text-white relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
              <GraduationCap size={20} />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight">MGIT CSE</span>
          </div>
          <h1 className="font-display text-5xl font-bold leading-tight mb-6">
            Academic<br />Result<br />Analysis
          </h1>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            View marks, track your CGPA, download marksheets, and analyze performance — all in one place.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[['300+', 'Students'], ['10+', 'Subjects'], ['Multi', 'Semester']].map(([val, lbl]) => (
            <div key={lbl} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
              <div className="font-display text-2xl font-bold">{val}</div>
              <div className="text-blue-200 text-xs mt-1">{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#f8f9fc] px-6">
        <div className="w-full max-w-sm">
          {/* Logo for mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-10 justify-center">
            <GraduationCap size={22} className="text-navy-600" />
            <span className="font-display font-semibold text-navy-900 text-lg">MGIT CSE Result Analysis</span>
          </div>

          <div className="fade-in">
            <h2 className="font-display text-3xl font-bold text-navy-950 mb-1">Sign in</h2>
            <p className="text-slate-400 text-sm mb-8">Choose your role to continue</p>

            {/* Role tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-8">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setId(''); setPass(''); setError(''); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    tab === t.key
                      ? 'bg-white text-navy-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="fade-in-delay-1">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {active.placeholder}
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder={tab === 'student' ? '24261A0501' : 'Enter username'}
                  value={identifier}
                  onChange={e => setId(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="fade-in-delay-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder={tab === 'student' ? 'HTNO@123' : '••••••••'}
                    value={password}
                    onChange={e => setPass(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full mt-2 flex items-center justify-center gap-2 fade-in-delay-3"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : `Sign in as ${active.label}`}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-8">
              Mahatma Gandhi Institute of Technology · CSE Dept
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
