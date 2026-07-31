// ============================================================
// GATHRD — invite-staff Edge Function
// Lets a pastor/admin invite other staff (any role except
// senior_pastor) to their own church. Deliberately does NOT
// modify handle_new_user() — that trigger already correctly sets
// full_name and role from signup metadata (see 0001_init_core_schema.sql),
// it just never sets church_id for anyone, self-signup or invited.
// This function creates the user, lets the existing trigger do its
// normal job, then sets church_id afterward with the one privilege
// level that can safely do it.
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

    if (role === 'senior_pastor') {
      return new Response(
        JSON.stringify({ error: 'Cannot invite another Senior Pastor through this form.' }),
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

    if (!callerProfile.church_id) {
      return new Response(
        JSON.stringify({ error: 'Your account is not linked to a church yet.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin client — service role, bypasses RLS. Only used from here on,
    // for the two operations that genuinely require elevated privilege:
    // creating the auth user, and setting church_id afterward.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
      redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://gathrd-xi.vercel.app'}/login`,
    });

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = inviteData.user.id;

    // handle_new_user() has already fired by this point and created a
    // profiles row with the right full_name/role but no church_id — this
    // is the one field this function exists to set, deliberately kept
    // separate from the shared trigger every signup (invited or not)
    // runs through.
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ church_id: callerProfile.church_id })
      .eq('id', newUserId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Invite was sent, but linking them to your church failed. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, invited_email: email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unexpected error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
