import { useAuth } from '@/app/providers/AuthProvider';
import { useToast } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useWorkspaceControls() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const accountName = user?.fullName?.trim() || user?.email || 'LaptopStore';
  const nameParts = accountName.split(/\s+/);
  const initials = nameParts.length > 1
    ? nameParts.slice(-2).map((part) => part[0]).join('').toUpperCase()
    : accountName.slice(0, 2).toUpperCase();

  useEffect(() => setSidebarOpen(false), [location.key]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  const signOut = async () => {
    try {
      await logout();
      toast('Bạn đã đăng xuất.');
    } catch {
      toast('Đã kết thúc phiên trên thiết bị này.');
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return { accountName, initials, sidebarOpen, setSidebarOpen, signOut };
}
