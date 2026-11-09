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
            <h1 className="font-display text-xl font-bold text-ink">Monthly report</h1>
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
        ) : report.kind === 'department' ? (
          <DepartmentView report={report} monthLabel={`${MONTHS[month - 1]} ${year}`} />
        ) : (
          <ChurchView report={report} monthLabel={`${MONTHS[month - 1]} ${year}`} />
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
