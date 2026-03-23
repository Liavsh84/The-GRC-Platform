import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useLocation } from 'react-router-dom';

const pageNames = {
  '/':                'Dashboard',
  '/governance':      'Governance',
  '/risk-management': 'Risk Management',
  '/compliance':      'Compliance',
  '/audits':          'Audits',
  '/meetings':        'Meeting Summaries',
  '/reports':         'Reports',
  '/users':           'User Management',
  '/settings':        'Settings',
};

const Header = () => {
  const { currentUser } = useAuth();
  const { risks, settings } = useData();
  const location = useLocation();

  const criticalRisks = risks.filter(r => r.probability * r.impact >= 15 && r.status === 'open').length;
  const pageName = pageNames[location.pathname] || 'GRCX';

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-gray-900">{pageName}</h1>
        <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Company logo (if uploaded) */}
        {settings?.companyLogo && (
          <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
            <img src={settings.companyLogo} alt={settings.companyName || 'Company'} className="h-7 max-w-28 object-contain" title={settings.companyName} />
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <Bell size={18} />
          </button>
          {criticalRisks > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
              {criticalRisks}
            </span>
          )}
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
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
