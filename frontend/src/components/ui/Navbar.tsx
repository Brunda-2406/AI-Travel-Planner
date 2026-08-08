import React from "react";
import { Logo } from "./Logo";
import { Button } from "./Button";

export type AppView = "planner" | "saved-trips" | "login" | "register";

interface NavbarProps {
  view: AppView;
  onNavigate: (view: AppView) => void;
  isAuthenticated: boolean;
  userEmail?: string | null;
  onSignOut: () => void;
}

const navItems: Array<{ key: AppView; label: string; icon: string }> = [
  { key: "planner", label: "Planner", icon: "✈️" },
  { key: "saved-trips", label: "Saved Trips", icon: "🎒" },
];

export const Navbar: React.FC<NavbarProps> = ({
  view,
  onNavigate,
  isAuthenticated,
  userEmail,
  onSignOut,
}) => {
  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6">
      <div className="glass rounded-2xl mt-4 px-4 sm:px-6 py-3 shadow-soft flex items-center justify-between max-w-[1600px] mx-auto">
        <button
          onClick={() => onNavigate("planner")}
          className="cursor-pointer transition-transform hover:scale-[1.02]"
          aria-label="Go to planner"
        >
          <Logo />
        </button>

        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                aria-current={active ? "page" : undefined}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 ${
                  active
                    ? "bg-brand-600 text-white shadow-glow"
                    : "text-slate-500 hover:text-ink hover:bg-slate-900/5"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/70 border border-slate-200/70">
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-ocean-500 text-white text-[11px] font-extrabold flex items-center justify-center uppercase">
                  {userEmail?.[0] || "G"}
                </span>
                <span className="text-xs font-semibold text-slate-600 max-w-[140px] truncate">
                  {userEmail}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={onSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => onNavigate("login")}>
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="md:hidden glass rounded-2xl mt-2 px-2 py-1.5 flex items-center justify-center gap-1 shadow-soft">
        {navItems.map((item) => {
          const active = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              aria-current={active ? "page" : undefined}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                active
                  ? "bg-brand-600 text-white shadow-glow"
                  : "text-slate-500 hover:text-ink"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
