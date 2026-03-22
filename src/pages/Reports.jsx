import { useState } from 'react';
import { FileBarChart, Download, FileText, Shield, AlertTriangle, CheckSquare, ChevronRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useData } from '../contexts/DataContext';
import { exportExecutiveSummaryPDF, exportGovernancePDF, exportCompliancePDF, exportRiskPDF } from '../utils/exportUtils';

const RISK_COLORS = { Critical: '#dc2626', High: '#ea580c', Medium: '#ca8a04', Low: '#16a34a' };
const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

const getRiskLevel = (score) => {
  if (score >= 15) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 6) return 'Medium';
  return 'Low';
};

const getScore = (fw) => {
  const t = fw.controls.length;
  if (!t) return 0;
  return Math.round((fw.controls.filter(c => c.status === 'compliant').length / t) * 100);
};

const REPORT_TYPES = [
  {
    id: 'executive',
    label: 'Executive Summary',
    description: 'High-level GRC overview for board and senior management. Includes KPIs, top risks, and compliance scores.',
    icon: FileBarChart,
    color: 'bg-blue-600',
  },
  {
    id: 'governance',
    label: 'Governance Report',
    description: 'Full inventory of governance documents — policies, procedures, standards, and guidelines.',
    icon: FileText,
    color: 'bg-purple-600',
  },
  {
    id: 'compliance',
    label: 'Compliance Status Report',
    description: 'Detailed gap analysis across all compliance frameworks with control status and owners.',
    icon: CheckSquare,
    color: 'bg-green-600',
  },
  {
    id: 'risk',
    label: 'Risk Register Report',
    description: 'Complete risk register with probability, impact scores, treatment plans, and owners.',
    icon: AlertTriangle,
    color: 'bg-orange-600',
  },
];

const Reports = () => {
  const { documents, frameworks, risks } = useData();
  const [activeReport, setActiveReport] = useState('executive');
  const [selectedFw, setSelectedFw] = useState(frameworks[0]?.id || null);

  // Derived data
  const totalControls = frameworks.reduce((s, f) => s + f.controls.length, 0);
  const compliantControls = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'compliant').length, 0);
  const complianceScore = totalControls ? Math.round((compliantControls / totalControls) * 100) : 0;
  const openRisks = risks.filter(r => r.status === 'open').length;
  const criticalRisks = risks.filter(r => r.probability * r.impact >= 15).length;
  const approvedDocs = documents.filter(d => d.status === 'approved').length;

  // Chart data
  const complianceChartData = frameworks.map(f => ({
    name: f.name.split(':')[0].split(' ').slice(0, 2).join(' '),
    score: getScore(f),
  }));

  const riskLevelData = ['Critical', 'High', 'Medium', 'Low'].map(l => ({
    name: l,
    value: risks.filter(r => getRiskLevel(r.probability * r.impact) === l).length,
  })).filter(x => x.value > 0);

  const radarData = [
    { subject: 'Governance', value: documents.length > 0 ? Math.min(100, (approvedDocs / documents.length) * 100) : 0 },
    { subject: 'Compliance', value: complianceScore },
    { subject: 'Risk Mgmt', value: risks.length > 0 ? Math.max(0, 100 - (criticalRisks / risks.length) * 100) : 100 },
    { subject: 'Policies', value: documents.filter(d => d.type === 'policy' && d.status === 'approved').length > 0 ? 80 : 30 },
    { subject: 'Training', value: 65 }, // placeholder
  ];

  const docTypeData = ['policy', 'procedure', 'standard', 'guideline'].map(t => ({
    name: t.charAt(0).toUpperCase() + t.slice(1) + 's',
    value: documents.filter(d => d.type === t).length,
  })).filter(x => x.value > 0);

  const topRisks = [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact)).slice(0, 8);

  const handleExport = () => {
    switch (activeReport) {
      case 'executive': exportExecutiveSummaryPDF(documents, frameworks, risks); break;
      case 'governance': exportGovernancePDF(documents); break;
      case 'compliance': {
        const fw = frameworks.find(f => f.id === selectedFw) || frameworks[0];
        if (fw) exportCompliancePDF(fw);
        break;
      }
      case 'risk': exportRiskPDF(risks); break;
    }
  };

  const renderPreview = () => {
    switch (activeReport) {
      case 'executive':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Governance Docs', value: documents.length, sub: `${approvedDocs} approved`, color: 'text-blue-600' },
                { label: 'Compliance Score', value: `${complianceScore}%`, sub: `${totalControls} controls`, color: complianceScore >= 80 ? 'text-green-600' : complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600' },
                { label: 'Open Risks', value: openRisks, sub: `${criticalRisks} critical`, color: 'text-orange-600' },
                { label: 'Frameworks', value: frameworks.length, sub: `${totalControls} total controls`, color: 'text-purple-600' },
              ].map(k => (
                <div key={k.label} className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-center">
                  <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
                  <p className="text-sm text-gray-600 mt-1">{k.label}</p>
                  <p className="text-xs text-gray-400">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-5">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">GRC Posture Radar</p>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} />
                    <Radar dataKey="value" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Compliance by Framework</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={complianceChartData} margin={{ left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Tooltip formatter={v => [`${v}%`, 'Score']} />
                    <Bar dataKey="score" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Risk Distribution</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={riskLevelData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value">
                      {riskLevelData.map(entry => <Cell key={entry.name} fill={RISK_COLORS[entry.name]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Top 8 Risks by Score</p>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-2">Risk</th><th className="text-left pb-2">Category</th>
                  <th className="text-center pb-2">Score</th><th className="text-left pb-2">Owner</th><th className="text-left pb-2">Status</th>
                </tr></thead>
                <tbody>{topRisks.map(r => {
                  const s = r.probability * r.impact; const l = getRiskLevel(s);
                  const lc = { Critical: 'text-red-600', High: 'text-orange-600', Medium: 'text-yellow-600', Low: 'text-green-600' };
                  return (
                    <tr key={r.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 font-medium text-gray-800 max-w-xs truncate">{r.title}</td>
                      <td className="py-2 text-gray-500 text-xs">{r.category}</td>
                      <td className="py-2 text-center font-bold text-gray-900">{s}</td>
                      <td className="py-2 text-gray-600 text-xs">{r.owner || '—'}</td>
                      <td className={`py-2 text-xs font-semibold capitalize ${lc[l]}`}>{l}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </div>
        );

      case 'governance':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {['policy', 'procedure', 'standard', 'guideline'].map(t => (
                <div key={t} className="bg-gray-50 rounded-xl p-3 border border-gray-200 text-center">
                  <p className="text-2xl font-bold text-gray-900">{documents.filter(d => d.type === t).length}</p>
                  <p className="text-xs text-gray-500 capitalize mt-1">{t}s</p>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Document Inventory</p>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-2">Title</th><th className="text-left pb-2">Type</th><th className="text-left pb-2">Dept</th><th className="text-left pb-2">Status</th><th className="text-left pb-2">Version</th>
                </tr></thead>
                <tbody>{documents.map(d => (
                  <tr key={d.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 font-medium text-gray-800">{d.title}</td>
                    <td className="py-2 text-gray-500 capitalize text-xs">{d.type}</td>
                    <td className="py-2 text-gray-500 text-xs">{d.department}</td>
                    <td className="py-2 capitalize text-xs text-gray-600">{d.status}</td>
                    <td className="py-2 text-gray-500 text-xs">v{d.version}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        );

      case 'compliance':
        return (
          <div className="space-y-4">
            <div>
              <label className="label">Select Framework for Export</label>
              <select className="input-field" value={selectedFw || ''} onChange={e => setSelectedFw(e.target.value)}>
                {frameworks.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {frameworks.map(f => (
              <div key={f.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-gray-900">{f.name}</p>
                  <span className="text-sm font-bold text-gray-700">{getScore(f)}%</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-600">
                  <span className="text-green-600">{f.controls.filter(c => c.status === 'compliant').length} compliant</span>
                  <span className="text-yellow-600">{f.controls.filter(c => c.status === 'partial').length} partial</span>
                  <span className="text-red-600">{f.controls.filter(c => c.status === 'non-compliant').length} non-compliant</span>
                </div>
              </div>
            ))}
          </div>
        );

      case 'risk':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Risk by Level</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={riskLevelData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                      {riskLevelData.map(e => <Cell key={e.name} fill={RISK_COLORS[e.name]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-3">Docs by Type</p>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={docTypeData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                      {docTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 10 }}>{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-3">Risk Register ({risks.length} risks)</p>
              <p className="text-xs text-gray-500">PDF export will include full register with all details.</p>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500 mt-0.5">Generate board-ready reports and export to PDF or CSV</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {REPORT_TYPES.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`card text-left transition-all hover:shadow-md ${activeReport === r.id ? 'ring-2 ring-blue-500' : ''}`}>
            <div className={`w-10 h-10 ${r.color} rounded-xl flex items-center justify-center mb-3`}>
              <r.icon size={18} className="text-white" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">{r.label}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{r.description}</p>
            {activeReport === r.id && (
              <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 font-medium">
                Selected <ChevronRight size={12} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="card">
        <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
          <div>
            <h3 className="font-semibold text-gray-900">{REPORT_TYPES.find(r => r.id === activeReport)?.label} — Preview</h3>
            <p className="text-xs text-gray-500 mt-0.5">Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <Download size={15} /> Download PDF
          </button>
        </div>

        {/* Report header */}
        <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-xl p-5 mb-5 text-white">
          <p className="text-xs uppercase tracking-wider text-slate-400 mb-1">The GRC Platform</p>
          <h4 className="text-lg font-bold">{REPORT_TYPES.find(r => r.id === activeReport)?.label}</h4>
          <p className="text-slate-400 text-sm mt-1">Confidential · {new Date().toLocaleDateString()}</p>
        </div>

        {renderPreview()}
      </div>
    </div>
  );
};

export default Reports;
