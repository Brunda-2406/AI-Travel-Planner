import React from "react";
import { RegisterForm } from "../components/auth/RegisterForm";
import { Logo } from "../components/ui/Logo";

interface RegisterPageProps {
  onSuccess: () => void;
  onToggleLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSuccess, onToggleLogin }) => {
  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-10">
      <div className="grid lg:grid-cols-2 gap-0 w-full max-w-4xl card rounded-[2rem] overflow-hidden shadow-lift animate-fade-in-up">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-ocean-700 via-teal-800 to-brand-900 text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-ocean-400/30 blur-3xl" />
          <div className="absolute -left-16 bottom-10 w-56 h-56 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative">
            <Logo />
          </div>
          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
              Start planning<br />
              <span className="text-gradient-warm">adventures</span> today.
            </h2>
            <p className="mt-3 text-sm text-white/60 font-medium leading-relaxed">
              Create a free account and your AI-powered trip plans, budgets and maps will follow
              you wherever you go.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                { n: "AI", l: "Itineraries" },
                { n: "$", l: "Budgets" },
                { n: "🗺️", l: "Maps" },
              ].map((s) => (
                <div key={s.l} className="bg-white/10 border border-white/10 rounded-2xl p-3 text-center">
                  <span className="text-xl font-extrabold block">{s.n}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">{s.l}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-[11px] text-white/40 font-semibold">
            Free forever · No credit card
          </p>
        </div>

        {/* Form panel */}
        <div className="bg-white/95 backdrop-blur p-8 sm:p-12 flex flex-col justify-center">
          <RegisterForm onSuccess={onSuccess} onToggleLogin={onToggleLogin} />
        </div>
      </div>
    </div>
  );
};
