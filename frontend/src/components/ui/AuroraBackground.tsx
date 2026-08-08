import React from "react";

export const AuroraBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-aurora" aria-hidden="true">
      <div className="absolute -top-32 -left-24 w-[34rem] h-[34rem] rounded-full bg-ocean-300/30 blur-3xl animate-float" />
      <div className="absolute top-1/4 -right-32 w-[30rem] h-[30rem] rounded-full bg-brand-300/30 blur-3xl animate-float-slow" />
      <div className="absolute -bottom-40 left-1/3 w-[36rem] h-[36rem] rounded-full bg-sunset-300/25 blur-3xl animate-float" />
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />
    </div>
  );
};
