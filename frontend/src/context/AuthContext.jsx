import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { removePushSubscription } from '../lib/push';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, role, church_id, full_name, ... }
  const [church, setChurch] = useState(null); // { id, name, ... }
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // FIX: surfaced instead of silent null state

  // FIX: guards against overlapping loadProfile() calls. Without this, rapidly
  // switching sessions (or a token silently failing to refresh mid-request)
  // can let an OLDER call's response land after a NEWER session is already
  // active — at which point Supabase attaches the CURRENT session's token to
  // that stale in-flight request, RLS correctly rejects it (id no longer
  // matches auth.uid()), and the resulting 406 gets misread as "this profile
  // failed to load" when really it's just a leftover request answering under
  // the wrong identity.
  const requestIdRef = useRef(0);

  async function loadProfile(userId, retrying = false) {
    const thisRequestId = ++requestIdRef.current;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // A newer call has since started — this response is stale, drop it.
    if (requestIdRef.current !== thisRequestId) return;

    if (error) {
      // FIX: a single 406/"no rows" here often means the access token was
      // mid-refresh when this request fired (see 0002_rls_policies.sql —
      // both read policies depend on auth.uid() resolving correctly). Rather
      // than immediately treating that as "no profile," confirm whether the
      // session actually died. If it's still alive, retry once after a short
      // delay instead of silently blanking the app.
      if (!retrying) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (requestIdRef.current !== thisRequestId) return;
        if (currentSession?.user?.id === userId) {
          setTimeout(() => loadProfile(userId, true), 800);
          return;
        }
      }

      console.error('Failed to load profile:', error.message);
      setProfile(null);
      setChurch(null);
      // FIX: previously nothing told the UI this was a real failure versus
      // "user genuinely has no profile yet." Now ProtectedRoute (or any page)
      // can check authError to show "session expired, please log in again"
      // instead of a dashboard that's just permanently blank with no
      // explanation.
      setAuthError('Failed to load your account. Please try logging in again.');
      return;
    }

    setAuthError(null);
    setProfile(data);

    if (data?.church_id) {
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .select('id, name, brand_color, logo_url, hierarchy_level, terminology, max_members, plan, subscription_status')
        .eq('id', data.church_id)
        .single();
      if (requestIdRef.current !== thisRequestId) return;
      if (churchError) {
        console.error('Failed to load church:', churchError.message);
      }
      setChurch(churchData || null);
    } else {
      setChurch(null);
    }
  }

  useEffect(() => {
    // Get current session on first load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) await loadProfile(session.user.id);
      setLoading(false);
    });

    // Listen for login/logout/token refresh
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          // FIX: bump the request id even on sign-out, so any profile fetch
          // still in flight from the previous session is discarded instead
          // of landing afterward and repopulating profile/church for a user
          // who just logged out.
          requestIdRef.current++;
          setProfile(null);
          setChurch(null);
          setAuthError(null);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp({ email, password, fullName, churchName, role }) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, church_name: churchName, role }, // picked up by handle_new_user() trigger
      },
    });
  }

  async function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await removePushSubscription(); // needs the session, so run before sign-out
    return supabase.auth.signOut();
  }

  // Apply brand color as CSS variable
  useEffect(() => {
    if (church?.brand_color) {
      document.documentElement.style.setProperty('--brand-color', church.brand_color);
    }
  }, [church?.brand_color]);

  const value = {
    session,
    profile,          // includes .role — church_role value
    church,           // { id, name, brand_color, logo_url } — the logged-in user's church
    loading,
    authError,        // FIX: new — null when fine, a message when the session/profile genuinely failed
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
