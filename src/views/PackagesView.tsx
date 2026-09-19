import React, { useState, useEffect } from 'react';
import {
  Package as PackageIcon,
  Plus,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  Search,
  Filter,
  Power,
} from 'lucide-react';
import { api } from '../services/api';
import { Package, PackageCategory } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { CURRENCY_CODE_MAP, resolveCurrency, getCurrencySymbol } from '../utils/currency';

export const PackagesView: React.FC = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [categories, setCategories] = useState<PackageCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Modal States
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isDepartureModalOpen, setIsDepartureModalOpen] = useState(false);
  const [selectedPackageForDep, setSelectedPackageForDep] = useState<Package | null>(null);

  // Package Form State (Used for both Create and Edit)
  const [pkgForm, setPkgForm] = useState({
    title: '',
    category_id: 1,
    package_type: 'vip_hajj',
    hajj_type: 'non_shifting',
    gregorian_year: 2026,
    duration_days: 18,
    origin_city: 'London Heathrow',
    destination_city: 'Jeddah / Madinah',
    starting_price: 11500,
    currency: 'USD',
    currency_id: 1,
    total_seats: 60,
    status: 'published',
    short_description: 'Luxury 5-Star front-row Haram hotels with VIP Mina air-conditioned tents and private GMC transport.',
  });

  // New Departure Form State
  const [depForm, setDepForm] = useState({
    departure_title: 'Group Flight Departure',
    departure_date: '2026-06-12',
    return_date: '2026-06-30',
    total_seats: 50,
    status: 'available',
  });

  const loadPackages = async () => {
    setLoading(true);
    try {
      const res = await api.getPackages();
      if (res.success) setPackages(res.data);
      const catRes = await api.getPackageCategories();
      if (catRes.success) setCategories(catRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPackage(null);
    setPkgForm({
      title: '',
      category_id: 1,
      package_type: 'vip_hajj',
      hajj_type: 'non_shifting',
      gregorian_year: 2026,
      duration_days: 18,
      origin_city: 'London Heathrow',
      destination_city: 'Jeddah / Madinah',
      starting_price: 11500,
      currency: 'USD',
      currency_id: 1,
      total_seats: 60,
      status: 'published',
      short_description: 'Luxury 5-Star front-row Haram hotels with VIP Mina air-conditioned tents and private GMC transport.',
    });
    setIsPackageModalOpen(true);
  };

  const handleEditPackage = (pkg: Package) => {
    setEditingPackage(pkg);
    const { currency_id: cId, currency: cCode } = resolveCurrency(pkg.currency_id, pkg.currency);
    setPkgForm({
      title: pkg.title,
      category_id: pkg.category_id || 1,
      package_type: pkg.package_type || 'vip_hajj',
      hajj_type: pkg.hajj_type || 'non_shifting',
      gregorian_year: pkg.gregorian_year || 2026,
      duration_days: pkg.duration_days || 14,
      origin_city: pkg.origin_city || 'London Heathrow',
      destination_city: pkg.destination_city || 'Jeddah / Madinah',
      starting_price: Number(pkg.starting_price) || 0,
      currency: cCode,
      currency_id: cId,
      total_seats: pkg.total_seats || 50,
      status: pkg.status || 'published',
      short_description: pkg.short_description || '',
    });
    setIsPackageModalOpen(true);
  };

  // Quick 1-Click ON / OFF Toggle
  const handleTogglePackageStatus = async (id: number) => {
    const pkg = packages.find((p) => p.id === id);
    if (!pkg) return;

    const isCurrentlyOn = pkg.status === 'published';
    const nextStatus = isCurrentlyOn ? 'draft' : 'published';

    // Optimistically update UI
    setPackages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: nextStatus as any } : p))
    );
    setTogglingId(id);

    try {
      const res = await api.togglePackageStatus(id, nextStatus);
      if (!res.success) {
        // Revert on error
        setPackages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: pkg.status } : p))
        );
        alert(res.message || 'Failed to toggle package status');
      }
    } catch (err: any) {
      // Revert on failure
      setPackages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: pkg.status } : p))
      );
      alert(err.message || 'Failed to toggle package status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { currency_id: cId, currency: cCode } = resolveCurrency(pkgForm.currency_id, pkgForm.currency);
      const payload = {
        ...pkgForm,
        currency: cCode,
        currency_id: cId,
      };

      if (editingPackage) {
        const res = await api.updatePackage(editingPackage.id, payload);
        if (res.success) {
          setIsPackageModalOpen(false);
          loadPackages();
        }
      } else {
        const res = await api.createPackage(payload);
        if (res.success) {
          setIsPackageModalOpen(false);
          loadPackages();
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save package');
    }
  };

  const handleCreateDeparture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageForDep) return;
    try {
      const res = await api.createDeparture({
        package_id: selectedPackageForDep.id,
        ...depForm,
      });
      if (res.success) {
        setIsDepartureModalOpen(false);
        loadPackages();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add departure');
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm('Are you sure you want to delete this package?')) return;
    try {
      await api.deletePackage(id);
      loadPackages();
    } catch (err: any) {
      alert(err.message || 'Failed to delete package');
    }
  };

  const activeCount = packages.filter((p) => p.status === 'published').length;
  const inactiveCount = packages.filter((p) => p.status !== 'published').length;

  const filteredPackages = packages.filter((pkg) => {
    const matchesSearch =
      pkg.title.toLowerCase().includes(search.toLowerCase()) ||
      pkg.origin_city.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || pkg.package_type === selectedCategory;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published'
        ? pkg.status === 'published'
        : pkg.status !== 'published');
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div id="packages-view" className="space-y-6 pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Hajj & Umrah Packages Catalog
            </h2>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {activeCount} ON (Active)
              </span>
              <span className="px-2 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                {inactiveCount} OFF (Inactive)
              </span>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage live offerings, seat quotas, pricing, and toggle package ON/OFF status
          </p>
        </div>

        <button
          id="btn-new-package"
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Package</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by package name or departure city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
            />
          </div>

          {/* ON / OFF Status Filter Pills */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All ({packages.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ON / Active ({activeCount})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === 'draft'
                  ? 'bg-stone-700 text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              OFF / Inactive ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-400 mr-1 shrink-0">
            Type:
          </span>
          {['all', 'vip_hajj', 'hajj', 'umrah', 'ramadan_umrah'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat === 'all'
                ? 'All Types'
                : cat === 'vip_hajj'
                ? 'VIP 5★ Hajj'
                : cat === 'hajj'
                ? 'Standard Hajj'
                : cat === 'umrah'
                ? 'Umrah Express'
                : 'Ramadan Umrah'}
            </button>
          ))}
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-400">Loading packages...</div>
      ) : filteredPackages.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
          <PackageIcon className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="text-sm font-semibold text-stone-700">No packages match your search</h3>
          <p className="text-xs text-stone-500">
            {statusFilter !== 'all'
              ? `No packages found with status "${statusFilter === 'published' ? 'ON (Active)' : 'OFF (Inactive)'}".`
              : 'Try adjusting your filters or create a new package.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const isOn = pkg.status === 'published';
            const seatsOccupied = pkg.booked_seats || 0;
            const seatsTotal = pkg.total_seats || 50;
            const seatPercent = Math.round((seatsOccupied / seatsTotal) * 100);

            return (
              <div
                key={pkg.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative ${
                  isOn
                    ? 'border-stone-200'
                    : 'border-stone-300/80 bg-stone-50/50 opacity-95'
                }`}
              >
                {/* OFF Notice Banner */}
                {!isOn && (
                  <div className="bg-stone-100 text-stone-600 px-4 py-1.5 text-[11px] font-medium flex items-center justify-between border-b border-stone-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                      <span>Package is OFF (Hidden from new bookings)</span>
                    </span>
                    <span className="text-[10px] text-amber-700 font-semibold">Inactive</span>
                  </div>
                )}

                <div>
                  {/* Top Bar with Badges and Actions */}
                  <div className="p-5 pb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Badge
                          variant={
                            pkg.package_type.includes('hajj') ? 'gold' : 'info'
                          }
                        >
                          {pkg.package_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge variant="default">{pkg.duration_days} Days</Badge>
                        {isOn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ON
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
                            OFF
                          </span>
                        )}
                      </div>
                      <h3
                        className={`text-base font-bold leading-snug ${
                          isOn ? 'text-stone-900' : 'text-stone-700'
                        }`}
                      >
                        {pkg.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleEditPackage(pkg)}
                        className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Package"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Package"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pricing & Flight Cities */}
                  <div className="px-5 py-2 bg-stone-50/70 border-y border-stone-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-stone-500">From: </span>
                      <span className="font-bold text-stone-900">{pkg.origin_city}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Starting: </span>
                      <span className="font-extrabold text-amber-700 text-sm">
                        {getCurrencySymbol(pkg.currency || CURRENCY_CODE_MAP[pkg.currency_id || 1])}
                        {Number(pkg.starting_price).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Seat Occupancy */}
                  <div className="p-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-stone-500 font-medium">Seat Allotment:</span>
                        <span className="font-bold text-stone-900">
                          {seatsOccupied} / {seatsTotal} Booked ({seatPercent}%)
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            seatPercent >= 90
                              ? 'bg-rose-500'
                              : seatPercent >= 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${seatPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Departures count */}
                    <div className="text-xs text-stone-600 flex items-center justify-between pt-2 border-t border-stone-100">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        <span>{pkg.departures?.length || 0} Departures Configured</span>
                      </span>
                      <button
                        onClick={() => {
                          setSelectedPackageForDep(pkg);
                          setIsDepartureModalOpen(true);
                        }}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline cursor-pointer"
                      >
                        + Add Departure
                      </button>
                    </div>

                    {/* Description preview */}
                    {pkg.short_description && (
                      <p className="text-[11px] text-stone-500 line-clamp-2 mt-2">
                        {pkg.short_description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer with Interactive ON / OFF Toggle Switch */}
                <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs">
                  {/* ON / OFF Switch */}
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isOn}
                      disabled={togglingId === pkg.id}
                      onClick={() => handleTogglePackageStatus(pkg.id)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50 ${
                        isOn ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      title={isOn ? 'Click to Turn OFF' : 'Click to Turn ON'}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isOn ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePackageStatus(pkg.id)}
                      disabled={togglingId === pkg.id}
                      className="cursor-pointer text-left"
                    >
                      <span
                        className={`text-xs font-bold flex items-center gap-1 ${
                          isOn ? 'text-emerald-700' : 'text-stone-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOn ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'
                          }`}
                        />
                        {togglingId === pkg.id
                          ? 'Updating...'
                          : isOn
                          ? 'ON (Active)'
                          : 'OFF (Inactive)'}
                      </span>
                    </button>
                  </div>

                  <span className="text-stone-400 text-[11px]">Season {pkg.gregorian_year}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Package */}
      <Modal
        isOpen={isPackageModalOpen}
        onClose={() => setIsPackageModalOpen(false)}
        title={editingPackage ? `Edit Package: ${editingPackage.title}` : 'Create Hajj or Umrah Package'}
        subtitle={
          editingPackage
            ? 'Update package parameters, pricing, and active ON/OFF availability'
            : 'Add a new catalog offering with seat capacity and pricing parameters'
        }
        maxWidth="2xl"
      >
        <form onSubmit={handleSavePackage} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Package Title *
              </label>
              <input
                type="text"
                required
                value={pkgForm.title}
                onChange={(e) => setPkgForm({ ...pkgForm, title: e.target.value })}
                placeholder="e.g. Royal Diamond 5-Star Hajj 2026"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            {/* ON / OFF Switch in Modal */}
            <div className="sm:col-span-2 p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-stone-800">
                  Package Status (ON / OFF)
                </label>
                <p className="text-[11px] text-stone-500">
                  When turned ON, travelers can book this package. When OFF, it is hidden and marked inactive.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={pkgForm.status === 'published'}
                  onClick={() =>
                    setPkgForm({
                      ...pkgForm,
                      status: pkgForm.status === 'published' ? 'draft' : 'published',
                    })
                  }
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    pkgForm.status === 'published' ? 'bg-emerald-600' : 'bg-stone-300'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      pkgForm.status === 'published' ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span
                  className={`text-xs font-bold ${
                    pkgForm.status === 'published' ? 'text-emerald-700' : 'text-stone-500'
                  }`}
                >
                  {pkgForm.status === 'published' ? 'ON (Active)' : 'OFF (Inactive)'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Package Type
              </label>
              <select
                value={pkgForm.package_type}
                onChange={(e) => setPkgForm({ ...pkgForm, package_type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="vip_hajj">VIP 5-Star Hajj</option>
                <option value="hajj">Standard Shifting Hajj</option>
                <option value="umrah">Classic Umrah</option>
                <option value="ramadan_umrah">Ramadan Special Umrah</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hajj Shifting Type
              </label>
              <select
                value={pkgForm.hajj_type}
                onChange={(e) => setPkgForm({ ...pkgForm, hajj_type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="non_shifting">Non-Shifting (Direct Haram Accommodation)</option>
                <option value="shifting">Shifting (Aziziyah / Mina Shifting)</option>
                <option value="not_applicable">Not Applicable (Umrah)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Duration (Days)
              </label>
              <input
                type="number"
                min="5"
                max="45"
                value={pkgForm.duration_days}
                onChange={(e) => setPkgForm({ ...pkgForm, duration_days: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Total Seat Capacity
              </label>
              <input
                type="number"
                min="1"
                value={pkgForm.total_seats}
                onChange={(e) => setPkgForm({ ...pkgForm, total_seats: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Starting Base Price ($ USD / ﷼ SAR)
              </label>
              <div className="flex rounded-xl border border-stone-300 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-amber-500/50 focus-within:border-amber-500">
                <select
                  value={pkgForm.currency_id}
                  onChange={(e) => {
                    const cid = Number(e.target.value);
                    const code = CURRENCY_CODE_MAP[cid] || 'USD';
                    setPkgForm({ ...pkgForm, currency_id: cid, currency: code });
                  }}
                  className="px-2.5 py-2 text-xs font-semibold bg-stone-100 border-r border-stone-300 text-stone-800 focus:outline-hidden cursor-pointer"
                >
                  <option value={1}>$ USD</option>
                  <option value={2}>﷼ SAR</option>
                  <option value={3}>£ GBP</option>
                  <option value={4}>€ EUR</option>
                  <option value={5}>CA$ CAD</option>
                  <option value={6}>₨ PKR</option>
                </select>
                <input
                  type="number"
                  min="100"
                  value={pkgForm.starting_price}
                  onChange={(e) => setPkgForm({ ...pkgForm, starting_price: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs text-stone-900 focus:outline-hidden"
                  placeholder="Price"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Departure City
              </label>
              <input
                type="text"
                value={pkgForm.origin_city}
                onChange={(e) => setPkgForm({ ...pkgForm, origin_city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Overview & Description
              </label>
              <textarea
                rows={3}
                value={pkgForm.short_description}
                onChange={(e) => setPkgForm({ ...pkgForm, short_description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsPackageModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs cursor-pointer"
            >
              {editingPackage ? 'Update Package' : 'Save Package'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Departure */}
      <Modal
        isOpen={isDepartureModalOpen}
        onClose={() => setIsDepartureModalOpen(false)}
        title={`Add Group Departure: ${selectedPackageForDep?.title || ''}`}
        subtitle="Specify flight departure date, return date, and allocated seat quota"
      >
        <form onSubmit={handleCreateDeparture} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Departure Group Title
            </label>
            <input
              type="text"
              required
              value={depForm.departure_title}
              onChange={(e) => setDepForm({ ...depForm, departure_title: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Departure Date
              </label>
              <input
                type="date"
                required
                value={depForm.departure_date}
                onChange={(e) => setDepForm({ ...depForm, departure_date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Return Date
              </label>
              <input
                type="date"
                required
                value={depForm.return_date}
                onChange={(e) => setDepForm({ ...depForm, return_date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Total Seats for this Departure
            </label>
            <input
              type="number"
              min="5"
              value={depForm.total_seats}
              onChange={(e) => setDepForm({ ...depForm, total_seats: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsDepartureModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs cursor-pointer"
            >
              Add Departure Date
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

