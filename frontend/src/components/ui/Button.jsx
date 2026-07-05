export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center font-semibold transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-signal text-white hover:bg-signal-deep',
    secondary: 'bg-white text-ink border border-ink/10 hover:bg-parchment',
    ghost: 'text-signal hover:bg-signal-50',
    danger: 'bg-rose text-white hover:bg-rose/90',
    dark: 'bg-ink text-white hover:bg-void',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
    lg: 'text-base px-5 py-3',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}
