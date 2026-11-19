import { ROLES } from '@/constants/roles';
import type { Location } from 'react-router-dom';

export const ADMIN_HOME = '/admin/dashboard';
export const STAFF_HOME = '/staff/dashboard';

export type ReturnLocation = Partial<Pick<Location, 'pathname' | 'search' | 'hash'>>;

export function toAdminWorkspacePath(pathname: string): string {
  const path = pathname.replace(/^\/(admin|staff)(?=\/|$)/i, '/admin');
  return /^\/admin\/?$/.test(path) ? ADMIN_HOME : path;
}

export function getLoginDestination(roles: readonly string[], from?: ReturnLocation): string {
  const pathname = from?.pathname ?? '';
  const suffix = `${from?.search ?? ''}${from?.hash ?? ''}`;
  const isStaffPath = /^\/staff(?:\/|$)/i.test(pathname);
  const isAdminPath = /^\/admin(?:\/|$)/i.test(pathname);

  if (roles.includes(ROLES.ADMIN)) {
    return isAdminPath || isStaffPath ? `${toAdminWorkspacePath(pathname)}${suffix}` : ADMIN_HOME;
  }

  if (roles.includes(ROLES.STAFF)) {
    if (isStaffPath) return `${/^\/staff\/?$/i.test(pathname) ? STAFF_HOME : pathname}${suffix}`;
    return isAdminPath ? '/403' : STAFF_HOME;
  }

  const isReturnPath = pathname.startsWith('/') && !pathname.startsWith('//') && !/^\/(login|register)\/?$/i.test(pathname);
  return isReturnPath ? `${pathname}${suffix}` : '/';
}
