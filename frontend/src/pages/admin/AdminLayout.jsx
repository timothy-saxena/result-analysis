import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import { LayoutDashboard } from 'lucide-react';

const LINKS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
];

export default function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <Sidebar links={LINKS} role="admin" identifier={user?.id} />
      <main className="page-content"><Outlet /></main>
    </div>
  );
}
