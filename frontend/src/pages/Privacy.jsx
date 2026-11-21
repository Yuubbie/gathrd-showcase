import LegalLayout, { Section, List, CONTACT_EMAIL } from '../components/LegalLayout';

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="21 November 2026"
      intro="This page explains, in plain words, what information Gathrd keeps, why, who can see it, and what you can ask us to do. We follow the Nigeria Data Protection Act 2023 (NDPA)."
    >
      <Section title="1. Who we are">
        <p>
          Gathrd is software that helps Nigerian churches look after their people. There are two kinds of information, and
          responsibility is different for each:
        </p>
        <List
          items={[
            "The church's records (members, visitors, children, attendance, giving). Your church decides what to record and why. Gathrd looks after this information for the church and follows the church's instructions.",
            'The account of the person who signs up (name, email, phone, password). For this, Gathrd is responsible.',
          ]}
        />
        <p>
          You can reach us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-signal font-semibold hover:text-signal-deep">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </Section>

      <Section title="2. What we collect">
        <List
          items={[
            'Account details: name, email, phone, role, and a password (stored in scrambled form, never in plain text).',
            "Member details a church chooses to record: name, phone, email, address, date of birth, gender, marital status, occupation, state and local government, cell group, department, next of kin, and social media handles.",
            "Children's records: name, boy or girl, and attendance. These are kept on a separate list from adults.",
            'Attendance, visitors and follow-up notes, cell group reports, souls won, and message highlights.',
            'Giving records: amount, category, date, who gave, tithe card number, and the transfer receipt a member uploads.',
            "Medical details (blood group and genotype): only if the church switches this on and records the member's consent.",
            'If you allow phone alerts: a code that identifies your device, so alerts can reach it.',
            'Technical logs kept by our hosting providers, and a log of the emails we send.',
          ]}
        />
      </Section>

      <Section title="3. Why we use it">
        <p>
          To run the features your church uses, send reminders and alerts, bill churches for their plan, keep the service
          secure, and give support. We do not sell your information, show advertising, or build profiles of people.
        </p>
        <p>
          Our reasons under the NDPA are: you asked us to provide the service; you agreed (for medical details and phone
          alerts); we need to keep the service secure; and the law sometimes requires it.
        </p>
      </Section>

      <Section title="4. Who can see it">
        <List
          items={[
            'Each church can see only its own information. Another church cannot see it. This is enforced in the database itself, not only on the screen.',
            'Inside a church, people see only what their role needs. For example, finance sees giving, a children\'s teacher sees the children\'s list, and a cell leader sees their cell group.',
            'A head church that oversees branches can see summary figures for those branches.',
            'A small number of Gathrd administrators can open church information only to give support, fix a problem, or protect the service.',
          ]}
        />
      </Section>

      <Section title="5. Where it is kept, and who helps us">
        <List
          items={[
            'Supabase: our database, login and file storage. The data centre is in Ireland (European Union).',
            'Vercel: hosts the website.',
            'Resend: sends our emails (for example the welcome and confirmation emails).',
            'Paystack: takes churches\' subscription payments. We never see or store card numbers.',
            'Phone alert services run by Google, Apple or Mozilla carry alerts to your phone.',
            "YouTube: our guide video uses YouTube's privacy-enhanced player, and only loads when you press play.",
          ]}
        />
        <p>
          Some of these providers are outside Nigeria, so your information may be processed abroad. We choose providers with
          strong security and agreements that protect it.
        </p>
      </Section>

      <Section title="6. Money">
        <p>
          <strong>Gathrd never holds church money.</strong> Members send gifts by bank transfer straight to the
          church&apos;s own bank account. We only record that a transfer was reported, and the receipt a member uploads, so the
          church&apos;s finance team can check it against the bank statement.
        </p>
      </Section>

      <Section title="7. Children">
        <p>
          Churches should have a parent&apos;s or guardian&apos;s permission before recording a child, and we recommend recording
          only a name and attendance. A parent or guardian can ask the church, or us, to correct or delete a child&apos;s record.
        </p>
      </Section>

      <Section title="8. How long we keep it">
        <p>
          We keep a church&apos;s information while it has an account. If a church closes its account, we delete or anonymise
          its information within 90 days, except records the law requires us to keep, such as billing records.
        </p>
      </Section>

      <Section title="9. Your rights">
        <p>You can ask us to:</p>
        <List
          items={[
            'show you the information held about you',
            'correct it if it is wrong',
            'delete it',
            'limit or object to how it is used',
            'give you a copy you can take elsewhere',
            'stop using it where you agreed to it (withdraw your consent)',
          ]}
        />
        <p>
          For church records such as membership, please ask your church first; it is responsible for them, and we will help it
          respond. You can also write to us directly at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-signal font-semibold hover:text-signal-deep">
            {CONTACT_EMAIL}
          </a>
          . We will reply within 30 days and may ask you to prove who you are. If you are not happy, you may complain to the
          Nigeria Data Protection Commission.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          We use secure connections (HTTPS), keep passwords in scrambled form, separate each church&apos;s information in the
          database, and keep a record of changes to bank details. If a data breach could harm people, we will tell the affected
          churches and the Nigeria Data Protection Commission within 72 hours, as the law requires.
        </p>
      </Section>

      <Section title="11. Cookies and storage">
        <p>
          We keep only what is needed to log you in and remember your settings. We do not use advertising cookies.
        </p>
      </Section>

      <Section title="12. Changes">
        <p>
          If we make an important change to this policy, we will tell church leaders by email or in the app. The date at the top
          shows when it was last updated.
        </p>
      </Section>
    </LegalLayout>
  );
}
