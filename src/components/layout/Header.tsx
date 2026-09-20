import React, { useState, useEffect } from 'react';
import {
  Bell,
  Search,
  Menu,
  Clock,
  CheckCircle,
  ExternalLink,
  Info,
} from 'lucide-react';
import { AdminUser, NotificationItem } from '../../types';
import { api } from '../../services/api';

interface HeaderProps {
  currentTab: string;
  user: AdminUser;
  onToggleSidebar: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  onNotificationRead: (id: number) => void;
  onOpenQuickBooking: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  user,
  onToggleSidebar,
  notifications,
  unreadCount,
  onNotificationRead,
  onOpenQuickBooking,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [makkahTime, setMakkahTime] = useState('');

  // Live Makkah time clock (UTC+3)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Riyadh',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      };
      setMakkahTime(new Intl.DateTimeFormat('en-US', options).format(now));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabTitles: Record<string, { title: string; desc: string }> = {
    dashboard: {
      title: 'Operations Dashboard',
      desc: 'Real-time Hajj & Umrah departures, bookings, revenue & visa status',
    },
    packages: {
      title: 'Hajj & Umrah Packages',
      desc: 'Catalog, departure dates, seat capacity & hotel pricing matrices',
    },
    hotels: {
      title: 'Hotels & Haram Proximity',
      desc: 'Makkah & Madinah front-row properties, room types & view allocations',
    },
    crm: {
      title: 'Pilgrim CRM & Lead Pipeline',
      desc: 'Inquiries, customer profiles, passport validation & VIP tier tracking',
    },
    bookings: {
      title: 'Bookings & Traveler Rosters',
      desc: 'Booking reservations, manifest logs, flight PNRs & voucher generation',
    },
    finance: {
      title: 'Finance & Invoicing Engine',
      desc: 'Payment collection, installments, printable VAT invoices & expenses',
    },
    travel: {
      title: 'Visas, Flights & Transport Fleet',
      desc: 'Saudi MOFA visa submissions, airline ticketing & VIP GMC Yukon transfers',
    },
    cms: {
      title: 'Website CMS & Media Library',
      desc: 'Homepage sliders, pilgrims testimonials, FAQ answers & asset management',
    },
    user_management: {
      title: 'User Management & Approvals',
      desc: 'Customer registrations, role assignments, approval workflows & audit trails',
    },
    settings: {
      title: 'System & Hostinger Database',
      desc: 'Admin permissions matrix, agency credentials & Hostinger MySQL status',
    },
  };

  const currentInfo = tabTitles[currentTab] || {
    title: 'Hajji Original Admin',
    desc: 'Hajj & Umrah Enterprise Travel Management',
  };

  return (
    <header
      id="main-app-header"
      className="h-18 bg-white border-b border-stone-200 px-6 flex items-center justify-between z-20 shrink-0 sticky top-0 shadow-xs"
    >
      {/* Left: Hamburger & Current View Title */}
      <div className="flex items-center gap-4">
        <button
          id="btn-toggle-sidebar"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
            {currentInfo.title}
          </h2>
          <p className="text-xs text-stone-500 hidden sm:block">
            {currentInfo.desc}
          </p>
        </div>
      </div>

      {/* Right: Actions, Makkah Clock, Search, Notifications & Actions */}
      <div className="flex items-center gap-3">
        {/* Makkah Live Clock */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs font-medium text-amber-900">
          <Clock className="w-3.5 h-3.5 text-amber-700" />
          <span>Makkah:</span>
          <span className="font-semibold font-mono text-amber-950">{makkahTime || '12:00 PM'}</span>
        </div>

        {/* Quick New Booking Button */}
        <button
          id="btn-header-quick-booking"
          onClick={onOpenQuickBooking}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs transition-colors"
        >
          <span>+ New Booking</span>
        </button>

        {/* Notification Bell with Dropdown */}
        <div className="relative">
          <button
            id="btn-notifications-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-100 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              id="notifications-popover"
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200 py-3 z-50 overflow-hidden"
            >
              <div className="px-4 pb-2 border-b border-stone-100 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-stone-900">
                  Notifications ({unreadCount} unread)
                </h4>
                <span className="text-[11px] text-stone-400">Activity Alerts</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 text-xs transition-colors hover:bg-stone-50 flex items-start justify-between gap-2 ${
                        notif.is_read ? 'opacity-70' : 'bg-amber-50/30 font-medium'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1">
                        <p className="font-semibold text-stone-800">{notif.title}</p>
                        <p className="text-stone-600 text-[11px]">{notif.message}</p>
                      </div>
                      {!notif.is_read && (
                        <button
                          onClick={() => onNotificationRead(notif.id)}
                          className="text-[10px] text-amber-700 hover:text-amber-800 underline shrink-0 mt-0.5"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
