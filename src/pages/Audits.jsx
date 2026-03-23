import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, ChevronDown, AlertTriangle,
  CheckCircle, Clock, XCircle, Download, ArrowRight, ShieldAlert, Target } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/common/Modal';
import { exportToCSV } from '../utils/exportUtils';

const AUDIT_TYPES = ['internal', 'external', 'risk-assessment'];
const STANDARDS = ['ISO 27001:2022', 'ISO 27005', 'ISO 22301:2019', 'NIST CSF 2.0', 'NIST SP 800-53',
  'GDPR', 'PCI DSS 4.0', 'SOC 2', 'HIPAA', 'CMMC 2.0', 'CIS Controls v8', 'Custom'];
const STATUSES = ['planned', 'in-progress', 'completed', 'closed'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

const typeMeta = {
  'internal':         { label: 'Internal',         color: 'bg-blue-100 text-blue-700' },
  'external':         { label: 'External',          color: 'bg-purple-100 text-purple-700' },
  'risk-assessment':  { label: 'Risk Assessment',   color: 'bg-orange-100 text-orange-700' },
};
const statusMeta = {
  'planned':     { label: 'Planned',     color: 'bg-gray-100 text-gray-600',    icon: Clock },
  'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700',    icon: Clock },
  'completed':   { label: 'Completed',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  'closed':      { label: 'Closed',      color: 'bg-slate-100 text-slate-500',  icon: XCircle },
};
const severityMeta = {
  'critical': { color: 'bg-red-100 text-red-700',    dot: 'bg-red-500' },
  'high':     { color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  'medium':   { color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  'low':      { color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
};

const EMPTY_AUDIT = {
  name: '', type: 'internal', standard: 'ISO 27001:2022', customType: '',
  scope: '', auditor: '', startDate: '', endDate: '', status: 'planned', notes: '',
};
const EMPTY_FINDING = { title: '', description: '', severity: 'medium', status: 'open', recommendation: '', control: '', probability: 3, impact: 3 };

// ─── Finding Form ─────────────────────────────────────────────────────────────
const FindingForm = ({ initial, isRiskAssessment, onSave, onCancel }) => {
  const [f, setF] = useState({ ...EMPTY_FINDING, ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="space-y-4">
      <div>
        <label className="label">Finding Title *</label>
        <input className="input-field" value={f.title} onChange={e => set('title', e.target.value)} required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input-field resize-none" rows={3} value={f.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Severity</label>
          <select className="input-field" value={f.severity} onChange={e => set('severity', e.target.value)}>
            {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="label">Control Reference</label>
          <input className="input-field" value={f.control} onChange={e => set('control', e.target.value)} placeholder="e.g. A.5.1" />
        </div>
        {isRiskAssessment && (
          <>
            <div>
              <label className="label">Probability (1–5): <span className="text-blue-600 font-bold">{f.probability}</span></label>
              <input type="range" min={1} max={5} value={f.probability} onChange={e => set('probability', +e.target.value)} className="w-full accent-blue-600" />
            </div>
            <div className="col-span-2">
              <label className="label">Impact (1–5): <span className="text-blue-600 font-bold">{f.impact}</span></label>
              <input type="range" min={1} max={5} value={f.impact} onChange={e => set('impact', +e.target.value)} className="w-full accent-blue-600" />
            </div>
          </>
        )}
      </div>
      <div>
        <label className="label">Recommendation</label>
        <textarea className="input-field resize-none" rows={2} value={f.recommendation} onChange={e => set('recommendation', e.target.value)} />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Finding</button>
      </div>
    </form>
  );
};

// ─── Audit Form ───────────────────────────────────────────────────────────────
const AuditForm = ({ initial, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [f, setF] = useState({ ...EMPTY_AUDIT, auditor: currentUser?.name || '', ...initial });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const isCustomType = !AUDIT_TYPES.includes(f.type);
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Audit Name *</label>
          <input className="input-field" value={f.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. ISO 27001 Internal Audit Q2" />
        </div>
        <div>
          <label className="label">Audit Type</label>
          <select className="input-field" value={AUDIT_TYPES.includes(f.type) ? f.type : 'custom'} onChange={e => set('type', e.target.value)}>
            <option value="internal">Internal</option>
            <option value="external">External</option>
            <option value="risk-assessment">Risk Assessment</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        {(f.type === 'custom' || isCustomType) && (
          <div>
            <label className="label">Custom Type Name</label>
            <input className="input-field" value={f.customType || ''} onChange={e => set('customType', e.target.value)} placeholder="e.g. Supplier Audit" />
          </div>
        )}
        <div>
          <label className="label">Standard / Framework</label>
          <select className="input-field" value={STANDARDS.includes(f.standard) ? f.standard : 'Custom'} onChange={e => set('standard', e.target.value)}>
            {STANDARDS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={f.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{statusMeta[s]?.label || s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Auditor / Lead</label>
          <input className="input-field" value={f.auditor} onChange={e => set('auditor', e.target.value)} />
        </div>
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input-field" value={f.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" className="input-field" value={f.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Scope</label>
          <textarea className="input-field resize-none" rows={2} value={f.scope} onChange={e => set('scope', e.target.value)} placeholder="Describe the audit scope…" />
        </div>
        <div className="col-span-2">
          <label className="label">Notes</label>
          <textarea className="input-field resize-none" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Audit</button>
      </div>
    </form>
  );
};

// ─── Audit Detail Panel ───────────────────────────────────────────────────────
const AuditDetail = ({ audit, onClose, onEdit }) => {
  const { updateAudit, addRisk, settings } = useData();
  const navigate = useNavigate();
  const [findingModal, setFindingModal] = useState(false);
  const [editFinding, setEditFinding] = useState(null);
  const [appetiteModal, setAppetiteModal] = useState(false);
  const [appetite, setAppetite] = useState(settings?.riskAppetite || { low: 5, medium: 9, high: 14 });
  const { updateSettings } = useData();

  const isRA = audit.type === 'risk-assessment';

  const saveFinding = (f) => {
    const findings = audit.findings || [];
    let updated;
    if (editFinding?.id) {
      updated = findings.map(x => x.id === editFinding.id ? { ...x, ...f } : x);
    } else {
      updated = [...findings, { ...f, id: Date.now().toString() }];
    }
    updateAudit(audit.id, { findings: updated });
    setFindingModal(false);
    setEditFinding(null);
  };

  const deleteFinding = (fid) => {
    if (!window.confirm('Delete this finding?')) return;
    updateAudit(audit.id, { findings: (audit.findings || []).filter(f => f.id !== fid) });
  };

  const pushToRiskRegister = (finding) => {
    addRisk({
      title: finding.title,
      description: finding.description,
      category: 'Information Security',
      probability: finding.probability || 3,
      impact: finding.impact || 3,
      owner: audit.auditor,
      status: 'open',
      treatment: 'mitigate',
      treatmentPlan: finding.recommendation,
      framework: audit.standard,
      tags: ['audit', audit.type],
    });
    alert(`"${finding.title}" added to the Risk Register.`);
  };

  const openFindingAdd = () => { setEditFinding(null); setFindingModal(true); };
  const openFindingEdit = (f) => { setEditFinding(f); setFindingModal(true); };

  const sm = statusMeta[audit.status] || statusMeta['planned'];
  const tm = typeMeta[audit.type] || { label: audit.customType || audit.type, color: 'bg-gray-100 text-gray-600' };
  const openFindings = (audit.findings || []).filter(f => f.status === 'open').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tm.color}`}>{tm.label}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{audit.name}</h2>
          <p className="text-sm text-gray-500">{audit.standard} · {audit.auditor}</p>
        </div>
        <button onClick={() => onEdit(audit)} className="btn-secondary flex items-center gap-1"><Edit2 size={13} /> Edit</button>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4 text-sm">
        <div><p className="text-xs text-gray-500 mb-0.5">Start Date</p><p className="font-medium">{audit.startDate || '—'}</p></div>
        <div><p className="text-xs text-gray-500 mb-0.5">End Date</p><p className="font-medium">{audit.endDate || '—'}</p></div>
        <div><p className="text-xs text-gray-500 mb-0.5">Open Findings</p><p className={`font-bold ${openFindings > 0 ? 'text-red-600' : 'text-green-600'}`}>{openFindings}</p></div>
        {audit.scope && <div className="col-span-3"><p className="text-xs text-gray-500 mb-0.5">Scope</p><p className="text-gray-700">{audit.scope}</p></div>}
        {audit.notes && <div className="col-span-3"><p className="text-xs text-gray-500 mb-0.5">Notes</p><p className="text-gray-700">{audit.notes}</p></div>}
      </div>

      {/* Risk Assessment Actions */}
      {isRA && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2"><Target size={15} /> Risk Assessment Actions</p>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { navigate('/risk-management'); onClose(); }}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-orange-300 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <ShieldAlert size={14} /> View Heat Map <ArrowRight size={12} />
            </button>
            <button
              onClick={() => setAppetiteModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-orange-300 rounded-lg text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <Target size={14} /> Define Risk Appetite
            </button>
          </div>
          <p className="text-xs text-orange-600 mt-2">Use "Add to Risk Register" on individual findings below to push them into the Risk Register.</p>
        </div>
      )}

      {/* Findings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Findings ({(audit.findings || []).length})</h3>
          <button onClick={openFindingAdd} className="btn-primary flex items-center gap-1 text-sm py-1.5"><Plus size={13} /> Add Finding</button>
        </div>

        {(audit.findings || []).length === 0 ? (
          <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">No findings recorded yet</div>
        ) : (
          <div className="space-y-2">
            {(audit.findings || []).map(f => {
              const sv = severityMeta[f.severity] || severityMeta['low'];
              return (
                <div key={f.id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sv.color}`}>{f.severity.charAt(0).toUpperCase()+f.severity.slice(1)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${f.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{f.status}</span>
                        {f.control && <span className="text-xs text-gray-500 font-mono">{f.control}</span>}
                        {isRA && f.probability && <span className="text-xs text-gray-500">P{f.probability}×I{f.impact}={f.probability*f.impact}</span>}
                      </div>
                      <p className="font-medium text-gray-900 text-sm">{f.title}</p>
                      {f.description && <p className="text-xs text-gray-500 mt-0.5">{f.description}</p>}
                      {f.recommendation && <p className="text-xs text-blue-600 mt-1">→ {f.recommendation}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isRA && (
                        <button
                          onClick={() => pushToRiskRegister(f)}
                          title="Add to Risk Register"
                          className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-medium"
                        >
                          + Risk Register
                        </button>
                      )}
                      <button onClick={() => openFindingEdit(f)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                      <button onClick={() => deleteFinding(f.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Finding Modal */}
      <Modal isOpen={findingModal} onClose={() => setFindingModal(false)} title={editFinding ? 'Edit Finding' : 'Add Finding'} size="md">
        <FindingForm
          initial={editFinding || {}}
          isRiskAssessment={isRA}
          onSave={saveFinding}
          onCancel={() => setFindingModal(false)}
        />
      </Modal>

      {/* Risk Appetite Modal */}
      <Modal isOpen={appetiteModal} onClose={() => setAppetiteModal(false)} title="Define Risk Appetite" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Set the maximum score for each risk level. Scores are calculated as Probability × Impact (max 25).</p>
          {[
            { key: 'low',    label: 'Low / Acceptable',    color: 'text-green-600'  },
            { key: 'medium', label: 'Medium / Tolerable',  color: 'text-yellow-600' },
            { key: 'high',   label: 'High / Unacceptable', color: 'text-red-600'    },
          ].map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-3">
              <label className={`text-sm font-medium w-44 ${color}`}>{label}</label>
              <span className="text-xs text-gray-500">max score:</span>
              <input
                type="number" min={1} max={25}
                className="input-field w-20 py-1"
                value={appetite[key]}
                onChange={e => setAppetite(p => ({ ...p, [key]: +e.target.value }))}
              />
            </div>
          ))}
          <p className="text-xs text-gray-400">Critical / Intolerable = anything above High threshold.</p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setAppetiteModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={() => { updateSettings({ riskAppetite: appetite }); setAppetiteModal(false); }} className="btn-primary">Save Appetite</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const Audits = () => {
  const { audits, addAudit, updateAudit, deleteAudit } = useData();
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState(false);
  const [editAudit, setEditAudit] = useState(null);
  const [detailAudit, setDetailAudit] = useState(null);

  const tabs = [
    { key: 'all',            label: 'All' },
    { key: 'internal',       label: 'Internal' },
    { key: 'external',       label: 'External' },
    { key: 'risk-assessment',label: 'Risk Assessments' },
  ];

  const filtered = useMemo(() => audits.filter(a => {
    const matchTab = activeTab === 'all' || a.type === activeTab;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.standard || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  }), [audits, activeTab, search]);

  const handleSave = (data) => {
    if (editAudit) {
      updateAudit(editAudit.id, data);
      if (detailAudit?.id === editAudit.id) setDetailAudit(prev => ({ ...prev, ...data }));
    } else {
      addAudit(data);
    }
    setFormModal(false);
    setEditAudit(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this audit?')) return;
    deleteAudit(id);
    if (detailAudit?.id === id) setDetailAudit(null);
  };

  const openEdit = (a) => { setEditAudit(a); setFormModal(true); };
  const openDetail = (a) => setDetailAudit(a);

  // Sync detail view when audit is updated
  const handleDetailEdit = (a) => { setEditAudit(a); setFormModal(true); };

  // Stats
  const stats = [
    { label: 'Total Audits',   value: audits.length,                                             color: 'text-blue-600' },
    { label: 'In Progress',    value: audits.filter(a => a.status === 'in-progress').length,      color: 'text-orange-600' },
    { label: 'Completed',      value: audits.filter(a => a.status === 'completed').length,        color: 'text-green-600' },
    { label: 'Open Findings',  value: audits.flatMap(a => a.findings || []).filter(f => f.status === 'open').length, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Audits</h2>
          <p className="text-sm text-gray-500 mt-0.5">Internal, external, and risk assessments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(
              filtered.map(a => ({ Name: a.name, Type: a.type, Standard: a.standard, Auditor: a.auditor, Status: a.status, Start: a.startDate, End: a.endDate, Findings: (a.findings||[]).length, 'Open Findings': (a.findings||[]).filter(f=>f.status==='open').length })),
              'audits'
            )}
            className="btn-secondary flex items-center gap-2"><Download size={15} /> Export CSV
          </button>
          <button onClick={() => { setEditAudit(null); setFormModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Audit</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="card py-3 px-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {detailAudit ? (
        /* Detail View */
        <div className="card">
          <button onClick={() => setDetailAudit(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">← Back to list</button>
          <AuditDetail
            audit={audits.find(a => a.id === detailAudit.id) || detailAudit}
            onClose={() => setDetailAudit(null)}
            onEdit={handleDetailEdit}
          />
        </div>
      ) : (
        /* List View */
        <>
          {/* Tabs + Search */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 pt-3 flex-wrap gap-2">
              <div className="flex gap-1">
                {tabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      activeTab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input-field pl-8 py-1.5 w-56 text-sm" placeholder="Search audits…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-header">Audit Name</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Standard</th>
                  <th className="table-header">Auditor</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-center">Findings</th>
                  <th className="table-header w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-12">No audits found</td></tr>
                )}
                {filtered.map(a => {
                  const tm = typeMeta[a.type] || { label: a.customType || a.type, color: 'bg-gray-100 text-gray-600' };
                  const sm = statusMeta[a.status] || statusMeta['planned'];
                  const openCount = (a.findings || []).filter(f => f.status === 'open').length;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => openDetail(a)}>
                      <td className="table-cell font-medium text-gray-900">{a.name}</td>
                      <td className="table-cell"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tm.color}`}>{tm.label}</span></td>
                      <td className="table-cell text-gray-600 text-xs">{a.standard || '—'}</td>
                      <td className="table-cell text-gray-600 text-xs">{a.auditor || '—'}</td>
                      <td className="table-cell text-gray-600 text-xs">{a.startDate ? `${a.startDate}${a.endDate ? ' → ' + a.endDate : ''}` : '—'}</td>
                      <td className="table-cell"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span></td>
                      <td className="table-cell text-center">
                        {(a.findings || []).length > 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${openCount > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {openCount} open / {(a.findings||[]).length} total
                          </span>
                        )}
                      </td>
                      <td className="table-cell" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                          <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
              Showing {filtered.length} of {audits.length} audits
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={formModal} onClose={() => setFormModal(false)} title={editAudit ? 'Edit Audit' : 'New Audit'} size="lg">
        <AuditForm initial={editAudit || {}} onSave={handleSave} onCancel={() => setFormModal(false)} />
      </Modal>
    </div>
  );
};

export default Audits;
