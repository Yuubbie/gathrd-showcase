import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Sparkles, Wallet, ClipboardCheck,
  Megaphone, Cake, UsersRound, ListChecks, Check, ArrowRight, Play,
  Bell, Settings, Smartphone, Shield, Clock,
} from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'Member Management', desc: '8 role types, departments, cell groups, and self-service member claiming.' },
  { icon: ClipboardCheck, title: 'Attendance Tracking', desc: 'QR self-check-in and manual usher entry for Sunday services.' },
  { icon: Wallet, title: 'Giving & Tithes', desc: 'Accept donations via Paystack with full transaction records and counting sheets.' },
  { icon: Megaphone, title: 'Announcements', desc: 'Send SMS and in-app notifications to your entire congregation.' },
  { icon: UsersRound, title: 'Cell Groups', desc: 'Manage cell groups, track attendance, and submit weekly reports.' },
  { icon: ListChecks, title: 'Follow-Up Dashboard', desc: 'Never miss a visitor or struggling member again.' },
  { icon: UserPlus, title: 'Visitor Management', desc: 'Track every visitor from first visit to membership.' },
  { icon: Sparkles, title: 'Discipleship Tracking', desc: 'Track spiritual journeys and celebrate milestones.' },
  { icon: Bell, title: 'Notifications', desc: 'Real-time in-app and SMS notifications for your church.' },
  { icon: Settings, title: 'Church Branding', desc: 'Custom logo and brand colors throughout the app.' },
  { icon: Smartphone, title: 'Installable PWA', desc: 'Works on any device, even offline.' },
  { icon: Shield, title: 'Role-Based Access', desc: '8 role types with granular permissions.' },
];

const PLANS = [
  { id: 'regular', name: 'Regular', price: '₦10,000/month', desc: 'For small churches getting started', features: ['Up to 200 members', '1 Senior Pastor', 'All core features', 'Giving & tithes', 'Email support'] },
  { id: 'multi-leader', name: 'Multi-Leader', price: '₦15,000/month', desc: 'For churches with multiple leaders', features: ['Up to 5,000 members', '1 Senior Pastor + 2 Pastors', 'All Regular features', 'Priority support'] },
  { id: 'district', name: 'District', price: '₦20,000/month', desc: 'For districts monitoring multiple branches', features: ['Up to 5,000 members', '1 Senior Pastor + 2 Pastors', 'Monitor unlimited branches', 'Branch management', 'Priority support'] },
  { id: 'zone', name: 'Zone', price: '₦50,000/month', desc: 'For zones monitoring multiple districts', features: ['Up to 10,000 members', '1 Senior Pastor + 2 Pastors', 'Monitor unlimited districts', 'District management', 'Dedicated support'] },
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
              The Easiest Church Management & Administration Platform
            </h1>
            <p className="text-ink/60 text-lg mt-4 max-w-lg">
              Manage members, track attendance, accept giving, and grow your congregation — all from one simple dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <Link to="/signup" className="bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg text-center transition-colors">
                Start 60-Day Free Trial
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
                  <p className="text-ink/50 text-xs">Your church</p>
                </div>
                <span className="ml-auto font-display font-bold text-ink text-lg">247</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sage/10 flex items-center justify-center">
                  <Wallet size={20} className="text-sage" />
                </div>
                <div>
                  <p className="font-semibold text-ink text-sm">Giving This Month</p>
                  <p className="text-ink/50 text-xs">Via Paystack</p>
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
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 md:px-10 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ink text-center">Everything Your Church Needs</h2>
          <p className="text-ink/50 text-center mt-2 max-w-2xl mx-auto">
            From member management to giving, Gathrd handles it all so you can focus on ministry.
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
          <p className="text-ink/50 text-center mt-2">Start free for 60 days. No credit card required.</p>
          <div className="grid sm:grid-cols-3 gap-6 mt-10">
            {PLANS.map((p) => (
              <div key={p.id} className={`bg-parchment rounded-2xl border p-6 flex flex-col ${p.id === 'advanced' ? 'border-signal ring-1 ring-signal/20' : 'border-ink/5'}`}>
                <p className="font-display font-bold text-ink text-lg">{p.name}</p>
                <p className="text-signal font-semibold text-xl mt-1">{p.price}</p>
                <p className="text-ink/50 text-sm mt-1 mb-4">{p.desc}</p>
                <ul className="space-y-2 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-ink/70">
                      <Check size={16} className="text-sage shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="mt-4 text-center text-sm bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2.5 rounded-lg transition-colors">
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:px-10">
        <div className="max-w-4xl mx-auto bg-signal-gradient rounded-2xl p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl font-bold text-white">Ready to Transform Your Church Management?</h2>
          <p className="text-white/70 mt-2 max-w-xl mx-auto">
            Join churches across Nigeria who are simplifying their administration with Gathrd.
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
            <Link to="/demo" className="text-white/50 hover:text-white text-sm">Demo</Link>
            <Link to="/login" className="text-white/50 hover:text-white text-sm">Sign In</Link>
            <Link to="/signup" className="text-white/50 hover:text-white text-sm">Sign Up</Link>
          </div>
          <p className="text-white/50 text-sm">© 2026 Gathrd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
