import { useNavigate } from 'react-router-dom';
import {
  BookOpen, AlertTriangle, CheckSquare, FileBarChart,
  TrendingUp, TrendingDown, Minus, ChevronRight, ShieldAlert
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

const RISK_COLORS = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' };

const getRiskLevel = (score) => {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 6)  return 'Medium';
  return 'Low';
};

const RISK_ROW_COLORS = {
  Critical: 'bg-red-100 text-red-700',
  High:     'bg-orange-100 text-orange-700',
  Medium:   'bg-yellow-100 text-yellow-700',
  Low:      'bg-green-100 text-green-700',
};
const DOC_TYPE_COLORS = {
  policy:    'bg-blue-100 text-blue-700',
  procedure: 'bg-purple-100 text-purple-700',
  standard:  'bg-green-100 text-green-700',
  guideline: 'bg-yellow-100 text-yellow-700',
};

// ─── Clickable KPI card ───────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color, trend, onClick }) => (
  <button
    onClick={onClick}
    className="card flex items-start gap-4 text-left w-full hover:shadow-md hover:-translate-y-0.5 transition-all group"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <div className="flex flex-col items-end gap-1">
      {trend !== undefined && (
        <div className={`text-xs font-medium flex items-center gap-1 ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-400'}`}>
          {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
        </div>
      )}
      <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors mt-auto" />
    </div>
  </button>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { documents, frameworks, risks } = useData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // KPIs
  const approvedDocs     = documents.filter(d => d.status === 'approved').length;
  const totalControls    = frameworks.reduce((s, f) => s + f.controls.length, 0);
  const compliantControls = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'compliant').length, 0);
  const complianceScore  = totalControls ? Math.round((compliantControls / totalControls) * 100) : 0;
  const openRisks        = risks.filter(r => r.status === 'open').length;
  const criticalRisks    = risks.filter(r => r.probability * r.impact >= 15 && r.status === 'open').length;

  // Chart data
  const complianceData = frameworks.map(f => {
    const total = f.controls.length;
    const c = f.controls.filter(x => x.status === 'compliant').length;
    return { name: f.name.split(':')[0].split(' ').slice(0, 2).join(' '), score: total ? Math.round((c / total) * 100) : 0 };
  });

  const riskLevels = risks.reduce((acc, r) => {
    const level = getRiskLevel(r.probability * r.impact);
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});
  const riskLevelData = ['Critical', 'High', 'Medium', 'Low']
    .map(l => ({ name: l, value: riskLevels[l] || 0 }))
    .filter(x => x.value > 0);

  // Lists
  const topRisks   = [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)).slice(0, 5);
  const recentDocs = [...documents].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 5);

  const pillars = [
    { label: 'Governance',      icon: BookOpen,       to: '/governance',      color: 'bg-blue-600',   stat: `${documents.length} documents`,  sub: `${approvedDocs} approved` },
    { label: 'Risk Management', icon: AlertTriangle,  to: '/risk-management', color: 'bg-orange-500', stat: `${risks.length} risks`,           sub: `${criticalRisks} critical` },
    { label: 'Compliance',      icon: CheckSquare,    to: '/compliance',      color: 'bg-green-600',  stat: `${complianceScore}% score`,       sub: `${frameworks.length} frameworks` },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-1">Welcome back, {currentUser?.name?.split(' ')[0]} 👋</h2>
        <p className="text-slate-300 text-sm">Here's your organization's GRC overview.</p>
      </div>

      {/* KPI Cards — all clickable */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={BookOpen}    label="Total Documents"    value={documents.length}   sub={`${approvedDocs} approved`}      color="bg-blue-600"   onClick={() => navigate('/governance')} />
        <KPICard icon={CheckSquare} label="Compliance Score"   value={`${complianceScore}%`} sub={`${totalControls} controls`}  color="bg-green-600"  onClick={() => navigate('/compliance')} />
        <KPICard icon={AlertTriangle} label="Open Risks"       value={openRisks}          sub={`${criticalRisks} critical`}     color="bg-orange-500" onClick={() => navigate('/risk-management')} />
        <KPICard icon={ShieldAlert} label="Frameworks Tracked" value={frameworks.length}  sub={`${totalControls} total controls`} color="bg-purple-600" onClick={() => navigate('/compliance')} />
      </div>

      {/* Three Pillars */}
      <div className="grid grid-cols-3 gap-4">
        {pillars.map(p => (
          <button key={p.to} onClick={() => navigate(p.to)}
            className="card text-left hover:shadow-md hover:-translate-y-0.5 transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${p.color} rounded-xl flex items-center justify-center`}>
                <p.icon size={20} className="text-white" />
              </div>
              <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <p className="font-semibold text-gray-900">{p.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{p.stat}</p>
            <p className="text-xs text-gray-500 mt-0.5">{p.sub}</p>
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Compliance by Framework */}
        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/compliance')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Compliance Score by Framework</h3>
            <span className="text-xs text-blue-600 hover:underline">View all →</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={complianceData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'Score']} />
              <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="card cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/risk-management')}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Risk Distribution by Level</h3>
            <span className="text-xs text-blue-600 hover:underline">View all →</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={riskLevelData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {riskLevelData.map((entry) => (
                  <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Risks — each row clickable */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Risks</h3>
            <button onClick={() => navigate('/risk-management')} className="text-xs text-blue-600 hover:underline">View all →</button>
          </div>
          <div className="space-y-1">
            {topRisks.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No risks recorded yet</p>}
            {topRisks.map(r => {
              const score = r.probability * r.impact;
              const level = getRiskLevel(score);
              return (
                <button key={r.id} onClick={() => navigate('/risk-management')}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left border-b border-gray-100 last:border-0 group">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${RISK_ROW_COLORS[level]}`}>{level}</span>
                  <span className="text-sm text-gray-800 flex-1 truncate">{r.title}</span>
                  <span className="text-sm font-bold text-gray-500 group-hover:text-gray-900 transition-colors">{score}</span>
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Documents — each row clickable */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Documents</h3>
            <button onClick={() => navigate('/governance')} className="text-xs text-blue-600 hover:underline">View all →</button>
          </div>
          <div className="space-y-1">
            {recentDocs.length === 0 && <p className="text-sm text-gray-400 py-4 text-center">No documents yet</p>}
            {recentDocs.map(d => (
              <button key={d.id} onClick={() => navigate('/governance')}
                className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition-colors w-full text-left border-b border-gray-100 last:border-0 group">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 capitalize ${DOC_TYPE_COLORS[d.type] || 'bg-gray-100 text-gray-700'}`}>{d.type}</span>
                <span className="text-sm text-gray-800 flex-1 truncate">{d.title}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">{d.updatedAt}</span>
                <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
