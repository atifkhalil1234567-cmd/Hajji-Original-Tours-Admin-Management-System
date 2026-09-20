import React, { useState, useEffect } from 'react';
import { MoonStar, Lock, Mail, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { CustomerUser } from '../types';

interface CustomerLoginViewProps {
  onLoginSuccess: (customer: CustomerUser, token: string) => void;
  onNavigateToRegister: () => void;
  onNavigateToAdminLogin: () => void;
}

export const CustomerLoginView: React.FC<CustomerLoginViewProps> = ({
  onLoginSuccess,
  onNavigateToRegister,
  onNavigateToAdminLogin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitted, setResetSubmitted] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const handleExpired = (e: any) => {
      setSessionNotice(e.detail || 'Your customer session expired. Please sign in to resume.');
    };
    window.addEventListener('hajji_customer_auth_expired', handleExpired);

    return () => window.removeEventListener('hajji_customer_auth_expired', handleExpired);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSessionNotice(null);
    setLoading(true);

    try {
      const res = await api.customerLogin({ email: email.trim(), password });
      if (res.success && res.token) {
        localStorage.setItem('hajji_customer_token', res.token);
        localStorage.setItem('hajji_customer_user', JSON.stringify(res.customer));
        onLoginSuccess(res.customer, res.token);
      } else {
        setError(res.message || 'Login failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);

    try {
      await api.customerForgotPassword({ email: resetEmail.trim() });
      setResetSubmitted(true);
    } catch (err: any) {
      setResetSubmitted(true);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-400 shadow-inner">
            <MoonStar className="w-8 h-8" />
          </div>
          <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-1">
            Pilgrim & Customer Portal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
            Hajji Original Tours
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            Sign in to track your sacred journey bookings, flight schedules, and visa status.
          </p>
        </div>

        {/* Expired Session Notice */}
        {sessionNotice && (
          <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-300 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{sessionNotice}</span>
          </div>
        )}

        {/* Error / Status Feedback */}
        {error && (
          <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 text-xs animate-in fade-in duration-200 ${
            error.toLowerCase().includes('waiting for admin approval') || error.toLowerCase().includes('pending')
              ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200'
              : error.toLowerCase().includes('suspended')
              ? 'bg-orange-500/15 border border-orange-500/40 text-orange-200'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
              error.toLowerCase().includes('waiting for admin approval') || error.toLowerCase().includes('pending')
                ? 'text-amber-400'
                : 'text-rose-400'
            }`} />
            <div className="flex-1 leading-relaxed">
              {error.toLowerCase().includes('waiting for admin approval') && (
                <div className="font-semibold text-amber-300 mb-1 uppercase tracking-wider text-[11px]">
                  Account Pending Administrator Approval
                </div>
              )}
              {error}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="input-customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-stone-850 border border-stone-750 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Password
              </label>
              <button
                type="button"
                id="btn-customer-forgot-password"
                onClick={() => {
                  setResetEmail(email);
                  setShowForgotPassword(true);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-customer-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-stone-850 border border-stone-750 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="Enter your customer password"
                autoComplete="current-password"
              />
              <button
                type="button"
                id="btn-customer-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-customer-submit-login"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>

          {/* Create Account Section */}
          <div className="pt-4 text-center text-xs text-stone-400">
            Don't have an account?{' '}
            <button
              type="button"
              id="btn-customer-goto-register"
              onClick={onNavigateToRegister}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </form>

        {/* Secondary link: Back to Admin Portal */}
        <div className="mt-8 pt-6 border-t border-stone-800 text-center">
          <button
            type="button"
            id="btn-back-to-admin-login"
            onClick={onNavigateToAdminLogin}
            className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-stone-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Staff or Administrator? Sign In to Admin Portal</span>
          </button>
        </div>
      </div>

      {/* Security & Assistance Footnote */}
      <div className="mt-8 text-center text-xs text-stone-500 flex items-center justify-center gap-3">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>Encrypted Pilgrim Data Protection</span>
        </span>
        <span>•</span>
        <span>ATOL Protected & Ministry Licensed</span>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          id="modal-customer-forgot-password"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Reset Customer Password</h2>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
              Enter your registered customer email address to receive password recovery instructions.
            </p>

            {resetSubmitted ? (
              <div className="space-y-4 text-center py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-stone-200">
                  Instructions Sent
                </p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  If this email is associated with a customer account, recovery instructions have been sent.
                </p>
                <button
                  type="button"
                  id="btn-customer-close-reset-modal"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSubmitted(false);
                  }}
                  className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl text-xs transition-colors cursor-pointer mt-4"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                    Customer Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="input-customer-reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-800 border border-stone-700 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                      placeholder="Enter your customer email"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-1/2 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    id="btn-customer-submit-reset"
                    disabled={resetLoading}
                    className="w-1/2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Recovery Email'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
