import { STAFF_HOME } from '@/app/router/workspacePaths';
import { Brand, Icon, type IconName } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useWorkspaceControls } from './useWorkspaceControls';

const staffNavigation: { to: string; label: string; icon: IconName }[] = [
  { to: STAFF_HOME, label: 'Ca làm việc', icon: 'grid' },
  { to: '/staff/orders', label: 'Xử lý đơn hàng', icon: 'orders' },
  { to: '/staff/inventory', label: 'Kho hàng', icon: 'box' },
  { to: '/staff/procurement', label: 'Nhận hàng', icon: 'truck' },
  { to: '/staff/suppliers', label: 'Nhà cung cấp', icon: 'users' },
  { to: '/staff/reviews', label: 'Duyệt đánh giá', icon: 'star' },
];

export const StaffLayout: React.FC = () => {
  const { accountName, initials, scrolled, sidebarOpen, setSidebarOpen, signOut } = useWorkspaceControls();

  return (
    <div className="ops staff-workspace">
      <aside id="staff-sidebar" className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Điều hướng nhân viên">
        <div className="workspace-sidebar-top">
          <Brand to={STAFF_HOME} />
          <button type="button" className="icon-btn mobile-only" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav aria-label="Công việc trong ca">
          <p className="nav-label">Công việc trong ca</p>
          {staffNavigation.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon name={icon} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link to="/"><Icon name="arrow-left" /> Về cửa hàng</Link>
          <button type="button" onClick={() => void signOut()}><Icon name="logout" /> Đăng xuất</button>
        </div>
      </aside>
      <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      <div className="ops-shell">
        <header className="ops-header" data-scrolled={scrolled}>
          <button type="button" className="icon-btn mobile-only" aria-label="Mở menu" aria-controls="staff-sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="workspace-header-title"><Icon name="orders" /> Vận hành cửa hàng</span>
          <div className="push">
            <ThemeToggle />
            <Link to="/staff/orders" className="icon-btn" aria-label="Đơn hàng cần xử lý"><Icon name="bell" /></Link>
            <div className="avatar workspace-avatar" aria-hidden="true">{initials}</div>
            <div className="user-name">{accountName}<small>Nhân viên</small></div>
          </div>
        </header>
        <main id="main" className="ops-main"><Outlet /></main>
      </div>
    </div>
  );
};
