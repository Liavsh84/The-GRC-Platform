import { useState, useMemo } from 'react';
import {
  Plus, Search, List, GitBranch, Download, Edit2, Trash2, FileText, X,
  ChevronDown, Upload, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV, exportGovernancePDF } from '../utils/exportUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  policy:    'bg-blue-100 text-blue-700 border-blue-200',
  procedure: 'bg-purple-100 text-purple-700 border-purple-200',
  standard:  'bg-green-100 text-green-700 border-green-200',
  guideline: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};
const TYPE_BADGE = {
  policy:    'bg-blue-100 text-blue-700',
  procedure: 'bg-purple-100 text-purple-700',
  standard:  'bg-green-100 text-green-700',
  guideline: 'bg-yellow-100 text-yellow-700',
};
const STATUS_COLORS = {
  approved:      'bg-green-100 text-green-700',
  draft:         'bg-gray-100 text-gray-600',
  'under review':'bg-yellow-100 text-yellow-700',
  deprecated:    'bg-red-100 text-red-600',
};
const NODE_BG = {
  policy:    'bg-blue-50 border-blue-300',
  procedure: 'bg-purple-50 border-purple-300',
  standard:  'bg-green-50 border-green-300',
  guideline: 'bg-yellow-50 border-yellow-300',
};

const DEPT_OPTIONS   = ['IT', 'HR', 'Finance', 'Operations', 'Legal', 'Compliance', 'Procurement', 'Risk Management'];
const TYPE_OPTIONS   = ['policy', 'procedure', 'standard', 'guideline'];
const STATUS_OPTIONS = ['approved', 'draft', 'under review', 'deprecated'];
const EMPTY_DOC      = { title: '', type: 'policy', department: 'IT', status: 'draft', version: '1.0', content: '', createdBy: '', tags: '', parentId: null };

// ─── Hierarchy Layout Helpers (module-level) ──────────────────────────────────
const NW = 150; // node width
const NH = 60;  // node height
const RW = 200; // root width
const RH = 46;  // root height
const HG = 20;  // horizontal gap between subtrees
const VG = 78;  // vertical gap between rows

function subtreeW(node) {
  const own = (node.isRoot ? RW : NW) + HG;
  if (!node.children?.length) return own;
  return Math.max(own, node.children.reduce((s, c) => s + subtreeW(c), 0));
}

function layoutTree(node, depth, startX) {
  const sw = subtreeW(node);
  const nw = node.isRoot ? RW : NW;
  const nh = node.isRoot ? RH : NH;
  const cx = startX + sw / 2;
  const x  = cx - nw / 2;
  const y  = depth === 0 ? 14 : 14 + RH + VG + (depth - 1) * (NH + VG);
  const out = [{ ...node, x, y, cx, nw, nh }];
  let childX = startX;
  (node.children || []).forEach(c => {
    out.push(...layoutTree(c, depth + 1, childX));
    childX += subtreeW(c);
  });
  return out;
}

function buildTree(docs, parentId = null) {
  return docs
    .filter(d => (d.parentId ?? null) === parentId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(d => ({ ...d, children: buildTree(docs, d.id) }));
}

// ─── Hierarchy Editor ──────────────────────────────────────────────────────────
const HierarchyEditor = ({ documents, onUpdate, onEdit, onAdd, onDelete }) => {
  const [selId,      setSelId]      = useState(null);
  const [dragId,     setDragId]     = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Virtual root + tree
  const treeRoot = useMemo(() => ({
    id: '__root__', title: 'Governance Framework', isRoot: true,
    children: buildTree(documents),
  }), [documents]);

  // Positioned flat list
  const flatNodes = useMemo(() => layoutTree(treeRoot, 0, 0), [treeRoot]);
  const posMap    = useMemo(() => Object.fromEntries(flatNodes.map(n => [n.id, n])), [flatNodes]);

  // SVG connection lines
  const lines = useMemo(() => {
    const acc = [];
    const walk = (node) => {
      const p = posMap[node.id];
      (node.children || []).forEach(c => {
        const ch = posMap[c.id];
        if (p && ch) acc.push({ id: `${node.id}-${c.id}`, x1: p.cx, y1: p.y + p.nh, x2: ch.cx, y2: ch.y });
        walk(c);
      });
    };
    walk(treeRoot);
    return acc;
  }, [treeRoot, posMap]);

  const canvasW = Math.max(640, subtreeW(treeRoot));
  const canvasH = flatNodes.length
    ? Math.max(...flatNodes.map(n => n.y + n.nh)) + 30
    : 200;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isDesc = (targetId, srcId) => {
    if (!targetId || targetId === '__root__') return false;
    const t = documents.find(d => d.id === targetId);
    if (!t?.parentId) return false;
    if (t.parentId === srcId) return true;
    return isDesc(t.parentId, srcId);
  };

  const getSibs = (parentId) =>
    documents
      .filter(d => (d.parentId ?? null) === (parentId ?? null))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleDrop = (e, targetId) => {
    e.preventDefault(); e.stopPropagation();
    const id = dragId; setDragId(null); setDragOverId(null);
    if (!id || id === targetId) return;
    const newParent = targetId === '__root__' ? null : targetId;
    if (newParent && isDesc(newParent, id)) return; // prevent cycle
    onUpdate(id, { parentId: newParent });
  };

  // Move among siblings (dir: -1 = left, +1 = right in the diagram)
  const handleShift = (doc, dir) => {
    const sibs = getSibs(doc.parentId);
    const idx  = sibs.findIndex(d => d.id === doc.id);
    const si   = idx + dir;
    if (si < 0 || si >= sibs.length) return;
    const swap = sibs[si];
    sibs.forEach((s, i) => {
      if (s.id === doc.id)   onUpdate(s.id, { sortOrder: si * 10 });
      else if (s.id === swap.id) onUpdate(s.id, { sortOrder: idx * 10 });
      else onUpdate(s.id, { sortOrder: i * 10 });
    });
  };

  // Promote: move up one hierarchy level
  const handlePromote = (doc) => {
    if (!doc.parentId) return;
    const parent = documents.find(d => d.id === doc.parentId);
    onUpdate(doc.id, { parentId: parent?.parentId ?? null });
  };

  // Demote: become child of the previous sibling
  const handleDemote = (doc) => {
    const sibs = getSibs(doc.parentId);
    const idx  = sibs.findIndex(d => d.id === doc.id);
    if (idx <= 0) return;
    onUpdate(doc.id, { parentId: sibs[idx - 1].id });
  };

  const selDoc = selId ? documents.find(d => d.id === selId) ?? null : null;

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Document Hierarchy</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Click a node to select it · Drag a node onto another to reparent
          </p>
        </div>
        <button onClick={() => onAdd(null)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
          <Plus size={14} /> Add Document
        </button>
      </div>

      {/* ── SmartArt-style action toolbar ── */}
      <div className={`mb-4 px-4 py-2.5 rounded-xl border transition-all
        ${selDoc ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
        {selDoc ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-blue-800 mr-1 truncate max-w-xs" title={selDoc.title}>
              {selDoc.title}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Reorder in siblings */}
              <button onClick={() => handleShift(selDoc, -1)} title="Move left among siblings"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-600 hover:bg-blue-100 transition-colors">
                <ArrowLeft size={12} /> Move Left
              </button>
              <button onClick={() => handleShift(selDoc, 1)} title="Move right among siblings"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-600 hover:bg-blue-100 transition-colors">
                Move Right <ArrowRight size={12} />
              </button>
              <div className="w-px h-4 bg-blue-200" />
              {/* Promote / Demote */}
              <button onClick={() => handlePromote(selDoc)} disabled={!selDoc.parentId}
                title="Promote — move up one level"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ArrowUp size={12} /> Promote
              </button>
              <button onClick={() => handleDemote(selDoc)} title="Demote — make child of previous sibling"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-blue-600 hover:bg-blue-100 transition-colors">
                Demote <ArrowDown size={12} />
              </button>
              <div className="w-px h-4 bg-blue-200" />
              {/* CRUD */}
              <button onClick={() => onAdd(selDoc.id)} title="Add child document"
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-green-600 hover:bg-green-100 transition-colors">
                <Plus size={12} /> Add Child
              </button>
              <button onClick={() => onEdit(selDoc)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 hover:bg-gray-200 transition-colors">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => { onDelete(selDoc.id); setSelId(null); }}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 size={12} /> Delete
              </button>
              <button onClick={() => setSelId(null)}
                className="ml-1 p-1 rounded-lg hover:bg-blue-100 text-blue-400">
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 text-center py-0.5">
            Click any node in the diagram to select it and access move / edit / delete actions
          </p>
        )}
      </div>

      {/* ── Diagram canvas ── */}
      <div className="overflow-auto rounded-xl border border-gray-200 bg-gray-50" style={{ maxHeight: 540 }}>
        <div style={{ position: 'relative', width: canvasW, height: canvasH, minWidth: canvasW }}>

          {/* SVG lines layer */}
          <svg style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}>
            {lines.map(l => (
              <g key={l.id}>
                {/* Curved connector */}
                <path
                  d={`M ${l.x1} ${l.y1} C ${l.x1} ${(l.y1 + l.y2) / 2}, ${l.x2} ${(l.y1 + l.y2) / 2}, ${l.x2} ${l.y2}`}
                  stroke="#94a3b8" strokeWidth={1.5} fill="none" strokeDasharray="5,3"
                />
              </g>
            ))}
          </svg>

          {/* Nodes */}
          {flatNodes.map(node => {
            const isRoot    = node.isRoot;
            const isSel     = selId === node.id;
            const isOver    = dragOverId === node.id;
            const isDragging = dragId === node.id;

            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute', left: node.x, top: node.y,
                  width: node.nw, height: node.nh, userSelect: 'none',
                }}
                className={`
                  rounded-xl border-2 flex flex-col items-center justify-center px-2 shadow-sm
                  transition-all duration-150
                  ${isRoot
                    ? 'bg-blue-800 border-blue-600 cursor-default'
                    : `${NODE_BG[node.type] || 'bg-gray-50 border-gray-300'} cursor-pointer hover:shadow-md`}
                  ${isSel     ? 'ring-[3px] ring-offset-1 ring-blue-500 shadow-md' : ''}
                  ${isOver    ? 'ring-[3px] ring-offset-1 ring-green-400 scale-105' : ''}
                  ${isDragging ? 'opacity-40 scale-95' : ''}
                `}
                onClick={() => !isRoot && setSelId(selId === node.id ? null : node.id)}
                draggable={!isRoot}
                onDragStart={(e) => { e.stopPropagation(); setDragId(node.id); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={()    => { setDragId(null); setDragOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverId(node.id); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null); }}
                onDrop={(e)     => handleDrop(e, node.id)}
              >
                {isRoot ? (
                  <>
                    <span className="text-white font-bold text-sm leading-tight text-center">Governance Framework</span>
                    <span className="text-blue-300 text-xs mt-0.5">{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize self-start mb-0.5
                      ${TYPE_BADGE[node.type] || 'bg-gray-100 text-gray-600'}`}>
                      {node.type}
                    </span>
                    <span className="text-xs font-semibold text-gray-900 text-center w-full truncate leading-snug"
                      title={node.title}>
                      {node.title}
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5">{node.department}</span>
                  </>
                )}
              </div>
            );
          })}

          {/* Empty state overlay */}
          {documents.length === 0 && (
            <div className="absolute inset-0 flex items-end justify-center" style={{ paddingBottom: 24 }}>
              <p className="text-sm text-gray-400">Add documents to build your hierarchy</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 px-1 flex-wrap">
        {TYPE_OPTIONS.map(t => (
          <div key={t} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded border ${NODE_BG[t]}`} />
            <span className="text-xs text-gray-500 capitalize">{t}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-gray-400">
          Drag nodes to reparent · Click to select
        </div>
      </div>
    </div>
  );
};

// ─── Document Form ─────────────────────────────────────────────────────────────
const DocForm = ({ initial, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ ...EMPTY_DOC, createdBy: currentUser?.name || '', ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      tags: typeof form.tags === 'string'
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
        : form.tags,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Document Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)}
            required placeholder="e.g. Information Security Policy" />
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
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
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Version</label>
          <input className="input-field" value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
        </div>
        <div className="col-span-2">
          <label className="label">Author / Owner</label>
          <input className="input-field" value={form.createdBy} onChange={e => set('createdBy', e.target.value)} placeholder="Document owner name" />
        </div>
        <div className="col-span-2">
          <label className="label">Tags (comma-separated)</label>
          <input className="input-field"
            value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
            onChange={e => set('tags', e.target.value)} placeholder="e.g. security, IT, policy" />
        </div>
        <div className="col-span-2">
          <label className="label">Document Content</label>
          <textarea className="input-field resize-none" rows={6} value={form.content}
            onChange={e => set('content', e.target.value)} placeholder="Enter the full document text here…" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Document</button>
      </div>
    </form>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Governance = () => {
  const { documents, addDocument, updateDocument, deleteDocument } = useData();
  const [view,         setView]         = useState('list');
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('all');
  const [filterDept,   setFilterDept]   = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editDoc,      setEditDoc]      = useState(null);
  const [newDocParent, setNewDocParent] = useState(null);
  const [viewDoc,      setViewDoc]      = useState(null);
  const [showExport,   setShowExport]   = useState(false);

  const departments = useMemo(() => [...new Set(documents.map(d => d.department))].sort(), [documents]);

  const filtered = useMemo(() => documents.filter(d => {
    const q = search.toLowerCase();
    if (search && !d.title.toLowerCase().includes(q) && !d.department.toLowerCase().includes(q)) return false;
    if (filterType   !== 'all' && d.type       !== filterType)   return false;
    if (filterDept   !== 'all' && d.department !== filterDept)   return false;
    if (filterStatus !== 'all' && d.status     !== filterStatus) return false;
    return true;
  }), [documents, search, filterType, filterDept, filterStatus]);

  const openAdd = (parentId = null) => { setEditDoc(null); setNewDocParent(parentId); setModalOpen(true); };
  const openEdit = (doc) => { setEditDoc(doc); setNewDocParent(null); setModalOpen(true); };

  const handleSave = (data) => {
    const now = new Date().toISOString().split('T')[0];
    if (editDoc) updateDocument(editDoc.id, { ...data, updatedAt: now });
    else addDocument({ ...data, parentId: newDocParent ?? null });
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    const doc = documents.find(d => d.id === id);
    const children = documents.filter(d => d.parentId === id);
    let msg = `Delete "${doc?.title}"?`;
    if (children.length > 0)
      msg += `\n\n${children.length} child document${children.length > 1 ? 's' : ''} will be moved up to the parent level.`;
    if (!window.confirm(msg)) return;
    children.forEach(c => updateDocument(c.id, { parentId: doc?.parentId ?? null }));
    deleteDocument(id);
  };

  // File upload handlers (used in view modal)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File is too large. Maximum allowed size is 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => {
      const updates = { fileData: evt.target.result, fileName: file.name, fileType: file.type };
      updateDocument(viewDoc.id, updates);
      setViewDoc(prev => ({ ...prev, ...updates }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileRemove = () => {
    if (!window.confirm('Remove the attached file from this document?')) return;
    const updates = { fileData: null, fileName: null, fileType: null };
    updateDocument(viewDoc.id, updates);
    setViewDoc(prev => ({ ...prev, ...updates }));
  };

  const fileInput = {
    type: 'file', className: 'hidden',
    accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    onChange: handleFileUpload,
  };

  const counts = TYPE_OPTIONS.reduce((acc, t) => { acc[t] = documents.filter(d => d.type === t).length; return acc; }, {});

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Governance</h2>
          <p className="text-sm text-gray-500 mt-0.5">{documents.length} total documents across {departments.length} departments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button onClick={() => { exportToCSV(filtered.map(d => ({ Title: d.title, Type: d.type, Department: d.department, Status: d.status, Version: d.version, Updated: d.updatedAt, Owner: d.createdBy })), 'governance'); setShowExport(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                <button onClick={() => { exportGovernancePDF(filtered); setShowExport(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF</button>
              </div>
            )}
          </div>
          <button onClick={() => openAdd(null)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Document
          </button>
        </div>
      </div>

      {/* ── Type cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {TYPE_OPTIONS.map(t => (
          <div key={t}
            className={`rounded-xl border p-3 cursor-pointer transition-all
              ${filterType === t ? 'ring-2 ring-blue-500 shadow-sm' : 'bg-white hover:shadow-sm'} ${TYPE_COLORS[t]}`}
            onClick={() => setFilterType(filterType === t ? 'all' : t)}>
            <p className="text-2xl font-bold">{counts[t]}</p>
            <p className="text-xs font-semibold capitalize mt-0.5">{t}s</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9 py-2" placeholder="Search documents…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto py-2" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>)}
        </select>
        <select className="input-field w-auto py-2" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="input-field w-auto py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <List size={16} />
          </button>
          <button onClick={() => setView('graph')}
            className={`p-1.5 rounded-md transition-colors ${view === 'graph' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
            <GitBranch size={16} />
          </button>
        </div>
      </div>

      {/* ── Content: Hierarchy or List ── */}
      {view === 'graph' ? (
        <HierarchyEditor
          documents={documents}
          onUpdate={(id, updates) => updateDocument(id, updates)}
          onEdit={openEdit}
          onAdd={openAdd}
          onDelete={handleDelete}
        />
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
                    <button onClick={() => setViewDoc(d)}
                      className="font-medium text-blue-600 hover:underline text-left flex items-center gap-1.5">
                      {d.title}
                      {d.fileData && <FileText size={12} className="text-gray-400 flex-shrink-0" title="Has attached file" />}
                    </button>
                    {Array.isArray(d.tags) && d.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {d.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${TYPE_COLORS[d.type]}`}>{d.type}</span>
                  </td>
                  <td className="table-cell text-gray-600">{d.department}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                  </td>
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

      {/* ── Add / Edit Modal ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editDoc ? 'Edit Document' : 'New Document'} size="lg">
        <DocForm
          initial={editDoc ?? { parentId: newDocParent }}
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      {/* ── View Document Modal (with file upload) ── */}
      <Modal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.title || ''} size="lg">
        {viewDoc && (
          <div className="space-y-5">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Type', viewDoc.type], ['Department', viewDoc.department], ['Status', viewDoc.status],
                ['Version', `v${viewDoc.version}`], ['Owner', viewDoc.createdBy || '—'],
                ['Created', viewDoc.createdAt], ['Last Updated', viewDoc.updatedAt]].map(([k, v]) => (
                <div key={k}>
                  <span className="font-medium text-gray-500">{k}: </span>
                  <span className="text-gray-900 capitalize">{v}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {Array.isArray(viewDoc.tags) && viewDoc.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {viewDoc.tags.map(t => <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>)}
              </div>
            )}

            {/* Text content */}
            {viewDoc.content && (
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Content</p>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {viewDoc.content}
                </div>
              </div>
            )}

            {/* File section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Attached Document</p>
                {!viewDoc.fileData && (
                  <label className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3">
                    <Upload size={13} /> Upload PDF / Word
                    <input {...fileInput} />
                  </label>
                )}
              </div>
              {viewDoc.fileData ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <FileText size={18} className="text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{viewDoc.fileName}</p>
                      <p className="text-xs text-gray-500">{viewDoc.fileType?.includes('pdf') ? 'PDF Document' : 'Word Document'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={viewDoc.fileData} download={viewDoc.fileName}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Download">
                        <Download size={14} />
                      </a>
                      <label className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 cursor-pointer" title="Replace file">
                        <Upload size={14} /><input {...fileInput} />
                      </label>
                      <button onClick={handleFileRemove}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Remove file">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  {viewDoc.fileType?.includes('pdf') && (
                    <iframe src={viewDoc.fileData} className="w-full rounded-xl border border-gray-200"
                      style={{ height: 500 }} title={viewDoc.fileName} />
                  )}
                  {!viewDoc.fileType?.includes('pdf') && (
                    <div className="flex items-center justify-center p-8 bg-blue-50 rounded-xl border border-blue-200 text-center">
                      <div>
                        <FileText size={32} className="text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-blue-700 font-medium">Word Document</p>
                        <p className="text-xs text-blue-500 mt-1">Download to open in Microsoft Word</p>
                        <a href={viewDoc.fileData} download={viewDoc.fileName}
                          className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                          <Download size={14} /> Download {viewDoc.fileName}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                  <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">No file attached</p>
                  <p className="text-xs text-gray-400 mt-1">Upload a PDF or Word document (max 5 MB)</p>
                  <label className="mt-4 inline-flex items-center gap-2 btn-secondary text-sm cursor-pointer">
                    <Upload size={14} /> Choose File<input {...fileInput} />
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setViewDoc(null); openEdit(viewDoc); }} className="btn-secondary">Edit Metadata</button>
              <button onClick={() => setViewDoc(null)} className="btn-primary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Governance;
