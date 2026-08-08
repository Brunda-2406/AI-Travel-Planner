import React from "react";
import { LoginForm } from "../components/auth/LoginForm";
import { Logo } from "../components/ui/Logo";

interface LoginPageProps {
  onSuccess: () => void;
  onToggleRegister: () => void;
}

const PERKS = [
  { icon: "🗺️", text: "Save your custom itineraries and reload them anytime" },
  { icon: "📄", text: "Export polished PDF trip documents" },
  { icon: "✏️", text: "Keep editing your trips across sessions" },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onToggleRegister }) => {
  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center px-4 py-10">
      <div className="grid lg:grid-cols-2 gap-0 w-full max-w-4xl card rounded-[2rem] overflow-hidden shadow-lift animate-fade-in-up">
        {/* Brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-ink via-slate-800 to-brand-900 text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="absolute -left-16 bottom-10 w-56 h-56 rounded-full bg-ocean-500/25 blur-3xl" />
          <div className="relative">
            <Logo />
          </div>
          <div className="relative">
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
              Welcome back,<br />
              <span className="text-gradient-warm">traveler.</span>
            </h2>
            <p className="mt-3 text-sm text-white/60 font-medium leading-relaxed">
              Sign in to access your saved journeys and keep planning the places you've always
              dreamed of visiting.
            </p>
            <ul className="mt-8 space-y-3.5">
              {PERKS.map((p) => (
                <li key={p.text} className="flex items-center gap-3 text-sm font-semibold text-white/85">
                  <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-base shrink-0">
                    {p.icon}
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-[11px] text-white/40 font-semibold">
            Plan smarter · Travel further
          </p>
        </div>

        {/* Form panel */}
        <div className="bg-white/95 backdrop-blur p-8 sm:p-12 flex flex-col justify-center">
          <LoginForm onSuccess={onSuccess} onToggleRegister={onToggleRegister} />
        </div>
      </div>
    </div>
  );
};
