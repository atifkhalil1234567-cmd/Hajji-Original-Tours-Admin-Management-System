import React, { useState } from 'react';
import { MoonStar, Lock, Mail, User, Phone, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { CustomerUser } from '../types';

interface CustomerRegisterViewProps {
  onRegisterSuccess: (customer: CustomerUser, token: string) => void;
  onNavigateToLogin: () => void;
  onNavigateToAdminLogin: () => void;
}

export const CustomerRegisterView: React.FC<CustomerRegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
  onNavigateToAdminLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [registeredPendingUser, setRegisteredPendingUser] = useState<{
    fullName: string;
    email: string;
    phone: string;
    customerCode: string;
    status: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.customerRegister({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });

      if (res.success) {
        // Registration successful with PENDING status.
        // User must NOT be logged in or granted access to dashboard.
        setRegisteredPendingUser({
          fullName: `${res.customer.first_name} ${res.customer.last_name}`,
          email: res.customer.email,
          phone: res.customer.phone || phone,
          customerCode: res.customer.customer_code,
          status: 'pending',
        });
      } else {
        setError(res.message || 'Registration failed. Please check your details.');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // If user just registered and is pending approval:
  if (registeredPendingUser) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-lg bg-stone-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400 shadow-inner">
              <MoonStar className="w-8 h-8" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Registration Submitted • Pending Approval
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
              Account Created Successfully
            </h1>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 mb-6 text-stone-200 text-sm leading-relaxed space-y-2">
            <p className="font-semibold text-amber-300">
              "Your account has been created and is waiting for admin approval. You will be able to sign in after your account is approved."
            </p>
            <p className="text-xs text-stone-400">
              For security and pilgrim safeguarding, an authorized administrator must review your application and assign your role before dashboard access is unlocked.
            </p>
          </div>

          <div className="bg-stone-850/80 border border-stone-800 rounded-xl p-4 mb-6 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-stone-800">
              <span className="text-stone-400">Pilgrim Name</span>
              <span className="text-stone-100 font-medium">{registeredPendingUser.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-stone-800">
              <span className="text-stone-400">Registered Email</span>
              <span className="text-stone-100 font-mono">{registeredPendingUser.email}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-stone-800">
              <span className="text-stone-400">Registration Reference</span>
              <span className="text-amber-400 font-mono font-bold">{registeredPendingUser.customerCode}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-stone-400">Account Status</span>
              <span className="text-amber-400 font-semibold uppercase tracking-wide">Pending Administrator Approval</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              id="btn-pending-goto-login"
              onClick={onNavigateToLogin}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Go to Sign In Screen</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToAdminLogin}
              className="w-full py-2 px-3 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer text-center"
            >
              Staff or Administrator? Sign In to Admin Portal
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
          <span>Hajji Original Tours • Secure Verification & Approval Workflow</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400 shadow-inner">
            <MoonStar className="w-8 h-8" />
          </div>
          <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mb-1">
            New Pilgrim Account
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white font-serif">
            Create Customer Account
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-xs">
            Join Hajji Original Tours to manage your Hajj, Umrah, and Ziyarat journeys.
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="input-register-fullname"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-stone-850 border border-stone-750 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="e.g. Mohammed Al-Rahman"
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="input-register-email"
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

          {/* Phone / WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Phone / WhatsApp
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id="input-register-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-stone-850 border border-stone-750 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="+44 7700 900123"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-register-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 bg-stone-850 border border-stone-750 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2.5 bg-stone-850 border border-stone-750 rounded-xl text-sm text-stone-100 placeholder-stone-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-colors"
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-200 cursor-pointer"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-customer-submit-register"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-colors flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          {/* Sign In Link */}
          <div className="pt-4 text-center text-xs text-stone-400">
            Already have an account?{' '}
            <button
              type="button"
              id="btn-register-goto-login"
              onClick={onNavigateToLogin}
              className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </form>

        {/* Return to Admin Portal */}
        <div className="mt-8 pt-6 border-t border-stone-800 text-center">
          <button
            type="button"
            id="btn-register-back-to-admin"
            onClick={onNavigateToAdminLogin}
            className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-stone-800/60"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Staff or Administrator? Sign In to Admin Portal</span>
          </button>
        </div>
      </div>

      {/* Security note */}
      <div className="mt-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
        <span>Your personal and travel details are secured under UK GDPR</span>
      </div>
    </div>
  );
};
