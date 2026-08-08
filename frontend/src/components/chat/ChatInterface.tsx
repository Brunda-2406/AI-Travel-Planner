import React, { useState, useRef, useEffect } from "react";
import { usePlanning } from "../../hooks/usePlanning";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { FollowUpPrompt } from "./FollowUpPrompt";
import { QuickPrompts } from "../ui/QuickPrompts";
import { CurrencyPicker } from "../ui/CurrencyPicker";

const EDIT_PROMPTS: Array<{ icon: string; text: string }> = [
  { icon: "💵", text: "Increase the budget to 50000" },
  { icon: "💱", text: "Change the currency to USD" },
  { icon: "📅", text: "Change the dates to 2026-12-10 to 2026-12-15" },
  { icon: "➕", text: "Add a waterfall visit to day 2 afternoon" },
  { icon: "➖", text: "Remove day 3" },
  { icon: "🧭", text: "Change the destination to Goa" },
];

export const ChatInterface: React.FC = () => {
  const [text, setText] = useState("");
  const { messages, loading, missingfields, sendMessage, tripData, planningstate, lockedCurrency, lockCurrency } = usePlanning();
  const activeCurrency =
    lockedCurrency ||
    tripData?.budget?.currency ||
    (planningstate?.entities?.currency as string) ||
    "USD";

  const handleCurrencySelect = async (code: string) => {
    if (loading) return;
    // Choose any world currency — it becomes the session currency and is sent
    // with every request so estimates never fall back to USD. Pickable anytime.
    lockCurrency(code);
    // Route it through the planning pipeline so the backend re-estimates the
    // budget in that currency. The "plan" wording keeps the intent engine in plantrip mode.
    await sendMessage(`Plan my trip with budget currency ${code}`);
  };
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFresh = messages.length <= 1;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!text.trim() || loading) return;
    const msg = text;
    setText("");
    await sendMessage(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[600px] lg:h-[640px] card rounded-3xl overflow-hidden shadow-lift animate-fade-in-up">
      {/* Header */}
      <div className="relative px-5 py-4 bg-gradient-to-r from-ink via-slate-800 to-brand-900 text-white overflow-hidden">
        <div className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-brand-500/30 blur-2xl" />
        <div className="absolute right-16 -bottom-12 w-28 h-28 rounded-full bg-ocean-500/25 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-ocean-400 text-white text-lg flex items-center justify-center shadow-glow">
              ✨
            </span>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-800" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-extrabold tracking-tight">Travel Assistant</h3>
            <p className="text-[11px] text-white/60 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online · AI powered
            </p>
          </div>
          <span className="hidden sm:inline-flex px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-[10px] font-extrabold uppercase tracking-wider text-white/70">
            {tripData ? "Editing mode" : "Planning mode"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-slate-50/80 to-white scrollbar-slim">
        {tripData ? (
          isFresh && (
            <div className="px-1 pt-1">
              <QuickPrompts
                prompts={EDIT_PROMPTS}
                onSelect={(prompt) => {
                  setText(prompt);
                  inputRef.current?.focus();
                }}
              />
            </div>
          )
        ) : (
          isFresh && (
            <div className="px-1 pt-1">
              <QuickPrompts
                onSelect={(prompt) => {
                  setText(prompt);
                  inputRef.current?.focus();
                }}
              />
            </div>
          )
        )}
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} role={msg.role} text={msg.text} />
        ))}
        {loading && <TypingIndicator />}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 space-y-2.5">
        {/* Budget currency — any currency in the world, changeable anytime */}
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
            💱 Budget in
          </span>
          <div className="flex-1 min-w-0">
            <CurrencyPicker
              value={activeCurrency}
              onSelect={handleCurrencySelect}
              disabled={loading}
              compact
            />
          </div>
          <span
            className={`text-[10px] font-bold shrink-0 hidden sm:block ${
              lockedCurrency ? "text-ocean-600" : "text-slate-400 font-semibold"
            }`}
            title={lockedCurrency ? `Session currency: ${lockedCurrency}` : "any world currency"}
          >
            {lockedCurrency ? "✓ set" : "any world currency"}
          </span>
        </div>
        <FollowUpPrompt
          missingFields={missingfields}
          onClickField={(field) => {
            setText(`My ${field} is `);
          }}
        />
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl outline-none resize-none focus:ring-4 focus:ring-brand-100 focus:border-brand-400 transition-all text-sm h-12 max-h-32 scrollbar-slim bg-slate-50/50 placeholder:text-slate-400 font-medium"
            placeholder={
              tripData
                ? "Modify your trip… e.g. \"swap day 2 morning to a food tour\""
                : "e.g. \"Plan a 5-day trip to Tokyo in December\""
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleSend}
            disabled={loading || !text.trim()}
            className="h-12 px-5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold shadow-glow transition-all duration-200 disabled:opacity-40 disabled:shadow-none disabled:pointer-events-none cursor-pointer flex items-center gap-2 active:scale-95"
            aria-label="Send message"
          >
            <span className="hidden sm:inline">Send</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-slate-300 font-semibold text-center">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
};
