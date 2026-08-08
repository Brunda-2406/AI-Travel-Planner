import React from "react";

interface QuickPromptsProps {
  onSelect: (text: string) => void;
  prompts?: Array<{ icon: string; text: string }>;
}

const DEFAULT_PROMPTS: Array<{ icon: string; text: string }> = [
  { icon: "🇯🇵", text: "Plan a 5-day trip to Tokyo" },
  { icon: "🗼", text: "Romantic weekend in Paris" },
  { icon: "🏝️", text: "Beach getaway in Bali on a budget" },
  { icon: "🥾", text: "Backpacking through Thailand" },
];

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ onSelect, prompts = DEFAULT_PROMPTS }) => {
  if (prompts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p) => (
        <button
          key={p.text}
          onClick={() => onSelect(p.text)}
          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-brand-700 hover:border-brand-300 hover:shadow-soft transition-all duration-200 cursor-pointer active:scale-95"
        >
          <span className="text-sm leading-none">{p.icon}</span>
          {p.text}
        </button>
      ))}
    </div>
  );
};
