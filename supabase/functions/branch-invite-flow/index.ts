// supabase/functions/branch-invite-flow/index.ts
// Complete branch invitation flow - handles invite creation and branch creation
// This is a self-contained function that handles the entire flow

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const { action, email, parentChurchId, hierarchyLevel, token } = await req.json();
    
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return json({ error: `Auth failed: ${userErr?.message}` }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "create_invitation") {
      const { email, hierarchyLevel } = await req.json();
      if (!email || !email.includes("@")) {
        return json({ error: "Valid email required" }, 400);
      }
      if (!parentChurchId || !hierarchyLevel) {
        return json({ error: "Parent church ID and hierarchy level required" }, 400);
      }

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("church_id, role")
        .eq("id", user.id)
        .single();
      
      if (!profile || !["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
        return json({ error: "Not authorized" }, 403);
      }

      if (profile.church_id !== parentChurchId) {
        return json({ error: "Not authorized for this district/zone" }, 403);
      }

      const { data: parentChurch } = await supabaseAdmin
        .from("churches")
        .select("id, name, hierarchy_level")
        .eq("id", parentChurchId)
        .single();
      
      if (!parentChurch || parentChurch.hierarchy_level !== hierarchyLevel) {
        return json({ error: "Invalid parent church" }, 400);
      }

      const token = crypto.randomUUID().replace(/-/g, '');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: invitation, error } = await supabaseAdmin
        .from("branch_invitations")
        .insert({
          email: email.toLowerCase(),
          token,
          parent_church_id: parentChurchId,
          invited_by: user.id,
          hierarchy_level: hierarchyLevel,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 400);

      return json({ 
        success: true, 
        invitation: { id: invitation.id, email, token, expiresAt: invitation.expires_at },
        message: `Invitation created. Share the signup link with the branch pastor.`
      });

    } else if (action === "create_branch") {
      if (!token) return json({ error: "Token required" }, 400);

      const { data: invitation, error: invError } = await supabaseAdmin
        .from("branch_invitations")
        .select("*")
        .eq("token", token)
        .single();

      if (invError || !invitation) {
        return json({ error: "Invalid or expired invitation token" }, 400);
      }

      if (invitation.status !== 'pending') {
        return json({ error: "Invitation already used or expired" }, 400);
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await supabaseAdmin
          .from("branch_invitations")
          .update({ status: 'expired' })
          .eq("token", token);
        return json({ error: "Invitation has expired" }, 400);
      }

      const branchName = `Branch - ${invitation.email.split('@')[0]}`;
      const { data: newBranch, error: createError } = await supabaseAdmin
        .from("churches")
        .insert({
          name: `Branch - ${invitation.email.split('@')[0]}`,
          parent_church_id: invitation.parent_church_id,
          hierarchy_level: 'branch',
          plan: 'regular',
          subscription_status: 'trialing',
          terminology: invitation.hierarchy_level === 'zone' ? 'Zone' : 'District',
          max_members: 200,
        })
        .select()
        .single();

      if (createError) {
        return json({ error: `Failed to create branch: ${createError.message}` }, 400);
      }

      await supabaseAdmin
        .from("branch_invitations")
        .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: user.id })
        .eq("token", token);

      await supabaseAdmin.from("billing_events").insert({
        church_id: invitation.parent_church_id,
        event_type: 'branch_created',
        description: `Branch created: ${branchName}`,
        metadata: { branch_id: newBranch.id, email: invitation.email },
      });

      return json({ 
        success: true, 
        branch: newBranch,
        message: `Branch created successfully! The branch pastor can now sign up.`
      });

    } else {
      return json({ error: "Invalid action" }, 400);
    }
  } catch (err) {
    return json({ error: `Unexpected: ${String(err)}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

import { createClient } from "npm:@supabase/supabase-js@2";