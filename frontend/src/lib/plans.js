// frontend/src/lib/plans.js
// Single source of truth for Gathrd pricing, trial length and plan features.
// Change prices or limits HERE only. Landing, Billing and Demo read from this file.

// Flip to true only after the Paystack plans are created and the billing backend is updated.
export const CHECKOUT_READY = false;

// Free trial length in days for all new churches.
export const TRIAL_DAYS = 30;

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 3500,
    memberCap: 200,
    popular: false,
    desc: 'For small churches getting organised',
    audience: 'One church',
    features: [
      'Up to 200 members',
      'Members registry',
      'Attendance (QR and manual)',
      'Visitors',
      'Online giving',
      'Announcements',
      'Milestones',
      'Your church branding',
      'Email support',
    ],
  },
  {
    id: 'regular',
    name: 'Regular',
    price: 7500,
    memberCap: 1000,
    popular: true,
    desc: 'For growing churches that follow up and disciple',
    audience: 'One church',
    features: [
      'Up to 1,000 members',
      'Everything in Starter',
      'Cell groups',
      'Discipleship',
      'Follow-up',
      'Counting sheets',
      'Top givers and giving history',
      'Email support',
    ],
  },
  {
    id: 'district',
    name: 'District',
    price: 15000,
    memberCap: 2000,
    popular: false,
    desc: 'For districts that oversee several branches',
    audience: 'District and all its branches',
    features: [
      'Up to 2,000 members across the district and its branches',
      'Everything in Regular',
      'Branch invitations',
      'Oversight dashboard',
      'Needs-a-check-in alerts',
      'CSV export',
      'Branches covered, one invoice',
      'Priority support',
    ],
  },
  {
    id: 'zone',
    name: 'Zone',
    price: 30000,
    memberCap: 7500,
    popular: false,
    desc: 'For zones that oversee districts and branches',
    audience: 'Zone, its districts and all their branches',
    features: [
      'Up to 7,500 members across the whole zone',
      'Everything in District',
      'Oversight of districts',
      'Branches and districts covered, one invoice',
      'Dedicated support',
    ],
  },
];

// Rows for the feature comparison table.
// A value of true = included, false = not included, a string = shown as text.
export const COMPARISON = [
  { label: 'Member limit', starter: '200', regular: '1,000', district: '2,000 (whole district)', zone: '7,500 (whole zone)' },
  { label: 'Free trial', starter: TRIAL_DAYS + ' days', regular: TRIAL_DAYS + ' days', district: TRIAL_DAYS + ' days', zone: TRIAL_DAYS + ' days' },
  { label: 'Members registry', starter: true, regular: true, district: true, zone: true },
  { label: 'Attendance (QR and manual)', starter: true, regular: true, district: true, zone: true },
  { label: 'Visitors', starter: true, regular: true, district: true, zone: true },
  { label: 'Online giving', starter: true, regular: true, district: true, zone: true },
  { label: 'Announcements', starter: true, regular: true, district: true, zone: true },
  { label: 'Milestones', starter: true, regular: true, district: true, zone: true },
  { label: 'Church branding', starter: true, regular: true, district: true, zone: true },
  { label: 'Cell groups', starter: false, regular: true, district: true, zone: true },
  { label: 'Discipleship', starter: false, regular: true, district: true, zone: true },
  { label: 'Follow-up', starter: false, regular: true, district: true, zone: true },
  { label: 'Counting sheets', starter: false, regular: true, district: true, zone: true },
  { label: 'Top givers and giving history', starter: false, regular: true, district: true, zone: true },
  { label: 'Branch invitations', starter: false, regular: false, district: true, zone: true },
  { label: 'Oversight dashboard', starter: false, regular: false, district: true, zone: true },
  { label: 'Needs-a-check-in alerts', starter: false, regular: false, district: true, zone: true },
  { label: 'CSV export', starter: false, regular: false, district: true, zone: true },
  { label: 'Branches covered, one invoice', starter: false, regular: false, district: true, zone: true },
  { label: 'Oversight of districts', starter: false, regular: false, district: false, zone: true },
  { label: 'Support', starter: 'Email', regular: 'Email', district: 'Priority', zone: 'Dedicated' },
];

// Formats a number as Naira, for example 7500 becomes "₦7,500".
// The symbol is written as an escape code so it stays correct in any editor.
export function formatNaira(amount) {
  return '\u20A6' + Number(amount).toLocaleString('en-NG');
}

// Finds a plan by id. The old 'multi-leader' plan is shown as Regular for display only.
export function getPlan(id) {
  const key = id === 'multi-leader' ? 'regular' : id;
  return PLANS.find((p) => p.id === key) || null;
}