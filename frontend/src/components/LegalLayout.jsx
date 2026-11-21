import { Link } from 'react-router-dom';
import { CONTACT_EMAIL } from '../lib/contact';

// Kept as an export so the Privacy and Terms pages can keep importing it from here.
export { CONTACT_EMAIL };

export function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function List({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function LegalLayout({ title, updated, intro, children }) {
  return (
    <div className="min-h-screen bg-parchment">
      <header className="bg-signal-gradient px-4 py-4 md:px-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="" className="h-8 w-8" />
            <span className="font-display font-bold text-white text-lg">Gathrd</span>
          </Link>
          <Link to="/signup" className="text-sm font-semibold text-white/80 hover:text-white">
            Start free trial
          </Link>
        </div>
      </header>

      <main className="px-4 py-8 md:py-12 md:px-10">
        <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5 md:p-10 space-y-7 text-ink/80 leading-relaxed">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-ink">{title}</h1>
            <p className="text-sm text-ink/50">Last updated: {updated}</p>
            {intro && <p className="text-ink/70">{intro}</p>}
          </div>

          {children}

          <p className="text-sm text-ink/50 border-t border-ink/10 pt-5">
            Questions? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-signal font-semibold hover:text-signal-deep">
              {CONTACT_EMAIL}
            </a>
            . See also our{' '}
            <Link to="/privacy" className="text-signal font-semibold hover:text-signal-deep">
              Privacy Policy
            </Link>{' '}
            and{' '}
            <Link to="/terms" className="text-signal font-semibold hover:text-signal-deep">
              Terms of Service
            </Link>
            .
          </p>
        </article>
      </main>
    </div>
  );
}
