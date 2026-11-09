import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CATEGORY_LABELS = {
  tithe: 'Tithe',
  offering: 'Offering',
  thanksgiving: 'Thanksgiving',
  building_project: 'Building / Project',
  welfare: 'Welfare',
};

function lagosNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
}

function naira(value) {
  return `₦${Number(value || 0).toLocaleString('en-NG')}`;
}

function Stat({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-ink/5 p-3">
      <p className="font-display text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-ink/50">{label}</p>
    </div>
  );
}

export default function MonthlyReport() {
  const { profile } = useAuth();
  const now = useMemo(() => lagosNow(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [scope, setScope] = useState('church');
  const [departments, setDepartments] = useState([]);
  const [canSeeChurch, setCanSeeChurch] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDepartments = useCallback(async () => {
    const { data } = await supabase.rpc('list_report_departments');
    if (!data?.ok) {
      setDepartments([]);
      setCanSeeChurch(false);
      return;
    }
    const rows = Array.isArray(data.rows) ? data.rows : [];
    setDepartments(rows);
    setCanSeeChurch(Boolean(data.can_see_church));
    if (!data.can_see_church && rows[0]) {
      setScope(rows[0].id);
    }
  }, []);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    let result;
    if (scope === 'church') {
      result = await supabase.rpc('get_church_monthly_report', {
        p_year: year,
        p_month: month,
      });
    } else {
      result = await supabase.rpc('get_department_monthly_report', {
        p_department_id: scope,
        p_year: year,
        p_month: month,
      });
    }
    if (result.error || !result.data?.ok) {
      setError('Could not load this report.');
      setReport(null);
    } else {
      setReport(result.data);
    }
    setLoading(false);
  }, [scope, year, month]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (scope) loadReport();
  }, [loadReport, scope]);

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  const title = report?.kind === 'department'
    ? `${report.department?.name || 'Department'} · ${MONTHS[month - 1]} ${year}`
    : `${report?.church_name || 'Church'} · ${MONTHS[month - 1]} ${year}`;

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8 print:bg-white print:px-0 print:py-0">
      <div className="max-w-3xl mx-auto space-y-4 print:space-y-3">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileBarChart size={20} className="text-signal" />
            <div>
              <h1 className="font-display text-xl font-bold text-ink">Monthly report</h1>
              <p className="text-xs text-ink/50">Gathrd fills the numbers. Admins add the rest for the pastor.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="text-sm bg-ink hover:bg-void text-white rounded-lg px-3.5 py-2 font-semibold"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-ink/5 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {MONTHS.map((label, i) => (
              <option key={label} value={i + 1}>{label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white"
          >
            {canSeeChurch && <option value="church">Whole church</option>}
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <h2 className="hidden print:block font-display text-2xl font-bold text-ink">{title}</h2>

        {loading ? (
          <p className="text-ink/40 text-sm py-10 text-center">Loading…</p>
        ) : error ? (
          <p className="text-rose text-sm py-10 text-center">{error}</p>
        ) : !report ? (
          <p className="text-ink/40 text-sm py-10 text-center">No report yet.</p>
        ) : (
          <>
            {report.kind === 'department' ? (
              <DepartmentView report={report} monthLabel={`${MONTHS[month - 1]} ${year}`} />
            ) : (
              <ChurchView report={report} monthLabel={`${MONTHS[month - 1]} ${year}`} />
            )}
            <ReportAdditions
              year={year}
              month={month}
              departmentId={scope === 'church' ? null : scope}
            />
          </>
        )}

        {profile?.role === 'department_head' && departments.length === 0 && !loading && (
          <p className="text-sm text-ink/50">Ask a pastor to assign you as head of a department in Settings.</p>
        )}
      </div>
    </div>
  );
}

function ChurchView({ report, monthLabel }) {
  const giving = report.giving || {};
  const attendance = report.attendance || {};
  const members = report.members || {};
  const visitors = report.visitors || {};
  const evangelism = report.evangelism || {};
  const cells = report.cells || {};

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/50 print:hidden">{report.church_name} · {monthLabel}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Active adults" value={members.active_adults ?? 0} />
        <Stat label="Children" value={members.active_children ?? 0} />
        <Stat label="New this month" value={members.new_this_month ?? 0} />
        <Stat label="First-time visitors" value={visitors.unique_first_visits ?? 0} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Services" value={attendance.session_count ?? 0} />
        <Stat label="Adults present" value={attendance.unique_adults ?? 0} />
        <Stat label="Children present" value={attendance.unique_children ?? 0} />
        <Stat label="Visit events" value={visitors.visit_events ?? 0} />
      </div>

      {giving.visible && (
        <Section title="Giving">
          <p className="font-display text-2xl font-bold text-ink">{naira(giving.grand_total)}</p>
          <div className="mt-2 space-y-1">
            {Object.entries(giving.by_category || {}).map(([key, amount]) => (
              <p key={key} className="text-sm text-ink/70 flex justify-between">
                <span>{CATEGORY_LABELS[key] || key}</span>
                <span>{naira(amount)}</span>
              </p>
            ))}
            {Object.keys(giving.by_category || {}).length === 0 && (
              <p className="text-sm text-ink/40">No giving recorded this month.</p>
            )}
          </div>
        </Section>
      )}

      <Section title="Souls won">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Stat label="Added" value={evangelism.souls_added ?? 0} />
          <Stat label="Converted" value={evangelism.converted ?? 0} />
          <Stat label="Reach-outs" value={evangelism.outreach_events ?? 0} />
        </div>
        {(evangelism.by_winner || []).length === 0 ? (
          <p className="text-sm text-ink/40">No souls recorded this month.</p>
        ) : (
          <ul className="space-y-1">
            {evangelism.by_winner.map((row) => (
              <li key={row.name} className="text-sm text-ink/70 flex justify-between">
                <span>{row.name}</span>
                <span>{row.souls}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Cell groups">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Groups" value={cells.groups ?? 0} />
          <Stat label="Reports" value={cells.reports_submitted ?? 0} />
          <Stat label="Attendance" value={cells.total_attendance ?? 0} />
          <Stat label="New faces" value={cells.new_faces ?? 0} />
        </div>
      </Section>

      <Section title="Services">
        {(attendance.sessions || []).length === 0 ? (
          <p className="text-sm text-ink/40">No services this month.</p>
        ) : (
          <ul className="space-y-1">
            {attendance.sessions.map((s) => (
              <li key={s.id} className="text-sm text-ink/70 flex justify-between gap-3">
                <span>{s.service_date} · {s.service_name}</span>
                <span>{s.adults_present} adults · {s.children_present} children</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Departments">
        {(report.departments || []).length === 0 ? (
          <p className="text-sm text-ink/40">No departments yet. Add them in Settings and assign a head.</p>
        ) : (
          <ul className="space-y-1">
            {report.departments.map((d) => (
              <li key={d.id} className="text-sm text-ink/70 flex justify-between gap-3">
                <span>{d.name}{d.leader_name ? ` · ${d.leader_name}` : ''}</span>
                <span>{d.member_count} people</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function DepartmentView({ report, monthLabel }) {
  const roster = report.roster || {};
  const attendance = report.attendance || {};
  const evangelism = report.evangelism || {};

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/50 print:hidden">
        {report.department?.name}
        {report.department?.leader_name ? ` · ${report.department.leader_name}` : ''}
        {' · '}{monthLabel}
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="People" value={roster.count ?? 0} />
        <Stat label="New this month" value={roster.new_this_month ?? 0} />
        <Stat label="Services" value={attendance.services_in_month ?? 0} />
        <Stat label="Souls won" value={evangelism.souls_won ?? 0} />
      </div>

      <Section title="Attendance">
        <p className="text-sm text-ink/60 mb-2">
          {attendance.unique_present ?? 0} people present · {attendance.present_events ?? 0} check-ins
        </p>
        {(attendance.by_member || []).length === 0 ? (
          <p className="text-sm text-ink/40">Put people on this department from their People record.</p>
        ) : (
          <ul className="space-y-1">
            {attendance.by_member.map((row) => (
              <li key={row.full_name} className="text-sm text-ink/70 flex justify-between">
                <span>{row.full_name}</span>
                <span>{row.present} services</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Souls won by this department">
        {(evangelism.by_member || []).length === 0 ? (
          <p className="text-sm text-ink/40">No souls recorded this month.</p>
        ) : (
          <ul className="space-y-1">
            {evangelism.by_member.map((row) => (
              <li key={row.full_name} className="text-sm text-ink/70 flex justify-between">
                <span>{row.full_name}</span>
                <span>{row.souls}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Roster">
        {(roster.members || []).length === 0 ? (
          <p className="text-sm text-ink/40">No one assigned yet.</p>
        ) : (
          <ul className="space-y-1">
            {roster.members.map((m) => (
              <li key={m.id} className="text-sm text-ink/70 flex justify-between">
                <span>{m.full_name}</span>
                <span>{m.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-ink/5 p-5 space-y-2">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {children}
    </div>
  );
}

function emptyExtra() {
  return { title: '', body: '' };
}

function ReportAdditions({ year, month, departmentId }) {
  const [notes, setNotes] = useState('');
  const [extras, setExtras] = useState([emptyExtra()]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setMessage('');
    const { data } = await supabase.rpc('get_monthly_report_additions', {
      p_year: year,
      p_month: month,
      p_department_id: departmentId,
    });
    if (!data?.ok) {
      setError('Could not load extra notes.');
      setNotes('');
      setExtras([emptyExtra()]);
      setCanEdit(false);
    } else {
      const rows = Array.isArray(data.extras) ? data.extras : [];
      setNotes(data.notes || '');
      setExtras(rows.length ? rows.map((row) => ({
        title: row.title || '',
        body: row.body || '',
      })) : [emptyExtra()]);
      setCanEdit(Boolean(data.can_edit));
    }
    setLoading(false);
  }, [year, month, departmentId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateExtra(index, field, value) {
    setExtras((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addExtra() {
    setExtras((rows) => (rows.length >= 20 ? rows : [...rows, emptyExtra()]));
  }

  function removeExtra(index) {
    setExtras((rows) => {
      const next = rows.filter((_, i) => i !== index);
      return next.length ? next : [emptyExtra()];
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    setMessage('');
    const cleaned = extras
      .map((row) => ({ title: (row.title || '').trim(), body: (row.body || '').trim() }))
      .filter((row) => row.title || row.body);
    const { data } = await supabase.rpc('save_monthly_report_additions', {
      p_year: year,
      p_month: month,
      p_department_id: departmentId,
      p_notes: notes,
      p_extras: cleaned,
    });
    setSaving(false);
    if (!data?.ok) {
      setError('Could not save extra notes.');
      return;
    }
    setNotes(data.notes || '');
    const rows = Array.isArray(data.extras) ? data.extras : [];
    setExtras(rows.length ? rows : [emptyExtra()]);
    setMessage('Saved. Pastors will see this with the numbers.');
  }

  const filled = extras.filter((row) => (row.title || '').trim() || (row.body || '').trim());
  const hasContent = notes.trim() || filled.length;

  if (loading) {
    return <p className="text-ink/40 text-sm">Loading extra notes…</p>;
  }

  if (!canEdit && !hasContent) {
    return null;
  }

  return (
    <Section title="Extra notes for the pastor">
      <p className="text-xs text-ink/50 print:hidden">
        Add testimony, events, welfare, building, or anything Gathrd does not count. Pastors see this with the numbers.
      </p>
      {error && <p className="text-sm text-rose">{error}</p>}
      {message && <p className="text-sm text-sage print:hidden">{message}</p>}

      {canEdit ? (
        <div className="space-y-3 print:hidden">
          <label className="block">
            <span className="text-xs font-medium text-ink/70">Notes for the pastor</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="Testimony, prayer points, events, needs…"
              className="mt-1 w-full border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white"
            />
          </label>
          {extras.map((row, index) => (
            <div key={index} className="border border-ink/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={row.title}
                  onChange={(e) => updateExtra(index, 'title', e.target.value)}
                  placeholder="Heading (e.g. Welfare, Building, Outreach)"
                  maxLength={120}
                  className="flex-1 border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeExtra(index)}
                  className="text-xs text-rose shrink-0"
                >
                  Remove
                </button>
              </div>
              <textarea
                value={row.body}
                onChange={(e) => updateExtra(index, 'body', e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="What happened, numbers not in Gathrd, next steps…"
                className="w-full border border-ink/10 rounded-lg px-3 py-2 text-sm bg-white"
              />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addExtra}
              className="text-sm text-signal font-semibold hover:text-signal-deep"
            >
              Add another item
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="text-sm bg-signal hover:bg-signal-deep text-white rounded-lg px-3.5 py-2 font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save additions'}
            </button>
          </div>
        </div>
      ) : null}

      <div className={canEdit ? 'hidden print:block space-y-3' : 'space-y-3'}>
        {notes.trim() ? (
          <p className="text-sm text-ink/80 whitespace-pre-wrap">{notes}</p>
        ) : null}
        {filled.map((row, index) => (
          <div key={`${row.title}-${index}`}>
            {row.title ? <p className="text-sm font-semibold text-ink">{row.title}</p> : null}
            {row.body ? <p className="text-sm text-ink/70 whitespace-pre-wrap">{row.body}</p> : null}
          </div>
        ))}
        {!hasContent && canEdit ? (
          <p className="text-sm text-ink/40 print:hidden">Nothing added yet.</p>
        ) : null}
      </div>
    </Section>
  );
}
