// "By continuing, you agree to our Terms and Privacy Policy". The pages open in a new tab,
// so nobody loses what they have already typed into the form.
export default function LegalAgreement({ className = '' }) {
  const link = 'text-signal font-semibold hover:text-signal-deep';
  return (
    <p className={`text-xs text-center text-ink/50 ${className}`}>
      By continuing, you agree to our{' '}
      <a href="/terms" target="_blank" rel="noopener noreferrer" className={link}>
        Terms
      </a>{' '}
      and{' '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className={link}>
        Privacy Policy
      </a>
      .
    </p>
  );
}
