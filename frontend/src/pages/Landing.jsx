import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  QrCode,
  CalendarDays,
  Smartphone,
  Wallet,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  Building2,
  ChevronDown,
  Church,
  BarChart3,
  Flame,
  FileSpreadsheet,
  Megaphone,
  ListChecks,
} from 'lucide-react';
import WhatsAppButton from '../components/WhatsAppButton';
import InstallPrompt from '../components/InstallPrompt';

const FEATURES = [
  {
    icon: Users,
    title: 'Member Management',
    desc: 'Members, departments, cell groups, and role-based access for your leaders and workers.',
  },
  {
    icon: QrCode,
    title: 'Attendance Tracking',
    desc: 'A fresh QR code and 6-digit code every Sunday, plus manual usher entry.',
  },
  {
    icon: Wallet,
    title: 'Giving & Tithes',
    desc: 'Direct bank transfer recording, giving history logs, and Sunday cash counting sheets.',
  },
  {
    icon: Megaphone,
    title: 'Announcements',
    desc: 'Send announcements that reach every member in the app.',
  },
  {
    icon: Layers,
    title: 'Cell Groups',
    desc: 'Manage cell groups, track attendance, and submit weekly reports.',
  },
  {
    icon: ListChecks,
    title: 'Follow-Up Dashboard',
    desc: '30-day first-timer pipeline, seasonal touchpoints, and absentee watch with zero SMS fees.',
  },
  {
    icon: Users,
    title: 'Visitor Management',
    desc: 'Track every visitor from first visit to membership.',
  },
  {
    icon: Sparkles,
    title: 'Discipleship Tracking',
    desc: 'Track spiritual journeys and celebrate milestones.',
  },
  {
    icon: CalendarDays,
    title: 'Church Calendar',
    desc: 'Events that repeat weekly or monthly, with reminders in the app.',
  },
  {
    icon: Church,
    title: 'Church Branding',
    desc: 'Custom logo and brand colors throughout the app.',
  },
  {
    icon: Smartphone,
    title: 'Installs Like an App',
    desc: 'Add Gathrd to any phone home screen. No app store needed.',
  },
  {
    icon: CalendarDays,
    title: 'Duty Roster',
    desc: 'An order of service for every Sunday, with duties and reminders for your workers.',
  },
];

const PRICING_PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    subtitle: 'For small churches getting organised',
    price: '₦3,500',
    period: '/ month',
    highlight: false,
    cta: 'Start Free Trial',
    features: [
      'Up to 200 members',
      'Members registry',
      'Attendance (PIN and QR)',
      'Visitor registry',
      'Bank giving logs',
      'Announcements',
      'Milestones',
      'Your church branding',
      'WhatsApp & Email support',
    ],
  },
  {
    key: 'regular',
    name: 'Regular',
    subtitle: 'For growing churches that follow up and disciple',
    price: '₦7,500',
    period: '/ month',
    highlight: true,
    popular: true,
    cta: 'Start Free Trial',
    features: [
      'Up to 1,000 members',
      'Everything in Starter',
      '30-Day Follow-Up Pipeline',
      'Seasonal Message Templates',
      'Cell groups',
      'Discipleship tracker',
      'Sunday cash counting sheets',
      'Giving history and reports',
      'Priority support',
    ],
  },
  {
    key: 'district',
    name: 'District',
    subtitle: 'For districts that oversee several branches',
    price: '₦15,000',
    period: '/ month',
    highlight: false,
    cta: 'Start Free Trial',
    features: [
      'Up to 2,000 members across district & branches',
      'Everything in Regular',
      'Branch invitations',
      'District oversight dashboard',
      'Attendance cross-reports',
      'CSV export',
      'All branches on one subscription',
      'Dedicated support',
    ],
  },
];

const FAQS = [
  {
    q: 'How does the 30-day free trial work?',
    a: 'Every new church gets 30 days of full access to all features on any plan, at no charge. You do not enter card details to start. If you choose not to subscribe after 30 days, your data remains safe, but access is paused until you choose a plan.',
  },
  {
    q: "Does it work on members' phones?",
    a: 'Yes. Gathrd installs on any phone directly from the browser — both Android and iPhone — with no app store download required. It uses very little data and works well even on modest connections.',
  },
  {
    q: 'How does Sunday check-in work?',
    a: 'Each Sunday, Gathrd generates a fresh PIN code and QR code for your service. Ushers can display the code on a screen or print it, and members check in on their phones. Ushers can also mark attendance manually for anyone without a smartphone.',
  },
  {
    q: 'How does the 30-Day Follow-Up pipeline work?',
    a: 'When first-time visitors are logged, Gathrd schedules 4 strategic touchpoints (Day 1 Welcome, Day 3 Midweek, Day 7 Next Sunday, and Day 30 Believers Class). Workers can tap WhatsApp or SMS to send pre-filled messages directly from their phone with zero third-party gateway bills.',
  },
  {
    q: 'Can our leaders have different access levels?',
    a: 'Yes. Gathrd supports role-based access for Senior Pastors, Assistant Pastors, Church Admins, Finance Admins, Cell Leaders, and Children\'s Teachers. Each person only sees what they need to see.',
  },
  {
    q: 'What is a District plan?',
    a: 'If your ministry has multiple locations or you oversee several branches, the District plan allows you to manage headquarters and send invitations to branches. You get an oversight dashboard that shows attendance and health across all branches, while each branch manages its own day-to-day work.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, you can upgrade or downgrade at any time from your church settings. If you upgrade, the change is effective immediately.',
  },
  {
    q: 'Is our church data secure?',
    a: 'All data is encrypted in transit and at rest. Each church\'s data is completely isolated. We do not sell or share your data.',
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-parchment font-body text-ink antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-parchment/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-8 w-8" />
            <span className="font-display text-xl font-bold text-ink">Gathrd</span>
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              to="/demo"
              className="text-sm font-medium text-ink/70 hover:text-ink transition-colors"
            >
              Watch Demo
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-ink/70 hover:text-ink transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-signal-deep transition-colors"
            >
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <h1 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Church Management Built for Nigerian Churches
              </h1>
              <p className="text-lg text-ink/70 sm:text-xl">
                Run Sunday check-in, duty rosters, giving logs, visitor follow-up, and discipleship
                from one simple dashboard, designed for how churches in Nigeria work.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3 text-base font-bold text-ink shadow-sm hover:bg-gold-light transition-colors"
                >
                  Start 30-Day Free Trial
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/20 bg-white px-6 py-3 text-base font-semibold text-ink hover:bg-ink/5 transition-colors"
                >
                  <ArrowRight size={16} /> Watch Demo
                </Link>
              </div>
              <p className="text-xs text-ink/50">No credit card required · Cancel anytime</p>
            </div>

            {/* Hero Mock Card */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="rounded-2xl border border-ink/10 bg-signal-gradient p-6 text-white shadow-xl">
                <div className="space-y-4">
                  <div className="rounded-xl bg-white p-4 text-ink">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-parchment p-2 text-gold">
                          <Users size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Active Members</p>
                          <p className="text-xs text-ink/50">Sample church</p>
                        </div>
                      </div>
                      <p className="font-display text-2xl font-bold">247</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 text-ink">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-parchment p-2 text-emerald-600">
                          <Wallet size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Verified Collections</p>
                          <p className="text-xs text-ink/50">Via Counting Sheets</p>
                        </div>
                      </div>
                      <p className="font-display text-2xl font-bold">₦1.2M</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-4 text-ink">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-parchment p-2 text-signal">
                          <Check size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">Sunday Attendance</p>
                          <p className="text-xs text-ink/50">This week</p>
                        </div>
                      </div>
                      <p className="font-display text-2xl font-bold">189</p>
                    </div>
                  </div>

                  <p className="text-center text-xs text-white/50">Sample data</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-ink/10 bg-white/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Built for the Way Nigerian Churches Work
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-ink/70">
              Simple, mobile-first tools built specifically for church administrators, pastors, and unit leaders.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="inline-flex rounded-xl bg-gold/15 p-3 text-gold">
                    <Icon size={22} />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-t border-ink/10 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-ink/70">
              All plans include complete church management tools. Upgrade anytime as your congregation expands.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border p-8 shadow-sm transition-shadow hover:shadow-md ${
                  plan.highlight
                    ? 'border-gold bg-white ring-2 ring-gold/20'
                    : 'border-ink/10 bg-white'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink shadow-sm">
                    Most Popular
                  </span>
                )}

                <h3 className="font-display text-2xl font-bold text-ink">{plan.name}</h3>
                <p className="mt-1 text-xs text-ink/60">{plan.subtitle}</p>

                <div className="my-6">
                  <span className="font-display text-4xl font-extrabold text-ink">{plan.price}</span>
                  <span className="text-xs text-ink/60"> {plan.period}</span>
                </div>

                <ul className="mb-8 space-y-3 text-xs text-ink/70 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={14} className="text-gold shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/signup"
                  className={`w-full rounded-xl py-3 text-center text-xs font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-gold hover:bg-gold-light text-ink shadow-sm'
                      : 'bg-gold/90 hover:bg-gold text-ink'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-ink/10 bg-white/50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base text-ink/70">
              Everything you need to know about setting up Gathrd for your church.
            </p>
          </div>

          <div className="mt-10 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0">
                <button
                  onClick={() => toggleFaq(idx)}
                  className="flex w-full items-center justify-between text-left text-sm font-bold text-ink transition-colors hover:text-signal"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 transition-transform duration-200 ${
                      openFaq === idx ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <p className="mt-2 text-xs leading-relaxed text-ink/70">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="border-t border-ink/10 bg-parchment py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/10 bg-signal-gradient p-8 text-center text-white shadow-xl sm:p-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to Transform Your Church Management?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/80 sm:text-base">
              Be among the first Nigerian churches to simplify their administration with Gathrd.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="w-full sm:w-auto rounded-xl bg-gold px-8 py-3.5 text-sm font-bold text-ink shadow-sm hover:bg-gold-light transition-colors"
              >
                Start Your 30-Day Free Trial
              </Link>
              <Link
                to="/demo"
                className="w-full sm:w-auto rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Watch Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink/10 bg-white py-12 text-xs text-ink/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-6 w-6" />
            <span className="font-display font-bold text-ink">Gathrd</span>
          </div>
          <p>© 2026 Gathrd. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/demo" className="hover:text-ink">Demo</Link>
            <Link to="/login" className="hover:text-ink">Sign In</Link>
            <Link to="/signup" className="hover:text-ink">Register Church</Link>
          </div>
        </div>
      </footer>

      {/* Floating Utilities */}
      <WhatsAppButton message="Hello Gathrd, I'd like to know more about the platform." />
      <InstallPrompt />
    </div>
  );
}