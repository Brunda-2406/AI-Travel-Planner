import React from "react";
import { Spinner } from "../ui/Spinner";

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = "Loading…" }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Spinner size="lg" />
      <p className="text-slate-400 font-semibold text-sm animate-pulse">{message}</p>
    </div>
  );
};
