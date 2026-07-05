export default function Card({ className = '', children, ...props }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
