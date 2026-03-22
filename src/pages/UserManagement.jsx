import { useState } from 'react';
import { Plus, Edit2, Trash2, Users, Shield, User, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/common/Modal';

const DEPARTMENTS = ['IT Security', 'Risk Management', 'Compliance', 'IT', 'HR', 'Finance', 'Legal', 'Operations', 'Procurement'];
const ROLES = ['admin', 'user'];

const EMPTY_USER = { name: '', username: '', email: '', password: '', role: 'user', department: 'IT Security' };

const UserForm = ({ initial, onSave, onCancel, isEdit }) => {
  const [form, setForm] = useState({ ...EMPTY_USER, ...initial });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Full Name *</label>
          <input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="First and last name" />
        </div>
        <div>
          <label className="label">Username *</label>
          <input className="input-field" value={form.username} onChange={e => set('username', e.target.value)} required placeholder="login username" autoComplete="off" />
        </div>
        <div>
          <label className="label">Email</label>
          <input type="email" className="input-field" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
        </div>
        <div>
          <label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
          <input type="password" className="input-field" value={form.password} onChange={e => set('password', e.target.value)} required={!isEdit} placeholder="••••••••" autoComplete="new-password" />
        </div>
        <div>
          <label className="label">Role</label>
          <select className="input-field" value={form.role} onChange={e => set('role', e.target.value)}>
            {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">Department</label>
          <select className="input-field" value={form.department} onChange={e => set('department', e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Save Changes' : 'Create User'}</button>
      </div>
    </form>
  );
};

const UserManagement = () => {
  const { users, currentUser, addUser, updateUser, deleteUser } = useAuth();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.username.toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const openAdd = () => { setEditUser(null); setModalOpen(true); };
  const openEdit = (u) => { setEditUser(u); setModalOpen(true); };

  const handleSave = (data) => {
    if (editUser) {
      const updates = { ...data };
      if (!updates.password) delete updates.password;
      updateUser(editUser.id, updates);
    } else {
      addUser(data);
    }
    setModalOpen(false);
  };

  const handleDelete = (id) => {
    if (id === currentUser.id) { alert('You cannot delete your own account.'); return; }
    if (window.confirm('Delete this user?')) deleteUser(id);
  };

  const admins = users.filter(u => u.role === 'admin').length;
  const regularUsers = users.filter(u => u.role === 'user').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} users · {admins} admins · {regularUsers} regular users</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={15} /> Add User</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-blue-600">{users.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-purple-600">{admins}</p>
          <p className="text-sm text-gray-500 mt-1">Administrators</p>
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-green-600">{regularUsers}</p>
          <p className="text-sm text-gray-500 mt-1">Regular Users</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card py-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-9 py-2" placeholder="Search by name, username, or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-field w-auto py-2" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="table-header">User</th>
              <th className="table-header">Username</th>
              <th className="table-header">Email</th>
              <th className="table-header">Department</th>
              <th className="table-header w-24">Role</th>
              <th className="table-header w-28">Joined</th>
              <th className="table-header w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="table-cell text-center text-gray-400 py-12">No users found</td></tr>
            )}
            {filtered.map(u => {
              const initials = u.name.split(' ').map(n => n[0]).join('').toUpperCase();
              const isCurrentUser = u.id === currentUser.id;
              return (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-blue-50/50' : ''}`}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        {isCurrentUser && <p className="text-xs text-blue-600">You</p>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-sm text-gray-700">{u.username}</td>
                  <td className="table-cell text-gray-600">{u.email || '—'}</td>
                  <td className="table-cell text-gray-600">{u.department}</td>
                  <td className="table-cell">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </span>
                  </td>
                  <td className="table-cell text-gray-500 text-xs">{u.createdAt}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(u.id)} disabled={isCurrentUser} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          Showing {filtered.length} of {users.length} users
        </div>
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={18} className="text-purple-600" />
            <h3 className="font-semibold text-purple-900">Admin</h3>
          </div>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Full access to all GRC modules</li>
            <li>• Manage users and roles</li>
            <li>• Add and delete governance documents</li>
            <li>• Modify risk and compliance data</li>
          </ul>
        </div>
        <div className="card bg-gray-50 border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <User size={18} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">User</h3>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• View all GRC dashboards</li>
            <li>• Add and edit documents, risks, controls</li>
            <li>• Generate and export reports</li>
            <li>• No access to user management</li>
          </ul>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Edit User' : 'Add New User'}>
        <UserForm initial={editUser || {}} onSave={handleSave} onCancel={() => setModalOpen(false)} isEdit={!!editUser} />
      </Modal>
    </div>
  );
};

export default UserManagement;
