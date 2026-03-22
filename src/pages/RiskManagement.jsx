import { useState, useMemo } from 'react';
import { Plus, Download, Edit2, Trash2, ChevronDown, Search, AlertTriangle, Info } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV, exportRiskPDF } from '../utils/exportUtils';

const CATEGORIES = ['Information Security', 'Cyber Threat', 'People', 'Third Party', 'Operational', 'Compliance', 'Physical', 'Financial', 'Legal', 'Reputational'];
const TREATMENTS = ['mitigate', 'accept', 'transfer', 'avoid'];
const STATUSES = ['open', 'mitigated', 'accepted', 'closed'];
const FRAMEWORKS = ['NIST RMF', 'ISO 27001', 'ISO 22301', 'COSO ERM', 'GDPR', 'PCI DSS', 'COBIT'];

const getRiskLevel = (score) => {
  if (score >= 15) return { label: 'Critical', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', cell: '#dc2626' };
  if (score >= 10) return { label: 'High', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500', cell: '#ea580c' };
  if (score >= 6) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500', cell: '#ca8a04' };
  return { label: 'Low', color: 'bg-green-100 text-green-700', dot: 'bg-green-500', cell: '#16a34a' };
};

const MATRIX_CELL_COLORS = [
  // rows = impact 5→1, cols = probability 1→5
  ['#fef3c7', '#fde68a', '#fbbf24', '#f97316', '#ef4444'], // impact 5
  ['#dcfce7', '#fef3c7', '#fde68a', '#fbbf24', '#f97316'], // impact 4
  ['#dcfce7', '#dcfce7', '#fef3c7', '#fde68a', '#fbbf24'], // impact 3
  ['#d1fae5', '#dcfce7', '#dcfce7', '#fef3c7', '#fde68a'], // impact 2
  ['#d1fae5', '#d1fae5', '#dcfce7', '#dcfce7', '#fef3c7'], // impact 1
];

const EMPTY_RISK = {
  title: '', description: '', category: 'Information Security', probability: 3, impact: 3,
  owner: '', status: 'open', treatment: 'mitigate', treatmentPlan: '', framework: 'NIST RMF', tags: '',
};

// ─── Risk Matrix (Heat Map) ───────────────────────────────────────────────────
const RiskMatrix = ({ risks }) => {
  const [hovered, setHovered] = useState(null);

  const getCell = (prob, imp) => risks.filter(r => r.probability === prob && r.impact === imp);

  return (
    <div className="card">
      <h3 className="font-semibold text-gray-900 mb-1">Risk Heat Map</h3>
      <p className="text-xs text-gray-500 mb-4">Probability × Impact matrix. Hover cells for details.</p>
      <div className="flex gap-4 items-start">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center h-64 -mt-4">
          <span className="text-xs text-gray-500 font-medium" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Impact ↑</span>
        </div>

        <div className="flex-1">
          <div className="grid" style={{ gridTemplateColumns: 'auto repeat(5, 1fr)', gap: 2 }}>
            {/* Column headers */}
            <div />
            {[1, 2, 3, 4, 5].map(p => <div key={p} className="text-center text-xs font-medium text-gray-500 pb-1">{p}</div>)}

            {/* Rows: impact 5→1 */}
            {[5, 4, 3, 2, 1].map((imp, ri) => (
              <>
                <div key={`label-${imp}`} className="flex items-center justify-end pr-1 text-xs font-medium text-gray-500">{imp}</div>
                {[1, 2, 3, 4, 5].map((prob, ci) => {
                  const cellRisks = getCell(prob, imp);
                  const score = prob * imp;
                  const bg = MATRIX_CELL_COLORS[ri][ci];
                  const isHovered = hovered === `${prob}-${imp}`;
                  return (
                    <div
                      key={`${prob}-${imp}`}
                      className="relative rounded-lg flex items-center justify-center cursor-default transition-all border"
                      style={{ height: 52, backgroundColor: bg, borderColor: isHovered ? '#1e40af' : 'transparent', borderWidth: isHovered ? 2 : 1 }}
                      onMouseEnter={() => setHovered(`${prob}-${imp}`)}
                      onMouseLeave={() => setHovered(null)}
                    >
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

        {/* Legend */}
        <div className="text-xs space-y-1.5 flex-shrink-0">
          {[
            { label: 'Critical (15-25)', bg: '#ef4444' },
            { label: 'High (10-14)', bg: '#f97316' },
            { label: 'Medium (6-9)', bg: '#fbbf24' },
            { label: 'Low (1-5)', bg: '#d1fae5' },
          ].map(l => (
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
        <div className="col-span-2">
          <label className="label">Risk Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Brief risk title" />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Detailed risk description…" />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Framework Reference</label>
          <select className="input-field" value={form.framework} onChange={e => set('framework', e.target.value)}>
            {FRAMEWORKS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>

        {/* Probability & Impact sliders */}
        <div>
          <label className="label">Probability: <span className="text-blue-600 font-bold">{form.probability}</span></label>
          <input type="range" min={1} max={5} value={form.probability} onChange={e => set('probability', +e.target.value)} className="w-full accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 (Rare)</span><span>5 (Almost certain)</span></div>
        </div>
        <div>
          <label className="label">Impact: <span className="text-blue-600 font-bold">{form.impact}</span></label>
          <input type="range" min={1} max={5} value={form.impact} onChange={e => set('impact', +e.target.value)} className="w-full accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 (Negligible)</span><span>5 (Critical)</span></div>
        </div>

        {/* Risk Score Display */}
        <div className="col-span-2">
          <div className={`flex items-center gap-3 rounded-xl p-3 ${level.color}`}>
            <AlertTriangle size={18} />
            <span className="font-semibold">Risk Score: {score} — {level.label}</span>
          </div>
        </div>

        <div>
          <label className="label">Risk Owner</label>
          <input className="input-field" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Responsible person/team" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Treatment</label>
          <select className="input-field" value={form.treatment} onChange={e => set('treatment', e.target.value)}>
            {TREATMENTS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tags (comma-separated)</label>
          <input className="input-field" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={e => set('tags', e.target.value)} placeholder="cyber, data, operational" />
        </div>
        <div className="col-span-2">
          <label className="label">Treatment Plan</label>
          <textarea className="input-field resize-none" rows={3} value={form.treatmentPlan} onChange={e => set('treatmentPlan', e.target.value)} placeholder="Describe the risk treatment or mitigation actions…" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Risk</button>
      </div>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const RiskManagement = () => {
  const { risks, addRisk, updateRisk, deleteRisk } = useData();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editRisk, setEditRisk] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showExport, setShowExport] = useState(false);

  const filtered = useMemo(() => risks.filter(r => {
    const score = r.probability * r.impact;
    const level = getRiskLevel(score).label;
    return (
      (!search || r.title.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase())) &&
      (filterCat === 'all' || r.category === filterCat) &&
      (filterStatus === 'all' || r.status === filterStatus) &&
      (filterLevel === 'all' || level === filterLevel)
    );
  }), [risks, search, filterCat, filterStatus, filterLevel]);

  // Category pie chart data
  const catData = Object.entries(risks.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {}))
    .map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#84cc16', '#ec4899'];

  const openAdd = () => { setEditRisk(null); setModalOpen(true); };
  const openEdit = (r) => { setEditRisk(r); setModalOpen(true); };

  const handleSave = (data) => {
    if (editRisk) updateRisk(editRisk.id, data);
    else addRisk(data);
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this risk?')) deleteRisk(id);
  };

  const levelCounts = ['Critical', 'High', 'Medium', 'Low'].map(l => ({
    label: l,
    count: risks.filter(r => getRiskLevel(r.probability * r.impact).label === l).length,
    color: getRiskLevel({ Critical: 15, High: 10, Medium: 6, Low: 1 }[l]).color,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Risk Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{risks.length} risks identified · NIST RMF aligned</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button onClick={() => { exportToCSV(filtered.map(r => ({ Title: r.title, Category: r.category, Probability: r.probability, Impact: r.impact, Score: r.probability * r.impact, Level: getRiskLevel(r.probability * r.impact).label, Owner: r.owner, Status: r.status, Treatment: r.treatment })), 'risk_register'); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                <button onClick={() => { exportRiskPDF(filtered); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF</button>
              </div>
            )}
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Risk</button>
        </div>
      </div>

      {/* Level KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {levelCounts.map(l => (
          <button key={l.label} onClick={() => setFilterLevel(filterLevel === l.label ? 'all' : l.label)}
            className={`rounded-xl border p-3 text-left cursor-pointer transition-all ${filterLevel === l.label ? 'ring-2 ring-blue-500 shadow-sm' : 'bg-white hover:shadow-sm'} ${l.color}`}>
            <p className="text-2xl font-bold">{l.count}</p>
            <p className="text-xs font-semibold mt-0.5">{l.label} Risks</p>
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2">
          <RiskMatrix risks={risks} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Risks by Category</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                {catData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 10 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9 py-2" placeholder="Search risks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto py-2" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="input-field w-auto py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="input-field w-auto py-2" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="all">All Levels</option>
          {['Critical', 'High', 'Medium', 'Low'].map(l => <option key={l}>{l}</option>)}
        </select>
      </div>

      {/* Risk Register Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Risk Register</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-header w-8" />
              <th className="table-header">Risk Title</th>
              <th className="table-header">Category</th>
              <th className="table-header w-16 text-center">Prob</th>
              <th className="table-header w-16 text-center">Impact</th>
              <th className="table-header w-16 text-center">Score</th>
              <th className="table-header w-24">Level</th>
              <th className="table-header">Owner</th>
              <th className="table-header w-24">Status</th>
              <th className="table-header w-24">Treatment</th>
              <th className="table-header w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={11} className="table-cell text-center text-gray-400 py-12">No risks found</td></tr>
            )}
            {filtered.map(r => {
              const score = r.probability * r.impact;
              const level = getRiskLevel(score);
              const isExpanded = expandedRow === r.id;
              const statusColors = { open: 'bg-orange-100 text-orange-700', mitigated: 'bg-green-100 text-green-700', accepted: 'bg-blue-100 text-blue-700', closed: 'bg-gray-100 text-gray-500' };

              return (
                <>
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell">
                      <button onClick={() => setExpandedRow(isExpanded ? null : r.id)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronDown size={14} className="-rotate-90" />}
                      </button>
                    </td>
                    <td className="table-cell font-medium text-gray-900 max-w-xs">
                      <div className="truncate">{r.title}</div>
                    </td>
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
                        <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${r.id}-expanded`} className="bg-blue-50/50">
                      <td colSpan={11} className="px-6 py-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Description</p>
                            <p className="text-gray-600">{r.description || '—'}</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Treatment Plan</p>
                            <p className="text-gray-600">{r.treatmentPlan || '—'}</p>
                          </div>
                          <div className="space-y-1">
                            <p><span className="font-semibold text-gray-700">Framework:</span> <span className="text-gray-600">{r.framework || '—'}</span></p>
                            <p><span className="font-semibold text-gray-700">Identified:</span> <span className="text-gray-600">{r.dateIdentified}</span></p>
                            <p><span className="font-semibold text-gray-700">Last Review:</span> <span className="text-gray-600">{r.lastReview}</span></p>
                            {Array.isArray(r.tags) && r.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap mt-1">
                                {r.tags.map(t => <span key={t} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{t}</span>)}
                              </div>
                            )}
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
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Showing {filtered.length} of {risks.length} risks
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editRisk ? 'Edit Risk' : 'Add New Risk'} size="lg">
        <RiskForm initial={editRisk || {}} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default RiskManagement;
