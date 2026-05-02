import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import { LayoutDashboard, BookOpen, FileText } from 'lucide-react';

const LINKS = [
  { to: '/student',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/results',   icon: BookOpen,        label: 'My Results' },
  { to: '/student/marksheet', icon: FileText,        label: 'Marksheet' },
];

export default function StudentLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <Sidebar links={LINKS} role="student" identifier={user?.id} />
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
