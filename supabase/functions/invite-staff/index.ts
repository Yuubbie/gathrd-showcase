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

    const allowedInviterRoles = ['senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher', 'media_team'];
    if (!allowedInviterRoles.includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to invite staff.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerProfile.role === 'childrens_teacher' && role !== 'childrens_teacher') {
      return new Response(
        JSON.stringify({ error: 'Children\'s teachers can only invite other teachers.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerProfile.role === 'media_team' && role !== 'media_team') {
      return new Response(
        JSON.stringify({ error: 'Media team can only invite other media team members.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = [
      'senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin',
      'department_head', 'cell_leader', 'childrens_teacher', 'media_team', 'member',
    ];
    if (!allowedRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'That role is not allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (role === 'senior_pastor' && callerProfile.role !== 'senior_pastor') {
      return new Response(
        JSON.stringify({ error: 'Only a Senior Pastor can invite another Senior Pastor.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!callerProfile.church_id) {
      return new Response(
        JSON.stringify({ error: 'Your account is not linked to a church yet.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    async function findAuthUserByEmail(lookupEmail: string) {
      const normalized = String(lookupEmail || '').trim().toLowerCase();
      if (!normalized) return null;

      const res = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?email=${encodeURIComponent(normalized)}`,
        {
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          },
        }
      );
      if (res.ok) {
        const body = await res.json();
        const users = body.users || [];
        const match = users.find((u) => String(u.email || '').toLowerCase() === normalized);
        if (match) return match;
      }

      let page = 1;
      while (page <= 10) {
        const { data } = await adminClient.auth.admin.listUsers({ page, perPage: 200 });
        const users = data?.users || [];
        const match = users.find((u) => String(u.email || '').toLowerCase() === normalized);
        if (match) return match;
        if (users.length < 200) break;
        page += 1;
      }
      return null;
    }

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role, church_id: callerProfile.church_id },
      redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://gathrd.com.ng'}/set-password`,
    });

    async function linkMemberRow(userId: string) {
      const normalizedEmail = String(email || '').trim();
      const normalizedName = String(full_name || '').trim();
      let existingMember = null;

      if (normalizedEmail) {
        const { data } = await adminClient
          .from('members')
          .select('id, profile_id, email')
          .eq('church_id', callerProfile.church_id)
          .ilike('email', normalizedEmail)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingMember = data;
      }

      if (!existingMember && normalizedName) {
        const { data } = await adminClient
          .from('members')
          .select('id, profile_id, email')
          .eq('church_id', callerProfile.church_id)
          .ilike('full_name', normalizedName)
          .is('profile_id', null)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        existingMember = data;
      }

      if (existingMember) {
        const patch: Record<string, string> = {};
        if (!existingMember.profile_id) patch.profile_id = userId;
        if (!existingMember.email && normalizedEmail) patch.email = normalizedEmail;
        if (Object.keys(patch).length > 0) {
          await adminClient.from('members').update(patch).eq('id', existingMember.id);
        }
        return;
      }

      await adminClient.from('members').insert({
        church_id: callerProfile.church_id,
        profile_id: userId,
        full_name: normalizedName || full_name,
        email: normalizedEmail || email,
        status: 'active',
        source: 'admin_added',
      });
    }

    async function attachToChurch(userId: string) {
      const { data, error } = await adminClient.rpc('attach_invited_profile', {
        p_user_id: userId,
        p_church_id: callerProfile.church_id,
        p_role: role,
        p_full_name: full_name,
      });
      const rpcOk = !error && (data === true || data?.ok === true || data?.ok === 'true');
      if (!rpcOk) {
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .maybeSingle();

        let fallbackError = error?.message || (data && data.error) || null;
        if (existingProfile) {
          const { error: updateError } = await adminClient
            .from('profiles')
            .update({ church_id: callerProfile.church_id, role, full_name })
            .eq('id', userId);
          if (updateError) fallbackError = updateError.message;
          else fallbackError = null;
        } else {
          const { error: insertError } = await adminClient
            .from('profiles')
            .insert({
              id: userId,
              church_id: callerProfile.church_id,
              role,
              full_name: full_name || 'New User',
            });
          if (insertError) fallbackError = insertError.message;
          else fallbackError = null;
        }
        if (fallbackError) return { ok: false, error: fallbackError };
      }
      await linkMemberRow(userId);
      return { ok: true };
    }

    if (inviteError) {
      const alreadyExists = inviteError.message?.toLowerCase().includes('already') ||
        inviteError.code === 'email_exists';

      if (alreadyExists) {
        const existingUser = await findAuthUserByEmail(email);

        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: 'This email already has an account, but we could not find it to link to your church.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const attached = await attachToChurch(existingUser.id);
        if (!attached.ok) {
          return new Response(
            JSON.stringify({ error: 'This person already has an account, but linking them to your church failed. Contact support.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: resendError } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://gathrd.com.ng'}/set-password`,
        });

        if (resendError) {
          return new Response(
            JSON.stringify({ error: `This person already has an account, and resending access failed: ${resendError.message}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            resent: true,
            invited_email: email,
            message: 'They already had an account. We linked them to this church and sent a fresh login link.',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = inviteData.user.id;
    const attached = await attachToChurch(newUserId);
    if (!attached.ok) {
      return new Response(
        JSON.stringify({ error: 'Invite was sent, but linking them to your church failed. Contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        invited_email: email,
        message: `Invite sent to ${email}. They open the email, set a password, and join this church.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message ?? 'Unexpected error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
