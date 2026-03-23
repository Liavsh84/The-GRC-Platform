import { useState, useMemo } from 'react';
import {
  Plus, Search, List, GitBranch, Download, Edit2, Trash2, FileText, X,
  ChevronDown, ChevronRight, GripVertical, FolderPlus, Upload, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV, exportGovernancePDF } from '../utils/exportUtils';

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

const DEPT_OPTIONS   = ['IT', 'HR', 'Finance', 'Operations', 'Legal', 'Compliance', 'Procurement', 'Risk Management'];
const TYPE_OPTIONS   = ['policy', 'procedure', 'standard', 'guideline'];
const STATUS_OPTIONS = ['approved', 'draft', 'under review', 'deprecated'];
const EMPTY_DOC      = { title: '', type: 'policy', department: 'IT', status: 'draft', version: '1.0', content: '', createdBy: '', tags: '', parentId: null };

// Build tree from flat list
function buildTree(docs, parentId = null) {
  return docs
    .filter(d => (d.parentId ?? null) === parentId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map(d => ({ ...d, children: buildTree(docs, d.id) }));
}

// ─── Hierarchy Editor ──────────────────────────────────────────────────────────
const HierarchyEditor = ({ documents, onUpdate, onEdit, onAdd, onDelete }) => {
  const [dragId,     setDragId]     = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [collapsed,  setCollapsed]  = useState(new Set());

  const tree = useMemo(() => buildTree(documents), [documents]);

  // Returns true if targetId is inside sourceId's subtree
  const isDescendant = (targetId, sourceId) => {
    if (!targetId) return false;
    const t = documents.find(d => d.id === targetId);
    if (!t?.parentId) return false;
    if (t.parentId === sourceId) return true;
    return isDescendant(t.parentId, sourceId);
  };

  const getSiblings = (parentId) =>
    documents
      .filter(d => (d.parentId ?? null) === (parentId ?? null))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    const id = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!id || id === targetId) return;
    if (targetId && isDescendant(targetId, id)) return; // prevent cycle
    onUpdate(id, { parentId: targetId ?? null });
  };

  // dir: -1 = up, +1 = down
  const handleMove = (doc, dir) => {
    const siblings = getSiblings(doc.parentId);
    const idx      = siblings.findIndex(d => d.id === doc.id);
    const swapIdx  = idx + dir;
    if (swapIdx < 0 || swapIdx >= siblings.length) return;
    const swap = siblings[swapIdx];
    siblings.forEach((s, i) => {
      if (s.id === doc.id)  onUpdate(s.id, { sortOrder: swapIdx * 10 });
      else if (s.id === swap.id) onUpdate(s.id, { sortOrder: idx * 10 });
      else onUpdate(s.id, { sortOrder: i * 10 });
    });
  };

  const toggleCollapse = (id) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const renderNode = (node, depth = 0) => {
    const hasChildren = node.children?.length > 0;
    const isOpen      = !collapsed.has(node.id);
    const siblings    = getSiblings(node.parentId);
    const nodeIdx     = siblings.findIndex(d => d.id === node.id);
    const isDragging  = dragId === node.id;
    const isDragOver  = dragOverId === node.id && dragId !== node.id;

    return (
      <div key={node.id} className={isDragging ? 'opacity-40' : ''}>
        <div
          className={`flex items-center gap-2 py-1.5 rounded-lg group transition-all
            ${isDragOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-inset' : 'hover:bg-gray-50'}`}
          style={{ paddingLeft: `${depth * 22 + 8}px`, paddingRight: '8px' }}
          draggable
          onDragStart={(e) => { e.stopPropagation(); setDragId(node.id); e.dataTransfer.effectAllowed = 'move'; }}
          onDragEnd={()    => { setDragId(null); setDragOverId(null); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragId !== node.id) setDragOverId(node.id); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null); }}
          onDrop={(e) => handleDrop(e, node.id)}
        >
          {/* Expand/collapse toggle */}
          <button
            onClick={() => hasChildren && toggleCollapse(node.id)}
            className={`w-4 h-4 flex-shrink-0 flex items-center justify-center text-gray-400
              ${hasChildren ? 'hover:text-gray-600 cursor-pointer' : 'invisible'}`}
          >
            {hasChildren && (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
          </button>

          {/* Drag handle */}
          <GripVertical size={14} className="text-gray-300 group-hover:text-gray-400 flex-shrink-0 cursor-grab active:cursor-grabbing" />

          {/* Type badge */}
          <span className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize flex-shrink-0
            ${TYPE_BADGE[node.type] || 'bg-gray-100 text-gray-600'}`}>
            {node.type}
          </span>

          {/* Title */}
          <span className="text-sm text-gray-800 font-medium flex-1 min-w-0 truncate">{node.title}</span>

          {/* File indicator */}
          {node.fileData && <FileText size={12} className="text-gray-400 flex-shrink-0" title="Has attached file" />}

          {/* Status badge */}
          <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 hidden sm:inline
            ${STATUS_COLORS[node.status] || 'bg-gray-100 text-gray-500'}`}>
            {node.status}
          </span>

          {/* Action buttons — visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => handleMove(node, -1)} disabled={nodeIdx === 0}
              title="Move up"
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed">
              <ArrowUp size={12} />
            </button>
            <button onClick={() => handleMove(node, 1)} disabled={nodeIdx >= siblings.length - 1}
              title="Move down"
              className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed">
              <ArrowDown size={12} />
            </button>
            <button onClick={() => onAdd(node.id)} title="Add child document"
              className="p-1 rounded hover:bg-green-100 text-gray-400 hover:text-green-600 transition-colors">
              <FolderPlus size={12} />
            </button>
            <button onClick={() => onEdit(node)} title="Edit"
              className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors">
              <Edit2 size={12} />
            </button>
            <button onClick={() => onDelete(node.id)} title="Delete"
              className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && isOpen && (
          <div>{node.children.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Document Hierarchy</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Drag nodes to reparent · ↑↓ buttons to reorder · Drop on root to make top-level
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCollapsed(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            Expand all
          </button>
          <button onClick={() => setCollapsed(new Set(documents.map(d => d.id)))}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
            Collapse all
          </button>
          <button onClick={() => onAdd(null)} className="btn-primary flex items-center gap-1.5 text-sm py-1.5">
            <Plus size={14} /> Add Document
          </button>
        </div>
      </div>

      {/* Root node — drop target for making a doc top-level */}
      <div
        className={`mb-3 px-3 py-2.5 rounded-xl border-2 border-dashed transition-colors flex items-center gap-3
          ${dragOverId === '__root__' ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOverId('__root__'); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverId(null); }}
        onDrop={(e) => handleDrop(e, null)}
      >
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <GitBranch size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">Governance Framework</p>
          <p className="text-xs text-gray-500">{documents.filter(d => !d.parentId).length} top-level documents</p>
        </div>
        {dragId && (
          <span className="ml-auto text-xs text-blue-500 font-medium">Drop here → top-level</span>
        )}
      </div>

      {/* Tree */}
      {documents.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs mt-1">Click "Add Document" to start building your hierarchy</p>
        </div>
      ) : (
        <div className="space-y-0.5">{tree.map(node => renderNode(node, 0))}</div>
      )}
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
            {TYPE_OPTIONS.map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
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
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
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
          <input className="input-field"
            value={Array.isArray(form.tags) ? form.tags.join(', ') : form.tags}
            onChange={e => set('tags', e.target.value)}
            placeholder="e.g. security, IT, policy" />
        </div>
        <div className="col-span-2">
          <label className="label">Document Content</label>
          <textarea className="input-field resize-none" rows={6} value={form.content}
            onChange={e => set('content', e.target.value)}
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

// ─── Main Component ────────────────────────────────────────────────────────────
const Governance = () => {
  const { documents, addDocument, updateDocument, deleteDocument } = useData();
  const [view,          setView]          = useState('list');
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('all');
  const [filterDept,    setFilterDept]    = useState('all');
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editDoc,       setEditDoc]       = useState(null);
  const [newDocParent,  setNewDocParent]  = useState(null);
  const [viewDoc,       setViewDoc]       = useState(null);
  const [showExport,    setShowExport]    = useState(false);

  const departments = useMemo(() => [...new Set(documents.map(d => d.department))].sort(), [documents]);

  const filtered = useMemo(() => documents.filter(d => {
    const q = search.toLowerCase();
    if (search && !d.title.toLowerCase().includes(q) && !d.department.toLowerCase().includes(q)) return false;
    if (filterType   !== 'all' && d.type       !== filterType)   return false;
    if (filterDept   !== 'all' && d.department !== filterDept)   return false;
    if (filterStatus !== 'all' && d.status     !== filterStatus) return false;
    return true;
  }), [documents, search, filterType, filterDept, filterStatus]);

  const openAdd = (parentId = null) => {
    setEditDoc(null);
    setNewDocParent(parentId);
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditDoc(doc);
    setNewDocParent(null);
    setModalOpen(true);
  };

  const handleSave = (data) => {
    const now = new Date().toISOString().split('T')[0];
    if (editDoc) {
      updateDocument(editDoc.id, { ...data, updatedAt: now });
    } else {
      addDocument({ ...data, parentId: newDocParent ?? null });
    }
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    const doc      = documents.find(d => d.id === id);
    const children = documents.filter(d => d.parentId === id);
    let msg = `Delete "${doc?.title}"?`;
    if (children.length > 0) {
      msg += `\n\n${children.length} child document${children.length > 1 ? 's' : ''} will be moved up to the parent level.`;
    }
    if (!window.confirm(msg)) return;
    children.forEach(c => updateDocument(c.id, { parentId: doc?.parentId ?? null }));
    deleteDocument(id);
  };

  // ─── File upload for view modal ──────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File is too large. Maximum allowed size is 5 MB.');
      return;
    }
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

  const counts = TYPE_OPTIONS.reduce((acc, t) => {
    acc[t] = documents.filter(d => d.type === t).length;
    return acc;
  }, {});

  const fileInputProps = {
    type: 'file',
    className: 'hidden',
    accept: '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    onChange: handleFileUpload,
  };

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Governance</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {documents.length} total documents across {departments.length} departments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowExport(!showExport)} className="btn-secondary flex items-center gap-2">
              <Download size={15} /> Export <ChevronDown size={13} />
            </button>
            {showExport && (
              <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-10 min-w-36">
                <button
                  onClick={() => {
                    exportToCSV(filtered.map(d => ({ Title: d.title, Type: d.type, Department: d.department, Status: d.status, Version: d.version, Updated: d.updatedAt, Owner: d.createdBy })), 'governance');
                    setShowExport(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV
                </button>
                <button
                  onClick={() => { exportGovernancePDF(filtered); setShowExport(false); }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export PDF
                </button>
              </div>
            )}
          </div>
          <button onClick={() => openAdd(null)} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Document
          </button>
        </div>
      </div>

      {/* ── Type summary cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {TYPE_OPTIONS.map(t => (
          <div key={t}
            className={`rounded-xl border p-3 cursor-pointer transition-all
              ${filterType === t ? 'ring-2 ring-blue-500 shadow-sm' : 'bg-white hover:shadow-sm'}
              ${TYPE_COLORS[t]}`}
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

      {/* ── Content ── */}
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${TYPE_COLORS[d.type]}`}>
                      {d.type}
                    </span>
                  </td>
                  <td className="table-cell text-gray-600">{d.department}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[d.status]}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500">v{d.version}</td>
                  <td className="table-cell text-gray-600">{d.createdBy || '—'}</td>
                  <td className="table-cell text-gray-500 text-xs">{d.updatedAt}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
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

      {/* ── View Document Modal ── */}
      <Modal isOpen={!!viewDoc} onClose={() => setViewDoc(null)} title={viewDoc?.title || ''} size="lg">
        {viewDoc && (
          <div className="space-y-5">
            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Type',         viewDoc.type],
                ['Department',   viewDoc.department],
                ['Status',       viewDoc.status],
                ['Version',      `v${viewDoc.version}`],
                ['Owner',        viewDoc.createdBy || '—'],
                ['Created',      viewDoc.createdAt],
                ['Last Updated', viewDoc.updatedAt],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="font-medium text-gray-500">{k}: </span>
                  <span className="text-gray-900 capitalize">{v}</span>
                </div>
              ))}
            </div>

            {/* Tags */}
            {Array.isArray(viewDoc.tags) && viewDoc.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {viewDoc.tags.map(t => (
                  <span key={t} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                ))}
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

            {/* ── Attached File ── */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-700">Attached Document</p>
                {!viewDoc.fileData && (
                  <label className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer py-1.5 px-3">
                    <Upload size={13} /> Upload PDF / Word
                    <input {...fileInputProps} />
                  </label>
                )}
              </div>

              {viewDoc.fileData ? (
                <div className="space-y-3">
                  {/* File info bar */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <FileText size={18} className="text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{viewDoc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {viewDoc.fileType?.includes('pdf') ? 'PDF Document' : 'Word Document'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={viewDoc.fileData} download={viewDoc.fileName}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Download">
                        <Download size={14} />
                      </a>
                      <label className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors cursor-pointer" title="Replace file">
                        <Upload size={14} />
                        <input {...fileInputProps} />
                      </label>
                      <button onClick={handleFileRemove}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove file">
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* PDF inline viewer */}
                  {viewDoc.fileType?.includes('pdf') && (
                    <iframe
                      src={viewDoc.fileData}
                      className="w-full rounded-xl border border-gray-200"
                      style={{ height: '520px' }}
                      title={viewDoc.fileName}
                    />
                  )}

                  {/* Word doc — download only */}
                  {!viewDoc.fileType?.includes('pdf') && (
                    <div className="flex items-center justify-center p-8 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="text-center">
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
                    <Upload size={14} /> Choose File
                    <input {...fileInputProps} />
                  </label>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex gap-2 justify-end border-t border-gray-200 pt-4">
              <button onClick={() => { setViewDoc(null); openEdit(viewDoc); }} className="btn-secondary">
                Edit Metadata
              </button>
              <button onClick={() => setViewDoc(null)} className="btn-primary">Close</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Governance;
