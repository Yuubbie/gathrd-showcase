// Remembers what Supabase put in the address bar when someone arrives from an email link
// (for example "#error=access_denied&error_code=otp_expired" or "#access_token=...&type=signup").
//
// The Supabase client removes that text from the address bar as soon as it has read it,
// so it has to be captured first. Import this module before anything else in main.jsx.
const raw = typeof window !== 'undefined' ? window.location.hash : '';
const params = new URLSearchParams(raw.startsWith('#') ? raw.slice(1) : raw);

export const emailLinkResult = {
  // The link was already used, or it has expired.
  failed: params.has('error') || params.has('error_code'),
  // The link confirmed a new account (the person is now signed in).
  confirmed: params.get('type') === 'signup' && params.has('access_token'),
  errorCode: params.get('error_code') || '',
};
