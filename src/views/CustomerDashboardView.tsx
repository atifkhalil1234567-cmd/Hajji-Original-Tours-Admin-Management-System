import React, { useState, useEffect } from 'react';
import {
  MoonStar,
  LogOut,
  Calendar,
  Compass,
  FileText,
  CreditCard,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Award,
  Sparkles,
  Plane,
  Building,
  RefreshCw,
  Crown,
  Briefcase,
  Layers,
  DollarSign,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import { CustomerUser, CustomerDashboardData } from '../types';

interface CustomerDashboardViewProps {
  customer: CustomerUser;
  onLogout: () => void;
}

export const CustomerDashboardView: React.FC<CustomerDashboardViewProps> = ({ customer, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'packages' | 'documents' | 'support' | 'role_perks'>('bookings');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCustomerDashboard();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError('Unable to load customer dashboard information.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeCustomer = data?.customer || customer;
  const assignedRole = activeCustomer.assigned_role || 'Customer';
  const metrics = data?.metrics || {
    totalBookings: 0,
    activeBookings: 0,
    totalPaid: 0,
    passportsCount: 0,
  };
  const bookings = data?.bookings || [];
  const passports = data?.passports || [];
  const packages = data?.featuredPackages || [];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-amber-500 selection:text-stone-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-stone-900/90 border-b border-stone-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <MoonStar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-serif font-bold text-white tracking-wide text-base">
                  Hajji Original Tours
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Portal
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Role: {assignedRole}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Customer Ref: <span className="text-amber-400 font-mono font-medium">{activeCustomer.customer_code}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-stone-200">
                {activeCustomer.first_name} {activeCustomer.last_name}
              </span>
              <span className="text-[11px] text-stone-400">{activeCustomer.email}</span>
            </div>
            <button
              type="button"
              id="btn-customer-logout"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-300 hover:text-stone-100 bg-stone-800/80 hover:bg-stone-800 border border-stone-700/80 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Pilgrim Hero Banner */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assalamu Alaikum & Welcome</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                {activeCustomer.first_name} {activeCustomer.last_name}
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
                May your pilgrimage preparations be blessed. Track your holy journey reservations, visa application statuses, flight manifests, and hotel accommodations right from your private portal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                id="btn-tab-packages"
                onClick={() => setActiveTab('packages')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/10 flex items-center gap-2 cursor-pointer"
              >
                <Compass className="w-4 h-4" />
                <span>Explore Packages</span>
              </button>
              <button
                type="button"
                id="btn-tab-support"
                onClick={() => setActiveTab('support')}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-750 text-stone-200 font-medium rounded-xl text-xs border border-stone-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Concierge Support</span>
              </button>
            </div>
          </div>
        </section>

        {/* Metric Cards Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-stone-900 border border-stone-800/90 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Bookings</span>
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white font-serif">{metrics.totalBookings}</div>
            <div className="text-[11px] text-stone-400 mt-1">Hajj & Umrah journeys</div>
          </div>

          <div className="bg-stone-900 border border-stone-800/90 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Journeys</span>
              <Compass className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-serif">{metrics.activeBookings}</div>
            <div className="text-[11px] text-stone-400 mt-1">Upcoming or confirmed</div>
          </div>

          <div className="bg-stone-900 border border-stone-800/90 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Payments Made</span>
              <CreditCard className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white font-serif">
              £{Number(metrics.totalPaid).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-stone-400 mt-1">Verified receipts</div>
          </div>

          <div className="bg-stone-900 border border-stone-800/90 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 text-stone-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Passports Registered</span>
              <FileText className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white font-serif">{metrics.passportsCount}</div>
            <div className="text-[11px] text-stone-400 mt-1">Document verification</div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>My Bookings ({bookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('packages')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'packages'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Available Packages ({packages.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Travel Passports ({passports.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'support'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Concierge & Support</span>
          </button>
          <button
            type="button"
            id="btn-tab-role-perks"
            onClick={() => setActiveTab('role_perks')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'role_perks'
                ? 'bg-amber-500 text-stone-950 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            {assignedRole === 'VIP Customer' ? (
              <>
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>VIP Privileges & Concierge</span>
              </>
            ) : assignedRole === 'Travel Agent' || assignedRole === 'Booking Agent' ? (
              <>
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Agent B2B Group Bookings</span>
              </>
            ) : assignedRole === 'Finance' ? (
              <>
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finance & Statements</span>
              </>
            ) : assignedRole === 'Operations' ? (
              <>
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Operations & Logistics</span>
              </>
            ) : assignedRole === 'Manager' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Managerial Oversight</span>
              </>
            ) : (
              <>
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Role Features ({assignedRole})</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh dashboard data"
            className="ml-auto p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-900 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tab Content: 1. My Bookings */}
        {activeTab === 'bookings' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white font-serif">My Pilgrimage Reservations</h2>
                <p className="text-xs text-stone-400">All registered package bookings under your customer account.</p>
              </div>
            </div>

            {loading ? (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center text-stone-400 text-xs">
                Loading your journey reservations...
              </div>
            ) : bookings.length === 0 ? (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-stone-800 text-stone-500 flex items-center justify-center mx-auto">
                  <Compass className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-stone-200">No active bookings found</h3>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    You do not have any confirmed pilgrimage bookings linked to this email yet. Explore our upcoming packages below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('packages')}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Browse Packages</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {bookings.map((booking: any) => (
                  <div
                    key={booking.id}
                    className="bg-stone-900 border border-stone-800 hover:border-stone-700/80 rounded-2xl p-5 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          {booking.booking_reference}
                        </span>
                        <h3 className="font-semibold text-white text-sm">
                          {booking.package_title || 'Sacred Journey Package'}
                        </h3>
                      </div>
                      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 w-fit">
                        {booking.status_label || 'Confirmed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-stone-400 block text-[11px]">Type / Category</span>
                        <span className="font-medium text-stone-200 capitalize">{booking.package_type || 'Umrah'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">Travelers</span>
                        <span className="font-medium text-stone-200">{booking.travelers_count || 1} Pilgrim(s)</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">Departure City</span>
                        <span className="font-medium text-stone-200">{booking.origin_city || 'London Heathrow'}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block text-[11px]">Total Package Cost</span>
                        <span className="font-medium text-amber-400 font-serif">
                          £{Number(booking.total_amount || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 text-xs">
                      <div className="flex items-center gap-4 text-stone-400">
                        <span>
                          Paid: <strong className="text-stone-200 font-serif">£{Number(booking.paid_amount || 0).toLocaleString('en-GB')}</strong>
                        </span>
                        <span>
                          Balance Due: <strong className="text-amber-400 font-serif">£{Number(booking.balance_due || 0).toLocaleString('en-GB')}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('support')}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Need Assistance? Contact Agent</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab Content: 2. Available Packages */}
        {activeTab === 'packages' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white font-serif">Featured Packages & Tours</h2>
              <p className="text-xs text-stone-400">Curated packages with verified 5-star hotels, luxury transport, and guided spiritual mentors.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {packages.map((pkg: any) => (
                <div
                  key={pkg.id}
                  className="bg-stone-900 border border-stone-800 hover:border-amber-500/40 rounded-2xl overflow-hidden flex flex-col transition-all group"
                >
                  <div className="h-40 bg-stone-800 relative overflow-hidden">
                    {pkg.featured_image || pkg.banner_image ? (
                      <img
                        src={pkg.featured_image || pkg.banner_image}
                        alt={pkg.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-850 text-stone-600">
                        <MoonStar className="w-12 h-12 text-amber-500/20" />
                      </div>
                    )}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-stone-950/80 backdrop-blur-md border border-stone-800 text-[10px] uppercase font-bold tracking-wider text-amber-400">
                      {pkg.package_type === 'holiday'
                        ? 'Holiday Tour'
                        : pkg.package_type === 'vip_hajj'
                        ? 'VIP Hajj'
                        : pkg.package_type || 'Umrah'}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors font-serif">
                        {pkg.title}
                      </h3>
                      <div className="flex items-center gap-4 text-stone-400 text-xs mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-stone-500" />
                          <span>{pkg.duration_days || 14} Days</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Plane className="w-3.5 h-3.5 text-stone-500" />
                          <span>{pkg.origin_city || 'London'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Starting From</span>
                        <span className="text-base font-bold text-white font-serif">
                          £{Number(pkg.starting_price || 0).toLocaleString('en-GB')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('support')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                      >
                        Inquire Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tab Content: 3. Documents */}
        {activeTab === 'documents' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white font-serif">Registered Travel Passports</h2>
              <p className="text-xs text-stone-400">
                Official pilgrim travel documents on file with the Saudi Ministry of Hajj & Umrah.
              </p>
            </div>

            {passports.length === 0 ? (
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-10 text-center space-y-3">
                <FileText className="w-8 h-8 text-stone-600 mx-auto" />
                <h3 className="text-sm font-semibold text-stone-200">No passports on file</h3>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  Please submit a copy of your passport photo page to your designated Hajji Original Tours consultant for visa processing.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('support')}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-750 text-amber-400 text-xs font-medium rounded-xl border border-stone-700 transition-colors cursor-pointer"
                >
                  Contact Documentation Team
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {passports.map((item: any) => (
                  <div key={item.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-400" />
                        <span className="font-mono font-bold text-sm text-white">
                          {item.passport_number || 'PASSPORT-XXXX'}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400">
                        {item.given_names} {item.surname} • {item.issuing_country || 'United Kingdom'}
                      </p>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Verified
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab Content: 4. Concierge & Support */}
        {activeTab === 'support' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white font-serif">Dedicated Pilgrim Concierge</h2>
              <p className="text-xs text-stone-400">
                Direct lines of communication for journey coordination, visa assistance, and 24/7 on-the-ground UK & Saudi support.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">UK Main Office Hotline</h3>
                <p className="text-xs text-stone-400">Monday - Saturday: 9:00 AM - 6:00 PM GMT</p>
                <div className="pt-2 text-sm font-semibold text-emerald-400 font-mono">
                  +44 (0) 20 7946 0912
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Pilgrim Support Desk</h3>
                <p className="text-xs text-stone-400">Response within 24 business hours</p>
                <div className="pt-2 text-sm font-semibold text-amber-400 font-mono">
                  pilgrims@hajjioriginal.com
                </div>
              </div>

              <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-white">Saudi Emergency On-Ground</h3>
                <p className="text-xs text-stone-400">Makkah & Madinah local dispatch team</p>
                <div className="pt-2 text-sm font-semibold text-purple-400 font-mono">
                  +966 54 123 4567
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab Content: 5. Role-Based Features & Permissions */}
        {activeTab === 'role_perks' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white font-serif">
                    Role Privileges & Access
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {assignedRole}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  Exclusive operational tools and services authorized for your account role by the agency administrator.
                </p>
              </div>
            </div>

            {/* VIP Customer Role Specific Tools */}
            {assignedRole === 'VIP Customer' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/20 border border-amber-500/40 rounded-3xl p-6 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                      <Crown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-serif">Royal VIP Executive Privileges</h3>
                      <p className="text-xs text-amber-200/80">Premium white-glove pilgrimage concierge activated</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-4">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Executive Lounge</div>
                      <div className="text-sm font-semibold text-white">Jeddah & Madinah Lounge Access</div>
                      <p className="text-[11px] text-stone-400 mt-1">Complimentary refreshments and private immigration lane pass.</p>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Pass Active
                      </div>
                    </div>

                    <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-4">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Chauffeur Service</div>
                      <div className="text-sm font-semibold text-white">Private GMC Yukon Dedicated Transfers</div>
                      <p className="text-[11px] text-stone-400 mt-1">Door-to-door dedicated transport between airport, reserved hotel accommodations, and destinations.</p>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Priority Dispatch
                      </div>
                    </div>

                    <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-4">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Personal Muallim</div>
                      <div className="text-sm font-semibold text-white">1-on-1 Religious Guidance</div>
                      <p className="text-[11px] text-stone-400 mt-1">Certified scholar accompanying your tawaf, sa'i, and ziyarat excursions.</p>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Assigned
                      </div>
                    </div>

                    <div className="bg-stone-900/90 border border-amber-500/20 rounded-2xl p-4">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">Luggage Concierge</div>
                      <div className="text-sm font-semibold text-white">Direct-to-Room Baggage Care</div>
                      <p className="text-[11px] text-stone-400 mt-1">Seamless airport-to-hotel room luggage handling with insurance.</p>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                        <Check className="w-3.5 h-3.5" /> Enabled
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Travel Agent / Booking Agent Specific Tools */}
            {(assignedRole === 'Travel Agent' || assignedRole === 'Booking Agent') && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-blue-500/30 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-serif">B2B Travel Agent Booking Station</h3>
                      <p className="text-xs text-stone-400">Authorized group pilgrim reservation and sub-agency allocation desk</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Group Booking Request</h4>
                      <p className="text-xs text-stone-400 mb-3">Submit pilgrim groups (10+ travelers) for block allocations with preferred hotel towers.</p>
                      <span className="text-xs font-semibold text-blue-400">Agent Wholesale Rates Applied</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Sub-Agent Manifest</h4>
                      <p className="text-xs text-stone-400 mb-3">Download assigned pilgrim passenger manifests with Nusuk and MOFA visa serials.</p>
                      <span className="text-xs font-semibold text-blue-400">CSV & PDF Exports Authorized</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Commission & Invoicing</h4>
                      <p className="text-xs text-stone-400 mb-3">Track agency net receivables, deposits, and confirmed commission statements.</p>
                      <span className="text-xs font-semibold text-blue-400">B2B Commission Ledger</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Finance Role Specific Tools */}
            {assignedRole === 'Finance' && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-emerald-500/30 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-serif">Finance & Payment Reconciliation</h3>
                      <p className="text-xs text-stone-400">Ledger accounting, VAT receipt verification, and bank reconciliation statements</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">VAT Invoices & Receipts</h4>
                      <p className="text-xs text-stone-400 mb-3">Access tax-compliant billing documentation approved by the Saudi ZATCA framework.</p>
                      <span className="text-xs font-semibold text-emerald-400">VAT Reference: KSA-VAT-90214</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Account Balance Statement</h4>
                      <p className="text-xs text-stone-400 mb-3">Real-time ledger of paid installments, pending bank transfers, and refundable deposits.</p>
                      <span className="text-xs font-semibold text-emerald-400">Settled Account Balance</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Ministry Payment Audit</h4>
                      <p className="text-xs text-stone-400 mb-3">Direct link with Ministry of Hajj & Umrah escrow verification for package payments.</p>
                      <span className="text-xs font-semibold text-emerald-400">Escrow Security Cleared</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Operations Role Specific Tools */}
            {assignedRole === 'Operations' && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-cyan-500/30 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-serif">Operations & Ground Logistics</h3>
                      <p className="text-xs text-stone-400">Flight schedules, hotel rooming allocations, and Saudi coach transfers</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Flight Manifest</h4>
                      <p className="text-xs text-stone-400 mb-3">Air tickets, PNR records, and Jeddah / Madinah terminal arrival coordination.</p>
                      <span className="text-xs font-semibold text-cyan-400">Scheduled Flight Status</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Hotel Rooming Block</h4>
                      <p className="text-xs text-stone-400 mb-3">Reserved property room allocations and keycard readiness.</p>
                      <span className="text-xs font-semibold text-cyan-400">Direct Hotel Vouchers</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Ground Transport Fleet</h4>
                      <p className="text-xs text-stone-400 mb-3">SAPTCO VIP coach schedules, Mina train pass allocations, and luggage trucks.</p>
                      <span className="text-xs font-semibold text-cyan-400">GPS Fleet Tracking</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Manager Role Specific Tools */}
            {assignedRole === 'Manager' && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-purple-500/30 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-serif">Managerial Oversight & Pilgrim Safeguarding</h3>
                      <p className="text-xs text-stone-400">Executive supervisory tools, escalations desk, and ATOL / Ministry regulatory compliance</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Pilgrim Manifest Audit</h4>
                      <p className="text-xs text-stone-400 mb-3">Audit traveler documentation completeness, emergency contacts, and medical disclosures.</p>
                      <span className="text-xs font-semibold text-purple-400">Audit Compliance: 100%</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Escalations Dispatch</h4>
                      <p className="text-xs text-stone-400 mb-3">Priority resolution for special visa requirements, medical assistance, or hotel issues.</p>
                      <span className="text-xs font-semibold text-purple-400">Direct Managerial Channel</span>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Regulatory Credentials</h4>
                      <p className="text-xs text-stone-400 mb-3">ATOL 11982 & Saudi Ministry License KSA-HAJJ-LIC-1447-9021 verified valid.</p>
                      <span className="text-xs font-semibold text-purple-400">Ministry Approved</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standard Customer Role */}
            {assignedRole === 'Customer' && (
              <div className="space-y-4">
                <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-serif">Verified Pilgrim Membership</h3>
                      <p className="text-xs text-stone-400">Approved customer account for personal Hajj & Umrah journey tracking</p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Self-Service Document Vault</h4>
                      <p className="text-xs text-stone-400">Manage your passport copies, vaccination certificates, and passport photos.</p>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">Live Journey Tracking</h4>
                      <p className="text-xs text-stone-400">Real-time status of your flight confirmations, Nusuk visa issuance, and hotels.</p>
                    </div>
                    <div className="bg-stone-850 p-4 rounded-2xl border border-stone-800">
                      <h4 className="text-sm font-bold text-white mb-1">24/7 Pilgrimage Helpline</h4>
                      <p className="text-xs text-stone-400">Access support numbers for our UK and Saudi teams throughout your trip.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} Hajji Original Tours. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>Customer Portal v1.2</span>
            <span>•</span>
            <span className="text-stone-400">ATOL & Ministry of Hajj & Umrah Accredited</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
