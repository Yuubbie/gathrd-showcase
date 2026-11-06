// GATHRD — claim-account / church join
// One church link: new people sign up as members, existing roster
// emails get a login. Pastors raise roles later.

import { serve } from 'https://deno.land/std@0.203.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { slug, email, password, full_name } = await req.json();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(full_name || '').trim();

    if (!slug || !cleanEmail || !password) {
      return json({ error: 'A church link, email, and password are all required.' }, 400);
    }
    if (password.length < 8) {
      return json({ error: 'Password must be at least 8 characters.' }, 400);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: church, error: churchError } = await adminClient
      .from('churches')
      .select('id, name')
      .eq('onboarding_slug', slug)
      .is('deleted_at', null)
      .single();

    if (churchError || !church) {
      return json({ error: 'This link is not recognized. Please ask your church for the correct link.' }, 404);
    }

    const { data: members, error: memberError } = await adminClient
      .from('members')
      .select('id, full_name, profile_id, email')
      .eq('church_id', church.id)
      .is('deleted_at', null)
      .ilike('email', cleanEmail);

    if (memberError) {
      return json({ error: 'Could not look up this church roster. Please try again.' }, 500);
    }

    const existingMember = (members || []).find((m) => (m.email || '').trim().toLowerCase() === cleanEmail) || (members || [])[0] || null;

    if (existingMember?.profile_id) {
      return json({ error: 'This email already has a login. Log in instead, or use Forgot password.' }, 400);
    }

    const displayName = existingMember?.full_name || cleanName;
    if (!displayName) {
      return json({ error: 'Full name is required.' }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        role: 'member',
        church_id: church.id,
      },
    });

    if (createError) {
      const already = /already|registered|exists/i.test(createError.message || '');
      return json(
        {
          error: already
            ? 'This email already has a login. Log in instead, or use Forgot password.'
            : createError.message,
        },
        400
      );
    }

    const newUserId = created.user.id;

    const { data: attached, error: attachError } = await adminClient.rpc('attach_invited_profile', {
      p_user_id: newUserId,
      p_church_id: church.id,
      p_role: 'member',
      p_full_name: displayName,
    });

    if (attachError || attached?.ok === false) {
      return json({ error: 'Your login was created, but joining this church failed. Contact your church admin.' }, 500);
    }

    if (existingMember) {
      const { error: memberUpdateError } = await adminClient
        .from('members')
        .update({ profile_id: newUserId })
        .eq('id', existingMember.id);
      if (memberUpdateError) {
        return json({ error: 'Your login was created, but linking it to your member record failed. Contact your church admin.' }, 500);
      }
    } else {
      const { error: memberInsertError } = await adminClient
        .from('members')
        .insert({
          church_id: church.id,
          profile_id: newUserId,
          full_name: displayName,
          email: cleanEmail,
          status: 'active',
          source: 'self_onboarded',
          age_group: 'adult',
        });
      if (memberInsertError) {
        return json({ error: 'Your login was created, but adding you to the roster failed. Contact your church admin.' }, 500);
      }
    }

    return json({ success: true, church_name: church.name });
  } catch (err) {
    return json({ error: err.message ?? 'Unexpected error.' }, 500);
  }
});
