import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { initialUsers } from '../data/initialData';
import { dbLoad, dbSave, supabase } from '../lib/supabase';

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
  const [users, setUsers] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const initialized = useRef(false);

  // ─── Mount: load users + restore session ─────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const fallback = safeParseLocal('grc_users') ?? initialUsers;
      const loaded = await dbLoad('users', fallback);
      setUsers(loaded);

      // 1. Restore custom (username/password) session
      const stored = safeParseLocal('grc_current_user');
      if (stored) {
        setCurrentUser(stored);
      } else if (supabase) {
        // 2. Check for returning SSO session (user navigated back without logging out)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const email = session.user.email?.toLowerCase();
          const match = loaded.find(u => u.email?.toLowerCase() === email || u.id === session.user.id);
          if (match) {
            setCurrentUser(match);
            localStorage.setItem('grc_current_user', JSON.stringify(match));
          }
        }
      }

      setAuthLoading(false);
      initialized.current = true;
    };
    init();
  }, []);

  // ─── Sync users to Supabase + localStorage ────────────────────────────────
  useEffect(() => {
    if (!initialized.current || users === null) return;
    localStorage.setItem('grc_users', JSON.stringify(users));
    const t = setTimeout(() => dbSave('users', users), 500);
    return () => clearTimeout(t);
  }, [users]);

  // ─── Username / password login ────────────────────────────────────────────
  const login = (username, password) => {
    const user = (users ?? []).find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('grc_current_user', JSON.stringify(user));
      return { success: true };
    }
    return { success: false, error: 'Invalid username or password' };
  };

  // ─── SSO (OAuth) login — Google, Microsoft, etc. ──────────────────────────
  const loginWithSSO = async (provider) => {
    if (!supabase) {
      return { success: false, error: 'SSO is not configured. Please set your Supabase environment variables in Netlify.' };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { success: false, error: error.message };
    return { success: true }; // browser will redirect away
  };

  // ─── Called by AuthCallback after OAuth redirect ──────────────────────────
  const handleSSOCallback = async (session) => {
    const ssoUser = session.user;
    const email = ssoUser.email?.toLowerCase();

    // Use current users list (or load fresh if not ready)
    let userList = users;
    if (!userList) {
      const fallback = safeParseLocal('grc_users') ?? initialUsers;
      userList = await dbLoad('users', fallback);
      setUsers(userList);
      initialized.current = true;
    }

    // Find existing account by email or Supabase UID
    let user = userList.find(u => u.email?.toLowerCase() === email || u.id === ssoUser.id);

    if (!user) {
      // First-time SSO login — create account (role: user; admin can promote later)
      user = {
        id: ssoUser.id,
        username: email?.split('@')[0] || ssoUser.id,
        email: ssoUser.email,
        name: ssoUser.user_metadata?.full_name
           || ssoUser.user_metadata?.name
           || email?.split('@')[0]
           || 'SSO User',
        role: 'user',
        department: '',
        createdAt: new Date().toISOString().split('T')[0],
        ssoProvider: ssoUser.app_metadata?.provider || 'sso',
      };
      setUsers(prev => {
        const updated = [...(prev ?? []), user];
        dbSave('users', updated);
        return updated;
      });
    }

    setCurrentUser(user);
    localStorage.setItem('grc_current_user', JSON.stringify(user));
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('grc_current_user');
    supabase?.auth.signOut(); // clear SSO session if present
  };

  // ─── User management ──────────────────────────────────────────────────────
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
      login, loginWithSSO, handleSSOCallback,
      logout,
      addUser, updateUser, deleteUser,
      authLoading,
      ssoAvailable: !!supabase,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
