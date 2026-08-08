import React from "react";

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-end gap-2.5">
      <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-ocean-500 text-white text-sm flex items-center justify-center shadow-soft shrink-0">
        ✨
      </span>
      <div className="bg-white border border-slate-100 px-4 py-3.5 rounded-2xl rounded-bl-md shadow-soft flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
};
