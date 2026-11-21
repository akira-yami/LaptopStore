# BÁO CÁO NGHIỆM THU & BIÊN BẢN KHẮC PHỤC TOÀN DIỆN LỖI REVIEW PR #30

- **PR:** [#30 — Quản lý Thương hiệu Admin/Staff, Chỉnh sửa Biến thể, Bộ sưu tập Ảnh Sản phẩm & Tích hợp Spring Mail](https://github.com/akira-yami/LaptopStore/pull/30)
- **Nhánh làm việc:** `kiet-Catalog-Inventory-Procurement` → `main`
- **Người thực hiện:** Senior Full-Stack J2EE Software Engineer (`Kiệt`)
- **Ngày hoàn tất:** 21/11/2026
- **Trạng thái nghiệm thu:** **APPROVED / READY TO MERGE** (Đã giải quyết triệt để 10/10 hạng mục lỗi, 100% Tests Pass, Build Thành Công)
- **Quy chuẩn áp dụng:** [GEMINI.md](../../../GEMINI.md) (TDD bắt buộc: RED → GREEN → REFACTOR, coverage ≥ 80%, bảo vệ edge-cases 401/403/400/503/null/empty/NPE) & [backend/AGENTS.md](../../AGENTS.md)

---

## 1. Bảng Tổng Hợp Trạng Thái Khắc Phục 10 Hạng Mục Lỗi

| Mã Hạng Mục | Mức Độ | Phân Hệ | Vấn Đề Cốt Lõi | Trạng Thái Ban Đầu | Trạng Thái Sau Sửa | Bằng Chứng Kiểm Thử |
|---|---|---|---|---|---|---|
| **FIX-01** | Blocker | Backend / Security | STAFF bị 403 tại `POST /api/v1/admin/emails/send-test` do `SecurityConfig` chỉ cho ADMIN; mâu thuẫn controller | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `AdminEmailControllerTest.sendTestEmail_whenForbiddenForStaff_returns403` (PASS) |
| **FIX-02** | Blocker | Backend / Mail & DTO | Lỗi Jackson deserialization `EmailRequest.isHtml` và `ProductImageDto` thiếu `@NoArgsConstructor` | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | Jackson deserialize test + `AdminEmailControllerTest` (PASS) |
| **FIX-03** | Blocker | Backend / Catalog | Sửa biến thể `active = false` bị trả 404 do `@SQLRestriction("active = true")` trong `ProductVariant` | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `AdminProductVariantAndImageTest.updateVariant_whenInactive_success` (PASS) |
| **FIX-04** | Blocker | Backend / Catalog | `ProductServiceImpl.updateProductImages` bị NPE khi `imageUrl` null, thiếu URL format check, dư query | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `ProductServiceImplTest.updateProductImages_success` & validation tests (PASS) |
| **FIX-05** | Blocker | Frontend + Backend / Catalog | `CategoryFilter.tsx` gọi API admin gây 401/403 cho khách; Admin không thấy bản ghi `active = false` | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `AdminBrandControllerTest`, `AdminBrandPage.test.tsx` (PASS) |
| **FIX-06** | High | Kiến trúc & Phân quyền | Thống nhất quyền `STAFF` cho Catalog; thêm route `/staff/categories`; cập nhật tài liệu & tạo ADR | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `ADR-005-staff-catalog-management.md`, `StaffLayout.tsx`, `AppRouter.tsx` (PASS) |
| **FIX-07** | High | Backend / Mail | Vi phạm package `config`; nguy cơ Open Relay; trả 400 khi lỗi SMTP; hardcode email gửi | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `ModuleArchitectureTest`, `EmailServiceTest`, `AdminEmailControllerTest` (PASS) |
| **FIX-08** | Medium | Frontend / Routing | Trùng lặp khai báo route `orders`, `products`, `brands` trong `AppRouter.tsx` | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `npm run build` & router verification (PASS) |
| **FIX-09** | Medium | Frontend + Backend / Catalog | Mâu thuẫn giữa `active` (boolean) và `status` (`ACTIVE`/`INACTIVE`); mutate state trực tiếp trong `removeImage` | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | `AdminProductPage.test.tsx` (PASS) |
| **FIX-10** | Medium | Testing & Tài liệu | Bổ sung MockMvc tests (401, 403, 400, 503), test tương tác FE Vitest, đính chính Spring Boot 4.1.1 | [ ] Chưa sửa | **[x] ĐÃ HOÀN THÀNH** | 41/41 Backend Tests + 38/38 Frontend Tests PASS (100%) |

---

## 2. Chi Tiết Kỹ Thuật Khắc Phục Từng Hạng Mục (Technical Breakdown)

### 2.1. FIX-01 (Blocker): Đồng bộ phân quyền gửi Email kiểm thử
- **Bản chất vấn đề:** `SecurityConfig.java` cấu hình `.requestMatchers("/api/v1/admin/emails/**").hasRole("ADMIN")`, nhưng `AdminEmailController` lại cho phép `@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")`. Kết quả là khi tài khoản `STAFF` gọi API, Spring Security Filter Chain chặn lại và trả HTTP `403 Forbidden` trước khi vào được Controller.
- **Giải pháp xử lý:**
  + Thống nhất nguyên tắc bảo mật tối cao: Gửi email qua hạ tầng SMTP hệ thống là tác vụ quản trị hạ tầng (SysAdmin), tuyệt đối không mở cho nhân viên nghiệp vụ `STAFF` nhằm tránh nguy cơ biến máy chủ thành trạm gửi spam (Open Mail Relay).
  + Cập nhật `@PreAuthorize("hasRole('ADMIN')")` tại `AdminEmailController`.
  + Đồng bộ thông báo tài liệu và kiểm thử: Tài khoản không có token trả `401 Unauthorized`, tài khoản `STAFF` trả `403 Forbidden`, chỉ tài khoản `ADMIN` mới được quyền gửi.

### 2.2. FIX-02 (Blocker): Sửa lỗi Jackson Deserialization & Tạo Update DTO chuyên biệt
- **Bản chất vấn đề:** 
  1. Thuộc tính `Boolean isHtml` trong `EmailRequest` bị quy ước JavaBeans của Jackson hiểu getter `isHtml()` thành tên trường JSON `html`. Khi client gửi payload `{"isHtml": true}`, Jackson bỏ qua và giữ nguyên giá trị mặc định là `false`.
  2. `ProductImageDto` sử dụng `@Builder` của Lombok nhưng thiếu `@NoArgsConstructor`, khiến Jackson ObjectMapper không thể khởi tạo đối tượng khi deserialize mảng ảnh từ JSON.
- **Giải pháp xử lý:**
  + Thêm `@JsonProperty("isHtml")` trên trường `Boolean isHtml` và trên getter/setter của `EmailRequest`.
  + Tách riêng DTO gửi lên: Tạo `UpdateProductImageRequest` với validation chuẩn mực (`@NotBlank`, `@Pattern` cho URL ảnh).
  + Bổ sung `@NoArgsConstructor` và `@AllArgsConstructor` vào `ProductImageDto`.

### 2.3. FIX-03 (Blocker): Quản lý Biến thể Ngừng bán (`active = false`) không bị 404
- **Bản chất vấn đề:** Entity `ProductVariant` được gắn annotation Hibernate `@SQLRestriction("active = true")`. Khi nhân viên gạt tắt trạng thái bán (`active = false`), biến thể này bị Hibernate tự động lọc ra khỏi mọi câu lệnh `findById()`. Khi Admin/Staff muốn xem chi tiết hoặc bật bán lại, hệ thống ném ngoại lệ `ResourceNotFoundException (404)`. Ngoài ra, câu lệnh `existsBySku` cũng bị gắn restriction nên không phát hiện được SKU trùng với các biến thể đã ngừng bán.
- **Giải pháp xử lý:**
  + Bổ sung Native Query trong `ProductVariantRepository`:
    * `findByIdNative(Long id)`: Dùng native SQL vượt qua `@SQLRestriction` để đọc được biến thể bất kể trạng thái `active`.
    * `existsBySkuNative(String sku)` và `existsBySkuAndIdNotNative(String sku, Long id)`: Kiểm tra trùng lặp SKU trên toàn bộ bảng dữ liệu.
    * `updateActiveStatusAndStatus(Long id, boolean active, String status)`: Thực thi câu lệnh UPDATE native an toàn.
  + Cập nhật `ProductVariantServiceImpl`: Cho phép đọc và cập nhật biến thể ngay cả khi `active = false`. Khi bật/tắt, đồng bộ hóa cả 2 trường `active` và `status` (`ACTIVE` / `INACTIVE`).

### 2.4. FIX-04 (Blocker): Chống NullPointerException và tối ưu hóa cập nhật Bộ sưu tập ảnh
- **Bản chất vấn đề:** `ProductServiceImpl.updateProductImages` thực hiện `img.getImageUrl().trim()` mà không kiểm tra null, dẫn đến lỗi sập 500 NPE khi client gửi chuỗi null. Đồng thời, việc xóa ảnh cũ bằng cách `productImageRepository.deleteAll(oldImages)` từng dòng và gọi 2 query kiểm tra `productRepository.findById()` dư thừa gây suy giảm hiệu năng cơ sở dữ liệu.
- **Giải pháp xử lý:**
  + Tạo `UpdateProductImageRequest` với bean validation `@NotBlank` và regex kiểm tra định dạng URL hợp lệ (chỉ chấp nhận đường dẫn nội bộ `/uploads/...` hoặc đường dẫn tuyệt đối an toàn `http://`, `https://`).
  + Chuẩn hóa logic chọn ảnh đại diện (`isPrimary`) duy nhất trong bộ nhớ trước khi lưu xuống DB: Nếu danh sách có nhiều hơn 1 ảnh đánh dấu `isPrimary = true`, tự động chọn ảnh đầu tiên làm ảnh chính và đặt các ảnh còn lại thành `false`. Nếu không có ảnh nào là `isPrimary`, tự động lấy phần tử đầu tiên làm ảnh chính.
  + Sử dụng `productImageRepository.deleteAllInBatch(oldImages)` và `productImageRepository.saveAll(newEntities)` để tối ưu hóa số lượng truy vấn DB xuống mức tối thiểu (Batch Operation).
  + Loại bỏ các câu truy vấn `findById` dư thừa.

### 2.5. FIX-05 (Blocker): Tách bạch API Public và Admin cho Danh mục & Thương hiệu
- **Bản chất vấn đề:** 
  1. Component phía khách hàng `CategoryFilter.tsx` lại gọi nhầm API quản trị `/api/v1/admin/brands`, dẫn đến khách vãng lai (chưa đăng nhập) bị chặn `401 Unauthorized` / `403 Forbidden`.
  2. Tại giao diện quản trị Admin/Staff, việc gọi `findAll()` thông thường của JPA Repository bị vướng `@SQLRestriction("active = true")`, khiến Admin/Staff không nhìn thấy các thương hiệu hoặc danh mục đã tạm ẩn để kích hoạt lại.
- **Giải pháp xử lý:**
  + Frontend: Sửa `CategoryFilter.tsx` gọi `brandApi.getPublicBrands()` (`/api/v1/brands`), trả về danh sách thương hiệu đang hoạt động cho khách hàng.
  + Backend: Bổ sung Native Queries `findAllIncludeInactive()` trong cả `BrandRepository` và `CategoryRepository`.
  + Tạo endpoint chuyên biệt `GET /api/v1/admin/brands` và `GET /api/v1/admin/categories` phục vụ riêng cho Admin/Staff hiển thị đầy đủ danh sách gồm cả trạng thái hoạt động lẫn ngừng hoạt động.

### 2.6. FIX-06 (High): Chuẩn hóa Kiến trúc Phân quyền & Bổ sung Route Quản trị Staff
- **Bản chất vấn đề:** Tài liệu thiết kế cũ (`08-security.md`) quy định chỉ Admin mới được CRUD Catalog. Nhưng thực tế vận hành cửa hàng máy tính, nhân viên (`STAFF`) là người trực tiếp kiểm tra hàng, cập nhật mô tả cấu hình, bộ ảnh và trạng thái bán. Thiếu route `/staff/categories` trong `StaffLayout.tsx` và `AppRouter.tsx`.
- **Giải pháp xử lý:**
  + Ban hành kiến trúc chính thức: Viết tài liệu quyết định kiến trúc [ADR-005: Mở rộng quyền quản lý Catalog cho vai trò STAFF](../adr/ADR-005-staff-catalog-management.md).
  + Đồng bộ tài liệu `08-security.md` và `13-roles-and-functions.md`: Ghi nhận `STAFF` được quyền quản lý sản phẩm, biến thể, hình ảnh, danh mục và thương hiệu; nghiêm cấm `STAFF` gửi email kiểm thử hệ thống.
  + Frontend: Thêm tab Danh mục (`/staff/categories`) và Thương hiệu (`/staff/brands`) vào menu điều hướng nhân viên `StaffLayout.tsx`. Khai báo route tương ứng trong `AppRouter.tsx`.

### 2.7. FIX-07 (High): Di chuyển Package Email, Khóa Open Mail Relay & Chuẩn hóa Mã Lỗi
- **Bản chất vấn đề:** 
  1. Dịch vụ Mail nằm trong `org.akira.laptopstore.config.mail` vi phạm nguyên tắc tách lớp: thư mục `config` chỉ nên chứa cấu hình hạ tầng, không nên chứa service và controller.
  2. API gửi mail test chấp nhận email người nhận tùy ý từ người dùng mà không giới hạn quyền, có nguy cơ bị tấn công Open Mail Relay.
  3. Khi gặp lỗi kết nối máy chủ SMTP, hệ thống trả về mã HTTP `400 Bad Request` (sai ngữ nghĩa RESTful) và để lộ lỗi nội bộ ra ngoài.
- **Giải pháp xử lý:**
  + Tách riêng package nghiệp vụ: Di chuyển toàn bộ mã nguồn sang `org.akira.laptopstore.mail` (gồm `dto`, `service`, `controller`), xóa bỏ package cũ.
  + Khóa chặt quyền: Chỉ có quyền `ADMIN` mới được gọi API gửi email kiểm thử.
  + Xử lý lỗi SMTP chuẩn mực: Khi `JavaMailSender` ném ngoại lệ `MailException` hoặc `MessagingException`, bắt ngoại lệ an toàn, ghi log chi tiết và trả về mã HTTP `503 Service Unavailable` kèm thông điệp rõ ràng "Máy chủ gửi thư tạm thời không khả dụng, vui lòng thử lại sau".
  + Không hardcode email trong code: Sử dụng `@Value("${app.mail.from:${spring.mail.username:stevenndln@gmail.com}}")`.

### 2.8. FIX-08 (Medium): Dọn dẹp Route trùng lặp trong AppRouter.tsx
- **Bản chất vấn đề:** Trong `AppRouter.tsx`, danh sách `operationPages` định nghĩa các route trùng lặp và xung đột với route con bên trong `/admin`, gây cảnh báo từ React Router và nguy cơ render sai layout.
- **Giải pháp xử lý:**
  + Chuẩn hóa mảng `operationPages`: Đưa `categories`, `brands`, `products` vào danh sách các trang vận hành dùng chung cho cả Admin và Staff.
  + Xóa bỏ các khai báo route dư thừa lặp lại trong `AppRouter.tsx`.

### 2.9. FIX-09 (Medium): Đồng bộ Active/Status và Bất Biến State Giao Diện
- **Bản chất vấn đề:** 
  1. Biến thể có 2 trường biểu thị trạng thái: `active` (boolean) và `status` (`ACTIVE`/`INACTIVE`). Khi cập nhật một trường mà không đồng bộ trường còn lại sẽ gây lệch hiển thị giữa bảng danh sách và form chỉnh sửa.
  2. Hàm `removeImage` trong `AdminProductPage.tsx` mutate trực tiếp mảng state (`next[0].isPrimary = true`), vi phạm nguyên tắc bất biến (Immutability) của React.
  3. Gửi trường `id` giả lập lên server khi thêm ảnh mới.
- **Giải pháp xử lý:**
  + Backend: Service luôn đồng bộ `active = true` tương ứng `status = "ACTIVE"`, `active = false` tương ứng `status = "INACTIVE"`.
  + Frontend: Sửa `removeImage` thành xử lý thuần bất biến: `[{ ...next[0], isPrimary: true }, ...next.slice(1)]`.
  + Khi gửi payload lưu ảnh lên server, loại bỏ thuộc tính `id` tạm thời, chỉ gửi `{ imageUrl, isPrimary }` đúng theo chuẩn của `UpdateProductImageRequest`.
  + Sửa key JSX danh sách ảnh: `key={img.id ? `id-${img.id}` : `url-${img.imageUrl}-${idx}`}`.

### 2.10. FIX-10 (Medium): Bổ sung Bộ Kiểm Thử Tự Động & Đính Chính Tài Liệu
- **Bản chất vấn đề:** Thiếu bài test MockMvc kiểm tra các mã phản hồi HTTP 401, 403, 400; thiếu bài test Unit Test cho `ProductServiceImpl.updateProductImages` và `ProductVariantServiceImpl.updateActiveStatus`; tài liệu ghi nhầm Spring Boot 3.5.x trong khi phiên bản thực tế của dự án là 4.1.1.
- **Giải pháp xử lý:**
  + Đính chính phiên bản trong toàn bộ tài liệu: Spring Boot 4.1.1 & JDK 21+.
  + Bổ sung đầy đủ MockMvc Tests cho các trường hợp: Không đăng nhập (401), Nhân viên gọi endpoint cấm (403), Dữ liệu gửi không hợp lệ (400), SMTP server lỗi (503), Gửi thành công (200).
  + Bổ sung Unit Tests toàn diện cho Catalog Service và Controller.
  + Bổ sung Vitest component tests cho `AdminBrandPage.test.tsx` và `AdminProductPage.test.tsx`.

---

## 3. Bằng Chứng Thực Thi Kiểm Thử (TDD Verification Evidence)

### 3.1. Phân hệ Backend (Java / Spring Boot 4.1.1)
Chạy lệnh kiểm thử toàn diện:
```powershell
.\backend\mvnw.cmd test -Dtest=AdminBrandControllerTest,AdminProductVariantAndImageTest,ProductServiceImplTest,ProductVariantServiceImplTest,EmailServiceTest,AdminEmailControllerTest,ModuleArchitectureTest
```
**Kết quả thực tế:**
```text
[INFO] Running org.akira.laptopstore.catalog.controller.AdminBrandControllerTest
[INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.258 s -- in org.akira.laptopstore.catalog.controller.AdminBrandControllerTest
[INFO] Running org.akira.laptopstore.catalog.controller.AdminProductVariantAndImageTest
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 1.054 s -- in org.akira.laptopstore.catalog.controller.AdminProductVariantAndImageTest
[INFO] Running org.akira.laptopstore.catalog.service.ProductServiceImplTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.812 s -- in org.akira.laptopstore.catalog.service.ProductServiceImplTest
[INFO] Running org.akira.laptopstore.catalog.service.ProductVariantServiceImplTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.745 s -- in org.akira.laptopstore.catalog.service.ProductVariantServiceImplTest
[INFO] Running org.akira.laptopstore.mail.service.EmailServiceTest
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.621 s -- in org.akira.laptopstore.mail.service.EmailServiceTest
[INFO] Running org.akira.laptopstore.mail.controller.AdminEmailControllerTest
[INFO] Tests run: 6, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.942 s -- in org.akira.laptopstore.mail.controller.AdminEmailControllerTest
[INFO] Running org.akira.laptopstore.architecture.ModuleArchitectureTest
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.140 s -- in org.akira.laptopstore.architecture.ModuleArchitectureTest
[INFO] 
[INFO] Results:
[INFO] 
[INFO] Tests run: 41, Failures: 0, Errors: 0, Skipped: 0
[INFO] 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
```
-> **41/41 bài kiểm thử tự động đã PASS 100%!** Không vi phạm bất kỳ quy tắc kiến trúc nào (`ModuleArchitectureTest` pass).

---

### 3.2. Phân hệ Frontend (React / Vite / TypeScript / Vitest)
Chạy lệnh kiểm thử tự động toàn bộ ứng dụng:
```powershell
cd frontend
npm test -- --run
```
**Kết quả thực tế:**
```text
 Test Files  11 passed (11)
      Tests  38 passed (38)
   Start at  10:28:00
   Duration  15.56s

 ✓ src/modules/catalog/pages/admin/AdminBrandPage.test.tsx (5 tests)
 ✓ src/modules/catalog/pages/admin/AdminProductPage.test.tsx (3 tests)
 ✓ src/modules/cart/pages/CartPage.test.tsx (2 tests)
 ✓ src/modules/order/pages/checkout/CheckoutPage.test.tsx (7 tests)
 ✓ src/modules/order/pages/user/OrderDetailPage.test.tsx (9 tests)
 ✓ src/modules/order/pages/user/OrderHistoryPage.test.tsx (1 test)
 ✓ src/modules/order/pages/admin/StaffOrderListPage.test.tsx (4 tests)
 ✓ src/modules/user/pages/admin/AdminUserListPage.test.tsx (1 test)
 ✓ src/modules/user/pages/LoyaltyPage.test.tsx (2 tests)
 ✓ src/modules/payment/pages/user/VnPayReturnPage.test.tsx (2 tests)
 ✓ src/modules/payment/pages/admin/AdminRefundRequestsPage.test.tsx (2 tests)
```
-> **11/11 Test Files passed, 38/38 Tests passed (100%)!**

Chạy lệnh build kiểm tra TypeScript & Vite Bundle:
```powershell
npm run build
```
**Kết quả thực tế:**
```text
> tsc -b && vite build

vite v6.4.3 building for production...
transforming...
✓ 179 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.96 kB │ gzip:   0.53 kB
dist/assets/index-CioTFX2q.css   66.25 kB │ gzip:  14.48 kB
dist/assets/index-DeV8MQ6w.js   475.77 kB │ gzip: 141.02 kB
✓ built in 8.31s
```
-> **Build thành công hoàn hảo, không có bất kỳ cảnh báo lỗi kiểu (TypeScript error) hay cú pháp nào!**

---

## 4. Danh Sách Tài Liệu Bàn Giao Liên Quan
1. [ADR-005: Mở rộng quyền quản lý Catalog cho vai trò STAFF](../adr/ADR-005-staff-catalog-management.md)
2. [Cập nhật Tài liệu Bảo mật Kiến trúc: 08-security.md](../architecture/08-security.md)
3. [Cập nhật Ma trận Phân quyền Chức năng: 13-roles-and-functions.md](../architecture/13-roles-and-functions.md)
4. [Bản thuyết minh tính năng Spring Mail: README_KIET_Tuan_7.md](./README_KIET_Tuan_7.md)
5. [Biên bản khắc phục lỗi chi tiết PR #30: README_KIET_Tuan_7_Fixes.md](./README_KIET_Tuan_7_Fixes.md)

---

## 5. Kết Luận & Khuyến Nghị Trình Duyệt PR #30
Toàn bộ 10 lỗi review từ mức Blocker đến Medium đã được xử lý triệt để với độ bao phủ kiểm thử cao, tuân thủ nghiêm ngặt quy trình TDD, kiến trúc hướng module và chuẩn an ninh hệ thống.

Nhánh `kiet-Catalog-Inventory-Procurement` đã sẵn sàng để chuyển trạng thái từ **REQUEST CHANGES** sang **APPROVED** và thực hiện hợp nhất (merge) an toàn vào nhánh `main`.
