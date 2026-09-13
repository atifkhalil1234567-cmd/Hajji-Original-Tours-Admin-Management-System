import React, { useState, useEffect } from 'react';
import {
  Plane,
  FileCheck,
  Bus,
  Search,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { api } from '../services/api';
import { VisaApplication, Flight, Transport } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const TravelLogisticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visas' | 'flights' | 'transport'>('visas');
  const [visas, setVisas] = useState<VisaApplication[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedVisaForUpdate, setSelectedVisaForUpdate] = useState<VisaApplication | null>(null);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);

  // Forms
  const [visaUpdateForm, setVisaUpdateForm] = useState({
    status: 'Approved',
    mofa_number: 'MOFA-1447-99214',
    visa_number: 'KSA-V-88219401',
  });

  const [flightForm, setFlightForm] = useState({
    airline_name: 'Saudia',
    airline_code: 'SV',
    flight_number: 'SV 118',
    departure_airport: 'LHR',
    arrival_airport: 'JED',
    departure_city: 'London Heathrow',
    arrival_city: 'Jeddah King Abdulaziz',
    departure_time: '2026-06-12 11:30:00',
    arrival_time: '2026-06-12 19:45:00',
    flight_type: 'outbound',
    baggage_allowance: '2 x 23kg + Zamzam 5L included',
  });

  const [transportForm, setTransportForm] = useState({
    service_type: 'private_gmc',
    vehicle_type: 'GMC Yukon Denali XL 2026',
    capacity: 7,
    driver_name: 'Abu Fahad Al-Harbi',
    driver_phone: '+966 50 123 9988',
    plate_number: 'KSA 8892 JED',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [visaRes, fltRes, trnRes] = await Promise.all([
        api.getVisas(),
        api.getFlights(),
        api.getTransports(),
      ]);
      if (visaRes.success) setVisas(visaRes.data);
      if (fltRes.success) setFlights(fltRes.data);
      if (trnRes.success) setTransports(trnRes.transports);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateVisa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVisaForUpdate) return;
    try {
      const res = await api.updateVisa(selectedVisaForUpdate.id, visaUpdateForm);
      if (res.success) {
        setSelectedVisaForUpdate(null);
        alert('Visa application details and MOFA status updated!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const handleCreateFlight = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createFlight(flightForm);
      if (res.success) {
        setIsFlightModalOpen(false);
        alert('Flight schedule created!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Flight creation failed');
    }
  };

  const handleCreateTransport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createTransport(transportForm);
      if (res.success) {
        setIsTransportModalOpen(false);
        alert('Transport vehicle added to fleet!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Transport creation failed');
    }
  };

  return (
    <div id="travel-logistics-view" className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Visas, Flights & Transport Logistics
          </h2>
          <p className="text-xs text-stone-500">
            Saudi MOFA visa processing, airline flight assignments & private GMC / luxury coach fleet
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'flights' && (
            <button
              id="btn-add-flight"
              onClick={() => setIsFlightModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Scheduled Flight</span>
            </button>
          )}
          {activeTab === 'transport' && (
            <button
              id="btn-add-transport"
              onClick={() => setIsTransportModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Fleet Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('visas')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'visas'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          <span>Saudi MOFA Visas ({visas.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('flights')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'flights'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          <span>Flight Blocks & Schedules ({flights.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('transport')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'transport'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Bus className="w-3.5 h-3.5" />
          <span>Transport Fleet ({transports.length})</span>
        </button>
      </div>

      {/* Tab Content: Visas */}
      {activeTab === 'visas' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">App #</th>
                  <th className="px-5 py-3">Pilgrim Traveler</th>
                  <th className="px-5 py-3">Passport & Nationality</th>
                  <th className="px-5 py-3">MOFA / Visa #</th>
                  <th className="px-5 py-3">Approval Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      No visa applications currently submitted
                    </td>
                  </tr>
                ) : (
                  visas.map((v) => (
                    <tr key={v.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                        {v.application_number}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-stone-900">{v.traveler_name}</div>
                        <div className="text-[11px] text-stone-500">{v.package_title}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-stone-800">
                          {v.passport_number}
                        </div>
                        <div className="text-[11px] text-stone-500">{v.nationality}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        {v.visa_number ? (
                          <span className="font-bold text-emerald-800">{v.visa_number}</span>
                        ) : v.mofa_number ? (
                          <span className="text-amber-800 font-semibold">{v.mofa_number}</span>
                        ) : (
                          <span className="text-stone-400 italic">Pending MOFA Submission</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            v.status === 'Approved'
                              ? 'success'
                              : v.status === 'Submitted to MOFA'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {v.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedVisaForUpdate(v);
                            setVisaUpdateForm({
                              status: v.status || 'Approved',
                              mofa_number: v.mofa_number || 'MOFA-1447-99214',
                              visa_number: v.visa_number || 'KSA-V-88219401',
                            });
                          }}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs transition-colors"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Flights */}
      {activeTab === 'flights' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flights.map((flt) => (
            <div
              key={flt.id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                      {flt.airline_code}
                    </span>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">
                        {flt.airline_name} ({flt.flight_number})
                      </h4>
                      <p className="text-[11px] text-stone-500 capitalize">{flt.flight_type} Flight</p>
                    </div>
                  </div>
                  <Badge variant="success">Confirmed</Badge>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-100 my-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-stone-900 text-base">
                      {flt.departure_airport}
                    </span>
                    <p className="text-stone-600 text-[11px]">{flt.departure_city}</p>
                    <p className="text-stone-400 text-[10px] mt-1">{flt.departure_time}</p>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <Plane className="w-4 h-4 text-amber-600" />
                    <span className="text-[10px] text-stone-400 mt-1">Direct Flight</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-stone-900 text-base">
                      {flt.arrival_airport}
                    </span>
                    <p className="text-stone-600 text-[11px]">{flt.arrival_city}</p>
                    <p className="text-stone-400 text-[10px] mt-1">{flt.arrival_time}</p>
                  </div>
                </div>

                <p className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-700">Baggage: </span>
                  {flt.baggage_allowance || '2 x 23kg standard + 5L Zamzam'}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium">● Group Block Reserved</span>
                <span className="text-stone-400 font-mono text-[11px]">{flt.flight_number}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content: Transports */}
      {activeTab === 'transport' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transports.map((t) => (
            <div
              key={t.id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <Badge variant={t.service_type === 'private_gmc' ? 'gold' : 'info'}>
                      {t.service_type === 'private_gmc' ? 'VIP Private GMC' : 'Group Coach'}
                    </Badge>
                    <h4 className="font-bold text-stone-900 text-sm mt-1.5">{t.vehicle_type}</h4>
                  </div>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700">
                    {t.plate_number}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-stone-600 my-3">
                  <p>
                    <span className="font-semibold text-stone-700">Capacity: </span>
                    {t.capacity} Passenger Seats
                  </p>
                  <p>
                    <span className="font-semibold text-stone-700">Assigned Driver: </span>
                    {t.driver_name}
                  </p>
                  <p>
                    <span className="font-semibold text-stone-700">Saudi Phone: </span>
                    <span className="font-mono">{t.driver_phone}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-emerald-700 font-medium">● Ready for Dispatch</span>
                <span className="text-stone-400 text-[11px]">Jeddah / Makkah / Madinah</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Update Visa */}
      {selectedVisaForUpdate && (
        <Modal
          isOpen={!!selectedVisaForUpdate}
          onClose={() => setSelectedVisaForUpdate(null)}
          title={`Update MOFA Visa: ${selectedVisaForUpdate.traveler_name}`}
          subtitle="Input official Saudi Ministry of Foreign Affairs electronic visa numbers"
        >
          <form onSubmit={handleUpdateVisa} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Visa Status
              </label>
              <select
                value={visaUpdateForm.status}
                onChange={(e) => setVisaUpdateForm({ ...visaUpdateForm, status: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="Documents Received">Documents Received</option>
                <option value="Verification in Progress">Verification in Progress</option>
                <option value="Submitted to MOFA">Submitted to MOFA</option>
                <option value="Approved">Approved (Visa Issued)</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Saudi MOFA Application Number
              </label>
              <input
                type="text"
                value={visaUpdateForm.mofa_number}
                onChange={(e) =>
                  setVisaUpdateForm({ ...visaUpdateForm, mofa_number: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Issued Visa Number (E-Visa)
              </label>
              <input
                type="text"
                value={visaUpdateForm.visa_number}
                onChange={(e) =>
                  setVisaUpdateForm({ ...visaUpdateForm, visa_number: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setSelectedVisaForUpdate(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
              >
                Save Visa Details
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Add Flight */}
      <Modal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        title="Schedule Group Flight"
        subtitle="Add a group flight block with Saudia, British Airways, or Emirates"
      >
        <form onSubmit={handleCreateFlight} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Airline Name *
              </label>
              <input
                type="text"
                required
                value={flightForm.airline_name}
                onChange={(e) => setFlightForm({ ...flightForm, airline_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Flight Number *
              </label>
              <input
                type="text"
                required
                value={flightForm.flight_number}
                onChange={(e) => setFlightForm({ ...flightForm, flight_number: e.target.value })}
                placeholder="e.g. SV 118"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Departure City *
              </label>
              <input
                type="text"
                required
                value={flightForm.departure_city}
                onChange={(e) => setFlightForm({ ...flightForm, departure_city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Arrival City *
              </label>
              <input
                type="text"
                required
                value={flightForm.arrival_city}
                onChange={(e) => setFlightForm({ ...flightForm, arrival_city: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Departure Date & Time
              </label>
              <input
                type="datetime-local"
                value={flightForm.departure_time.slice(0, 16)}
                onChange={(e) => setFlightForm({ ...flightForm, departure_time: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Arrival Date & Time
              </label>
              <input
                type="datetime-local"
                value={flightForm.arrival_time.slice(0, 16)}
                onChange={(e) => setFlightForm({ ...flightForm, arrival_time: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsFlightModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save Flight Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Transport */}
      <Modal
        isOpen={isTransportModalOpen}
        onClose={() => setIsTransportModalOpen(false)}
        title="Add Fleet Vehicle"
        subtitle="Register VIP GMC or group Mercedes coach with assigned Saudi driver"
      >
        <form onSubmit={handleCreateTransport} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Service Type
              </label>
              <select
                value={transportForm.service_type}
                onChange={(e) => setTransportForm({ ...transportForm, service_type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="private_gmc">Private GMC Yukon XL (VIP)</option>
                <option value="luxury_bus">Luxury 49-Seat Mercedes Coach</option>
                <option value="hiace_van">Toyota HiAce Mini-Bus (12 Seats)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Vehicle Model
              </label>
              <input
                type="text"
                required
                value={transportForm.vehicle_type}
                onChange={(e) => setTransportForm({ ...transportForm, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Passenger Capacity
              </label>
              <input
                type="number"
                min="1"
                value={transportForm.capacity}
                onChange={(e) => setTransportForm({ ...transportForm, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                License Plate
              </label>
              <input
                type="text"
                value={transportForm.plate_number}
                onChange={(e) => setTransportForm({ ...transportForm, plate_number: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Driver Name
              </label>
              <input
                type="text"
                required
                value={transportForm.driver_name}
                onChange={(e) => setTransportForm({ ...transportForm, driver_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Driver Phone (Saudi Mobile)
              </label>
              <input
                type="text"
                required
                value={transportForm.driver_phone}
                onChange={(e) => setTransportForm({ ...transportForm, driver_phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsTransportModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save Fleet Vehicle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
