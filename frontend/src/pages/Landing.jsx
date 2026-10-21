import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Sparkles, Wallet, ClipboardCheck,
  Megaphone, UsersRound, ListChecks, Check, ArrowRight, Play,
  Bell, Settings, Smartphone, CalendarDays, Phone,
} from 'lucide-react';
import PlanComparison from '../components/PlanComparison';
import WhatsAppButton from '../components/WhatsAppButton';
import { PLANS, TRIAL_DAYS, formatNaira } from '../lib/plans';

const FEATURES = [
  { icon: Users, title: 'Member Management', desc: 'Members, departments, cell groups, and role-based access for your leaders and workers.' },
  { icon: ClipboardCheck, title: 'Attendance Tracking', desc: 'A fresh QR code and 6-digit code every Sunday, plus manual usher entry.' },
  { icon: Wallet, title: 'Giving & Tithes', desc: 'Accept donations via Paystack with full transaction records and counting sheets.' },
  { icon: Megaphone, title: 'Announcements', desc: 'Send announcements that reach every member in the app.' },
  { icon: UsersRound, title: 'Cell Groups', desc: 'Manage cell groups, track attendance, and submit weekly reports.' },
  { icon: ListChecks, title: 'Follow-Up Dashboard', desc: 'Never miss a visitor or struggling member again.' },
  { icon: UserPlus, title: 'Visitor Management', desc: 'Track every visitor from first visit to membership.' },
  { icon: Sparkles, title: 'Discipleship Tracking', desc: 'Track spiritual journeys and celebrate milestones.' },
  { icon: CalendarDays, title: 'Church Calendar', desc: 'Events that repeat weekly or monthly, with reminders in the app.' },
  { icon: Settings, title: 'Church Branding', desc: 'Custom logo and brand colors throughout the app.' },
  { icon: Smartphone, title: 'Installs Like an App', desc: 'Add Gathrd to any phone home screen. No app store needed.' },
  { icon: Bell, title: 'Duty Roster', desc: 'An order of service for every Sunday, with duties and reminders for your workers.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-parchment">
      {/* Navigation */}
      <nav className="bg-signal-gradient px-4 py-4 md:px-10 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-8 w-8" />
            <span className="font-display font-bold text-white text-xl">Gathrd</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            <a 
              href="https://wa.me/2348128821338?text=Hello%20Gathrd%2C%20I%20would%20like%20to%20request%20an%20onboarding%20walkthrough%20for%20our%20church."
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Phone size={13} className="text-gold" />
              <span>Onboarding: 0810 013 3673</span>
            </a>
            <Link to="/demo" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Explore Walkthrough
            </Link>
            <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="bg-gold hover:bg-gold-light text-ink font-semibold text-sm px-4 py-2 rounded-lg transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 pt-14 pb-16 md:px-10 md:pt-20 md:pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-signal/10 text-signal px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <Sparkles size={14} /> Modern Church Management Software
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold text-ink tracking-tight">
            Structure your church, keep your members close.
          </h1>
          <p className="text-ink/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            From Sunday check-in codes and duty rosters to member care and discipleship tracking—everything your church workforce needs in one secure app.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/signup" className="w-full sm:w-auto bg-signal hover:bg-signal-deep text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
              Start {TRIAL_DAYS}-Day Free Trial <ArrowRight size={18} />
            </Link>
            <Link to="/demo" className="w-full sm:w-auto bg-white border border-ink/10 text-ink font-semibold px-6 py-3.5 rounded-xl hover:bg-ink/5 transition-colors flex items-center justify-center gap-2">
              <Play size={16} /> Explore Grace Chapel Walkthrough
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-16 md:px-10 bg-white border-y border-ink/5">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-display text-3xl font-bold text-ink">Built for the Way Nigerian Churches Work</h2>
            <p className="text-ink/60 text-sm md:text-base max-w-xl mx-auto">
              Simple, mobile-first tools built specifically for church administrators, pastors, and unit leaders.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-parchment/60 rounded-2xl p-6 border border-ink/5 space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-signal/10 text-signal flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-display font-bold text-lg text-ink">{f.title}</h3>
                  <p className="text-ink/60 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <h2 className="font-display text-3xl font-bold text-ink">Simple, Transparent Pricing</h2>
            <p className="text-ink/60 text-sm md:text-base max-w-xl mx-auto">
              All plans include complete church management tools. Upgrade anytime as your congregation expands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-ink/10 p-6 flex flex-col justify-between shadow-sm">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-display font-bold text-xl text-ink">{p.name}</h3>
                    <p className="text-ink/50 text-xs mt-1">{p.desc}</p>
                  </div>
                  <div className="pt-2">
                    <span className="font-display text-3xl font-bold text-ink">{formatNaira(p.price)}</span>
                    <span className="text-ink/50 text-xs ml-1">/ month</span>
                  </div>
                  <ul className="space-y-2 text-sm text-ink/70 pt-4 border-t border-ink/5">
                    {p.features.map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check size={16} className="text-signal shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/signup" className="mt-6 text-center text-sm bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2.5 rounded-lg transition-colors">
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>

          <p className="text-ink/50 text-sm text-center mt-6 max-w-2xl mx-auto">
            District and Zone plans cover every branch under them on one invoice. Branches never pay separately.
          </p>

          <h3 className="font-display text-xl font-bold text-ink text-center mt-14 mb-4">Compare plans</h3>
          <PlanComparison />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-4xl mx-auto bg-signal-gradient rounded-2xl p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white">Ready to Transform Your Church Management?</h2>
          <p className="text-white/70 mt-2 max-w-xl mx-auto">
            Be among the first Nigerian churches to simplify their administration with Gathrd.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-ink font-semibold px-6 py-3 rounded-lg mt-6 transition-colors">
            Start Your Free Trial <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-signal-gradient px-4 py-12 md:px-10 text-white/80">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-white/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img src="/logo-mark.png" alt="Gathrd" className="h-6 w-6" />
                <span className="font-display font-bold text-white text-lg">Gathrd</span>
              </div>
              <p className="text-white/60 text-xs leading-relaxed max-w-xs">
                Church management software built for Nigerian ministries. Simplify workforce, attendance, giving, and follow-up.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-white">Church Onboarding & Setup</p>
              <p className="text-xs text-white/60">Assistance for Abuja & Nationwide branches:</p>
              <a 
                href="https://wa.me/2348128821338?text=Hello%20Gathrd%2C%20I%20would%20like%20to%20request%20a%20church%20onboarding%20session." 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gold font-medium text-xs hover:underline flex items-center gap-1.5"
              >
                <Phone size={14} /> +234 810 013 3673
              </a>
              <p className="text-[11px] text-white/50">WhatsApp & Direct Calls available for onboarding support.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-white">Platform Navigation</p>
              <div className="flex flex-col space-y-1 text-xs">
                <Link to="/demo" className="text-white/60 hover:text-white">Grace Chapel Walkthrough</Link>
                <Link to="/login" className="text-white/60 hover:text-white">Staff Sign In</Link>
                <Link to="/signup" className="text-white/60 hover:text-white">Church Sign Up</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between text-xs text-white/50 gap-4">
            <p>© 2026 Gathrd. All rights reserved.</p>
            <p>Made with dedication for ministries across Nigeria.</p>
          </div>
        </div>
      </footer>

      {/* Official Floating WhatsApp Support */}
      <WhatsAppButton message="Hello Gathrd, I'd like to know more about the platform." />
    </div>
  );
}