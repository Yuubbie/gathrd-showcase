export const SOUL_FOLLOW_UP_STEPS = [
  {
    step: 1,
    label: 'Encourage',
    template:
      'Hello {name}, I am so glad God touched your life. Jesus loves you, and I am praying for you. You are not walking alone.',
  },
  {
    step: 2,
    label: 'Check in',
    template:
      'Hi {name}, how are you doing? I have been praying for you. Come worship with us at {church} this week — I will be glad to sit with you.',
  },
  {
    step: 3,
    label: 'Invite to church',
    template:
      'Dear {name}, our church family at {church} would love to see you this Sunday. Come as you are. God has a word for you, and a place for you here.',
  },
  {
    step: 4,
    label: 'Keep walking',
    template:
      'Hello {name}, just checking in. Keep holding on to Jesus. You are always welcome at {church}. If you need prayer or a ride, tell me — I am here.',
  },
];

export function fillSoulMessage(template, { name, church }) {
  return String(template || '')
    .replaceAll('{name}', name || 'friend')
    .replaceAll('{church}', church || 'our church');
}

export function nextSoulStep(timesReached) {
  const n = Number(timesReached || 0);
  const index = Math.min(Math.max(n, 0), SOUL_FOLLOW_UP_STEPS.length - 1);
  return SOUL_FOLLOW_UP_STEPS[index];
}

export function timesReachedLabel(count) {
  const n = Number(count || 0);
  if (n === 1) return 'Reached 1 time';
  return `Reached ${n} times`;
}
