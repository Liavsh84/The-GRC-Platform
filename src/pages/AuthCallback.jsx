import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { handleSSOCallback } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = async () => {
      if (!supabase) {
        navigate('/login');
        return;
      }

      try {
        // Exchange the OAuth code for a session (PKCE flow)
        const code = new URLSearchParams(window.location.search).get('code');
        if (code) {
          const { error: exchErr } = await supabase.auth.exchangeCodeForSession(window.location.search);
          if (exchErr) throw exchErr;
        }

        // Retrieve the established session
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr || !session) throw sessErr || new Error('No session returned');

        // Sync into our user system
        await handleSSOCallback(session);
        navigate('/');
      } catch (err) {
        console.error('SSO callback error:', err);
        setError(err.message || 'SSO sign-in failed. Please try again.');
        setTimeout(() => navigate('/login'), 4000);
      }
    };

    handle();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">✕</span>
          </div>
          <p className="text-white text-lg font-semibold mb-2">Sign-in failed</p>
          <p className="text-slate-400 text-sm mb-1">{error}</p>
          <p className="text-slate-500 text-xs">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-xl font-semibold">Completing sign-in…</p>
        <p className="text-slate-400 text-sm mt-2">Please wait</p>
      </div>
    </div>
  );
};

export default AuthCallback;
