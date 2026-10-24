import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function isActive(pathname, to, prefixes) {
  const paths = prefixes || [to];
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function TabBar({ items }) {
  const location = useLocation();
  if (!items.length) return null;

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-ink/10">
      {items.map((item) => {
        const active = isActive(location.pathname, item.to, item.prefixes);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`shrink-0 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
              active ? 'text-signal border-b-2 border-signal' : 'text-ink/50 hover:text-ink'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function PeopleTabs() {
  const { profile } = useAuth();
  const role = profile?.role;
  const items = [
    { to: '/members', label: 'Members', prefixes: ['/members'], roles: ['senior_pastor', 'assistant_pastor', 'church_admin', 'cell_leader'] },
    { to: '/visitors', label: 'Visitors', prefixes: ['/visitors'], roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
    { to: '/follow-up', label: 'Follow-up', roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
    { to: '/discipleship', label: 'Converts', roles: ['senior_pastor', 'assistant_pastor', 'church_admin'] },
  ].filter((item) => !item.roles || item.roles.includes(role));

  if (items.length < 2) return null;
  return <TabBar items={items} />;
}

export function GivingTabs() {
  const { profile } = useAuth();
  const role = profile?.role;
  const items = [
    { to: '/give/me', label: 'Receive', roles: null },
    { to: '/giving/transfers', label: 'Verify', roles: ['senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin'] },
    { to: '/giving', label: 'Cash', roles: ['senior_pastor', 'assistant_pastor', 'finance_admin'] },
    { to: '/giving/counting', label: 'Count', roles: ['senior_pastor', 'assistant_pastor', 'finance_admin'] },
    { to: '/giving/bank-accounts', label: 'Bank', roles: ['senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin'] },
  ].filter((item) => !item.roles || item.roles.includes(role));

  if (items.length < 2) return null;
  return <TabBar items={items} />;
}
