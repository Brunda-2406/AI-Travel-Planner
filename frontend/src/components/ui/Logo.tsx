import React from "react";

interface LogoProps {
  compact?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ compact = false }) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-ocean-500 text-white shadow-glow">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <span className="font-display text-[15px] font-extrabold tracking-tight text-ink block">
            AroundTheWorld ✈️🌎
          </span>
          <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-400 block">
            Wander · Plan · Explore
          </span>
        </div>
      )}
    </div>
  );
};
