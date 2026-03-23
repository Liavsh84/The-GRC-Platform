import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, Info } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Provider Icons ───────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const MicrosoftIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.4 24H0V12.6h11.4V24z" fill="#F1511B"/>
    <path d="M24 24H12.6V12.6H24V24z" fill="#80CC28"/>
    <path d="M11.4 11.4H0V0h11.4v11.4z" fill="#00ADEF"/>
    <path d="M24 11.4H12.6V0H24v11.4z" fill="#FBBC09"/>
  </svg>
);

const SAMLIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="2" rx="1" fill="currentColor" opacity="0.4"/>
    <circle cx="12" cy="12" r="3" fill="currentColor"/>
    <path d="M12 3v4M12 17v4M3 12H7M17 12h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
  </svg>
);

// ─── SSO Button ───────────────────────────────────────────────────────────────
const SSOButton = ({ icon, label, onClick, loading, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium text-gray-700 shadow-sm"
  >
    {loading ? (
      <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
      </svg>
    ) : icon}
    {label}
  </button>
);

// ─── Login Page ───────────────────────────────────────────────────────────────
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState('');
  const [showSamlInfo, setShowSamlInfo] = useState(false);
  const { login, loginWithSSO, ssoAvailable } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const result = login(username, password);
    setLoading(false);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  const handleSSO = async (provider) => {
    setError('');
    setSsoLoading(provider);
    const result = await loginWithSSO(provider);
    setSsoLoading('');
    if (!result.success) setError(result.error);
    // On success, browser redirects to provider — nothing more to do here
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <img src="/grcx-logo.jpg" alt="GRCX" className="w-10 h-10 rounded-xl object-cover" />
          <span className="text-white font-bold text-xl">GRCX</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Governance · Risk · Compliance
            <br />
            <span className="text-blue-400">All in one place.</span>
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-8">
            The central hub for GRC professionals to manage policies, track risks, monitor compliance, and generate board-ready reports.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Governance', desc: 'Policies & procedures' },
              { label: 'Risk', desc: 'Register & heat maps' },
              { label: 'Compliance', desc: 'Gap analysis & tracking' },
            ].map(item => (
              <div key={item.label} className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-white font-semibold text-sm">{item.label}</p>
                <p className="text-slate-400 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-500 text-sm">© {new Date().getFullYear()} GRCX</p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md py-4">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src="/grcx-logo.jpg" alt="GRCX" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-bold text-gray-900 text-lg">GRCX</span>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-gray-500 mb-7">Sign in to your GRC workspace</p>

          {/* ─── SSO Buttons ─── */}
          <div className="space-y-2.5 mb-6">
            <SSOButton
              icon={<GoogleIcon />}
              label="Continue with Google"
              loading={ssoLoading === 'google'}
              disabled={!ssoAvailable || !!ssoLoading}
              onClick={() => handleSSO('google')}
            />
            <SSOButton
              icon={<MicrosoftIcon />}
              label="Continue with Microsoft"
              loading={ssoLoading === 'azure'}
              disabled={!ssoAvailable || !!ssoLoading}
              onClick={() => handleSSO('azure')}
            />

            {/* Enterprise SAML */}
            <button
              type="button"
              onClick={() => setShowSamlInfo(!showSamlInfo)}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-500"
            >
              <SAMLIcon />
              Enterprise SSO / SAML
              <Info size={14} className="ml-auto text-gray-400" />
            </button>

            {showSamlInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1.5">
                <p className="font-semibold text-blue-700">Enterprise SAML / Custom IdP</p>
                <p>SAML 2.0 integration (Okta, Azure AD, ADFS, etc.) is supported via Supabase Enterprise SSO.</p>
                <p>To enable it: upgrade your Supabase project to <span className="font-semibold">Pro plan</span>, then go to <span className="font-mono">Authentication → SSO Providers</span> and add your IdP metadata.</p>
                <p>No code changes required — the Google/Microsoft buttons above will also work after configuration.</p>
              </div>
            )}

            {!ssoAvailable && (
              <p className="text-xs text-center text-gray-400">
                SSO not configured — set <span className="font-mono">VITE_SUPABASE_URL</span> &amp; <span className="font-mono">VITE_SUPABASE_ANON_KEY</span> in Netlify and enable providers in your Supabase dashboard.
              </p>
            )}
          </div>

          {/* ─── Divider ─── */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">or sign in with username</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ─── Username/Password Form ─── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" className="input-field pl-9" placeholder="Enter your username"
                  value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type={showPw ? 'text' : 'password'} className="input-field pl-9 pr-10" placeholder="Enter your password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {loading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-blue-700">
              <p><span className="font-medium">Admin:</span> admin / admin123</p>
              <p><span className="font-medium">User:</span> jsmith / user123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
