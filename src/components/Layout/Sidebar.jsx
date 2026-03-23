import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Shield, AlertTriangle, CheckSquare,
  FileBarChart, Users, LogOut, ChevronRight,
  BookOpen, ClipboardList, MessageSquare, Settings
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard',         exact: true },
  { to: '/governance',      icon: BookOpen,        label: 'Governance' },
  { to: '/risk-management', icon: AlertTriangle,   label: 'Risk Management' },
  { to: '/compliance',      icon: CheckSquare,     label: 'Compliance' },
  { to: '/audits',          icon: ClipboardList,   label: 'Audits' },
  { to: '/meetings',        icon: MessageSquare,   label: 'Meeting Summaries' },
  { to: '/reports',         icon: FileBarChart,    label: 'Reports' },
];

const adminItems = [
  { to: '/users',    icon: Users,    label: 'User Management' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const NavItem = ({ to, icon: Icon, label, exact }) => (
  <NavLink
    to={to}
    end={exact}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group relative
      ${isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
        <span>{label}</span>
        {isActive && <ChevronRight size={14} className="ml-auto opacity-70" />}
      </>
    )}
  </NavLink>
);

const Sidebar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-screen flex-shrink-0 border-r border-slate-800">
      {/* Brand — click to go home */}
      <div className="px-5 py-4 border-b border-slate-800">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-3 w-full rounded-xl hover:bg-slate-800 transition-colors p-1 -m-1"
          title="Go to Dashboard">
          <img src="/grcx-logo.jpg" alt="GRCX" className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
          <div className="text-left">
            <p className="text-white font-bold text-sm leading-tight">GRCX</p>
            <p className="text-slate-400 text-xs">Governance · Risk · Compliance</p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4 mb-3">Main Menu</p>
        {navItems.map(item => <NavItem key={item.to} {...item} />)}

        {currentUser?.role === 'admin' && (
          <>
            <div className="pt-4 pb-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-4">Administration</p>
            </div>
            {adminItems.map(item => <NavItem key={item.to} {...item} />)}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{currentUser?.name}</p>
            <p className="text-slate-400 text-xs capitalize truncate">{currentUser?.role} · {currentUser?.department}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
