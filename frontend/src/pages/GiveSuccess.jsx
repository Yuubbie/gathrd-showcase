import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const CATEGORY_LABELS = {
  tithe: 'Tithe', offering: 'Offering', thanksgiving: 'Thanksgiving',
  building_project: 'Building / Project', welfare: 'Welfare',
};

export default function GiveSuccess() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!reference) return;

    let cancelled = false;

    async function poll() {
      const { data } = await supabase.rpc('get_giving_status_by_reference', { p_reference: reference });
      if (cancelled) return;

      if (data && data.length > 0) {
        setResult(data[0]);
        // Keep polling a few times if still "pending" — the webhook
        // sometimes arrives a second or two after the redirect.
        if (data[0].status === 'pending' && attempts < 8) {
          setTimeout(() => setAttempts((a) => a + 1), 1500);
        }
      }
    }
    poll();

    return () => { cancelled = true; };
  }, [reference, attempts]);

  if (!reference) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <p className="text-gray-500 text-sm">No payment reference found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm bg-white rounded-xl shadow-sm p-6 text-center space-y-3">
        {!result ? (
          <p className="text-gray-500 text-sm">Confirming your payment…</p>
        ) : result.status === 'success' ? (
          <>
            <p className="text-2xl">🎉</p>
            <h1 className="text-lg font-semibold">Thank you for giving!</h1>
            <p className="text-gray-600 text-sm">
              ₦{Number(result.amount).toLocaleString()} — {CATEGORY_LABELS[result.category]} to {result.church_name}
            </p>
          </>
        ) : result.status === 'pending' ? (
          <p className="text-gray-500 text-sm">Still confirming your payment — this can take a moment.</p>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Payment didn't go through</h1>
            <p className="text-gray-600 text-sm">Please try again, or use a different payment method.</p>
          </>
        )}
        <Link to="/" className="inline-block text-indigo-600 text-sm font-medium mt-2">Done</Link>
      </div>
    </div>
  );
}
