import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { AdminUser, DatabaseStatus, DashboardStats, NotificationItem, CustomerUser } from './types';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginView } from './views/LoginView';
import { CustomerLoginView } from './views/CustomerLoginView';
import { CustomerRegisterView } from './views/CustomerRegisterView';
import { CustomerDashboardView } from './views/CustomerDashboardView';
import { DashboardView } from './views/DashboardView';
import { PackagesView } from './views/PackagesView';
import { HotelsView } from './views/HotelsView';
import { CrmView } from './views/CrmView';
import { BookingsView } from './views/BookingsView';
import { FinanceView } from './views/FinanceView';
import { TravelLogisticsView } from './views/TravelLogisticsView';
import { CmsMediaView } from './views/CmsMediaView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { UserManagementView } from './views/UserManagementView';

type AppRoute = 'admin_login' | 'admin_app' | 'customer_login' | 'customer_register' | 'customer_dashboard';

function getInitialRoute(): AppRoute {
  if (typeof window === 'undefined') return 'admin_login';
  const path = window.location.pathname.toLowerCase();
  const hash = window.location.hash.toLowerCase();

  if (path.includes('/customer/register') || hash.includes('/customer/register')) {
    return 'customer_register';
  }
  if (path.includes('/customer/dashboard') || hash.includes('/customer/dashboard')) {
    return 'customer_dashboard';
  }
  if (path.includes('/customer/login') || hash.includes('/customer/login') || path.includes('/customer')) {
    return 'customer_login';
  }
  return 'admin_login';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute());
  const [currentCustomer, setCurrentCustomer] = useState<CustomerUser | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hajji_customer_user');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return null;
  });

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [collapsedSidebar, setCollapsedSidebar] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);

  const navigateTo = (route: AppRoute, newPath?: string) => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      let path = newPath;
      if (!path) {
        if (route === 'customer_login') path = '/customer/login';
        else if (route === 'customer_register') path = '/customer/register';
        else if (route === 'customer_dashboard') path = '/customer/dashboard';
        else if (route === 'admin_login') path = '/login';
        else if (route === 'admin_app') path = '/';
      }
      if (path && window.location.pathname !== path) {
        try {
          window.history.pushState({ route }, '', path);
        } catch {}
      }
    }
  };

  // Popstate event for back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(getInitialRoute());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen for customer auth expiration
  useEffect(() => {
    const handleCustomerExpired = () => {
      localStorage.removeItem('hajji_customer_token');
      localStorage.removeItem('hajji_customer_user');
      setCurrentCustomer(null);
      navigateTo('customer_login');
    };
    window.addEventListener('hajji_customer_auth_expired', handleCustomerExpired);
    return () => window.removeEventListener('hajji_customer_auth_expired', handleCustomerExpired);
  }, []);

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
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

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

  // Authenticate Customer session on mount
  useEffect(() => {
    const custToken = localStorage.getItem('hajji_customer_token');
    if (!custToken) return;

    api
      .getCustomerMe()
      .then((res) => {
        if (res.success && res.customer) {
          setCurrentCustomer(res.customer);
          localStorage.setItem('hajji_customer_user', JSON.stringify(res.customer));
          if (typeof window !== 'undefined' && window.location.pathname.includes('/customer')) {
            setCurrentRoute('customer_dashboard');
          }
        } else {
          localStorage.removeItem('hajji_customer_token');
          localStorage.removeItem('hajji_customer_user');
          setCurrentCustomer(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('hajji_customer_token');
        localStorage.removeItem('hajji_customer_user');
        setCurrentCustomer(null);
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
      const [dashRes, notifRes, dbRes, usersRes] = await Promise.all([
        api.getDashboardStats(),
        api.getNotifications(),
        api.getDbStatus(),
        api.getCustomerUsers({ status: 'pending' }).catch(() => null),
      ]);

      if (usersRes && usersRes.counts) {
        setPendingUsersCount(usersRes.counts.pending || 0);
      }

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

  // 1. Customer Login Route
  if (currentRoute === 'customer_login') {
    return (
      <CustomerLoginView
        onLoginSuccess={(customer) => {
          setCurrentCustomer(customer);
          navigateTo('customer_dashboard');
        }}
        onNavigateToRegister={() => navigateTo('customer_register')}
        onNavigateToAdminLogin={() => navigateTo('admin_login')}
      />
    );
  }

  // 2. Customer Registration Route
  if (currentRoute === 'customer_register') {
    return (
      <CustomerRegisterView
        onRegisterSuccess={(customer) => {
          setCurrentCustomer(customer);
          navigateTo('customer_dashboard');
        }}
        onNavigateToLogin={() => navigateTo('customer_login')}
        onNavigateToAdminLogin={() => navigateTo('admin_login')}
      />
    );
  }

  // 3. Customer Dashboard Route
  if (currentRoute === 'customer_dashboard') {
    if (currentCustomer) {
      return (
        <CustomerDashboardView
          customer={currentCustomer}
          onLogout={() => {
            api.customerLogout();
            setCurrentCustomer(null);
            navigateTo('customer_login');
          }}
        />
      );
    }
    // If not authenticated as customer, fallback to Customer Login
    return (
      <CustomerLoginView
        onLoginSuccess={(customer) => {
          setCurrentCustomer(customer);
          navigateTo('customer_dashboard');
        }}
        onNavigateToRegister={() => navigateTo('customer_register')}
        onNavigateToAdminLogin={() => navigateTo('admin_login')}
      />
    );
  }

  // 4. Admin Login Route (when no admin user is authenticated)
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          navigateTo('admin_app');
        }}
        onNavigateToCustomerLogin={() => navigateTo('customer_login')}
        onNavigateToCustomerRegister={() => navigateTo('customer_register')}
      />
    );
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
        pendingUsersCount={pendingUsersCount}
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

            {currentTab === 'user_management' && (
              <UserManagementView currentUser={currentUser} />
            )}

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
