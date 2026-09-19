export interface AdminUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role_id: number;
  role_slug: string;
  role_name: string;
  permissions: string[];
}

export interface DatabaseStatus {
  connected: boolean;
  engine: string;
  database: string;
  host: string;
  tablesCount: number;
  message: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalPilgrims: number;
  activePackages: number;
  upcomingDeparturesCount: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  inquiriesCount: number;
  totalRevenue: number;
  totalPaid: number;
  totalOutstanding: number;
  totalLeads: number;
  newLeads: number;
  followupsDue: number;
  visaApplications: number;
  pendingVisaDocs: number;
  confirmedFlights: number;
  totalHotels: number;
}

export interface PackageCategory {
  id: number;
  name: string;
  slug: string;
  type: string;
  description: string;
}

export interface PackageDeparture {
  id: number;
  package_id: number;
  departure_title: string;
  departure_date: string;
  return_date: string;
  total_seats: number;
  booked_seats: number;
  status: 'scheduled' | 'available' | 'almost_full' | 'sold_out' | 'completed' | 'cancelled';
  package_title?: string;
  origin_city?: string;
}

export interface Package {
  id: number;
  category_id: number;
  category_name?: string;
  title: string;
  slug: string;
  package_type: string;
  hajj_type: string;
  gregorian_year: number;
  hijri_year?: number;
  duration_days: number;
  origin_city: string;
  destination_city: string;
  starting_price: number;
  currency: string;
  currency_id?: number;
  total_seats: number;
  booked_seats: number;
  short_description?: string;
  featured_image?: string;
  status: 'draft' | 'published' | 'archived';
  is_featured: number;
  departures?: PackageDeparture[];
  hotels?: any[];
  itineraries?: any[];
  inclusions?: any[];
}

export interface HotelRoom {
  id: number;
  hotel_id: number;
  room_name: string;
  room_type: string;
  view_type: string;
  capacity_adults: number;
  capacity_children: number;
  price_per_night?: number;
  status: string;
}

export interface Hotel {
  id: number;
  name: string;
  arabic_name?: string;
  city: 'Makkah' | 'Madinah' | 'Jeddah';
  star_rating: number;
  distance_meters: number;
  shuttle_available: number;
  address: string;
  featured_image?: string;
  status: string;
  rooms?: HotelRoom[];
  facilities?: any[];
}

export interface Customer {
  id: number;
  customer_code: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  nationality?: string;
  country_of_residence?: string;
  vip_level: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  status: string;
  lead_source?: string;
  notes?: string;
  total_bookings?: number;
  total_spent?: number;
  passports?: CustomerPassport[];
  bookings?: any[];
}

export interface CustomerPassport {
  id: number;
  customer_id: number;
  passport_number: string;
  issuing_country: string;
  nationality: string;
  issue_date?: string;
  expiry_date: string;
  status: string;
  customer_name?: string;
  phone?: string;
  email?: string;
}

export interface Lead {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  package_interest?: string;
  destination?: string;
  num_travelers: number;
  budget?: number;
  status: 'New' | 'Contacted' | 'Proposal Sent' | 'Follow-up' | 'Converted' | 'Lost';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  lead_source?: string;
  followup_due_date?: string;
  notes?: string;
  created_at: string;
  assigned_admin_name?: string;
}

export interface Booking {
  id: number;
  booking_number: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  package_id: number;
  package_title?: string;
  departure_id?: number;
  departure_title?: string;
  booking_status_id: number;
  status_name?: string;
  status_label?: string;
  badge_color?: string;
  payment_status: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'Refunded' | 'Overdue';
  visa_status: 'Not Started' | 'Documents Pending' | 'Submitted to MOFA' | 'Approved' | 'Rejected';
  flight_status: 'Unassigned' | 'Booked' | 'Ticketed' | 'Changed' | 'Cancelled';
  hotel_status: 'Pending' | 'Reserved' | 'Confirmed' | 'Checked In' | 'Completed';
  num_adults: number;
  num_children: number;
  total_travelers: number;
  subtotal_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  currency: string;
  travel_start_date?: string;
  travel_end_date?: string;
  created_at: string;
  travelers?: any[];
  payments?: any[];
  invoices?: any[];
  flights?: any[];
}

export interface Payment {
  id: number;
  payment_number: string;
  booking_id: number;
  booking_number?: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  payment_method_id: number;
  payment_method_name?: string;
  amount: number;
  currency: string;
  payment_date: string;
  transaction_reference: string;
  status: string;
  notes?: string;
  received_by_name?: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  booking_id: number;
  booking_number?: string;
  customer_id: number;
  customer_name?: string;
  customer_email?: string;
  package_title?: string;
  currency?: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  paid_amount?: number;
  remaining_amount?: number;
}

export interface VisaApplication {
  id: number;
  booking_id: number;
  traveler_id: number;
  application_number: string;
  mofa_number?: string;
  visa_number?: string;
  status: 'Draft' | 'Documents Received' | 'Verification in Progress' | 'Submitted to MOFA' | 'Approved' | 'Rejected';
  submission_date?: string;
  approval_date?: string;
  traveler_name?: string;
  nationality?: string;
  passport_number?: string;
  passport_expiry?: string;
  booking_number?: string;
  package_title?: string;
  travel_start_date?: string;
}

export interface Flight {
  id: number;
  airline_name: string;
  airline_code: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_city: string;
  arrival_city: string;
  departure_time: string;
  arrival_time: string;
  flight_type: string;
  baggage_allowance?: string;
  status: string;
}

export interface Transport {
  id: number;
  service_type: string;
  vehicle_type: string;
  capacity: number;
  driver_name: string;
  driver_phone: string;
  plate_number?: string;
  status: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link_url?: string;
  is_read: number;
  created_at: string;
}
