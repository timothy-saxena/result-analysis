import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogOut } from 'lucide-react';

export default function Sidebar({ links, role, identifier }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColors = {
    student: 'bg-emerald-500/15 text-emerald-300',
    faculty: 'bg-amber-500/15 text-amber-300',
    admin:   'bg-violet-500/15 text-violet-300',
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-navy-600 flex items-center justify-center shadow-lg">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div>
            <div className="text-white font-display font-semibold text-sm leading-tight">MGIT CSE</div>
            <div className="text-slate-500 text-xs">Result Analysis</div>
          </div>
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2.5 bg-white/5 rounded-xl px-3 py-2.5">
          <div className="w-7 h-7 rounded-lg bg-navy-600 flex items-center justify-center text-white text-xs font-semibold">
            {identifier?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-medium truncate font-mono">
              {identifier}
            </div>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${roleColors[role]}`}>
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest px-2">Menu</span>
        </div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to.split('/').length === 2}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-6 border-t border-white/5 pt-4">
        <button onClick={handleLogout} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={16} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
