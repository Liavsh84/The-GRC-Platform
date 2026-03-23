import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, ChevronDown,
  Calendar, User, Circle, CircleDot, CheckCircle2,
  Download, Flag, Briefcase,
} from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';
import { exportToCSV } from '../utils/exportUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const PROJECT_TYPES = [
  { value: 'certification',       label: 'Certification Audit' },
  { value: 'risk-assessment',     label: 'Risk Assessment' },
  { value: 'policy-review',       label: 'Policy Review' },
  { value: 'compliance-gap',      label: 'Compliance Gap Analysis' },
  { value: 'security-assessment', label: 'Security Assessment' },
  { value: 'remediation',         label: 'Remediation' },
  { value: 'training',            label: 'Training Program' },
  { value: 'custom',              label: 'Custom' },
];

const TYPE_COLORS = {
  'certification':        'bg-blue-100 text-blue-700',
  'risk-assessment':      'bg-orange-100 text-orange-700',
  'policy-review':        'bg-purple-100 text-purple-700',
  'compliance-gap':       'bg-green-100 text-green-700',
  'security-assessment':  'bg-red-100 text-red-700',
  'remediation':          'bg-yellow-100 text-yellow-700',
  'training':             'bg-indigo-100 text-indigo-700',
  'custom':               'bg-gray-100 text-gray-600',
};

const STATUS_OPTIONS = ['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'];
const STATUS_COLORS  = {
  'planning':    'bg-gray-100 text-gray-600',
  'in-progress': 'bg-blue-100 text-blue-700',
  'on-hold':     'bg-yellow-100 text-yellow-700',
  'completed':   'bg-green-100 text-green-700',
  'cancelled':   'bg-red-100 text-red-600',
};
const STATUS_LABELS  = {
  'planning':    'Planning',
  'in-progress': 'In Progress',
  'on-hold':     'On Hold',
  'completed':   'Completed',
  'cancelled':   'Cancelled',
};

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const PRIORITY_COLORS  = {
  critical: 'bg-red-500 text-white',
  high:     'bg-orange-500 text-white',
  medium:   'bg-yellow-400 text-yellow-900',
  low:      'bg-green-500 text-white',
};

const EMPTY_PROJECT = {
  title: '', type: 'certification', description: '', status: 'planning',
  priority: 'medium', owner: '', team: '', startDate: '', dueDate: '',
  completedDate: '', tags: '', notes: '',
};

const getProgress = (project) => {
  const tasks = project.tasks || [];
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
};

const checkOverdue = (project) => {
  const today = new Date().toISOString().split('T')[0];
  return !!(project.dueDate && project.dueDate < today &&
    project.status !== 'completed' && project.status !== 'cancelled');
};

// ─── Project Detail (shown in modal) ─────────────────────────────────────────
const ProjectDetail = ({ project, onUpdate, onEdit, onClose }) => {
  const [editingId, setEditingId]  = useState(null);
  const [editForm,  setEditForm]   = useState({});
  const [showAdd,   setShowAdd]    = useState(false);
  const [newTask,   setNewTask]    = useState({ title: '', assignee: '', dueDate: '' });

  const tasks    = project.tasks || [];
  const progress = getProgress(project);
  const done     = tasks.filter(t => t.status === 'done').length;
  const today    = new Date().toISOString().split('T')[0];
  const overdue  = checkOverdue(project);

  const NEXT_STATUS = { open: 'in-progress', 'in-progress': 'done', done: 'open' };
  const STATUS_ICON = {
    open:         <Circle size={16} className="text-gray-300" />,
    'in-progress':<CircleDot size={16} className="text-blue-500" />,
    done:         <CheckCircle2 size={16} className="text-green-500" />,
  };

  const cycleStatus = (task) => {
    onUpdate({ tasks: tasks.map(t => t.id === task.id ? { ...t, status: NEXT_STATUS[t.status] || 'open' } : t) });
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditForm({ title: task.title, assignee: task.assignee || '', dueDate: task.dueDate || '' });
  };

  const saveEdit = () => {
    if (!editForm.title.trim()) return;
    onUpdate({ tasks: tasks.map(t => t.id === editingId ? { ...t, ...editForm } : t) });
    setEditingId(null);
  };

  const deleteTask = (id) => {
    if (!window.confirm('Delete this task?')) return;
    onUpdate({ tasks: tasks.filter(t => t.id !== id) });
  };

  const addTask = () => {
    if (!newTask.title.trim()) return;
    onUpdate({ tasks: [...tasks, { ...newTask, id: Date.now().toString(), status: 'open' }] });
    setNewTask({ title: '', assignee: '', dueDate: '' });
    setShowAdd(false);
  };

  const tagsArr = project.tags
    ? (typeof project.tags === 'string' ? project.tags.split(',').map(t => t.trim()).filter(Boolean) : project.tags)
    : [];

  return (
    <div className="space-y-5">
      {/* Info + Progress */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: metadata */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-gray-500 font-medium">Type: </span>
              <span className="text-gray-800">{PROJECT_TYPES.find(t => t.value === project.type)?.label || project.type}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Priority: </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLORS[project.priority] || 'bg-gray-100'}`}>
                {project.priority}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-gray-500 font-medium">Status: </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Owner: </span>
              <span className="text-gray-800">{project.owner || '—'}</span>
            </div>
            {project.team && (
              <div className="col-span-2">
                <span className="text-gray-500 font-medium">Team: </span>
                <span className="text-gray-800">{project.team}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 font-medium">Start: </span>
              <span>{project.startDate || '—'}</span>
            </div>
            <div>
              <span className={`font-medium ${overdue ? 'text-red-500' : 'text-gray-500'}`}>Due: </span>
              <span className={overdue ? 'text-red-500 font-semibold' : ''}>{project.dueDate || '—'}</span>
              {overdue && <span className="text-red-500 ml-1 text-xs font-bold">OVERDUE</span>}
            </div>
            {project.completedDate && (
              <div className="col-span-2">
                <span className="text-gray-500 font-medium">Completed: </span>
                <span className="text-green-600 font-semibold">{project.completedDate}</span>
              </div>
            )}
          </div>
          {tagsArr.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {tagsArr.map(tag => (
                <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* Right: progress */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Progress</span>
              <span className="text-3xl font-bold text-gray-900">{progress}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100 ? 'bg-green-500' : progress >= 60 ? 'bg-blue-500' : 'bg-blue-300'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium mb-2">{done}/{tasks.length} tasks completed</p>
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Circle size={11} className="text-gray-400" />{tasks.filter(t => t.status === 'open').length} open</span>
              <span className="flex items-center gap-1"><CircleDot size={11} className="text-blue-500" />{tasks.filter(t => t.status === 'in-progress').length} in progress</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" />{done} done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Notes */}
      {project.notes && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Notes</p>
          <p className="text-sm text-amber-700 leading-relaxed">{project.notes}</p>
        </div>
      )}

      {/* ── Tasks ── */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-800">Tasks <span className="text-gray-400 font-normal">({tasks.length})</span></p>
          {!showAdd && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
              <Plus size={13} /> Add Task
            </button>
          )}
        </div>

        <div className="space-y-0.5">
          {tasks.length === 0 && !showAdd && (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks yet — add tasks to track project progress.</p>
            </div>
          )}

          {tasks.map(task => {
            const taskOverdue = task.dueDate && task.dueDate < today && task.status !== 'done';
            return editingId === task.id ? (
              <div key={task.id} className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-xl border border-blue-200">
                <CircleDot size={15} className="text-blue-400 flex-shrink-0" />
                <input className="input-field text-sm py-1 flex-1" value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Task title *" autoFocus />
                <input className="input-field text-sm py-1 w-28" value={editForm.assignee}
                  onChange={e => setEditForm(p => ({ ...p, assignee: e.target.value }))} placeholder="Assignee" />
                <input type="date" className="input-field text-sm py-1 w-36" value={editForm.dueDate}
                  onChange={e => setEditForm(p => ({ ...p, dueDate: e.target.value }))} />
                <button onClick={saveEdit} disabled={!editForm.title.trim()} className="btn-primary text-xs py-1.5 px-3">Save</button>
                <button onClick={() => setEditingId(null)} className="btn-secondary text-xs py-1.5 px-2"><X size={12} /></button>
              </div>
            ) : (
              <div key={task.id}
                className={`flex items-center gap-3 py-2 px-3 rounded-xl group hover:bg-gray-50 transition-colors
                  ${task.status === 'done' ? 'opacity-60' : ''}`}>
                <button onClick={() => cycleStatus(task)}
                  className="flex-shrink-0 hover:scale-110 transition-transform" title="Click to change status">
                  {STATUS_ICON[task.status] || STATUS_ICON.open}
                </button>
                <span className={`text-sm flex-1 leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.title}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {task.assignee && <span className="text-xs text-gray-400 hidden sm:block">{task.assignee}</span>}
                  {task.dueDate && (
                    <span className={`text-xs ${taskOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                      {task.dueDate}{taskOverdue ? ' ⚠' : ''}
                    </span>
                  )}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(task)} className="p-1 rounded hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={11} /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={11} /></button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add task form */}
          {showAdd && (
            <div className="flex items-center gap-2 py-2 px-3 bg-green-50 rounded-xl border border-green-200 mt-2">
              <Plus size={14} className="text-green-500 flex-shrink-0" />
              <input className="input-field text-sm py-1 flex-1" value={newTask.title}
                onChange={e => setNewTask(p => ({ ...p, title: e.target.value }))}
                placeholder="Task title *" autoFocus
                onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setShowAdd(false); }} />
              <input className="input-field text-sm py-1 w-28" value={newTask.assignee}
                onChange={e => setNewTask(p => ({ ...p, assignee: e.target.value }))} placeholder="Assignee" />
              <input type="date" className="input-field text-sm py-1 w-36" value={newTask.dueDate}
                onChange={e => setNewTask(p => ({ ...p, dueDate: e.target.value }))} />
              <button onClick={addTask} disabled={!newTask.title.trim()} className="btn-primary text-xs py-1.5 px-3">Add</button>
              <button onClick={() => { setShowAdd(false); setNewTask({ title: '', assignee: '', dueDate: '' }); }}
                className="btn-secondary text-xs py-1.5 px-2"><X size={12} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center border-t border-gray-100 pt-4">
        <button onClick={onEdit} className="btn-secondary">Edit Project Details</button>
        <button onClick={onClose} className="btn-primary">Close</button>
      </div>
    </div>
  );
};

// ─── Project Form ─────────────────────────────────────────────────────────────
const ProjectForm = ({ initial, onSave, onCancel }) => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    ...EMPTY_PROJECT,
    owner: currentUser?.name || '',
    ...initial,
    tags: Array.isArray(initial?.tags) ? initial.tags.join(', ') : (initial?.tags || ''),
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Project Title *</label>
          <input className="input-field" value={form.title} onChange={e => set('title', e.target.value)}
            required placeholder="e.g. ISO 27001 Certification Preparation" />
        </div>
        <div>
          <label className="label">Type *</label>
          <select className="input-field" value={form.type} onChange={e => set('type', e.target.value)}>
            {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input-field" value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Owner</label>
          <input className="input-field" value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="Project owner" />
        </div>
        <div>
          <label className="label">Team Members</label>
          <input className="input-field" value={form.team} onChange={e => set('team', e.target.value)} placeholder="Comma-separated names" />
        </div>
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input-field" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input-field" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
        {form.status === 'completed' && (
          <div className="col-span-2">
            <label className="label">Completion Date</label>
            <input type="date" className="input-field" value={form.completedDate} onChange={e => set('completedDate', e.target.value)} />
          </div>
        )}
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Scope, objectives, and background of the project" />
        </div>
        <div className="col-span-2">
          <label className="label">Tags (comma-separated)</label>
          <input className="input-field" value={form.tags} onChange={e => set('tags', e.target.value)}
            placeholder="e.g. ISO27001, Security, Compliance" />
        </div>
        <div className="col-span-2">
          <label className="label">Notes</label>
          <textarea className="input-field resize-none" rows={2} value={form.notes}
            onChange={e => set('notes', e.target.value)} placeholder="Any additional context or decisions" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">Save Project</button>
      </div>
    </form>
  );
};

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard = ({ project, onClick, onEdit, onDelete }) => {
  const progress  = getProgress(project);
  const overdue   = checkOverdue(project);
  const tasks     = project.tasks || [];
  const done      = tasks.filter(t => t.status === 'done').length;
  const typeDef   = PROJECT_TYPES.find(t => t.value === project.type);

  return (
    <div className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col"
      onClick={onClick}>
      {/* Badges row */}
      <div className="flex items-start justify-between mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${PRIORITY_COLORS[project.priority] || 'bg-gray-500 text-white'}`}>
            {project.priority}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[project.type] || 'bg-gray-100 text-gray-600'}`}>
            {typeDef?.label || project.type}
          </span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(project)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={13} /></button>
          <button onClick={() => onDelete(project.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Status */}
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mb-2.5 self-start ${STATUS_COLORS[project.status]}`}>
        {STATUS_LABELS[project.status]}
      </span>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 flex-1">{project.title}</h3>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      <div className="mb-3 mt-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs font-bold text-gray-600">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              progress === 100 ? 'bg-green-500' : progress >= 60 ? 'bg-blue-500' : 'bg-blue-300'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2.5 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <User size={11} />
          <span className="truncate max-w-[90px]">{project.owner || '—'}</span>
        </div>
        <div className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : ''}`}>
          <Calendar size={11} />
          <span>{project.dueDate || '—'}</span>
          {overdue && <span className="text-red-500 font-bold ml-0.5">!</span>}
        </div>
      </div>
      {tasks.length > 0 && (
        <div className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
          <CheckCircle2 size={11} className="text-green-500" />
          {done}/{tasks.length} tasks done
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Projects = () => {
  const { projects, addProject, updateProject, deleteProject } = useData();
  const [filterTab,   setFilterTab]   = useState('all');
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('all');
  const [showExport,  setShowExport]  = useState(false);
  const [formOpen,    setFormOpen]    = useState(false);
  const [editProj,    setEditProj]    = useState(null);
  const [detailProj,  setDetailProj]  = useState(null);

  const total      = projects.length;
  const inProgress = projects.filter(p => p.status === 'in-progress').length;
  const completed  = projects.filter(p => p.status === 'completed').length;
  const overdue    = projects.filter(p => checkOverdue(p)).length;

  const filtered = useMemo(() => projects.filter(p => {
    if (filterTab !== 'all' && p.status !== filterTab) return false;
    if (filterType !== 'all' && p.type !== filterType) return false;
    const q = search.toLowerCase();
    if (q && !p.title.toLowerCase().includes(q) && !(p.owner || '').toLowerCase().includes(q) &&
        !(p.description || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => {
    // Critical first, then high, then by due date
    const po = { critical: 0, high: 1, medium: 2, low: 3 };
    if (po[a.priority] !== po[b.priority]) return (po[a.priority] ?? 4) - (po[b.priority] ?? 4);
    return (a.dueDate || '9999').localeCompare(b.dueDate || '9999');
  }), [projects, filterTab, filterType, search]);

  const openAdd   = ()      => { setEditProj(null);  setFormOpen(true); };
  const openEdit  = (proj)  => { setEditProj(proj);  setFormOpen(true); };

  const handleSave = (data) => {
    if (editProj) {
      updateProject(editProj.id, data);
    } else {
      addProject({ ...data, tasks: [] });
    }
    setFormOpen(false);
    setEditProj(null);
  };

  const handleDelete = (id) => {
    const p = projects.find(pr => pr.id === id);
    if (!window.confirm(`Delete "${p?.title}"?\nThis cannot be undone.`)) return;
    deleteProject(id);
    if (detailProj?.id === id) setDetailProj(null);
  };

  const liveDetail = detailProj ? projects.find(p => p.id === detailProj.id) : null;

  const TABS = [
    { key: 'all',         label: 'All',        count: total },
    { key: 'planning',    label: 'Planning',   count: projects.filter(p => p.status === 'planning').length },
    { key: 'in-progress', label: 'In Progress',count: inProgress },
    { key: 'on-hold',     label: 'On Hold',    count: projects.filter(p => p.status === 'on-hold').length },
    { key: 'completed',   label: 'Completed',  count: completed },
    { key: 'cancelled',   label: 'Cancelled',  count: projects.filter(p => p.status === 'cancelled').length },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} project{total !== 1 ? 's' : ''} · manage GRC initiatives from A–Z</p>
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
                    exportToCSV(filtered.map(p => ({
                      Title:    p.title,
                      Type:     PROJECT_TYPES.find(t => t.value === p.type)?.label || p.type,
                      Status:   STATUS_LABELS[p.status],
                      Priority: p.priority,
                      Owner:    p.owner,
                      DueDate:  p.dueDate,
                      Progress: `${getProgress(p)}%`,
                      Tasks:    `${(p.tasks || []).filter(t => t.status === 'done').length}/${(p.tasks || []).length}`,
                    })), 'projects');
                    setShowExport(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
              </div>
            )}
          </div>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',       value: total,      icon: Briefcase,    color: 'bg-blue-600',    tab: 'all' },
          { label: 'In Progress', value: inProgress, icon: CircleDot,    color: 'bg-blue-500',    tab: 'in-progress' },
          { label: 'Completed',   value: completed,  icon: CheckCircle2, color: 'bg-green-600',   tab: 'completed' },
          { label: 'Overdue',     value: overdue,    icon: Flag,         color: overdue > 0 ? 'bg-red-500' : 'bg-gray-400', tab: 'all', alert: overdue > 0 },
        ].map(({ label, value, icon: Icon, color, tab, alert }) => (
          <div key={label}
            className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setFilterTab(tab)}>
            <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={19} className="text-white" />
            </div>
            <div>
              <p className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Type filter */}
      <div className="card py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9 py-2" placeholder="Search by title, owner, or description…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto py-2" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {PROJECT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilterTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filterTab === tab.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
              ${filterTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Project grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Briefcase size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium text-lg">No projects found</p>
          <p className="text-gray-400 text-sm mt-1">
            {projects.length === 0 ? 'Create your first project to get started.' : 'Try adjusting your filters.'}
          </p>
          {projects.length === 0 && (
            <button onClick={openAdd} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus size={14} /> New Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => setDetailProj(p)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); setEditProj(null); }}
        title={editProj ? 'Edit Project' : 'New Project'} size="lg">
        <ProjectForm
          initial={editProj || {}}
          onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditProj(null); }}
        />
      </Modal>

      {/* Detail modal */}
      <Modal isOpen={!!liveDetail} onClose={() => setDetailProj(null)}
        title={liveDetail?.title || ''} size="xl">
        {liveDetail && (
          <ProjectDetail
            project={liveDetail}
            onUpdate={(updates) => updateProject(liveDetail.id, updates)}
            onEdit={() => { setDetailProj(null); openEdit(liveDetail); }}
            onClose={() => setDetailProj(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Projects;
