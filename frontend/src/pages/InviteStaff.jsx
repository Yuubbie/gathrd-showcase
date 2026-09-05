// ============================================================
// GATHRD — invite-staff Edge Function
// Lets a pastor/admin invite other staff to their own church.
// Any of the 3 inviter-eligible roles can invite any staff role,
// EXCEPT senior_pastor — granting Senior Pastor privilege is
// restricted to an existing Senior Pastor only, so a Church Admin
// or Assistant Pastor can't invite their way up to the top role.
// Deliberately does NOT modify handle_new_user() — that trigger
// already correctly sets full_name and role from signup metadata
// (see 0001_init_core_schema.sql), it just never sets church_id
// for anyone, self-signup or invited. This function creates the
// user, lets the existing trigger do its normal job, then sets
// church_id afterward with the one privilege level that can
// safely do it.
// ============================================================

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, full_name, role } = await req.json();

    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: 'email, full_name, and role are all required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client scoped to the CALLER's own JWT — respects RLS. Used only to
    // confirm who's asking and that they're actually allowed to invite,
    // never for the privileged parts below.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerProfile, error: profileError } = await callerClient
      .from('profiles')
      .select('role, church_id')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify your account.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedInviterRoles = ['senior_pastor', 'assistant_pastor', 'church_admin'];
    if (!allowedInviterRoles.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to invite staff.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // A church can now have more than one Senior Pastor — but only an
    // existing Senior Pastor can grant that privilege to someone else.
    // An Assistant Pastor or Church Admin inviting a new Senior Pastor
    // would effectively be inviting their own


@'
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ROLE_OPTIONS = [
  ['senior_pastor', 'Senior Pastor'],
  ['assistant_pastor', 'Assistant Pastor'],
  ['church_admin', 'Church Admin'],
  ['finance_admin', 'Finance Admin'],
  ['department_head', 'Department Head'],
  ['cell_leader', 'Cell Leader'],
  ['childrens_teacher', "Children's Teacher"],
  ['member', 'Member'],
];

export default function InviteStaff() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('church_admin');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    const { data: { session } } = await supabase.auth.getSession();

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-staff`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ email, full_name: fullName, role }),
        }
      );
      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: result.error || 'Something went wrong.' });
      } else {
        // FIX: prefer the server's own message when it sends one — this is
        // what distinguishes "fresh invite sent" from "they already had an
        // account, sent a new access link instead," which are genuinely
        // different outcomes and shouldn't look identical to the pastor.
        setMessage({
          type: 'success',
          text: result.message || `Invite sent to ${email}. They'll get an email to set up their login.`,
        });
        setEmail('');
        setFullName('');
        setRole('church_admin');
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not reach the server. Check your connection and try again.' });
    }

    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-lg mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Invite Staff</h1>
          <p className="text-ink/50 text-sm mt-1">
            Add pastors, admins, cell leaders, and other staff to your church. They'll get an email to set their own password — no need to share a login.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 space-y-4">
          {message && (
            <div className={`text-sm rounded-lg p-3 ${message.type === 'success' ? 'bg-sage-50 text-sage' : 'bg-rose-50 text-rose'}`}>
              {message.text}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink/80 mb-1.5">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
            >
              {ROLE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? 'Sending invite…' : 'Send Invite'}
          </button>
        </form>
      </div>
    </div>
  );
}
