import React from "react";
import { BudgetInfo } from "../../api/types";
import { formatCurrency } from "../../utils/currency";

interface BudgetSummaryProps {
  budget: BudgetInfo;
  totalLimit: number;
  totalCost: number;
  currency: string;
  destination?: string;
}

const ALLOCATION_LABELS: Array<{ key: string; label: string; icon: string; bar: string }> = [
  { key: "accommodation", label: "Stay", icon: "🏨", bar: "bg-brand-500" },
  { key: "food", label: "Food", icon: "🍜", bar: "bg-sunset-500" },
  { key: "transportation", label: "Transport", icon: "🚇", bar: "bg-ocean-500" },
  { key: "activities", label: "Activities", icon: "🎟️", bar: "bg-purple-500" },
  { key: "emergencybuffer", label: "Buffer", icon: "🛟", bar: "bg-slate-400" },
];

export const BudgetSummary: React.FC<BudgetSummaryProps> = ({ budget, totalLimit, totalCost, currency, destination }) => {
  const percentUsed = Math.min(100, Math.round((totalCost / Math.max(1, totalLimit)) * 100));
  const currCode = currency || budget.currency || "USD";

  const allocationTotal = budget.allocation
    ? Object.values(budget.allocation).reduce((a: number, b: any) => a + (Number(b) || 0), 0)
    : 0;

  const scoreColor =
    budget.score >= 8 ? "text-ocean-600" : budget.score >= 6 ? "text-brand-600" : "text-sunset-600";

  const suggestedTotal = budget.suggestedtotalbudget ?? 0;
  const suggestedGap = Math.max(0, suggestedTotal - totalLimit);
  const hasSuggestion = suggestedTotal > 0;

  const stats = [
    { label: "Overall Budget", value: formatCurrency(totalLimit, currCode), color: "text-brand-700", icon: "🎯" },
    { label: "Per Day", value: formatCurrency(budget.dailybudget ?? 0, currCode), color: "text-ocean-700", icon: "📅" },
    { label: "Per Person/Day", value: formatCurrency(budget.dailybudgetperperson ?? 0, currCode), color: "text-sky-700", icon: "👤" },
    { label: "Est. Cost", value: formatCurrency(totalCost, currCode), color: "text-blue-700", icon: "🧾" },
    { label: "Remaining", value: formatCurrency(Math.max(0, totalLimit - totalCost), currCode), color: "text-purple-700", icon: "🪙" },
    { label: "Comfort Score", value: `${budget.score} / 10`, color: scoreColor, icon: "✨" },
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ocean-50 via-white to-brand-50 border border-ocean-100 p-6 sm:p-8 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h3 className="font-display text-xl font-extrabold text-ink flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ocean-500 to-brand-500 text-white flex items-center justify-center text-lg shadow-glow">
            💰
          </span>
          Budget Intelligence
        </h3>
        {budget.comfortlevel && (
          <span className="px-3 py-1.5 rounded-full bg-white border border-ocean-200 text-ocean-700 text-xs font-extrabold uppercase tracking-wider">
            {budget.comfortlevel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-white/80 backdrop-blur rounded-2xl p-4 border border-slate-100 shadow-soft">
            <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <span>{s.icon}</span>
              {s.label}
            </span>
            <span className={`block mt-1.5 text-lg font-display font-extrabold whitespace-nowrap overflow-x-auto no-scrollbar ${s.color}`}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-sm text-slate-600 font-bold">
          <span>Budget used</span>
          <span>{percentUsed}%</span>
        </div>
        <div className="mt-2 w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              percentUsed > 95 ? "bg-gradient-to-r from-sunset-500 to-red-500" : "bg-gradient-to-r from-brand-500 via-brand-400 to-ocean-400"
            }`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      </div>

      {budget.allocation && allocationTotal > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400 mb-3">
            Where it goes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {ALLOCATION_LABELS.map((a) => {
              const val = Number((budget.allocation as any)?.[a.key]) || 0;
              const pct = Math.round((val / allocationTotal) * 100);
              return (
                <div key={a.key} className="bg-white/80 rounded-2xl p-3.5 border border-slate-100 shadow-soft">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span>{a.icon}</span>
                      {a.label}
                    </span>
                    <span className="text-slate-700">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${a.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[11px] font-extrabold text-slate-700">
                    {formatCurrency(val, currCode)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {budget.warnings && budget.warnings.length > 0 && (
        <div className="mt-6 bg-sunset-50 border border-sunset-200 text-sunset-700 p-4 rounded-2xl text-sm">
          <h4 className="font-extrabold mb-1.5">⚠️ Budget alerts</h4>
          <ul className="list-disc pl-5 space-y-1">
            {budget.warnings.map((warn, idx) => (
              <li key={idx} className="font-medium">{warn}</li>
            ))}
          </ul>
        </div>
      )}

      {hasSuggestion && (
        <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-ocean-500 text-white p-5 shadow-glow animate-fade-in-up">
          <div className="absolute -right-4 -top-6 text-[90px] opacity-15 select-none">💡</div>
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/80">
                💡 Suggested budget · overall trip
              </p>
              <p className="mt-1 font-display text-3xl sm:text-4xl font-extrabold">
                {formatCurrency(suggestedTotal, currCode)}
              </p>
              <p className="mt-1 text-sm text-white/90">
                ≈ {formatCurrency(budget.suggesteddailybudget ?? 0, currCode)} per day
                {destination && budget.destinationcostestimate
                  ? ` · typical ~$${budget.destinationcostestimate}/day per person in ${destination}`
                  : ""}
              </p>
            </div>
            {suggestedGap > 0 ? (
              <div className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">You'd need</p>
                <p className="font-display text-lg font-extrabold">+{formatCurrency(suggestedGap, currCode)}</p>
                <p className="text-[10px] text-white/80">to match the suggestion</p>
              </div>
            ) : (
              <div className="bg-white/15 backdrop-blur rounded-2xl px-4 py-3 text-center">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/80">Your budget</p>
                <p className="font-display text-lg font-extrabold">✓ Covers the suggestion</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
