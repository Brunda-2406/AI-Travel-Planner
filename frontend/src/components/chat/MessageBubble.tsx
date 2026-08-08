import React from "react";

interface MessageBubbleProps {
  role: "user" | "assistant";
  text: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, text }) => {
  const isUser = role === "user";

  return (
    <div className={`flex w-full items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-ocean-500 text-white text-sm flex items-center justify-center shadow-soft shrink-0">
          ✨
        </span>
      )}
      <div
        className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-soft animate-pop ${
          isUser
            ? "bg-gradient-to-br from-brand-600 to-brand-500 text-white rounded-br-md"
            : "bg-white text-ink-soft border border-slate-100 rounded-bl-md"
        }`}
      >
        <span className="whitespace-pre-wrap">{text}</span>
      </div>
      {isUser && (
        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 text-white text-sm flex items-center justify-center shadow-soft shrink-0">
          👤
        </span>
      )}
    </div>
  );
};
