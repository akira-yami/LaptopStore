# ADR-005: Mở rộng quyền quản lý Catalog cho vai trò STAFF

- **Trạng thái:** Accepted
- **Ngày quyết định:** 2026-11-21
- **Người đề xuất:** Tech Lead / Senior Full-Stack Engineer
- **Phạm vi áp dụng:** Phân hệ Catalog, Phân quyền Bảo mật (Security) và Giao diện Vận hành (Staff UI)

---

## 1. Bối cảnh (Context)
Trong giai đoạn đầu thiết kế kiến trúc hệ thống LaptopStore (được ghi nhận tại `08-security.md` và `13-roles-and-functions.md`), bảng ma trận phân quyền quy định việc CRUD Catalog (Products, Variants, Images, Brands, Categories) chỉ dành riêng cho vai trò `ADMIN`, trong khi `STAFF` chỉ tập trung vào xử lý đơn hàng và vận hành kho.

Tuy nhiên, trong thực tiễn vận hành một sàn thương mại điện tử / cửa hàng bán lẻ Laptop:
1. Số lượng biến thể (SKU), màu sắc, cấu hình RAM/SSD và hình ảnh sản phẩm cần được cập nhật liên tục bởi bộ phận Content / Quản lý sản phẩm (thuộc nhóm nhân viên vận hành - `STAFF`).
2. Tình trạng hết hàng tạm thời hoặc nhà sản xuất ngừng cung cấp một phiên bản cấu hình đòi hỏi nhân viên phải nhanh chóng gạt trạng thái "Ngừng bán" (`active = false`) cho biến thể đó mà không cần chờ phê duyệt của Admin cấp cao.
3. Việc giới hạn độc quyền cho `ADMIN` tạo ra nút thắt cổ chai (bottleneck) lớn, làm chậm trễ hoạt động kinh doanh và phản ứng với thị trường.

Mặt khác, cần phân định ranh giới an ninh rõ ràng: Các tác vụ cấu hình hệ thống cấp thấp hoặc hạ tầng kỹ thuật (như gửi email kiểm thử hệ thống qua SMTP tại `/api/v1/admin/emails/**`) mang tính nhạy cảm cao, có nguy cơ bị lạm dụng làm trạm chuyển tiếp email rác (Open Mail Relay) nếu cấp quyền bừa bãi.

---

## 2. Quyết định (Decision)

### 2.1. Mở rộng quyền Catalog cho vai trò STAFF
- Cấp quyền cho cả `STAFF` và `ADMIN` được thực hiện toàn bộ nghiệp vụ quản lý Catalog, bao gồm:
  + Quản lý Sản phẩm (`/api/v1/admin/products/**`): Xem tất cả sản phẩm, thêm/sửa sản phẩm.
  + Quản lý Biến thể (`/api/v1/admin/products/{productId}/variants/**`): Xem danh sách kể cả biến thể đã tắt, sửa thông tin SKU/giá/tồn kho, gạt bật/tắt trạng thái kinh doanh (`active = true/false`).
  + Quản lý Bộ sưu tập Ảnh (`/api/v1/admin/products/{id}/images`): Thêm, xóa, sắp xếp, đánh dấu ảnh chính (`isPrimary`).
  + Quản lý Thương hiệu (`/api/v1/admin/brands/**`): Xem cả thương hiệu ẩn/ngừng hoạt động, tạo mới, chỉnh sửa thông tin, cập nhật trạng thái hoạt động.
  + Quản lý Danh mục (`/api/v1/admin/categories/**`): Xem cả danh mục ẩn, tạo mới, sửa và đổi trạng thái.

### 2.2. Phân định ranh giới kiểm thử Hạ tầng (Email)
- Endpoint `/api/v1/admin/emails/**` **CHỈ DÀNH RIÊNG CHO ROLE ADMIN**.
- Nhân viên `STAFF` truy cập sẽ nhận mã phản hồi chuẩn HTTP `403 Forbidden`.
- Mã nguồn kiểm tra đồng bộ cả ở tầng filter cấu hình URL (`SecurityConfig.java`: `.requestMatchers("/api/v1/admin/emails/**").hasRole("ADMIN")`) và tầng phương thức Controller (`@PreAuthorize("hasRole('ADMIN')")`).

### 2.3. Đồng bộ Giao diện Frontend
- Bổ sung menu điều hướng quản lý Danh mục (`/staff/categories`) và Thương hiệu (`/staff/brands`) vào thanh điều hướng nhân viên `StaffLayout.tsx`.
- Đồng bộ danh sách trang thao tác `operationPages` trong `AppRouter.tsx` giữa `/admin` và `/staff`.

---

## 3. Hệ quả (Consequences)

### Tích cực:
- **Tối ưu hóa quy trình nghiệp vụ:** Nhân viên vận hành chủ động điều chỉnh danh mục, sản phẩm, biến thể và hình ảnh theo thời gian thực.
- **Giảm tải cho Quản trị viên:** Admin tập trung vào quản trị người dùng, phân quyền, cấu hình hệ thống và tài chính.
- **An toàn bảo mật:** Chặn đứng nguy cơ lạm dụng máy chủ SMTP gửi mail tùy tiện bằng cách khóa chặt cổng email test ở quyền Admin.

### Lưu ý & Kế hoạch tiếp theo:
- Cần ghi nhận vết biến động (Audit Log) cho các hành động thay đổi trạng thái bán của biến thể hoặc đổi giá bán do `STAFF` thực hiện (đã lưu `changed_by_user_id` trong nghiệp vụ đơn hàng, sẽ mở rộng cho catalog ở phiên bản tiếp theo).
