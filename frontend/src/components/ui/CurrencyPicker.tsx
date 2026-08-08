import React, { useState, useRef, useEffect } from "react";
import { CURRENCY_OPTIONS, currencySymbol } from "../../utils/currency";

interface CurrencyPickerProps {
  value: string;
  onSelect: (code: string) => void;
  disabled?: boolean;
  compact?: boolean;
  locked?: boolean;
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({ value, onSelect, disabled, compact, locked }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = value.toUpperCase();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = CURRENCY_OPTIONS.filter(
    (c) =>
      !query ||
      c.code.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
  );

  const currentName = CURRENCY_OPTIONS.find((c) => c.code === current)?.name || current;

  return (
    <div ref={ref} className={`relative ${compact ? "w-auto" : "w-full"}`}>
      <button
        type="button"
        disabled={disabled || locked}
        onClick={() => !locked && setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-extrabold outline-none transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${
          locked
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-ink hover:border-ocean-400 hover:ring-2 hover:ring-ocean-100"
        } ${compact ? "" : "w-full justify-between"}`}
        title={locked ? `Currency locked for this session: ${currentName}` : `Currency: ${currentName}`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {locked && <span className="text-[10px]">🔒</span>}
          <span className="text-sm">{currencySymbol(current)}</span>
          <span className="truncate">{current}</span>
        </span>
        <span className={`text-[9px] text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="absolute z-[900] mt-2 w-64 rounded-2xl bg-white shadow-[0_18px_50px_-12px_rgba(0,0,0,0.3)] border border-slate-100 p-2 animate-fade-in-up origin-top">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search currency… e.g. INR, Euro"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-xs font-semibold text-ink outline-none focus:border-ocean-400 focus:ring-2 focus:ring-ocean-100 transition-all placeholder:text-slate-400"
          />
          <div className="mt-1.5 max-h-56 overflow-y-auto scrollbar-slim">
            {filtered.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-400 font-semibold">No match</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  onSelect(c.code);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                  c.code === current
                    ? "bg-gradient-to-r from-ocean-50 to-brand-50 text-ocean-700 font-extrabold"
                    : "text-slate-600 font-semibold hover:bg-slate-50"
                }`}
              >
                <span className="w-7 text-center text-sm">{currencySymbol(c.code)}</span>
                <span className="font-extrabold">{c.code}</span>
                <span className="flex-1 truncate text-slate-400">{c.name}</span>
                {c.code === current && <span className="text-ocean-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
