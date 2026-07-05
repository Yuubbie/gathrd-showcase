const VARIANTS = {
  neutral: 'bg-ink/5 text-ink/60',
  signal: 'bg-signal-50 text-signal-deep',
  success: 'bg-sage-50 text-sage',
  warning: 'bg-amberflag/10 text-amberflag',
  danger: 'bg-rose-50 text-rose',
};

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}
