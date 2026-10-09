// frontend/api/send-email.ts
//
// Gathrd email sender.
//
// The browser only says WHICH email to send (the "type"). The subject, the HTML
// and every link are built here, on the server, from fixed templates. Nobody can
// use this endpoint to send their own text from the gathrd.com.ng domain.
//
// Supported types:
//   welcome        -> sent ONLY to the logged-in user's own email address
//   branch_invite  -> sent by a pastor/admin of a District or Zone church to a
//                     new branch pastor (body: { type, to, token })
//
// Every send is logged in public.email_send_log and limited per user per hour.

const RESEND_URL = 'https://api.resend.com/emails';

const HOURLY_LIMITS: Record<string, number> = {
  welcome: 3,
  branch_invite: 30,
};

const BRANCH_INVITE_ROLES = ['senior_pastor', 'assistant_pastor', 'church_admin'];
const BRANCH_INVITE_LEVELS = ['district', 'zone'];

function escapeHtml(value: unknown): string {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

async function getJson(url: string, headers: Record<string, string>): Promise<any> {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Supabase request failed (' + response.status + ')');
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Templates (fixed text; only escaped values are inserted)
// ---------------------------------------------------------------------------

function welcomeEmail(opts: { fullName: string; churchName: string; loginUrl: string }) {
  const safeName = escapeHtml(opts.fullName);
  const safeChurch = escapeHtml(opts.churchName);
  const year = new Date().getFullYear();

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
        <p style="color: #d1d5db; margin-top: 8px; font-size: 16px;">Your church management journey starts now</p>
      </div>

      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 18px; color: #1f2937; margin-bottom: 16px;">Hello ${safeName},</p>
        <p style="color: #4b5563; margin-bottom: 24px;">
          Welcome to Gathrd! Your church <strong>${safeChurch}</strong> is now set up and ready to go.
        </p>

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

  return { subject: 'Welcome to Gathrd, ' + opts.fullName + '!', html };
}

function branchInviteEmail(opts: {
  inviterName: string;
  parentChurchName: string;
  hierarchyLevel: string;
  signupUrl: string;
  expiresAt: string;
}) {
  const inviterName = escapeHtml(opts.inviterName);
  const parentChurchName = escapeHtml(opts.parentChurchName);
  const hierarchyLevel = escapeHtml(opts.hierarchyLevel);
  const expiresAt = escapeHtml(opts.expiresAt);
  const year = new Date().getFullYear();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: 700;">You're Invited</h1>
        <p style="color: #d1d5db; margin-top: 8px; font-size: 16px;">To join ${parentChurchName} on Gathrd</p>
      </div>

      <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 18px; color: #1f2937; margin-bottom: 16px;">Hello,</p>
        <p style="color: #4b5563; margin-bottom: 24px;">
          <strong>${inviterName}</strong> has invited you to set up a <strong>${hierarchyLevel}</strong> branch
          under <strong>${parentChurchName}</strong> on Gathrd.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${opts.signupUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                    color: #fbbf24; padding: 16px 32px; text-decoration: none;
                    border-radius: 8px; font-weight: 600; font-size: 16px;">
            Set Up Your Branch
          </a>
        </div>

        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>This invitation expires on ${expiresAt}.</strong><br>
            Please complete your setup before then.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          If you didn't expect this invitation, you can safely ignore this email.
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

  return {
    subject: "You're invited to join " + opts.parentChurchName + ' on Gathrd',
    html,
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');

  // Browser preflight (not normally needed for same-origin calls, harmless to allow)
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 1. Server configuration
  const resendKey = process.env.RESEND_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const fromAddress = process.env.RESEND_FROM || 'Gathrd <noreply@gathrd.com.ng>';
  const siteUrl = (process.env.SITE_URL || 'https://gathrd.com.ng').replace(/\/+$/, '');

  if (!resendKey || !supabaseUrl || !anonKey) {
    console.error('send-email: missing server configuration', {
      hasResendKey: Boolean(resendKey),
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(anonKey),
    });
    res.status(500).json({ error: 'Email service is not configured' });
    return;
  }

  // 2. Only logged-in Gathrd users may call this
  const authHeader: string = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const userResponse = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: anonKey },
    });
    if (!userResponse.ok) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
    const user: any = await userResponse.json();
    if (!user || !user.id || !user.email) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    // 3. Read the request body
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }
    }
    const type: string = body && typeof body.type === 'string' ? body.type : '';
    if (!Object.prototype.hasOwnProperty.call(HOURLY_LIMITS, type)) {
      res.status(400).json({ error: 'Unknown email type' });
      return;
    }

    // 4. Who is this user and which church do they belong to? (read with THEIR token,
    //    so row-level security applies and they can only see their own data)
    const restHeaders: Record<string, string> = {
      Authorization: 'Bearer ' + token,
      apikey: anonKey,
      Accept: 'application/json',
    };

    const profileRows = await getJson(
      supabaseUrl +
        '/rest/v1/profiles?id=eq.' + encodeURIComponent(user.id) +
        '&select=full_name,role,church_id&limit=1',
      restHeaders
    );
    const profile = Array.isArray(profileRows) ? profileRows[0] : null;
    if (!profile || !profile.church_id) {
      res.status(403).json({ error: 'Your account is not linked to a church yet' });
      return;
    }

    const churchRows = await getJson(
      supabaseUrl +
        '/rest/v1/churches?id=eq.' + encodeURIComponent(profile.church_id) +
        '&select=name,hierarchy_level&limit=1',
      restHeaders
    );
    const church = Array.isArray(churchRows) ? churchRows[0] : null;
    if (!church) {
      res.status(403).json({ error: 'Church not found' });
      return;
    }

    // 5. Build the email from a fixed template
    let recipient = '';
    let subject = '';
    let html = '';

    if (type === 'welcome') {
      // Always goes to the logged-in user's own address, whatever the browser sends.
      recipient = String(user.email);
      const built = welcomeEmail({
        fullName: profile.full_name || 'there',
        churchName: church.name || 'your church',
        loginUrl: siteUrl + '/login',
      });
      subject = built.subject;
      html = built.html;
    } else if (type === 'branch_invite') {
      if (BRANCH_INVITE_ROLES.indexOf(profile.role) === -1) {
        res.status(403).json({ error: 'Your role cannot send branch invitations' });
        return;
      }
      if (BRANCH_INVITE_LEVELS.indexOf(church.hierarchy_level) === -1) {
        res.status(403).json({ error: 'Branch invitations are only available to District and Zone churches' });
        return;
      }
      const to = body.to;
      const inviteToken = body.token;
      if (!isEmail(to)) {
        res.status(400).json({ error: 'A valid recipient email is required' });
        return;
      }
      if (typeof inviteToken !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(inviteToken)) {
        res.status(400).json({ error: 'A valid invitation token is required' });
        return;
      }
      recipient = to;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const built = branchInviteEmail({
        inviterName: profile.full_name || 'Pastor',
        parentChurchName: church.name || 'Your Church',
        hierarchyLevel: church.hierarchy_level,
        signupUrl: siteUrl + '/branch-signup/' + encodeURIComponent(inviteToken),
        expiresAt,
      });
      subject = built.subject;
      html = built.html;
    }

    // 6. Per-user hourly limit (fails closed: if we cannot check, we do not send)
    const limit = HOURLY_LIMITS[type];
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recent = await getJson(
      supabaseUrl +
        '/rest/v1/email_send_log?user_id=eq.' + encodeURIComponent(user.id) +
        '&kind=eq.' + encodeURIComponent(type) +
        '&created_at=gte.' + encodeURIComponent(since) +
        '&select=id&limit=' + (limit + 1),
      restHeaders
    );
    if (Array.isArray(recent) && recent.length >= limit) {
      res.status(429).json({ error: 'Too many emails sent recently. Please try again later.' });
      return;
    }

    const logResponse = await fetch(supabaseUrl + '/rest/v1/email_send_log', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        apikey: anonKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ user_id: user.id, kind: type, to_email: recipient }),
    });
    if (!logResponse.ok) {
      console.error('send-email: could not write email_send_log (' + logResponse.status + ')');
      res.status(500).json({ error: 'Could not record this email. Please try again.' });
      return;
    }

    // 7. Send through Resend
    const resendResponse = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + resendKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipient],
        subject,
        html,
      }),
    });

    const resendText = await resendResponse.text();
    let resendData: any = null;
    try {
      resendData = JSON.parse(resendText);
    } catch {
      resendData = null;
    }

    if (!resendResponse.ok) {
      console.error('send-email: Resend error ' + resendResponse.status + ': ' + resendText.slice(0, 500));
      res.status(502).json({
        error: 'Failed to send email',
        detail: (resendData && resendData.message) || 'Resend returned ' + resendResponse.status,
      });
      return;
    }

    res.status(200).json({ success: true, id: resendData && resendData.id });
  } catch (err) {
    console.error('send-email: unexpected error', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
}
