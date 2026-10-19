import { StaffRole } from './types';

export interface RoleInfo {
  role: StaffRole;
  label: string;
  badge: string;
  badgeClass: string;
  description: string;
  allowedRoutes: string[];
  homeRoute: string;
  canManagePaymentAccounts: boolean;
  canManageUsers: boolean;
  canViewFullAnalytics: boolean;
  canAccessAllStations: boolean;
}

export const ROLE_CONFIG: Record<string, RoleInfo> = {
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin',
    badge: 'Super Admin · Master Control',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    description: 'Master administrative access. Full control over Menu, Payment Accounts, Table QR Codes, Analytics, Staff Roles, and all station terminals.',
    allowedRoutes: [
      '/admin/menu',
      '/admin/payment-accounts',
      '/admin/tables',
      '/admin/analytics',
      '/staff/kitchen',
      '/staff/bar',
      '/staff/floor',
      '/staff/payments',
    ],
    homeRoute: '/admin/menu',
    canManagePaymentAccounts: true,
    canManageUsers: true,
    canViewFullAnalytics: true,
    canAccessAllStations: true,
  },
  owner: {
    role: 'owner',
    label: 'Super Admin (Owner)',
    badge: 'Super Admin · Master Control',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-500/50',
    description: 'Restaurant owner with full master permissions across all management and operational consoles.',
    allowedRoutes: [
      '/admin/menu',
      '/admin/payment-accounts',
      '/admin/tables',
      '/admin/analytics',
      '/staff/kitchen',
      '/staff/bar',
      '/staff/floor',
      '/staff/payments',
    ],
    homeRoute: '/admin/menu',
    canManagePaymentAccounts: true,
    canManageUsers: true,
    canViewFullAnalytics: true,
    canAccessAllStations: true,
  },
  admin: {
    role: 'admin',
    label: 'Admin (Limited)',
    badge: 'Admin · Limited Access',
    badgeClass: 'bg-blue-950/80 text-blue-300 border-blue-600/50',
    description: 'Operational manager. Can manage Menu items and Table QR codes, and view stations. Financial Payment Accounts and Master Analytics are restricted to Super Admin.',
    allowedRoutes: [
      '/admin/menu',
      '/admin/tables',
      '/staff/kitchen',
      '/staff/bar',
      '/staff/floor',
    ],
    homeRoute: '/admin/menu',
    canManagePaymentAccounts: false,
    canManageUsers: false,
    canViewFullAnalytics: false,
    canAccessAllStations: false,
  },
  kitchen: {
    role: 'kitchen',
    label: 'Kitchen Staff',
    badge: 'Kitchen Station · Restricted',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50',
    description: 'Hot kitchen terminal for food prep and line cooks. Station-isolated: strictly restricted from Admin, Bar, and Billing.',
    allowedRoutes: ['/staff/kitchen'],
    homeRoute: '/staff/kitchen',
    canManagePaymentAccounts: false,
    canManageUsers: false,
    canViewFullAnalytics: false,
    canAccessAllStations: false,
  },
  bar: {
    role: 'bar',
    label: 'Bar / Barista',
    badge: 'Bar Station · Restricted',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-600/50',
    description: 'Beverage and coffee dispensary terminal. Station-isolated: strictly restricted from Admin, Kitchen, and Billing.',
    allowedRoutes: ['/staff/bar'],
    homeRoute: '/staff/bar',
    canManagePaymentAccounts: false,
    canManageUsers: false,
    canViewFullAnalytics: false,
    canAccessAllStations: false,
  },
  bartender: {
    role: 'bartender',
    label: 'Bar / Barista',
    badge: 'Bar Station · Restricted',
    badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-600/50',
    description: 'Beverage and coffee dispensary terminal. Station-isolated: strictly restricted from Admin, Kitchen, and Billing.',
    allowedRoutes: ['/staff/bar'],
    homeRoute: '/staff/bar',
    canManagePaymentAccounts: false,
    canManageUsers: false,
    canViewFullAnalytics: false,
    canAccessAllStations: false,
  },
  waiter: {
    role: 'waiter',
    label: 'Floor Waiter',
    badge: 'Floor Waiter · Restricted',
    badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50',
    description: 'Dining floor terminal for waiter calls and order delivery. Station-isolated from Admin and Kitchen terminals.',
    allowedRoutes: ['/staff/floor'],
    homeRoute: '/staff/floor',
    canManagePaymentAccounts: false,
    canManageUsers: false,
    canViewFullAnalytics: false,
    canAccessAllStations: false,
  },
  cashier: {
    role: 'cashier',
    label: 'Cashier & Billing',
    badge: 'Cashier Terminal · Restricted',
    badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
    description: 'Payment verification and walk-in POS billing terminal. Station-isolated from Admin settings and Kitchen terminals.',
    allowedRoutes: ['/staff/payments'],
    homeRoute: '/staff/payments',
    canManagePaymentAccounts: false,
    canManageUsers: false,
    canViewFullAnalytics: false,
    canAccessAllStations: false,
  },
};

export function getRoleInfo(role: string | null | undefined): RoleInfo {
  if (!role) {
    return {
      role: 'waiter',
      label: 'Guest / Unassigned',
      badge: 'Unauthenticated',
      badgeClass: 'bg-stone-900 text-stone-400 border-stone-700',
      description: 'No active role session found.',
      allowedRoutes: [],
      homeRoute: '/admin/login',
      canManagePaymentAccounts: false,
      canManageUsers: false,
      canViewFullAnalytics: false,
      canAccessAllStations: false,
    };
  }
  const normalized = role.toLowerCase().replace(/[\s-]/g, '_');
  if (ROLE_CONFIG[normalized]) {
    return ROLE_CONFIG[normalized];
  }
  if (normalized.includes('super') || normalized.includes('owner')) {
    return ROLE_CONFIG['super_admin'];
  }
  if (normalized.includes('kitchen') || normalized.includes('chef')) {
    return ROLE_CONFIG['kitchen'];
  }
  if (normalized.includes('bar')) {
    return ROLE_CONFIG['bar'];
  }
  if (normalized.includes('cashier')) {
    return ROLE_CONFIG['cashier'];
  }
  if (normalized.includes('waiter') || normalized.includes('floor')) {
    return ROLE_CONFIG['waiter'];
  }
  return ROLE_CONFIG['admin'];
}

export function canAccessRoute(role: string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  const info = getRoleInfo(role);
  if (info.role === 'super_admin' || info.role === 'owner') return true;

  // Direct match or subpath match in allowedRoutes
  return info.allowedRoutes.some((route) => pathname.startsWith(route));
}
