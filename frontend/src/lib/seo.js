export const SITE_URL = 'https://gathrd.com.ng';
export const SITE_NAME = 'Gathrd';

export const DEFAULT_SEO = {
  title: 'Gathrd — Church Operating System for Nigerian Churches',
  description:
    'Gathrd is church management software for Nigerian churches. Run Sunday attendance, member records, giving, visitor follow-up, and cell groups from one dashboard.',
  path: '/',
  noIndex: true,
};

export const PAGE_SEO = {
  '/': {
    title: 'Gathrd — Church Management Software for Nigerian Churches',
    description:
      'Gathrd is the church operating system for Nigeria. Track Sunday attendance, members, tithes and offering, visitors, and cell groups. Start a free trial.',
    path: '/',
  },
  '/demo': {
    title: 'Watch the Gathrd Demo — Church Operating System',
    description:
      'See how Nigerian churches run Sunday check-in, duty roster, giving, and follow-up in Gathrd. Watch the live demo, then start a free trial.',
    path: '/demo',
  },
  '/login': {
    title: 'Sign in to Gathrd',
    description: 'Sign in to your church dashboard on Gathrd. Manage attendance, people, giving, and Sunday operations.',
    path: '/login',
  },
  '/signup': {
    title: 'Start a Free Gathrd Trial for Your Church',
    description:
      'Create your church on Gathrd. 30-day free trial. No credit card. Built for pastors and admins in Nigeria.',
    path: '/signup',
  },
};

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
