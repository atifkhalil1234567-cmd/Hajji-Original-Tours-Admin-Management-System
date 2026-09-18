import { AdminUser, DatabaseStatus, DashboardStats, Package, Hotel, Customer, Lead, Booking, Payment, Invoice, VisaApplication, Flight, Transport, NotificationItem } from '../types';

// API Configuration & Base URL Resolution

/**
 * Normalizes an API base URL:
 * - Trims whitespace
 * - Strips any trailing slashes so trailing '/' does not create duplicate slashes
 * - Strips any trailing '/api' so concatenating with '/api/...' does not produce '/api/api/...'
 */
export function normalizeApiBaseUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (cleaned.endsWith('/api')) {
    cleaned = cleaned.slice(0, -4).replace(/\/+$/, '');
  }
  return cleaned;
}

/**
 * Production backend API Base URL hosted on Hostinger
 */
export const PRODUCTION_API_BASE_URL = 'https://api.hajjioriginaltours.com';

/**
 * Returns the exact string set in import.meta.env.VITE_API_BASE_URL (empty if not set or stale Vercel URL)
 */
export function getRawViteApiBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (typeof envUrl === 'string') {
    const trimmed = envUrl.trim();
    if (trimmed.includes('vercel.app')) {
      return '';
    }
    return trimmed;
  }
  return '';
}

/**
 * Returns the active API base URL:
 * 1. Runtime override in localStorage (allows interactive testing on diagnostic panel)
 * 2. Optional override via environment variable: import.meta.env.VITE_API_BASE_URL
 * 3. Fallback to same-origin ONLY if running directly on the api backend subdomain
 * 4. Production Hostinger backend base URL: https://api.hajjioriginaltours.com
 */
export function getApiBaseUrl(): string {
  // 1. Runtime override in localStorage (allows interactive testing, purges any stale Vercel or old myc domains)
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('hajji_custom_api_url');
    if (custom && custom.trim()) {
      if (custom.includes('vercel.app') || custom.includes('myc.hajjioriginaltours.com')) {
        localStorage.removeItem('hajji_custom_api_url');
      } else {
        return normalizeApiBaseUrl(custom);
      }
    }
  }

  // 2. Optional environment variable override: VITE_API_BASE_URL (excluding stale Vercel or old myc URLs)
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() && !envUrl.includes('vercel.app') && !envUrl.includes('myc.hajjioriginaltours.com')) {
    return normalizeApiBaseUrl(envUrl);
  }

  // 3. Fallback to same-origin ONLY if running directly on the api subdomain
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin;
    if (origin.includes('api.hajjioriginaltours.com')) {
      return normalizeApiBaseUrl(origin);
    }
  }

  // 4. Default to Hostinger production backend
  return PRODUCTION_API_BASE_URL;
}

export function isApiBaseUrlConfigured(): boolean {
  return Boolean(getApiBaseUrl());
}

// Backward-compatible alias
export function getBaseUrl(): string {
  return getApiBaseUrl();
}

/**
 * Constructs the full API endpoint URL:
 * ${VITE_API_BASE_URL}/api/...
 * Ensures single /api prefix and eliminates duplicate slashes.
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Ensure /api prefix without duplication
  const apiPath = cleanEndpoint.startsWith('/api/') || cleanEndpoint === '/api'
    ? cleanEndpoint
    : `/api${cleanEndpoint}`;

  if (!base) {
    return apiPath;
  }

  return `${base}${apiPath}`;
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
  const url = buildApiUrl(endpoint);

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
    const err: ApiError = new Error(
      `Network Connection Error: The frontend cannot connect to the backend at "${url}". Please verify your backend server is running and accessible.`
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

  const status = response.status;
  const isHtml = contentType.includes('text/html') || responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html');

  // HTTP 401: Invalid username/password or expired session
  if (status === 401) {
    localStorage.removeItem('hajji_auth_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hajji_auth_expired', { detail: data?.message }));
    }
    const message = data?.message || 'Invalid username or password. Please verify your admin credentials.';
    const error: ApiError = new Error(message);
    error.status = 401;
    error.statusText = response.statusText;
    error.contentType = contentType;
    error.url = url;
    throw error;
  }

  // HTTP 404: Endpoint unavailable or backend API URL incorrect
  if (status === 404) {
    const message = `Backend API endpoint is unavailable (HTTP 404) at "${url}". Please ensure your backend Express server is running and the route exists.`;
    const error: ApiError = new Error(message);
    error.status = 404;
    error.statusText = response.statusText;
    error.contentType = contentType;
    error.rawResponse = responseText.slice(0, 300);
    error.url = url;
    throw error;
  }

  // HTTP 500 / 502 / 503 / 504: Backend / database error
  if (status >= 500) {
    let message = '';
    if (status === 502) {
      message = `Bad Gateway (HTTP 502) at "${url}". The Hostinger Node.js backend application process is not running or crashed.`;
    } else if (status === 503) {
      message = `Service Unavailable (HTTP 503) at "${url}". The Hostinger backend server is restarting or overloaded.`;
    } else if (status === 504) {
      message = `Gateway Timeout (HTTP 504) at "${url}". The backend server took too long to respond.`;
    } else {
      message = data?.message
        ? `Backend or database error (HTTP 500): ${data.message}`
        : `Backend or database error (HTTP 500) at "${url}". Please verify Hostinger MySQL connection and server logs.`;
    }
    const error: ApiError = new Error(message);
    error.status = status;
    error.statusText = response.statusText;
    error.contentType = contentType;
    error.rawResponse = responseText.slice(0, 300);
    error.url = url;
    throw error;
  }

  // If response was not valid JSON (e.g. server returned HTML or empty response)
  if (!data) {
    const message = isHtml
      ? `Unexpected server response: Server returned HTML (status ${status}) instead of API JSON from "${url}". If hosted on Hostinger, ensure the Node.js application is running and reverse-proxying API requests.`
      : `HTTP ${status} ${response.statusText || 'Error'}: Unexpected server response format from "${url}".`;
    const error: ApiError = new Error(message);
    error.status = response.ok ? 502 : status;
    error.statusText = response.statusText;
    error.contentType = contentType;
    error.rawResponse = responseText.slice(0, 300);
    error.url = url;
    throw error;
  }

  if (!response.ok || data?.success === false) {
    const error: ApiError = new Error(data?.message || `Request failed with status ${response.status}`);
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
  PRODUCTION_API_BASE_URL,
  getBaseUrl,
  getApiBaseUrl,
  getRawViteApiBaseUrl,
  normalizeApiBaseUrl,
  isApiBaseUrlConfigured,
  buildApiUrl,
  setCustomBaseUrl,
  getHealth: () =>
    request<{
      status: string;
      timestamp: string;
      database: DatabaseStatus;
      app: string;
      version: string;
    }>('/api/health'),
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
