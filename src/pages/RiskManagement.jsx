import { useState, useMemo } from 'react';
import { Plus, Download, Edit2, Trash2, ChevronDown, Search, AlertTriangle, Shield, Building2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV, exportRiskPDF } from '../utils/exportUtils';

const CATEGORIES = ['Information Security', 'Cyber Threat', 'People', 'Third Party', 'Operational', 'Compliance', 'Physical', 'Financial', 'Legal', 'Reputational'];
const TREATMENTS = ['mitigate', 'accept', 'transfer', 'avoid'];
const STATUSES = ['open', 'mitigated', 'accepted', 'closed'];
const FRAMEWORKS = ['NIST RMF', 'ISO 27001', 'ISO 22301', 'COSO ERM', 'GDPR', 'PCI DSS', 'COBIT'];
const TP_CATEGORIES = ['Cloud Infrastructure', 'SaaS / CRM', 'SaaS / HR', 'SaaS / Finance', 'Professional Services', 'Hardware / OEM', 'Telecom / ISP', 'Payroll', 'Legal / Compliance', 'Other'];
const CRITICALITIES = ['critical', 'high', 'medium', 'low'];
const NIST_800_161_CONTROLS = [
  { id: 'SR-1',  title: 'Policy and Procedures' },
  { id: 'SR-2',  title: 'Supply Chain Risk Management Plan' },
  { id: 'SR-3',  title: 'Supply Chain Controls and Processes' },
  { id: 'SR-4',  title: 'Provenance' },
  { id: 'SR-5',  title: 'Acquisition Strategies, Tools, and Methods' },
  { id: 'SR-6',  title: 'Supplier Assessments and Reviews' },
  { id: 'SR-7',  title: 'Supply Chain Operations Security' },
  { id: 'SR-8',  title: 'Notification Agreements' },
  { id: 'SR-9',  title: 'Tamper Resistance and Detection' },
  { id: 'SR-10', title: 'Inspection of Systems or Components' },
  { id: 'SR-11', title: 'Component Authenticity' },
  { id: 'SR-12', title: 'Component Disposal' },
];

const getRiskLevel = (score, appetite) => {
  const a = appetite || { low: 5, medium: 9, high: 14 };
  if (score > a.high) return { label: 'Critical', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', cell: '#dc2626' };
  if (score > a.medium) return { label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', cell: '#ea580c' };
  if (score > a.low) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', cell: '#ca8a04' };
  return { label: 'Low', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', cell: '#16a34a' };
};

const criticalityMeta = {
  critical: { color: 'bg-red-100 text-red-700' },
  high:     { color: 'bg-orange-100 text-orange-700' },
  medium:   { color: 'bg-yellow-100 text-yellow-700' },
  low:      { color: 'bg-green-100 text-green-700' },
};

const MATRIX_CELL_COLORS = [
  ['#fef3c7', '#fde68a', '#fbbf24', '#f97316', '#ef4444'],
  ['#dcfce7', '#fef3c7', '#fde68a', '#fbbf24', '#f97316'],
  ['#dcfce7', '#dcfce7', '#fef3c7', '#fde68a', '#fbbf24'],
  ['#d1fae5', '#dcfce7', '#dcfce7', '#fef3c7', '#fde68a'],
  ['#d1fae5', '#d1fae5', '#dcfce7', '#dcfce7', '#fef3c7'],
];

const EMPTY_RISK = { title: '', description: '', category: 'Information Security', probability: 3, impact: 3, owner: '', status: 'open', treatment: 'mitigate', treatmentPlan: '', framework: 'NIST RMF', tags: '' };
const EMPTY_TP = { name: '', category: 'Cloud Infrastructure', criticality: 'medium', description: '', contactName: '', contactEmail: '', inherentRisk: 3, residualRisk: 2, status: 'active', lastReview: '', nextReview: '', nistControls: [], notes: '' };

// ─── Risk Matrix ──────────────────────────────────────────────────────────────
const RiskMatrix = ({ risks }) => {
  const [hovered, setHovered] = useState(null);
  const getCell = (prob, imp) => risks.filter(r => r.probability === prob && r.impact === imp);
  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-1">Risk Heat Map</h3>
      <p className="text-xs text-gray-500 mb-4">Probability × Impact matrix. Hover cells for details.</p>
      <div className="flex gap-4 items-start">
        <div className="flex flex-col items-center justify-center h-64 -mt-4">
          <span className="text-xs text-gray-500 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Impact ↑</span>
        </div>
        <div className="flex-1">
          <div className="grid" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 2 }}>
            <div />
            {[1, 2, 3, 4, 5].map(p => <div key={p} className="text-center text-xs font-medium text-gray-500 pb-1">{p}</div>)}
            {[5, 4, 3, 2, 1].map((imp, ri) => (
              <>
                <div key={`label-${imp}`} className="flex items-center justify-end pr-1 text-xs font-medium text-gray-500">{imp}</div>
                {[1, 2, 3, 4, 5].map((prob, ci) => {
                  const cellRisks = getCell(prob, imp);
                  const score = prob * imp;
                  const bg = MATRIX_CELL_COLORS[ri][ci];
                  const isHovered = hovered === `${prob}-${imp}`;
                  return (
                    <div key={`${prob}-${imp}`} className="relative rounded-lg flex items-center justify-center cursor-default transition-all border"
                      style={{ height: 52, backgroundColor: bg, borderColor: isHovered ? '#1e40af' : 'transparent', borderWidth: isHovered ? 2 : 1 }}
                      onMouseEnter={() => setHovered(`${prob}-${imp}`)} onMouseLeave={() => setHovered(null)}>
                      <span className="text-xs font-bold text-gray-700 opacity-60">{score}</span>
                      {cellRisks.length > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-slate-800 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">{cellRisks.length}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">Probability →</p>
        </div>
        <div className="text-xs space-y-1.5 flex-shrink-0">
          {[{ label: 'Critical (15-25)', bg: '#ef4444' }, { label: 'High (10-14)', bg: '#f97316' }, { label: 'Medium (6-9)', bg: '#fbbf24' }, { label: 'Low (1-5)', bg: '#d1fae5' }].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: l.bg }} />
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
          {hovered && (() => {
            const [p, i] = hovered.split('-').map(Number);
            const cr = getCell(p, i);
            return cr.length > 0 ? (
              <div className="mt-3 pt-3 border-t border-gray-200 max-w-36">
                <p className="font-semibold text-gray-700 mb-1">P{p}×I{i}:</p>
                {cr.map(r => <p key={r.id} className="text-gray-600 truncate">• {r.title}</p>)}
              </div>
            ) : null;
          })()}
        </div>
      </div>
    </div>
  );
};

// ─── Risk Form ────────────────────────────────────────────────────────────────
const RiskForm = ({ initial, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_RISK, owner: currentUser?.name || '', ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const score = form.probability * form.impact;
  const level = getRiskLevel(score);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Risk Title *</label><input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} required /></div>
        <div className="col-span-2"><label className="label">Description</label><textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div><label className="label">Category</label><select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Framework</label><select className="input-field" value={form.framework} onChange={e => set('framework', e.target.value)}>{FRAMEWORKS.map(f => <option key={f}>{f}</option>)}</select></div>
        <div><label className="label">Probability: <span className="text-blue-600 font-bold">{form.probability}</span></label><input type="range" min={1} max={5} value={form.probability} onChange={e => set('probability', +e.target.value)} className="w-full accent-blue-600" /><div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 (Rare)</span><span>5 (Certain)</span></div></div>
        <div><label className="label">Impact: <span className="text-blue-600 font-bold">{form.impact}</span></label><input type="range" min={1} max={5} value={form.impact} onChange={e => set('impact', +e.target.value)} className="w-full accent-blue-600" /><div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 (Negligible)</span><span>5 (Critical)</span></div></div>
        <div className="col-span-2"><div className={`flex items-center gap-3 rounded-xl p-3 ${level.color}`}><AlertTriangle size={18} /><span className="font-semibold">Risk Score: {score} — {level.label}</span></div></div>
        <div><label className="label">Owner</label><input className="input-field" value={form.owner} onChange={e => set('owner', e.target.value)} /></div>
        <div><label className="label">Status</label><select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>{STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select></div>
        <div><label className="label">Treatment</label><select className="input-field" value={form.treatment} onChange={e => set('treatment', e.target.value)}>{TREATMENTS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}</select></div>
        <div><label className="label">Tags (comma-separated)</label><input className="input-field" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={e => set('tags', e.target.value)} /></div>
        <div className="col-span-2"><label className="label">Treatment Plan</label><textarea className="input-field resize-none" rows={3} value={form.treatmentPlan} onChange={e => set('treatmentPlan', e.target.value)} /></div>
      </div>
      <div className="flex gap-3 justify-end"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save Risk</button></div>
    </form>
  );
};

// ─── Third-Party Vendor Form ──────────────────────────────────────────────────
const ThirdPartyForm = ({ initial, onSave, onCancel }) => {
  const [f, setF] = useState({ ...EMPTY_TP, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const toggleControl = (id) => set('nistControls', f.nistControls.includes(id) ? f.nistControls.filter(c => c !== id) : [...f.nistControls, id]);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Vendor / Supplier Name *</label><input className="input-field" value={f.name} onChange={e => set('name', e.target.value)} required /></div>
        <div><label className="label">Category</label><select className="input-field" value={f.category} onChange={e => set('category', e.target.value)}>{TP_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
        <div><label className="label">Criticality</label><select className="input-field" value={f.criticality} onChange={e => set('criticality', e.target.value)}>{CRITICALITIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}</select></div>
        <div className="col-span-2"><label className="label">Description / Purpose</label><textarea className="input-field resize-none" rows={2} value={f.description} onChange={e => set('description', e.target.value)} /></div>
        <div><label className="label">Contact Name</label><input className="input-field" value={f.contactName} onChange={e => set('contactName', e.target.value)} /></div>
        <div><label className="label">Contact Email</label><input type="email" className="input-field" value={f.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></div>
        <div><label className="label">Inherent Risk (1–5): <span className="text-blue-600 font-bold">{f.inherentRisk}</span></label><input type="range" min={1} max={5} value={f.inherentRisk} onChange={e => set('inherentRisk', +e.target.value)} className="w-full accent-blue-600" /></div>
        <div><label className="label">Residual Risk (1–5): <span className="text-green-600 font-bold">{f.residualRisk}</span></label><input type="range" min={1} max={5} value={f.residualRisk} onChange={e => set('residualRisk', +e.target.value)} className="w-full accent-green-600" /></div>
        <div><label className="label">Status</label><select className="input-field" value={f.status} onChange={e => set('status', e.target.value)}><option value="active">Active</option><option value="under-assessment">Under Assessment</option><option value="offboarded">Offboarded</option></select></div>
        <div><label className="label">Last Review</label><input type="date" className="input-field" value={f.lastReview} onChange={e => set('lastReview', e.target.value)} /></div>
        <div><label className="label">Next Review</label><input type="date" className="input-field" value={f.nextReview} onChange={e => set('nextReview', e.target.value)} /></div>
      </div>
      <div>
        <label className="label">NIST SP 800-161 Controls Applied</label>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {NIST_800_161_CONTROLS.map(c => (
            <label key={c.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors ${f.nistControls.includes(c.id) ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="checkbox" className="accent-blue-600" checked={f.nistControls.includes(c.id)} onChange={() => toggleControl(c.id)} />
              <span className="font-mono text-xs font-bold text-blue-600 w-10">{c.id}</span>
              <span className="truncate">{c.title}</span>
            </label>
          ))}
        </div>
      </div>
      <div><label className="label">Notes</label><textarea className="input-field resize-none" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} /></div>
      <div className="flex gap-3 justify-end"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary">Save Vendor</button></div>
    </form>
  );
};

// ─── Risk Register Tab ────────────────────────────────────────────────────────
const RiskRegisterTab = ({ risks, addRisk, updateRisk, deleteRisk, settings }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRisk, setEditRisk] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const appetite = settings?.riskAppetite;

  const filtered = useMemo(() => risks.filter(r => {
    const score = r.probability * r.impact;
    const level = getRiskLevel(score, appetite).label;
    return (!search || r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase())) &&
      (filterCat === 'all' || r.category === filterCat) &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterLevel === 'all' || level === filterLevel);
  }), [risks, search, filterCat, filterStatus, filterLevel, appetite]);

  const catData = Object.entries(risks.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {})).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#ec4899'];

  const handleSave = (data) => { if (editRisk) updateRisk(editRisk.id, data); else addRisk(data); setModalOpen(false); };
  const handleDelete = (id) => { if (window.confirm('Delete this risk?')) deleteRisk(id); };
  const levelCounts = ['Critical', 'High', 'Medium', 'Low'].map(l => ({ label: l, count: risks.filter(r => getRiskLevel(r.probability * r.impact, appetite).label === l).length, color: getRiskLevel({ Critical: 16, High: 11, Medium: 7, Low: 1 }[l], appetite).color }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{risks.length} risks identified · NIST RMF aligned</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2"><Download size={15} /> Export <ChevronDown size={13} /></button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button onClick={() => { exportToCSV(filtered.map(r => ({ Title: r.title, Category: r.category, Probability: r.probability, Impact: r.impact, Score: r.probability*r.impact, Level: getRiskLevel(r.probability*r.impact, appetite).label, Owner: r.owner, Status: r.status, Treatment: r.treatment })), 'risk_register'); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                <button onClick={() => { exportRiskPDF(filtered); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF</button>
              </div>
            )}
          </div>
          <button onClick={() => { setEditRisk(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Risk</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {levelCounts.map(l => (
          <button key={l.label} onClick={() => setFilterLevel(filterLevel === l.label ? 'all' : l.label)} className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${filterLevel === l.label ? 'ring-2 ring-blue-500 shadow-sm' : 'bg-white hover:shadow-sm'} ${l.color}`}>
            <p className="text-2xl font-bold">{l.count}</p><p className="text-xs font-semibold mt-0.5">{l.label} Risks</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2"><RiskMatrix risks={risks} /></div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Risks by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">{catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}</Pie><Tooltip /><Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-9 py-2" placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="input-field w-auto py-2" value={filterCat} onChange={e => setFilterCat(e.target.value)}><option value="all">All Categories</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        <select className="input-field w-auto py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">All Statuses</option>{STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}</select>
        <select className="input-field w-auto py-2" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}><option value="all">All Levels</option>{['Critical','High','Medium','Low'].map(l => <option key={l}>{l}</option>)}</select>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200"><h3 className="font-semibold text-gray-900">Risk Register</h3></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-200">
            <th className="table-header w-8" />
            <th className="table-header">Risk Title</th>
            <th className="table-header">Category</th>
            <th className="table-header w-16 text-center">P</th>
            <th className="table-header w-16 text-center">I</th>
            <th className="table-header w-16 text-center">Score</th>
            <th className="table-header w-24">Level</th>
            <th className="table-header">Owner</th>
            <th className="table-header w-24">Status</th>
            <th className="table-header w-24">Treatment</th>
            <th className="table-header w-20">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && <tr><td colSpan={11} className="table-cell text-center text-gray-400 py-12">No risks found</td></tr>}
            {filtered.map(r => {
              const score = r.probability * r.impact;
              const level = getRiskLevel(score, appetite);
              const isExpanded = expandedRow === r.id;
              const statusColors = { open: 'bg-orange-100 text-orange-700', mitigated: 'bg-green-100 text-green-700', accepted: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-500' };
              return (
                <>
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell"><button onClick={() => setExpandedRow(isExpanded ? null : r.id)} className="p-1 rounded text-gray-400 hover:text-gray-600">{isExpanded ? <ChevronDown size={14} /> : <ChevronDown size={14} className="-rotate-90" />}</button></td>
                    <td className="table-cell font-medium text-gray-900 max-w-xs"><div className="truncate">{r.title}</div></td>
                    <td className="table-cell text-gray-600 text-xs">{r.category}</td>
                    <td className="table-cell text-center font-semibold text-gray-700">{r.probability}</td>
                    <td className="table-cell text-center font-semibold text-gray-700">{r.impact}</td>
                    <td className="table-cell text-center font-bold text-gray-900">{score}</td>
                    <td className="table-cell"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${level.color}`}>{level.label}</span></td>
                    <td className="table-cell text-gray-600 text-xs">{r.owner || '—'}</td>
                    <td className="table-cell"><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[r.status]}`}>{r.status}</span></td>
                    <td className="table-cell text-gray-600 text-xs capitalize">{r.treatment}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditRisk(r); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.id}-exp`} className="bg-blue-50/50">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><p className="font-semibold text-gray-700 mb-1">Description</p><p className="text-gray-600">{r.description||'—'}</p></div>
                          <div><p className="font-semibold text-gray-700 mb-1">Treatment Plan</p><p className="text-gray-600">{r.treatmentPlan||'—'}</p></div>
                          <div className="space-y-1">
                            <p><span className="font-semibold text-gray-700">Framework:</span> <span className="text-gray-600">{r.framework||'—'}</span></p>
                            <p><span className="font-semibold text-gray-700">Identified:</span> <span className="text-gray-600">{r.dateIdentified}</span></p>
                            <p><span className="font-semibold text-gray-700">Last Review:</span> <span className="text-gray-600">{r.lastReview}</span></p>
                            {Array.isArray(r.tags)&&r.tags.length>0&&<div className="flex gap-1 flex-wrap mt-1">{r.tags.map(t=><span key={t} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>)}</div>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">Showing {filtered.length} of {risks.length} risks</div>
      </div>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editRisk ? 'Edit Risk' : 'Add New Risk'} size="lg">
        <RiskForm initial={editRisk || {}} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

// ─── Third-Party Risk Tab ─────────────────────────────────────────────────────
const ThirdPartyTab = ({ vendors, addThirdPartyRisk, updateThirdPartyRisk, deleteThirdPartyRisk }) => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  const filtered = useMemo(() => vendors.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.category.toLowerCase().includes(search.toLowerCase())
  ), [vendors, search]);

  const handleSave = (data) => { if (editVendor) updateThirdPartyRisk(editVendor.id, data); else addThirdPartyRisk(data); setModalOpen(false); };
  const handleDelete = (id) => { if (window.confirm('Delete this vendor?')) deleteThirdPartyRisk(id); };

  const critCounts = CRITICALITIES.map(c => ({ label: c, count: vendors.filter(v => v.criticality === c).length }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{vendors.length} third-party vendors · NIST SP 800-161 aligned</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(filtered.map(v => ({ Name: v.name, Category: v.category, Criticality: v.criticality, 'Inherent Risk': v.inherentRisk, 'Residual Risk': v.residualRisk, Status: v.status, 'Last Review': v.lastReview, 'Next Review': v.nextReview, Controls: v.nistControls.join(', ') })), 'third_party_risks')} className="btn-secondary flex items-center gap-2"><Download size={15} /> Export CSV</button>
          <button onClick={() => { setEditVendor(null); setModalOpen(true); }} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Vendor</button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        {critCounts.map(c => (
          <div key={c.label} className={`card py-3 px-4 ${criticalityMeta[c.label]?.color || ''}`}>
            <p className="text-2xl font-bold">{c.count}</p>
            <p className="text-xs font-semibold mt-0.5 capitalize">{c.label} Criticality</p>
          </div>
        ))}
      </div>

      {/* NIST SP 800-161 info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <Shield size={16} className="flex-shrink-0 mt-0.5 text-blue-600" />
        <div>
          <p className="font-semibold">NIST SP 800-161 Rev 1 — Supply Chain Risk Management</p>
          <p className="text-blue-600 text-xs mt-0.5">Track which supply chain risk controls (SR-1 through SR-12) are applied to each vendor. Click a row to see details.</p>
        </div>
      </div>

      {/* Search */}
      <div className="card py-3 flex items-center gap-3">
        <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input-field pl-9 py-2" placeholder="Search vendors…" value={search} onChange={e => setSearch(e.target.value)} /></div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-200">
            <th className="table-header w-8" />
            <th className="table-header">Vendor / Supplier</th>
            <th className="table-header">Category</th>
            <th className="table-header">Criticality</th>
            <th className="table-header text-center">Inherent Risk</th>
            <th className="table-header text-center">Residual Risk</th>
            <th className="table-header">NIST Controls</th>
            <th className="table-header">Status</th>
            <th className="table-header">Next Review</th>
            <th className="table-header w-20">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && <tr><td colSpan={10} className="table-cell text-center text-gray-400 py-12">No vendors found</td></tr>}
            {filtered.map(v => {
              const cm = criticalityMeta[v.criticality] || criticalityMeta['low'];
              const isExpanded = expandedRow === v.id;
              const statusColor = { active: 'bg-green-100 text-green-700', 'under-assessment': 'bg-yellow-100 text-yellow-700', offboarded: 'bg-gray-100 text-gray-500' };
              return (
                <>
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell"><button onClick={() => setExpandedRow(isExpanded ? null : v.id)} className="p-1 rounded text-gray-400 hover:text-gray-600">{isExpanded ? <ChevronDown size={14} /> : <ChevronDown size={14} className="-rotate-90" />}</button></td>
                    <td className="table-cell font-medium text-gray-900">{v.name}</td>
                    <td className="table-cell text-gray-600 text-xs">{v.category}</td>
                    <td className="table-cell"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cm.color}`}>{v.criticality}</span></td>
                    <td className="table-cell text-center"><span className="font-bold text-gray-700">{v.inherentRisk}/5</span></td>
                    <td className="table-cell text-center"><span className="font-bold text-green-700">{v.residualRisk}/5</span></td>
                    <td className="table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {(v.nistControls || []).slice(0, 4).map(c => <span key={c} className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{c}</span>)}
                        {(v.nistControls || []).length > 4 && <span className="text-xs text-gray-500">+{v.nistControls.length - 4}</span>}
                      </div>
                    </td>
                    <td className="table-cell"><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColor[v.status] || 'bg-gray-100 text-gray-500'}`}>{v.status.replace('-', ' ')}</span></td>
                    <td className="table-cell text-xs text-gray-600">{v.nextReview || '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditVendor(v); setModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${v.id}-exp`} className="bg-blue-50/50">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div><p className="font-semibold text-gray-700 mb-1">Description</p><p className="text-gray-600">{v.description||'—'}</p></div>
                          <div><p className="font-semibold text-gray-700 mb-1">Contact</p><p className="text-gray-600">{v.contactName||'—'}{v.contactEmail && <><br /><span className="text-blue-600">{v.contactEmail}</span></>}</p></div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">NIST SP 800-161 Controls</p>
                            <div className="flex gap-1 flex-wrap">
                              {(v.nistControls||[]).map(c => {
                                const ctrl = NIST_800_161_CONTROLS.find(x => x.id === c);
                                return <span key={c} title={ctrl?.title} className="text-xs font-mono bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded cursor-default">{c}</span>;
                              })}
                              {(v.nistControls||[]).length === 0 && <span className="text-gray-400">None assigned</span>}
                            </div>
                            {v.notes && <p className="text-gray-600 mt-2">{v.notes}</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">Showing {filtered.length} of {vendors.length} vendors</div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editVendor ? 'Edit Vendor' : 'Add Third-Party Vendor'} size="lg">
        <ThirdPartyForm initial={editVendor || {}} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

// ─── Risk Appetite Tab ────────────────────────────────────────────────────────
const RiskAppetiteTab = ({ settings, updateSettings }) => {
  const appetite = settings?.riskAppetite || { low: 5, medium: 9, high: 14 };
  const [a, setA] = useState(appetite);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSettings({ riskAppetite: a });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const levels = [
    { key: 'low',    label: 'Low / Acceptable',    desc: 'Risks at or below this score are acceptable with current controls.', color: 'border-green-300 bg-green-50',   textColor: 'text-green-800', badgeColor: 'bg-green-100 text-green-700'   },
    { key: 'medium', label: 'Medium / Tolerable',  desc: 'Risks in this range require monitoring and may need treatment.',     color: 'border-yellow-300 bg-yellow-50', textColor: 'text-yellow-800',badgeColor: 'bg-yellow-100 text-yellow-700' },
    { key: 'high',   label: 'High / Unacceptable', desc: 'Risks above this score are unacceptable and require immediate action.', color: 'border-red-300 bg-red-50',     textColor: 'text-red-800',   badgeColor: 'bg-red-100 text-red-700'     },
  ];

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h3 className="font-semibold text-gray-900">Risk Appetite Settings</h3>
        <p className="text-sm text-gray-500 mt-1">Define the maximum acceptable risk score (Probability × Impact, max 25) for each tolerance level. Scores above the High threshold are classified as Critical / Intolerable.</p>
      </div>

      <div className="space-y-3">
        {levels.map(({ key, label, desc, color, textColor, badgeColor }) => (
          <div key={key} className={`border rounded-xl p-4 ${color}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={`font-semibold ${textColor}`}>{label}</p>
                <p className={`text-xs mt-0.5 ${textColor} opacity-80`}>{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Max score:</span>
                <input type="number" min={1} max={25} value={a[key]} onChange={e => setA(p => ({ ...p, [key]: +e.target.value }))}
                  className={`w-16 text-center font-bold rounded-lg border px-2 py-1 text-sm ${badgeColor}`} />
              </div>
            </div>
          </div>
        ))}
        <div className="border border-slate-300 bg-slate-50 rounded-xl p-4">
          <p className="font-semibold text-slate-700">Critical / Intolerable</p>
          <p className="text-xs text-slate-500 mt-0.5">Automatically applied to any risk with a score above {a.high}. Requires immediate escalation and treatment.</p>
          <span className="inline-block mt-2 text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Score &gt; {a.high}</span>
        </div>
      </div>

      <button onClick={save} className={`btn-primary ${saved ? 'bg-green-600 hover:bg-green-700' : ''}`}>
        {saved ? '✓ Saved' : 'Save Risk Appetite'}
      </button>

      <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Thresholds Preview</p>
        <div className="flex gap-2">
          {[
            { label: 'Low', range: `1–${a.low}`,            bg: 'bg-green-500' },
            { label: 'Medium', range: `${a.low+1}–${a.medium}`,  bg: 'bg-yellow-500' },
            { label: 'High', range: `${a.medium+1}–${a.high}`,   bg: 'bg-orange-500' },
            { label: 'Critical', range: `${a.high+1}–25`,       bg: 'bg-red-600' },
          ].map(item => (
            <div key={item.label} className="flex-1 text-center">
              <div className={`${item.bg} rounded-lg py-2 text-white font-bold text-xs`}>{item.label}</div>
              <p className="text-xs text-gray-500 mt-1">{item.range}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const RiskManagement = () => {
  const { risks, addRisk, updateRisk, deleteRisk, thirdPartyRisks, addThirdPartyRisk, updateThirdPartyRisk, deleteThirdPartyRisk, settings, updateSettings } = useData();
  const [activeTab, setActiveTab] = useState('register');

  const tabs = [
    { key: 'register',    label: 'Risk Register',       icon: AlertTriangle },
    { key: 'third-party', label: 'Third-Party Risk',    icon: Building2 },
    { key: 'appetite',    label: 'Risk Appetite',       icon: Shield },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Risk Management</h2>
        <p className="text-sm text-gray-500 mt-0.5">NIST RMF · ISO 27005 · NIST SP 800-161</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'register' && <RiskRegisterTab risks={risks} addRisk={addRisk} updateRisk={updateRisk} deleteRisk={deleteRisk} settings={settings} />}
      {activeTab === 'third-party' && <ThirdPartyTab vendors={thirdPartyRisks} addThirdPartyRisk={addThirdPartyRisk} updateThirdPartyRisk={updateThirdPartyRisk} deleteThirdPartyRisk={deleteThirdPartyRisk} />}
      {activeTab === 'appetite' && <RiskAppetiteTab settings={settings} updateSettings={updateSettings} />}
    </div>
  );
};

export default RiskManagement;
