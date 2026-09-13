import { AdminUser, DatabaseStatus, DashboardStats, Package, Hotel, Customer, Lead, Booking, Payment, Invoice, VisaApplication, Flight, Transport, NotificationItem } from '../types';

// API Configuration
export function getBaseUrl(): string {
  // 1. Runtime override in localStorage (allows changing API URL on Hostinger without rebuild)
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('hajji_custom_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, '');
    }
    if ((window as any).__HAJJI_API_URL__) {
      return String((window as any).__HAJJI_API_URL__).trim().replace(/\/+$/, '');
    }
  }
  // 2. Vite environment variable
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  // 3. Default relative production path
  return '/api';
}

export function setCustomBaseUrl(url: string | null): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('hajji_custom_api_url', url.trim());
    } else {
      localStorage.removeItem('hajji_custom_api_url');
    }
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('hajji_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  contentType?: string;
  url?: string;
  rawResponse?: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${cleanEndpoint}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers as any),
  };

  // If body is FormData, delete Content-Type to let browser set boundary
  if (options.body instanceof FormData) {
    delete (headers as any)['Content-Type'];
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (netErr: any) {
    const netMessage = netErr?.message || 'Network request failed';
    const err: ApiError = new Error(
      `Cannot connect to API server at "${url}". Please verify your server is running, CORS settings, or network status (${netMessage}).`
    );
    err.status = 0;
    err.statusText = 'Network Error';
    err.url = url;
    throw err;
  }

  // If server automatically refreshed our token, store the new token immediately
  const refreshedToken = response.headers.get('X-Refreshed-Token');
  if (refreshedToken) {
    localStorage.setItem('hajji_auth_token', refreshedToken);
  }

  // Read response as text first to inspect content type and handle HTML / crash pages gracefully
  let responseText = '';
  try {
    responseText = await response.text();
  } catch {
    responseText = '';
  }

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }
  }

  // If response is not valid JSON, generate a helpful diagnostic error instead of generic "Invalid response from server"
  if (!data) {
    const status = response.status;
    const isHtml = contentType.includes('text/html') || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html');
    let message = '';

    if (status === 404) {
      message = `API endpoint not found (HTTP 404) at "${url}". Verify backend server routing and API URL configuration.`;
    } else if (status === 502) {
      message = `Bad Gateway (HTTP 502) at "${url}". The Hostinger Node.js backend application process is not running or crashed.`;
    } else if (status === 503) {
      message = `Service Unavailable (HTTP 503) at "${url}". The Hostinger backend server is restarting or overloaded.`;
    } else if (status === 500) {
      message = `Internal Server Error (HTTP 500) at "${url}". The backend encountered an unhandled exception.`;
    } else if (status === 403) {
      message = `Access Forbidden (HTTP 403) at "${url}". Web server security rule blocked this API request.`;
    } else if (isHtml) {
      message = `Server returned HTML (status ${status}) instead of API JSON from "${url}". If hosted on Hostinger, ensure the Node.js application is running and reverse-proxying /api.`;
    } else {
      message = `HTTP ${status} ${response.statusText || 'Error'}: Unexpected server response format (${contentType || 'non-JSON'}).`;
    }

    const error: ApiError = new Error(message);
    error.status = status;
    error.statusText = response.statusText;
    error.contentType = contentType;
    error.rawResponse = responseText.slice(0, 300);
    error.url = url;
    throw error;
  }

  if (response.status === 401) {
    localStorage.removeItem('hajji_auth_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hajji_auth_expired', { detail: data.message }));
    }
  }

  if (!response.ok || data.success === false) {
    const error: ApiError = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.statusText = response.statusText;
    error.contentType = contentType;
    error.url = url;
    throw error;
  }

  return data;
}

export const api = {
  // Config & Diagnostics
  getBaseUrl,
  setCustomBaseUrl,
  getDiagnostic: () =>
    request<{
      success: boolean;
      timestamp: string;
      apiUrl: string;
      database: {
        connected: boolean;
        engine: string;
        host: string;
        databaseName: string;
        tablesCount: number;
        lastError?: string | null;
        adminsTableExists: boolean;
        adminCount: number;
        superadminFound: boolean;
        superadminActive: boolean;
        superadminEmail?: string | null;
        queryError?: string | null;
      };
      environment: {
        nodeEnv: string;
        port: number | string;
        corsEnabled: boolean;
      };
    }>('/auth/diagnostic'),

  // Auth
  login: (credentials: { username: string; password: string }) =>
    request<{ success: boolean; token: string; user: AdminUser; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<{ success: boolean; user: AdminUser }>('/auth/me'),
  updatePassword: (passwords: { current_password: string; new_password: string }) =>
    request<{ success: boolean; message: string }>('/auth/update-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    }),

  // Dashboard
  getDashboardStats: () => request<{ success: boolean; stats: DashboardStats; recentBookings: any[]; recentLeads: any[]; recentPayments: any[]; upcomingDepartures: any[]; expiringPassports: any[]; recentActivity: any[]; distribution: any }>('/dashboard/stats'),

  // Packages
  getPackages: (params?: { category?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Package[] }>(`/packages${query ? `?${query}` : ''}`);
  },
  getPackageCategories: () => request<{ success: boolean; data: any[] }>('/packages/categories'),
  getPackageDepartures: () => request<{ success: boolean; data: any[] }>('/packages/departures'),
  getPackageById: (id: number | string) => request<{ success: boolean; data: Package }>(`/packages/${id}`),
  createPackage: (data: any) => request<{ success: boolean; id: number; message: string }>('/packages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePackage: (id: number | string, data: any) => request<{ success: boolean; message: string }>(`/packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  togglePackageStatus: (id: number | string, status?: string) =>
    request<{ success: boolean; id: number; status: string; isOn: boolean; message: string }>(
      `/packages/${id}/toggle-status`,
      {
        method: 'PATCH',
        body: JSON.stringify(status ? { status } : {}),
      }
    ),
  deletePackage: (id: number | string) => request<{ success: boolean; message: string }>(`/packages/${id}`, {
    method: 'DELETE',
  }),
  createDeparture: (data: any) => request<{ success: boolean; id: number; message: string }>('/packages/departures', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Hotels
  getHotels: () => request<{ success: boolean; data: Hotel[] }>('/hotels'),
  getHotelFacilities: () => request<{ success: boolean; data: any[] }>('/hotels/facilities'),
  createHotel: (data: any) => request<{ success: boolean; id: number; message: string }>('/hotels', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  addHotelRoom: (hotelId: number | string, data: any) => request<{ success: boolean; id: number; message: string }>(`/hotels/${hotelId}/rooms`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // CRM
  getCustomers: (params?: { search?: string; vip_level?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Customer[] }>(`/crm/customers${query ? `?${query}` : ''}`);
  },
  getCustomerById: (id: number | string) => request<{ success: boolean; data: Customer }>(`/crm/customers/${id}`),
  createCustomer: (data: any) => request<{ success: boolean; id: number; customerCode: string; message: string }>('/crm/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getLeads: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Lead[] }>(`/crm/leads${query ? `?${query}` : ''}`);
  },
  createLead: (data: any) => request<{ success: boolean; id: number; message: string }>('/crm/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateLeadStatus: (id: number | string, data: { status: string; notes?: string }) =>
    request<{ success: boolean; message: string }>(`/crm/leads/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  convertLead: (id: number | string) => request<{ success: boolean; customerId: number; message: string }>(`/crm/leads/${id}/convert`, {
    method: 'POST',
  }),

  // Bookings
  getBookings: (params?: { search?: string; status?: string; payment_status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Booking[] }>(`/bookings${query ? `?${query}` : ''}`);
  },
  getBookingStatuses: () => request<{ success: boolean; data: any[] }>('/bookings/statuses'),
  getBookingById: (id: number | string) => request<{ success: boolean; data: Booking }>(`/bookings/${id}`),
  createBooking: (data: any) => request<{ success: boolean; id: number; bookingNumber: string; message: string }>('/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBookingStatus: (id: number | string, data: { booking_status_id?: number; payment_status?: string; visa_status?: string; flight_status?: string; hotel_status?: string }) =>
    request<{ success: boolean; message: string }>(`/bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Finance
  getPaymentMethods: () => request<{ success: boolean; data: any[] }>('/finance/methods'),
  getPayments: (params?: { search?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: Payment[]; pagination: any }>(`/finance/payments${query ? `?${query}` : ''}`);
  },
  recordPayment: (data: any) => request<{ success: boolean; id: number; paymentNumber: string; message: string; newBalance: any }>('/finance/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getInvoices: () => request<{ success: boolean; data: Invoice[] }>('/finance/invoices'),
  getInvoicePrint: (id: number | string) => request<{ success: boolean; data: { invoice: any; payments: any[]; company: any } }>(`/finance/invoices/${id}/print`),
  getExpenses: () => request<{ success: boolean; data: any[] }>('/finance/expenses'),
  recordExpense: (data: any) => request<{ success: boolean; id: number; message: string }>('/finance/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Travel & Logistics
  getVisas: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: VisaApplication[] }>(`/travel/visas${query ? `?${query}` : ''}`);
  },
  updateVisa: (id: number | string, data: any) => request<{ success: boolean; message: string }>(`/travel/visas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getFlights: () => request<{ success: boolean; data: Flight[] }>('/travel/flights'),
  createFlight: (data: any) => request<{ success: boolean; id: number; message: string }>('/travel/flights', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  assignFlightToBooking: (data: any) => request<{ success: boolean; id: number; message: string }>('/travel/flights/assign-to-booking', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTransports: () => request<{ success: boolean; transports: Transport[]; transportBookings: any[] }>('/travel/transports'),
  createTransport: (data: any) => request<{ success: boolean; id: number; message: string }>('/travel/transports', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // CMS
  getPages: () => request<{ success: boolean; data: any[] }>('/cms/pages'),
  createPage: (data: any) => request<{ success: boolean; id: number; message: string }>('/cms/pages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSliders: () => request<{ success: boolean; data: any[] }>('/cms/sliders'),
  createSlider: (data: any) => request<{ success: boolean; id: number; message: string }>('/cms/sliders', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getFaqs: () => request<{ success: boolean; data: any[] }>('/cms/faqs'),
  createFaq: (data: any) => request<{ success: boolean; id: number; message: string }>('/cms/faqs', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTestimonials: () => request<{ success: boolean; data: any[] }>('/cms/testimonials'),
  createTestimonial: (data: any) => request<{ success: boolean; id: number; message: string }>('/cms/testimonials', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMedia: (params?: { folder?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: any[] }>(`/cms/media${query ? `?${query}` : ''}`);
  },
  uploadMedia: (formData: FormData) => request<{ success: boolean; data: any; message: string }>('/cms/media/upload', {
    method: 'POST',
    body: formData,
  }),

  // Admin & Settings
  getAdminUsers: () => request<{ success: boolean; data: any[] }>('/admin/users'),
  createAdminUser: (data: any) => request<{ success: boolean; id: number; message: string }>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateAdminStatus: (id: number | string, status: string) => request<{ success: boolean; message: string }>(`/admin/users/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  getRolesAndPermissions: () => request<{ success: boolean; roles: any[]; permissions: any[]; rolePermissions: any[] }>('/admin/roles'),
  updateRolePermissions: (roleId: number | string, permission_ids: number[]) => request<{ success: boolean; message: string }>(`/admin/roles/${roleId}/permissions`, {
    method: 'POST',
    body: JSON.stringify({ permission_ids }),
  }),
  getSettings: () => request<{ success: boolean; system: any[]; site: any; currencies: any[] }>('/admin/settings'),
  updateSiteSettings: (data: any) => request<{ success: boolean; message: string }>('/admin/settings/site', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getAuditLogs: (params?: { module?: string; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ success: boolean; data: any[] }>(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },
  getNotifications: () => request<{ success: boolean; data: NotificationItem[]; unreadCount: number }>('/admin/notifications'),
  markNotificationRead: (id: number | string) => request<{ success: boolean; message: string }>(`/admin/notifications/${id}/read`, {
    method: 'POST',
  }),
  getDbStatus: () => request<{ success: boolean; status: DatabaseStatus }>('/admin/db-status'),
};
