import { Link } from 'react-router-dom';
import {
  Users, UserPlus, Sparkles, Wallet, ClipboardCheck,
  Megaphone, UsersRound, ListChecks, Check, ArrowRight, Play,
  Bell, CalendarDays, Baby, Building2, HeartHandshake, BookOpen, FileBarChart, Smartphone,
} from 'lucide-react';
import PlanComparison from '../components/PlanComparison';
import WhatsAppButton from '../components/WhatsAppButton';
import InstallPrompt from '../components/InstallPrompt';
import LiteYouTube from '../components/LiteYouTube';
import { PLANS, TRIAL_DAYS, formatNaira } from '../lib/plans';

const FEATURES = [
  { icon: Users, title: 'Memberships', desc: 'Member records, departments, and one join link. Everyone signs up as a member; pastors raise roles from Team.' },
  { icon: ClipboardCheck, title: 'Attendance Tracking', desc: 'A fresh QR code and 6-digit code every Sunday, plus manual usher entry. Members see their own history.' },
  { icon: Wallet, title: 'Donations and Giving', desc: 'Members send tithe and offering to the church bank account and upload a receipt for finance to verify.' },
  { icon: HeartHandshake, title: 'Souls won', desc: 'Members log souls they won. Follow up by WhatsApp, SMS, or call. Pastors see church-wide souls and who won them.' },
  { icon: FileBarChart, title: 'Monthly reports', desc: 'Gathrd fills attendance, giving, visitors, souls, and cells. Admins add extra notes for the pastor and print or save PDF.' },
  { icon: BookOpen, title: 'Sunday message', desc: 'Media posts today’s and yesterday’s message highlight so the whole church can catch up in the app.' },
  { icon: Megaphone, title: 'Announcements', desc: 'Send announcements that reach every member in the app.' },
  { icon: UsersRound, title: 'Cell Groups', desc: 'Manage cell groups, track attendance, and submit weekly reports.' },
  { icon: ListChecks, title: 'Visitor Follow-Ups', desc: 'Never miss a visitor or struggling member again. Automate follow-up from first visit.' },
  { icon: UserPlus, title: 'Visitor Management', desc: 'Track every visitor from first visit to membership.' },
  { icon: Sparkles, title: 'Discipleship Tracking', desc: 'Track spiritual journeys and celebrate milestones.' },
  { icon: CalendarDays, title: 'Church Calendar', desc: 'Events that repeat weekly or monthly, with reminders in the app.' },
  { icon: Baby, title: 'Child Check-In', desc: 'Keep children on a dedicated Children page with teacher access, separate from adult Sunday attendance.' },
  { icon: Building2, title: 'Multi-Branch Operations', desc: 'Invite branches, run a district dashboard, and bill districts or zones on one invoice.' },
  { icon: Bell, title: 'Duty Roster', desc: 'An order of service for every Sunday, with duties and reminders for your workers.' },
  { icon: Smartphone, title: 'Phone alerts', desc: 'Install Gathrd on the phone. Allow alerts. Members get a lock-screen notice when service starts, an announcement goes out, or a follow-up is assigned. Tap opens the app.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-parchment">
      {/* Navigation */}
      <nav className="bg-signal-gradient px-4 py-4 md:px-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-8 w-8" />
            <span className="font-display font-bold text-white text-xl">Gathrd</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/church-management-platform-nigeria" className="text-white/80 hover:text-white text-sm font-medium px-3 py-2">
              Why Gathrd
            </Link>
            <Link to="/demo" className="text-white/80 hover:text-white text-sm font-medium px-3 py-2">
              Watch Demo
            </Link>
            <Link to="/login" className="text-white/80 hover:text-white text-sm font-medium px-3 py-2">
              Sign In
            </Link>
            <Link to="/signup" className="bg-gold hover:bg-gold-light text-ink text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Start Free Trial
            </Link>
          </div>
          {/* Mobile nav */}
          <div className="flex md:hidden items-center gap-2">
            <Link to="/demo" className="text-white/80 hover:text-white text-xs font-medium px-2 py-1.5">
              Demo
            </Link>
            <Link to="/login" className="text-white/80 hover:text-white text-xs font-medium px-2 py-1.5">
              Sign In
            </Link>
            <Link to="/signup" className="bg-gold hover:bg-gold-light text-ink text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-4 py-16 md:py-24 md:px-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-ink leading-tight">
              Church Management System in Nigeria
            </h1>
            <p className="text-ink/60 text-lg mt-4 max-w-lg">
              Gathrd is a church management system for Nigerian churches. Handle memberships, Sunday attendance, giving, souls won, monthly reports, Sunday messages, visitor follow-up, children, and multi-branch operations from one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link to="/signup" className="bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors">
                Start {TRIAL_DAYS}-Day Free Trial
              </Link>
              <Link to="/demo" className="flex items-center justify-center gap-2 text-ink/70 hover:text-ink font-medium px-6 py-3 rounded-lg border border-ink/10 hover:border-ink/20 transition-colors">
                <Play size={18} /> Watch Demo
              </Link>
            </div>
            <p className="text-ink/40 text-sm mt-3">No credit card required · Cancel anytime</p>
          </div>
          <div className="bg-signal-gradient rounded-2xl p-6 shadow-xl">
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-signal/10 flex items-center justify-center">
                  <Users size={20} className="text-signal" />
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm">Active Members</p>
                  <p className="text-ink/50 text-xs">Sample church</p>
                </div>
                <span className="ml-auto font-display font-bold text-ink text-lg">247</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                  <Wallet size={20} className="text-sage" />
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm">Giving This Month</p>
                  <p className="text-ink/50 text-xs">Bank transfer</p>
                </div>
                <span className="ml-auto font-display font-bold text-ink text-lg">₦1.2M</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm">Sunday Attendance</p>
                  <p className="text-ink/50 text-xs">This week</p>
                </div>
                <span className="ml-auto font-display font-bold text-ink text-lg">189</span>
              </div>
            </div>
            <p className="text-white/60 text-xs text-center mt-3">Sample data</p>
          </div>
        </div>
      </section>

      {/* Watch the guide */}
      <section id="guide" aria-labelledby="guide-heading" className="px-4 pb-16 md:pb-24 md:px-10">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 id="guide-heading" className="font-display text-3xl md:text-4xl font-bold text-ink">
            See everything Gathrd does in 9 minutes
          </h2>
          <p className="text-ink/60 text-lg mt-3 max-w-2xl mx-auto">
            Set up your church, build your team, take attendance, manage giving and follow up first-timers, step by step.
          </p>
          <div className="mt-8 text-left">
            <LiteYouTube videoId="1Yg3MzRHuko" title="How to use Gathrd – complete guide" />
          </div>
          <Link
            to="/signup"
            className="inline-block mt-8 bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors"
          >
            Start {TRIAL_DAYS}-Day Free Trial
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 md:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink text-center">Church management system for Nigerian churches</h2>
          <p className="text-ink/50 text-center mt-2 max-w-2xl mx-auto">
            From memberships and Sunday attendance to giving, souls won, monthly reports, Sunday messages, visitor follow-up, children, and multi-branch operations, Gathrd is built for how churches in Nigeria work.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bg-parchment rounded-xl p-4 border border-ink/5">
                  <div className="w-10 h-10 rounded-lg bg-signal/10 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-signal" />
                  </div>
                  <h3 className="font-display font-bold text-ink">{f.title}</h3>
                  <p className="text-ink/50 text-sm mt-1">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 md:px-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink">Gathrd church management system in Nigeria</h2>
          <p className="text-ink/60 mt-3">
            Gathrd is a church management system in Nigeria. Churches use it to handle memberships, track donations, automate visitor follow-ups, run child check-in, and manage multi-branch operations. Priced in Naira.
          </p>
          <ul className="mt-6 space-y-4">
            <li className="rounded-xl border border-signal bg-signal/5 p-4">
              <p className="font-display font-bold text-ink">Gathrd church management system</p>
              <p className="text-ink/60 text-sm mt-1">An all-in-one church management system for Nigerian churches: one join link and Team roles, Sunday attendance, giving by bank transfer, souls won, monthly reports for pastors, Sunday message highlights, visitor follow-up, children, cell groups, and branches.</p>
            </li>
          </ul>
          <Link to="/church-management-platform-nigeria" className="inline-flex items-center gap-2 text-signal font-semibold mt-6">
            Church management system in Nigeria <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Demo CTA Section */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-4xl mx-auto bg-signal-gradient rounded-2xl p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white">See Gathrd in Action</h2>
          <p className="text-white/70 mt-2 max-w-xl mx-auto">
            Watch a quick demo of everything Gathrd can do for your church.
          </p>
          <Link to="/demo" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-ink font-semibold px-6 py-3 rounded-lg mt-6 transition-colors">
            <Play size={18} /> Watch the Demo
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 py-16 md:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink text-center">Simple, Transparent Pricing</h2>
          <p className="text-ink/50 text-center mt-2">Start free for {TRIAL_DAYS} days. No credit card required.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {PLANS.map((p) => (
              <div key={p.id} className={`bg-parchment rounded-2xl border p-6 flex flex-col ${p.popular ? 'border-signal ring-1 ring-signal/20' : 'border-ink/5'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display font-bold text-ink text-lg">{p.name}</p>
                  {p.popular && (
                    <span className="text-xs font-semibold bg-signal/10 text-signal-deep rounded-full px-2 py-0.5">Most popular</span>
                  )}
                </div>
                <p className="text-signal font-semibold text-xl mt-1">{formatNaira(p.price)}<span className="text-sm font-normal text-ink/50">/month</span></p>
                <p className="text-ink/50 text-sm mt-1">{p.desc}</p>
                <p className="text-ink/70 text-sm font-medium mt-3 mb-3">{p.audience}</p>
                <ul className="space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-ink/70">
                      <Check size={16} className="text-sage shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="mt-4 text-center text-sm bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2.5 rounded-lg transition-colors">
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

      <section className="px-4 py-16 md:px-10 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink text-center">Church management system questions</h2>
          <p className="text-ink/50 text-center mt-2">Straight answers for pastors looking for a church management system in Nigeria.</p>
          <dl className="mt-8 space-y-4">
            <div className="rounded-xl border border-ink/5 bg-parchment p-4">
              <dt className="font-display font-bold text-ink">What is a church management system in Nigeria?</dt>
              <dd className="text-ink/60 text-sm mt-1">A church management system (ChMS) helps Nigerian churches handle memberships, Sunday attendance, giving, souls won, monthly reports, visitor follow-up, children, and multi-branch operations. Gathrd is that church management system, priced in Naira.</dd>
            </div>
            <div className="rounded-xl border border-ink/5 bg-parchment p-4">
              <dt className="font-display font-bold text-ink">Is Gathrd a church management system?</dt>
              <dd className="text-ink/60 text-sm mt-1">Yes. Gathrd is a church management system built for Nigerian churches. Pricing is in Naira. Members give by bank transfer. Pastors, Admin, finance, teachers, and cell leaders each get the right login.</dd>
            </div>
            <div className="rounded-xl border border-ink/5 bg-parchment p-4">
              <dt className="font-display font-bold text-ink">Can we track Sunday attendance?</dt>
              <dd className="text-ink/60 text-sm mt-1">Yes. Start a service, mark adults present, and keep children on the Children page. Members can also check in with a QR code or a 6-digit code.</dd>
            </div>
            <div className="rounded-xl border border-ink/5 bg-parchment p-4">
              <dt className="font-display font-bold text-ink">How does giving work?</dt>
              <dd className="text-ink/60 text-sm mt-1">Add your church bank accounts. Members send tithe and offering, then upload a receipt. Finance verifies transfers. No public card checkout on the member Give page.</dd>
            </div>
            <div className="rounded-xl border border-ink/5 bg-parchment p-4">
              <dt className="font-display font-bold text-ink">Can pastors get a monthly report?</dt>
              <dd className="text-ink/60 text-sm mt-1">Yes. Gathrd fills attendance, giving, visitors, souls, and cells. Admins add extra notes. Pastors open Reports and can print or save PDF.</dd>
            </div>
            <div className="rounded-xl border border-ink/5 bg-parchment p-4">
              <dt className="font-display font-bold text-ink">Is there a free trial?</dt>
              <dd className="text-ink/60 text-sm mt-1">Yes. {TRIAL_DAYS} days, no credit card. Start from the signup page. Cancel anytime.</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-4xl mx-auto bg-signal-gradient rounded-2xl p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white">Ready for a church management system that fits Nigeria?</h2>
          <p className="text-white/70 mt-2 max-w-xl mx-auto">
            Join churches using Gathrd for memberships, attendance, giving, souls won, monthly reports, and multi-branch operations.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-ink font-semibold px-6 py-3 rounded-lg mt-6 transition-colors">
            Start Your Free Trial <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-signal-gradient px-4 py-8 md:px-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-6 w-6" />
            <span className="font-display font-bold text-white">Gathrd</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/church-management-platform-nigeria" className="text-white/50 hover:text-white text-sm">Church management system in Nigeria</Link>
            <Link to="/demo" className="text-white/50 hover:text-white text-sm">Demo</Link>
            <Link to="/login" className="text-white/50 hover:text-white text-sm">Sign In</Link>
            <Link to="/signup" className="text-white/50 hover:text-white text-sm">Sign Up</Link>
          </div>
          <p className="text-white/50 text-sm">© 2026 Gathrd. All rights reserved.</p>
        </div>
      </footer>

      <WhatsAppButton message="Hello Gathrd, I'd like to know more about the platform." />
      <InstallPrompt />
    </div>
  );
}