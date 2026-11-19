import { apiErrorMessage, Badge, formatDateTime, Icon, Modal, PageHeading, Spinner, useToast } from '@/components/ui';
import { ROLES } from '@/constants/roles';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { adminUserApi } from '../../api/userApi';
import { UserProfile } from '../../types';

const ALL_ROLES = [
  { value: ROLES.USER, label: 'Khách hàng (ROLE_USER)' },
  { value: ROLES.STAFF, label: 'Nhân viên (ROLE_STAFF)' },
  { value: ROLES.ADMIN, label: 'Quản trị viên (ROLE_ADMIN)' },
];

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'LOCKED', label: 'Đã khóa' },
];

const roleLabel = (role: string) => {
  if (role === ROLES.ADMIN) return 'Admin';
  if (role === ROLES.STAFF) return 'Staff';
  if (role === ROLES.USER) return 'User';
  return role;
};

export const AdminUserListPage: React.FC = () => {
  const toast = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const [roleTarget, setRoleTarget] = useState<UserProfile | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setUsers(await adminUserApi.getAllUsers());
    } catch (err) {
      setError(apiErrorMessage(err, 'Không thể tải danh sách người dùng.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const visible = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return users.filter((u) => {
      const matchStatus = !statusFilter || u.status === statusFilter;
      const matchRole = !roleFilter || u.roles.includes(roleFilter);
      const matchKeyword = !q
        || u.email.toLowerCase().includes(q)
        || (u.fullName ?? '').toLowerCase().includes(q)
        || (u.phone ?? '').toLowerCase().includes(q);
      return matchStatus && matchRole && matchKeyword;
    });
  }, [users, keyword, statusFilter, roleFilter]);

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    const actionLabel = nextStatus === 'LOCKED' ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Xác nhận ${actionLabel} tài khoản ${user.email}? Phiên đăng nhập hiện tại của tài khoản này sẽ bị thu hồi.`)) {
      return;
    }
    try {
      setTogglingId(user.id);
      const updated = await adminUserApi.updateUserStatus(user.id, nextStatus);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast(`Đã ${actionLabel} tài khoản ${updated.email}.`);
    } catch (err) {
      toast(apiErrorMessage(err, `Không thể ${actionLabel} tài khoản.`), { tone: 'error' });
    } finally {
      setTogglingId(null);
    }
  };

  const openRoleModal = (user: UserProfile) => {
    setRoleTarget(user);
    setSelectedRoles([...user.roles]);
  };

  const toggleRoleChoice = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const saveRoles = async () => {
    if (!roleTarget) return;
    if (selectedRoles.length === 0) {
      toast('Mỗi tài khoản phải có ít nhất một vai trò.', { tone: 'error' });
      return;
    }
    try {
      setSavingRoles(true);
      const updated = await adminUserApi.updateUserRoles(roleTarget.id, selectedRoles);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast(`Đã cập nhật vai trò cho ${updated.email}.`);
      setRoleTarget(null);
    } catch (err) {
      toast(apiErrorMessage(err, 'Không thể cập nhật vai trò tài khoản.'), { tone: 'error' });
    } finally {
      setSavingRoles(false);
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Quản trị hệ thống / Tài khoản"
        title="Quản lý người dùng"
        sub="Tra cứu tài khoản, phân quyền vai trò và kiểm soát trạng thái truy cập."
        actions={(
          <button type="button" className="btn sm" onClick={() => void loadUsers()}>
            <Icon name="refresh" /> Làm mới
          </button>
        )}
      />

      <div className="ops-toolbar">
        <label className="search">
          <Icon name="search" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm email, họ tên hoặc số điện thoại..."
            aria-label="Tìm người dùng"
          />
        </label>
        <div className="chips" style={{ margin: 0 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              className={`chip ${statusFilter === f.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          className="btn sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Lọc vai trò"
        >
          <option value="">Tất cả vai trò</option>
          {ALL_ROLES.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      {loading ? <Spinner label="Đang tải danh sách người dùng" /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tài khoản</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan={6} className="table-empty">{error}</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={6} className="table-empty">Không có người dùng nào phù hợp bộ lọc.</td></tr>
              ) : visible.map((u) => {
                const isActive = u.status === 'ACTIVE';
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="primary-cell">{u.fullName || 'Chưa cập nhật tên'}</div>
                      <div className="subcell">{u.email}</div>
                    </td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <div className="row wrap" style={{ gap: 6 }}>
                        {u.roles.map((r) => (
                          <Badge key={r} tone={r === ROLES.ADMIN ? 'orange' : r === ROLES.STAFF ? 'blue' : 'neutral'}>
                            {roleLabel(r)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge tone={isActive ? 'green' : 'red'}>
                        {isActive ? 'Hoạt động' : u.status}
                      </Badge>
                    </td>
                    <td className="small muted">{formatDateTime(u.createdAt)}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                        <button type="button" className="btn sm" onClick={() => openRoleModal(u)}>
                          Phân quyền
                        </button>
                        <button
                          type="button"
                          className={`btn sm ${isActive ? 'danger' : 'soft'}`}
                          disabled={togglingId === u.id}
                          onClick={() => void handleToggleStatus(u)}
                        >
                          {togglingId === u.id ? 'Đang lưu...' : isActive ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!roleTarget}
        title={roleTarget ? `Phân quyền cho ${roleTarget.email}` : ''}
        onClose={() => setRoleTarget(null)}
        actions={(
          <>
            <button type="button" className="btn" onClick={() => setRoleTarget(null)}>Hủy</button>
            <button type="button" className="btn primary" disabled={savingRoles} onClick={() => void saveRoles()}>
              {savingRoles ? 'Đang lưu...' : 'Lưu vai trò'}
            </button>
          </>
        )}
      >
        <p className="muted" style={{ marginBottom: 14 }}>
          Chọn các vai trò áp dụng cho tài khoản này. Sau khi lưu, phiên đăng nhập cũ sẽ hết hiệu lực để áp dụng quyền mới ngay lập tức.
        </p>
        <div className="stack" style={{ gap: 10 }}>
          {ALL_ROLES.map((r) => (
            <label key={r.value} className="row" style={{ gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selectedRoles.includes(r.value)}
                onChange={() => toggleRoleChoice(r.value)}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      </Modal>
    </>
  );
};

export default AdminUserListPage;
