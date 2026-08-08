import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Button } from "../ui/Button";

interface RegisterFormProps {
  onSuccess?: () => void;
  onToggleLogin?: () => void;
}

const inputClass =
  "w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-4 focus:ring-brand-100 focus:border-brand-400 outline-none transition-all duration-200 text-sm font-medium placeholder:text-slate-400";

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onToggleLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { register, error, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirm) {
      setLocalError("Passwords do not match.");
      return;
    }
    const success = await register({ email, password });
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const displayError = localError || error;

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Create your account ✨
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Free forever. Save trips, budgets and maps across devices.
        </p>
      </div>

      {displayError && (
        <div className="mb-5 flex items-start gap-2.5 bg-red-50 text-red-700 p-3.5 rounded-2xl text-sm font-semibold border border-red-100 animate-fade-in-up">
          <span className="shrink-0">⚠️</span>
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
            Email address
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <input
              type="email"
              required
              className={inputClass}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              className={inputClass}
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" x2="22" y1="2" y2="22" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-2">
            Confirm password
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 11h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z" />
                <path d="M8 11V7a4 4 0 1 1 8 0" />
              </svg>
            </span>
            <input
              type={showPassword ? "text" : "password"}
              required
              className={inputClass}
              placeholder="Repeat your password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
          {loading ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      {onToggleLogin && (
        <p className="mt-6 text-center text-sm text-slate-500 font-medium">
          Already have an account?{" "}
          <button
            onClick={onToggleLogin}
            className="text-brand-600 font-extrabold hover:text-brand-700 hover:underline transition-colors cursor-pointer"
          >
            Sign in
          </button>
        </p>
      )}
    </div>
  );
};
