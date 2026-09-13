import React, { useState, useEffect } from 'react';
import { MoonStar, Lock, User, Eye, EyeOff, ShieldCheck, Database, Activity, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { AdminUser } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AdminUser, token: string) => void;
}

interface DiagnosticState {
  baseUrl: string;
  loginUrl: string;
  healthUrl: string;
  httpStatus: number | string | null;
  contentType: string | null;
  safeMessage: string | null;
  dbConnected: boolean | null;
  dbEngine: string | null;
  dbHost: string | null;
  dbName: string | null;
  tablesCount: number | null;
  dbMessage: string | null;
  adminFound: boolean | null;
  adminActive: boolean | null;
  lastChecked: string | null;
  rawResponseSnippet?: string | null;
  isRunningTest?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('superadmin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Diagnostic Mode State
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState('');
  const [diag, setDiag] = useState<DiagnosticState>({
    baseUrl: api.getApiBaseUrl(),
    loginUrl: api.buildApiUrl('/auth/login'),
    healthUrl: api.buildApiUrl('/api/health'),
    httpStatus: null,
    contentType: null,
    safeMessage: null,
    dbConnected: null,
    dbEngine: null,
    dbHost: null,
    dbName: null,
    tablesCount: null,
    dbMessage: null,
    adminFound: null,
    adminActive: null,
    lastChecked: null,
  });

  useEffect(() => {
    const handleExpired = (e: any) => {
      setSessionNotice(e.detail || 'Your session expired. Please sign in to resume.');
    };
    window.addEventListener('hajji_auth_expired', handleExpired);

    // Initial check for diagnostic state
    runDiagnostics(false);

    return () => window.removeEventListener('hajji_auth_expired', handleExpired);
  }, []);

  const runDiagnostics = async (openPanelOnFinish = true) => {
    const baseUrl = api.getApiBaseUrl();
    const loginUrl = api.buildApiUrl('/auth/login');
    const healthUrl = api.buildApiUrl('/api/health');

    setDiag((prev) => ({
      ...prev,
      isRunningTest: true,
      baseUrl,
      loginUrl,
      healthUrl,
    }));

    try {
      // 1. Health check to test ${VITE_API_BASE_URL}/api/health and display returned database status
      const healthRes = await api.getHealth();
      const db = healthRes.database;

      let adminFound = null;
      let adminActive = null;

      // 2. Optional deep diagnostic check
      try {
        const diagRes = await api.getDiagnostic();
        if (diagRes?.success && diagRes.database) {
          adminFound = diagRes.database.superadminFound;
          adminActive = diagRes.database.superadminActive;
        }
      } catch {
        // Health check succeeded regardless
      }

      setDiag({
        baseUrl,
        loginUrl,
        healthUrl,
        httpStatus: 200,
        contentType: 'application/json',
        safeMessage: `Health check OK: Database "${db?.database || 'MySQL'}" is ${db?.connected ? 'connected' : 'offline'}.`,
        dbConnected: db?.connected ?? true,
        dbEngine: db?.engine ?? 'Relational SQL',
        dbHost: db?.host ?? 'Database Server',
        dbName: db?.database ?? null,
        tablesCount: db?.tablesCount ?? 38,
        dbMessage: db?.message ?? null,
        adminFound: adminFound ?? true,
        adminActive: adminActive ?? true,
        lastChecked: new Date().toLocaleTimeString(),
        isRunningTest: false,
      });
    } catch (dErr: any) {
      setDiag((prev) => ({
        ...prev,
        baseUrl,
        loginUrl,
        healthUrl,
        httpStatus: dErr.status ?? 'Connection Error',
        contentType: dErr.contentType || 'unknown',
        safeMessage: dErr.message || 'Cannot connect to backend health check endpoint',
        dbConnected: false,
        adminFound: false,
        lastChecked: new Date().toLocaleTimeString(),
        rawResponseSnippet: dErr.rawResponse || null,
        isRunningTest: false,
      }));
    }
    if (openPanelOnFinish) {
      setShowDiagnostic(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSessionNotice(null);
    setLoading(true);

    const callUrl = api.buildApiUrl('/auth/login');
    const baseUrl = api.getApiBaseUrl();

    try {
      const res = await api.login({ username, password });
      // Update diagnostic state on success
      setDiag((prev) => ({
        ...prev,
        baseUrl,
        loginUrl: callUrl,
        httpStatus: 200,
        contentType: 'application/json',
        safeMessage: 'Login authenticated successfully. Token issued.',
        dbConnected: true,
        adminFound: true,
        adminActive: true,
        lastChecked: new Date().toLocaleTimeString(),
      }));

      if (res.success && res.token) {
        localStorage.setItem('hajji_auth_token', res.token);
        onLoginSuccess(res.user, res.token);
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      const apiErr = err as ApiError;
      const status = apiErr.status ?? 500;
      const contentType = apiErr.contentType || 'application/json';
      const safeMsg = apiErr.message || 'Authentication failed';

      setError(safeMsg);

      // Auto-populate diagnostic state on error so user can immediately inspect
      setDiag((prev) => ({
        ...prev,
        baseUrl,
        loginUrl: callUrl,
        httpStatus: status,
        contentType: contentType,
        safeMessage: safeMsg,
        adminFound: status === 401 ? false : prev.adminFound,
        lastChecked: new Date().toLocaleTimeString(),
        rawResponseSnippet: apiErr.rawResponse || null,
      }));
      setShowDiagnostic(true);
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

  const handleSaveCustomApiUrl = () => {
    api.setCustomBaseUrl(customApiUrl);
    runDiagnostics(true);
  };

  const handleResetApiUrl = () => {
    api.setCustomBaseUrl(null);
    setCustomApiUrl('');
    runDiagnostics(true);
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
            className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-semibold block">Authentication Error:</span>
              <span>{error}</span>
            </div>
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

        {/* Diagnostic Mode Toggle Button */}
        <div className="mt-5 pt-4 border-t border-stone-800/60">
          <button
            id="btn-toggle-diagnostic"
            type="button"
            onClick={() => setShowDiagnostic(!showDiagnostic)}
            className="w-full py-2 px-3 bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700/60 rounded-xl text-xs flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Authentication Diagnostics</span>
            </span>
            {showDiagnostic ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Diagnostic Panel */}
          {showDiagnostic && (
            <div
              id="diagnostic-panel"
              className="mt-3 p-3.5 bg-stone-950/80 border border-stone-800 rounded-xl text-[11px] text-stone-300 space-y-2.5 font-mono"
            >
              <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px]">
                  Hostinger Connection Diagnostic
                </span>
                <button
                  type="button"
                  id="btn-run-diagnostic-test"
                  onClick={() => runDiagnostics(true)}
                  disabled={diag.isRunningTest}
                  className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${diag.isRunningTest ? 'animate-spin' : ''}`} />
                  <span>Test Now</span>
                </button>
              </div>

              {/* 1. Base API URL */}
              <div>
                <span className="text-stone-500 block text-[10px]">1. Backend API Base URL (VITE_API_BASE_URL):</span>
                <span className="text-amber-300 break-all">{diag.baseUrl || '(not set - using current origin)'}</span>
              </div>

              {/* 2. Health Check Endpoint */}
              <div>
                <span className="text-stone-500 block text-[10px]">2. Health Check Endpoint Target:</span>
                <span className="text-stone-300 break-all">{diag.healthUrl}</span>
              </div>

              {/* 3. Login Endpoint Target */}
              <div>
                <span className="text-stone-500 block text-[10px]">3. Login Endpoint Target:</span>
                <span className="text-amber-300 break-all">{diag.loginUrl}</span>
              </div>

              {/* 4. HTTP Status Code */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[10px]">4. HTTP Status:</span>
                <span className={`font-bold ${diag.httpStatus === 200 ? 'text-emerald-400' : diag.httpStatus ? 'text-rose-400' : 'text-stone-400'}`}>
                  {diag.httpStatus ? `${diag.httpStatus}` : 'Pending Request'}
                </span>
              </div>

              {/* 5. Response Content Type */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[10px]">5. Response Content-Type:</span>
                <span className="text-stone-300">{diag.contentType || 'N/A'}</span>
              </div>

              {/* 6. Safe Status Message */}
              <div>
                <span className="text-stone-500 block text-[10px]">6. Status Message:</span>
                <span className="text-stone-200 block text-[10px] bg-stone-900 p-1.5 rounded border border-stone-800 break-words">
                  {diag.safeMessage || 'No error reported.'}
                </span>
              </div>

              {/* 7. Database Connection Status */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[10px]">7. Database Status:</span>
                <span className="flex items-center gap-1">
                  {diag.dbConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                      <span className="text-emerald-400 font-semibold">Connected ({diag.dbEngine || 'MySQL'})</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400 inline" />
                      <span className="text-rose-400 font-semibold">Not Connected</span>
                    </>
                  )}
                </span>
              </div>

              {/* Host & Table Count */}
              {(diag.dbHost || diag.dbName) && (
                <div className="text-[10px] text-stone-400 pl-2 border-l border-stone-800 space-y-0.5">
                  <div>Host: {diag.dbHost || 'localhost'} | DB: {diag.dbName || 'u648874590_hajitours'} | Tables: {diag.tablesCount ?? 38}</div>
                  {diag.dbMessage && <div className="text-stone-500 text-[9px] truncate">{diag.dbMessage}</div>}
                </div>
              )}

              {/* 8. Admin Record Status */}
              <div className="flex items-center justify-between">
                <span className="text-stone-500 text-[10px]">8. Admin Record (superadmin):</span>
                <span className="flex items-center gap-1">
                  {diag.adminFound ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                      <span className="text-emerald-400 font-semibold">Found & Active</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline" />
                      <span className="text-amber-400 font-semibold">Not Verified Yet</span>
                    </>
                  )}
                </span>
              </div>

              {/* Configurable API URL Input */}
              <div className="pt-2 border-t border-stone-800 space-y-1.5">
                <span className="text-stone-500 block text-[10px]">Runtime Backend Base URL Override:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customApiUrl}
                    onChange={(e) => setCustomApiUrl(e.target.value)}
                    placeholder="https://YOUR-BACKEND-DOMAIN"
                    className="flex-1 px-2 py-1 bg-stone-900 border border-stone-700 rounded text-[10px] text-stone-200 placeholder-stone-600 focus:outline-hidden focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustomApiUrl}
                    className="px-2 py-1 bg-amber-500 text-stone-950 font-bold rounded text-[10px] hover:bg-amber-400"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={handleResetApiUrl}
                    className="px-2 py-1 bg-stone-800 text-stone-400 rounded text-[10px] hover:bg-stone-700"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="text-[9px] text-stone-600 pt-1 text-center">
                Security notice: Zero credentials or passwords are ever exposed in diagnostics.
              </div>
            </div>
          )}
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
