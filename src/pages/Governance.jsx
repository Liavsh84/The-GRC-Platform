import { useState, useMemo } from 'react';
import { Plus, Search, List, GitBranch, Download, Edit2, Trash2, FileText, X, ChevronDown } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV, exportGovernancePDF } from '../utils/exportUtils';

const TYPE_COLORS = {
  policy: 'bg-blue-100 text-blue-700 border-blue-200',
  procedure: 'bg-purple-100 text-purple-700 border-purple-200',
  standard: 'bg-green-100 text-green-700 border-green-200',
  guideline: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const STATUS_COLORS = {
  approved: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-600',
  'under review': 'bg-yellow-100 text-yellow-700',
  deprecated: 'bg-red-100 text-red-600',
};

const DEPT_OPTIONS = ['IT', 'HR', 'Finance', 'Operations', 'Legal', 'Compliance', 'Procurement', 'Risk Management'];
const TYPE_OPTIONS = ['policy', 'procedure', 'standard', 'guideline'];
const STATUS_OPTIONS = ['approved', 'draft', 'under review', 'deprecated'];

const EMPTY_DOC = { title: '', type: 'policy', department: 'IT', status: 'draft', version: '1.0', content: '', createdBy: '', tags: '' };

// ─── Graph View (SVG Hierarchy) ───────────────────────────────────────────────
const GraphView = ({ documents }) => {
  const [tooltip, setTooltip] = useState(null);

  const byType = TYPE_OPTIONS.reduce((acc, t) => {
    acc[t] = documents.filter(d => d.type === t);
    return acc;
  }, {});

  const rootX = 500, rootY = 50;
  const typePositions = [
    { x: 120, y: 160 },
    { x: 350, y: 160 },
    { x: 620, y: 160 },
    { x: 880, y: 160 },
  ];

  const typeColors = { policy: '#3b82f6', procedure: '#8b5cf6', standard: '#16a34a', guideline: '#ca8a04' };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Document Hierarchy</h3>
        <p className="text-xs text-gray-500">Hover nodes for details</p>
      </div>
      <div className="overflow-x-auto">
        <svg width="1000" height="500" style={{ minWidth: 800 }}>
          {/* Root node */}
          <rect x={rootX - 80} y={rootY} width={160} height={40} rx={8} fill="#1e40af" />
          <text x={rootX} y={rootY + 25} textAnchor="middle" fill="white" fontSize={12} fontWeight="bold">Governance Framework</text>

          {/* Type nodes & lines */}
          {TYPE_OPTIONS.map((type, ti) => {
            const tp = typePositions[ti];
            const docs = byType[type];
            const color = typeColors[type];
            return (
              <g key={type}>
                {/* Line root → type */}
                <line x1={rootX} y1={rootY + 40} x2={tp.x} y2={tp.y} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4,3" />

                {/* Type node */}
                <rect x={tp.x - 60} y={tp.y} width={120} height={36} rx={8} fill={color} opacity={0.9} className="cursor-pointer" />
                <text x={tp.x} y={tp.y + 23} textAnchor="middle" fill="white" fontSize={11} fontWeight="bold" className="capitalize">{type}s</text>
                <text x={tp.x} y={tp.y + 34} textAnchor="middle" fill="white" fontSize={9} opacity={0.8}>({docs.length})</text>

                {/* Document nodes */}
                {docs.slice(0, 5).map((doc, di) => {
                  const maxPerRow = 2;
                  const col = di % maxPerRow;
                  const row = Math.floor(di / maxPerRow);
                  const docX = tp.x - 70 + col * 150;
                  const docY = tp.y + 80 + row * 65;

                  return (
                    <g key={doc.id} className="graph-node cursor-pointer"
                      onMouseEnter={(e) => setTooltip({ doc, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTooltip(null)}>
                      <line x1={tp.x} y1={tp.y + 36} x2={docX + 65} y2={docY} stroke="#cbd5e1" strokeWidth={1} />
                      <rect x={docX} y={docY} width={130} height={48} rx={6} fill="white" stroke={color} strokeWidth={1.5} />
                      <text x={docX + 65} y={docY + 15} textAnchor="middle" fill="#1e293b" fontSize={9} fontWeight="600">
                        {doc.title.length > 18 ? doc.title.slice(0, 18) + '…' : doc.title}
                      </text>
                      <text x={docX + 65} y={docY + 27} textAnchor="middle" fill="#64748b" fontSize={8}>{doc.department}</text>
                      <rect x={docX + 35} y={docY + 32} width={60} height={11} rx={4}
                        fill={doc.status === 'approved' ? '#dcfce7' : doc.status === 'draft' ? '#f1f5f9' : '#fef3c7'} />
                      <text x={docX + 65} y={docY + 41} textAnchor="middle" fill={doc.status === 'approved' ? '#166534' : doc.status === 'draft' ? '#475569' : '#92400e'} fontSize={7} className="capitalize">
                        {doc.status}
                      </text>
                    </g>
                  );
                })}
                {docs.length > 5 && (
                  <text x={tp.x} y={tp.y + 220} textAnchor="middle" fill="#94a3b8" fontSize={9}>+{docs.length - 5} more</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="fixed z-50 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl pointer-events-none max-w-xs"
          style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}>
          <p className="font-semibold">{tooltip.doc.title}</p>
          <p className="text-slate-400 mt-1">v{tooltip.doc.version} · {tooltip.doc.department}</p>
          <p className="text-slate-400">By: {tooltip.doc.createdBy}</p>
          <p className="text-slate-400">Updated: {tooltip.doc.updatedAt}</p>
        </div>
      )}
    </div>
  );
};

// ─── Document Form ────────────────────────────────────────────────────────────
const DocForm = ({ initial, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_DOC, createdBy: currentUser?.name || '', ...initial });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const doc = { ...form, tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags };
    onSave(doc);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Document Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Information Security Policy" />
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Department *</label>
          <select className="input-field" value={form.department} onChange={e => set('department', e.target.value)}>
            {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Version</label>
          <input className="input-field" value={form.version} onChange={e => set('version', e.target.value)} placeholder="e.g. 1.0" />
        </div>
        <div className="col-span-2">
          <label className="label">Author / Owner</label>
          <input className="input-field" value={form.createdBy} onChange={e => set('createdBy', e.target.value)} placeholder="Document owner name" />
        </div>
        <div className="col-span-2">
          <label className="label">Tags (comma-separated)</label>
          <input className="input-field" value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. security, IT, policy" />
        </div>
        <div className="col-span-2">
          <label className="label">Document Content</label>
          <textarea className="input-field resize-none" rows={8} value={form.content} onChange={e => set('content', e.target.value)}
            placeholder="Enter the full document text here…" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Document</button>
      </div>
    </form>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Governance = () => {
  const { documents, addDocument, updateDocument, deleteDocument } = useData();
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const [showExport, setShowExport] = useState(false);

  const departments = useMemo(() => [...new Set(documents.map(d => d.department))].sort(), [documents]);

  const filtered = useMemo(() => documents.filter(d => {
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase()) || d.department.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.type === filterType;
    const matchDept = filterDept === 'all' || d.department === filterDept;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchType && matchDept && matchStatus;
  }), [documents, search, filterType, filterDept, filterStatus]);

  const openAdd = () => { setEditDoc(null); setModalOpen(true); };
  const openEdit = (doc) => { setEditDoc(doc); setModalOpen(true); };

  const handleSave = (data) => {
    if (editDoc) updateDocument(editDoc.id, data);
    else addDocument(data);
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this document? This action cannot be undone.')) deleteDocument(id);
  };

  const counts = TYPE_OPTIONS.reduce((acc, t) => { acc[t] = documents.filter(d => d.type === t).length; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Governance</h2>
          <p className="text-sm text-gray-500 mt-0.5">{documents.length} total documents across {departments.length} departments</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button onClick={() => { exportToCSV(filtered.map(d => ({ Title: d.title, Type: d.type, Department: d.department, Status: d.status, Version: d.version, Updated: d.updatedAt, Owner: d.createdBy })), 'governance'); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                <button onClick={() => { exportGovernancePDF(filtered); setShowExport(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF</button>
              </div>
            )}
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Document
          </button>
        </div>
      </div>

      {/* Type Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        {TYPE_OPTIONS.map(t => (
          <div key={t} className={`rounded-xl border p-3 cursor-pointer transition-all ${filterType === t ? 'ring-2 ring-blue-500 shadow-sm' : 'bg-white hover:shadow-sm'} ${TYPE_COLORS[t]}`}
            onClick={() => setFilterType(filterType === t ? 'all' : t)}>
            <p className="text-2xl font-bold">{counts[t]}</p>
            <p className="text-xs font-semibold capitalize mt-0.5">{t}s</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9 py-2" placeholder="Search documents…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto py-2" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}s</option>)}
        </select>
        <select className="input-field w-auto py-2" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="input-field w-auto py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} /></button>
          <button onClick={() => setView('graph')} className={`p-1.5 rounded-md transition-colors ${view === 'graph' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}><GitBranch size={16} /></button>
        </div>
      </div>

      {/* Content */}
      {view === 'graph' ? (
        <GraphView documents={documents} />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Title</th>
                <th className="table-header">Type</th>
                <th className="table-header">Department</th>
                <th className="table-header">Status</th>
                <th className="table-header">Version</th>
                <th className="table-header">Owner</th>
                <th className="table-header">Updated</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-12">No documents found</td></tr>
              )}
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-cell">
                    <button onClick={() => setViewDoc(d)} className="font-medium text-blue-600 hover:underline text-left">{d.title}</button>
                    {Array.isArray(d.tags) && d.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {d.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>)}
                      </div>
                    )}
                  </td>
                  <td className="table-cell"><span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${TYPE_COLORS[d.type]}`}>{d.type}</span></td>
                  <td className="table-cell text-gray-600">{d.department}</td>
                  <td className="table-cell"><span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[d.status]}`}>{d.status}</span></td>
                  <td className="table-cell text-gray-500">v{d.version}</td>
                  <td className="table-cell text-gray-600">{d.createdBy || '—'}</td>
                  <td className="table-cell text-gray-500 text-xs">{d.updatedAt}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            Showing {filtered.length} of {documents.length} documents
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editDoc ? 'Edit Document' : 'New Document'} size="lg">
        <DocForm initial={editDoc || {}} onSave={handleSave} onCancel={() => setModalOpen(false)} />
      </Modal>

      {/* View Document Modal */}
      <Modal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.title || ''} size="md">
        {viewDoc && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Type', viewDoc.type], ['Department', viewDoc.department], ['Status', viewDoc.status], ['Version', `v${viewDoc.version}`], ['Owner', viewDoc.createdBy || '—'], ['Created', viewDoc.createdAt], ['Last Updated', viewDoc.updatedAt]].map(([k, v]) => (
                <div key={k}><span className="font-medium text-gray-500">{k}:</span> <span className="text-gray-900 capitalize">{v}</span></div>
              ))}
            </div>
            {Array.isArray(viewDoc.tags) && viewDoc.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {viewDoc.tags.map(t => <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>)}
              </div>
            )}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Content</p>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">{viewDoc.content || 'No content provided.'}</div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setViewDoc(null); openEdit(viewDoc); }} className="btn-secondary">Edit</button>
              <button onClick={() => setViewDoc(null)} className="btn-primary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Governance;
