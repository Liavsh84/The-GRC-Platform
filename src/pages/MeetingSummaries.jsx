import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Search, Download, CheckCircle, Clock,
  User, Calendar, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV } from '../utils/exportUtils';

const MEETING_TYPES = ['Management Review', 'Board Meeting', 'Risk Committee', 'Audit Committee', 'Steering Committee', 'Custom'];
const STANDARDS = ['ISO 27001:2022', 'ISO 22301:2019', 'ISO 9001', 'NIST CSF 2.0', 'SOC 2', 'PCI DSS 4.0', 'GDPR', 'None'];
const STATUSES = ['draft', 'final'];

const statusMeta = {
  draft: { label: 'Draft', color: 'bg-yellow-100 text-yellow-700' },
  final: { label: 'Final', color: 'bg-green-100 text-green-700' },
};

const EMPTY_MEETING = {
  title: '', type: 'Management Review', standard: 'ISO 27001:2022',
  date: '', facilitator: '', nextMeetingDate: '', status: 'draft', notes: '',
};

// ─── Editable List ─────────────────────────────────────────────────────────────
const EditableList = ({ label, items, onChange, placeholder }) => {
  const [newItem, setNewItem] = useState('');
  const add = () => { if (newItem.trim()) { onChange([...items, newItem.trim()]); setNewItem(''); } };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, v) => onChange(items.map((x, idx) => idx === i ? v : x));
  return (
    <div>
      <label className="label">{label}</label>
      <div className="space-y-1.5 mb-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input className="input-field py-1.5 flex-1" value={item} onChange={e => update(i, e.target.value)} />
            <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input className="input-field py-1.5 flex-1" value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={placeholder} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button type="button" onClick={add} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">+ Add</button>
      </div>
    </div>
  );
};

// ─── Action Items Editor ───────────────────────────────────────────────────────
const ActionItemsEditor = ({ items, onChange }) => {
  const empty = { description: '', owner: '', dueDate: '', status: 'open' };
  const add = () => onChange([...items, { ...empty, id: Date.now().toString() }]);
  const remove = (id) => onChange(items.filter(a => a.id !== id));
  const update = (id, k, v) => onChange(items.map(a => a.id === id ? { ...a, [k]: v } : a));
  return (
    <div>
      <label className="label">Action Items</label>
      <div className="space-y-2 mb-2">
        {items.map(a => (
          <div key={a.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
            <input className="input-field py-1.5 col-span-5 text-sm" value={a.description} onChange={e => update(a.id, 'description', e.target.value)} placeholder="Action description…" />
            <input className="input-field py-1.5 col-span-2 text-sm" value={a.owner} onChange={e => update(a.id, 'owner', e.target.value)} placeholder="Owner" />
            <input type="date" className="input-field py-1.5 col-span-2 text-sm" value={a.dueDate} onChange={e => update(a.id, 'dueDate', e.target.value)} />
            <select className="input-field py-1.5 col-span-2 text-sm" value={a.status} onChange={e => update(a.id, 'status', e.target.value)}>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            <button type="button" onClick={() => remove(a.id)} className="col-span-1 p-1.5 text-gray-400 hover:text-red-500 flex justify-center"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors">+ Add Action Item</button>
    </div>
  );
};

// ─── Meeting Form ─────────────────────────────────────────────────────────────
const MeetingForm = ({ initial, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [f, setF] = useState({
    ...EMPTY_MEETING,
    facilitator: currentUser?.name || '',
    attendees: [],
    agenda: [],
    decisions: [],
    actionItems: [],
    ...initial,
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(f); }} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Meeting Title *</label>
          <input className="input-field" value={f.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Management Review Q2 2025 – ISO 27001" />
        </div>
        <div>
          <label className="label">Meeting Type</label>
          <select className="input-field" value={f.type} onChange={e => set('type', e.target.value)}>
            {MEETING_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Standard / Reference</label>
          <select className="input-field" value={f.standard} onChange={e => set('standard', e.target.value)}>
            {STANDARDS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Meeting Date *</label>
          <input type="date" className="input-field" value={f.date} onChange={e => set('date', e.target.value)} required />
        </div>
        <div>
          <label className="label">Facilitator</label>
          <input className="input-field" value={f.facilitator} onChange={e => set('facilitator', e.target.value)} />
        </div>
        <div>
          <label className="label">Next Meeting Date</label>
          <input type="date" className="input-field" value={f.nextMeetingDate} onChange={e => set('nextMeetingDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </div>
      </div>

      <EditableList label="Attendees" items={f.attendees} onChange={v => set('attendees', v)} placeholder="Add attendee name…" />
      <EditableList label="Agenda Items" items={f.agenda} onChange={v => set('agenda', v)} placeholder="Add agenda item…" />
      <EditableList label="Decisions Made" items={f.decisions} onChange={v => set('decisions', v)} placeholder="Add decision…" />
      <ActionItemsEditor items={f.actionItems} onChange={v => set('actionItems', v)} />

      <div>
        <label className="label">Notes</label>
        <textarea className="input-field resize-none" rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes…" />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Meeting</button>
      </div>
    </form>
  );
};

// ─── Meeting Detail View ───────────────────────────────────────────────────────
const MeetingDetail = ({ meeting, onEdit }) => {
  const openActions = (meeting.actionItems || []).filter(a => a.status === 'open').length;
  const sm = statusMeta[meeting.status] || statusMeta['draft'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{meeting.type}</span>
            {meeting.standard !== 'None' && <span className="text-xs text-gray-500">{meeting.standard}</span>}
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">{meeting.title}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
            <span className="flex items-center gap-1"><Calendar size={13} /> {meeting.date}</span>
            <span className="flex items-center gap-1"><User size={13} /> {meeting.facilitator}</span>
            {meeting.nextMeetingDate && <span className="flex items-center gap-1"><ChevronRight size={13} /> Next: {meeting.nextMeetingDate}</span>}
          </div>
        </div>
        <button onClick={() => onEdit(meeting)} className="btn-secondary flex items-center gap-1"><Edit2 size={13} /> Edit</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Attendees */}
        {(meeting.attendees || []).length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Attendees ({meeting.attendees.length})</p>
            <div className="space-y-1">
              {meeting.attendees.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{a[0]}</div>
                  {a}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agenda */}
        {(meeting.agenda || []).length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agenda</p>
            <ol className="space-y-1">
              {meeting.agenda.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-blue-500 font-bold flex-shrink-0">{i + 1}.</span> {item}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Decisions */}
        {(meeting.decisions || []).length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Decisions Made</p>
            <ul className="space-y-1">
              {meeting.decisions.map((d, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <CheckCircle size={13} className="text-green-500 flex-shrink-0 mt-0.5" /> {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Items */}
      {(meeting.actionItems || []).length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">Action Items</h3>
            {openActions > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{openActions} open</span>}
          </div>
          <table className="w-full border border-gray-200 rounded-xl overflow-hidden text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Description</th>
                <th className="table-header w-32">Owner</th>
                <th className="table-header w-28">Due Date</th>
                <th className="table-header w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {meeting.actionItems.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-cell">{a.description}</td>
                  <td className="table-cell text-gray-600">{a.owner || '—'}</td>
                  <td className="table-cell text-gray-600">{a.dueDate || '—'}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.status === 'open' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meeting.notes && (
        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
          <p className="font-semibold text-blue-700 mb-1">Notes</p>
          {meeting.notes}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const MeetingSummaries = () => {
  const { meetings, addMeeting, updateMeeting, deleteMeeting } = useData();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [formModal, setFormModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [detailMeeting, setDetailMeeting] = useState(null);

  const filtered = useMemo(() => meetings.filter(m => {
    return (
      (filterType === 'all' || m.type === filterType) &&
      (filterStatus === 'all' || m.status === filterStatus) &&
      (!search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.facilitator || '').toLowerCase().includes(search.toLowerCase()))
    );
  }), [meetings, filterType, filterStatus, search]);

  const handleSave = (data) => {
    if (editMeeting) updateMeeting(editMeeting.id, data);
    else addMeeting(data);
    setFormModal(false);
    setEditMeeting(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this meeting summary?')) return;
    deleteMeeting(id);
    if (detailMeeting?.id === id) setDetailMeeting(null);
  };

  const openEdit = (m) => { setEditMeeting(m); setFormModal(true); };

  const totalOpenActions = meetings.flatMap(m => m.actionItems || []).filter(a => a.status === 'open').length;

  const stats = [
    { label: 'Total Meetings',  value: meetings.length,                                       color: 'text-blue-600' },
    { label: 'Final',           value: meetings.filter(m => m.status === 'final').length,     color: 'text-green-600' },
    { label: 'Draft',           value: meetings.filter(m => m.status === 'draft').length,     color: 'text-yellow-600' },
    { label: 'Open Actions',    value: totalOpenActions,                                       color: 'text-red-600' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Meeting Summaries</h2>
          <p className="text-sm text-gray-500 mt-0.5">Management reviews, board meetings, and committee minutes</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(
              filtered.map(m => ({ Title: m.title, Type: m.type, Standard: m.standard, Date: m.date, Facilitator: m.facilitator, Attendees: (m.attendees||[]).join('; '), Decisions: (m.decisions||[]).length, 'Open Actions': (m.actionItems||[]).filter(a=>a.status==='open').length, Status: m.status })),
              'meeting_summaries'
            )}
            className="btn-secondary flex items-center gap-2"><Download size={15} /> Export CSV
          </button>
          <button onClick={() => { setEditMeeting(null); setFormModal(true); }} className="btn-primary flex items-center gap-2"><Plus size={15} /> New Meeting</button>
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

      {detailMeeting ? (
        <div className="card">
          <button onClick={() => setDetailMeeting(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4">← Back to list</button>
          <MeetingDetail
            meeting={meetings.find(m => m.id === detailMeeting.id) || detailMeeting}
            onEdit={openEdit}
          />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-200 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input-field pl-8 py-2 text-sm" placeholder="Search meetings…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="input-field w-auto py-2 text-sm" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              {MEETING_TYPES.filter(t => t !== 'Custom').map(t => <option key={t}>{t}</option>)}
            </select>
            <select className="input-field w-auto py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </select>
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="table-header">Meeting Title</th>
                <th className="table-header">Type</th>
                <th className="table-header">Standard</th>
                <th className="table-header">Date</th>
                <th className="table-header">Facilitator</th>
                <th className="table-header text-center">Actions</th>
                <th className="table-header">Status</th>
                <th className="table-header w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="table-cell text-center text-gray-400 py-12">No meetings found</td></tr>
              )}
              {filtered.map(m => {
                const sm = statusMeta[m.status] || statusMeta['draft'];
                const openActions = (m.actionItems || []).filter(a => a.status === 'open').length;
                return (
                  <tr key={m.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setDetailMeeting(m)}>
                    <td className="table-cell font-medium text-gray-900">{m.title}</td>
                    <td className="table-cell"><span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{m.type}</span></td>
                    <td className="table-cell text-gray-600 text-xs">{m.standard !== 'None' ? m.standard : '—'}</td>
                    <td className="table-cell text-gray-600 text-xs">{m.date || '—'}</td>
                    <td className="table-cell text-gray-600 text-xs">{m.facilitator || '—'}</td>
                    <td className="table-cell text-center">
                      {openActions > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{openActions} open</span>}
                    </td>
                    <td className="table-cell"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>{sm.label}</span></td>
                    <td className="table-cell" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            Showing {filtered.length} of {meetings.length} meetings
          </div>
        </div>
      )}

      <Modal isOpen={formModal} onClose={() => setFormModal(false)} title={editMeeting ? 'Edit Meeting' : 'New Meeting Summary'} size="xl">
        <MeetingForm initial={editMeeting || {}} onSave={handleSave} onCancel={() => setFormModal(false)} />
      </Modal>
    </div>
  );
};

export default MeetingSummaries;
