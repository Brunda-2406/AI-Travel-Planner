import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-[3px]",
    lg: "w-10 h-10 border-4",
  };
  return (
    <span
      className={`${sizes[size]} inline-block rounded-full border-brand-200 border-t-brand-600 animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};
