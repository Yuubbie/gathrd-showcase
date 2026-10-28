import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

const STATUS_OPTIONS = [
  ['active', 'Active'],
  ['inactive', 'Inactive'],
  ['new_convert', 'New Convert'],
  ['worker', 'Worker'],
  ['transferred_out', 'Transferred Out'],
  ['deceased', 'Deceased'],
];

const emptyForm = {
  full_name: '', phone: '', email: '', date_of_birth: '', gender: '',
  marital_status: '', residential_address: '', state_of_origin: '', lga: '',
  occupation: '', cell_group_id: '', status: 'active', date_joined: '',
  photo_url: '', wedding_anniversary: '', blood_group: '', genotype: '',
  born_again_date: '', next_of_kin_name: '', next_of_kin_phone: '',
  age_group: 'adult',
};

export default function MemberForm() {
  const { id } = useParams(); // present when editing
  const isEditing = !!id;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromChildren = searchParams.get('from') === 'children' || profile?.role === 'childrens_teacher';

  const [form, setForm] = useState({ ...emptyForm, age_group: fromChildren ? 'child' : 'adult' });
  const [cellGroups, setCellGroups] = useState([]);
  const [medicalEnabled, setMedicalEnabled] = useState(false);
  const [medicalConsent, setMedicalConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [showMore, setShowMore] = useState(!!id);

  useEffect(() => {
    async function loadContext() {
      if (!profile?.church_id) {
        setError('Your account isn\'t linked to a church yet. Please contact support.');
        setLoading(false);
        return;
      }

      const [{ data: church }, { data: cells }] = await Promise.all([
        supabase.from('churches').select('medical_data_enabled').eq('id', profile.church_id).single(),
        supabase.from('cell_groups').select('id, name').eq('church_id', profile.church_id).is('deleted_at', null),
      ]);

      if (church) setMedicalEnabled(church.medical_data_enabled);
      if (cells) setCellGroups(cells);

      if (isEditing) {
        const { data: member, error } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single();
        if (error) {
          setError('Could not load this member.');
        } else if (member) {
          setForm({ ...emptyForm, ...member, cell_group_id: member.cell_group_id || '' });
        }
      }
      setLoading(false);
    }
    loadContext();
  }, [profile, id, isEditing]);

  useEffect(() => {
    if (fromChildren && !isEditing) {
      setForm((f) => (f.age_group === 'child' ? f : { ...f, age_group: 'child' }));
    }
  }, [fromChildren, isEditing]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      ...form,
      church_id: profile.church_id,
      cell_group_id: form.cell_group_id || null,
      date_of_birth: form.date_of_birth || null,
      wedding_anniversary: form.wedding_anniversary || null,
      born_again_date: form.born_again_date || null,
      date_joined: form.date_joined || new Date().toISOString().slice(0, 10),
      age_group: profile?.role === 'childrens_teacher' ? 'child' : (form.age_group === 'child' ? 'child' : 'adult'),
      gender: form.gender || null,
      // Never persist medical fields unless both the church has enabled
      // it AND this admin confirmed consent was obtained from the member.
      blood_group: medicalEnabled && medicalConsent ? form.blood_group : null,
      genotype: medicalEnabled && medicalConsent ? form.genotype : null,
    };
    delete payload.id;

    const { error } = isEditing
      ? await supabase.from('members').update(payload).eq('id', id)
      : await supabase.from('members').insert({ ...payload, source: 'admin_added' });

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(fromChildren || payload.age_group === 'child' ? '/children' : '/members');
  }

  async function handleRemove() {
    if (!isEditing) return;
    const ok = window.confirm(
      `Remove ${form.full_name || 'this person'} from the member list? They will no longer show in People. You can invite them again later if needed.`
    );
    if (!ok) return;
    setError('');
    setRemoving(true);
    const { error } = await supabase
      .from('members')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    setRemoving(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate(fromChildren ? '/children' : '/members');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-parchment text-ink/50">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-6 space-y-4">
        <h1 className="text-xl font-semibold">{isEditing ? (fromChildren ? 'Edit child' : 'Edit Member') : (fromChildren ? 'Add child' : 'Add Member')}</h1>

        {error && <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>}

        <Section title="Basic Information">
          <Field label="Full name" required>
            <input required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="Phone (WhatsApp)">
            <input type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            {form.phone && (
              <div className="mt-2">
                <ContactActions phone={form.phone} name={form.full_name} />
              </div>
            )}
          </Field>
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            <p className="text-xs text-ink/40 mt-1">If you will invite them to log in, put the same email here so they do not appear twice.</p>
          </Field>
          <Field label="Adult or child" required>
            <select
              required
              disabled={profile?.role === 'childrens_teacher'}
              value={profile?.role === 'childrens_teacher' ? 'child' : (form.age_group || 'adult')}
              onChange={(e) => update('age_group', e.target.value)}
              className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors disabled:bg-ink/5"
            >
              <option value="adult">Adult</option>
              <option value="child">Child</option>
            </select>
          </Field>
          <Field label="Gender" required>
            <select required value={form.gender} onChange={(e) => update('gender', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Status" required>
            <select required value={form.status} onChange={(e) => update('status', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
              {STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>
        </Section>

        {!isEditing && (
          <p className="text-xs text-ink/50">Name, adult or child, and gender are required. Phone and the rest can wait.</p>
        )}

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="text-sm text-signal font-semibold hover:text-signal-deep"
        >
          {showMore ? 'Hide extra details' : 'More details'}
        </button>

        {showMore && (
          <>
        <Section title="More about them">
          <Field label="Date of birth">
            <input type="date" value={form.date_of_birth} onChange={(e) => update('date_of_birth', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="Marital status">
            <select value={form.marital_status} onChange={(e) => update('marital_status', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
              <option value="">Select…</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="divorced">Divorced</option>
            </select>
          </Field>
        </Section>

        <Section title="Location">
          <Field label="Residential address">
            <input value={form.residential_address} onChange={(e) => update('residential_address', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="State of origin">
            <select value={form.state_of_origin} onChange={(e) => update('state_of_origin', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
              <option value="">Select…</option>
              {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="LGA">
            <input value={form.lga} onChange={(e) => update('lga', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
        </Section>

        <Section title="Church Details">
          <Field label="Occupation / Employer">
            <input value={form.occupation} onChange={(e) => update('occupation', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="Cell group">
            <select value={form.cell_group_id} onChange={(e) => update('cell_group_id', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base bg-white focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors">
              <option value="">None</option>
              {cellGroups.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Date joined">
            <input type="date" value={form.date_joined} onChange={(e) => update('date_joined', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
        </Section>

        <Section title="Optional">
          <Field label="Wedding anniversary">
            <input type="date" value={form.wedding_anniversary} onChange={(e) => update('wedding_anniversary', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="Born-again anniversary">
            <input type="date" value={form.born_again_date} onChange={(e) => update('born_again_date', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="Next of kin name">
            <input value={form.next_of_kin_name} onChange={(e) => update('next_of_kin_name', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
          </Field>
          <Field label="Next of kin phone">
            <input type="tel" value={form.next_of_kin_phone} onChange={(e) => update('next_of_kin_phone', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" />
            {form.next_of_kin_phone && (
              <div className="mt-2">
                <ContactActions phone={form.next_of_kin_phone} name={form.next_of_kin_name || 'Next of kin'} />
              </div>
            )}
          </Field>
        </Section>

        {medicalEnabled && (
          <Section title="Medical Data">
            <div className="bg-amberflag/10 border border-amberflag/20 rounded-lg p-3 text-xs text-amberflag mb-2">
              Sensitive data. Only record this if the member has explicitly
              consented to sharing it. Confirm consent below before filling
              these fields.
            </div>
            <label className="flex items-center gap-2 text-sm mb-2">
              <input type="checkbox" checked={medicalConsent} onChange={(e) => setMedicalConsent(e.target.checked)} />
              Member has given explicit consent to store this data
            </label>
            <Field label="Blood group">
              <input disabled={!medicalConsent} value={form.blood_group} onChange={(e) => update('blood_group', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base disabled:bg-ink/5 focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="e.g. O+" />
            </Field>
            <Field label="Genotype">
              <input disabled={!medicalConsent} value={form.genotype} onChange={(e) => update('genotype', e.target.value)} className="w-full border border-ink/10 rounded-lg px-3.5 py-2.5 text-base disabled:bg-ink/5 focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors" placeholder="e.g. AA" />
            </Field>
          </Section>
        )}
          </>
        )}

        <button type="submit" disabled={saving || removing} className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Member'}
        </button>
        {isEditing && (
          <button
            type="button"
            disabled={saving || removing}
            onClick={handleRemove}
            className="w-full text-sm text-rose font-semibold py-2 hover:underline disabled:opacity-50"
          >
            {removing ? 'Removing…' : 'Remove from church'}
          </button>
        )}
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-3 pt-2 border-t first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold text-ink/80">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-rose">*</span>}
      </label>
      {children}
    </div>
  );
}
