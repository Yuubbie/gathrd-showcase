const RESEND_URL = 'https://api.resend.com/emails';

function isEmail(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

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

  if (!resendKey || !supabaseUrl || !anonKey) {
    console.error('send-email: missing server configuration', {
      hasResendKey: Boolean(resendKey),
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(anonKey),
    });
    res.status(500).json({ error: 'Email service is not configured' });
    return;
  }

  // 2. Only logged-in Gathrd users may send email
  const authHeader: string = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!userResponse.ok) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }
  } catch (err) {
    console.error('send-email: could not verify session', err);
    res.status(500).json({ error: 'Could not verify session' });
    return;
  }

  // 3. Validate the request body
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }
  }

  const { to, subject, html } = body || {};

  if (!isEmail(to)) {
    res.status(400).json({ error: 'A valid recipient email is required' });
    return;
  }
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 200) {
    res.status(400).json({ error: 'A subject (max 200 characters) is required' });
    return;
  }
  if (typeof html !== 'string' || !html.trim() || html.length > 200000) {
    res.status(400).json({ error: 'Email HTML content is required' });
    return;
  }

  // 4. Send through Resend
  try {
    const resendResponse = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject: subject.trim(),
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
      console.error(
        `send-email: Resend error ${resendResponse.status}: ${resendText.slice(0, 500)}`
      );
      res.status(502).json({
        error: 'Failed to send email',
        detail: (resendData && resendData.message) || `Resend returned ${resendResponse.status}`,
      });
      return;
    }

    res.status(200).json({ success: true, id: resendData && resendData.id });
  } catch (err) {
    console.error('send-email: unexpected error', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
}