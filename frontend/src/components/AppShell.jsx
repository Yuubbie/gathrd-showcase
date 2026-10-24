import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserPlus, Wallet, ClipboardCheck,
  Megaphone, Cake, UsersRound, Settings as SettingsIcon, Menu, X, LogOut,
  CreditCard, Building2, BarChart3, CalendarDays, Calendar, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import WhatsAppButton from './WhatsAppButton';
import InstallPrompt from './InstallPrompt';

const PRIMARY_NAV = [
  { to: '/dashboard', label: 'Today', icon: LayoutDashboard, roles: null },
  { to: '/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
  { to: '/members', label: 'People', icon: Users, roles: ['senior_pastor', 'assistant_pastor', 'church_admin', 'cell_leader'], prefixes: ['/members', '/visitors', '/follow-up', '/discipleship'] },
  { to: '/give/me', label: 'Giving', icon: Wallet, roles: null, prefixes: ['/give', '/giving'] },
  { to: '/cell-groups', label: 'Cell Groups', icon: UsersRound, roles: ['senior_pastor', 'assistant_pastor', 'church_admin', 'cell_leader'] },
];

const MORE_NAV = [
  { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
  { to: '/roster', label: 'Roster', icon: CalendarDays, roles: null },
  { to: '/calendar', label: 'Calendar', icon: Calendar, roles: null },
  { to: '/milestones', label: 'Milestones', icon: Cake, roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
  { to: '/branches', label: 'My Branches', icon: Building2, roles: ['senior_pastor', 'assistant_pastor', 'church_admin'], hideForBranch: true },
  { to: '/district-dashboard', label: 'District Dashboard', icon: BarChart3, roles: ['senior_pastor', 'assistant_pastor', 'church_admin'], hideForBranch: true },
  { to: '/billing', label: 'Billing', icon: CreditCard, roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
];

const ROLE_LABELS = {
  senior_pastor: 'Senior Pastor',
  assistant_pastor: 'Assistant Pastor',
  church_admin: 'Church Admin',
  finance_admin: 'Finance Admin',
  department_head: 'Department Head',
  cell_leader: 'Cell Leader',
  childrens_teacher: "Children's Teacher",
  member: 'Member',
};

function itemVisible(item, profile, hierarchyLevel) {
  if (item.roles && !item.roles.includes(profile?.role)) return false;
  if (item.hideForBranch && hierarchyLevel === 'branch') return false;
  return true;
}

function itemActive(item, currentPath) {
  const paths = item.prefixes || [item.to];
  return paths.some((p) => currentPath === p || currentPath.startsWith(`${p}/`));
}

function NavLinkItem({ item, currentPath, onNavigate }) {
  const active = itemActive(item, currentPath);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? 'bg-white/10 text-gold-light border-l-2 border-gold -ml-px pl-[11px]' : 'text-white/60 hover:text-white hover:bg-white/10 border-l-2 border-transparent'
      }`}
    >
      <Icon size={18} strokeWidth={2} />
      {item.label}
    </Link>
  );
}

function NavLinks({ profile, currentPath, onNavigate, hierarchyLevel }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = PRIMARY_NAV.filter((item) => itemVisible(item, profile, hierarchyLevel));
  const more = MORE_NAV.filter((item) => itemVisible(item, profile, hierarchyLevel));
  const moreActive = more.some((item) => itemActive(item, currentPath));

  return (
    <nav className="flex-1 space-y-1 px-3">
      {primary.map((item) => (
        <NavLinkItem key={item.to} item={item} currentPath={currentPath} onNavigate={onNavigate} />
      ))}
      {more.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              moreActive && !moreOpen ? 'bg-white/10 text-gold-light' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>More</span>
            <ChevronDown size={16} className={moreOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
          {moreOpen && (
            <div className="mt-1 space-y-1 pl-1">
              {more.map((item) => (
                <NavLinkItem key={item.to} item={item} currentPath={currentPath} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default function AppShell({ children }) {
  const { profile, church, signOut } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const brandColor = church?.brand_color || '#1B3A5C';

  return (
    <div className="min-h-screen bg-parchment md:flex">
      <aside className="hidden md:flex md:w-64 md:flex-col h-screen overflow-y-auto shrink-0" style={{ background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}dd 100%)` }}>
        <div className="px-5 py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {church?.logo_url ? (
                <img src={church.logo_url} alt={church.name || 'Church'} className="h-9 w-9 object-contain rounded-lg bg-white/10 p-1" />
              ) : (
                <img src="/logo-mark.png" alt="Gathrd" className="h-9 w-9" />
              )}
              <span className="font-display font-bold text-white text-lg">Gathrd</span>
            </div>
            <NotificationBell />
          </div>
          {church?.name && (
            <p className="text-white/50 text-xs mt-1.5 truncate" title={church.name}>
              {church.name}
            </p>
          )}
        </div>
        <NavLinks profile={profile} hierarchyLevel={church?.hierarchy_level} currentPath={location.pathname} />
        <div className="p-3 mt-auto space-y-2">
          {['senior_pastor', 'assistant_pastor', 'church_admin'].includes(profile?.role) && (
            <>
              <Link to="/settings" className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-1">
                <SettingsIcon size={14} /> Church Settings
              </Link>
              <Link to="/team/invite" className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-1">
                <UserPlus size={14} /> Invite Staff
              </Link>
            </>
          )}
          <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
              <p className="text-xs text-white/60">{ROLE_LABELS[profile?.role]}</p>
            </div>
            <button onClick={signOut} className="text-white/60 hover:text-white shrink-0 ml-2" aria-label="Log out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="md:hidden flex items-center justify-between px-4 py-3" style={{ background: brandColor }}>
        <div className="flex items-center gap-2">
          {church?.logo_url ? (
            <img src={church.logo_url} alt={church.name || 'Church'} className="h-7 w-7 object-contain rounded-lg bg-white/10 p-0.5" />
          ) : (
            <img src="/logo-mark.png" alt="Gathrd" className="h-7 w-7" />
          )}
          <span className="font-display font-bold text-white">Gathrd</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button onClick={() => setDrawerOpen(true)} className="text-white" aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-void/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 flex flex-col overflow-y-auto" style={{ background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}dd 100%)` }}>
            <div className="flex items-start justify-between px-5 py-6">
              <div>
                <div className="flex items-center gap-2">
                  <img src="/logo-mark.png" alt="Gathrd" className="h-9 w-9" />
                  <span className="font-display font-bold text-white text-lg">Gathrd</span>
                </div>
                {church?.name && (
                  <p className="text-white/50 text-xs mt-1.5 truncate max-w-[160px]" title={church.name}>
                    {church.name}
                  </p>
                )}
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-white/70" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <NavLinks profile={profile} hierarchyLevel={church?.hierarchy_level} currentPath={location.pathname} onNavigate={() => setDrawerOpen(false)} />
            <div className="p-3 mt-auto space-y-2">
              {['senior_pastor', 'assistant_pastor', 'church_admin'].includes(profile?.role) && (
                <>
                  <Link to="/settings" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-1">
                    <SettingsIcon size={14} /> Church Settings
                  </Link>
                  <Link to="/team/invite" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 text-xs text-white/50 hover:text-white px-1">
                    <UserPlus size={14} /> Invite Staff
                  </Link>
                </>
              )}
              <div className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
                  <p className="text-xs text-white/60">{ROLE_LABELS[profile?.role]}</p>
                </div>
                <button onClick={signOut} className="text-white/60 hover:text-white shrink-0 ml-2" aria-label="Log out">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">{children}</main>

      <WhatsAppButton
        message={`Hello Gathrd, I'm ${profile?.full_name || 'a user'} from ${church?.name || 'my church'}. I need help with: `}
      />
      <InstallPrompt offsetForSidebar />
    </div>
  );
}
