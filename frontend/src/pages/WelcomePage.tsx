import React from "react";
import { motion } from "framer-motion";

interface WelcomePageProps {
  onStart: () => void;
}

const FLOATERS = [
  { emoji: "✈️", className: "top-[12%] left-[8%] text-4xl sm:text-5xl", delay: 0 },
  { emoji: "🌍", className: "top-[22%] right-[10%] text-4xl sm:text-6xl", delay: 1.2 },
  { emoji: "🗺️", className: "bottom-[26%] left-[12%] text-3xl sm:text-5xl", delay: 0.6 },
  { emoji: "🧭", className: "bottom-[18%] right-[16%] text-3xl sm:text-4xl", delay: 1.8 },
  { emoji: "🏝️", className: "top-[55%] left-[4%] text-2xl sm:text-4xl", delay: 2.4 },
  { emoji: "🎒", className: "top-[58%] right-[5%] text-2xl sm:text-4xl", delay: 0.9 },
];

const FEATURES = [
  {
    icon: "🤖",
    title: "AI-crafted itineraries",
    desc: "Tell us your destination, dates and interests — our AI builds a complete day-by-day plan in seconds.",
    color: "from-brand-500 to-ocean-500",
  },
  {
    icon: "🗺️",
    title: "Google-Maps-style routes",
    desc: "Real road guidance between every stop with turn-by-turn directions, distances and fuel estimates.",
    color: "from-ocean-500 to-teal-500",
  },
  {
    icon: "💰",
    title: "Any currency in the world",
    desc: "Plan in INR, USD, EUR or any of 160+ currencies — every estimate converts automatically.",
    color: "from-sunset-500 to-rose-500",
  },
  {
    icon: "🧰",
    title: "Travel essentials",
    desc: "One-tap links to nearby hotels, Airbnbs, rental cars and local transport — book without leaving the flow.",
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: "🧭",
    title: "Local guides",
    desc: "Visa rules, safety, etiquette and transport tips curated for every destination you visit.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: "💾",
    title: "Save & export",
    desc: "Keep your journeys in your account and export polished PDF trip documents anytime.",
    color: "from-blue-500 to-indigo-500",
  },
];

const STEPS = [
  { n: "01", title: "Answer a few questions", desc: "Destination, dates, travelers, budget — each asked one at a time." },
  { n: "02", title: "AI plans your journey", desc: "A full itinerary with maps, budgets and road guidance appears." },
  { n: "03", title: "Chat to fine-tune", desc: "Swap activities, add places or change currency whenever you like." },
];

export const WelcomePage: React.FC<WelcomePageProps> = ({ onStart }) => {
  return (
    <div className="relative overflow-hidden">
      {/* Floating travel emojis */}
      {FLOATERS.map((f, i) => (
        <motion.span
          key={i}
          className={`absolute select-none pointer-events-none opacity-40 animate-float ${f.className}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ delay: f.delay, duration: 0.8, ease: "easeOut" }}
          style={{ animationDelay: `${f.delay}s` }}
        >
          {f.emoji}
        </motion.span>
      ))}

      {/* Hero */}
      <div className="relative max-w-4xl mx-auto text-center pt-14 sm:pt-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 border border-slate-200 shadow-soft backdrop-blur text-xs font-extrabold uppercase tracking-wider text-slate-500"
        >
          <span className="text-sm">🌎</span> Your journey, beautifully planned
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="mt-6 font-display text-5xl sm:text-7xl font-extrabold tracking-tight text-ink leading-[1.05]"
        >
          <span className="text-gradient">AroundTheWorld</span>
          <span className="align-middle text-4xl sm:text-6xl"> ✈️🌎</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="mt-6 text-slate-500 font-medium text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
        >
          What is AroundTheWorld? It's your AI travel companion that turns a few simple answers
          into a complete, map-guided journey — day-by-day activities, smart budgets in any
          currency, real road directions, and one-tap access to hotels, rides and rentals.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: "easeOut" }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={onStart}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-ocean-500 text-white font-extrabold text-base shadow-glow hover:shadow-lift hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2.5"
          >
            ✨ Get Started
            <span aria-hidden>→</span>
          </button>
          <span className="text-xs font-semibold text-slate-400">
            Free · No credit card · Plans in 160+ currencies
          </span>
        </motion.div>
      </div>

      {/* What the app does */}
      <div className="relative max-w-6xl mx-auto px-4 mt-16 sm:mt-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-600">What does it do?</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-ink">
            Everything you need, <span className="text-gradient-warm">before you fly</span>
          </h2>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: 0.06 * i, duration: 0.5, ease: "easeOut" }}
              className="card card-hover rounded-3xl p-6 text-left"
            >
              <span className={`inline-flex w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} text-white text-xl items-center justify-center shadow-soft`}>
                {f.icon}
              </span>
              <h4 className="mt-4 text-[15px] font-extrabold text-ink">{f.title}</h4>
              <p className="mt-1.5 text-[13px] text-slate-500 font-medium leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="relative max-w-4xl mx-auto px-4 mt-16 sm:mt-24 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-600">How it works</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl font-extrabold text-ink">
            Three steps to takeoff
          </h2>
        </motion.div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: 0.1 * i, duration: 0.5, ease: "easeOut" }}
              className="relative text-center"
            >
              <span className="font-display text-5xl font-extrabold text-gradient-warm">{s.n}</span>
              <h5 className="mt-3 text-sm font-extrabold text-ink">{s.title}</h5>
              <p className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-16 text-center"
        >
          <button
            onClick={onStart}
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-500 to-ocean-500 text-white font-extrabold text-base shadow-glow hover:shadow-lift hover:scale-[1.03] active:scale-95 transition-all duration-200 cursor-pointer"
          >
            Start planning now ✈️
          </button>
        </motion.div>
      </div>
    </div>
  );
};
