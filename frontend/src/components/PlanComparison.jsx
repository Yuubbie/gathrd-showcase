import { Check, Minus } from 'lucide-react';
import { PLANS, COMPARISON, formatNaira } from '../lib/plans';

function Cell({ value }) {
  if (value === true) {
    return (
      <>
        <Check size={18} className="text-sage mx-auto" aria-hidden="true" />
        <span className="sr-only">Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <Minus size={18} className="text-ink/20 mx-auto" aria-hidden="true" />
        <span className="sr-only">Not included</span>
      </>
    );
  }
  return <span className="text-sm text-ink/70">{value}</span>;
}

export default function PlanComparison() {
  return (
    <div className="bg-white rounded-2xl border border-ink/5 overflow-hidden">
      {/* "relative" keeps the hidden screen-reader labels inside this scroll box; without it
          they stick out past the right edge and make the whole page scroll sideways on phones. */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[720px] text-left border-collapse">
          <thead>
            <tr className="border-b border-ink/10">
              <th scope="col" className="sticky left-0 bg-white p-3 text-sm font-semibold text-ink/50 w-56">
                What you get
              </th>
              {PLANS.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={`p-3 text-center align-bottom ${p.popular ? 'bg-signal/5' : ''}`}
                >
                  <span className="block font-display font-bold text-ink">{p.name}</span>
                  <span className="block text-signal font-semibold text-sm">{formatNaira(p.price)}/month</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.label} className="border-b border-ink/5 last:border-b-0">
                <th scope="row" className="sticky left-0 bg-white p-3 text-sm font-normal text-ink/80">
                  {row.label}
                </th>
                {PLANS.map((p) => (
                  <td key={p.id} className={`p-3 text-center ${p.popular ? 'bg-signal/5' : ''}`}>
                    <Cell value={row[p.id]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
