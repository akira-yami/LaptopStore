/**
 * =========================================================================
 * [TRANG QUẢN TRỊ THƯƠNG HIỆU - AdminBrandPage.tsx]:
 * 1. Tại sao tạo trang này:
 *    - Cung cấp giao diện trực quan cho Staff và Admin quản lý danh sách hãng máy tính (Apple, ASUS, Dell, HP...).
 *    - Hỗ trợ đầy đủ các thao tác: Tra cứu danh sách, Thêm thương hiệu mới, Sửa tên/mô tả và Xóa mềm thương hiệu.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Trước đây hệ thống chỉ có trang quản lý danh mục (AdminCategoryPage), không có trang quản lý thương hiệu.
 *    - Mọi thao tác thêm/sửa thương hiệu đều phải chọc database thủ công hoặc phụ thuộc DatabaseSeeder.
 *    - Nhân viên không thể cập nhật thông tin hãng khi tiếp nhận lô hàng máy tính mới.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Trải nghiệm người dùng mượt mà, đồng nhất với thiết kế của toàn bộ phân hệ quản trị (AdminUI).
 *    - Tích hợp Modal nhập liệu có validation, thông báo Toast trực quan và Modal xác nhận xóa an toàn.
 * =========================================================================
 */
import { apiErrorMessage, Badge, Icon, Modal, PageHeading, Spinner, useToast } from '@/components/ui';

import React, { useEffect, useState } from 'react';
import { brandApi } from '../../api/brandApi';
import { Brand, CreateBrandRequest } from '../../types';

export const AdminBrandPage: React.FC = () => {
  const toast = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<Brand | null>(null);

  const fetchBrands = async () => {
    setLoading(true);
    setError(null);
    try {
      setBrands(await brandApi.getAllBrands());
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Không thể tải danh sách thương hiệu.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBrands();
  }, []);

  const openModal = (brand: Brand | null) => {
    setEditingBrand(brand);
    setName(brand?.name ?? '');
    setDescription(brand?.description ?? '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Tên thương hiệu không được để trống.', { tone: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateBrandRequest = { name: name.trim(), description: description.trim() || undefined };
      if (editingBrand) {
        await brandApi.updateBrand(editingBrand.id, payload);
        toast('Đã cập nhật thương hiệu.');
      } else {
        await brandApi.createBrand(payload);
        toast('Đã thêm thương hiệu mới.');
      }
      setIsModalOpen(false);
      await fetchBrands();
    } catch (err: unknown) {
      toast(apiErrorMessage(err, 'Lưu thương hiệu thất bại.'), { tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await brandApi.deleteBrand(deleting.id);
      toast(`Đã xóa thương hiệu “${deleting.name}”.`);
      setDeleting(null);
      await fetchBrands();
    } catch (err: unknown) {
      toast(apiErrorMessage(err, 'Xóa thương hiệu thất bại. Hãng có thể đang có sản phẩm.'), { tone: 'error' });
    }
  };

  return (
    <>
      <PageHeading
        eyebrow="Quản trị / Thương hiệu"
        title="Hãng sản xuất"
        sub="Quản lý danh sách các thương hiệu máy tính như Apple, ASUS, Dell, Lenovo..."
        actions={<button type="button" className="btn sm primary" onClick={() => openModal(null)}><Icon name="plus" /> Thêm thương hiệu</button>}
      />

      {loading ? <Spinner /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên thương hiệu</th>
                <th>Mô tả</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan={5} className="table-empty">{error}</td></tr>
              ) : brands.length === 0 ? (
                <tr><td colSpan={5} className="table-empty">Chưa có thương hiệu nào.</td></tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id}>
                    <td className="muted">{b.id}</td>
                    <td className="primary-cell">{b.name}</td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 360 }}>{b.description || '—'}</td>
                    <td>{b.active ? <Badge tone="green">Đang kinh doanh</Badge> : <Badge>Tạm ẩn</Badge>}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                        <button type="button" className="btn sm" onClick={() => openModal(b)}><Icon name="edit" /> Sửa</button>
                        <button type="button" className="btn sm danger" onClick={() => setDeleting(b)}><Icon name="trash" /> Xóa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={isModalOpen}
        title={editingBrand ? 'Sửa thương hiệu' : 'Thêm thương hiệu'}
        onClose={() => setIsModalOpen(false)}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setIsModalOpen(false)} disabled={submitting}>Hủy</button>
            <button type="submit" form="brand-form" className="btn primary" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu'}</button>
          </>
        }
      >
        <form id="brand-form" className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Tên thương hiệu *</span>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Apple, ASUS, Dell, Lenovo..." />
          </label>
          <label className="field">
            <span>Mô tả</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả tóm tắt thương hiệu" style={{ minHeight: 80 }} />
          </label>
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        title={`Xóa thương hiệu “${deleting?.name ?? ''}”?`}
        onClose={() => setDeleting(null)}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setDeleting(null)}>Hủy</button>
            <button type="button" className="btn primary" onClick={() => void confirmDelete()}>Xóa</button>
          </>
        }
      >
        <p className="muted">Thao tác sẽ xóa hoặc tạm ẩn thương hiệu khỏi danh mục kinh doanh.</p>
      </Modal>
    </>
  );
};

export default AdminBrandPage;
