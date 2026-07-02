import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export default function PublicOnboard() {
  const { slug } = useParams();
  const [churchName, setChurchName] = useState(null);
  const [loadingChurch, setLoadingChurch] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    marital_status: '',
    residential_address: '',
    state_of_origin: '',
    lga: '',
    occupation: '',
  });

  useEffect(() => {
    async function loadChurch() {
      const { data, error } = await supabase.rpc('get_church_name_by_slug', {
        p_slug: slug,
      });
      if (error || !data) {
        setChurchName(null);
      } else {
        setChurchName(data);
      }
      setLoadingChurch(false);
    }
    loadChurch();
  }, [slug]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const { error } = await supabase.rpc('self_onboard_member', {
      p_slug: slug,
      p_full_name: form.full_name,
      p_phone: form.phone || null,
      p_email: form.email || null,
      p_date_of_birth: form.date_of_birth || null,
      p_gender: form.gender || null,
      p_marital_status: form.marital_status || null,
      p_residential_address: form.residential_address || null,
      p_state_of_origin: form.state_of_origin || null,
      p_lga: form.lga || null,
      p_occupation: form.occupation || null,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }
    setSubmitted(true);
  }

  if (loadingChurch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!churchName) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-700 font-medium">This link isn't valid.</p>
          <p className="text-gray-500 text-sm mt-1">
            Please check with your church for the correct registration link.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="max-w-sm bg-white rounded-xl shadow-sm p-6 text-center space-y-2">
          <h1 className="text-lg font-semibold">You're registered! 🎉</h1>
          <p className="text-gray-600 text-sm">
            Welcome to {churchName}. A member of the team will be in touch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-sm p-6 space-y-4"
      >
        <div className="text-center mb-2">
          <h1 className="text-lg font-semibold">Join {churchName}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Fill this in to register as a member.
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 rounded-md p-2">
            {error}
          </div>
        )}

        <Field label="Full name" required>
          <input
            required
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </Field>

        <Field label="Phone number (WhatsApp)">
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
            placeholder="080..."
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </Field>

        <Field label="Date of birth">
          <input
            type="date"
            value={form.date_of_birth}
            onChange={(e) => update('date_of_birth', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </Field>

        <Field label="Gender">
          <select
            value={form.gender}
            onChange={(e) => update('gender', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base bg-white"
          >
            <option value="">Select…</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </Field>

        <Field label="Marital status">
          <select
            value={form.marital_status}
            onChange={(e) => update('marital_status', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base bg-white"
          >
            <option value="">Select…</option>
            <option value="single">Single</option>
            <option value="married">Married</option>
            <option value="widowed">Widowed</option>
            <option value="divorced">Divorced</option>
          </select>
        </Field>

        <Field label="Residential address">
          <input
            value={form.residential_address}
            onChange={(e) => update('residential_address', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </Field>

        <Field label="State of origin">
          <select
            value={form.state_of_origin}
            onChange={(e) => update('state_of_origin', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base bg-white"
          >
            <option value="">Select…</option>
            {NIGERIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="LGA">
          <input
            value={form.lga}
            onChange={(e) => update('lga', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </Field>

        <Field label="Occupation">
          <input
            value={form.occupation}
            onChange={(e) => update('occupation', e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-base"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white rounded-md py-2 font-medium disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Register'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
