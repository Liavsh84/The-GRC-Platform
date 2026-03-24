import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, AlertTriangle, ClipboardList, MessageSquare, Building2, X, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';

const pageNames = {
  '/':                'Dashboard',
  '/governance':      'Governance',
  '/projects':        'Projects',
  '/risk-management': 'Risk Management',
  '/compliance':      'Compliance',
  '/audits':          'Audits',
  '/meetings':        'Meeting Summaries',
  '/reports':         'Reports',
  '/users':           'User Management',
  '/settings':        'Settings',
};

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

// ─── Notification Panel ───────────────────────────────────────────────────────
const NotificationPanel = ({ notifications, onClose, navigate }) => {
  const grouped = {
    critical: notifications.filter(n => n.severity === 'critical'),
    high:     notifications.filter(n => n.severity === 'high'),
    medium:   notifications.filter(n => n.severity === 'medium'),
    info:     notifications.filter(n => n.severity === 'info'),
  };

  const severityStyle = {
    critical: { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700',    icon: 'text-red-500' },
    high:     { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', icon: 'text-orange-500' },
    medium:   { bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700', icon: 'text-yellow-600' },
    info:     { bar: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700',   icon: 'text-blue-500' },
  };

  const handleClick = (n) => {
    if (n.link) { navigate(n.link); onClose(); }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gray-600" />
          <span className="font-semibold text-gray-900 text-sm">Notifications</span>
          {notifications.length > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{notifications.length}</span>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Bell size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">All clear — no alerts</p>
            <p className="text-xs mt-1">System notifications will appear here</p>
          </div>
        ) : (
          notifications.map(n => {
            const st = severityStyle[n.severity] || severityStyle['info'];
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex gap-3 px-4 py-3 transition-colors ${n.link ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                {/* Severity bar */}
                <div className={`w-1 flex-shrink-0 rounded-full self-stretch ${st.bar}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <n.icon size={13} className={st.icon} />
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${st.badge}`}>
                      {n.severity.charAt(0).toUpperCase() + n.severity.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{n.category}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  {n.link && <p className="text-xs text-blue-500 mt-1">Click to view →</p>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400 text-center">
          Notifications are generated automatically from your data
        </div>
      )}
    </div>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ onMobileMenuToggle }) => {
  const { currentUser } = useAuth();
  const { risks, audits, meetings, thirdPartyRisks, frameworks, settings } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const today = new Date().toISOString().split('T')[0];

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ─── Build notifications from live data ──────────────────────────────────
  const notifications = useMemo(() => {
    const items = [];

    // 1. Critical open risks
    risks.filter(r => r.probability * r.impact >= 15 && r.status === 'open').forEach(r => {
      items.push({ id: `risk-crit-${r.id}`, severity: 'critical', icon: AlertTriangle, category: 'Risk', title: r.title, message: `Score ${r.probability * r.impact} · ${r.category} · Owner: ${r.owner || 'Unassigned'}`, link: '/risk-management' });
    });

    // 2. High open risks
    risks.filter(r => { const s = r.probability * r.impact; return s >= 10 && s < 15 && r.status === 'open'; }).forEach(r => {
      items.push({ id: `risk-high-${r.id}`, severity: 'high', icon: AlertTriangle, category: 'Risk', title: r.title, message: `Score ${r.probability * r.impact} · ${r.category} · Owner: ${r.owner || 'Unassigned'}`, link: '/risk-management' });
    });

    // 3. Critical/high open audit findings
    audits.forEach(a => {
      (a.findings || []).filter(f => f.status === 'open' && (f.severity === 'critical' || f.severity === 'high')).forEach(f => {
        items.push({ id: `finding-${a.id}-${f.id}`, severity: f.severity, icon: ClipboardList, category: 'Audit', title: f.title, message: `${a.name} · ${f.control || 'No control ref'} · ${f.recommendation || 'No recommendation'}`, link: '/audits' });
      });
    });

    // 4. Overdue meeting action items (due date passed, still open)
    meetings.forEach(m => {
      (m.actionItems || []).filter(a => a.status === 'open' && a.dueDate && a.dueDate < today).forEach(a => {
        items.push({ id: `action-${m.id}-${a.id}`, severity: 'high', icon: MessageSquare, category: 'Meeting', title: `Overdue: ${a.description}`, message: `${m.title} · Owner: ${a.owner || 'Unassigned'} · Due: ${a.dueDate}`, link: '/meetings' });
      });
    });

    // 5. Third-party vendors overdue for review
    thirdPartyRisks.filter(v => v.nextReview && v.nextReview < today && v.status === 'active').forEach(v => {
      items.push({ id: `vendor-${v.id}`, severity: 'medium', icon: Building2, category: 'Third-Party', title: `Review overdue: ${v.name}`, message: `${v.category} · Criticality: ${v.criticality} · Was due: ${v.nextReview}`, link: '/risk-management' });
    });

    // 6. Non-compliant controls with passed due dates
    frameworks.forEach(fw => {
      (fw.controls || []).filter(c => c.status === 'non-compliant' && c.dueDate && c.dueDate < today).forEach(c => {
        items.push({ id: `control-${fw.id}-${c.id}`, severity: 'medium', icon: ClipboardList, category: 'Compliance', title: `Overdue control: ${c.controlId}`, message: `${fw.name} · ${c.title} · Was due: ${c.dueDate} · Owner: ${c.owner || 'Unassigned'}`, link: '/compliance' });
      });
    });

    // Sort by severity
    return items.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));
  }, [risks, audits, meetings, thirdPartyRisks, frameworks, today]);

  const pageName = pageNames[location.pathname] || 'GRCX';
  const critCount = notifications.filter(n => n.severity === 'critical').length;
  const totalCount = notifications.length;

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-3 flex-shrink-0">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
        data-tip="Toggle navigation menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-gray-900">{pageName}</h1>
        <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Company logo */}
        {settings?.companyLogo && (
          <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
            <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="h-7 max-w-28 object-contain" title={settings.companyName} />
          </div>
        )}

        {/* Bell + Notification Panel */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className={`p-2 rounded-xl transition-colors ${open ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            data-tip={totalCount > 0 ? `${totalCount} alert${totalCount !== 1 ? 's' : ''} — ${critCount > 0 ? `${critCount} critical` : 'none critical'}` : 'No active alerts'}
          >
            <Bell size={18} />
          </button>
          {totalCount > 0 && (
            <span className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 ${critCount > 0 ? 'bg-red-500' : 'bg-orange-400'} rounded-full text-white text-xs flex items-center justify-center font-bold`}>
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          )}
          {open && (
            <NotificationPanel
              notifications={notifications}
              onClose={() => setOpen(false)}
              navigate={navigate}
            />
          )}
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5" data-tip={`${currentUser?.role} · ${currentUser?.department}`}>
          <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {currentUser?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-900">{currentUser?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
