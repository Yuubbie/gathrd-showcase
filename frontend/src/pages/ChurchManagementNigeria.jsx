import { Link } from 'react-router-dom';
import {
  Check, ArrowRight, Users, Wallet, UserPlus, Building2, Baby, ClipboardCheck,
  MessageSquare, MapPin,
} from 'lucide-react';
import WhatsAppButton from '../components/WhatsAppButton';
import { TRIAL_DAYS, formatNaira, PLANS } from '../lib/plans';

const CAPABILITIES = [
  { icon: Users, title: 'Memberships', text: 'Member records, departments, cell groups, and role-based logins for pastors, Admin, ushers, and workers.' },
  { icon: Wallet, title: 'Donations and giving', text: 'Tithe and offering by Nigerian bank transfer, receipt upload, counting sheets, and finance verification.' },
  { icon: UserPlus, title: 'Visitor follow-ups', text: 'Check in visitors, assign follow-up, and see overdue tasks on one dashboard.' },
  { icon: Baby, title: 'Child check-in', text: 'Keep children on a dedicated Children page with teacher access, separate from adult Sunday attendance.' },
  { icon: Building2, title: 'Multi-branch operations', text: 'Invite branches, run a district dashboard, and bill districts or zones on one invoice.' },
  { icon: ClipboardCheck, title: 'Sunday attendance', text: 'QR code, 6-digit code, or usher entry for every service. Track adults and children separately.' },
  { icon: MessageSquare, title: 'Church communication', text: 'In-app announcements, duty roster reminders, and birthday or anniversary alerts.' },
  { icon: MapPin, title: 'Built for Nigeria', text: 'Priced in Naira. Bank-transfer giving. Works on Android phones over mobile data.' },
];

const FAQS = [
  {
    q: 'What is a church management system in Nigeria?',
    a: 'A church management system (ChMS) helps Nigerian churches handle memberships, track donations, automate visitor follow-ups, run child check-in, and manage multi-branch operations from one place. Gathrd is that church management system.',
  },
  {
    q: 'What is the best church management system in Nigeria?',
    a: 'Gathrd is a church management system in Nigeria built for how local churches actually run Sunday: attendance, people, giving by bank transfer, visitor follow-up, children, cell groups, and branches. It is priced in Naira with a 30-day free trial.',
  },
  {
    q: 'Is Gathrd a church management system?',
    a: 'Yes. Gathrd is a specialized church management system (ChMS) for Nigerian churches. It covers memberships, donations, visitor follow-ups, child check-in, cell groups, announcements, and multi-branch operations.',
  },
  {
    q: 'How much does church management software cost in Nigeria?',
    a: `Gathrd is priced in Naira. Starter is ${formatNaira(PLANS[0].price)}/month, Regular is ${formatNaira(PLANS[1].price)}/month, with District and Zone plans for multi-branch churches. Every plan includes a ${TRIAL_DAYS}-day free trial and no credit card.`,
  },
  {
    q: 'Can a small church in Nigeria use a ChMS?',
    a: 'Yes. Gathrd Starter is built for small churches getting organised: member registry, attendance, visitors, online giving, and announcements, without forcing a district setup.',
  },
  {
    q: 'Does Gathrd support multi-branch churches?',
    a: 'Yes. District and Zone plans cover every branch on one invoice. Pastors can invite branches, see oversight numbers, and keep each church’s data isolated.',
  },
];

export default function ChurchManagementNigeria() {
  return (
    <div className="min-h-screen bg-parchment">
      <nav className="bg-signal-gradient px-4 py-4 md:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd church management system logo" className="h-8 w-8" />
            <span className="font-display font-bold text-white text-xl">Gathrd</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/demo" className="text-white/80 hover:text-white text-xs md:text-sm font-medium px-2 py-1.5">Demo</Link>
            <Link to="/login" className="text-white/80 hover:text-white text-xs md:text-sm font-medium px-2 py-1.5">Sign In</Link>
            <Link to="/signup" className="bg-gold hover:bg-gold-light text-ink text-xs md:text-sm font-semibold px-3 md:px-4 py-1.5 md:py-2 rounded-lg">
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      <article className="px-4 py-12 md:py-20 md:px-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-signal font-semibold text-sm uppercase tracking-wide">Church management system (ChMS)</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight mt-3">
            Church Management System in Nigeria
          </h1>
          <p className="text-ink/70 text-lg mt-4">
            Gathrd is a church management system in Nigeria. Use this ChMS to handle memberships, track donations, automate visitor follow-ups, run child check-in, and manage multi-branch operations. Priced in Naira.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link to="/signup" className="bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg text-center">
              Start {TRIAL_DAYS}-Day Free Trial
            </Link>
            <Link to="/demo" className="border border-ink/10 hover:border-ink/20 text-ink font-medium px-6 py-3 rounded-lg text-center">
              Watch the demo
            </Link>
          </div>
        </div>
      </article>

      <section className="px-4 py-12 md:px-10 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink">Gathrd church management system for Nigerian churches</h2>
          <p className="text-ink/60 mt-2">
            Pastors searching for a church management system in Nigeria need a full ChMS, not a generic CRM. Gathrd is built for how churches in Nigeria actually run Sunday.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'All-in-one church management application: people, Sunday attendance, giving, visitors, children, cell groups, and branches.',
              'Giving matches Nigerian banking: members transfer to the church account and upload a receipt. Finance verifies it.',
              'Multi-branch operations for districts and zones, with each church’s data kept separate.',
              'Priced in Naira. No dollar billing. Free trial, no credit card.',
              'Installs on any phone home screen. No app store required.',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2 text-ink/70">
                <Check size={18} className="text-sage shrink-0 mt-0.5" /> {point}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 py-12 md:px-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink text-center">What a church management system should do in Nigeria</h2>
          <p className="text-ink/50 text-center mt-2 max-w-2xl mx-auto">
            Gathrd covers the ChMS jobs Nigerian churches actually run every week.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="bg-white rounded-xl p-4 border border-ink/5">
                  <div className="w-10 h-10 rounded-lg bg-signal/10 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-signal" />
                  </div>
                  <h3 className="font-display font-bold text-ink">{item.title}</h3>
                  <p className="text-ink/50 text-sm mt-1">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 md:px-10 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink">Why churches pick Gathrd as their ChMS</h2>
          <ul className="mt-6 space-y-3">
            {[
              'One dashboard for memberships, Sunday attendance, donations, visitor follow-ups, child check-in, and multi-branch operations.',
              'Teachers check children in on the Children page, including past services. Pastors see adults and children separately.',
              'Cell groups, duty roster, announcements, and discipleship tracking sit in the same church management system.',
              'Starter, Regular, District, and Zone plans so a small church and a zone both fit.',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2 text-ink/70">
                <Check size={18} className="text-sage shrink-0 mt-0.5" /> {point}
              </li>
            ))}
          </ul>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg mt-8">
            Start your church management system trial <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="px-4 py-12 md:px-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink text-center">Church management system questions</h2>
          <dl className="mt-8 space-y-4">
            {FAQS.map((item) => (
              <div key={item.q} className="rounded-xl border border-ink/5 bg-white p-4">
                <dt className="font-display font-bold text-ink">{item.q}</dt>
                <dd className="text-ink/60 text-sm mt-1">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="bg-signal-gradient px-4 py-8 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-6 w-6" />
            <span className="font-display font-bold text-white">Gathrd</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-white/50 hover:text-white text-sm">Home</Link>
            <Link to="/demo" className="text-white/50 hover:text-white text-sm">Demo</Link>
            <Link to="/signup" className="text-white/50 hover:text-white text-sm">Sign Up</Link>
          </div>
          <p className="text-white/50 text-sm">Church management system in Nigeria</p>
        </div>
      </footer>

      <WhatsAppButton message="Hello Gathrd, I want a church management system for our church in Nigeria." />
    </div>
  );
}
