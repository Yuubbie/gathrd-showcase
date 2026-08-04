// ============================================================
// GATHRD — claim-account Edge Function
// Lets someone already on a church's member roster (added via QR
// self-registration or manual admin entry, neither of which
// creates a login) set up a login for themselves — and, critically,
// LINKS that new login to their existing members row via profile_id,
// which is what member_read_own_giving and member_read_own_attendance
// actually key off. Without this link, a member could log in and
// still see nothing, even with real giving/attendance history
// recorded under their roster entry.
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
    const { slug, email, password } = await req.json();

    if (!slug || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'A church link, email, and password are all required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 8 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Public, unauthenticated function — no caller JWT to check here, since
    // the whole point is someone with no account yet is calling this.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolve the church from the slug — same defensive pattern as
    // get_church_giving_info_by_slug and get_church_attendance_info_by_slug:
    // never trust a client-supplied church_id directly.
    const { data: church, error: churchError } = await adminClient
      .from('churches')
      .select('id')
      .eq('onboarding_slug', slug)
      .is('deleted_at', null)
      .single();

    if (churchError || !church) {
      return new Response(
        JSON.stringify({ error: 'This link isn\u2019t recognized. Please ask your church for the correct link.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find their existing roster entry by email, scoped to this church.
    const { data: member, error: memberError } = await adminClient
      .from('members')
      .select('id, full_name, profile_id')
      .eq('church_id', church.id)
      .eq('email', email)
      .is('deleted_at', null)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ error: 'We couldn\u2019t find a member record with that email at this church. Check the email you registered with, or ask your church admin to add you first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (member.profile_id) {
      return new Response(
        JSON.stringify({ error: 'This member already has a login. Try logging in instead, or use "Forgot password" if needed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the login account directly with the password they chose —
    // unlike invite-staff, this isn't an email-invite flow, so no separate
    // "set your password" step is needed; they're setting it right now.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: member.full_name, role: 'member' },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = created.user.id;

    // Same two-step pattern as invite-staff: the handle_new_user() trigger
    // has already created a profiles row with the right full_name/role but
    // no church_id. Set that here, AND — the piece unique to this flow —
    // link their EXISTING members row to this new login via profile_id.
    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update({ church_id: church.id })
      .eq('id', newUserId);

    const { error: memberUpdateError } = await adminClient
      .from('members')
      .update({ profile_id: newUserId })
      .eq('id', member.id);

    if (profileUpdateError || memberUpdateError) {
      return new Response(
        JSON.stringify({ error: 'Your login was created, but linking it to your member record failed. Contact your church admin.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unexpected error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
