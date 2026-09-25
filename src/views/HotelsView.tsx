import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Star,
  Plus,
  Bed,
  Eye,
  Bus,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { Hotel } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const HotelsView: React.FC = () => {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<'all' | 'Makkah' | 'Madinah' | 'Dubai'>('all');

  // Modals
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedHotelForRoom, setSelectedHotelForRoom] = useState<Hotel | null>(null);

  // Forms
  const [hotelForm, setHotelForm] = useState({
    name: '',
    arabic_name: '',
    city: 'Makkah' as 'Makkah' | 'Madinah' | 'Dubai' | 'Jeddah' | 'Riyadh' | string,
    star_rating: 5,
    distance_meters: 50,
    shuttle_available: 0,
    address: '',
    status: 'active',
  });

  const [roomForm, setRoomForm] = useState({
    room_name: 'Deluxe Haram View Double',
    room_type: 'double',
    view_type: 'haram_view',
    capacity_adults: 2,
    capacity_children: 1,
    price_per_night: 350,
  });

  const loadHotels = async () => {
    setLoading(true);
    try {
      const res = await api.getHotels();
      if (res.success) setHotels(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHotels();
  }, []);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createHotel(hotelForm);
      if (res.success) {
        setIsHotelModalOpen(false);
        loadHotels();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create hotel');
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotelForRoom) return;
    try {
      const res = await api.addHotelRoom(selectedHotelForRoom.id, roomForm);
      if (res.success) {
        setIsRoomModalOpen(false);
        loadHotels();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add room');
    }
  };

  const filteredHotels = hotels.filter((h) => {
    if (cityFilter === 'all') return true;
    return h.city === cityFilter;
  });

  return (
    <div id="hotels-view" className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Hotels & Haram Proximity Directory
          </h2>
          <p className="text-xs text-stone-500">
            Front-row Haram properties in Makkah Al Mukarramah and Al Madinah Al Munawwarah
          </p>
        </div>

        <button
          id="btn-new-hotel"
          onClick={() => setIsHotelModalOpen(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Hotel Property</span>
        </button>
      </div>

      {/* City Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setCityFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            cityFilter === 'all'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          All Properties ({hotels.length})
        </button>
        <button
          onClick={() => setCityFilter('Makkah')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            cityFilter === 'Makkah'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Makkah Al Mukarramah ({hotels.filter((h) => h.city === 'Makkah').length})
        </button>
        <button
          onClick={() => setCityFilter('Madinah')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            cityFilter === 'Madinah'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Al Madinah Al Munawwarah ({hotels.filter((h) => h.city === 'Madinah').length})
        </button>
        <button
          onClick={() => setCityFilter('Dubai')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
            cityFilter === 'Dubai'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          Dubai ({hotels.filter((h) => h.city === 'Dubai').length})
        </button>
      </div>

      {/* Hotel Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-400">Loading hotel portfolio...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredHotels.map((hotel) => (
            <div
              key={hotel.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Hotel Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Badge
                          variant={
                            hotel.city === 'Makkah'
                              ? 'gold'
                              : hotel.city === 'Madinah'
                              ? 'success'
                              : 'info'
                          }
                        >
                          {hotel.city}
                        </Badge>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: hotel.star_rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          ))}
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-stone-900 leading-snug">
                        {hotel.name}
                      </h3>
                      {hotel.arabic_name && (
                        <p className="text-xs text-stone-500 font-arabic mt-0.5">
                          {hotel.arabic_name}
                        </p>
                      )}
                    </div>

                    {/* Haram Proximity vs Destination Pill */}
                    {hotel.city === 'Makkah' || hotel.city === 'Madinah' ? (
                      <div className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-right shrink-0">
                        <span className="text-xs font-bold text-amber-950 font-mono">
                          {hotel.distance_meters}m
                        </span>
                        <p className="text-[10px] text-amber-800 font-medium">to Haram Courtyard</p>
                      </div>
                    ) : (
                      <div className="px-2.5 py-1 rounded-xl bg-sky-50 border border-sky-200 text-right shrink-0">
                        <span className="text-xs font-bold text-sky-950 font-mono">
                          {hotel.city}
                        </span>
                        <p className="text-[10px] text-sky-800 font-medium">Destination Property</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{hotel.address}</span>
                  </div>
                </div>

                {/* Rooms Matrix */}
                <div className="p-5 pt-3 border-t border-stone-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                      Configured Room Types ({hotel.rooms?.length || 0})
                    </h4>
                    <button
                      onClick={() => {
                        setSelectedHotelForRoom(hotel);
                        setIsRoomModalOpen(true);
                      }}
                      className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline"
                    >
                      + Add Room Type
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {hotel.rooms && hotel.rooms.length > 0 ? (
                      hotel.rooms.map((room) => (
                        <div
                          key={room.id}
                          className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Bed className="w-3.5 h-3.5 text-stone-400" />
                            <div>
                              <span className="font-semibold text-stone-800">
                                {room.room_name}
                              </span>
                              <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                                <span className="capitalize">{room.room_type} Room</span>
                                <span>•</span>
                                <span className="text-amber-700 font-medium capitalize">
                                  {room.view_type.replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-stone-900 text-xs font-mono">
                              ${Number(room.price_per_night || 350).toLocaleString()}/night
                            </div>
                            <span className="text-[11px] font-medium text-stone-500">
                              Capacity: {room.capacity_adults} Adults
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-stone-400 bg-stone-50 rounded-xl">
                        No room configurations registered
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-2.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    {hotel.shuttle_available ? '24/7 Shuttle Service Provided' : 'Direct Walking Proximity'}
                  </span>
                </span>
                <span className="text-emerald-700 font-medium">● Operating</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Hotel */}
      <Modal
        isOpen={isHotelModalOpen}
        onClose={() => setIsHotelModalOpen(false)}
        title="Add Hotel Accommodation"
        subtitle="Register new Makkah or Madinah property for package allocation"
      >
        <form onSubmit={handleCreateHotel} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Hotel Name *
              </label>
              <input
                type="text"
                required
                value={hotelForm.name}
                onChange={(e) => setHotelForm({ ...hotelForm, name: e.target.value })}
                placeholder="e.g. Fairmont Makkah Clock Royal Tower"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                City *
              </label>
              <select
                value={hotelForm.city}
                onChange={(e) => setHotelForm({ ...hotelForm, city: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="Makkah">Makkah Al Mukarramah</option>
                <option value="Madinah">Al Madinah Al Munawwarah</option>
                <option value="Dubai">Dubai, UAE</option>
                <option value="Jeddah">Jeddah</option>
                <option value="Riyadh">Riyadh</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Star Rating (1 - 5)
              </label>
              <input
                type="number"
                min="3"
                max="5"
                value={hotelForm.star_rating}
                onChange={(e) => setHotelForm({ ...hotelForm, star_rating: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {hotelForm.city === 'Makkah' || hotelForm.city === 'Madinah'
                  ? 'Distance to Haram Courtyard (Meters)'
                  : 'Distance to City Landmark / Beach (Meters)'}
              </label>
              <input
                type="number"
                min="0"
                value={hotelForm.distance_meters}
                onChange={(e) => setHotelForm({ ...hotelForm, distance_meters: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Shuttle Service
              </label>
              <select
                value={hotelForm.shuttle_available}
                onChange={(e) => setHotelForm({ ...hotelForm, shuttle_available: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value={0}>Walking Distance (No Shuttle Needed)</option>
                <option value={1}>24/7 Dedicated Haram Shuttle Included</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Exact Address
              </label>
              <input
                type="text"
                value={hotelForm.address}
                onChange={(e) => setHotelForm({ ...hotelForm, address: e.target.value })}
                placeholder="e.g. Abraj Al Bait Complex, King Abdulaziz Gate, Makkah"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsHotelModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save Hotel
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Room */}
      <Modal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        title={`Add Room Type: ${selectedHotelForRoom?.name || ''}`}
        subtitle="Define room occupancy, view classification (Kaaba, Haram, City), and price"
      >
        <form onSubmit={handleAddRoom} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Room Label / Title *
            </label>
            <input
              type="text"
              required
              value={roomForm.room_name}
              onChange={(e) => setRoomForm({ ...roomForm, room_name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Room Category
              </label>
              <select
                value={roomForm.room_type}
                onChange={(e) => setRoomForm({ ...roomForm, room_type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="single">Single (1 Bed)</option>
                <option value="double">Double / Twin (2 Beds)</option>
                <option value="triple">Triple (3 Beds)</option>
                <option value="quad">Quad (4 Beds)</option>
                <option value="suite">Executive Suite</option>
                <option value="family">Family Connecting Suite</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                View Classification
              </label>
              <select
                value={roomForm.view_type}
                onChange={(e) => setRoomForm({ ...roomForm, view_type: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="kaaba_view">Direct Holy Kaaba View</option>
                <option value="haram_view">Haram Courtyard View</option>
                <option value="city_view">City View</option>
                <option value="standard">Standard Internal View</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Adult Capacity
              </label>
              <input
                type="number"
                min="1"
                max="6"
                value={roomForm.capacity_adults}
                onChange={(e) => setRoomForm({ ...roomForm, capacity_adults: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Price Per Night ($ USD / ﷼ SAR)
              </label>
              <input
                type="number"
                min="50"
                value={roomForm.price_per_night}
                onChange={(e) => setRoomForm({ ...roomForm, price_per_night: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsRoomModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Add Room
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
