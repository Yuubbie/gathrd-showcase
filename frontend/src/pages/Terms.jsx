import LegalLayout, { Section, List, CONTACT_EMAIL } from '../components/LegalLayout';

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated="21 November 2026"
      intro="These are the simple rules for using Gathrd. By creating an account or joining a church on Gathrd, you agree to them. Please also read our Privacy Policy."
    >
      <Section title="1. Using Gathrd">
        <p>
          Gathrd is for churches and their teams. You are responsible for keeping your login safe and for what happens in your
          account. If you think someone else has your password, change it and tell us.
        </p>
      </Section>

      <Section title="2. Free trial, plans and payment">
        <List
          items={[
            'Every new church gets a 30-day free trial.',
            'After the trial, a church continues on a monthly plan paid through Paystack. Plan prices and member limits are shown on the Billing page and our website.',
            'If online payment is not yet available for your church when your trial ends, your access continues until it is. We will give church leaders at least 14 days\' notice by email and in the app before payment is required.',
            'If a payment ends, you get 7 days to subscribe. After that your church becomes read-only: you can still view and export everything, but you cannot add or change records.',
            'We do not delete your information because a payment is missed. Subscribing again restores full access.',
            'You can cancel at any time and keep access until the end of the period you have already paid for.',
          ]}
        />
      </Section>

      <Section title="3. Your information and your responsibilities">
        <p>Your church&apos;s records belong to your church. When you use Gathrd, you promise that:</p>
        <List
          items={[
            'you have the right to record the information you enter;',
            'you have told people how their information is used, and have their permission where the law requires it, especially for children and for medical details;',
            'you will keep the information accurate and use it only for church purposes.',
          ]}
        />
      </Section>

      <Section title="4. What you must not do">
        <List
          items={[
            'break the law, or use Gathrd to harass, deceive or send spam;',
            "try to see another church's information, or get around the limits of your role or plan;",
            'attack, overload or damage the service.',
          ]}
        />
      </Section>

      <Section title="5. Money">
        <p>
          Gathrd does not hold, move or guarantee church giving. Gifts go by bank transfer to the church&apos;s own bank account.
          Your finance team is responsible for checking transfers against the bank statement before marking them as verified.
        </p>
      </Section>

      <Section title="6. The service">
        <p>
          We work hard to keep Gathrd running, but we cannot promise it will never be interrupted or free of mistakes. We may
          improve or change features, and we will tell you about important changes.
        </p>
      </Section>

      <Section title="7. Suspending or ending your account">
        <p>
          We may suspend an account for misuse or serious non-payment. You can close your account at any time, and we encourage
          you to export your records first. What happens to information after an account closes is explained in our Privacy
          Policy.
        </p>
      </Section>

      <Section title="8. Our responsibility">
        <p>
          Gathrd is not responsible for losses caused by mistakes in the information you enter, or by things outside our control
          such as banks, networks and phone services. Nothing in these terms takes away rights you have under Nigerian law.
        </p>
      </Section>

      <Section title="9. Who owns what">
        <p>
          We own the Gathrd software and brand. You own your church&apos;s information, and you let us store and process it so we
          can provide the service to you.
        </p>
      </Section>

      <Section title="10. Law and problems">
        <p>
          Nigerian law applies to these terms. If something goes wrong, please contact us first at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-signal font-semibold hover:text-signal-deep">
            {CONTACT_EMAIL}
          </a>{' '}
          so we can try to put it right.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update these terms. If a change matters, we will tell church leaders by email or in the app before it applies.
        </p>
      </Section>
    </LegalLayout>
  );
}
