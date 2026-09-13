import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  DollarSign,
  User,
  Plane,
  Eye,
  FileText,
  CreditCard,
  Building2,
} from 'lucide-react';
import { api } from '../services/api';
import { Booking, Customer, Package, PackageDeparture } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface BookingsViewProps {
  initialOpenNewBooking?: boolean;
  onCloseNewBookingModal?: () => void;
}

export const BookingsView: React.FC<BookingsViewProps> = ({
  initialOpenNewBooking = false,
  onCloseNewBookingModal,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [departures, setDepartures] = useState<PackageDeparture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(initialOpenNewBooking);
  const [selectedBookingForDetails, setSelectedBookingForDetails] = useState<Booking | null>(null);

  // New Booking Form
  const [bkForm, setBkForm] = useState({
    customer_id: 1,
    package_id: 1,
    departure_id: 1,
    num_adults: 2,
    num_children: 0,
    room_preference: 'Double Haram View',
    special_requests: 'Wheelchair assistance requested at Jeddah airport and Haram courtyard.',
    travelers: [
      {
        first_name: 'Mohammed',
        last_name: 'Al-Rahman',
        gender: 'Male',
        passport_number: 'GB98214401',
        passport_expiry: '2028-08-15',
        nationality: 'British',
        date_of_birth: '1975-04-12',
      },
      {
        first_name: 'Fatima',
        last_name: 'Al-Rahman',
        gender: 'Female',
        passport_number: 'GB98214402',
        passport_expiry: '2028-08-15',
        nationality: 'British',
        date_of_birth: '1979-11-20',
      },
    ],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [bkRes, custRes, pkgRes, depRes] = await Promise.all([
        api.getBookings(),
        api.getCustomers(),
        api.getPackages(),
        api.getPackageDepartures(),
      ]);
      if (bkRes.success) setBookings(bkRes.data);
      if (custRes.success) setCustomers(custRes.data);
      if (pkgRes.success) setPackages(pkgRes.data);
      if (depRes.success) setDepartures(depRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialOpenNewBooking) {
      setIsNewBookingModalOpen(true);
    }
  }, [initialOpenNewBooking]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedPkg = packages.find((p) => p.id === Number(bkForm.package_id));
      const startingPrice = selectedPkg?.starting_price || 4500;
      const totalAmount = startingPrice * (Number(bkForm.num_adults) + Number(bkForm.num_children) * 0.7);

      const res = await api.createBooking({
        ...bkForm,
        subtotal_amount: totalAmount,
        total_amount: totalAmount,
        currency: selectedPkg?.currency || 'USD',
      });

      if (res.success) {
        setIsNewBookingModalOpen(false);
        if (onCloseNewBookingModal) onCloseNewBookingModal();
        alert(`Booking ${res.bookingNumber} created successfully!`);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create booking');
    }
  };

  const handleUpdateStatus = async (bookingId: number, statusField: string, value: string | number) => {
    try {
      await api.updateBookingStatus(bookingId, { [statusField]: value });
      loadData();
      if (selectedBookingForDetails && selectedBookingForDetails.id === bookingId) {
        const updated = await api.getBookingById(bookingId);
        if (updated.success) setSelectedBookingForDetails(updated.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const term = search.toLowerCase();
    const matchesSearch =
      b.booking_number.toLowerCase().includes(term) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(term)) ||
      (b.package_title && b.package_title.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'all' || b.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="bookings-view" className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Bookings & Traveler Rosters
          </h2>
          <p className="text-xs text-stone-500">
            Pilgrim reservations, group manifests, payment clearances and operational statuses
          </p>
        </div>

        <button
          id="btn-create-booking"
          onClick={() => setIsNewBookingModalOpen(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Booking</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by booking #, pilgrim name, or package..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
          />
        </div>

        {/* Payment Filter */}
        <div className="flex items-center gap-2">
          {['all', 'Fully Paid', 'Partially Paid', 'Unpaid'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st === 'all' ? 'All Payments' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Booking #</th>
                <th className="px-5 py-3">Lead Pilgrim</th>
                <th className="px-5 py-3">Package & Group</th>
                <th className="px-5 py-3">Financial Status</th>
                <th className="px-5 py-3">Logistics Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">
                    Loading reservations...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((bk) => (
                  <tr key={bk.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-mono font-bold text-stone-900 text-sm">
                        {bk.booking_number}
                      </div>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        {bk.created_at?.slice(0, 10) || '2026-02-15'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-stone-900">{bk.customer_name}</div>
                      <div className="text-[11px] text-stone-500">{bk.customer_email}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">
                        {bk.total_travelers || 2} Traveler(s)
                      </div>
                    </td>
                    <td className="px-5 py-3.5 max-w-xs">
                      <div className="font-semibold text-stone-800 line-clamp-1">
                        {bk.package_title}
                      </div>
                      <div className="text-[11px] text-amber-700 font-medium">
                        {bk.departure_title || 'Group Flight'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-stone-900">
                        {bk.currency === 'SAR' ? '﷼' : bk.currency === 'GBP' ? '£' : '$'}
                        {Number(bk.total_amount).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-medium">
                        Paid: {bk.currency === 'SAR' ? '﷼' : bk.currency === 'GBP' ? '£' : '$'}
                        {Number(bk.paid_amount || 0).toLocaleString()}
                      </div>
                      <div className="mt-1">
                        <Badge
                          variant={
                            bk.payment_status === 'Fully Paid'
                              ? 'success'
                              : bk.payment_status === 'Partially Paid'
                              ? 'warning'
                              : 'danger'
                          }
                        >
                          {bk.payment_status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-stone-400">Visa:</span>
                        <span className="font-semibold text-stone-800">{bk.visa_status}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-stone-400">Flight:</span>
                        <span className="font-semibold text-stone-800">{bk.flight_status}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={async () => {
                          const res = await api.getBookingById(bk.id);
                          if (res.success) setSelectedBookingForDetails(res.data);
                        }}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Booking Details & Status Management */}
      {selectedBookingForDetails && (
        <Modal
          isOpen={!!selectedBookingForDetails}
          onClose={() => setSelectedBookingForDetails(null)}
          title={`Booking ${selectedBookingForDetails.booking_number}`}
          subtitle="Manage travelers roster, flight PNRs, and operational clearances"
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Header info banner */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-stone-400 font-medium">Customer:</span>
                <p className="font-bold text-stone-900 text-sm">{selectedBookingForDetails.customer_name}</p>
                <p className="text-stone-500">{selectedBookingForDetails.customer_phone}</p>
              </div>
              <div>
                <span className="text-stone-400 font-medium">Package:</span>
                <p className="font-bold text-stone-900">{selectedBookingForDetails.package_title}</p>
                <p className="text-stone-500">{selectedBookingForDetails.departure_title}</p>
              </div>
              <div>
                <span className="text-stone-400 font-medium">Total Balance:</span>
                <p className="font-bold text-stone-900 text-sm">
                  {selectedBookingForDetails.currency === 'SAR' ? '﷼' : selectedBookingForDetails.currency === 'GBP' ? '£' : '$'}
                  {Number(selectedBookingForDetails.total_amount).toLocaleString()}
                </p>
                <p className="text-emerald-700 font-semibold">
                  Paid: {selectedBookingForDetails.currency === 'SAR' ? '﷼' : selectedBookingForDetails.currency === 'GBP' ? '£' : '$'}
                  {Number(selectedBookingForDetails.paid_amount || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-stone-400 font-medium">Payment Clearance:</span>
                <div className="mt-1">
                  <Badge
                    variant={
                      selectedBookingForDetails.payment_status === 'Fully Paid' ? 'success' : 'warning'
                    }
                  >
                    {selectedBookingForDetails.payment_status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Status Modifiers */}
            <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl">
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider mb-2">
                Operational Status Controls
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Visa & MOFA Status</label>
                  <select
                    value={selectedBookingForDetails.visa_status}
                    onChange={(e) =>
                      handleUpdateStatus(selectedBookingForDetails.id, 'visa_status', e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="Documents Pending">Documents Pending</option>
                    <option value="Submitted to MOFA">Submitted to MOFA</option>
                    <option value="Approved">Approved (Visa Issued)</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Flight Ticketing Status</label>
                  <select
                    value={selectedBookingForDetails.flight_status}
                    onChange={(e) =>
                      handleUpdateStatus(selectedBookingForDetails.id, 'flight_status', e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="Unassigned">Unassigned</option>
                    <option value="Booked">Group Seat Reserved</option>
                    <option value="Ticketed">E-Tickets Issued</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-600 mb-1 font-medium">Hotel Accommodation</label>
                  <select
                    value={selectedBookingForDetails.hotel_status}
                    onChange={(e) =>
                      handleUpdateStatus(selectedBookingForDetails.id, 'hotel_status', e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-xl"
                  >
                    <option value="Pending">Pending Room Allocation</option>
                    <option value="Reserved">Room Reserved</option>
                    <option value="Confirmed">Voucher Issued</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Travelers Manifest Roster */}
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                Pilgrims in this Booking ({selectedBookingForDetails.travelers?.length || 0})
              </h4>
              <div className="border border-stone-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-2">Traveler Name</th>
                      <th className="px-4 py-2">Passport #</th>
                      <th className="px-4 py-2">Gender & Nationality</th>
                      <th className="px-4 py-2">Visa Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedBookingForDetails.travelers && selectedBookingForDetails.travelers.length > 0 ? (
                      selectedBookingForDetails.travelers.map((tr: any) => (
                        <tr key={tr.id}>
                          <td className="px-4 py-2.5 font-bold text-stone-900">
                            {tr.first_name} {tr.last_name}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-stone-700">
                            {tr.passport_number || 'Pending'}
                          </td>
                          <td className="px-4 py-2.5 text-stone-600">
                            {tr.gender} • {tr.nationality}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-emerald-700">
                            {tr.visa_status || 'Submitted'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-stone-400">
                          No traveler records found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments list on this booking */}
            <div>
              <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-2">
                Attached Payments & Receipts ({selectedBookingForDetails.payments?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedBookingForDetails.payments && selectedBookingForDetails.payments.length > 0 ? (
                  selectedBookingForDetails.payments.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-950">{p.payment_number}</span>
                        <p className="text-emerald-800 text-[11px] mt-0.5">
                          {p.payment_method_name || 'Bank Transfer'} • Ref: {p.transaction_reference}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-900 text-sm">
                          +{p.currency === 'SAR' ? '﷼' : p.currency === 'GBP' ? '£' : '$'}
                          {Number(p.amount).toLocaleString()}
                        </span>
                        <p className="text-[10px] text-stone-500">{p.payment_date}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400 italic">No payments logged for this reservation yet.</p>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: New Booking Wizard */}
      <Modal
        isOpen={isNewBookingModalOpen}
        onClose={() => {
          setIsNewBookingModalOpen(false);
          if (onCloseNewBookingModal) onCloseNewBookingModal();
        }}
        title="Register New Pilgrim Booking"
        subtitle="Allocate package, departures, travelers, and generate confirmation"
        maxWidth="4xl"
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Select Customer *
              </label>
              <select
                value={bkForm.customer_id}
                onChange={(e) => setBkForm({ ...bkForm, customer_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name} ({c.customer_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Select Package *
              </label>
              <select
                value={bkForm.package_id}
                onChange={(e) => setBkForm({ ...bkForm, package_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                {packages.map((p) => {
                  const isOff = p.status !== 'published';
                  return (
                    <option key={p.id} value={p.id}>
                      {isOff ? '[OFF / Inactive] ' : '● '}{p.title} (From {p.currency === 'SAR' ? '﷼' : p.currency === 'GBP' ? '£' : '$'}{p.starting_price})
                    </option>
                  );
                })}
              </select>
              {(() => {
                const selectedPkg = packages.find((p) => p.id === Number(bkForm.package_id));
                if (selectedPkg && selectedPkg.status !== 'published') {
                  return (
                    <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>
                        Note: This package is currently turned <strong>OFF (Inactive)</strong> in the catalog. You can turn it ON in the Packages tab.
                      </span>
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Group Departure Date *
              </label>
              <select
                value={bkForm.departure_id}
                onChange={(e) => setBkForm({ ...bkForm, departure_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                {departures.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departure_title} ({d.departure_date} → {d.return_date})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Adults (12+)
                </label>
                <input
                  type="number"
                  min="1"
                  value={bkForm.num_adults}
                  onChange={(e) => setBkForm({ ...bkForm, num_adults: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Children (2-11)
                </label>
                <input
                  type="number"
                  min="0"
                  value={bkForm.num_children}
                  onChange={(e) => setBkForm({ ...bkForm, num_children: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Room Sharing & Bedding Preference
              </label>
              <input
                type="text"
                value={bkForm.room_preference}
                onChange={(e) => setBkForm({ ...bkForm, room_preference: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => {
                setIsNewBookingModalOpen(false);
                if (onCloseNewBookingModal) onCloseNewBookingModal();
              }}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Confirm Reservation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
