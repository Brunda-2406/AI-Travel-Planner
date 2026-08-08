import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlanning } from "../../hooks/usePlanning";
import { CurrencyPicker } from "../ui/CurrencyPicker";
import { getLockedCurrency } from "../../state/planningStore";

interface TripWizardProps {
  onNavigate: (view: string) => void;
}

const POPULAR_DESTINATIONS = [
  { city: "Tokyo", flag: "🇯🇵" },
  { city: "Paris", flag: "🇫🇷" },
  { city: "Bali", flag: "🇮🇩" },
  { city: "Rome", flag: "🇮🇹" },
  { city: "Barcelona", flag: "🇪🇸" },
  { city: "Dubai", flag: "🇦🇪" },
  { city: "Singapore", flag: "🇸🇬" },
  { city: "Bangkok", flag: "🇹🇭" },
  { city: "Goa", flag: "🇮🇳" },
  { city: "New York", flag: "🇺🇸" },
];

const TRAVELER_TYPES = [
  { key: "solo", label: "Solo", icon: "🧍" },
  { key: "couple", label: "Couple", icon: "💑" },
  { key: "family", label: "Family", icon: "👨‍👩‍👧" },
  { key: "group", label: "Group", icon: "🎉" },
];

const INTEREST_OPTIONS = [
  { key: "food", label: "Food", icon: "🍜" },
  { key: "art", label: "Art", icon: "🎨" },
  { key: "history", label: "History", icon: "🏛️" },
  { key: "nature", label: "Nature", icon: "🌿" },
  { key: "shopping", label: "Shopping", icon: "🛍️" },
  { key: "adventure", label: "Adventure", icon: "🧗" },
  { key: "relaxation", label: "Relaxation", icon: "🧘" },
  { key: "culture", label: "Culture", icon: "🎭" },
  { key: "nightlife", label: "Nightlife", icon: "🌃" },
  { key: "beaches", label: "Beaches", icon: "🏖️" },
];

const STEP_META = [
  { title: "Where are you going?", subtitle: "Pick a destination — type it or tap a popular one.", icon: "🌍" },
  { title: "When are you traveling?", subtitle: "Choose your start and end dates.", icon: "🗓️" },
  { title: "Who's coming along?", subtitle: "How many travelers, and what kind of trip is it?", icon: "👥" },
  { title: "What's your budget?", subtitle: "Set a total budget and pick any world currency.", icon: "💰" },
  { title: "What do you love?", subtitle: "Pick your interests — the more the merrier!", icon: "✨" },
];

const inputClass =
  "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all duration-200 text-sm font-medium placeholder:text-slate-400";

const chipClass = (active: boolean) =>
  `px-4 py-2.5 rounded-2xl text-xs font-extrabold border transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 ${
    active
      ? "bg-gradient-to-r from-brand-600 to-brand-500 text-white border-transparent shadow-glow"
      : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700"
  }`;

export const TripWizard: React.FC<TripWizardProps> = ({ onNavigate }) => {
  const { planTrip, loading, error: storeError, lockedCurrency, lockCurrency } = usePlanning();
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [travelers, setTravelers] = useState(2);
  const [travelerType, setTravelerType] = useState("couple");
  const [budget, setBudget] = useState("");
  const [interests, setInterests] = useState<string[]>(["food"]);
  const [error, setError] = useState<string | null>(null);

  const activeCurrency = lockedCurrency || "USD";

  const today = new Date().toISOString().split("T")[0];
  const minEnd = startDate || today;

  const canProceed = (() => {
    switch (step) {
      case 0: return destination.trim().length > 0;
      case 1: return startDate && endDate && endDate >= startDate;
      case 2: return travelers >= 1;
      case 3: return Number.isFinite(parseFloat(budget)) && parseFloat(budget) > 0;
      case 4: return interests.length > 0;
      default: return true;
    }
  })();

  const toggleInterest = (key: string) => {
    setInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const goNext = (overrides?: { destination?: string; endDate?: string }) => {
    setError(null);
    if (overrides?.destination !== undefined) setDestination(overrides.destination);
    if (overrides?.endDate !== undefined) setEndDate(overrides.endDate);
    const dest = overrides?.destination !== undefined ? overrides.destination : destination;
    const end = overrides?.endDate !== undefined ? overrides.endDate : endDate;
    const ok = step === 0 ? dest.trim().length > 0 : step === 1 ? !!startDate && !!end && end >= startDate : step === 2 ? travelers >= 1 : step === 3 ? Number.isFinite(parseFloat(budget)) && parseFloat(budget) > 0 : interests.length > 0;
    if (!ok) {
      setError(step === 1 ? "Please pick valid dates (end after start)." : "Please fill this in to continue.");
      return;
    }
    // If the user picked a start date but not an end date, default to a 5-day trip
    if (step === 1 && !end && startDate) {
      const fallbackEnd = new Date(new Date(startDate).getTime() + 5 * 86400000).toISOString().split("T")[0];
      setEndDate(fallbackEnd);
    }
    setStep((s) => Math.min(s + 1, STEP_META.length - 1));
  };

  const handleNext = () => goNext();

  const handleGenerate = async () => {
    if (!canProceed) {
      setError("Please pick at least one interest.");
      return;
    }
    setError(null);
    const cur = lockedCurrency || "USD";
    await planTrip({
      destination: destination.trim(),
      startdate: startDate,
      enddate: endDate,
      travelercount: travelers,
      travelertype: travelerType,
      budget: parseFloat(budget),
      currency: cur,
      interests
    });
  };

  const totalSteps = STEP_META.length;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="card rounded-3xl overflow-hidden animate-fade-in-up relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-ocean-500" />

      {/* Header */}
      <div className="px-6 sm:px-8 pt-7 pb-4 bg-gradient-to-r from-ink via-slate-800 to-brand-900 text-white">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-ocean-400 text-white text-xl flex items-center justify-center shadow-glow">
            ✈️
          </span>
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-tight">Plan your trip</h2>
            <p className="text-[11px] text-white/60 font-semibold">
              Answer {totalSteps} quick questions — no typing required
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-ocean-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2.5 flex justify-between text-[10px] font-bold text-white/50 uppercase tracking-wider">
          {STEP_META.map((s, i) => (
            <span key={s.title} className={i === step ? "text-brand-300" : i < step ? "text-emerald-400" : ""}>
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-6 sm:p-8 bg-gradient-to-b from-slate-50/70 to-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="min-h-[220px]"
          >
            {/* Step title */}
            <div className="mb-5">
              <h3 className="font-display text-2xl font-extrabold text-ink flex items-center gap-2.5">
                <span className="text-2xl">{STEP_META[step].icon}</span>
                {STEP_META[step].title}
              </h3>
              <p className="mt-1 text-sm text-slate-500 font-medium">{STEP_META[step].subtitle}</p>
            </div>

            {/* STEP 0 — Destination */}
            {step === 0 && (
              <div className="space-y-4">
                <input
                  autoFocus
                  className={inputClass}
                  placeholder="e.g. Tokyo, Paris, Bali…"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                />
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                    Popular destinations
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_DESTINATIONS.map((d) => (
                      <button
                        key={d.city}
                        onClick={() => goNext({ destination: d.city })}
                        className={`${chipClass(destination === d.city)} cursor-pointer`}
                      >
                        <span>{d.flag}</span> {d.city}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 1 — Dates */}
            {step === 1 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Start date
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    min={today}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    End date
                  </label>
                  <input
                    type="date"
                    className={inputClass}
                    min={minEnd}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {startDate && endDate && endDate >= startDate && (
                  <p className="sm:col-span-2 text-xs font-bold text-ocean-600 bg-ocean-50 border border-ocean-100 rounded-xl px-3.5 py-2.5">
                    🗓️ {Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)} day trip
                  </p>
                )}
              </div>
            )}

            {/* STEP 2 — Travelers */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Number of travelers</p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setTravelers((t) => Math.max(1, t - 1))}
                      className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-600 font-extrabold text-lg hover:border-brand-300 hover:text-brand-700 transition-all cursor-pointer active:scale-95"
                    >
                      −
                    </button>
                    <span className="font-display text-3xl font-extrabold text-ink w-12 text-center">{travelers}</span>
                    <button
                      onClick={() => setTravelers((t) => Math.min(12, t + 1))}
                      className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-600 font-extrabold text-lg hover:border-brand-300 hover:text-brand-700 transition-all cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">Trip type</p>
                  <div className="flex flex-wrap gap-2">
                    {TRAVELER_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setTravelerType(t.key)}
                        className={chipClass(travelerType === t.key)}
                      >
                        <span>{t.icon}</span> {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 — Budget */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                    Total budget
                  </label>
                  <input
                    type="number"
                    min="1"
                    className={inputClass}
                    placeholder="e.g. 2000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
                    💱 Currency
                  </span>
                  <div className="flex-1 min-w-0">
                    <CurrencyPicker
                      value={activeCurrency}
                      onSelect={(code) => lockCurrency(code)}
                      compact
                    />
                  </div>
                  {lockedCurrency && (
                    <span className="text-[10px] font-bold text-ocean-600 shrink-0">✓ set</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold">
                  Pick any world currency — it becomes the session currency and every estimate
                  (activities, fuel, tips) updates to it. You can change it anytime.
                </p>
              </div>
            )}

            {/* STEP 4 — Interests */}
            {step === 4 && (
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((i) => (
                  <button
                    key={i.key}
                    onClick={() => toggleInterest(i.key)}
                    className={chipClass(interests.includes(i.key))}
                  >
                    <span>{i.icon}</span> {i.label}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {(error || storeError) && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 text-red-700 p-3 rounded-2xl text-xs font-semibold border border-red-100 animate-fade-in-up">
            <span className="shrink-0">⚠️</span> {storeError || error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:border-brand-300 hover:text-brand-700 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            ← Back
          </button>

          {step < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed && step !== 1}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold text-sm shadow-glow transition-all disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none cursor-pointer flex items-center gap-2 active:scale-95"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={loading || interests.length === 0}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-ocean-500 hover:from-brand-700 hover:to-ocean-600 text-white font-extrabold text-sm shadow-glow transition-all disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none cursor-pointer flex items-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Crafting your itinerary…
                </>
              ) : (
                <>✨ Generate my itinerary</>
              )}
            </button>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => onNavigate("saved-trips")}
            className="text-xs font-bold text-slate-400 hover:text-brand-600 transition-colors cursor-pointer"
          >
            View your saved journeys →
          </button>
        </div>
      </div>
    </div>
  );
};
