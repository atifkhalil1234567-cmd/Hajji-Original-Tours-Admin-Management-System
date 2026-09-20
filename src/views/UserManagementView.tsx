import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Shield,
  Phone,
  Mail,
  Edit2,
  Ban,
  RotateCcw,
  FileText,
  Sparkles,
  Calendar,
  ChevronRight,
  RefreshCw,
  Award,
  Briefcase,
  Layers,
  DollarSign,
  Compass,
  Building,
} from 'lucide-react';
import { api } from '../services/api';
import { AdminUser, CustomerUser } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface UserManagementViewProps {
  currentUser: AdminUser;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ currentUser }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    active: 0,
    rejected: 0,
    suspended: 0,
  });
  const [assignableRoles, setAssignableRoles] = useState<{ id: string; name: string; description: string }[]>([]);

  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'active' | 'rejected' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedRoleForApproval, setSelectedRoleForApproval] = useState<string>('');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('');

  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [userAuditLogs, setUserAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Clear notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load users & roles
  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.getCustomerUsers({
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchQuery.trim() || undefined,
        }),
        api.getAssignableRoles(),
      ]);

      if (usersRes.success) {
        setUsers(usersRes.users || []);
        if (usersRes.counts) {
          setCounts(usersRes.counts);
        }
      }

      if (rolesRes.success && rolesRes.roles) {
        setAssignableRoles(rolesRes.roles);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to fetch user accounts.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Format date helper
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  // Get status badge variant & styling
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending Approval
          </span>
        );
      case 'active':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Active / Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Rejected
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-300">
            <Ban className="w-3.5 h-3.5 text-orange-600" />
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-300 capitalize">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  // Get role styling badge
  const getRoleBadge = (role: string | null | undefined) => {
    if (!role) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-500 border border-dashed border-stone-300">
          Unassigned
        </span>
      );
    }

    switch (role) {
      case 'VIP Customer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Sparkles className="w-3 h-3 text-amber-700" />
            VIP Customer
          </span>
        );
      case 'Travel Agent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
            <Compass className="w-3 h-3 text-purple-600" />
            Travel Agent
          </span>
        );
      case 'Booking Agent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-300">
            <Briefcase className="w-3 h-3 text-sky-600" />
            Booking Agent
          </span>
        );
      case 'Finance':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <DollarSign className="w-3 h-3 text-emerald-600" />
            Finance
          </span>
        );
      case 'Operations':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Layers className="w-3 h-3 text-indigo-600" />
            Operations
          </span>
        );
      case 'Manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <Award className="w-3 h-3 text-rose-600" />
            Manager
          </span>
        );
      case 'Customer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-800 border border-stone-300">
            <Users className="w-3 h-3 text-stone-500" />
            {role}
          </span>
        );
    }
  };

  // 1. APPROVE USER ACTION
  const handleOpenApproveModal = (user: any) => {
    setSelectedUser(user);
    // Mandatory role assignment: Admin MUST select a role
    setSelectedRoleForApproval('');
    setIsApproveModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedUser) return;
    if (!selectedRoleForApproval) {
      setNotification({
        type: 'error',
        message: 'A role MUST be assigned before approval can be confirmed.',
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.approveCustomerUser(selectedUser.id, selectedRoleForApproval);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Account approved for ${selectedUser.first_name} ${selectedUser.last_name} with role "${selectedRoleForApproval}".`,
        });
        setIsApproveModalOpen(false);
        setSelectedUser(null);
        loadData();
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Failed to approve account.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error occurred while approving account.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 2. REJECT USER ACTION
  const handleOpenRejectModal = (user: any) => {
    setSelectedUser(user);
    setRejectionReason('Registration does not meet pilgrim verification requirements.');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.rejectCustomerUser(selectedUser.id, rejectionReason.trim());
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Account application rejected for ${selectedUser.first_name} ${selectedUser.last_name}.`,
        });
        setIsRejectModalOpen(false);
        setSelectedUser(null);
        loadData();
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Failed to reject account.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error occurred while rejecting account.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 3. CHANGE ROLE ACTION
  const handleOpenRoleModal = (user: any) => {
    setSelectedUser(user);
    setSelectedNewRole(user.assigned_role || 'Customer');
    setIsRoleModalOpen(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser || !selectedNewRole) return;
    setActionLoading(true);
    try {
      const res = await api.updateCustomerUserRole(selectedUser.id, selectedNewRole);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `Assigned role updated to "${selectedNewRole}" for ${selectedUser.first_name} ${selectedUser.last_name}.`,
        });
        setIsRoleModalOpen(false);
        setSelectedUser(null);
        loadData();
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Failed to update role.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error occurred while updating role.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 4. SUSPEND USER ACTION
  const handleOpenSuspendModal = (user: any) => {
    setSelectedUser(user);
    setIsSuspendModalOpen(true);
  };

  const handleConfirmSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.suspendCustomerUser(selectedUser.id);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `User account #${selectedUser.id} (${selectedUser.first_name} ${selectedUser.last_name}) has been suspended.`,
        });
        setIsSuspendModalOpen(false);
        setSelectedUser(null);
        loadData();
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Failed to suspend user.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error occurred while suspending account.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 5. REACTIVATE USER ACTION
  const handleOpenReactivateModal = (user: any) => {
    setSelectedUser(user);
    setIsReactivateModalOpen(true);
  };

  const handleConfirmReactivate = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await api.reactivateCustomerUser(selectedUser.id);
      if (res.success) {
        setNotification({
          type: 'success',
          message: `User account #${selectedUser.id} (${selectedUser.first_name} ${selectedUser.last_name}) has been reactivated.`,
        });
        setIsReactivateModalOpen(false);
        setSelectedUser(null);
        loadData();
      } else {
        setNotification({
          type: 'error',
          message: res.message || 'Failed to reactivate user.',
        });
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Error occurred while reactivating account.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 6. VIEW AUDIT TRAIL
  const handleViewAudit = async (user: any) => {
    setSelectedUser(user);
    setIsAuditModalOpen(true);
    setLoadingAudit(true);
    try {
      const res = await api.getCustomerUserAudit(user.id);
      if (res.success) {
        setUserAuditLogs(res.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          id="user-mgmt-toast"
          className={`p-4 rounded-xl flex items-center gap-3 text-sm shadow-lg border transition-all animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium flex-1">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-stone-400 hover:text-stone-700 text-xs px-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Section Header & KPI Counters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-serif flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-amber-600" />
            <span>User Management & Approvals</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl">
            Administer customer registrations, verify pilgrim identity, enforce mandatory role assignment upon approval, and monitor compliance audit trails.
          </p>
        </div>

        <button
          id="btn-refresh-user-mgmt"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 font-serif">{counts.total}</div>
          <span className="text-[11px] text-stone-400">Registered pilgrims & accounts</span>
        </div>

        {/* Pending Approvals */}
        <div className={`p-4 rounded-2xl border shadow-2xs transition-all ${
          counts.pending > 0
            ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20'
            : 'bg-white border-stone-200'
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Pending Approval
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold text-amber-950 font-serif">{counts.pending}</div>
          <span className="text-[11px] text-amber-700 font-medium">Awaiting admin review & role</span>
        </div>

        {/* Active Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Accounts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-serif">{counts.active}</div>
          <span className="text-[11px] text-stone-400">Approved with assigned role</span>
        </div>

        {/* Suspended Accounts */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Suspended</span>
            <Ban className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-orange-700 font-serif">{counts.suspended}</div>
          <span className="text-[11px] text-stone-400">Temporarily locked access</span>
        </div>

        {/* Rejected Registrations */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 font-serif">{counts.rejected}</div>
          <span className="text-[11px] text-stone-400">Applications declined</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tab Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              id="filter-status-all"
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              All Users ({counts.total})
            </button>
            <button
              id="filter-status-pending"
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-600" />
              <span>Pending ({counts.pending})</span>
            </button>
            <button
              id="filter-status-active"
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Active / Approved ({counts.active})
            </button>
            <button
              id="filter-status-suspended"
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'suspended'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Suspended ({counts.suspended})
            </button>
            <button
              id="filter-status-rejected"
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="input-user-mgmt-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-stone-400 hover:text-stone-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto border border-stone-200 rounded-xl">
          <table id="table-customer-users" className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="px-4 py-3">User & Pilgrim Reference</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Registration Date</th>
                <th className="px-4 py-3">Account Status</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Approval / Review History</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                      <span>Loading user accounts from database...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-stone-500">
                    <div className="space-y-1">
                      <p className="font-semibold text-stone-700">No user accounts found</p>
                      <p className="text-xs text-stone-400">
                        {statusFilter !== 'all'
                          ? `No users match the "${statusFilter}" status filter.`
                          : 'No user accounts match your search query.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isPending = user.status === 'pending';
                  const isActive = user.status === 'active' || user.status === 'approved';
                  const isSuspended = user.status === 'suspended';
                  const isRejected = user.status === 'rejected';

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isPending ? 'bg-amber-50/25' : ''
                      }`}
                    >
                      {/* 1. User Name & Ref */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : isActive
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isSuspended
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {user.first_name?.[0] || 'P'}
                            {user.last_name?.[0] || 'U'}
                          </div>
                          <div>
                            <span className="font-semibold text-stone-900 block text-sm leading-tight">
                              {user.first_name} {user.last_name}
                            </span>
                            <span className="font-mono text-[11px] text-stone-500 tracking-wider">
                              {user.customer_code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Contact */}
                      <td className="px-4 py-3.5 space-y-0.5">
                        <div className="flex items-center gap-1.5 text-stone-800 font-medium">
                          <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <a href={`mailto:${user.email}`} className="hover:text-amber-600 transition-colors truncate max-w-xs">
                            {user.email}
                          </a>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                            <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <a href={`tel:${user.phone}`} className="hover:text-amber-600 transition-colors">
                              {user.phone}
                            </a>
                          </div>
                        )}
                      </td>

                      {/* 3. Registration Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-stone-400" />
                          <span>{formatDate(user.created_at)}</span>
                        </div>
                      </td>

                      {/* 4. Account Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>

                      {/* 5. Assigned Role */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getRoleBadge(user.assigned_role)}
                      </td>

                      {/* 6. Approval / Review Info */}
                      <td className="px-4 py-3.5 text-stone-600 text-[11px]">
                        {isActive && (
                          <div className="space-y-0.5">
                            <span className="text-emerald-700 font-medium block">
                              Approved on {formatDate(user.approved_at)}
                            </span>
                            <span className="text-stone-500 block truncate max-w-[200px]" title={user.approved_by_name || 'Administrator'}>
                              By: {user.approved_by_name || 'Administrator'}
                            </span>
                          </div>
                        )}

                        {isPending && (
                          <div className="space-y-0.5">
                            <span className="text-amber-700 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Awaiting Approval
                            </span>
                            <span className="text-stone-400 block text-[10px]">
                              Role must be assigned to activate
                            </span>
                          </div>
                        )}

                        {isRejected && (
                          <div className="space-y-0.5">
                            <span className="text-rose-700 font-medium block">
                              Rejected on {formatDate(user.rejected_at)}
                            </span>
                            {user.rejection_reason && (
                              <span className="text-stone-500 block truncate max-w-[200px]" title={user.rejection_reason}>
                                Reason: {user.rejection_reason}
                              </span>
                            )}
                          </div>
                        )}

                        {isSuspended && (
                          <div className="space-y-0.5">
                            <span className="text-orange-700 font-medium block">
                              Suspended on {formatDate(user.suspended_at)}
                            </span>
                            <span className="text-stone-400 block">
                              Access revoked until reactivated
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 7. Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* PENDING ACTIONS */}
                          {isPending && (
                            <>
                              <button
                                id={`btn-approve-user-${user.id}`}
                                onClick={() => handleOpenApproveModal(user)}
                                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Approve user and assign role"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                id={`btn-reject-user-${user.id}`}
                                onClick={() => handleOpenRejectModal(user)}
                                className="px-2 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Reject registration application"
                              >
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* ACTIVE ACTIONS */}
                          {isActive && (
                            <>
                              <button
                                id={`btn-change-role-user-${user.id}`}
                                onClick={() => handleOpenRoleModal(user)}
                                className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Change user role"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-stone-600" />
                                <span>Change Role</span>
                              </button>

                              <button
                                id={`btn-suspend-user-${user.id}`}
                                onClick={() => handleOpenSuspendModal(user)}
                                className="px-2 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Suspend user account"
                              >
                                <Ban className="w-3.5 h-3.5 text-orange-600" />
                                <span>Suspend</span>
                              </button>
                            </>
                          )}

                          {/* SUSPENDED ACTIONS */}
                          {isSuspended && (
                            <>
                              <button
                                id={`btn-reactivate-user-${user.id}`}
                                onClick={() => handleOpenReactivateModal(user)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                                title="Reactivate user account"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reactivate</span>
                              </button>

                              <button
                                id={`btn-change-role-user-${user.id}`}
                                onClick={() => handleOpenRoleModal(user)}
                                className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Role</span>
                              </button>
                            </>
                          )}

                          {/* REJECTED ACTIONS */}
                          {isRejected && (
                            <button
                              id={`btn-reapprove-user-${user.id}`}
                              onClick={() => handleOpenApproveModal(user)}
                              className="px-2.5 py-1.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-900 text-stone-700 border border-stone-300 font-medium rounded-lg text-xs transition-colors flex items-center gap-1 cursor-pointer"
                              title="Re-evaluate and approve application"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Re-evaluate</span>
                            </button>
                          )}

                          {/* AUDIT LOG BUTTON */}
                          <button
                            id={`btn-audit-user-${user.id}`}
                            onClick={() => handleViewAudit(user)}
                            className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                            title="View audit trail"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= 1. APPROVE USER MODAL (MANDATORY ROLE ASSIGNMENT) ================= */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          if (!actionLoading) {
            setIsApproveModalOpen(false);
            setSelectedUser(null);
          }
        }}
        title="Approve User Account & Assign Role"
        subtitle="Mandatory step: Select the authorized role before confirming approval."
        maxWidth="2xl"
      >
        {selectedUser && (
          <div className="space-y-5">
            {/* User Profile Summary */}
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center font-bold text-sm">
                  {selectedUser.first_name?.[0]}
                  {selectedUser.last_name?.[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-stone-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h4>
                  <p className="text-stone-500 font-mono text-[11px]">{selectedUser.email}</p>
                </div>
              </div>
              <div className="text-right sm:text-right">
                <span className="text-[11px] text-stone-400 block">Registration Code</span>
                <span className="font-mono font-bold text-amber-700 text-xs">
                  {selectedUser.customer_code}
                </span>
              </div>
            </div>

            {/* Mandatory Instruction Callout */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Mandatory Role Assignment</strong>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  A newly registered user remains pending until an authorized administrator assigns their role. The selected role dictates all permissions and accessible views within their dashboard.
                </p>
              </div>
            </div>

            {/* Role Selection List */}
            <div>
              <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-2.5">
                Select Exactly One Role for this User *
              </label>

              <div className="grid gap-2 sm:grid-cols-1 max-h-72 overflow-y-auto pr-1">
                {assignableRoles.map((role) => {
                  const isSelected = selectedRoleForApproval === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleForApproval(role.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30 text-stone-950'
                          : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-stone-900">{role.name}</span>
                          {getRoleBadge(role.name)}
                        </div>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          {role.description}
                        </p>
                      </div>

                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-amber-600 bg-amber-600 text-white'
                          : 'border-stone-300 bg-white'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-approve-modal"
                onClick={handleConfirmApproval}
                disabled={actionLoading || !selectedRoleForApproval}
                className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming Approval...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Approval & Assign Role</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= 2. REJECT USER MODAL ================= */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (!actionLoading) {
            setIsRejectModalOpen(false);
            setSelectedUser(null);
          }
        }}
        title="Reject User Application"
        subtitle="Decline this registration application. The record will remain on file for audit reference."
        maxWidth="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900">
              You are declining the registration of <strong>{selectedUser.first_name} {selectedUser.last_name}</strong> ({selectedUser.email}). They will not be granted access to the Customer Portal.
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
                Rejection Reason (Internal & Record Reference)
              </label>
              <textarea
                id="textarea-reject-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                placeholder="Specify reason for audit logs..."
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-reject-modal"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? (
                  <span>Declining...</span>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Rejection</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= 3. CHANGE ROLE MODAL ================= */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => {
          if (!actionLoading) {
            setIsRoleModalOpen(false);
            setSelectedUser(null);
          }
        }}
        title="Update User Assigned Role"
        subtitle="Modify user permissions. The change takes effect on their next authenticated session."
        maxWidth="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-stone-900 block">
                  {selectedUser.first_name} {selectedUser.last_name}
                </span>
                <span className="text-stone-500">{selectedUser.email}</span>
              </div>
              <div>
                <span className="text-[11px] text-stone-400 block text-right">Current Role</span>
                {getRoleBadge(selectedUser.assigned_role)}
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {assignableRoles.map((role) => {
                const isSelected = selectedNewRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedNewRole(role.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 text-stone-950 font-semibold'
                        : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">{role.name}</span>
                        {getRoleBadge(role.name)}
                      </div>
                      <p className="text-xs text-stone-500 font-normal mt-0.5">{role.description}</p>
                    </div>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-amber-600 bg-amber-600' : 'border-stone-300'
                    }`}>
                      {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-change-role-modal"
                onClick={handleConfirmRoleChange}
                disabled={actionLoading || !selectedNewRole}
                className="px-4 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Save New Role'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= 4. SUSPEND USER MODAL ================= */}
      <Modal
        isOpen={isSuspendModalOpen}
        onClose={() => {
          if (!actionLoading) {
            setIsSuspendModalOpen(false);
            setSelectedUser(null);
          }
        }}
        title="Suspend User Account"
        subtitle="Revoke portal access immediately."
        maxWidth="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 text-xs text-orange-950 space-y-1">
              <p className="font-semibold">
                Are you sure you want to suspend {selectedUser.first_name} {selectedUser.last_name}?
              </p>
              <p className="text-[11px] text-orange-800">
                Their active session will be blocked immediately. Any future login attempts will receive a suspended notice until an administrator reactivates the account.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsSuspendModalOpen(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-suspend-modal"
                onClick={handleConfirmSuspend}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= 5. REACTIVATE USER MODAL ================= */}
      <Modal
        isOpen={isReactivateModalOpen}
        onClose={() => {
          if (!actionLoading) {
            setIsReactivateModalOpen(false);
            setSelectedUser(null);
          }
        }}
        title="Reactivate User Account"
        subtitle="Restore portal access for this account."
        maxWidth="md"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1">
              <p className="font-semibold">
                Reactivate {selectedUser.first_name} {selectedUser.last_name}'s account?
              </p>
              <p className="text-[11px] text-emerald-800">
                This account status will return to "active", restoring full dashboard privileges under their assigned role "{selectedUser.assigned_role || 'Customer'}".
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setIsReactivateModalOpen(false);
                  setSelectedUser(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-confirm-reactivate-modal"
                onClick={handleConfirmReactivate}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading ? 'Reactivating...' : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ================= 6. AUDIT TRAIL MODAL ================= */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setSelectedUser(null);
          setUserAuditLogs([]);
        }}
        title="User Audit & Activity Trail"
        subtitle={selectedUser ? `Chronological history for ${selectedUser.first_name} ${selectedUser.last_name} (${selectedUser.customer_code})` : ''}
        maxWidth="2xl"
      >
        {loadingAudit ? (
          <div className="p-8 text-center text-stone-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-600 mb-2" />
            <span>Loading audit history...</span>
          </div>
        ) : userAuditLogs.length === 0 ? (
          <div className="p-8 text-center text-stone-500 text-xs space-y-1">
            <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-stone-700">No specific audit entries logged yet</p>
            <p className="text-stone-400">Account creation record is preserved in the main database.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {userAuditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span className="font-mono text-stone-600 font-semibold uppercase tracking-wider">
                    {log.action?.replace('_', ' ')}
                  </span>
                  <span>{formatDate(log.created_at)}</span>
                </div>
                <p className="text-stone-900 font-medium leading-relaxed">{log.details || log.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1 border-t border-stone-200/60">
                  <span>
                    Admin:{' '}
                    <strong className="text-stone-700">
                      {log.admin_first_name
                        ? `${log.admin_first_name} ${log.admin_last_name || ''} (@${log.admin_username})`
                        : 'System / Staff'}
                    </strong>
                  </span>
                  {log.ip_address && (
                    <span>
                      IP: <strong className="font-mono text-stone-700">{log.ip_address}</strong>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
