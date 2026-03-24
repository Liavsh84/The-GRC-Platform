import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, AlertTriangle, CheckSquare, ShieldAlert,
  ChevronRight, AlertCircle, FileText, Shield,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getRiskLevel = (score) => {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 6)  return 'Medium';
  return 'Low';
};

const RISK_BADGE = {
  Critical: 'bg-red-500 text-white',
  High:     'bg-orange-400 text-white',
  Medium:   'bg-yellow-400 text-gray-900',
  Low:      'bg-green-500 text-white',
};

const DOC_TYPE_COLORS = {
  policy:    'bg-blue-100 text-blue-700',
  procedure: 'bg-purple-100 text-purple-700',
  standard:  'bg-green-100 text-green-700',
  guideline: 'bg-yellow-100 text-yellow-700',
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KPICard = ({ icon: Icon, label, value, sub, color, onClick, tip }) => (
  <button onClick={onClick} data-tip={tip}
    className="card flex items-start gap-4 text-left w-full hover:shadow-md hover:-translate-y-0.5 transition-all group">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={22} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors mt-1 flex-shrink-0" />
  </button>
);

// ─── Risk Heat Map ─────────────────────────────────────────────────────────────
const LIK_LABELS = { 5: 'Almost Certain', 4: 'Likely', 3: 'Possible', 2: 'Unlikely', 1: 'Rare' };
const IMP_LABELS = { 1: 'Low', 2: '', 3: 'Med', 4: '', 5: 'High' };

const cellBg = (score) => {
  if (score >= 15) return 'bg-red-500 text-white';
  if (score >= 10) return 'bg-orange-400 text-white';
  if (score >= 6)  return 'bg-yellow-400 text-gray-900';
  return 'bg-green-500 text-white';
};

const RiskHeatMap = ({ risks, onClick }) => {
  const counts = useMemo(() => {
    const c = {};
    risks.forEach(r => {
      const key = `${r.probability}-${r.impact}`;
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [risks]);

  return (
    <div className="w-full select-none">
      {/* Impact axis label */}
      <div className="flex mb-1" style={{ paddingLeft: 88 }}>
        <div className="flex-1 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Impact →
        </div>
      </div>
      <div className="flex gap-1">
        {/* Likelihood axis label (rotated) */}
        <div className="flex items-center justify-center w-5 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
            Likelihood →
          </span>
        </div>
        <div className="flex-1 min-w-0">
          {/* Column headers */}
          <div className="flex gap-1 mb-1">
            <div className="w-24 flex-shrink-0" />
            {[1,2,3,4,5].map(imp => (
              <div key={imp} className="flex-1 text-center text-xs font-medium text-gray-400">
                {IMP_LABELS[imp]}
              </div>
            ))}
          </div>
          {/* Grid rows (5 = top, 1 = bottom) */}
          {[5,4,3,2,1].map(lik => (
            <div key={lik} className="flex gap-1 mb-1">
              <div className="w-24 flex-shrink-0 flex items-center justify-end pr-2">
                <span className="text-xs text-gray-500 text-right leading-tight">{LIK_LABELS[lik]}</span>
              </div>
              {[1,2,3,4,5].map(imp => {
                const score = lik * imp;
                const count = counts[`${lik}-${imp}`] || 0;
                return (
                  <button key={imp}
                    onClick={onClick}
                    data-tip={count > 0
                      ? `${count} risk${count > 1 ? 's' : ''} — Likelihood ${lik}, Impact ${imp} (score ${score})`
                      : `Score ${score} — no risks here`}
                    className={`flex-1 h-9 flex items-center justify-center rounded transition-all hover:opacity-80 hover:scale-105 ${cellBg(score)}`}
                  >
                    {count > 0
                      ? <span className="text-sm font-bold">{count}</span>
                      : <span className="text-xs opacity-30 font-medium">{score}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3" style={{ paddingLeft: 96 }}>
            {[
              ['bg-green-500','Low (1–5)'],
              ['bg-yellow-400','Med (6–9)'],
              ['bg-orange-400','High (10–14)'],
              ['bg-red-500','Critical (≥15)'],
            ].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded ${c}`} />
                <span className="text-xs text-gray-500">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Compliance Donut ─────────────────────────────────────────────────────────
const ComplianceDonut = ({ score, data }) => (
  <div className="relative">
    <ResponsiveContainer width="100%" height={175}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="50%"
          innerRadius={55} outerRadius={78}
          paddingAngle={2} dataKey="value"
          startAngle={90} endAngle={-270}
        >
          {data.map(d => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: 11 }}>{v}</span>}
        />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
    {/* Center label */}
    <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 28 }}>
      <div className="text-center pointer-events-none">
        <p className="text-3xl font-bold text-gray-900">{score}%</p>
        <p className="text-xs text-gray-500">Compliant</p>
      </div>
    </div>
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { documents, frameworks, risks } = useData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // KPI calculations
  const approvedDocs       = documents.filter(d => d.status === 'approved').length;
  const totalControls      = frameworks.reduce((s, f) => s + f.controls.length, 0);
  const compliantControls  = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'compliant').length, 0);
  const partialControls    = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'partial').length, 0);
  const failedControls     = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'non-compliant').length, 0);
  const naControls         = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'not-applicable').length, 0);
  const complianceScore    = totalControls ? Math.round((compliantControls / totalControls) * 100) : 0;
  const openRisks          = risks.filter(r => r.status === 'open').length;
  const criticalRisks      = risks.filter(r => r.probability * r.impact >= 15 && r.status === 'open').length;

  const complianceDonutData = [
    { name: 'Compliant',     value: compliantControls, color: '#16a34a' },
    { name: 'Partial',       value: partialControls,   color: '#ca8a04' },
    { name: 'Non-Compliant', value: failedControls,    color: '#dc2626' },
    { name: 'N/A',           value: naControls,         color: '#9ca3af' },
  ].filter(d => d.value > 0);

  // Top risks by score
  const topRisks = useMemo(() =>
    [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)).slice(0, 5),
    [risks]);

  // Pending actions derived from live data
  const pendingTasks = useMemo(() => {
    const tasks = [];
    risks.filter(r => r.status === 'open' && r.probability * r.impact >= 15).slice(0, 2).forEach(r =>
      tasks.push({ icon: AlertTriangle, color: 'text-red-500 bg-red-50', label: r.title, sub: 'Critical risk — treatment required', to: '/risk-management' })
    );
    risks.filter(r => r.status === 'open' && r.probability * r.impact >= 10 && r.probability * r.impact < 15).slice(0, 1).forEach(r =>
      tasks.push({ icon: AlertCircle, color: 'text-orange-500 bg-orange-50', label: r.title, sub: 'High risk — review recommended', to: '/risk-management' })
    );
    frameworks.forEach(f =>
      f.controls.filter(c => c.status === 'non-compliant').slice(0, 1).forEach(c =>
        tasks.push({ icon: Shield, color: 'text-yellow-600 bg-yellow-50', label: `${c.controlId}: ${c.title}`, sub: `Non-compliant — ${f.name.split(':')[0]}`, to: '/compliance' })
      )
    );
    documents.filter(d => d.status === 'draft').slice(0, 1).forEach(d =>
      tasks.push({ icon: FileText, color: 'text-blue-500 bg-blue-50', label: d.title, sub: 'Document pending approval', to: '/governance' })
    );
    return tasks.slice(0, 5);
  }, [risks, frameworks, documents]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-1">Welcome back, {currentUser?.name?.split(' ')[0]} 👋</h2>
        <p className="text-slate-300 text-sm">Here's your organization's GRC overview.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={BookOpen}      label="Total Documents"    value={documents.length}      sub={`${approvedDocs} approved`}          color="bg-blue-600"   onClick={() => navigate('/governance')}     tip="Policies, procedures, standards & guidelines — click to manage" />
        <KPICard icon={CheckSquare}   label="Compliance Score"   value={`${complianceScore}%`} sub={`${totalControls} controls tracked`}  color="bg-green-600"  onClick={() => navigate('/compliance')}     tip="% of controls marked compliant across all frameworks — click to view" />
        <KPICard icon={AlertTriangle} label="Open Risks"         value={openRisks}             sub={`${criticalRisks} critical`}          color="bg-orange-500" onClick={() => navigate('/risk-management')} tip="Active risks requiring attention — click to manage" />
        <KPICard icon={ShieldAlert}   label="Frameworks Tracked" value={frameworks.length}     sub={`${totalControls} total controls`}    color="bg-purple-600" onClick={() => navigate('/compliance')}     tip="Compliance frameworks monitored (ISO 27001, GDPR, NIST…)" />
      </div>

      {/* Risk Heat Map + Compliance Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Heat Map */}
        <div className="card lg:col-span-3 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/risk-management')}
          data-tip="Click to open the full risk register">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Risk Heat Map</h3>
            <span className="text-xs text-blue-600">View all →</span>
          </div>
          <RiskHeatMap risks={risks} onClick={() => navigate('/risk-management')} />
        </div>

        {/* Compliance Score */}
        <div className="card lg:col-span-2 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/compliance')}
          data-tip="Click to view detailed compliance per framework">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900">Overall Compliance</h3>
            <span className="text-xs text-blue-600">View all →</span>
          </div>
          {complianceDonutData.length > 0
            ? <ComplianceDonut score={complianceScore} data={complianceDonutData} />
            : <div className="h-44 flex items-center justify-center text-sm text-gray-400">No frameworks yet</div>
          }
          {/* Passed / Failed / Other */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center p-2 bg-green-50 rounded-xl" data-tip="Controls fully compliant">
              <p className="text-xl font-bold text-green-700">{compliantControls}</p>
              <p className="text-xs text-green-600">Passed</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-xl" data-tip="Controls non-compliant">
              <p className="text-xl font-bold text-red-700">{failedControls}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-xl" data-tip="Partial, N/A or not started">
              <p className="text-xl font-bold text-gray-600">{partialControls + naControls}</p>
              <p className="text-xs text-gray-500">Other</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Risks + Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Top Risks</h3>
            <button onClick={(e) => { e.stopPropagation(); navigate('/risk-management'); }}
              className="text-xs text-blue-600 hover:underline" data-tip="Open Risk Management">
              View all →
            </button>
          </div>
          <div className="space-y-2">
            {topRisks.length === 0 && (
              <p className="text-sm text-gray-400 py-6 text-center">No risks recorded yet</p>
            )}
            {topRisks.map(r => {
              const score = r.probability * r.impact;
              const level = getRiskLevel(score);
              return (
                <button key={r.id} onClick={() => navigate('/risk-management')}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all w-full text-left group">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex-shrink-0 ${RISK_BADGE[level]}`}
                    data-tip={`${level}: ${level === 'Critical' ? 'Score ≥15 — immediate action' : level === 'High' ? 'Score 10–14 — urgent' : level === 'Medium' ? 'Score 6–9 — schedule treatment' : 'Score 1–5 — monitor'}`}>
                    {level}
                  </span>
                  <span className="text-sm text-gray-800 flex-1 truncate">{r.title}</span>
                  <span className="text-sm font-bold text-gray-400 flex-shrink-0 tabular-nums"
                    data-tip="Risk score = Probability × Impact">{score}</span>
                  <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Pending Actions */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Pending Actions</h3>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{pendingTasks.length}</span>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare size={32} className="text-green-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">All clear!</p>
              <p className="text-xs text-gray-400 mt-1">No pending actions at the moment.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {pendingTasks.map((t, i) => (
                  <button key={i} onClick={() => navigate(t.to)}
                    className="flex items-start gap-3 py-2.5 px-3 rounded-xl border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-all w-full text-left group">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.color}`}>
                      <t.icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{t.sub}</p>
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0 transition-colors mt-2" />
                  </button>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between">
                <button onClick={() => navigate('/risk-management')} className="text-xs text-blue-600 hover:underline">View risks →</button>
                <button onClick={() => navigate('/compliance')} className="text-xs text-blue-600 hover:underline">View compliance →</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
