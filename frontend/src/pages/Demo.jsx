import { useState } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import {
  Church, QrCode, Users, ListChecks, Wallet, CalendarDays,
  ArrowRight, ArrowLeft, CheckCircle2, Phone, ShieldCheck,
  Check, Smartphone, Clock, Sparkles
} from 'lucide-react';

const WALKTHROUGH_STEPS = [
  {
    id: 'setup',
    title: '1. Instant Church Setup',
    badge: 'Step 1 of 5',
    headline: 'Set up Grace Chapel in under 3 minutes',
    description: 'Create your main church profile, assign branch administrators, and set your ministry brand colors. Leaders and department heads receive instant invites to access their specific tools.',
    icon: Church,
    previewType: 'setup',
  },
  {
    id: 'checkin',
    title: '2. Sunday Morning Check-In',
    badge: 'Step 2 of 5',
    headline: 'Dynamic 6-digit codes and usher roll call',
    description: 'Every Sunday service automatically generates a secure 6-digit check-in code and printable QR display. Members check in from their phones upon arrival, while ushers verify attendance in real-time.',
    icon: QrCode,
    previewType: 'checkin',
  },
  {
    id: 'followup',
    title: '3. Follow-Up & Absentee Watch',
    badge: 'Step 3 of 5',
    headline: 'Automatically detect members missing 3+ Sundays',
    description: 'Never let anyone slip through the cracks. Gathrd automatically flags absent members and assigns them to care ministers with direct WhatsApp and phone action links.',
    icon: ListChecks,
    previewType: 'followup',
  },
  {
    id: 'roster',
    title: '4. Worker Duty Rosters',
    badge: 'Step 4 of 5',
    headline: 'Order of service & workforce scheduling',
    description: 'Publish worker assignments for Choir, Protocol, Ushers, and Media weeks in advance. Workers view their personal schedule and duties directly on their phones without paper printouts.',
    icon: CalendarDays,
    previewType: 'roster',
  },
  {
    id: 'giving',
    title: '5. Collections & Transparent Counting',
    badge: 'Step 5 of 5',
    headline: 'Digital tithes and Sunday cash counting sheets',
    description: 'Record physical Sunday collections with dual-signature verification while accepting Paystack online offerings. Generate clean monthly reports for church leadership.',
    icon: Wallet,
    previewType: 'giving',
  },
];

export default function Demo() {
  const [currentStep, setCurrentStep] = useState(0);
  const step = WALKTHROUGH_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-parchment text-ink flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-signal-gradient px-4 py-4 md:px-10 border-b border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/" />
            <div className="flex items-center gap-2">
              <img src="/logo-mark.png" alt="Gathrd" className="h-7 w-7" />
              <span className="font-display font-bold text-white text-lg">Gathrd Walkthrough</span>
            </div>
            <span className="hidden sm:inline-block bg-white/10 text-white/90 text-xs px-2.5 py-1 rounded-md">
              Grace Chapel Demo
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href="https://wa.me/2348128821338?text=Hello%20Gathrd%2C%20I%20am%20exploring%20the%20Grace%20Chapel%20walkthrough%20and%20would%20like%20to%20onboard%20our%20church."
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold hover:bg-gold-light text-ink text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Phone size={13} /> Onboard My Church
            </a>
          </div>
        </div>
      </header>

      {/* Main Walkthrough Body */}
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12 w-full">
        {/* Step Indicator Pills */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {WALKTHROUGH_STEPS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep ? 'bg-signal' : idx < currentStep ? 'bg-signal/40' : 'bg-ink/10'
              }`}
              title={s.title}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-6 md:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Step Narration */}
            <div className="lg:col-span-5 space-y-4">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-signal bg-signal/10 px-3 py-1 rounded-full">
                {step.badge}
              </span>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-ink leading-tight">
                {step.headline}
              </h1>
              <p className="text-ink/70 text-sm md:text-base leading-relaxed">
                {step.description}
              </p>

              <div className="pt-4 border-t border-ink/5 flex items-center gap-2 text-xs text-ink/50">
                <ShieldCheck size={16} className="text-signal" />
                <span>Operational template active in Grace Chapel Demo</span>
              </div>
            </div>

            {/* Interactive Mock Preview Box */}
            <div className="lg:col-span-7 bg-parchment/60 rounded-xl border border-ink/10 p-5 md:p-6">
              {step.previewType === 'setup' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-signal text-white flex items-center justify-center font-bold text-xs">GC</div>
                      <div>
                        <p className="font-bold text-sm text-ink">Grace Chapel Central</p>
                        <p className="text-[11px] text-ink/50">Abuja Branch • Active</p>
                      </div>
                    </div>
                    <span className="text-xs bg-signal/10 text-signal font-medium px-2 py-0.5 rounded">Trial Active</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-ink/5">
                      <p className="text-ink/50">Total Congregation</p>
                      <p className="text-lg font-bold text-ink mt-1">41 Members</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-ink/5">
                      <p className="text-ink/50">Active Departments</p>
                      <p className="text-lg font-bold text-ink mt-1">4 Units</p>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-ink/5 flex items-center justify-between text-xs">
                    <span className="text-ink/70">Role-Based Invitations</span>
                    <span className="text-signal font-semibold">Ushers, Choir, Follow-Up</span>
                  </div>
                </div>
              )}

              {step.previewType === 'checkin' && (
                <div className="space-y-4 text-center">
                  <p className="text-xs font-semibold text-ink/50 uppercase tracking-wider">Sunday Morning Live Service</p>
                  <div className="bg-white p-6 rounded-xl border border-ink/10 max-w-xs mx-auto shadow-sm space-y-2">
                    <span className="text-xs text-ink/60">Today's Check-In Code</span>
                    <p className="font-mono text-3xl font-extrabold tracking-widest text-signal">482 915</p>
                    <p className="text-[11px] text-ink/40">Expires at service conclusion</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-ink/60">
                    <span className="flex items-center gap-1"><Smartphone size={14} className="text-signal" /> Mobile Web</span>
                    <span className="flex items-center gap-1"><Clock size={14} className="text-signal" /> Instant Audit</span>
                  </div>
                </div>
              )}

              {step.previewType === 'followup' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-ink/10 text-xs">
                    <span className="font-bold text-ink">Absentee Watch Queue</span>
                    <span className="text-signal font-medium">5 Members Need Care</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { name: 'Dorcas Akinola', last: '27 Sept 2026', phone: '09000000037' },
                      { name: 'Gift Etim', last: '11 Oct 2026', phone: '09000000019' },
                      { name: 'Ruth Nnamdi', last: '11 Oct 2026', phone: '09000000031' }
                    ].map((m, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-lg border border-ink/5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-medium text-ink">{m.name}</p>
                          <p className="text-[11px] text-ink/40">Last seen: {m.last}</p>
                        </div>
                        <span className="text-signal font-mono font-medium">{m.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step.previewType === 'roster' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-ink/10 text-xs">
                    <span className="font-bold text-ink">Sunday Duty Roster</span>
                    <span className="text-ink/50">Next Service</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-ink/5 flex justify-between">
                      <span className="text-ink/60">Praise & Worship</span>
                      <span className="font-semibold text-ink">Choir Lead (Brother John)</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-ink/5 flex justify-between">
                      <span className="text-ink/60">Offering Collection</span>
                      <span className="font-semibold text-ink">Ushering Team Alpha</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-ink/5 flex justify-between">
                      <span className="text-ink/60">New Believers Care</span>
                      <span className="font-semibold text-ink">Follow-Up Department</span>
                    </div>
                  </div>
                </div>
              )}

              {step.previewType === 'giving' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-ink/10 text-xs">
                    <span className="font-bold text-ink">Sunday Counting Sheet</span>
                    <span className="text-signal font-medium">Reconciled</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-ink/5">
                      <p className="text-ink/50">Tithe Collections</p>
                      <p className="text-base font-bold text-ink mt-1">₦ 145,000</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-ink/5">
                      <p className="text-ink/50">General Offering</p>
                      <p className="text-base font-bold text-ink mt-1">₦ 82,500</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-ink/50 text-center">Dual verification enabled for audit compliance</p>
                </div>
              )}
            </div>
          </div>

          {/* Stepper Controls */}
          <div className="mt-8 pt-6 border-t border-ink/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors border ${
                  currentStep === 0
                    ? 'border-ink/10 text-ink/30 cursor-not-allowed'
                    : 'border-ink/20 hover:bg-ink/5 text-ink'
                }`}
              >
                <ArrowLeft size={16} /> Previous
              </button>

              {currentStep < WALKTHROUGH_STEPS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="bg-signal hover:bg-signal-deep text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                  Next Step <ArrowRight size={16} />
                </button>
              ) : (
                <Link
                  to="/signup"
                  className="bg-signal hover:bg-signal-deep text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
                >
                  Start Church Trial <ArrowRight size={16} />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/2348128821338?text=Hello%20Gathrd%2C%20I%20have%20questions%20about%20onboarding%20our%20church."
                target="_blank"
                rel="noopener noreferrer"
                className="text-signal hover:underline text-xs font-semibold flex items-center gap-1"
              >
                <Phone size={13} /> Chat with Onboarding (0810 013 3673)
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-signal-gradient px-4 py-6 text-center text-xs text-white/60 border-t border-white/10">
        <p>© 2026 Gathrd. Church management software built for Nigerian ministries.</p>
      </footer>
    </div>
  );
}