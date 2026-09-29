import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import {
  LayoutDashboard, Users, UserPlus, Sparkles, Wallet, ClipboardCheck,
  Megaphone, Cake, UsersRound, ListChecks, Check, ArrowRight, Play,
  Bell, Settings, Smartphone, Shield, Clock, Church, UserCog,
  ClipboardList, CreditCard, LogIn, Palette, UserPlus2,
  Building2, TrendingUp, Plus, TrendingDown,
} from 'lucide-react';

const DEMO_SCENES = [
  {
    id: 'signup',
    title: 'Pastor Signs Up',
    narration: 'A pastor signs up with their email. Their church is created automatically — no setup needed. They get a 60-day free trial with no credit card required.',
    icon: LogIn,
    color: 'bg-signal',
    content: [
      { label: 'Email', value: 'One-click signup', icon: LogIn },
      { label: 'Church Created', value: 'Automatically', icon: Church },
      { label: 'Free Trial', value: '60 days', icon: Clock },
      { label: 'No Credit Card', value: 'Required', icon: CreditCard },
    ],
  },
  {
    id: 'branding',
    title: 'Set Up Church Branding',
    narration: 'First, the pastor uploads their church logo and picks a brand color. This makes Gathrd feel like their own — every page shows their church\'s identity.',
    icon: Palette,
    color: 'bg-gold',
    content: [
      { label: 'Church Logo', value: 'Upload image', icon: Settings },
      { label: 'Brand Color', value: 'Pick your color', icon: Palette },
      { label: 'Applied Everywhere', value: 'All pages', icon: Sparkles },
      { label: 'Preview', value: 'Real-time', icon: Play },
    ],
  },
  {
    id: 'invite-staff',
    title: 'Invite Staff & Team',
    narration: 'Next, the pastor invites their team — assistant pastors, church admins, finance admins. Each person gets an email invite and sets their own password.',
    icon: UserPlus2,
    color: 'bg-sage',
    content: [
      { label: 'Send Invites', value: 'Via email', icon: Bell },
      { label: 'Set Roles', value: 'At invite time', icon: Shield },
      { label: 'Staff Set Password', value: 'Self-service', icon: LogIn },
      { label: 'Team Dashboard', value: 'Role-based', icon: LayoutDashboard },
    ],
  },
  {
    id: 'add-members',
    title: 'Add Members (with Staff Help)',
    narration: 'Now the team can work together. Staff add members in bulk or one by one. Each member gets a profile with their role, department, and cell group.',
    icon: UserPlus,
    color: 'bg-signal',
    content: [
      { label: 'Bulk Import', value: 'CSV upload', icon: ClipboardList },
      { label: 'Individual Add', value: 'Quick form', icon: UserPlus },
      { label: 'Assign Role', value: '8 types', icon: Shield },
      { label: 'Department', value: 'Optional', icon: LayoutDashboard },
      { label: 'Cell Group', value: 'Optional', icon: UsersRound },
      { label: 'Member Claiming', value: 'Self-service', icon: UserPlus2 },
    ],
  },
  {
    id: 'assign-roles',
    title: 'Roles & Permissions',
    narration: 'Gathrd has 8 role types — from Senior Pastor to Member. Each role sees only what they need. A finance admin sees giving, a cell leader sees their group.',
    icon: Shield,
    color: 'bg-gold',
    content: [
      { label: 'Senior Pastor', value: 'Full access', icon: Shield },
      { label: 'Assistant Pastor', value: 'Full access', icon: Users },
      { label: 'Church Admin', value: 'Operations', icon: Settings },
      { label: 'Finance Admin', value: 'Giving only', icon: Wallet },
      { label: 'Department Head', value: 'Department', icon: LayoutDashboard },
      { label: 'Cell Leader', value: 'Cell group', icon: UsersRound },
      { label: "Children's Teacher", value: 'Children', icon: Sparkles },
      { label: 'Member', value: 'Personal only', icon: Users },
    ],
  },
  {
    id: 'multi-branch',
    title: 'Multi-Branch: District & Zone Management',
    narration: 'Upgrade to District or Zone plan to manage multiple branches. District Pastors oversee branches; Zone Pastors oversee districts. All with custom terminology support.',
    icon: Building2,
    color: 'bg-signal',
    content: [
      { label: 'Custom Terminology', value: 'District, Region, Area, Circuit, State', icon: Settings },
      { label: 'District Plan', value: '₦20k/mo — monitor unlimited branches', icon: Building2 },
      { label: 'Zone Plan', value: '₦50k/mo — monitor unlimited districts', icon: Building2 },
      { label: 'Branch Invites', value: 'District/Zone can invite branches', icon: UserPlus2 },
      { label: 'Cross-Branch Reports', value: 'Giving, attendance, members', icon: TrendingUp },
    ],
  },
  {
    id: 'branches',
    title: 'Manage Branches',
    narration: 'District/Zone pastors can add branches, view real-time stats for each branch — members, giving, attendance — all in one dashboard.',
    icon: Building2,
    color: 'bg-gold',
    content: [
      { label: 'Add Branch', value: 'One click', icon: Plus },
      { label: 'Branch Stats', value: 'Members, giving, attendance', icon: TrendingUp },
      { label: 'Branch Login', value: 'Independent dashboards', icon: LogIn },
      { label: 'Invite Branch Pastor', value: 'Email invite', icon: UserPlus2 },
    ],
  },
  {
    id: 'district-dashboard',
    title: 'District/Zone Monitoring Dashboard',
    narration: 'See consolidated metrics across all branches or districts — giving trends, attendance patterns, member growth. Drill down into any branch.',
    icon: TrendingUp,
    color: 'bg-sage',
    content: [
      { label: 'Consolidated Giving', value: 'All branches', icon: Wallet },
      { label: 'Attendance Trends', value: 'Weekly/monthly', icon: ClipboardCheck },
      { label: 'Member Growth', value: 'Per branch', icon: Users },
      { label: 'Top Branches', value: 'Leaderboard', icon: TrendingUp },
    ],
  },
  {
    id: 'cell-groups',
    title: 'Create Cell Groups',
    narration: 'The pastor creates cell groups and assigns leaders. Each leader can track their group\'s attendance and submit weekly reports.',
    icon: UsersRound,
    color: 'bg-sage',
    content: [
      { label: 'Create Groups', value: 'Unlimited', icon: UsersRound },
      { label: 'Assign Leaders', value: 'One click', icon: UserCog },
      { label: 'Track Attendance', value: 'Per group', icon: ClipboardCheck },
      { label: 'Weekly Reports', value: 'Submitted', icon: ListChecks },
    ],
  },
  {
    id: 'giving',
    title: 'Set Up Giving',
    narration: 'The finance admin connects Paystack. Now the church can accept tithes and offerings online. Every transaction is recorded automatically.',
    icon: Wallet,
    color: 'bg-signal',
    content: [
      { label: 'Paystack Integration', value: 'Secure', icon: Shield },
      { label: 'Transaction Logs', value: 'Complete', icon: ListChecks },
      { label: 'Counting Sheets', value: 'Digital', icon: LayoutDashboard },
      { label: 'Top Givers', value: 'Recognized', icon: Cake },
    ],
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    narration: 'Now the pastor can see everything at a glance — active members, visitors, discipleship progress, and giving. All updated in real time.',
    icon: LayoutDashboard,
    color: 'bg-gold',
    content: [
      { label: 'Active Members', value: '247', icon: Users },
      { label: 'Visitors This Month', value: '12', icon: UserPlus },
      { label: 'In Discipleship', value: '34', icon: Sparkles },
      { label: 'Giving This Month', value: '₦1.2M', icon: Wallet },
    ],
  },
  {
    id: 'attendance',
    title: 'Track Attendance',
    narration: 'On Sunday, members check in with a QR code, or ushers can manually enter attendance. No more paper registers.',
    icon: ClipboardCheck,
    color: 'bg-sage',
    content: [
      { label: 'QR Self Check-In', value: 'Instant', icon: Smartphone },
      { label: 'Manual Entry', value: 'Usher-friendly', icon: ClipboardCheck },
      { label: 'Service History', value: 'Full records', icon: Clock },
      { label: 'Absentee Detection', value: 'Automatic', icon: ListChecks },
    ],
  },
  {
    id: 'announcements',
    title: 'Send Announcements',
    narration: 'The pastor sends an announcement to the entire congregation via SMS and in-app notifications. Everyone stays informed.',
    icon: Megaphone,
    color: 'bg-signal',
    content: [
      { label: 'SMS via Termii', value: 'Bulk send', icon: Megaphone },
      { label: 'In-App Notifications', value: 'Real-time', icon: Bell },
      { label: 'Milestones', value: 'Celebrated', icon: Cake },
      { label: 'Targeted Messages', value: 'By role/department', icon: Users },
    ],
  },
  {
    id: 'followup',
    title: 'Follow-Up Dashboard',
    narration: 'Gathrd flags visitors who need contact, members who\'ve stopped attending, and discipleship stalls — so the team can act fast.',
    icon: ListChecks,
    color: 'bg-gold',
    content: [
      { label: 'Visitor Flags', value: 'New visitors', icon: UserPlus },
      { label: 'Stalled Discipleship', value: 'Detected', icon: Sparkles },
      { label: 'Absent Members', value: '2+ weeks absent', icon: Clock },
      { label: 'Action Required', value: 'Prioritized', icon: ListChecks },
    ],
  },
  {
    id: 'discipleship',
    title: 'Discipleship Tracking',
    narration: 'Track every member\'s spiritual journey. Celebrate milestones and identify those who need extra care.',
    icon: Sparkles,
    color: 'bg-sage',
    content: [
      { label: 'Progress Tracking', value: 'Visual', icon: Sparkles },
      { label: 'Milestones', value: 'Celebrated', icon: Cake },
      { label: 'Stalled Detection', value: 'Automatic', icon: Clock },
      { label: 'Care Alerts', value: 'Pastor notified', icon: Bell },
    ],
  },
  {
    id: 'billing',
    title: 'Subscription & Billing',
    narration: 'After the 60-day trial, pick a plan: Regular (₦10k), Multi-Leader (₦15k), District (₦20k), Zone (₦50k). Automatic billing via Paystack — cancel anytime.',
    icon: Wallet,
    color: 'bg-signal',
    content: [
      { label: '60-Day Free Trial', value: 'No card needed', icon: Clock },
      { label: 'Automatic Billing', value: 'Monthly', icon: Wallet },
      { label: 'Grace Period', value: '3 days', icon: Shield },
      { label: 'Plan Management', value: 'Self-service', icon: Settings },
    ],
  },
  {
    id: 'pwa',
    title: 'Installable & Mobile-Friendly',
    narration: 'Gathrd is a Progressive Web App — install it on any device, use it offline, and get a native app experience.',
    icon: Smartphone,
    color: 'bg-gold',
    content: [
      { label: 'Installable', value: 'Any device', icon: Smartphone },
      { label: 'Offline Support', value: 'Works offline', icon: Shield },
      { label: 'Push Notifications', value: 'Real-time', icon: Bell },
      { label: 'Mobile-First', value: 'Responsive', icon: Smartphone },
    ],
  },
];

export default function Demo() {
  const [currentScene, setCurrentScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % DEMO_SCENES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  const scene = DEMO_SCENES[currentScene];
  const Icon = scene.icon;

  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center px-4 py-10">
      <div className="text-center mb-8">
        <BackButton to="/" label="Back to Home" />
        <h1 className="font-display text-3xl font-bold text-white">See Gathrd in Action</h1>
        <p className="text-white/50 mt-2">Follow the journey from signup to a fully managed church</p>
      </div>

      {/* Demo Card */}
      <div className="w-full max-w-2xl bg-signal-gradient rounded-2xl p-6 shadow-2xl">
        <div className="bg-white rounded-xl p-6">
          {/* Scene Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl ${scene.color} flex items-center justify-center`}>
              <Icon size={24} className="text-white" />
            </div>
            <div>
              <h2 className="font-display font-bold text-ink text-xl">{scene.title}</h2>
            </div>
          </div>

          {/* Narration */}
          <div className="bg-parchment rounded-lg p-4 mb-4 border-l-4 border-signal">
            <p className="text-ink/70 text-sm leading-relaxed">
              <span className="font-semibold text-ink">Narration: </span>
              {scene.narration}
            </p>
          </div>

          {/* Scene Content */}
          <div className="grid grid-cols-2 gap-3">
            {scene.content.map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.label} className="bg-parchment rounded-lg p-3 flex items-center gap-3">
                  <ItemIcon size={18} className="text-signal shrink-0" />
                  <div>
                    <p className="text-xs text-ink/50">{item.label}</p>
                    <p className="font-semibold text-ink text-sm">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-1 bg-ink/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-signal transition-all duration-1000"
              style={{ width: `${((currentScene + 1) / DEMO_SCENES.length) * 100}%` }}
            />
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {DEMO_SCENES.map((_, i) => (
              <button
                key={i}
                onClick={() => { setCurrentScene(i); setIsPlaying(false); }}
                className={`w-2 h-2 rounded-full transition-colors ${i === currentScene ? 'bg-signal' : 'bg-ink/20'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="flex items-center gap-2 bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {isPlaying ? 'Pause' : 'Play'} Demo
        </button>
        <Link to="/signup" className="flex items-center gap-2 bg-gold hover:bg-gold-light text-ink font-semibold px-4 py-2 rounded-lg transition-colors">
          Start Free Trial <ArrowRight size={16} />
        </Link>
      </div>

      {/* Scene Counter */}
      <p className="text-white/30 text-xs mt-4">
        Scene {currentScene + 1} of {DEMO_SCENES.length}
      </p>

      {/* Thumbnail Navigation */}
      <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl">
        {DEMO_SCENES.map((s, i) => {
          const ThumbIcon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => { setCurrentScene(i); setIsPlaying(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                i === currentScene ? 'bg-signal text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
              }`}
            >
              <ThumbIcon size={14} /> {s.title.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
