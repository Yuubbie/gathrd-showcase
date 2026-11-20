// Creates the extra demo logins for the "Grace Chapel Demo" church (idempotent).
//
// These accounts exist so the Team page, leaders and role-based screens look real, and so
// a screen can be recorded as a cell leader, finance admin, teacher or ordinary member.
// They use example.com addresses (never deliverable) and random passwords nobody knows.
// To record as one of them, set a password in Supabase: Authentication > Users > the user.
//
// Usage (PowerShell):
//   $env:SUPABASE_URL = "https://<project>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "<service role key>"
//   node scripts/create-demo-staff.mjs
import { randomBytes } from 'node:crypto';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHURCH_ID = '986dc44c-a1fc-4435-b8bc-415244a175f1'; // Grace Chapel Demo

if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const STAFF = [
  ['demo.assistant.pastor@example.com', 'Pastor Chidinma Okeke', 'assistant_pastor'],
  ['demo.finance@example.com', 'Mrs Folake Adeyemi', 'finance_admin'],
  ['demo.ushering.head@example.com', 'Bro. Segun Balogun', 'department_head'],
  ['demo.choir.head@example.com', 'Sis. Amaka Eze', 'department_head'],
  ['demo.outreach.head@example.com', 'Bro. Kelechi Obi', 'department_head'],
  ['demo.cell.apo@example.com', 'Bro. Ibrahim Musa', 'cell_leader'],
  ['demo.cell.lugbe@example.com', 'Sis. Ngozi Eze', 'cell_leader'],
  ['demo.cell.kubwa@example.com', 'Bro. Yusuf Danjuma', 'cell_leader'],
  ['demo.cell.gwarinpa@example.com', 'Sis. Blessing Udoh', 'cell_leader'],
  ['demo.children.teacher@example.com', 'Sis. Titilayo Ajayi', 'childrens_teacher'],
  ['demo.media@example.com', 'Bro. Obinna Nwosu', 'media_team'],
  ['demo.member@example.com', 'Sis. Chiamaka Okafor', 'member'],
];

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

async function existingEmails() {
  const found = new Set();
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers });
    if (!res.ok) throw new Error(`Could not list users (${res.status})`);
    const { users } = await res.json();
    if (!users?.length) break;
    users.forEach((u) => found.add((u.email || '').toLowerCase()));
    if (users.length < 200) break;
  }
  return found;
}

const have = await existingEmails();
for (const [email, fullName, role] of STAFF) {
  if (have.has(email)) {
    console.log(`exists   ${email}`);
    continue;
  }
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password: randomBytes(24).toString('base64url'),
      email_confirm: true,
      user_metadata: { full_name: fullName, role, church_id: CHURCH_ID },
    }),
  });
  console.log(res.ok ? `created  ${email} (${role})` : `FAILED   ${email}: ${res.status} ${await res.text()}`);
}
