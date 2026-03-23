import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, CheckSquare,
  FileBarChart, Users, LogOut, ChevronRight,
  BookOpen, ClipboardList, MessageSquare, Settings, Briefcase, Pin, PinOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/',                icon: LayoutDashboard, label: 'Dashboard',         exact: true },
  { to: '/governance',      icon: BookOpen,        label: 'Governance' },
  { to: '/projects',        icon: Briefcase,       label: 'Projects' },
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

const NavItem = ({ to, icon: Icon, label, exact, expanded, onClose }) => (
  <NavLink
    to={to}
    end={exact}
    onClick={onClose}
    title={!expanded ? label : undefined}
    className={({ isActive }) =>
      `flex items-center rounded-xl text-sm font-medium transition-all duration-200 group
      ${expanded ? 'gap-3 px-3 py-2.5 w-full' : 'justify-center py-2.5 w-10 mx-auto'}
      ${isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`
    }
  >
    {({ isActive }) => (
      <>
        <Icon size={18} className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
        {expanded && <span className="truncate flex-1">{label}</span>}
        {expanded && isActive && <ChevronRight size={14} className="ml-auto opacity-70 flex-shrink-0" />}
      </>
    )}
  </NavLink>
);

const Sidebar = ({ mobileOpen, onMobileClose }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem('sidebar_pinned') === 'true'; } catch { return false; }
  });
  const [hovered, setHovered] = useState(false);

  // Desktop: expand when pinned or hovered. Mobile: always expanded when open.
  const desktopExpanded = pinned || hovered;

  const togglePin = (e) => {
    e.stopPropagation();
    const next = !pinned;
    setPinned(next);
    try { localStorage.setItem('sidebar_pinned', String(next)); } catch {}
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    onMobileClose?.();
  };

  const initials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : '?';

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={[
          // Base
          'bg-slate-900 flex flex-col h-screen border-r border-slate-800 transition-all duration-300 overflow-hidden z-50',
          // Mobile: fixed overlay, slides in/out
          'fixed md:relative inset-y-0 left-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0',
          // Width: mobile always wide, desktop depends on expanded state
          'w-72',
          desktopExpanded ? 'md:w-64' : 'md:w-16',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="py-4 border-b border-slate-800 px-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { navigate('/'); onMobileClose?.(); }}
              title="Go to Dashboard"
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-800 transition-colors flex-shrink-0"
            >
              <img src="/grcx-logo.jpg" alt="GRCX" className="w-10 h-10 rounded-xl object-cover" />
            </button>

            {/* Label + pin — always visible on mobile, conditional on desktop */}
            <div className={`flex items-center gap-2 flex-1 min-w-0 ${desktopExpanded ? 'md:flex' : 'md:hidden'} flex`}>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-white font-bold text-sm leading-tight">GRCX</p>
                <p className="text-slate-400 text-xs">Governance · Risk · Compliance</p>
              </div>
              {/* Pin button — desktop only */}
              <button
                onClick={togglePin}
                title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
                className={`p-1.5 rounded-lg transition-colors flex-shrink-0 hidden md:flex ${
                  pinned
                    ? 'text-blue-400 hover:text-blue-300 hover:bg-slate-700'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                }`}
              >
                {pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={`flex-1 py-4 overflow-y-auto space-y-1 ${desktopExpanded ? 'md:px-3' : 'md:px-2'} px-3`}>
          {/* Section label — hidden when desktop collapsed */}
          <p className={`text-slate-500 text-xs font-semibold uppercase tracking-wider px-1 mb-3 ${desktopExpanded ? 'md:block' : 'md:hidden'} block`}>
            Main Menu
          </p>
          {navItems.map(item => (
            <NavItem
              key={item.to}
              {...item}
              expanded={mobileOpen || desktopExpanded}
              onClose={onMobileClose}
            />
          ))}

          {currentUser?.role === 'admin' && (
            <>
              <div className={`${desktopExpanded ? 'md:pt-4 md:pb-2' : 'md:pt-3 md:pb-1'} pt-4 pb-2`}>
                <p className={`text-slate-500 text-xs font-semibold uppercase tracking-wider px-1 ${desktopExpanded ? 'md:block' : 'md:hidden'} block`}>
                  Administration
                </p>
                <div className={`border-t border-slate-700 mx-1 ${desktopExpanded ? 'md:hidden' : 'md:block'} hidden`} />
              </div>
              {adminItems.map(item => (
                <NavItem
                  key={item.to}
                  {...item}
                  expanded={mobileOpen || desktopExpanded}
                  onClose={onMobileClose}
                />
              ))}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className={`py-3 border-t border-slate-800 flex-shrink-0 ${desktopExpanded ? 'md:px-3' : 'md:px-2'} px-3`}>
          {/* Expanded view (mobile always, desktop when expanded) */}
          <div className={`${desktopExpanded ? 'md:flex' : 'md:hidden'} flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-800 transition-colors`}>
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

          {/* Collapsed view — desktop only */}
          <div className={`${desktopExpanded ? 'md:hidden' : 'md:flex'} hidden flex-col items-center gap-1`}>
            <div
              className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold"
              title={currentUser?.name}
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              title="Log out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
