import React from 'react';
import {
  LayoutDashboard,
  Package as PackageIcon,
  Building2,
  Users,
  Ticket,
  Receipt,
  Plane,
  Globe,
  Settings,
  Database,
  ChevronRight,
  ShieldCheck,
  LogOut,
  MoonStar,
  ExternalLink,
} from 'lucide-react';
import { AdminUser, DatabaseStatus } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'packages'
  | 'hotels'
  | 'crm'
  | 'bookings'
  | 'finance'
  | 'travel'
  | 'cms'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: AdminUser;
  onLogout: () => void;
  dbStatus: DatabaseStatus | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  user,
  onLogout,
  dbStatus,
  collapsed,
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'packages' as NavTab,
      label: 'Hajj & Umrah Packages',
      icon: PackageIcon,
      badge: '3 Active',
    },
    {
      id: 'hotels' as NavTab,
      label: 'Hotels & Haram Proximity',
      icon: Building2,
      badge: null,
    },
    {
      id: 'crm' as NavTab,
      label: 'CRM & Pilgrim Leads',
      icon: Users,
      badge: 'Leads',
    },
    {
      id: 'bookings' as NavTab,
      label: 'Bookings & Travelers',
      icon: Ticket,
      badge: null,
    },
    {
      id: 'finance' as NavTab,
      label: 'Finance & Invoicing',
      icon: Receipt,
      badge: null,
    },
    {
      id: 'travel' as NavTab,
      label: 'Visas, Flights & Fleet',
      icon: Plane,
      badge: 'MOFA',
    },
    {
      id: 'cms' as NavTab,
      label: 'Website CMS & Media',
      icon: Globe,
      badge: null,
    },
    {
      id: 'settings' as NavTab,
      label: 'System & Hostinger DB',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className={`bg-stone-900 text-stone-200 border-r border-stone-800 flex flex-col transition-all duration-300 select-none z-30 shrink-0 ${
        collapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-stone-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-amber-900/20 shrink-0">
            <MoonStar className="w-5 h-5 text-stone-950 stroke-[2.2]" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="font-semibold text-stone-100 text-base leading-tight tracking-tight truncate">
                Hajji Original
              </h1>
              <p className="text-xs text-amber-400 font-medium tracking-wide flex items-center gap-1 mt-0.5">
                <span>Hajj & Umrah Admin</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="px-3 text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Operations Menu
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group relative ${
                isActive
                  ? 'bg-amber-500 text-stone-950 shadow-md font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/70'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                  isActive ? 'text-stone-950 stroke-[2.2]' : 'text-stone-400 group-hover:text-amber-400'
                }`}
              />
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-stone-950/20 text-stone-950'
                      : 'bg-stone-800 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Database & Engine Status Indicator */}
      <div className="p-3 border-t border-stone-800/80 bg-stone-950/40">
        {!collapsed ? (
          <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span>DB Engine</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                ● Live
              </span>
            </div>
            <p className="text-[11px] text-stone-300 font-mono truncate">
              {dbStatus?.database || 'hajji_original_tours'}
            </p>
            <p className="text-[10px] text-stone-400">
              Hostinger MySQL + Embedded Fallback
            </p>
          </div>
        ) : (
          <div className="flex justify-center" title="Relational SQL Database Active">
            <Database className="w-5 h-5 text-emerald-400" />
          </div>
        )}
      </div>

      {/* Admin User Footer Profile */}
      <div className="p-3 border-t border-stone-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
            {user.first_name?.[0] || 'A'}
            {user.last_name?.[0] || 'K'}
          </div>
          {!collapsed && (
            <div className="truncate">
              <p className="text-xs font-medium text-stone-200 truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] text-stone-400 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                {user.role_name}
              </p>
            </div>
          )}
        </div>
        <button
          id="btn-sidebar-logout"
          onClick={onLogout}
          title="Sign Out"
          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
