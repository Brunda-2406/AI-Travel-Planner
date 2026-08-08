import React from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "sunset";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow hover:from-brand-700 hover:to-brand-600 hover:shadow-lift active:scale-[0.98]",
  secondary:
    "bg-white text-ink-soft border border-slate-200 shadow-soft hover:border-brand-300 hover:text-brand-700 hover:shadow-lift active:scale-[0.98]",
  ghost: "text-slate-500 hover:text-ink hover:bg-slate-900/5 active:scale-[0.98]",
  danger:
    "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:text-red-700 active:scale-[0.98]",
  sunset:
    "bg-gradient-to-r from-sunset-500 to-sunset-400 text-white shadow-[0_8px_20px_-8px_rgba(249,115,22,0.6)] hover:from-sunset-600 hover:to-sunset-500 hover:shadow-lift active:scale-[0.98]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3.5 py-2 text-xs rounded-xl gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-7 py-3.5 text-base rounded-2xl gap-2.5",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  children,
  ...rest
}) => {
  return (
    <button
      className={`inline-flex items-center justify-center font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner size="sm" className="border-white/40 border-t-white" />}
      {children}
    </button>
  );
};
