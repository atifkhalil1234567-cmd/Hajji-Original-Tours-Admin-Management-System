import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api';
import { Customer, Lead } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const CrmView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'leads'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);

  // Forms
  const [custForm, setCustForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    whatsapp: '',
    nationality: 'British',
    country_of_residence: 'United Kingdom',
    vip_level: 'Gold' as 'Standard' | 'Silver' | 'Gold' | 'Platinum',
    passport_number: '',
    passport_expiry: '2028-12-31',
  });

  const [leadForm, setLeadForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    package_interest: 'Royal Diamond 5-Star Hajj',
    destination: 'Hajj',
    num_travelers: 2,
    priority: 'High' as 'Low' | 'Medium' | 'High' | 'Urgent',
    notes: 'Interested in VIP non-shifting tent package with direct Haram flight from Heathrow.',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [custRes, leadRes] = await Promise.all([
        api.getCustomers(),
        api.getLeads(),
      ]);
      if (custRes.success) setCustomers(custRes.data);
      if (leadRes.success) setLeads(leadRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createCustomer(custForm);
      if (res.success) {
        setIsCustomerModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createLead(leadForm);
      if (res.success) {
        setIsLeadModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create lead');
    }
  };

  const handleConvertLead = async (leadId: number) => {
    if (!confirm('Convert this inquiry lead into a permanent registered Customer profile?')) return;
    try {
      const res = await api.convertLead(leadId);
      if (res.success) {
        alert('Lead successfully converted to Customer profile!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Conversion failed');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(term) ||
      c.last_name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      c.customer_code.toLowerCase().includes(term)
    );
  });

  const filteredLeads = leads.filter((l) => {
    const term = search.toLowerCase();
    return (
      l.full_name.toLowerCase().includes(term) ||
      l.email.toLowerCase().includes(term) ||
      l.phone.includes(term) ||
      (l.package_interest && l.package_interest.toLowerCase().includes(term))
    );
  });

  return (
    <div id="crm-view" className="space-y-6 pb-12">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Pilgrim CRM & Lead Intelligence
          </h2>
          <p className="text-xs text-stone-500">
            Customer directory, Saudi visa passport validity checker, and inquiry sales pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'customers' ? (
            <button
              id="btn-new-customer"
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Register Customer</span>
            </button>
          ) : (
            <button
              id="btn-new-lead"
              onClick={() => setIsLeadModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Inquiry Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs & Search */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="tab-btn-customers"
            onClick={() => setActiveSubTab('customers')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSubTab === 'customers'
                ? 'bg-stone-900 text-stone-100 font-bold'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Customers ({customers.length})</span>
          </button>
          <button
            id="tab-btn-leads"
            onClick={() => setActiveSubTab('leads')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSubTab === 'leads'
                ? 'bg-stone-900 text-stone-100 font-bold'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span>Inquiry Pipeline ({leads.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, phone or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
          />
        </div>
      </div>

      {/* Sub-Tab 1: Customers Table */}
      {activeSubTab === 'customers' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Code / Pilgrim Name</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3">VIP Tier</th>
                  <th className="px-5 py-3">Nationality & Residence</th>
                  <th className="px-5 py-3">Linked Passports</th>
                  <th className="px-5 py-3">Bookings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      Loading pilgrims...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      No customers match your search
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-mono text-[11px] text-amber-700 font-bold">
                          {cust.customer_code}
                        </div>
                        <div className="font-bold text-stone-900 text-sm">
                          {cust.first_name} {cust.last_name}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span>{cust.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-stone-400" />
                          <span>{cust.phone}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            cust.vip_level === 'Platinum'
                              ? 'purple'
                              : cust.vip_level === 'Gold'
                              ? 'gold'
                              : cust.vip_level === 'Silver'
                              ? 'info'
                              : 'default'
                          }
                        >
                          {cust.vip_level} VIP
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-stone-800">
                          {cust.nationality || 'British'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {cust.country_of_residence || 'United Kingdom'}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {cust.passports && cust.passports.length > 0 ? (
                          cust.passports.map((pp) => (
                            <div key={pp.id} className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <span className="font-bold text-stone-900">{pp.passport_number}</span>
                              <span className="text-[10px] text-stone-400">(Exp: {pp.expiry_date})</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-stone-400 italic">No passport recorded</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-stone-900">{cust.total_bookings || 1}</span>
                        <span className="text-stone-500 text-[11px]"> package(s)</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Leads Pipeline Table */}
      {activeSubTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Lead Name / Contact</th>
                  <th className="px-5 py-3">Interest & Travelers</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3">Pipeline Stage</th>
                  <th className="px-5 py-3">Inquiry Notes</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      Loading pipeline...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-400">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-stone-900 text-sm">{lead.full_name}</div>
                        <div className="text-[11px] text-stone-500 mt-0.5">{lead.phone} • {lead.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-stone-800">
                          {lead.package_interest || lead.destination}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {lead.num_travelers} Pilgrim(s)
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={
                            lead.priority === 'High' || lead.priority === 'Urgent'
                              ? 'danger'
                              : lead.priority === 'Medium'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {lead.priority}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs truncate text-stone-600 text-[11px]">
                        {lead.notes || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {lead.status !== 'Converted' ? (
                          <button
                            onClick={() => handleConvertLead(lead.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                            title="Convert to Registered Customer Profile"
                          >
                            <span>Convert</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Customer</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Customer */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Register Pilgrim Customer"
        subtitle="Create a verified pilgrim profile with passport details"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={custForm.first_name}
                onChange={(e) => setCustForm({ ...custForm, first_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={custForm.last_name}
                onChange={(e) => setCustForm({ ...custForm, last_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={custForm.email}
                onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Phone Number (with country code) *
              </label>
              <input
                type="text"
                required
                value={custForm.phone}
                onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                placeholder="+44 7..."
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                VIP Tier Classification
              </label>
              <select
                value={custForm.vip_level}
                onChange={(e) => setCustForm({ ...custForm, vip_level: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="Standard">Standard</option>
                <option value="Silver">Silver Tier</option>
                <option value="Gold">Gold VIP</option>
                <option value="Platinum">Platinum Royal VIP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nationality
              </label>
              <input
                type="text"
                value={custForm.nationality}
                onChange={(e) => setCustForm({ ...custForm, nationality: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Passport Number
              </label>
              <input
                type="text"
                value={custForm.passport_number}
                onChange={(e) => setCustForm({ ...custForm, passport_number: e.target.value })}
                placeholder="e.g. GB90214812"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Passport Expiry Date
              </label>
              <input
                type="date"
                value={custForm.passport_expiry}
                onChange={(e) => setCustForm({ ...custForm, passport_expiry: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Register Customer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Lead */}
      <Modal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        title="Record New Pilgrim Inquiry"
        subtitle="Log an incoming inquiry from web, phone, or referral"
      >
        <form onSubmit={handleCreateLead} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={leadForm.full_name}
                onChange={(e) => setLeadForm({ ...leadForm, full_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Phone Number *
              </label>
              <input
                type="text"
                required
                value={leadForm.phone}
                onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={leadForm.email}
                onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Package Interest
              </label>
              <input
                type="text"
                value={leadForm.package_interest}
                onChange={(e) => setLeadForm({ ...leadForm, package_interest: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Number of Travelers
              </label>
              <input
                type="number"
                min="1"
                value={leadForm.num_travelers}
                onChange={(e) => setLeadForm({ ...leadForm, num_travelers: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Lead Priority
              </label>
              <select
                value={leadForm.priority}
                onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Notes / Special Inquiries
              </label>
              <textarea
                rows={2}
                value={leadForm.notes}
                onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsLeadModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save Inquiry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
