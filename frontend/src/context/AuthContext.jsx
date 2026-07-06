import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null); // { id, role, church_id, full_name, ... }
  const [church, setChurch] = useState(null); // { id, name, ... }
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to load profile:', error.message);
      setProfile(null);
      setChurch(null);
      return;
    }

    setProfile(data);

    if (data?.church_id) {
      const { data: churchData } = await supabase
        .from('churches')
        .select('id, name')
        .eq('id', data.church_id)
        .single();
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
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setChurch(null);
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
    return supabase.auth.signOut();
  }

  const value = {
    session,
    profile,          // includes .role — one of the 8 church_role values
    church,           // { id, name } — the logged-in user's church
    loading,
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
