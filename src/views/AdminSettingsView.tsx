import React, { useState, useEffect } from 'react';
import {
  Settings,
  Database,
  Users,
  ShieldCheck,
  Key,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Plus,
  Server,
  FileCode,
  Building2,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { AdminUser, DatabaseStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

interface AdminSettingsViewProps {
  currentUser: AdminUser;
  dbStatus: DatabaseStatus | null;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  currentUser,
  dbStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'database' | 'admins' | 'rbac' | 'settings' | 'audit'>('database');
  const [admins, setAdmins] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any[]>([]);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<number>(1);
  const [activePermissionIds, setActivePermissionIds] = useState<number[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({
    company_name: 'Hajji Original Tours Ltd',
    hajj_license_no: 'KSA-HAJJ-LIC-1447-9021',
    default_currency: 'USD',
    primary_email: 'info@hajjioriginal.com',
    primary_phone: '+44 20 7946 0991',
    emergency_saudi_phone: '+966 50 882 1199',
    vat_number: 'GB992014521',
    address: '142 Whitechapel Road, London E1 1JE, United Kingdom',
    makkah_office_address: 'Clock Royal Tower, Abraj Al Bait, Level 3, Makkah',
    madinah_office_address: 'Northern Central Area, Badaa, Madinah',
  });
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    username: '',
    email: '',
    password: 'password123',
    first_name: '',
    last_name: '',
    role_id: 2,
    phone: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usrRes, rbacRes, setRes, logRes] = await Promise.all([
        api.getAdminUsers(),
        api.getRolesAndPermissions(),
        api.getSettings(),
        api.getAuditLogs({ limit: 50 }),
      ]);
      if (usrRes.success) setAdmins(usrRes.data);
      if (rbacRes.success) {
        setRoles(rbacRes.roles);
        setPermissions(rbacRes.permissions);
        setRolePermissions(rbacRes.rolePermissions);
      }
      if (setRes.success && setRes.site) {
        setSiteSettings(setRes.site);
      }
      if (logRes.success) setAuditLogs(logRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update active permission IDs when selected role changes
  useEffect(() => {
    if (rolePermissions && rolePermissions.length > 0) {
      const permsForRole = rolePermissions
        .filter((rp: any) => rp.role_id === selectedRoleForMatrix)
        .map((rp: any) => rp.permission_id);
      setActivePermissionIds(permsForRole);
    }
  }, [selectedRoleForMatrix, rolePermissions]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createAdminUser(adminForm);
      if (res.success) {
        setIsAdminModalOpen(false);
        alert('Staff admin account created successfully!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleTogglePermission = (permId: number) => {
    if (activePermissionIds.includes(permId)) {
      setActivePermissionIds(activePermissionIds.filter((id) => id !== permId));
    } else {
      setActivePermissionIds([...activePermissionIds, permId]);
    }
  };

  const handleSavePermissionMatrix = async () => {
    try {
      const res = await api.updateRolePermissions(selectedRoleForMatrix, activePermissionIds);
      if (res.success) {
        alert('Role permissions matrix saved successfully!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save permissions');
    }
  };

  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateSiteSettings(siteSettings);
      if (res.success) {
        alert('Agency credentials & site settings saved successfully!');
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleDownloadSQL = () => {
    window.location.href = '/api/admin/download-sql';
  };

  return (
    <div id="admin-settings-view" className="space-y-6 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            System Administration & Hostinger Database
          </h2>
          <p className="text-xs text-stone-500">
            Hostinger MySQL parameters, RBAC permissions matrix, staff user access & compliance credentials
          </p>
        </div>

        <button
          onClick={handleDownloadSQL}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors flex items-center gap-2"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Export Hostinger .sql</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab('database')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'database'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Hostinger Database Setup</span>
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'admins'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Staff Accounts ({admins.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('rbac')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'rbac'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Role Permissions Matrix</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'settings'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Agency & Ministry License</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-stone-950 font-bold'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Audit Logs ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab 1: Database Setup & Hostinger Diagnostics */}
      {activeTab === 'database' && (
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 text-stone-100 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Relational Engine Active</span>
                </div>
                <h3 className="text-xl font-bold text-white">
                  {dbStatus?.engine || 'Relational SQL Database Engine'}
                </h3>
                <p className="text-xs text-stone-400 mt-1 max-w-xl">
                  {dbStatus?.message ||
                    'Database is connected and healthy with complete Hajji Original Tours table schema.'}
                </p>
              </div>

              <button
                onClick={handleDownloadSQL}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Schema (.sql)</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-stone-800/80 text-xs">
              <div>
                <span className="text-stone-500">Database Name:</span>
                <p className="font-mono font-bold text-stone-200">{dbStatus?.database}</p>
              </div>
              <div>
                <span className="text-stone-500">Host Target:</span>
                <p className="font-mono font-bold text-stone-200">{dbStatus?.host || 'localhost'}</p>
              </div>
              <div>
                <span className="text-stone-500">Configured Tables:</span>
                <p className="font-mono font-bold text-amber-400">
                  {dbStatus?.tablesCount || 23} Tables Seeded
                </p>
              </div>
              <div>
                <span className="text-stone-500">Hostinger Support:</span>
                <p className="font-semibold text-emerald-400">100% MySQL 8.0 Compatible</p>
              </div>
            </div>
          </div>

          {/* Hostinger Step-by-Step Deployment Instructions */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-600" />
              <span>Hostinger cPanel Deployment Guide</span>
            </h3>

            <div className="space-y-3 text-xs text-stone-600">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-stone-800">Create MySQL Database in Hostinger hPanel</h4>
                  <p className="mt-0.5">
                    Log in to your Hostinger hPanel → Databases → Management. Create a database named{' '}
                    <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-stone-900">
                      u123456_hajjitours
                    </code>{' '}
                    and a user with all privileges.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-stone-800">Import the Standardized SQL Schema</h4>
                  <p className="mt-0.5">
                    Click <strong>phpMyAdmin</strong> next to your Hostinger database, navigate to the{' '}
                    <strong>Import</strong> tab, and upload the exported{' '}
                    <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-stone-900">
                      hajji_original_tours_database.sql
                    </code>{' '}
                    file. All 23 tables, foreign keys, and superadmin seed data will initialize instantly.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-stone-950 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-stone-800">Set Environment Variables on Hostinger Node.js</h4>
                  <p className="mt-0.5">
                    In Hostinger's Node.js application configuration or your server's{' '}
                    <code className="bg-stone-200 px-1 py-0.5 rounded font-mono text-stone-900">
                      .env
                    </code>{' '}
                    file, provide:
                  </p>
                  <pre className="p-3 bg-stone-900 text-stone-100 rounded-lg mt-2 font-mono text-[11px] overflow-x-auto">
{`DB_HOST=localhost
DB_PORT=3306
DB_NAME=u123456_hajjitours
DB_USER=u123456_hajjitours_user
DB_PASSWORD=YourHostingerPasswordHere
PORT=3000
JWT_SECRET=super_secure_hajji_jwt_key_1447`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Admin Users */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Staff Account</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Staff Name</th>
                    <th className="px-5 py-3">Username & Email</th>
                    <th className="px-5 py-3">Assigned Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {admins.map((adm) => (
                    <tr key={adm.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-stone-900">
                          {adm.first_name} {adm.last_name}
                        </div>
                        <div className="text-[11px] text-stone-500">{adm.phone || 'No phone'}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-stone-800">{adm.username}</div>
                        <div className="text-[11px] text-stone-500">{adm.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={adm.role_slug === 'super_admin' ? 'gold' : 'info'}>
                          {adm.role_name}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={adm.status === 'active' ? 'success' : 'danger'}>
                          {adm.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-stone-500 text-[11px]">
                        {adm.last_login_at || 'Just now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: RBAC Matrix */}
      {activeTab === 'rbac' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Granular Role & Permission Matrix
              </h3>
              <p className="text-xs text-stone-500">
                Control access to bookings, financial records, visa management, and audit logs
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-stone-600">Select Role:</label>
              <select
                value={selectedRoleForMatrix}
                onChange={(e) => setSelectedRoleForMatrix(Number(e.target.value))}
                className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSavePermissionMatrix}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-xs transition-colors"
              >
                Save Matrix Changes
              </button>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map((p) => {
              const isChecked = activePermissionIds.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-amber-50/60 border-amber-300 text-amber-950'
                      : 'bg-stone-50/60 border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleTogglePermission(p.id)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <span className="font-bold text-xs text-stone-900 block">{p.name}</span>
                    <span className="font-mono text-[10px] text-stone-500 block mt-0.5">
                      {p.module}:{p.action}
                    </span>
                    <p className="text-[11px] text-stone-600 mt-1">{p.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 4: Agency Credentials & Ministry License */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
          <form onSubmit={handleSaveSiteSettings} className="space-y-6">
            <h3 className="text-base font-bold text-stone-900">
              Agency Registration & Saudi Ministry Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Company Legal Name</label>
                <input
                  type="text"
                  value={siteSettings.company_name}
                  onChange={(e) => setSiteSettings({ ...siteSettings, company_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Saudi Ministry of Hajj & Umrah License #
                </label>
                <input
                  type="text"
                  value={siteSettings.hajj_license_no}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, hajj_license_no: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Primary Agency Email</label>
                <input
                  type="email"
                  value={siteSettings.primary_email}
                  onChange={(e) => setSiteSettings({ ...siteSettings, primary_email: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Agency Phone</label>
                <input
                  type="text"
                  value={siteSettings.primary_phone}
                  onChange={(e) => setSiteSettings({ ...siteSettings, primary_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Emergency 24/7 Saudi WhatsApp Hotline
                </label>
                <input
                  type="text"
                  value={siteSettings.emergency_saudi_phone}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, emergency_saudi_phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">VAT Registration #</label>
                <input
                  type="text"
                  value={siteSettings.vat_number}
                  onChange={(e) => setSiteSettings({ ...siteSettings, vat_number: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Default Accounting Currency
                </label>
                <select
                  value={siteSettings.default_currency || 'USD'}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, default_currency: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold text-amber-900 bg-amber-50/50"
                >
                  <option value="USD">USD ($) - United States Dollar (Primary System Currency)</option>
                  <option value="SAR">SAR (﷼) - Saudi Riyal (Local KSA Operations)</option>
                  <option value="GBP">GBP (£) - British Pound Sterling</option>
                  <option value="EUR">EUR (€) - Euro</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-stone-700 mb-1">
                  Head Office Registered Address (UK / International)
                </label>
                <input
                  type="text"
                  value={siteSettings.address}
                  onChange={(e) => setSiteSettings({ ...siteSettings, address: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Makkah Operating Office Address
                </label>
                <input
                  type="text"
                  value={siteSettings.makkah_office_address}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, makkah_office_address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Madinah Operating Office Address
                </label>
                <input
                  type="text"
                  value={siteSettings.madinah_office_address}
                  onChange={(e) =>
                    setSiteSettings({ ...siteSettings, madinah_office_address: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-stone-200">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs shadow-md transition-colors"
              >
                Save Agency Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 5: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Admin User</th>
                  <th className="px-5 py-3">Module : Action</th>
                  <th className="px-5 py-3">Audit Description</th>
                  <th className="px-5 py-3">Client IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-5 py-3 text-stone-500 font-mono text-[11px]">
                      {log.created_at}
                    </td>
                    <td className="px-5 py-3 font-bold text-stone-900">
                      {log.admin_name || log.username}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-amber-800 font-semibold">
                      {log.module}:{log.action}
                    </td>
                    <td className="px-5 py-3 text-stone-700 max-w-md">{log.description}</td>
                    <td className="px-5 py-3 font-mono text-stone-400 text-[11px]">
                      {log.ip_address || '::1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Add Admin */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        title="Create Staff Admin Account"
        subtitle="Grant administrative access with customized role assignment"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                required
                value={adminForm.first_name}
                onChange={(e) => setAdminForm({ ...adminForm, first_name: e.target.value })}
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
                value={adminForm.last_name}
                onChange={(e) => setAdminForm({ ...adminForm, last_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={adminForm.username}
                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={adminForm.email}
                onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Assigned Role *
              </label>
              <select
                value={adminForm.role_id}
                onChange={(e) => setAdminForm({ ...adminForm, role_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setIsAdminModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-stone-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
