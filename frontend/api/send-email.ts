// api/send-email.ts
// Vercel Serverless Function to send emails via Resend

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html } = req.body;
    
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gathrd <onboarding@resend.dev>',
        to: [req.body.to],
        subject: req.body.subject,
        html: req.body.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend error:', response.status, error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email send error:', err);
    return res.status(500).json({ error: String(err) });
  }
}