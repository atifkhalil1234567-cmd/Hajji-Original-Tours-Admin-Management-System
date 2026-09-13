import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  Printer,
  CreditCard,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { api } from '../services/api';
import { Payment, Invoice } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const FinanceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'payments' | 'invoices' | 'expenses'>('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [printInvoiceData, setPrintInvoiceData] = useState<any | null>(null);

  // Forms
  const [paymentForm, setPaymentForm] = useState({
    booking_id: 1,
    payment_method_id: 1,
    amount: 1500,
    currency: 'USD',
    transaction_reference: 'TRX-' + Math.floor(100000 + Math.random() * 900000),
    notes: 'Installment towards Hajj 2026 registration',
  });

  const [expenseForm, setExpenseForm] = useState({
    expense_category: 'hotel_advance',
    vendor_name: 'Swissotel Makkah Corporate Office',
    amount: 5000,
    currency: 'USD',
    expense_date: new Date().toISOString().slice(0, 10),
    description: 'Advance deposit for 20 rooms front-row Haram reservation',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [payRes, invRes, expRes, methRes, bkRes] = await Promise.all([
        api.getPayments(),
        api.getInvoices(),
        api.getExpenses(),
        api.getPaymentMethods(),
        api.getBookings(),
      ]);
      if (payRes.success) setPayments(payRes.data);
      if (invRes.success) setInvoices(invRes.data);
      if (expRes.success) setExpenses(expRes.data);
      if (methRes.success) setPaymentMethods(methRes.data);
      if (bkRes.success) setBookings(bkRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.recordPayment(paymentForm);
      if (res.success) {
        setIsPaymentModalOpen(false);
        alert(`Payment ${res.paymentNumber} recorded successfully!`);
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Payment failed');
    }
  };

  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.recordExpense(expenseForm);
      if (res.success) {
        setIsExpenseModalOpen(false);
        alert('Expense recorded successfully!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Expense logging failed');
    }
  };

  const handleOpenPrintInvoice = async (invoiceId: number) => {
    try {
      const res = await api.getInvoicePrint(invoiceId);
      if (res.success) {
        setPrintInvoiceData(res.data);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load invoice printable data');
    }
  };

  const totalPaymentsCollected = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalExpensesLogged = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  return (
    <div id="finance-view" className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Finance, Invoicing & Billing
          </h2>
          <p className="text-xs text-stone-500">
            Payment transactions, installment plans, official VAT invoices & Saudi operational expenditures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-record-payment"
            onClick={() => setIsPaymentModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Record Payment</span>
          </button>
          <button
            id="btn-record-expense"
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs sm:text-sm border border-stone-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-amber-400" />
            <span>+ Log Expense</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Total Revenue Collected
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            ${totalPaymentsCollected.toLocaleString()}
          </div>
          <p className="text-xs text-stone-500 mt-1">{payments.length} successful payment receipts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Operational Outlays & Expenses
          </span>
          <div className="text-2xl font-bold text-rose-700 mt-1 font-mono">
            ${totalExpensesLogged.toLocaleString()}
          </div>
          <p className="text-xs text-stone-500 mt-1">Haram hotels, Saudia airlines, visa fees</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Active Net Operating Margin
          </span>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">
            ${(totalPaymentsCollected - totalExpensesLogged).toLocaleString()}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">Positive operational solvency</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payment Receipts ({payments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>VAT Invoices ({invoices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'expenses'
              ? 'bg-stone-900 text-white font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Expenses ({expenses.length})</span>
        </button>
      </div>

      {/* Tab Content: Payments */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Receipt #</th>
                  <th className="px-5 py-3">Pilgrim Customer</th>
                  <th className="px-5 py-3">Booking Reference</th>
                  <th className="px-5 py-3">Method & Ref</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                      {p.payment_number}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-stone-800">
                      {p.customer_name}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-amber-800 font-medium">
                      {p.booking_number}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">
                      <div>{p.payment_method_name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        {p.transaction_reference}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-emerald-700 text-sm font-mono">
                      +{p.currency === 'SAR' ? '﷼' : p.currency === 'GBP' ? '£' : '$'}
                      {Number(p.amount).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 text-[11px]">{p.payment_date}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="success">Completed</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Invoices */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Pilgrim Name</th>
                  <th className="px-5 py-3">Package Detail</th>
                  <th className="px-5 py-3">Subtotal / Total</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-stone-800">
                      {inv.customer_name}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600 max-w-xs truncate">
                      {inv.package_title}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-stone-900 font-mono">
                        {inv.currency === 'SAR' ? '﷼' : inv.currency === 'GBP' ? '£' : '$'}
                        {Number(inv.total_amount).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-stone-400">VAT Inc.</div>
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 text-[11px]">{inv.due_date}</td>
                    <td className="px-5 py-3.5">
                      <Badge
                        variant={
                          inv.status === 'Paid'
                            ? 'success'
                            : inv.status === 'Partially Paid'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenPrintInvoice(inv.id)}
                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Invoice</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Expenses */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Vendor / Service</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-400">
                      No operational expenses recorded
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-stone-900">{exp.vendor_name}</td>
                      <td className="px-5 py-3.5">
                        <Badge variant="default">{exp.expense_category.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-stone-600 max-w-sm">{exp.description}</td>
                      <td className="px-5 py-3.5 font-bold text-rose-700 font-mono text-sm">
                        -{exp.currency === 'SAR' ? '﷼' : exp.currency === 'GBP' ? '£' : '$'}
                        {Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 text-stone-500 text-[11px]">{exp.expense_date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Pilgrim Payment"
        subtitle="Log an incoming bank wire, credit card charge, or cash settlement"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Select Booking *
              </label>
              <select
                value={paymentForm.booking_id}
                onChange={(e) => setPaymentForm({ ...paymentForm, booking_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.booking_number} — {b.customer_name} (Remaining: ${b.remaining_amount || 0})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Payment Method
              </label>
              <select
                value={paymentForm.payment_method_id}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, payment_method_id: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.method_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Amount Received ($ USD) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Transaction Reference / Bank Wire Ref *
              </label>
              <input
                type="text"
                required
                value={paymentForm.transaction_reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Receipt Memo Notes
              </label>
              <input
                type="text"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs"
            >
              Record Payment Receipt
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Log Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        title="Log Operational Expense"
        subtitle="Record expenditures on Haram hotel contracts, flight blocks, and transport"
      >
        <form onSubmit={handleRecordExpense} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Category *
              </label>
              <select
                value={expenseForm.expense_category}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_category: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                <option value="hotel_advance">Haram Hotel Advance Contract</option>
                <option value="airline_tickets">Saudia / British Airways Flight Block</option>
                <option value="visa_fees">Saudi MOFA Visa Fees</option>
                <option value="transportation">GMC VIP Fleet & Transport</option>
                <option value="guidance_catering">Scholars, Mutawwif & Mina Catering</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Vendor / Supplier Name *
              </label>
              <input
                type="text"
                required
                value={expenseForm.vendor_name}
                onChange={(e) => setExpenseForm({ ...expenseForm, vendor_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Amount ($ USD) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Expense Date
              </label>
              <input
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description / Contract Reference
              </label>
              <textarea
                rows={2}
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Save Expense
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Printable Invoice */}
      {printInvoiceData && (
        <Modal
          isOpen={!!printInvoiceData}
          onClose={() => setPrintInvoiceData(null)}
          title={`Printable Invoice: ${printInvoiceData.invoice.invoice_number}`}
          subtitle="Official VAT invoice and receipt voucher for pilgrim records"
          maxWidth="4xl"
        >
          <div className="p-6 bg-white border border-stone-200 rounded-2xl space-y-6 text-stone-800">
            {/* Printable Header */}
            <div className="flex items-start justify-between border-b border-stone-200 pb-5">
              <div>
                <h2 className="text-xl font-extrabold text-stone-900">
                  {printInvoiceData.company.name || 'Hajji Original Tours Ltd'}
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Ministry of Hajj & Umrah License: #{printInvoiceData.company.license}
                </p>
                <p className="text-xs text-stone-500">{printInvoiceData.company.address}</p>
                <p className="text-xs text-stone-500">
                  Phone: {printInvoiceData.company.phone} • Email: {printInvoiceData.company.email}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Official VAT Invoice
                </span>
                <p className="font-mono font-bold text-stone-900 text-base mt-2">
                  {printInvoiceData.invoice.invoice_number}
                </p>
                <p className="text-xs text-stone-500">Issue Date: {printInvoiceData.invoice.issue_date}</p>
                <p className="text-xs text-stone-500">Due Date: {printInvoiceData.invoice.due_date}</p>
              </div>
            </div>

            {/* Pilgrim Billed To */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">
                  Billed To (Lead Pilgrim):
                </span>
                <p className="font-bold text-stone-900 text-sm mt-1">
                  {printInvoiceData.invoice.customer_name}
                </p>
                <p className="text-stone-600">{printInvoiceData.invoice.customer_email}</p>
                <p className="text-stone-600">{printInvoiceData.invoice.customer_phone}</p>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                <span className="font-semibold text-stone-500 uppercase tracking-wider text-[10px]">
                  Booking Reference:
                </span>
                <p className="font-bold text-stone-900 font-mono text-sm mt-1">
                  {printInvoiceData.invoice.booking_number}
                </p>
                <p className="text-stone-700 font-medium">{printInvoiceData.invoice.package_title}</p>
              </div>
            </div>

            {/* Line Items */}
            <div className="border border-stone-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-right">Tax (VAT)</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="p-3">
                      <div className="font-bold text-stone-900">
                        {printInvoiceData.invoice.package_title}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Haram 5★ accommodation, direct flights, VIP private Mina tents, and all Saudi logistics
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      {printInvoiceData.invoice.currency === 'SAR' ? '﷼' : printInvoiceData.invoice.currency === 'GBP' ? '£' : '$'}
                      {Number(printInvoiceData.invoice.tax_amount || 0).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-bold text-stone-900 font-mono">
                      {printInvoiceData.invoice.currency === 'SAR' ? '﷼' : printInvoiceData.invoice.currency === 'GBP' ? '£' : '$'}
                      {Number(printInvoiceData.invoice.subtotal).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="bg-stone-50/80 border-t border-stone-200 font-bold">
                  <tr>
                    <td colSpan={2} className="p-3 text-right">
                      Total Invoice Amount:
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-stone-950">
                      {printInvoiceData.invoice.currency === 'SAR' ? '﷼' : printInvoiceData.invoice.currency === 'GBP' ? '£' : '$'}
                      {Number(printInvoiceData.invoice.total_amount).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Payments credited */}
            {printInvoiceData.payments && printInvoiceData.payments.length > 0 && (
              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
                  Payments Received & Credited
                </h4>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                  {printInvoiceData.payments.map((pm: any) => (
                    <div key={pm.id} className="flex justify-between items-center py-0.5">
                      <span>
                        {pm.payment_date} • {pm.payment_method_name} (Ref: {pm.transaction_reference})
                      </span>
                      <span className="font-mono font-bold">
                        +{printInvoiceData.invoice.currency === 'SAR' ? '﷼' : printInvoiceData.invoice.currency === 'GBP' ? '£' : '$'}
                        {Number(pm.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setPrintInvoiceData(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Invoice</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
