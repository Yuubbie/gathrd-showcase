import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ContactActions from '../components/ContactActions';

const STAGES = [
  ['salvation', 'Salvation'],
  ['water_baptism', 'Water Baptism'],
  ['holy_spirit_baptism', 'Holy Spirit Baptism'],
  ['new_convert_class', 'New Convert Class'],
  ['membership_class', 'Membership Class'],
  ['worker_consecration', 'Worker Consecration'],
];

const STALL_DAYS = 30;

export default function DiscipleshipTracker() {
  const { profile } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [advancingId, setAdvancingId] = useState(null);

  const load = useCallback(async () => {
    if (!profile?.church_id) return;
    setLoading(true);
    const { data } = await supabase
      .from('discipleship_records')
      .select('id, current_stage, stage_entered_at, salvation_date, visitor_id, visitors(full_name, phone)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  function daysSinceStageEntered(record) {
    const diffMs = Date.now() - new Date(record.stage_entered_at).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  async function advanceStage(record) {
    const currentIndex = STAGES.findIndex(([v]) => v === record.current_stage);
    if (currentIndex === STAGES.length - 1) return; // already at final stage

    const nextStage = STAGES[currentIndex + 1][0];
    setAdvancingId(record.id);

    const stageDateFields = {
      water_baptism: { water_baptism_completed_date: new Date().toISOString().slice(0, 10) },
      holy_spirit_baptism: { holy_spirit_baptism_date: new Date().toISOString().slice(0, 10) },
      new_convert_class: { new_convert_class_completed_date: new Date().toISOString().slice(0, 10) },
      membership_class: { membership_class_completed_date: new Date().toISOString().slice(0, 10), membership_card_issued: true },
      worker_consecration: { worker_consecration_date: new Date().toISOString().slice(0, 10) },
    };

    await supabase
      .from('discipleship_records')
      .update({
        current_stage: nextStage,
        stage_entered_at: new Date().toISOString(),
        ...(stageDateFields[nextStage] || {}),
      })
      .eq('id', record.id);

    await supabase.from('discipleship_stage_log').insert({
      discipleship_record_id: record.id,
      stage: nextStage,
      administered_by: profile.id,
    });

    // Membership class completion auto-promotes to full Member (Blueprint 2B)
    if (nextStage === 'membership_class') {
      const { data: visitor } = await supabase
        .from('visitors')
        .select('full_name, phone, address, church_id')
        .eq('id', record.visitor_id)
        .single();

      if (visitor) {
        const { data: newMember } = await supabase
          .from('members')
          .insert({
            church_id: visitor.church_id,
            full_name: visitor.full_name,
            phone: visitor.phone,
            residential_address: visitor.address,
            status: 'active',
            source: 'admin_added',
          })
          .select('id')
          .single();

        if (newMember) {
          await supabase
            .from('discipleship_records')
            .update({ member_id: newMember.id })
            .eq('id', record.id);
        }
      }
    }

    setAdvancingId(null);
    load();
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-xl font-semibold">Discipleship Tracker</h1>

        <div className="bg-white rounded-2xl border border-ink/5 shadow-[0_1px_2px_rgba(21,17,31,0.04),0_8px_24px_-8px_rgba(21,17,31,0.08)] p-5">
          {loading ? (
            <p className="text-ink/40 text-sm py-6 text-center">Loading…</p>
          ) : records.length === 0 ? (
            <p className="text-ink/40 text-sm py-6 text-center">
              No converts yet. Mark a visitor as a Convert from the Visitor Log to start their journey here.
            </p>
          ) : (
            <div className="divide-y">
              {records.map((r) => {
                const stageIndex = STAGES.findIndex(([v]) => v === r.current_stage);
                const days = daysSinceStageEntered(r);
                const stalled = days >= STALL_DAYS;
                const isFinal = stageIndex === STAGES.length - 1;

                return (
                  <div key={r.id} className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div>
                        <p className="font-medium text-sm">{r.visitors?.full_name}</p>
                        <p className="text-ink/50 text-xs">
                          {r.visitors?.phone || 'No phone'} • Salvation: {r.salvation_date}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ContactActions phone={r.visitors?.phone} name={r.visitors?.full_name} />
                        {stalled && !isFinal && (
                          <span className="text-xs text-rose font-semibold">
                            Stuck at this stage for {days} days
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stage progress bar */}
                    <div className="flex items-center gap-1 mb-2">
                      {STAGES.map(([value, label], i) => (
                        <div
                          key={value}
                          title={label}
                          className={`h-2 flex-1 rounded-full ${
                            i <= stageIndex ? 'bg-signal' : 'bg-ink/10'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-ink/60">
                        Current stage: <span className="font-medium">{STAGES[stageIndex][1]}</span>
                      </p>
                      {!isFinal ? (
                        <button
                          onClick={() => advanceStage(r)}
                          disabled={advancingId === r.id}
                          className="text-xs bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold transition-colors disabled:opacity-50"
                        >
                          {advancingId === r.id ? 'Saving…' : `Advance to ${STAGES[stageIndex + 1][1]} →`}
                        </button>
                      ) : (
                        <span className="text-xs text-sage font-semibold">✓ Journey complete</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
