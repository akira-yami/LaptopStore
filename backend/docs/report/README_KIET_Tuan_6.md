# BIÊN BẢN BÀN GIAO TÍNH NĂNG: QUẢN LÝ THƯƠNG HIỆU, BIẾN THỂ & BỘ SƯU TẬP ẢNH SẢN PHẨM

**Người thực hiện:** `Kiệt`
**Nhánh làm việc:** `kiet-Catalog-Inventory-Procurement`
**Ngày hoàn thành:** 20/11/2026
**Trạng thái nghiệm thu:** ĐÃ HOÀN THÀNH TOÀN BỘ (All Tests & Builds Passed)

---

## 1. Quyết Định Kiến Trúc & Hướng Đi Kỹ Thuật (Architectural Decisions)

### 1.1. Quản lý Thương hiệu (Brand Management) cho Admin & Staff
*   **Hướng đi được lựa chọn:**
    *   Thống nhất phân quyền hai tầng: Tầng URL AntMatchers trong `SecurityConfig` và tầng Method Security `@PreAuthorize("hasAnyRole('STAFF', 'ADMIN')")` tại `AdminBrandController`.
    *   Tái sử dụng JPA Soft-Delete pattern (`@SQLDelete` và `@SQLRestriction("active = true")`) trên Entity `Brand` để bảo toàn lịch sử giao dịch và dữ liệu sản phẩm liên kết.
    *   Bổ sung endpoint `GET /api/v1/admin/brands` trả về danh sách toàn bộ thương hiệu mà nhân viên và quản trị viên quản lý.
    *   Tạo trang quản trị `AdminBrandPage.tsx` tích hợp modal thêm/sửa, dialog xác nhận xóa và kết nối navigation trực quan ở cả `AdminLayout` và `StaffLayout`.
*   **Lý do lựa chọn (Rationals):**
    *   Staff cần xem danh mục và thương hiệu khi kiểm tra đơn hàng, nhận hàng và quản lý sản phẩm. Admin giữ quyền tối thượng để duy trì chuẩn catalog.
    *   Đồng bộ tuyệt đối với trang `AdminCategoryPage` hiện có để trải nghiệm người dùng nhất quán.
*   **Phân tích giải pháp thay thế (Trade-off Analysis):**
    *   *Giải pháp thay thế:* Tạo controller riêng biệt `/api/v1/staff/brands` và `/api/v1/admin/brands`.
    *   *Lý do loại bỏ:* Gây trùng lặp mã nguồn (DRY violation) không đáng có vì DTO, validation và service logic hoàn toàn tương đồng. Việc dùng `hasAnyRole('STAFF', 'ADMIN')` giải quyết sạch sẽ và ngắn gọn.
*   **Giá trị mang lại (Value Proposition):**
    *   Cho phép cả Admin và Staff kiểm soát thương hiệu tập trung; không bị nghẽn quy trình khi nhân viên nhập kho hoặc tra cứu sản phẩm theo hãng.

---

### 1.2. Chỉnh sửa Biến thể (Variant) & Trạng thái Kinh doanh (Active/Inactive)
*   **Hướng đi được lựa chọn:**
    *   Mở rộng `VariantSnapshot` response DTO bổ sung thuộc tính `Boolean active`.
    *   Tạo Native Query `findAllByProductIdNative` trong `ProductVariantRepository` để Admin/Staff xem được toàn bộ biến thể (kể cả những biến thể đã tạm ngừng kinh doanh `active = false`).
    *   Cung cấp API `PUT /api/v1/admin/products/{productId}/variants/{variantId}` để chỉnh sửa thông số biến thể (SKU, giá bán, RAM, Storage, màu sắc, trạng thái hoạt động).
    *   Cung cấp API `PATCH /api/v1/admin/products/{productId}/variants/{variantId}/status?active={true|false}` để bật/tắt bán biến thể độc lập với sản phẩm cha.
    *   Xây dựng giao diện Modal Biến thể ngay trong `AdminProductPage.tsx` với bảng danh sách, huy hiệu trạng thái (Đang bán / Ngừng bán), nút chuyển trạng thái một chạm và form chỉnh sửa chi tiết.
*   **Lý do lựa chọn (Rationals):**
    *   Laptop có nhiều cấu hình (ví dụ 8GB/256GB hết hàng hoặc ngừng sản xuất nhưng 16GB/512GB vẫn tiếp tục bán). Việc bật/tắt từng biến thể riêng biệt là yêu cầu sống còn của nghiệp vụ bán hàng điện tử.
*   **Phân tích giải pháp thay thế (Trade-off Analysis):**
    *   *Giải pháp thay thế:* Hard-delete biến thể khỏi DB.
    *   *Lý do loại bỏ:* Vi phạm toàn vẹn khóa ngoại với bảng `order_items`, `cart_items`, `inventory_batches`.
*   **Giá trị mang lại (Value Proposition):**
    *   Linh hoạt tối đa trong việc điều phối kinh doanh từng cấu hình máy mà không làm ảnh hưởng các đơn hàng cũ.

---

### 1.3. Bộ sưu tập Hình ảnh Sản phẩm (Multi-Image Product Management)
*   **Hướng đi được lựa chọn:**
    *   Mỗi sản phẩm có 1 danh sách ảnh liên kết quan hệ 1-N trong bảng `product_images`.
    *   Triển khai API `PUT /api/v1/admin/products/{productId}/images` nhận danh sách `ProductImageDto` và cập nhật nguyên tử (atomic transaction) vào database.
    *   Cơ chế chọn ảnh đại diện (`isPrimary`): Tự động chỉ định ảnh đầu tiên làm `isPrimary = true` nếu người dùng chưa chọn ảnh chính; khi đổi ảnh chính, toàn bộ các ảnh còn lại tự động về `isPrimary = false`.
    *   Giao diện Gallery Modal trong `AdminProductPage.tsx`: Hỗ trợ thêm ảnh nhanh, xem trước thumbnail, đặt làm ảnh chính, xóa ảnh và đồng bộ ngay với layout chi tiết sản phẩm.
*   **Lý do lựa chọn (Rationals):**
    *   Người mua laptop cần xem đa góc độ: mặt A (nắp lưng), mặt C (bàn phím), cổng kết nối hai bên sườn, màn hình. 1 ảnh không thể hiện đủ giá trị máy.
*   **Phân tích giải pháp thay thế (Trade-off Analysis):**
    *   *Giải pháp thay thế:* Chỉ lưu 1 trường `thumbnail_url` trong bảng `products`.
    *   *Lý do loại bỏ:* Giới hạn khả năng hiển thị, không đáp ứng nhu cầu trải nghiệm thực tế của người dùng.
*   **Giá trị mang lại (Value Proposition):**
    *   Trưng bày trực quan, sinh động, chuẩn thương mại điện tử hiện đại.

---

## 2. Hướng Dẫn Vận Hành & Khởi Chạy File Đặc Biệt (Execution Guide)

### 2.1. Danh sách file đặc biệt
1.  **Backend Controller & Service:**
    *   `backend/src/main/java/org/akira/laptopstore/catalog/controller/AdminBrandController.java`
    *   `backend/src/main/java/org/akira/laptopstore/catalog/controller/AdminProductController.java`
    *   `backend/src/main/java/org/akira/laptopstore/catalog/service/impl/ProductServiceImpl.java`
    *   `backend/src/main/java/org/akira/laptopstore/catalog/service/impl/ProductVariantServiceImpl.java`
    *   `backend/src/main/java/org/akira/laptopstore/security/SecurityConfig.java`
2.  **Unit & Integration Test Suites:**
    *   `backend/src/test/java/org/akira/laptopstore/catalog/controller/AdminBrandControllerTest.java`
    *   `backend/src/test/java/org/akira/laptopstore/catalog/controller/AdminProductVariantAndImageTest.java`
    *   `frontend/src/modules/catalog/pages/admin/AdminBrandPage.test.tsx`
    *   `frontend/src/modules/catalog/pages/admin/AdminProductPage.test.tsx`
3.  **Frontend Pages & Navigation:**
    *   `frontend/src/modules/catalog/pages/admin/AdminBrandPage.tsx`
    *   `frontend/src/modules/catalog/pages/admin/AdminProductPage.tsx`
    *   `frontend/src/app/router/AppRouter.tsx`
    *   `frontend/src/layouts/AdminLayout.tsx`
    *   `frontend/src/layouts/StaffLayout.tsx`

### 2.2. Điều kiện tiên quyết (Prerequisites)
*   Java JDK 21+ (hoặc JDK 25 hiện có trên máy).
*   Node.js 18+ và npm.
*   Database MySQL/PostgreSQL cục bộ đang chạy Docker hoặc service local.

### 2.3. Lệnh khởi chạy & Kiểm thử chất lượng (Commands)

#### A. Kiểm thử và xác thực Backend (TDD & Architecture Gate):
```powershell
# Chạy các test unit/controller mới theo chuẩn TDD
cd backend
.\mvnw.cmd test -Dtest=AdminBrandControllerTest,AdminProductVariantAndImageTest

# Chạy kiểm thử kiến trúc Clean Architecture & ranh giới mô-đun
.\mvnw.cmd test -Dtest=ModuleArchitectureTest

# Chạy toàn bộ test suite backend (253+ test cases)
.\mvnw.cmd test
```

#### B. Kiểm thử và Build Frontend:
```powershell
# Chạy bộ test suite frontend
cd frontend
npm test -- --run

# Biên dịch kiểm tra TypeScript và đóng gói bản build production
npm run build
```

### 2.4. Kết quả mong đợi (Expected Output)
*   **Backend Maven Tests:**
    ```text
    [INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 -- AdminBrandControllerTest
    [INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- AdminProductVariantAndImageTest
    [INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0 -- ModuleArchitectureTest
    [INFO] Tests run: 253, Failures: 0, Errors: 0, Skipped: 11
    [INFO] BUILD SUCCESS
    ```
*   **Frontend Vitest & Build:**
    ```text
    Test Files  10 passed (10)
    Tests  20 passed (20)
    ✓ built in 10.25s
    ```
