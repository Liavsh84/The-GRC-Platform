import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Download, Edit2, Trash2, CheckCircle2, AlertCircle, XCircle, MinusCircle, ArrowLeft, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useData } from '../contexts/DataContext';
import Modal from '../components/common/Modal';
import AddFrameworkWizard from '../components/compliance/AddFrameworkWizard';
import { exportToCSV, exportCompliancePDF } from '../utils/exportUtils';

const STATUS_CONFIG = {
  compliant: { label: 'Compliant', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, iconColor: 'text-green-500' },
  partial: { label: 'Partial', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertCircle, iconColor: 'text-yellow-500' },
  'non-compliant': { label: 'Non-Compliant', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, iconColor: 'text-red-500' },
  'not-applicable': { label: 'N/A', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: MinusCircle, iconColor: 'text-gray-400' },
};

const TYPE_OPTIONS = ['standard', 'regulation', 'law', 'framework', 'guideline'];

const EMPTY_FW = { name: '', type: 'standard', description: '', version: '' };
const EMPTY_CTRL = { controlId: '', title: '', status: 'non-compliant', owner: '', dueDate: '', notes: '' };

const getScore = (framework) => {
  const t = framework.controls.length;
  if (!t) return 0;
  const c = framework.controls.filter(x => x.status === 'compliant').length;
  return Math.round((c / t) * 100);
};

const ScoreBar = ({ score }) => {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-10 text-right">{score}%</span>
    </div>
  );
};

// ─── Framework Form ───────────────────────────────────────────────────────────
const FrameworkForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...EMPTY_FW, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Framework / Standard Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. ISO 27001:2022" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Version</label>
          <input className="input-field" value={form.version} onChange={e => set('version', e.target.value)} placeholder="e.g. 2022" />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this framework or regulation…" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Framework</button>
      </div>
    </form>
  );
};

// ─── Control Form ─────────────────────────────────────────────────────────────
const ControlForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...EMPTY_CTRL, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Control ID *</label>
          <input className="input-field" value={form.controlId} onChange={e => set('controlId', e.target.value)} required placeholder="e.g. A.5.1" />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Control Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="Control name/description" />
        </div>
        <div>
          <label className="label">Owner / Responsible</label>
          <input className="input-field" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Name or team" />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input-field" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Notes / Evidence</label>
          <textarea className="input-field resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes, evidence, or remediation plan…" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Control</button>
      </div>
    </form>
  );
};

// ─── Gap Analysis View ────────────────────────────────────────────────────────
const GapAnalysis = ({ framework, onBack }) => {
  const { updateControl, addControl, deleteControl } = useData();
  const [controlModal, setControlModal] = useState(false);
  const [editControl, setEditControl] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showExport, setShowExport] = useState(false);

  const filtered = filterStatus === 'all' ? framework.controls : framework.controls.filter(c => c.status === filterStatus);

  const counts = Object.keys(STATUS_CONFIG).reduce((acc, k) => {
    acc[k] = framework.controls.filter(c => c.status === k).length;
    return acc;
  }, {});

  const score = getScore(framework);

  const openEdit = (ctrl) => { setEditControl(ctrl); setControlModal(true); };
  const openAdd = () => { setEditControl(null); setControlModal(true); };

  const handleSave = (data) => {
    if (editControl) updateControl(framework.id, editControl.id, data);
    else addControl(framework.id, data);
    setControlModal(false);
  };

  const handleDelete = (ctrlId) => {
    if (window.confirm('Remove this control?')) deleteControl(framework.id, ctrlId);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ArrowLeft size={18} /></button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{framework.name}</h2>
            <p className="text-sm text-gray-500 capitalize">{framework.type} · {framework.controls.length} controls</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button onClick={() => { exportToCSV(framework.controls.map(c => ({ 'Control ID': c.controlId, Title: c.title, Status: c.status, Owner: c.owner, 'Due Date': c.dueDate, Notes: c.notes })), `${framework.name}_gap_analysis`); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                <button onClick={() => { exportCompliancePDF(framework); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF</button>
              </div>
            )}
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Control</button>
        </div>
      </div>

      {/* Score + Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="card col-span-1 flex flex-col items-center justify-center py-4">
          <div className={`text-3xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{score}%</div>
          <p className="text-xs text-gray-500 mt-1">Compliance Score</p>
        </div>
        {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
          <button key={k} onClick={() => setFilterStatus(filterStatus === k ? 'all' : k)}
            className={`card py-3 text-center cursor-pointer transition-all ${filterStatus === k ? 'ring-2 ring-blue-500' : 'hover:shadow-sm'}`}>
            <cfg.icon size={20} className={`mx-auto mb-1 ${cfg.iconColor}`} />
            <p className="text-xl font-bold text-gray-900">{counts[k]}</p>
            <p className="text-xs text-gray-500">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Controls Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Gap Analysis — {framework.name}</h3>
          <select className="input-field w-auto py-1.5 text-xs" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-header w-28">Control ID</th>
              <th className="table-header">Title</th>
              <th className="table-header w-36">Status</th>
              <th className="table-header">Owner</th>
              <th className="table-header w-28">Due Date</th>
              <th className="table-header">Notes</th>
              <th className="table-header w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-10">No controls found</td></tr>
            )}
            {filtered.map(c => {
              const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG['not-applicable'];
              const StatusIcon = cfg.icon;
              return (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell font-mono text-xs font-semibold text-blue-700">{c.controlId}</td>
                  <td className="table-cell font-medium text-gray-900">{c.title}</td>
                  <td className="table-cell">
                    <select value={c.status} onChange={e => updateControl(framework.id, c.id, { status: e.target.value })}
                      className={`text-xs font-medium px-2 py-1 rounded-full border cursor-pointer ${cfg.color}`}>
                      {Object.entries(STATUS_CONFIG).map(([v, x]) => <option key={v} value={v}>{x.label}</option>)}
                    </select>
                  </td>
                  <td className="table-cell text-gray-600">{c.owner || '—'}</td>
                  <td className="table-cell text-gray-500 text-xs">{c.dueDate || '—'}</td>
                  <td className="table-cell text-gray-500 text-xs max-w-xs truncate">{c.notes || '—'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Showing {filtered.length} of {framework.controls.length} controls
        </div>
      </div>

      {/* Control Form Modal */}
      <Modal isOpen={controlModal} onClose={() => setControlModal(false)} title={editControl ? 'Edit Control' : 'Add Control'}>
        <ControlForm initial={editControl || {}} onSave={handleSave} onCancel={() => setControlModal(false)} />
      </Modal>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Compliance = () => {
  const { frameworks, addFramework, updateFramework, deleteFramework } = useData();
  const [selectedFw, setSelectedFw] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editFwModal, setEditFwModal] = useState(false);
  const [editFw, setEditFw] = useState(null);
  const [showExport, setShowExport] = useState(false);

  if (selectedFw) {
    const fw = frameworks.find(f => f.id === selectedFw);
    if (fw) return <GapAnalysis framework={fw} onBack={() => setSelectedFw(null)} />;
  }

  const totalControls = frameworks.reduce((s, f) => s + f.controls.length, 0);
  const compliantTotal = frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'compliant').length, 0);
  const overallScore = totalControls ? Math.round((compliantTotal / totalControls) * 100) : 0;

  const chartData = frameworks.map(f => ({
    name: f.name.split(':')[0].split(' ').slice(0, 2).join(' '),
    compliant: f.controls.filter(c => c.status === 'compliant').length,
    partial: f.controls.filter(c => c.status === 'partial').length,
    nonCompliant: f.controls.filter(c => c.status === 'non-compliant').length,
  }));

  const openEdit = (fw) => { setEditFw(fw); setEditFwModal(true); };

  const handleWizardSave = (data) => {
    addFramework(data);
  };

  const handleEditSave = (data) => {
    if (editFw) updateFramework(editFw.id, data);
    setEditFwModal(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Remove this framework and all its controls?')) deleteFramework(id);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Compliance</h2>
          <p className="text-sm text-gray-500 mt-0.5">{frameworks.length} frameworks · {totalControls} controls · {overallScore}% overall compliance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button onClick={() => { exportToCSV(frameworks.map(f => ({ Name: f.name, Type: f.type, Version: f.version, Controls: f.controls.length, Score: `${getScore(f)}%` })), 'compliance_frameworks'); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export Frameworks CSV</button>
              </div>
            )}
          </div>
          <button onClick={() => setWizardOpen(true)} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add Framework</button>
        </div>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Overall Score', value: `${overallScore}%`, color: overallScore >= 80 ? 'text-green-600' : overallScore >= 60 ? 'text-yellow-600' : 'text-red-600' },
          { label: 'Compliant Controls', value: compliantTotal, color: 'text-green-600' },
          { label: 'Gaps / Partial', value: frameworks.reduce((s, f) => s + f.controls.filter(c => c.status === 'partial' || c.status === 'non-compliant').length, 0), color: 'text-orange-600' },
          { label: 'Frameworks Tracked', value: frameworks.length, color: 'text-blue-600' },
        ].map(kpi => (
          <div key={kpi.label} className="card text-center">
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-sm text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Controls by Framework</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="compliant" stackId="a" fill="#16a34a" radius={[0, 0, 0, 0]} name="Compliant" />
              <Bar dataKey="partial" stackId="a" fill="#ca8a04" name="Partial" />
              <Bar dataKey="nonCompliant" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} name="Non-Compliant" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Frameworks Grid */}
      <div className="grid grid-cols-1 gap-4">
        {frameworks.map(fw => {
          const score = getScore(fw);
          const nc = fw.controls.filter(c => c.status === 'non-compliant').length;
          const partial = fw.controls.filter(c => c.status === 'partial').length;
          const typeColors = { standard: 'bg-blue-100 text-blue-700', regulation: 'bg-red-100 text-red-700', law: 'bg-purple-100 text-purple-700', framework: 'bg-green-100 text-green-700', guideline: 'bg-yellow-100 text-yellow-700' };

          return (
            <div key={fw.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{fw.name}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${typeColors[fw.type] || 'bg-gray-100 text-gray-600'}`}>{fw.type}</span>
                    {fw.version && <span className="text-xs text-gray-400">v{fw.version}</span>}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{fw.description}</p>
                  <ScoreBar score={score} />
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span className="text-green-600 font-medium">{fw.controls.filter(c => c.status === 'compliant').length} compliant</span>
                    <span className="text-yellow-600 font-medium">{partial} partial</span>
                    <span className="text-red-600 font-medium">{nc} non-compliant</span>
                    <span className="text-gray-500">{fw.controls.length} total</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setSelectedFw(fw.id)} className="btn-primary text-xs px-3 py-2">View Gap Analysis →</button>
                  <button onClick={() => openEdit(fw)} className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={15} /></button>
                  <button onClick={() => handleDelete(fw.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          );
        })}
        {frameworks.length === 0 && (
          <div className="card text-center text-gray-400 py-12">
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>No compliance frameworks yet.</p>
            <button onClick={() => setWizardOpen(true)} className="btn-primary mt-4">Add your first framework</button>
          </div>
        )}
      </div>

      {/* Add Framework Wizard */}
      <AddFrameworkWizard isOpen={wizardOpen} onClose={() => setWizardOpen(false)} onSave={handleWizardSave} />

      {/* Edit Framework Modal (keeps existing simple form) */}
      <Modal isOpen={editFwModal} onClose={() => setEditFwModal(false)} title="Edit Framework">
        <FrameworkForm initial={editFw || {}} onSave={handleEditSave} onCancel={() => setEditFwModal(false)} />
      </Modal>
    </div>
  );
};

export default Compliance;
