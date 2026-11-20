import { ADMIN_HOME } from '@/app/router/workspacePaths';
import { Brand, Icon, type IconName } from '@/components/ui';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useWorkspaceControls } from './useWorkspaceControls';

const adminNavigation: { label: string; links: { to: string; label: string; icon: IconName }[] }[] = [
  {
    label: 'Quản trị bán hàng',
    links: [
      { to: ADMIN_HOME, label: 'Tổng quan', icon: 'grid' },
      { to: '/admin/products', label: 'Sản phẩm', icon: 'laptop' },
      { to: '/admin/categories', label: 'Danh mục', icon: 'tag' },
      { to: '/admin/promotions', label: 'Khuyến mãi', icon: 'wallet' },
      { to: '/admin/users', label: 'Người dùng', icon: 'shield' },
    ],
  },
  {
    label: 'Kiểm soát vận hành',
    links: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: 'orders' },
      { to: '/admin/inventory', label: 'Kho hàng', icon: 'box' },
      { to: '/admin/procurement', label: 'Phiếu nhập', icon: 'truck' },
      { to: '/admin/suppliers', label: 'Nhà cung cấp', icon: 'users' },
      { to: '/admin/reviews', label: 'Đánh giá', icon: 'star' },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const { accountName, initials, scrolled, sidebarOpen, setSidebarOpen, signOut } = useWorkspaceControls();

  return (
    <div className="ops admin-workspace">
      <aside id="admin-sidebar" className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Điều hướng quản trị">
        <div className="workspace-sidebar-top">
          <Brand to={ADMIN_HOME} />
          <button type="button" className="icon-btn mobile-only" aria-label="Đóng menu" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        {adminNavigation.map(({ label, links }) => (
          <nav key={label} aria-label={label}>
            <p className="nav-label">{label}</p>
            {links.map(({ to, label: linkLabel, icon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
                <Icon name={icon} /><span>{linkLabel}</span>
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="sidebar-bottom">
          <Link to="/"><Icon name="arrow-left" /> Về cửa hàng</Link>
          <button type="button" onClick={() => void signOut()}><Icon name="logout" /> Đăng xuất</button>
        </div>
      </aside>
      <div className="mobile-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />

      <div className="ops-shell">
        <header className="ops-header" data-scrolled={scrolled}>
          <button type="button" className="icon-btn mobile-only" aria-label="Mở menu" aria-controls="admin-sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="workspace-header-title"><Icon name="shield" /> Quản trị hệ thống</span>
          <div className="push">
            <ThemeToggle />
            <div className="avatar workspace-avatar" aria-hidden="true">{initials}</div>
            <div className="user-name">{accountName}<small>Quản trị viên</small></div>
          </div>
        </header>
        <main id="main" className="ops-main"><Outlet /></main>
      </div>
    </div>
  );
};
