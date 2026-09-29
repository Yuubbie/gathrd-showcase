// supabase/functions/send-branch-invite/index.ts
// REAL email sending with Resend integration

import { createClient } from "npm:@supabase/supabase-js@2";

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

interface InviteRequest {
  email: string;
  parentChurchId: string;
  hierarchyLevel: 'district' | 'zone';
  inviterName: string;
  parentChurchName: string;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

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

    const { email, parentChurchId, hierarchyLevel, inviterName, parentChurchName } = await req.json() as InviteRequest;
    
    if (!email || !email.includes("@")) {
      return json({ error: "Valid email required" }, 400);
    }
    if (!parentChurchId || !hierarchyLevel) {
      return json({ error: "Parent church ID and hierarchy level required" }, 400);
    }

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

    // Verify inviter has permission
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role, full_name")
      .eq("id", user.id)
      .single();
    if (profileErr || !profile) return json({ error: `Profile error: ${profileErr?.message}` }, 403);
    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: `Role not allowed: ${profile.role}` }, 403);
    }

    // Verify parent church
    const { data: parentChurch, error: churchErr } = await supabaseAdmin
      .from("churches")
      .select("id, name, hierarchy_level")
      .eq("id", parentChurchId)
      .single();
    
    if (churchErr || !parentChurch) return json({ error: "Parent church not found" }, 404);
    if (parentChurch.hierarchy_level !== hierarchyLevel) {
      return json({ error: `Parent church is not a ${hierarchyLevel}` }, 400);
    }
    if (profile.church_id !== parentChurchId) {
      return json({ error: "You can only invite branches to your own district/zone" }, 403);
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Store invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("branch_invitations")
      .insert({
        email: email.toLowerCase(),
        token,
        parent_church_id: parentChurchId,
        invited_by: user.id,
        hierarchy_level: hierarchyLevel,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Invitation creation error:', inviteError);
      return json({ error: `Failed to create invitation: ${inviteError.message}` }, 400);
    }

    // SEND REAL EMAIL
    const signupUrl = `${Deno.env.get("FRONTEND_URL") || "https://gathrd.com.ng"}/branch-signup/${token}`;
    const emailSent = await sendInvitationEmail({
      to: email,
      inviterName: profile.full_name || inviterName,
      parentChurchName: parentChurchName || parentChurch.name,
      hierarchyLevel,
      signupUrl,
      expiresAt: new Date(expiresAt).toLocaleDateString(),
    });

    if (!emailSent) {
      // Don't fail the request, but log the warning
      console.warn('Email failed to send, but invitation created');
    }

    return json({ 
      success: true, 
      invitation: { id: invitation.id, email, token, expiresAt },
      message: `Invitation sent to ${email}. They can sign up at ${signupUrl}` 
    });

  } catch (err) {
    console.error('Send branch invite error:', err);
    return json({ error: `Unexpected: ${String(err)}` }, 500);
  }
});

async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  parentChurchName: string;
  hierarchyLevel: string;
  signupUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set - email not sent');
    return false;
  }

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <img src="https://gathrd.com.ng/logo-mark.png" alt="Gathrd" style="height: 60px; margin-bottom: 20px;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: 700;">You're Invited</h1>
        <p style="color: #d1d5db; margin-top: 8px; font-size: 16px;">To join ${params.parentChurchName} on Gathrd</p>
      </div>
      
      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 18px; color: #1f2937; margin-bottom: 16px;">Hello,</p>
        <p style="color: #4b5563; margin-bottom: 24px;">
          <strong>${params.inviterName}</strong> has invited you to set up a <strong>${params.hierarchyLevel}</strong> branch 
          under <strong>${params.parentChurchName}</strong> on Gathrd.
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${params.signupUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); 
                    color: #fbbf24; padding: 16px 32px; text-decoration: none; 
                    border-radius: 8px; font-weight: 600; font-size: 16px;">
            Set Up Your Branch
          </a>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>⏰ This invitation expires on ${params.expiresAt}.</strong><br>
            Please complete your setup before then.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © 2024 Gathrd. All rights reserved.<br>
          Church Management Platform for Nigerian Churches
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Gathrd <noreply@gathrd.com.ng>",
        to: params.to,
        subject: `You're invited to join ${params.parentChurchName} on Gathrd`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

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

    const { email, parentChurchId, hierarchyLevel, inviterName, parentChurchName } = await req.json() as InviteRequest;
    
    if (!email || !email.includes("@")) {
      return json({ error: "Valid email required" }, 400);
    }
    if (!parentChurchId || !hierarchyLevel) {
      return json({ error: "Parent church ID and hierarchy level required" }, 400);
    }

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

    // Verify inviter has permission
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("church_id, role, full_name")
      .eq("id", user.id)
      .single();
    if (profileErr || !profile) return json({ error: `Profile error: ${profileErr?.message}` }, 403);
    if (!["senior_pastor", "assistant_pastor", "church_admin"].includes(profile.role)) {
      return json({ error: `Role not allowed: ${profile.role}` }, 403);
    }

    // Verify parent church
    const { data: parentChurch, error: churchErr } = await supabaseAdmin
      .from("churches")
      .select("id, name, hierarchy_level")
      .eq("id", parentChurchId)
      .single();
    
    if (churchErr || !parentChurch) return json({ error: "Parent church not found" }, 404);
    if (parentChurch.hierarchy_level !== hierarchyLevel) {
      return json({ error: `Parent church is not a ${hierarchyLevel}` }, 400);
    }
    if (profile.church_id !== parentChurchId) {
      return json({ error: "You can only invite branches to your own district/zone" }, 403);
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Store invitation
    const { data: invitation, error: inviteError } = await supabaseAdmin
      .from("branch_invitations")
      .insert({
        email: email.toLowerCase(),
        token,
        parent_church_id: parentChurchId,
        invited_by: user.id,
        hierarchy_level: hierarchyLevel,
        expires_at: expiresAt,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Invitation creation error:', inviteError);
      return json({ error: `Failed to create invitation: ${inviteError.message}` }, 400);
    }

    // SEND REAL EMAIL
    const signupUrl = `${Deno.env.get("FRONTEND_URL") || "https://gathrd.com.ng"}/branch-signup/${token}`;
    const emailSent = await sendInvitationEmail({
      to: email,
      inviterName: profile.full_name || inviterName,
      parentChurchName: parentChurchName || parentChurch.name,
      hierarchyLevel,
      signupUrl,
      expiresAt: new Date(expiresAt).toLocaleDateString(),
    });

    if (!emailSent) {
      console.warn('Email failed to send, but invitation created');
    }

    return json({ 
      success: true, 
      invitation: { id: invitation.id, email, token, expiresAt },
      message: `Invitation sent to ${email}. They can sign up at ${signupUrl}` 
    });

  } catch (err) {
    console.error('Send branch invite error:', err);
    return json({ error: `Unexpected: ${String(err)}` }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface InviteRequest {
  email: string;
  parentChurchId: string;
  hierarchyLevel: 'district' | 'zone';
  inviterName: string;
  parentChurchName: string;
}