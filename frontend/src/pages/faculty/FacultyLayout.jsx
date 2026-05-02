import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Sidebar';
import { LayoutDashboard, Users, BarChart2 } from 'lucide-react';

const LINKS = [
  { to: '/faculty', icon: LayoutDashboard, label: 'Dashboard' },
];

export default function FacultyLayout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      <Sidebar links={LINKS} role="faculty" identifier={user?.id} />
      <main className="page-content"><Outlet /></main>
    </div>
  );
}
