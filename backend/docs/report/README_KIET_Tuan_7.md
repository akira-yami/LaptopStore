# BIÊN BẢN BÀN GIAO TÍNH NĂNG: TÍCH HỢP HỆ THỐNG SPRING EMAIL CHO TOÀN DỰ ÁN LAPTOPSTORE

**Người thực hiện:** `Kiệt`
**Nhánh làm việc:** `kiet-Catalog-Inventory-Procurement`
**Ngày hoàn thành:** 21/11/2026
**Trạng thái nghiệm thu:** ĐÃ HOÀN THÀNH TOÀN BỘ (All Tests & Architecture Checks Passed 100%)

---

## 1. Quyết Định Kiến Trúc & Hướng Đi Kỹ Thuật (Architectural Decisions)

### 1.1. Giải pháp Tích hợp Spring Boot Starter Mail (`spring-boot-starter-mail`)
*   **Hướng đi được lựa chọn:**
    *   Sử dụng starter chính thức `org.springframework.boot:spring-boot-starter-mail` tương thích hoàn toàn với nền tảng Spring Boot 3.5.x và JDK 21+.
    *   Tách biệt cấu trúc mô-đun: Đặt toàn bộ hạ tầng dịch vụ Email trong package `org.akira.laptopstore.config.mail` bao gồm: DTO (`EmailRequest`), Interface hợp đồng (`EmailService`), Implementation (`EmailServiceImpl`) và Controller kiểm thử (`AdminEmailController`).
    *   Áp dụng nguyên tắc Dependency Inversion (chữ D trong SOLID): Các module nghiệp vụ (Order, Auth, Review, Catalog...) chỉ phụ thuộc vào abstraction interface `EmailService` mà không bị phụ thuộc vào thư viện cụ thể bên ngoài (`JavaMailSender`).
*   **Lý do lựa chọn (Rationals):**
    *   Tuân thủ nghiêm ngặt bài kiểm thử kiến trúc `ModuleArchitectureTest` (ArchUnit): Package `config` là hạ tầng dùng chung được phép phục vụ các business modules mà không gây chu kỳ phụ thuộc vòng (no cyclic dependencies).
    *   Cấu hình giao thức SMTP chuẩn hóa qua Google Mail (`smtp.gmail.com`, port 587, STARTTLS bắt buộc, timeout bảo vệ 5000ms).
    *   Đáp ứng trọn vẹn yêu cầu email người gửi và người nhận mặc định là: `stevenndln@gmail.com`.
*   **Phân tích giải pháp thay thế (Trade-off Analysis):**
    *   *Giải pháp thay thế 1:* Gọi trực tiếp thư viện bên ngoài như SendGrid, AWS SES SDK hoặc Mailgun.
        *   *Lý do loại bỏ:* Phụ thuộc vào API key dịch vụ thương mại có tính phí, phức tạp trong việc thiết lập môi trường nội bộ và vi phạm yêu cầu sử dụng giải pháp chuẩn Spring Boot Starter Mail với email cụ thể `stevenndln@gmail.com`.
    *   *Giải pháp thay thế 2:* Tự dựng socket SMTP thuần qua thư viện `javax.mail` cổ điển.
        *   *Lý do loại bỏ:* Cồng kềnh, dễ lỗi kết nối SSL/TLS handshake, không tận dụng được cơ chế Dependency Injection và quản lý vòng đời bean của Spring Container.
*   **Giá trị mang lại (Value Proposition):**
    *   Cung cấp nền tảng gửi mail đồng nhất cho toàn bộ hệ thống (gửi mã kích hoạt, thông báo đơn hàng thành công, cảnh báo tồn kho, thông báo hoàn tiền).
    *   Hỗ trợ cả định dạng văn bản thuần túy (Text/Plain) lẫn giao diện động (HTML/UTF-8) bảo vệ chuẩn font tiếng Việt.
    *   Bắt lỗi ngoại lệ an toàn (`MailException`, `MessagingException`), không làm sập luồng nghiệp vụ chính của người dùng khi SMTP server gặp sự cố mạng tạm thời.

---

## 2. Hướng Dẫn Vận Hành & Khởi Chạy File Đặc Biệt (Execution Guide)

### 2.1. Danh sách file đặc biệt & cấu hình mới
1.  **Cấu hình Maven & Thuộc tính Ứng dụng:**
    *   `backend/pom.xml`: Khai báo dependency `spring-boot-starter-mail`.
    *   `backend/src/main/resources/application.properties`: Khai báo các thuộc tính kết nối SMTP, timeout, `spring.mail.username` và địa chỉ `app.mail.from`, `app.mail.default-to`.
2.  **Mã nguồn Dịch vụ & Controller:**
    *   `backend/src/main/java/org/akira/laptopstore/config/mail/dto/EmailRequest.java`: DTO chuẩn hóa yêu cầu gửi thư.
    *   `backend/src/main/java/org/akira/laptopstore/config/mail/service/EmailService.java`: Giao diện hợp đồng abstraction.
    *   `backend/src/main/java/org/akira/laptopstore/config/mail/service/EmailServiceImpl.java`: Triển khai gửi thư qua `JavaMailSender` (hỗ trợ text & MIME HTML).
    *   `backend/src/main/java/org/akira/laptopstore/config/mail/controller/AdminEmailController.java`: API quản trị `/api/v1/admin/emails/send-test` dành cho ADMIN và STAFF.
3.  **Tập kiểm thử tự động (TDD):**
    *   `backend/src/test/java/org/akira/laptopstore/config/mail/EmailServiceTest.java`: Unit test bao phủ 4 kịch bản của `EmailService`.
    *   `backend/src/test/java/org/akira/laptopstore/config/mail/AdminEmailControllerTest.java`: Unit test bao phủ 3 kịch bản của `AdminEmailController`.

### 2.2. Điều kiện tiên quyết & Biến môi trường
Để kích hoạt gửi email thực tế ra bên ngoài thông qua tài khoản Gmail:
*   `MAIL_USERNAME`: Địa chỉ email gửi (mặc định: `stevenndln@gmail.com`).
*   `MAIL_PASSWORD`: **Google App Password** (Mật khẩu ứng dụng 16 ký tự được tạo từ trang Google Account Security, không phải mật khẩu đăng nhập cá nhân).
*   `MAIL_FROM`: Nhãn email gửi (mặc định: `stevenndln@gmail.com`).
*   `MAIL_DEFAULT_TO`: Địa chỉ nhận mặc định (mặc định: `stevenndln@gmail.com`).

Ví dụ khởi chạy Backend với biến môi trường:
```bash
set MAIL_PASSWORD=xxxx-yyyy-zzzz-wwww
cd backend
mvnw.cmd spring-boot:run
```

### 2.3. Hướng dẫn gọi API kiểm thử kết nối
*   **Endpoint:** `POST /api/v1/admin/emails/send-test`
*   **Header:** `Authorization: Bearer <ADMIN_OR_STAFF_TOKEN>`, `Content-Type: application/json`
*   **Request Body (Tùy chọn):**
    ```json
    {
      "to": "stevenndln@gmail.com",
      "subject": "Kiểm tra hệ thống LaptopStore Mail",
      "content": "<h1>Xin chào!</h1><p>Email kiểm thử hệ thống gửi thành công.</p>",
      "isHtml": true
    }
    ```
*   *Lưu ý:* Nếu không truyền body (hoặc body rỗng), hệ thống sẽ tự động khởi tạo payload mặc định và gửi về `stevenndln@gmail.com`.

---

## 3. Kết Quả Kiểm Thử Chất Lượng (Quality Gate Evidence)

### 3.1. Chu kỳ TDD (RED -> GREEN -> REFACTOR)
1.  **Bước RED:** Viết test `EmailServiceTest` và biên dịch bằng lệnh `mvnw test -Dtest=EmailServiceTest`. Xác nhận bài test THẤT BẠI do chưa có class xử lý.
2.  **Bước GREEN:** Tạo `EmailRequest`, `EmailService`, `EmailServiceImpl`, `AdminEmailController`. Chạy lại test `EmailServiceTest` $\rightarrow$ Đạt **BUILD SUCCESS** (4/4 tests passed).
3.  **Bước REFACTOR & INTEGRATION:** Bổ sung `AdminEmailControllerTest`, chạy song song với `ModuleArchitectureTest` để kiểm tra độ tương thích kiến trúc.

### 3.2. Bằng chứng kiểm thử tự động (Execution Evidence)
*   **Backend Mail Unit & Architecture Test:**
    ```text
    [INFO] Running org.akira.laptopstore.architecture.ModuleArchitectureTest
    [INFO] Tests run: 5, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 14.95 s
    [INFO] Running org.akira.laptopstore.config.mail.AdminEmailControllerTest
    [INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.134 s
    [INFO] Running org.akira.laptopstore.config.mail.EmailServiceTest
    [INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.458 s
    [INFO] Results:
    [INFO] Tests run: 12, Failures: 0, Errors: 0, Skipped: 0
    [INFO] BUILD SUCCESS
    ```
*   **Frontend Vitest Suite Regression:**
    ```text
    Test Files  11 passed (11)
         Tests  32 passed (32)
      Duration  10.02s
    ```
*   **Tuân thủ ranh giới kiến trúc:** Không có cảnh báo chu kỳ phụ thuộc, không có vi phạm ranh giới giữa tầng Controller và Service.

---

## 4. Tóm Tắt Khối Lượng Bàn Giao
*   Tích hợp hoàn chỉnh Spring Mail hạ tầng với cấu hình linh hoạt qua biến môi trường.
*   Cung cấp cơ chế gửi email Text và HTML đa phương thức, tự động fallback an toàn về `stevenndln@gmail.com`.
*   Cung cấp REST API test cho nhân viên và quản trị viên vận hành thử nghiệm.
*   Toàn bộ mã nguồn mới đều được chú thích tường minh bằng tiếng Việt giải thích: *Tại sao thay đổi? Giữ cách cũ bị ảnh hưởng xấu gì? Xử lý cách mới được lợi gì?*
