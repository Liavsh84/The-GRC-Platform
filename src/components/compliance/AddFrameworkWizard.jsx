import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Library, Upload, PencilLine, ArrowLeft, Check, Search,
  FileSpreadsheet, AlertCircle, ChevronRight, X, Download
} from 'lucide-react';
import Modal from '../common/Modal';
import { STANDARDS_LIBRARY } from '../../data/standardsLibrary';

const CATEGORY_COLORS = {
  'Information Security': 'bg-blue-100 text-blue-700',
  'Privacy & Data Protection': 'bg-purple-100 text-purple-700',
  'Payment Security': 'bg-green-100 text-green-700',
  'Business Continuity': 'bg-orange-100 text-orange-700',
  'IT Governance': 'bg-indigo-100 text-indigo-700',
};

const TYPE_OPTIONS = ['standard', 'regulation', 'law', 'framework', 'guideline'];

// ─── Step 1: Pick a mode ──────────────────────────────────────────────────────
const ModeStep = ({ onSelect }) => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500 mb-6">How would you like to add a compliance framework?</p>
    <div className="grid grid-cols-1 gap-3">
      {[
        {
          id: 'library',
          icon: Library,
          title: 'Browse Standards Library',
          desc: 'Pick from ISO 27001, NIST CSF, GDPR, PCI DSS, SOC 2, CIS Controls, HIPAA, ISO 22301, NIST 800-53, COBIT 2019 — with all controls pre-loaded.',
          color: 'bg-blue-600',
          badge: '9 frameworks available',
        },
        {
          id: 'excel',
          icon: FileSpreadsheet,
          title: 'Upload from Excel',
          desc: 'Import your own control list from an Excel (.xlsx) or CSV file. Download our template to see the expected format.',
          color: 'bg-green-600',
          badge: '.xlsx / .csv',
        },
        {
          id: 'manual',
          icon: PencilLine,
          title: 'Create Manually',
          desc: 'Start with a blank framework and add controls one by one.',
          color: 'bg-slate-600',
          badge: 'Custom',
        },
      ].map(opt => (
        <button key={opt.id} onClick={() => onSelect(opt.id)}
          className="flex items-center gap-5 p-5 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 text-left transition-all group">
          <div className={`w-12 h-12 ${opt.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <opt.icon size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{opt.title}</p>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{opt.badge}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{opt.desc}</p>
          </div>
          <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
        </button>
      ))}
    </div>
  </div>
);

// ─── Library Browser ──────────────────────────────────────────────────────────
const LibraryStep = ({ onImport, onBack }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);

  const filtered = STANDARDS_LIBRARY.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.type.toLowerCase().includes(search.toLowerCase())
  );

  const handleImport = () => {
    if (!selected) return;
    const fw = STANDARDS_LIBRARY.find(s => s.id === selected);
    if (fw) onImport({ name: fw.name, type: fw.type, version: fw.version, description: fw.description, controls: fw.controls });
  };

  if (preview) {
    const fw = STANDARDS_LIBRARY.find(s => s.id === preview);
    return (
      <div className="space-y-4">
        <button onClick={() => setPreview(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back to library
        </button>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{fw.name}</h3>
          <p className="text-sm text-gray-500 mt-1">{fw.description}</p>
          <p className="text-xs text-gray-400 mt-1">{fw.controls.length} controls will be imported — all set to "Non-Compliant" for you to assess.</p>
        </div>
        <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 w-28">Control ID</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fw.controls.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-blue-700 font-semibold align-top">{c.controlId}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs">{c.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setPreview(null)} className="btn-secondary">Back</button>
          <button onClick={() => { setSelected(fw.id); setPreview(null); onImport({ name: fw.name, type: fw.type, version: fw.version, description: fw.description, controls: fw.controls }); }} className="btn-primary">
            Import {fw.controls.length} Controls →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-field pl-9" placeholder="Search frameworks…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {filtered.map(s => {
          const isSelected = selected === s.id;
          return (
            <div key={s.id}
              onClick={() => setSelected(isSelected ? null : s.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {isSelected && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[s.category] || 'bg-gray-100 text-gray-600'}`}>{s.category}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">{s.type}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-700">{s.controls.length}</p>
                <p className="text-xs text-gray-400">controls</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setPreview(s.id); }}
                className="text-xs text-blue-600 hover:underline flex-shrink-0 ml-1"
              >
                Preview
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">No frameworks match your search.</p>}
      </div>
      <div className="flex gap-3 justify-end border-t border-gray-200 pt-4">
        <button onClick={onBack} className="btn-secondary">Back</button>
        <button onClick={handleImport} disabled={!selected} className="btn-primary disabled:opacity-40">
          Import Selected Framework →
        </button>
      </div>
    </div>
  );
};

// ─── Excel Upload Step ────────────────────────────────────────────────────────
const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Control ID', 'Title', 'Status', 'Owner', 'Due Date', 'Notes'],
    ['A.5.1', 'Policies for information security', 'non-compliant', 'IT Team', '2025-06-30', 'Review existing policy'],
    ['A.5.2', 'Information security roles and responsibilities', 'partial', 'CISO', '2025-07-31', 'Role matrix needs update'],
    ['A.6.1', 'Screening', 'compliant', 'HR', '', 'Background checks in place'],
  ]);
  ws['!cols'] = [{ wch: 18 }, { wch: 55 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Controls');
  XLSX.writeFile(wb, 'GRC_Controls_Template.xlsx');
};

const VALID_STATUSES = ['compliant', 'partial', 'non-compliant', 'not-applicable'];

const ExcelStep = ({ onImport, onBack }) => {
  const [step, setStep] = useState('upload'); // upload | map | preview
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ controlId: '', title: '', status: '', owner: '', dueDate: '', notes: '' });
  const [fwMeta, setFwMeta] = useState({ name: '', type: 'standard', version: '', description: '' });
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const autoDetectMapping = (hdrs) => {
    const lc = hdrs.map(h => h.toLowerCase());
    const find = (...terms) => {
      for (const t of terms) {
        const i = lc.findIndex(h => h.includes(t));
        if (i >= 0) return hdrs[i];
      }
      return '';
    };
    return {
      controlId: find('control id', 'id', 'control', 'ref', 'number', 'no'),
      title: find('title', 'name', 'description', 'requirement', 'control name', 'text'),
      status: find('status', 'state', 'result'),
      owner: find('owner', 'responsible', 'assignee', 'assigned'),
      dueDate: find('due', 'date', 'target', 'deadline'),
      notes: find('note', 'comment', 'evidence', 'remark', 'observation'),
    };
  };

  const processFile = (file) => {
    setError('');
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setError('Please upload an .xlsx, .xls, or .csv file.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) { setError('File appears to be empty or has only headers.'); return; }
        const hdrs = rows[0].map(h => String(h).trim()).filter(Boolean);
        const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim()));
        setHeaders(hdrs);
        setRawRows(dataRows);
        setMapping(autoDetectMapping(hdrs));
        // auto-detect framework name from filename
        const guessedName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
        setFwMeta(m => ({ ...m, name: m.name || guessedName }));
        setStep('map');
      } catch (err) {
        setError('Could not read the file. Please make sure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const mappedControls = () => rawRows.map((row, i) => {
    const get = (col) => col ? String(row[headers.indexOf(col)] || '').trim() : '';
    const rawStatus = get(mapping.status).toLowerCase();
    const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'non-compliant';
    return {
      id: `imported_${Date.now()}_${i}`,
      controlId: get(mapping.controlId) || `CTRL-${String(i + 1).padStart(3, '0')}`,
      title: get(mapping.title) || '(No title)',
      status,
      owner: get(mapping.owner),
      dueDate: get(mapping.dueDate),
      notes: get(mapping.notes),
    };
  }).filter(c => c.title !== '(No title)' || c.controlId !== `CTRL-001`);

  if (step === 'upload') {
    return (
      <div className="space-y-5">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back
        </button>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
        >
          <FileSpreadsheet size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="font-semibold text-gray-700">Drop your Excel or CSV file here</p>
          <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          <p className="text-xs text-gray-400 mt-2">Supported: .xlsx, .xls, .csv</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => processFile(e.target.files[0])} />
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            <AlertCircle size={16} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Template download */}
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold text-blue-900">Need a template?</p>
            <p className="text-xs text-blue-600 mt-0.5">Download our Excel template with the correct columns pre-filled.</p>
          </div>
          <button onClick={downloadTemplate} className="btn-secondary flex items-center gap-2 flex-shrink-0 text-blue-700 border-blue-300 hover:bg-blue-100">
            <Download size={14} /> Download Template
          </button>
        </div>
      </div>
    );
  }

  if (step === 'map') {
    const FIELD_LABELS = {
      controlId: 'Control ID',
      title: 'Title / Name',
      status: 'Status',
      owner: 'Owner',
      dueDate: 'Due Date',
      notes: 'Notes',
    };
    const controls = mappedControls();
    return (
      <div className="space-y-5">
        <button onClick={() => setStep('upload')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700">
          <Check size={16} /> File loaded: <strong>{fileName}</strong> — {rawRows.length} rows detected
        </div>

        {/* Framework details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Framework Name *</label>
            <input className="input-field" value={fwMeta.name} onChange={e => setFwMeta(m => ({ ...m, name: e.target.value }))} required placeholder="e.g. My Custom Standard" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input-field" value={fwMeta.type} onChange={e => setFwMeta(m => ({ ...m, type: e.target.value }))}>
              {TYPE_OPTIONS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Version</label>
            <input className="input-field" value={fwMeta.version} onChange={e => setFwMeta(m => ({ ...m, version: e.target.value }))} placeholder="e.g. 2024" />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <input className="input-field" value={fwMeta.description} onChange={e => setFwMeta(m => ({ ...m, description: e.target.value }))} placeholder="Brief description" />
          </div>
        </div>

        {/* Column mapping */}
        <div>
          <p className="label mb-2">Map your spreadsheet columns</p>
          <p className="text-xs text-gray-500 mb-3">We auto-detected these mappings — adjust if needed. Required: <strong>Title</strong>.</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(FIELD_LABELS).map(([field, label]) => (
              <div key={field}>
                <label className="label text-xs">{label} {field === 'title' ? '*' : '(optional)'}</label>
                <select className="input-field py-2 text-sm" value={mapping[field]} onChange={e => setMapping(m => ({ ...m, [field]: e.target.value }))}>
                  <option value="">(skip)</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setStep('upload')} className="btn-secondary">Back</button>
          <button onClick={() => setStep('preview')} disabled={!fwMeta.name || !mapping.title} className="btn-primary disabled:opacity-40">
            Preview {controls.length} Controls →
          </button>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const controls = mappedControls();
    return (
      <div className="space-y-4">
        <button onClick={() => setStep('map')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back to mapping
        </button>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">{fwMeta.name} — {controls.length} controls ready to import</p>
          <p className="text-xs text-blue-600 mt-0.5">All controls will be added with the statuses from your file (defaulting to Non-Compliant if blank).</p>
        </div>

        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 text-gray-500 w-28">Control ID</th>
                <th className="text-left px-3 py-2 text-gray-500">Title</th>
                <th className="text-left px-3 py-2 text-gray-500 w-28">Status</th>
                <th className="text-left px-3 py-2 text-gray-500 w-24">Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {controls.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-blue-700 font-semibold">{c.controlId}</td>
                  <td className="px-3 py-2 text-gray-700">{c.title}</td>
                  <td className="px-3 py-2 capitalize text-gray-600">{c.status}</td>
                  <td className="px-3 py-2 text-gray-500">{c.owner || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setStep('map')} className="btn-secondary">Back</button>
          <button onClick={() => onImport({ ...fwMeta, controls })} className="btn-primary">
            Import {controls.length} Controls →
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// ─── Manual Form ──────────────────────────────────────────────────────────────
const ManualStep = ({ onSave, onBack }) => {
  const [form, setForm] = useState({ name: '', type: 'standard', description: '', version: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...form, controls: [] }); }} className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Back
      </button>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Framework / Standard Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Internal Security Standard" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Version</label>
          <input className="input-field" value={form.version} onChange={e => set('version', e.target.value)} placeholder="e.g. 1.0" />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of this framework or regulation…" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onBack} className="btn-secondary">Back</button>
        <button type="submit" className="btn-primary">Create Framework →</button>
      </div>
    </form>
  );
};

// ─── Main Wizard ──────────────────────────────────────────────────────────────
const AddFrameworkWizard = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState(null);

  const handleClose = () => { setMode(null); onClose(); };

  const handleSave = (data) => {
    onSave(data);
    setMode(null);
    onClose();
  };

  const title = mode === 'library' ? 'Standards Library'
    : mode === 'excel' ? 'Upload from Excel'
    : mode === 'manual' ? 'Create Manually'
    : 'Add Compliance Framework';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      {!mode && <ModeStep onSelect={setMode} />}
      {mode === 'library' && <LibraryStep onImport={handleSave} onBack={() => setMode(null)} />}
      {mode === 'excel' && <ExcelStep onImport={handleSave} onBack={() => setMode(null)} />}
      {mode === 'manual' && <ManualStep onSave={handleSave} onBack={() => setMode(null)} />}
    </Modal>
  );
};

export default AddFrameworkWizard;
