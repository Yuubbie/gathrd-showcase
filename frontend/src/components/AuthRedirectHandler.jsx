import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { emailLinkResult } from '../lib/authHash';

// People arrive from the confirmation email on the home page with the result tucked into
// the address ("#error=..." or "#access_token=..."). Send them to a page that explains
// what happened instead of leaving them on the marketing page with no message.
export default function AuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== '/') return;
    if (emailLinkResult.failed) {
      navigate('/check-email', { replace: true, state: { reason: 'expired' } });
    } else if (emailLinkResult.confirmed) {
      navigate('/email-confirmed', { replace: true });
    }
    // Only on the first load; later visits to "/" are ordinary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
