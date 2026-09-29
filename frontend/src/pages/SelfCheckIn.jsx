import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import BackButton from '../components/BackButton';
import { CheckCircle2, Search, User, Phone, Hash, AlertCircle } from 'lucide-react';

export default function SelfCheckIn() {
  const [searchType, setSearchType] = useState('phone'); // 'phone' or 'id'
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');
  const [checkedIn, setCheckedIn] = useState(false);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    setMember(null);
    setCheckedIn(false);
    setAlreadyCheckedIn(false);

    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, phone, role, church_id, cell_group_id, department_id')
        .is('deleted_at', null);

      if (searchType === 'phone') {
        query = query.eq('phone', searchValue.trim());
      } else {
        query = query.eq('id', searchValue.trim());
      }

      const { data, error: fetchError } = await query.single();

      if (fetchError || !data) {
        setError('Member not found. Please check your details or contact your church admin.');
        setLoading(false);
        return;
      }

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingAttendance } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('profile_id', data.id)
        .eq('date', today)
        .is('deleted_at', null)
        .single();

      if (existingAttendance) {
        setAlreadyCheckedIn(true);
      }

      setMember(data);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  async function handleCheckIn() {
    if (!member) return;

    setLoading(true);
    setError('');

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        profile_id: member.id,
        church_id: member.church_id,
        date: today,
        check_in_time: now,
        check_in_method: 'self',
      });

    setLoading(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setAlreadyCheckedIn(true);
      } else {
        setError('Check-in failed. Please try again or contact your church admin.');
      }
      return;
    }

    setCheckedIn(true);
  }

  return (
    <div className="min-h-screen bg-parchment flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <BackButton to="/dashboard" label="Back to Dashboard" />
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-ink">Self Check-In</h1>
          <p className="text-ink/50 mt-2">Enter your details to check yourself in</p>
        </div>

        {/* Success State */}
        {checkedIn ? (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-sage" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Welcome, {member?.full_name?.split(' ')[0]}!</h2>
            <p className="text-ink/50 mt-2">You're checked in. Have a blessed service!</p>
            <div className="mt-6 p-4 bg-parchment rounded-lg">
              <p className="text-sm text-ink/50">Checked in at</p>
              <p className="font-semibold text-ink">{new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <button
              onClick={() => { setMember(null); setSearchValue(''); setCheckedIn(false); }}
              className="mt-6 text-sm text-signal hover:text-signal-deep font-medium"
            >
              Check in another member
            </button>
          </div>
        ) : alreadyCheckedIn ? (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-gold" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">Already Checked In</h2>
            <p className="text-ink/50 mt-2">Welcome back, {member?.full_name?.split(' ')[0]}! You're already checked in today.</p>
            <button
              onClick={() => { setMember(null); setSearchValue(''); setAlreadyCheckedIn(false); }}
              className="mt-6 text-sm text-signal hover:text-signal-deep font-medium"
            >
              Check in another member
            </button>
          </div>
        ) : (
          <>
            {/* Search Form */}
            <div className="bg-white rounded-2xl border border-ink/5 shadow-lg p-6">
              {/* Search Type Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setSearchType('phone'); setSearchValue(''); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchType === 'phone' ? 'bg-signal text-white' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                  }`}
                >
                  <Phone size={16} /> Phone Number
                </button>
                <button
                  onClick={() => { setSearchType('id'); setSearchValue(''); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchType === 'id' ? 'bg-signal text-white' : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                  }`}
                >
                  <Hash size={16} /> Member ID
                </button>
              </div>

              <form onSubmit={handleSearch}>
                <div className="relative">
                  <input
                    type={searchType === 'phone' ? 'tel' : 'text'}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder={searchType === 'phone' ? 'Enter your phone number' : 'Enter your member ID'}
                    className="w-full border border-ink/10 rounded-lg px-4 py-3 pl-11 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors"
                  />
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/30" />
                </div>

                {error && (
                  <div className="flex items-center gap-2 mt-3 text-sm text-rose bg-rose-50 rounded-lg p-3">
                    <AlertCircle size={16} className="shrink-0" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !searchValue.trim()}
                  className="w-full mt-4 bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Searching…' : 'Find Me'}
                </button>
              </form>
            </div>

            {/* Member Found */}
            {member && (
              <div className="bg-white rounded-2xl border border-ink/5 shadow-lg p-6 mt-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-signal/10 flex items-center justify-center">
                    <User size={28} className="text-signal" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-ink text-lg">{member.full_name}</h3>
                    <p className="text-ink/50 text-sm capitalize">{member.role.replace(/_/g, ' ')}</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-parchment rounded-lg">
                  <p className="text-xs text-ink/40">Today's Date</p>
                  <p className="font-semibold text-ink">{new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={loading}
                  className="w-full mt-4 bg-sage hover:bg-sage-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
                >
                  {loading ? 'Checking in…' : 'Confirm Check-In'}
                </button>
              </div>
            )}

            {/* Help Text */}
            <p className="text-center text-ink/40 text-sm mt-6">
              Don't know your member ID? Contact your church admin.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
