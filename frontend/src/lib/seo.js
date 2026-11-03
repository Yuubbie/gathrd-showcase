export const SITE_URL = 'https://gathrd.com.ng';
export const SITE_NAME = 'Gathrd';
export const OG_IMAGE = `${SITE_URL}/logo.png`;

export const PRIMARY_KEYWORDS =
  'church management platform in Nigeria, church management software Nigeria, church management system, ChMS Nigeria, church management application, best church management software in Nigeria';

export const DEFAULT_SEO = {
  title: 'Gathrd | Church Management Platform in Nigeria (ChMS)',
  description:
    'Gathrd is a church management platform in Nigeria. Run memberships, donations, visitor follow-ups, child check-in, and multi-branch operations in one church management system (ChMS).',
  path: '/',
  keywords: PRIMARY_KEYWORDS,
  noIndex: true,
};

export const PAGE_SEO = {
  '/': {
    title: 'Gathrd | Church Management Platform in Nigeria (ChMS)',
    description:
      'Gathrd is a church management platform in Nigeria. Track memberships, donations, visitor follow-ups, child check-in, cell groups, and multi-branch operations. Start a free Naira trial.',
    path: '/',
    keywords: PRIMARY_KEYWORDS,
  },
  '/demo': {
    title: 'Watch the Gathrd Demo | Church Management Software in Nigeria',
    description:
      'See a church management system built for Nigerian churches: Sunday check-in, duty roster, giving, visitor follow-up, and multi-branch operations. Then start a free trial.',
    path: '/demo',
    keywords: PRIMARY_KEYWORDS,
  },
  '/login': {
    title: 'Sign in to Gathrd | Church Management System Nigeria',
    description: 'Sign in to your Gathrd church management platform. Manage attendance, people, giving, and Sunday operations.',
    path: '/login',
    keywords: PRIMARY_KEYWORDS,
  },
  '/signup': {
    title: 'Start a Free Gathrd Trial | Church Management Platform Nigeria',
    description:
      'Create your church on Gathrd, a church management platform in Nigeria. 30-day free trial, priced in Naira, no credit card.',
    path: '/signup',
    keywords: PRIMARY_KEYWORDS,
  },
  '/church-management-platform-nigeria': {
    title: 'Church Management Platform in Nigeria | Gathrd ChMS',
    description:
      'Gathrd is a church management platform in Nigeria. Run memberships, donations, visitor follow-ups, child check-in, and multi-branch operations in one ChMS. Priced in Naira.',
    path: '/church-management-platform-nigeria',
    keywords: PRIMARY_KEYWORDS,
  },
};

export function absoluteUrl(path = '/') {
  if (!path || path === '/') return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
