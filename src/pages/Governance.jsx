import { useState, useMemo, useRef } from 'react';
import {
  Plus, Search, List, GitBranch, Download, Edit2, Trash2, FileText, X,
  ChevronDown, Upload, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Wand2,
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

// ─── Document Creation Wizard ──────────────────────────────────────────────────
const WIZARD_STEPS = ['Type', 'Context', 'Details', 'Template', 'Review'];

const TYPE_CARDS = [
  { value: 'policy',    label: 'Policy',    icon: '📋', desc: 'High-level statement of organizational intent and direction. Mandatory compliance expected.', color: 'border-blue-400 bg-blue-50',   active: 'ring-blue-500' },
  { value: 'procedure', label: 'Procedure', icon: '⚙️', desc: 'Step-by-step operational instructions for completing a specific task or process.',            color: 'border-purple-400 bg-purple-50', active: 'ring-purple-500' },
  { value: 'standard',  label: 'Standard',  icon: '📏', desc: 'Mandatory technical requirements and specifications that must be met.',                         color: 'border-green-400 bg-green-50',  active: 'ring-green-500' },
  { value: 'guideline', label: 'Guideline', icon: '💡', desc: 'Recommended best practices and advice — informational, not strictly mandatory.',                color: 'border-yellow-400 bg-yellow-50', active: 'ring-yellow-500' },
];

const ORG_SIZES = [
  { value: 'small',      label: '1–50',      sub: 'Small' },
  { value: 'medium',     label: '51–200',    sub: 'Medium' },
  { value: 'large',      label: '201–1,000', sub: 'Large' },
  { value: 'enterprise', label: '1,000+',    sub: 'Enterprise' },
];

const GEO_SCOPES = ['Single Location', 'Multi-Office', 'Multi-Country', 'Global'];

const REGULATION_OPTIONS = ['ISO 27001', 'ISO 22301', 'GDPR', 'CCPA', 'NIS2', 'NIST CSF', 'SOC 2', 'HIPAA', 'PCI-DSS', 'None / Internal only'];

const CLASSIFICATIONS = [
  { value: 'public',       label: 'Public',       desc: 'No access restrictions',    dot: 'bg-green-500' },
  { value: 'internal',     label: 'Internal',     desc: 'Employees only',            dot: 'bg-blue-500'  },
  { value: 'confidential', label: 'Confidential', desc: 'Limited / need-to-know',    dot: 'bg-orange-500' },
  { value: 'restricted',   label: 'Restricted',   desc: 'Strictly controlled access', dot: 'bg-red-500'  },
];

const REVIEW_FREQS = ['Annually', 'Semi-annually', 'Quarterly', 'Upon Major Change Only'];

const CONTENT_OUTLINE = {
  policy:    ['1. Purpose & Objective', '2. Scope & Applicability', '3. Policy Statements', '4. Roles & Responsibilities', '5. Compliance & Enforcement', '6. Exceptions & Waivers', '7. Related Documents', '8. Review & Revision History'],
  procedure: ['1. Purpose', '2. Scope', '3. Prerequisites & Resources', '4. Procedure Steps', '5. Roles & Responsibilities', '6. Exception Handling', '7. References & Related Documents', '8. Review History'],
  standard:  ['1. Purpose', '2. Scope', '3. Mandatory Requirements', '4. Technical Specifications', '5. Compliance Criteria & Testing', '6. Exceptions', '7. References', '8. Review History'],
  guideline: ['1. Introduction', '2. Applicability', '3. Recommendations', '4. Best Practices', '5. Examples & Use Cases', '6. Useful Resources', '7. Glossary', '8. Review History'],
};

const TYPE_PREFIX = { policy: 'POL', procedure: 'PRO', standard: 'STD', guideline: 'GDL' };
const DEPT_PREFIX  = { IT: 'IT', HR: 'HR', Finance: 'FIN', Operations: 'OPS', Legal: 'LEG', Compliance: 'COM', Procurement: 'PRC', 'Risk Management': 'RSK' };

const EMPTY_WIZARD = {
  type: '', department: 'IT', orgSize: '', geographicScope: '', regulations: [], classification: 'internal',
  title: '', documentId: '', version: '1.0', owner: '', approver: '', effectiveDate: '',
  reviewFrequency: 'Annually', scope: '', parentId: null,
  fileData: null, fileName: null, fileType: null, content: '', tags: '',
};

const DocWizard = ({ documents, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...EMPTY_WIZARD, owner: currentUser?.name || '' });
  const fileRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleReg = (r) => set('regulations',
    form.regulations.includes(r) ? form.regulations.filter(x => x !== r) : [...form.regulations, r]
  );

  // Auto-generated document ID
  const autoId = useMemo(() => {
    if (!form.type) return '';
    const tp = TYPE_PREFIX[form.type] || 'DOC';
    const dp = DEPT_PREFIX[form.department] || form.department.slice(0, 3).toUpperCase();
    const prefix = `${tp}-${dp}`;
    const n = documents.filter(d => (d.documentId || '').startsWith(prefix)).length + 1;
    return `${prefix}-${String(n).padStart(3, '0')}`;
  }, [form.type, form.department, documents]);

  const handleFile = (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Maximum file size is 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = (evt) => setForm(f => ({ ...f, fileData: evt.target.result, fileName: file.name, fileType: file.type }));
    reader.readAsDataURL(file);
  };

  const canNext = () => {
    if (step === 0) return !!form.type;
    if (step === 1) return !!form.department && !!form.orgSize && !!form.geographicScope && !!form.classification;
    if (step === 2) return !!(form.title.trim()) && !!(form.owner.trim());
    return true;
  };

  const handleCreate = () => {
    const tags = typeof form.tags === 'string'
      ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
      : form.tags;
    onSave({
      title: form.title.trim(), type: form.type, department: form.department,
      status: 'draft', version: form.version || '1.0',
      createdBy: form.owner, approver: form.approver,
      effectiveDate: form.effectiveDate, reviewFrequency: form.reviewFrequency,
      scope: form.scope, classification: form.classification,
      orgSize: form.orgSize, geographicScope: form.geographicScope,
      regulations: form.regulations,
      documentId: (form.documentId || autoId),
      parentId: form.parentId,
      fileData: form.fileData, fileName: form.fileName, fileType: form.fileType,
      content: form.content, tags,
    });
  };

  // ── Step renders ────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 0: Type selection
      case 0: return (
        <div>
          <p className="text-sm text-gray-500 mb-5">Choose the document type that best describes its purpose in your governance framework.</p>
          <div className="grid grid-cols-2 gap-3">
            {TYPE_CARDS.map(c => (
              <button key={c.value} type="button" onClick={() => set('type', c.value)}
                className={`p-5 rounded-xl border-2 text-left transition-all hover:shadow-md
                  ${form.type === c.value ? `${c.color} ring-2 ${c.active} shadow-md` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <span className="text-3xl mb-3 block">{c.icon}</span>
                <p className="font-bold text-gray-900 text-base mb-1">{c.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{c.desc}</p>
              </button>
            ))}
          </div>
        </div>
      );

      // ── Step 1: Context
      case 1: return (
        <div className="space-y-6">
          <p className="text-sm text-gray-500">Answer these questions to tailor the document to your organization's context.</p>

          {/* Department */}
          <div>
            <label className="label">Which department owns this document? *</label>
            <select className="input-field" value={form.department} onChange={e => set('department', e.target.value)}>
              {DEPT_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Org size */}
          <div>
            <label className="label">What is your organization's size? *</label>
            <div className="grid grid-cols-4 gap-2">
              {ORG_SIZES.map(o => (
                <button key={o.value} type="button" onClick={() => set('orgSize', o.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all
                    ${form.orgSize === o.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <p className="font-bold text-gray-900 text-sm">{o.label}</p>
                  <p className="text-xs text-gray-500">{o.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Geographic scope */}
          <div>
            <label className="label">What is the geographic scope of this document? *</label>
            <div className="grid grid-cols-2 gap-2">
              {GEO_SCOPES.map(g => (
                <button key={g} type="button" onClick={() => set('geographicScope', g)}
                  className={`py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all
                    ${form.geographicScope === g ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Regulations */}
          <div>
            <label className="label">Which regulations or frameworks does this document support? <span className="font-normal text-gray-400">(select all that apply)</span></label>
            <div className="flex flex-wrap gap-2">
              {REGULATION_OPTIONS.map(r => (
                <button key={r} type="button" onClick={() => toggleReg(r)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all
                    ${form.regulations.includes(r) ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Classification */}
          <div>
            <label className="label">Data classification *</label>
            <div className="grid grid-cols-4 gap-2">
              {CLASSIFICATIONS.map(c => (
                <button key={c.value} type="button" onClick={() => set('classification', c.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all
                    ${form.classification === c.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${c.dot} mb-2`} />
                  <p className="font-semibold text-gray-900 text-xs">{c.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      );

      // ── Step 2: Details
      case 2: return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Fill in the document metadata. The ID has been auto-generated but you can edit it.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Document Title *</label>
              <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder={`e.g. ${form.department} ${form.type ? form.type.charAt(0).toUpperCase() + form.type.slice(1) : 'Document'}`} />
            </div>
            <div>
              <label className="label">Document ID</label>
              <input className="input-field font-mono text-sm" value={form.documentId || autoId}
                onChange={e => set('documentId', e.target.value)} />
            </div>
            <div>
              <label className="label">Version</label>
              <input className="input-field" value={form.version} onChange={e => set('version', e.target.value)} placeholder="1.0" />
            </div>
            <div>
              <label className="label">Document Owner / Author *</label>
              <input className="input-field" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="label">Approver</label>
              <input className="input-field" value={form.approver} onChange={e => set('approver', e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <label className="label">Effective Date</label>
              <input type="date" className="input-field" value={form.effectiveDate} onChange={e => set('effectiveDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Review Frequency</label>
              <select className="input-field" value={form.reviewFrequency} onChange={e => set('reviewFrequency', e.target.value)}>
                {REVIEW_FREQS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Scope — Who and what does this apply to?</label>
              <textarea className="input-field resize-none" rows={2} value={form.scope} onChange={e => set('scope', e.target.value)}
                placeholder="e.g. All employees, contractors, and third parties with access to company information systems…" />
            </div>
            <div className="col-span-2">
              <label className="label">Position in Hierarchy</label>
              <select className="input-field" value={form.parentId || ''} onChange={e => set('parentId', e.target.value || null)}>
                <option value="">Top-level (directly under Governance Framework)</option>
                {documents.map(d => <option key={d.id} value={d.id}>{d.title} ({d.type})</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
              <input className="input-field" value={form.tags} onChange={e => set('tags', e.target.value)}
                placeholder="e.g. security, access-control, ISO27001, annual-review" />
            </div>
          </div>
        </div>
      );

      // ── Step 3: Template & Content
      case 3: return (
        <div className="space-y-5">
          <p className="text-sm text-gray-500">Upload your organization's existing template, or use the guided structure below to get started.</p>

          {/* Upload area */}
          <div>
            <label className="label">Upload Organization Template <span className="font-normal text-gray-400">(optional — PDF or Word, max 5 MB)</span></label>
            <input ref={fileRef} type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden" onChange={handleFile} />
            {form.fileName ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <FileText size={20} className="text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-800 flex-1 truncate">{form.fileName}</span>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, fileData: null, fileName: null, fileType: null }))}
                  className="p-1 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"><X size={14} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 px-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-all group">
                <Upload size={28} className="mx-auto text-gray-400 group-hover:text-blue-500 mb-2" />
                <p className="text-sm font-medium text-gray-600 group-hover:text-blue-600">Click to upload your organization's template</p>
                <p className="text-xs text-gray-400 mt-1">PDF · DOC · DOCX — max 5 MB</p>
              </button>
            )}
          </div>

          {/* Suggested structure */}
          {form.type && (
            <div>
              <label className="label">Suggested structure for a <span className="capitalize font-semibold">{form.type}</span></label>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                {CONTENT_OUTLINE[form.type]?.map(s => (
                  <div key={s} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional notes */}
          <div>
            <label className="label">Additional notes or initial content <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea className="input-field resize-none" rows={4} value={form.content} onChange={e => set('content', e.target.value)}
              placeholder="Add any initial content, purpose statement, or key points for this document…" />
          </div>
        </div>
      );

      // ── Step 4: Review
      case 4: return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Review everything before creating. The document will be saved as a <strong>Draft</strong> — you can edit and approve it later.</p>
          <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-200">
            {[
              ['Document Type',         form.type ? form.type.charAt(0).toUpperCase() + form.type.slice(1) : '—'],
              ['Department',            form.department],
              ['Document ID',           form.documentId || autoId],
              ['Title',                 form.title || '—'],
              ['Owner / Author',        form.owner || '—'],
              ['Approver',              form.approver || '—'],
              ['Version',               form.version || '1.0'],
              ['Effective Date',        form.effectiveDate || '—'],
              ['Review Frequency',      form.reviewFrequency],
              ['Organization Size',     ORG_SIZES.find(o => o.value === form.orgSize)?.label || '—'],
              ['Geographic Scope',      form.geographicScope || '—'],
              ['Classification',        CLASSIFICATIONS.find(c => c.value === form.classification)?.label || '—'],
              ['Frameworks / Regs',     form.regulations.length ? form.regulations.join(', ') : '—'],
              ['Scope',                 form.scope || '—'],
              ['Tags',                  form.tags || '—'],
              ['Template Uploaded',     form.fileName || 'None'],
              ['Hierarchy Position',    form.parentId ? documents.find(d => d.id === form.parentId)?.title || '—' : 'Top-level'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-start gap-4 px-4 py-2.5 even:bg-white">
                <span className="text-xs font-semibold text-gray-500 w-40 flex-shrink-0 pt-0.5">{k}</span>
                <span className="text-sm text-gray-800 flex-1">{v}</span>
              </div>
            ))}
          </div>
        </div>
      );

      default: return null;
    }
  };

  return (
    <div>
      {/* Progress stepper */}
      <div className="flex items-center mb-8">
        {WIZARD_STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < step  ? 'bg-blue-600 text-white'
                : i === step ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                :              'bg-gray-200 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>{s}</span>
            </div>
            {i < WIZARD_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-all ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step title */}
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        {['What type of document are you creating?', 'Organizational context', 'Document details', 'Template & content', 'Review & create'][step]}
      </h3>

      {/* Step content */}
      <div className="min-h-64">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-5 border-t border-gray-200">
        <button type="button" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)} className="btn-secondary">
          {step === 0 ? 'Cancel' : '← Back'}
        </button>
        {step < WIZARD_STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
            Next →
          </button>
        ) : (
          <button type="button" onClick={handleCreate}
            className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700 focus:ring-green-500">
            <Wand2 size={15} /> Create Document
          </button>
        )}
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
  const [wizardOpen,   setWizardOpen]   = useState(false);
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

  const openAdd = (parentId = null) => { setNewDocParent(parentId); setWizardOpen(true); };
  const openEdit = (doc) => { setEditDoc(doc); setNewDocParent(null); setModalOpen(true); };

  const handleSave = (data) => {
    const now = new Date().toISOString().split('T')[0];
    if (editDoc) updateDocument(editDoc.id, { ...data, updatedAt: now });
    else addDocument({ ...data, parentId: newDocParent ?? null });
    setModalOpen(false);
  };

  const handleWizardSave = (data) => {
    const now = new Date().toISOString().split('T')[0];
    addDocument({ ...data, parentId: data.parentId ?? newDocParent ?? null, createdAt: now, updatedAt: now });
    setWizardOpen(false);
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
            <Wand2 size={15} /> Create Document
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

      {/* ── Create Wizard Modal ── */}
      <Modal isOpen={wizardOpen} onClose={() => setWizardOpen(false)}
        title="Create New Document" size="lg">
        <DocWizard
          documents={documents}
          onSave={handleWizardSave}
          onCancel={() => setWizardOpen(false)}
        />
      </Modal>

      {/* ── Edit Modal (simple form) ── */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title="Edit Document" size="lg">
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
