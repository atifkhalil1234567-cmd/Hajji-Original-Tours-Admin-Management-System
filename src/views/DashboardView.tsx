import React from 'react';
import {
  TrendingUp,
  Users,
  Ticket,
  DollarSign,
  AlertTriangle,
  Calendar,
  Plane,
  Building2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { DashboardStats } from '../types';
import { Badge } from '../components/common/Badge';

interface DashboardViewProps {
  stats: DashboardStats | null;
  recentBookings: any[];
  recentLeads: any[];
  recentPayments: any[];
  upcomingDepartures: any[];
  expiringPassports: any[];
  recentActivity: any[];
  distribution: any;
  onNavigate: (tab: any) => void;
  onOpenQuickBooking: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentBookings,
  recentLeads,
  recentPayments,
  upcomingDepartures,
  expiringPassports,
  recentActivity,
  distribution,
  onNavigate,
  onOpenQuickBooking,
}) => {
  const formatCurrency = (val: number, cur = 'USD') => {
    const symbol = cur === 'SAR' ? '﷼' : cur === 'GBP' ? '£' : '$';
    return `${symbol}${Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div id="dashboard-view" className="space-y-6 pb-12">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 text-stone-100 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Hajj 1447H / 2026 Season Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Operations Command Center
            </h1>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl">
              Live telemetry on pilgrim registrations, MOFA visa quotas, front-row Haram hotel allocations, and airline ticketing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-dash-new-booking"
              onClick={onOpenQuickBooking}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Ticket className="w-4 h-4" />
              <span>+ Register Booking</span>
            </button>
            <button
              id="btn-dash-view-packages"
              onClick={() => onNavigate('packages')}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-100 font-semibold rounded-xl text-xs sm:text-sm border border-stone-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Manage Packages</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {formatCurrency(stats?.totalRevenue || 0)}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-emerald-700 font-medium">
              Collected: {formatCurrency(stats?.totalPaid || 0)}
            </span>
            <span className="text-amber-700 font-medium">
              Pending: {formatCurrency(stats?.totalOutstanding || 0)}
            </span>
          </div>
        </div>

        {/* Card 2: Pilgrims & Bookings */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Pilgrims</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {stats?.totalPilgrims || 0}{' '}
            <span className="text-sm font-normal text-stone-500">travelers</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
            <span>{stats?.totalBookings || 0} Total Bookings</span>
            <span className="text-emerald-600 font-semibold">
              {stats?.confirmedBookings || 0} Confirmed
            </span>
          </div>
        </div>

        {/* Card 3: Leads in Pipeline */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Inquiries & Leads</span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {stats?.totalLeads || 0}{' '}
            <span className="text-sm font-normal text-stone-500">leads</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-sky-700 font-medium">
              {stats?.newLeads || 0} New Unassigned
            </span>
            <span className="text-amber-700 font-medium">
              {stats?.followupsDue || 0} Due Follow-up
            </span>
          </div>
        </div>

        {/* Card 4: Visas & Flights Status */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Logistics & Flights</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Plane className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {stats?.confirmedFlights || 0}{' '}
            <span className="text-sm font-normal text-stone-500">flights confirmed</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-600">
            <span className="text-emerald-700 font-medium">
              {stats?.activePackages || 0} Active Packages
            </span>
            <span>{stats?.totalHotels || 4} 5-Star Hotels</span>
          </div>
        </div>
      </div>

      {/* Passport Expiry Alert Notice if any */}
      {expiringPassports && expiringPassports.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Action Required: {expiringPassports.length} Pilgrim Passport(s) Expiring Within 6 Months
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Saudi Ministry of Hajj & Umrah rules require minimum 6-month validity from date of entry into Jeddah/Madinah.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {expiringPassports.map((pp: any) => (
                  <span
                    key={pp.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-medium text-amber-900"
                  >
                    <span>{pp.customer_name}</span>
                    <span className="font-mono text-[11px] text-amber-700">({pp.passport_number})</span>
                    <span className="text-rose-600 font-semibold text-[10px]">Exp: {pp.expiry_date}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigate('crm')}
            className="px-3 py-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100/80 hover:bg-amber-200 rounded-xl transition-colors shrink-0"
          >
            Review in CRM →
          </button>
        </div>
      )}

      {/* Main Grid: Departures & Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Upcoming Departures & Recent Bookings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upcoming Departures */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">Upcoming Group Departures</h3>
                <p className="text-xs text-stone-500">Seat capacity and group status for Hajj & Umrah seasons</p>
              </div>
              <button
                onClick={() => onNavigate('packages')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingDepartures && upcomingDepartures.length > 0 ? (
                upcomingDepartures.map((dep: any) => {
                  const percent = Math.round((Number(dep.booked_seats) / Number(dep.total_seats)) * 100);
                  return (
                    <div
                      key={dep.id}
                      className="p-4 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-stone-900">{dep.departure_title}</h4>
                            <span className="text-xs text-stone-500 font-medium">via {dep.origin_city}</span>
                          </div>
                          <p className="text-xs text-stone-600 mt-0.5">{dep.package_title}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-stone-900">
                            {dep.departure_date} → {dep.return_date}
                          </span>
                          <p className="text-[11px] text-stone-500 font-medium">
                            {dep.booked_seats} / {dep.total_seats} Seats ({percent}%)
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            percent >= 90
                              ? 'bg-rose-500'
                              : percent >= 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-stone-400">
                  No upcoming departures configured
                </div>
              )}
            </div>
          </div>

          {/* Recent Bookings Roster */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-stone-900">Recent Pilgrim Bookings</h3>
                <p className="text-xs text-stone-500">Live pilgrim booking status and financial clearance</p>
              </div>
              <button
                onClick={() => onNavigate('bookings')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1"
              >
                <span>All Bookings</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase tracking-wider font-semibold">
                    <th className="pb-2.5">Booking #</th>
                    <th className="pb-2.5">Pilgrim</th>
                    <th className="pb-2.5">Package</th>
                    <th className="pb-2.5">Total / Paid</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentBookings && recentBookings.length > 0 ? (
                    recentBookings.map((bk: any) => (
                      <tr key={bk.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 font-mono font-bold text-stone-900">
                          {bk.booking_number}
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-stone-800">{bk.customer_name}</div>
                          <div className="text-[11px] text-stone-500">{bk.customer_email}</div>
                        </td>
                        <td className="py-3 max-w-[200px] truncate text-stone-700">
                          {bk.package_title}
                        </td>
                        <td className="py-3">
                          <div className="font-semibold text-stone-900">
                            {formatCurrency(bk.total_amount, bk.currency)}
                          </div>
                          <div className="text-[11px] text-emerald-600 font-medium">
                            Paid: {formatCurrency(bk.paid_amount, bk.currency)}
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              bk.payment_status === 'Fully Paid'
                                ? 'success'
                                : bk.payment_status === 'Partially Paid'
                                ? 'warning'
                                : 'default'
                            }
                          >
                            {bk.payment_status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400">
                        No bookings found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: CRM Inquiries & Live Activity Stream */}
        <div className="space-y-6">
          {/* New Leads in Pipeline */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">New Inquiries & Leads</h3>
                <p className="text-xs text-stone-500">Prospective pilgrims waiting for contact</p>
              </div>
              <button
                onClick={() => onNavigate('crm')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                View Pipeline →
              </button>
            </div>

            <div className="space-y-2.5">
              {recentLeads && recentLeads.length > 0 ? (
                recentLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="p-3 rounded-xl border border-stone-100 hover:border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-stone-900">{lead.full_name}</h4>
                      <Badge
                        variant={
                          lead.priority === 'High' || lead.priority === 'Urgent'
                            ? 'danger'
                            : lead.priority === 'Medium'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {lead.priority} Priority
                      </Badge>
                    </div>
                    <p className="text-[11px] text-stone-600">{lead.package_interest || lead.destination}</p>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 mt-2 pt-1.5 border-t border-stone-200/40">
                      <span>{lead.phone}</span>
                      <span className="font-semibold text-amber-700">{lead.status}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-stone-400">
                  No pending leads
                </div>
              )}
            </div>
          </div>

          {/* Recent Payments Stream */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Recent Payment Receipts</h3>
                <p className="text-xs text-stone-500">Live transaction stream</p>
              </div>
              <button
                onClick={() => onNavigate('finance')}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                All Payments →
              </button>
            </div>

            <div className="space-y-2.5">
              {recentPayments && recentPayments.length > 0 ? (
                recentPayments.map((pay: any) => (
                  <div
                    key={pay.id}
                    className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-center justify-between gap-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-stone-900">{pay.customer_name}</p>
                      <p className="text-[11px] text-stone-500 font-mono">
                        {pay.payment_number} • {pay.payment_method_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-emerald-700 font-mono">
                        +{formatCurrency(pay.amount, pay.currency)}
                      </span>
                      <p className="text-[10px] text-stone-400">{pay.payment_date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-stone-400">
                  No payment records found
                </div>
              )}
            </div>
          </div>

          {/* System Activity Feed */}
          <div className="bg-stone-900 text-stone-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-stone-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Audit Activity</span>
              </h3>
              <span className="text-[10px] text-stone-400">Encrypted Log</span>
            </div>

            <div className="space-y-2 text-xs">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.slice(0, 5).map((act: any) => (
                  <div key={act.id} className="p-2 rounded-lg bg-stone-800/80 border border-stone-700/60">
                    <p className="text-stone-300 text-[11px]">{act.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
                      <span>{act.admin_name || act.username}</span>
                      <span className="font-mono">{act.module}:{act.action}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-stone-500">
                  No recent activity logged
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
