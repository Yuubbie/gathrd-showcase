// supabase/functions/send-welcome-email/index.ts
//
// Sends the "Welcome to Gathrd" email the moment a new church pastor registers.
// A database trigger calls this right after the account is created, so it works even
// if the person closes the page, and even before they confirm their email address.
//
// Safe by design:
//  - only callable with the shared secret (x-cron-secret) that the database holds
//  - sends only to the email address on the account itself
//  - sends at most once per account (checked in email_send_log)
//  - a failure here never affects sign-up

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function welcomeEmail(opts: { fullName: string; churchName: string; loginUrl: string; needsConfirm: boolean }) {
  const safeName = escapeHtml(opts.fullName);
  const safeChurch = escapeHtml(opts.churchName);
  const year = new Date().getFullYear();

  const confirmBox = opts.needsConfirm
    ? `
        <div style="background: #ecfdf5; border: 1px solid #34d399; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            <strong>One last step: confirm your email.</strong><br>
            We sent a separate email with a button to confirm your address. Please open it and click the button
            before you log in. If you cannot find it, check your spam or promotions folder.
          </p>
        </div>`
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Gathrd!</h1>
        <p style="color: #d1d5db; margin-top: 8px; font-size: 16px;">Your church is registered</p>
      </div>

      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 18px; color: #1f2937; margin-bottom: 16px;">Hello ${safeName},</p>
        <p style="color: #4b5563; margin-bottom: 24px;">
          Thank you for registering. Your church <strong>${safeChurch}</strong> is now set up on Gathrd,
          and your 30-day free trial has started.
        </p>
        ${confirmBox}
        <div style="text-align: center; margin: 32px 0;">
          <a href="${opts.loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: #fbbf24; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Log In to Your Dashboard
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Next steps:</strong><br>
            &bull; Log in to your dashboard<br>
            &bull; Invite your team members<br>
            &bull; Add your congregation members<br>
            &bull; Set up giving and tithes
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          If you have any questions, reply to this email &mdash; we're here to help!
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          &copy; ${year} Gathrd. All rights reserved.<br>
          Church Management Platform for Nigerian Churches
        </p>
      </div>
    </body>
    </html>
  `;

  return { subject: `Welcome to Gathrd, ${opts.fullName}! Your church is registered`, html };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "Not authorized." }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.user_id === "string" ? body.user_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: "A valid user_id is required." }, 400);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "Email service is not configured." }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Send once per account.
    const { data: already } = await admin
      .from("email_send_log")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "welcome")
      .limit(1);
    if (already && already.length > 0) return json({ success: true, skipped: "already_sent" });

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(userId);
    const user = userRes?.user;
    if (userErr || !user?.email) return json({ error: "User not found." }, 404);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, role, church_id")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.church_id || profile.role !== "senior_pastor") {
      return json({ success: true, skipped: "not_a_church_pastor" });
    }
    const { data: church } = await admin.from("churches").select("name").eq("id", profile.church_id).maybeSingle();

    const siteUrl = (Deno.env.get("FRONTEND_URL") || "https://gathrd.com.ng").replace(/\/+$/, "");
    const built = welcomeEmail({
      fullName: profile.full_name || "there",
      churchName: church?.name || "your church",
      loginUrl: `${siteUrl}/login`,
      needsConfirm: !user.email_confirmed_at,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") || "Gathrd <noreply@gathrd.com.ng>",
        to: [user.email],
        subject: built.subject,
        html: built.html,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("welcome email: Resend error", res.status, text.slice(0, 300));
      // Detail is only ever shown to callers that hold the shared secret.
      return json({ error: "Could not send the email right now.", resend_status: res.status, resend_detail: text.slice(0, 300) }, 502);
    }

    await admin.from("email_send_log").insert({ user_id: userId, kind: "welcome", to_email: user.email });
    return json({ success: true });
  } catch (err) {
    console.error("send-welcome-email failed", String(err));
    return json({ error: "Something went wrong." }, 500);
  }
});
