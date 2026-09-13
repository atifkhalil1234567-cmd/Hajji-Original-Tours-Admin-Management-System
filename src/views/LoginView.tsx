import React, { useState } from 'react';
import { MoonStar, Lock, User, Eye, EyeOff, ShieldCheck, Database } from 'lucide-react';
import { api } from '../services/api';
import { AdminUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  React.useEffect(() => {
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
      const res = await api.login({ username, password });
      if (res.success && res.token) {
        localStorage.setItem('hajji_auth_token', res.token);
        onLoginSuccess(res.user, res.token);
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAutofill = (role: 'superadmin') => {
    if (role === 'superadmin') {
      setUsername('superadmin');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Islamic Geometric Subtle Radial Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

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
            Hajj & Umrah Administration Portal
          </p>
          <p className="text-xs text-stone-400 mt-2">
            Secure enterprise access for operations, bookings, CRM & finance
          </p>
        </div>

        {/* Session Expiry Notice */}
        {sessionNotice && !error && (
          <div
            id="login-session-notice"
            className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2"
          >
            <span>ℹ️ {sessionNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            id="login-error-alert"
            className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2"
          >
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
                placeholder="superadmin or email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
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
                placeholder="••••••••"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200"
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
              <span>Authenticating...</span>
            ) : (
              <span>Sign In to Admin Portal</span>
            )}
          </button>
        </form>

        {/* Quick Demo Autofill Helper */}
        <div className="mt-6 pt-5 border-t border-stone-800/80 text-center">
          <p className="text-xs text-stone-400 mb-2">Demo Credentials</p>
          <button
            id="btn-autofill-superadmin"
            type="button"
            onClick={() => handleQuickAutofill('superadmin')}
            className="w-full py-2 px-3 text-xs font-mono bg-stone-800 hover:bg-stone-700/80 border border-stone-700 rounded-xl text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>superadmin / admin123</span>
          </button>
        </div>

        {/* Security & Engine Tag */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-emerald-400" />
            <span>MySQL Schema Active</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>RBAC 256-bit JWT</span>
          </span>
        </div>
      </div>

      <p className="mt-6 text-xs text-stone-600 text-center">
        © 2026 Hajji Original Tours Ltd. Licensed by the Ministry of Hajj & Umrah.
      </p>
    </div>
  );
};
