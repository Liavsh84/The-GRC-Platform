import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initialUsers } from '../data/initialData';
import { dbLoad, dbSave } from '../lib/supabase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

function safeParseLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(null);          // null = still loading
  const [authLoading, setAuthLoading] = useState(true);
  const initialized = useRef(false);

  // Load on mount
  useEffect(() => {
    const init = async () => {
      // Restore session (device-local; intentional)
      const stored = safeParseLocal('grc_current_user');
      if (stored) setCurrentUser(stored);

      // Load users from Supabase, fall back to localStorage, then defaults
      const fallback = safeParseLocal('grc_users') ?? initialUsers;
      const loaded = await dbLoad('users', fallback);
      setUsers(loaded);
      setAuthLoading(false);
      initialized.current = true;
    };
    init();
  }, []);

  // Sync users to Supabase + localStorage whenever they change
  useEffect(() => {
    if (!initialized.current || users === null) return;
    localStorage.setItem('grc_users', JSON.stringify(users));
    const t = setTimeout(() => dbSave('users', users), 500);
    return () => clearTimeout(t);
  }, [users]);

  const login = (username, password) => {
    const user = (users ?? []).find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('grc_current_user', JSON.stringify(user));
      return { success: true };
    }
    return { success: false, error: 'Invalid username or password' };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('grc_current_user');
  };

  const addUser = (userData) => {
    const newUser = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [...(prev ?? []), newUser]);
    return newUser;
  };

  const updateUser = (id, updates) => {
    setUsers(prev => (prev ?? []).map(u => u.id === id ? { ...u, ...updates } : u));
    if (currentUser?.id === id) {
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      localStorage.setItem('grc_current_user', JSON.stringify(updated));
    }
  };

  const deleteUser = (id) => {
    setUsers(prev => (prev ?? []).filter(u => u.id !== id));
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users: users ?? [],
      login, logout,
      addUser, updateUser, deleteUser,
      authLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
