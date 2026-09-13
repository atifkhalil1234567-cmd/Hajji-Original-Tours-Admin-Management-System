import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { AdminUser, DatabaseStatus, DashboardStats, NotificationItem } from './types';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { PackagesView } from './views/PackagesView';
import { HotelsView } from './views/HotelsView';
import { CrmView } from './views/CrmView';
import { BookingsView } from './views/BookingsView';
import { FinanceView } from './views/FinanceView';
import { TravelLogisticsView } from './views/TravelLogisticsView';
import { CmsMediaView } from './views/CmsMediaView';
import { AdminSettingsView } from './views/AdminSettingsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  // Global Dashboard Stats & Notifications
  const [dashboardData, setDashboardData] = useState<{
    stats: DashboardStats | null;
    recentBookings: any[];
    recentLeads: any[];
    recentPayments: any[];
    upcomingDepartures: any[];
    expiringPassports: any[];
    recentActivity: any[];
    distribution: any;
  }>({
    stats: null,
    recentBookings: [],
    recentLeads: [],
    recentPayments: [],
    upcomingDepartures: [],
    expiringPassports: [],
    recentActivity: [],
    distribution: null,
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);

  // Listen for global auth expiration events
  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('hajji_auth_token');
      setCurrentUser(null);
    };

    window.addEventListener('hajji_auth_expired', handleAuthExpired);
    return () => window.removeEventListener('hajji_auth_expired', handleAuthExpired);
  }, []);

  // Authenticate on mount
  useEffect(() => {
    const token = localStorage.getItem('hajji_auth_token');
    if (!token) {
      setLoadingAuth(false);
      return;
    }

    api
      .getMe()
      .then((res) => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
        } else {
          localStorage.removeItem('hajji_auth_token');
          setCurrentUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('hajji_auth_token');
        setCurrentUser(null);
      })
      .finally(() => {
        setLoadingAuth(false);
      });
  }, []);

  // Fetch telemetry when user is logged in
  const fetchTelemetry = async () => {
    const token = localStorage.getItem('hajji_auth_token');
    if (!token) {
      setCurrentUser(null);
      return;
    }

    try {
      const [dashRes, notifRes, dbRes] = await Promise.all([
        api.getDashboardStats(),
        api.getNotifications(),
        api.getDbStatus(),
      ]);

      if (dashRes.success) {
        setDashboardData({
          stats: dashRes.stats,
          recentBookings: dashRes.recentBookings || [],
          recentLeads: dashRes.recentLeads || [],
          recentPayments: dashRes.recentPayments || [],
          upcomingDepartures: dashRes.upcomingDepartures || [],
          expiringPassports: dashRes.expiringPassports || [],
          recentActivity: dashRes.recentActivity || [],
          distribution: dashRes.distribution || null,
        });
      }

      if (notifRes.success) {
        setNotifications(notifRes.data || []);
        setUnreadCount(notifRes.unreadCount || 0);
      }

      if (dbRes.success) {
        setDbStatus(dbRes.status);
      }
    } catch (e: any) {
      const errMsg = e?.message || '';
      if (
        e?.status === 401 ||
        errMsg.includes('Session expired') ||
        errMsg.includes('invalid token') ||
        errMsg.includes('Authentication required')
      ) {
        // Cleanly terminate session and return to LoginView without spamming telemetry
        localStorage.removeItem('hajji_auth_token');
        setCurrentUser(null);
        return;
      }
      console.warn('[Telemetry Notice]:', errMsg);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 30000); // 30s auto-refresh
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    fetchTelemetry();
  };

  const handleLogout = () => {
    localStorage.removeItem('hajji_auth_token');
    setCurrentUser(null);
  };

  const handleNotificationRead = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error(e);
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-100 p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center animate-pulse mb-3">
          <span className="font-bold text-amber-400 font-mono text-lg">HOT</span>
        </div>
        <p className="text-xs text-stone-400 font-medium tracking-wide">
          Connecting to Hajji Original Tours Administration Engine...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900 overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        user={currentUser}
        onLogout={handleLogout}
        dbStatus={dbStatus}
        collapsed={collapsedSidebar}
        onToggleCollapse={() => setCollapsedSidebar(!collapsedSidebar)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header
          currentTab={currentTab}
          user={currentUser}
          onToggleSidebar={() => setCollapsedSidebar(!collapsedSidebar)}
          notifications={notifications}
          unreadCount={unreadCount}
          onNotificationRead={handleNotificationRead}
          onOpenQuickBooking={() => {
            setCurrentTab('bookings');
            setIsQuickBookingOpen(true);
          }}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'dashboard' && (
              <DashboardView
                stats={dashboardData.stats}
                recentBookings={dashboardData.recentBookings}
                recentLeads={dashboardData.recentLeads}
                recentPayments={dashboardData.recentPayments}
                upcomingDepartures={dashboardData.upcomingDepartures}
                expiringPassports={dashboardData.expiringPassports}
                recentActivity={dashboardData.recentActivity}
                distribution={dashboardData.distribution}
                onNavigate={(tab) => setCurrentTab(tab)}
                onOpenQuickBooking={() => {
                  setCurrentTab('bookings');
                  setIsQuickBookingOpen(true);
                }}
              />
            )}

            {currentTab === 'packages' && <PackagesView />}

            {currentTab === 'hotels' && <HotelsView />}

            {currentTab === 'crm' && <CrmView />}

            {currentTab === 'bookings' && (
              <BookingsView
                initialOpenNewBooking={isQuickBookingOpen}
                onCloseNewBookingModal={() => setIsQuickBookingOpen(false)}
              />
            )}

            {currentTab === 'finance' && <FinanceView />}

            {currentTab === 'travel' && <TravelLogisticsView />}

            {currentTab === 'cms' && <CmsMediaView />}

            {currentTab === 'settings' && (
              <AdminSettingsView
                currentUser={currentUser}
                dbStatus={dbStatus}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
