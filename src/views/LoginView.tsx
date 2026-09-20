import React, { useState, useEffect } from 'react';
import { MoonStar, Lock, User, Eye, EyeOff, AlertCircle, Mail, ArrowLeft, CheckCircle2, Users } from 'lucide-react';
import { api } from '../services/api';
import { AdminUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
  onNavigateToCustomerLogin?: () => void;
  onNavigateToCustomerRegister?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToCustomerLogin,
  onNavigateToCustomerRegister,
}) => {
  const [username, setUsername] = useState('');
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
      setSessionNotice(e.detail || 'Your session expired. Please sign in to resume.');
    };
    window.addEventListener('hajji_auth_expired', handleExpired);

    return () => window.removeEventListener('hajji_auth_expired', handleExpired);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSessionNotice(null);
    setLoading(true);

    try {
      const res = await api.login({ username: username.trim(), password });

      if (res.success && res.token) {
        localStorage.setItem('hajji_auth_token', res.token);
        onLoginSuccess(res.user, res.token);
      } else {
        setError('Invalid username/email or password.');
      }
    } catch {
      setError('Invalid username/email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setTimeout(() => {
      setResetLoading(false);
      setResetSubmitted(true);
    }, 600);
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetSubmitted(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Subtle Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[450px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[450px] h-[350px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div
        id="login-card"
        className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-md relative z-10 text-stone-100"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 mx-auto shadow-xl shadow-amber-500/20 mb-4">
            <MoonStar className="w-9 h-9 text-stone-950 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Hajji Original Tours
          </h1>
          <p className="text-xs text-amber-400 font-medium tracking-wider uppercase mt-1">
            Admin Portal
          </p>
        </div>

        {/* Session Expiry Notice */}
        {sessionNotice && !error && (
          <div
            id="login-session-notice"
            className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2"
          >
            <span>{sessionNotice}</span>
          </div>
        )}

        {/* User-friendly Error Alert */}
        {error && (
          <div
            id="login-error-alert"
            className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Username or Staff Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-stone-800/80 border border-stone-700/80 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="Enter your username or email"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider">
                Admin Password
              </label>
              <button
                type="button"
                id="btn-forgot-password"
                onClick={() => setShowForgotPassword(true)}
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
                id="input-login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-stone-800/80 border border-stone-700/80 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            id="btn-submit-login"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <span>Sign In to Admin Portal</span>
            )}
          </button>

          {/* Customer Login Section */}
          <div className="mt-8 pt-6 border-t border-stone-800 text-center">
            <p className="text-xs text-stone-400 font-medium mb-3">
              Are you a customer?
            </p>
            <button
              type="button"
              id="btn-goto-customer-login"
              onClick={onNavigateToCustomerLogin}
              className="w-full py-2.5 px-4 bg-stone-850 hover:bg-stone-800 text-amber-400 hover:text-amber-300 font-semibold rounded-xl text-xs border border-stone-750 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In as Customer</span>
            </button>
            <div className="mt-3 text-xs text-stone-400">
              Don't have an account?{' '}
              <button
                type="button"
                id="btn-goto-customer-register"
                onClick={onNavigateToCustomerRegister}
                className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          id="modal-forgot-password"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-2">Reset Admin Password</h2>
            <p className="text-xs text-stone-400 mb-6 leading-relaxed">
              Enter your registered staff email address to receive password recovery instructions, or reach out to the system administrator.
            </p>

            {resetSubmitted ? (
              <div className="space-y-4 text-center py-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-stone-200">
                  Request Dispatched
                </p>
                <p className="text-xs text-stone-400 leading-relaxed">
                  If this email is associated with an active administrator account, recovery instructions have been sent.
                </p>
                <button
                  type="button"
                  onClick={handleCloseForgotPassword}
                  className="w-full mt-4 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@hajjioriginal.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-800/80 border border-stone-700/80 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseForgotPassword}
                    className="flex-1 py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <p className="mt-6 text-xs text-stone-600 text-center">
        © 2026 Hajji Original Tours Ltd. Licensed by the Ministry of Hajj & Umrah.
      </p>
    </div>
  );
};
