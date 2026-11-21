import { useState } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import { SUPPORT_WHATSAPP } from '../lib/contact';
import {
  Church, QrCode, Users, ListChecks, Wallet, CalendarDays,
  ArrowRight, Phone, ShieldCheck, Check, Smartphone, Clock,
  Sparkles, UserCheck, AlertTriangle, MessageSquare, ChevronRight,
  TrendingUp, UserPlus, FileSpreadsheet, Lock, ExternalLink
} from 'lucide-react';

export default function Demo() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [checkInMethod, setCheckInMethod] = useState('code');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('Head Usher');
  const [inviteSent, setInviteSent] = useState(false);

  return (
    <div className="min-h-screen bg-parchment text-ink flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-signal-gradient px-4 py-4 md:px-10 border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/" />
            <div className="flex items-center gap-2">
              <img src="/logo-mark.png" alt="Gathrd" className="h-7 w-7" />
              <span className="font-display font-bold text-white text-lg">Gathrd Command Center</span>
            </div>
            <span className="hidden sm:inline-block bg-white/15 text-white text-xs px-2.5 py-1 rounded-md font-medium">
              Grace Chapel Abuja (Live Demo)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a 
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20Gathrd%2C%20I%20am%20reviewing%20the%20Grace%20Chapel%20demo%20and%20want%20to%20set%20up%20our%20church.`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gold hover:bg-gold-light text-ink text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Phone size={13} /> Onboard My Church
            </a>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-10 w-full space-y-6">
        
        {/* Service Header Card */}
        <div className="bg-white rounded-2xl border border-ink/10 p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-xs uppercase font-bold text-signal tracking-wider">Sunday Service Audit — 11 Oct 2026</p>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-ink">Grace Chapel Central Cathedral</h1>
            <p className="text-xs text-ink/60">Garki 2, Abuja • Senior Pastor: Rev. E. James • 2 Services Active</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setInviteSent(false); setInviteModalOpen(true); }}
              className="bg-signal/10 hover:bg-signal/20 text-signal text-xs font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <UserPlus size={14} /> Invite Church Worker / Leader
            </button>
            <Link
              to="/signup"
              className="bg-signal hover:bg-signal-deep text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
            >
              Start Free Trial <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 border-b border-ink/10 pb-2 scrollbar-none">
          {[
            { id: 'attendance', label: '1. Sunday Post-Service Audit', icon: UserCheck },
            { id: 'absentee', label: '2. Absentee Watch & Automated Care', icon: AlertTriangle },
            { id: 'delegation', label: '3. Worker & Staff Delegation', icon: Users },
            { id: 'roster', label: '4. Sunday Workforce Roster', icon: CalendarDays },
            { id: 'finances', label: '5. Collections & Counting Sheet', icon: Wallet },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-signal text-white shadow-sm'
                    : 'bg-white hover:bg-ink/5 text-ink/70 border border-ink/5'
                }`}
              >
                <Icon size={15} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Sunday Post-Service Audit */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {/* Top Stat Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <p className="text-xs text-ink/50 font-medium">Total Checked In</p>
                <p className="text-2xl md:text-3xl font-extrabold text-signal mt-1">184 <span className="text-xs font-normal text-ink/40">/ 210 expected</span></p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1"><TrendingUp size={12} /> 87.6% attendance rate</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <p className="text-xs text-ink/50 font-medium">Demographics</p>
                <p className="text-sm font-bold text-ink mt-1">Men: 48 • Women: 72</p>
                <p className="text-xs text-ink/60 mt-0.5">Youth: 41 • Children: 23</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <p className="text-xs text-ink/50 font-medium">First-Time Visitors</p>
                <p className="text-2xl md:text-3xl font-extrabold text-amber-600 mt-1">8</p>
                <p className="text-[11px] text-ink/60 mt-1">All assigned to Follow-Up</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-ink/10">
                <p className="text-xs text-ink/50 font-medium">Absentees Today</p>
                <p className="text-2xl md:text-3xl font-extrabold text-rose-600 mt-1">26</p>
                <p className="text-[11px] text-rose-600 font-medium mt-1">5 flagged for urgent care</p>
              </div>
            </div>

            {/* Check-In Engine in Action */}
            <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-5">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">Multi-Channel Sunday Check-In Engine</h2>
                <p className="text-xs text-ink/60">How members and ushers record attendance without paper register sheets.</p>
              </div>

              {/* Toggle Methods */}
              <div className="flex gap-2 border-b border-ink/5 pb-3">
                {[
                  { id: 'code', label: '1. Sunday 6-Digit Code (112 checked in)' },
                  { id: 'qr', label: '2. Entrance QR Code (46 checked in)' },
                  { id: 'usher', label: '3. Usher Manual Roll Call (26 checked in)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setCheckInMethod(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      checkInMethod === m.id
                        ? 'bg-signal/10 text-signal border border-signal/20'
                        : 'text-ink/60 hover:text-ink'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Method Previews */}
              {checkInMethod === 'code' && (
                <div className="bg-parchment/60 rounded-xl p-5 border border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-signal bg-signal/10 px-2 py-0.5 rounded">Active Sunday Code</span>
                    <h3 className="font-display font-bold text-xl text-ink">Members Check In on Their Own Phones</h3>
                    <p className="text-xs text-ink/70 leading-relaxed">
                      At the start of the service, the media screen displays today's dynamic code. Members open their phone browser, type <strong>482 915</strong>, and their attendance is verified instantly with zero battery drain and no app download.
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-ink/10 text-center space-y-2 shadow-sm max-w-xs mx-auto w-full">
                    <p className="text-xs text-ink/50">Today's Dynamic Service PIN</p>
                    <p className="font-mono text-3xl font-extrabold tracking-widest text-signal">482 915</p>
                    <p className="text-[11px] text-ink/40">Valid for Grace Chapel Central • Service 1</p>
                  </div>
                </div>
              )}

              {checkInMethod === 'qr' && (
                <div className="bg-parchment/60 rounded-xl p-5 border border-ink/10 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-signal bg-signal/10 px-2 py-0.5 rounded">Printable Standee</span>
                    <h3 className="font-display font-bold text-xl text-ink">Entrance Foyer QR Code</h3>
                    <p className="text-xs text-ink/70 leading-relaxed">
                      Placed on a standee or desk at the auditorium entrance. Congregants scan with any smartphone camera as they walk through the door.
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-ink/10 text-center max-w-xs mx-auto w-full space-y-2 shadow-sm">
                    <div className="h-32 w-32 mx-auto bg-ink/5 border-2 border-dashed border-signal/40 rounded-xl flex flex-col items-center justify-center">
                      <QrCode size={48} className="text-signal" />
                      <span className="text-[10px] text-ink/50 mt-1 font-mono">SCAN TO CHECK IN</span>
                    </div>
                    <p className="text-[11px] text-ink/60 font-medium">Sunday 11 Oct • 08:00 AM</p>
                  </div>
                </div>
              )}

              {checkInMethod === 'usher' && (
                <div className="bg-parchment/60 rounded-xl p-5 border border-ink/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-bold text-sm text-ink">Head Usher Live Registry Check</h3>
                      <p className="text-xs text-ink/60">For elderly members, first-timers, or congregants without a smartphone.</p>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-md">Ushers Logging Live</span>
                  </div>

                  <div className="bg-white rounded-xl border border-ink/10 overflow-hidden text-xs">
                    <div className="grid grid-cols-4 bg-ink/5 p-2.5 font-bold text-ink/70">
                      <span>Member Name</span>
                      <span>Department / Unit</span>
                      <span>Arrival Time</span>
                      <span className="text-right">Action</span>
                    </div>
                    <div className="divide-y divide-ink/5">
                      <div className="grid grid-cols-4 p-2.5 items-center">
                        <span className="font-medium text-ink">Elder Samuel Oladipo</span>
                        <span className="text-ink/60">Men's Fellowship</span>
                        <span className="text-ink/60">08:14 AM</span>
                        <span className="text-right text-emerald-600 font-bold">Checked In</span>
                      </div>
                      <div className="grid grid-cols-4 p-2.5 items-center">
                        <span className="font-medium text-ink">Deaconess Mary Danjuma</span>
                        <span className="text-ink/60">Women's Leader</span>
                        <span className="text-ink/60">08:22 AM</span>
                        <span className="text-right text-emerald-600 font-bold">Checked In</span>
                      </div>
                      <div className="grid grid-cols-4 p-2.5 items-center">
                        <span className="font-medium text-ink">Chinedu Eze</span>
                        <span className="text-ink/60">Choir</span>
                        <span className="text-ink/60">08:05 AM</span>
                        <span className="text-right text-emerald-600 font-bold">Checked In</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* First-Timer Visitor Intake Log */}
            <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">8 First-Time Visitors Logged Today</h2>
                  <p className="text-xs text-ink/60">Captured by ushers and auto-queued into the pastoral follow-up pipeline.</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2.5 py-1 rounded-md">New Guests</span>
              </div>

              <div className="bg-white rounded-xl border border-ink/10 overflow-hidden text-xs">
                <div className="grid grid-cols-12 bg-ink/5 p-2.5 font-bold text-ink/70">
                  <span className="col-span-3">Visitor Name</span>
                  <span className="col-span-2">Phone</span>
                  <span className="col-span-3">Area / Residence</span>
                  <span className="col-span-2">Invited By</span>
                  <span className="col-span-2 text-right">Follow-Up Lead</span>
                </div>
                <div className="divide-y divide-ink/5">
                  {[
                    { name: 'Emeka Nwosu', phone: '0803 112 4491', area: 'Garki 2, Abuja', by: 'Bro. Silas', worker: 'Sister Sarah' },
                    { name: 'Amina Bello', phone: '0812 499 2201', area: 'Wuse Zone 4', by: 'Sister Grace', worker: 'Pastor David' },
                    { name: 'Kelechi Amadi', phone: '0706 883 1940', area: 'Apo Resettlement', by: 'Flyer / Social', worker: 'Sister Sarah' },
                  ].map((v, i) => (
                    <div key={i} className="grid grid-cols-12 p-2.5 items-center">
                      <span className="col-span-3 font-semibold text-ink">{v.name}</span>
                      <span className="col-span-2 font-mono text-ink/70">{v.phone}</span>
                      <span className="col-span-3 text-ink/60">{v.area}</span>
                      <span className="col-span-2 text-ink/60">{v.by}</span>
                      <span className="col-span-2 text-right text-signal font-medium">{v.worker}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Absentee Watch & Automated Care */}
        {activeTab === 'absentee' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">Absentee Watch Intelligence</h2>
                  <p className="text-xs text-ink/60">Gathrd tracks attendance patterns and flags members before they slip away from the congregation.</p>
                </div>
                <span className="text-xs bg-rose-100 text-rose-800 font-bold px-3 py-1 rounded-full self-start md:self-auto">
                  5 Critical Pastoral Flags
                </span>
              </div>

              {/* Matrix of absentees */}
              <div className="space-y-3">
                {[
                  {
                    name: 'Dorcas Akinola',
                    phone: '0809 332 1094',
                    group: 'Choir Member',
                    consecutive: '3 Consecutive Sundays',
                    lastSeen: '27 Sept 2026',
                    status: 'Critical Alert',
                    note: 'Was unwell 2 weeks ago; needs pastoral visit.',
                  },
                  {
                    name: 'Gift Etim',
                    phone: '0813 552 9011',
                    group: 'Youth Fellowship',
                    consecutive: '3 Consecutive Sundays',
                    lastSeen: '27 Sept 2026',
                    status: 'Critical Alert',
                    note: 'Relocated temporarily for exams.',
                  },
                  {
                    name: 'Ruth Nnamdi',
                    phone: '0703 441 8820',
                    group: 'Women Fellowship',
                    consecutive: '2 Sundays',
                    lastSeen: '04 Oct 2026',
                    status: 'Warning',
                    note: 'Cell leader reached out via phone yesterday.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="bg-parchment/60 rounded-xl border border-ink/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-ink">{item.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'Critical Alert' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.consecutive}
                        </span>
                      </div>
                      <p className="text-xs text-ink/60">{item.group} • Last present: <strong>{item.lastSeen}</strong></p>
                      <p className="text-xs text-ink/70 italic bg-white/60 px-2 py-1 rounded border border-ink/5 inline-block">
                        Note: {item.note}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center">
                      <a
                        href={`https://wa.me/234${item.phone.replace(/\D/g, '').slice(-10)}?text=Good%20day%20${encodeURIComponent(item.name)}%2C%20Pastor%20and%20the%20Grace%20Chapel%20family%20missed%20you%20in%20service%20today.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <MessageSquare size={13} /> WhatsApp
                      </a>
                      <a
                        href={`tel:${item.phone}`}
                        className="bg-white border border-ink/10 hover:bg-ink/5 text-ink text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Phone size={13} /> Call
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 30-Day Guest Conversion Pipeline */}
            <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-ink">30-Day Automated Guest Follow-Up Pipeline</h2>
                <p className="text-xs text-ink/60">A structured communication sequence ensuring first-timers become active, established members.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-2">
                  <span className="font-bold text-signal bg-signal/10 px-2 py-0.5 rounded text-[10px]">DAY 1 — SUNDAY 2:00 PM</span>
                  <p className="font-bold text-ink">Welcome from Senior Pastor</p>
                  <p className="text-ink/60 leading-relaxed">Personalized SMS/WhatsApp thanking them for worshiping at Grace Chapel, with the church office contact.</p>
                </div>

                <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-2">
                  <span className="font-bold text-signal bg-signal/10 px-2 py-0.5 rounded text-[10px]">DAY 3 — TUESDAY 10:00 AM</span>
                  <p className="font-bold text-ink">Cell Group Invitation</p>
                  <p className="text-ink/60 leading-relaxed">Connects them with the nearest house fellowship leader within their neighborhood (e.g., Garki, Wuse).</p>
                </div>

                <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-2">
                  <span className="font-bold text-signal bg-signal/10 px-2 py-0.5 rounded text-[10px]">DAY 7 — SATURDAY 4:00 PM</span>
                  <p className="font-bold text-ink">Next Sunday Reminder</p>
                  <p className="text-ink/60 leading-relaxed">Friendly reminder sharing the sermon title and invitation to attend 1st or 2nd Service.</p>
                </div>

                <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-2">
                  <span className="font-bold text-signal bg-signal/10 px-2 py-0.5 rounded text-[10px]">DAY 30 — ESTABLISHED</span>
                  <p className="font-bold text-ink">Believers' Foundation Class</p>
                  <p className="text-ink/60 leading-relaxed">Automated trigger to enroll the member into water baptism and church workforce training.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Staff & Leader Delegation */}
        {activeTab === 'delegation' && (
          <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Workforce Delegation & Role-Based Access</h2>
                <p className="text-xs text-ink/60">Invite your leaders to assist with church administration without granting access to confidential financial or pastoral records.</p>
              </div>
              <button
                onClick={() => { setInviteSent(false); setInviteModalOpen(true); }}
                className="bg-signal hover:bg-signal-deep text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors self-start md:self-auto"
              >
                <UserPlus size={14} /> Invite Department Leader
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-ink">Ushering Department</p>
                  <span className="text-[10px] bg-signal/10 text-signal font-semibold px-2 py-0.5 rounded">2 Active Leaders</span>
                </div>
                <p className="text-xs text-ink/60">Lead: <strong>Brother Emmanuel Vance</strong></p>
                <ul className="text-xs space-y-1 text-ink/70">
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> Sunday 6-Digit PIN generation</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> Manual attendance roll call</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> First-timer registration desk</li>
                  <li className="flex items-center gap-1.5 text-ink/40"><Lock size={12} /> No access to financial giving data</li>
                </ul>
              </div>

              <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-ink">Follow-Up & Care Team</p>
                  <span className="text-[10px] bg-signal/10 text-signal font-semibold px-2 py-0.5 rounded">3 Active Leaders</span>
                </div>
                <p className="text-xs text-ink/60">Lead: <strong>Sister Sarah Obina</strong></p>
                <ul className="text-xs space-y-1 text-ink/70">
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> Absentee watch management</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> First-timer automated message pipeline</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> WhatsApp care log records</li>
                  <li className="flex items-center gap-1.5 text-ink/40"><Lock size={12} /> Restricted from church settings</li>
                </ul>
              </div>

              <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-ink">Audit & Finance Committee</p>
                  <span className="text-[10px] bg-signal/10 text-signal font-semibold px-2 py-0.5 rounded">2 Active Auditors</span>
                </div>
                <p className="text-xs text-ink/60">Lead: <strong>Deacon Tony Okafor</strong></p>
                <ul className="text-xs space-y-1 text-ink/70">
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> Cash counting tally sheet</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> Paystack digital tithes verification</li>
                  <li className="flex items-center gap-1.5"><Check size={12} className="text-signal" /> Dual counter signatures</li>
                  <li className="flex items-center gap-1.5 text-ink/40"><Lock size={12} /> Encrypted ledger audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Sunday Workforce Roster */}
        {activeTab === 'roster' && (
          <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">Sunday Order of Service & Worker Roster</h2>
                <p className="text-xs text-ink/60">Worker assignments published in advance so every unit knows their timing and responsibilities.</p>
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-md">Next Service: 18 Oct</span>
            </div>

            <div className="bg-white rounded-xl border border-ink/10 overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-ink/5 p-3 font-bold text-ink/70">
                <span className="col-span-2">Time Slot</span>
                <span className="col-span-4">Service Activity</span>
                <span className="col-span-3">Assigned Leader / Unit</span>
                <span className="col-span-3 text-right">Workers' Meeting Status</span>
              </div>
              <div className="divide-y divide-ink/5">
                {[
                  { time: '08:00 - 08:20 AM', item: 'Opening Prayer & Intercession', unit: 'Prayer Band (Bro. David)', status: 'Present (07:35 AM)' },
                  { time: '08:20 - 08:50 AM', item: 'Praise & High Worship', unit: 'Choir (Sister Faith & Band)', status: 'Present (07:20 AM)' },
                  { time: '08:50 - 09:05 AM', item: 'Tithes & Offering Collection', unit: 'Ushering Unit Alpha', status: 'Present (07:30 AM)' },
                  { time: '09:05 - 09:15 AM', item: 'Welcome of First-Time Visitors', unit: 'Follow-Up Team (Sis. Sarah)', status: 'Present (07:40 AM)' },
                  { time: '09:15 - 10:15 AM', item: 'The Word of God', unit: 'Resident Pastor (Rev. E. James)', status: 'Present' },
                  { time: '10:15 - 10:30 AM', item: 'Benediction & New Believers Care', unit: 'Ministers & Protocol Unit', status: 'Present (07:30 AM)' },
                ].map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 p-3 items-center">
                    <span className="col-span-2 font-mono text-ink/60 font-medium">{row.time}</span>
                    <span className="col-span-4 font-semibold text-ink">{row.item}</span>
                    <span className="col-span-3 text-ink/70">{row.unit}</span>
                    <span className="col-span-3 text-right text-emerald-600 font-semibold">{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Collections & Counting Sheet */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-ink/10 p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-ink">Sunday Dual-Signature Counting Sheet</h2>
                  <p className="text-xs text-ink/60">Standardized counting form ensuring physical collection accountability before bank deposit.</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink/50">Total Reconciled Collection</p>
                  <p className="text-2xl font-extrabold text-signal">₦ 284,500</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cash Tally Table */}
                <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-3">
                  <p className="text-xs font-bold text-ink uppercase tracking-wider">Physical Cash Denominations</p>
                  <div className="bg-white rounded-lg border border-ink/10 overflow-hidden text-xs">
                    <div className="grid grid-cols-3 bg-ink/5 p-2 font-bold text-ink/70">
                      <span>Denomination</span>
                      <span>Note Count</span>
                      <span className="text-right">Subtotal</span>
                    </div>
                    <div className="divide-y divide-ink/5">
                      <div className="grid grid-cols-3 p-2">
                        <span>₦ 1,000 notes</span>
                        <span className="font-mono">140</span>
                        <span className="text-right font-semibold">₦ 140,000</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span>₦ 500 notes</span>
                        <span className="font-mono">92</span>
                        <span className="text-right font-semibold">₦ 46,000</span>
                      </div>
                      <div className="grid grid-cols-3 p-2">
                        <span>₦ 200 notes</span>
                        <span className="font-mono">60</span>
                        <span className="text-right font-semibold">₦ 12,000</span>
                      </div>
                      <div className="grid grid-cols-3 p-2 bg-ink/5 font-bold">
                        <span>Total Cash</span>
                        <span>292 notes</span>
                        <span className="text-right text-signal">₦ 198,000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Digital Transfers & Dual Signatures */}
                <div className="space-y-4">
                  <div className="bg-parchment/60 p-4 rounded-xl border border-ink/10 space-y-2">
                    <p className="text-xs font-bold text-ink uppercase tracking-wider">Digital Offerings (Paystack)</p>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-ink/70">Online Tithes & Building Pledges</span>
                      <span className="font-bold text-ink text-sm">₦ 86,500</span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium">Reconciled directly against Paystack gateway</p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-ink/10 space-y-2 text-xs">
                    <p className="font-bold text-ink">Counters' Certification</p>
                    <div className="grid grid-cols-2 gap-2 text-ink/70 pt-1">
                      <div>
                        <p className="text-[11px] text-ink/50">Primary Counter</p>
                        <p className="font-semibold text-ink">Deacon Tony Okafor</p>
                        <span className="text-[10px] text-emerald-600 font-bold">Signed: 10:45 AM</span>
                      </div>
                      <div>
                        <p className="text-[11px] text-ink/50">Secondary Witness</p>
                        <p className="font-semibold text-ink">Sister Blessing Akpan</p>
                        <span className="text-[10px] text-emerald-600 font-bold">Signed: 10:47 AM</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Conversion Banner */}
        <div className="bg-signal-gradient rounded-2xl p-6 md:p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div className="space-y-2 max-w-xl">
            <h3 className="font-display text-xl md:text-2xl font-bold">Ready to bring this level of order to your church?</h3>
            <p className="text-xs md:text-sm text-white/80 leading-relaxed">
              Every feature shown above—attendance PINs, absentee detection, leader delegation, and counting sheets—runs instantly inside your Gathrd account with a 30-day free trial.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <Link
              to="/signup"
              className="bg-gold hover:bg-gold-light text-ink text-center text-xs md:text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              Start 30-Day Free Trial
            </Link>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Hello%20Gathrd%2C%20I%20would%20like%20a%20guided%20onboarding%20session%20for%20our%20church.`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 text-white text-center text-xs md:text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-white/20"
            >
              <Phone size={14} /> WhatsApp Support
            </a>
          </div>
        </div>
      </main>

      {/* Invite Leader Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-ink/10 max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-ink/10">
              <h3 className="font-display font-bold text-base text-ink">Invite Department Leader</h3>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-ink/40 hover:text-ink text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            {inviteSent ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <Check size={24} />
                </div>
                <h4 className="font-bold text-ink text-sm">Invitation Dispatched!</h4>
                <p className="text-xs text-ink/60">An onboarding SMS & login link has been prepared for the {inviteRole} with appropriate permissions.</p>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="bg-signal text-white text-xs font-semibold px-4 py-2 rounded-xl mt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-ink/60 leading-relaxed">
                  Assign a worker to manage their unit directly from their mobile phone without granting access to sensitive church finances.
                </p>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Leader's Full Name</label>
                  <input
                    type="text"
                    defaultValue="Brother John Okon"
                    className="w-full px-3 py-2 border border-ink/20 rounded-lg text-ink"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Leader's Phone Number (for WhatsApp invite)</label>
                  <input
                    type="text"
                    defaultValue="0803 000 1234"
                    className="w-full px-3 py-2 border border-ink/20 rounded-lg text-ink font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Department Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 border border-ink/20 rounded-lg text-ink bg-white"
                  >
                    <option value="Head Usher">Head Usher (Attendance & Headcounts)</option>
                    <option value="Follow-Up Secretary">Follow-Up Secretary (Visitor Care & Absentee Watch)</option>
                    <option value="Choir Leader">Choir Leader (Music Roster & Punctuality)</option>
                    <option value="Associate Pastor">Associate Pastor (Pastoral Notes & Discipleship)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setInviteModalOpen(false)}
                    className="px-3 py-2 text-ink/60 hover:text-ink font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setInviteSent(true)}
                    className="bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    Send Role Invitation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-signal-gradient px-4 py-6 text-center text-xs text-white/60 border-t border-white/10">
        <p>© 2026 Gathrd. Church management software built for Nigerian ministries.</p>
      </footer>
    </div>
  );
}