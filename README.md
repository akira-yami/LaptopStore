# LaptopStore — Hệ thống Thương mại Điện tử Bán Laptop B2C

<p align="center">
  <img src="https://img.shields.io/badge/Java-21%20%7C%20JDK%2025-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java" />
  <img src="https://img.shields.io/badge/Spring%20Boot-4.1.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/Spring%20Security-JWT%20%2B%20RBAC-6DB33F?style=for-the-badge&logo=springsecurity&logoColor=white" alt="Spring Security" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Flyway-Migrations%20V1--V13-CC0200?style=for-the-badge&logo=flyway&logoColor=white" alt="Flyway" />
  <img src="https://img.shields.io/badge/Swagger%20UI-OpenAPI%203-85EA2D?style=for-the-badge&logo=swagger&logoColor=111111" alt="Swagger OpenAPI 3" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=111111" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/React%20Router-6.28-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white" alt="React Router" />
  <img src="https://img.shields.io/badge/Axios-1.21-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JUnit%205%20%2B%20ArchUnit-1.5.0-25A162?style=for-the-badge&logo=junit5&logoColor=white" alt="JUnit 5 & ArchUnit" />
  <img src="https://img.shields.io/badge/Vitest-5.1-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Playwright-1.65-2EAD33?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" />
  <img src="https://img.shields.io/badge/Docker%20Compose-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-CI-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/VNPay-Gateway%202.1.0-005BAA?style=for-the-badge" alt="VNPay" />
</p>

Hệ thống bán laptop trực tuyến B2C (Full-stack Monolith) gồm **Backend Spring Boot** thiết kế theo kiến trúc **Feature-first Modular Monolith** (kiểm soát ranh giới module bằng ArchUnit, Flyway migration, khóa bi quan chống oversell) và **Frontend React + TypeScript + Vite**.

---

## Mục lục

1. [Công nghệ sử dụng (Tech Stack)](#1-công-nghệ-sử-dụng-tech-stack)
2. [Tính năng chính](#2-tính-năng-chính)
3. [Cấu trúc dự án](#3-cấu-trúc-dự-án)
4. [Hướng dẫn chạy dự án (Quickstart)](#4-hướng-dẫn-chạy-dự-án-quickstart)
5. [Cấu hình thanh toán VNPay Sandbox](#5-cấu-hình-thanh-toán-vnpay-sandbox)
6. [Kiểm thử & CI/CD](#6-kiểm-thử--cicd)
7. [Kiến trúc, Phân công nhóm & Quy tắc phát triển](#7-kiến-trúc-phân-công-nhóm--quy-tắc-phát-triển)

---

## 1. Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ & Thư viện |
|---|---|
| **Backend Core** | Java 21 (chạy trên JDK 25), Spring Boot `4.1.1`, Spring Web MVC, Spring Data JPA, Spring Validation |
| **Security & Auth** | Spring Security (Stateless), JWT (`jjwt 0.12.6`) Access Token + Refresh Token Rotation (`HttpOnly` cookie), BCrypt |
| **Database & Migration** | PostgreSQL 17 (`postgres:17-alpine`), Flyway (`V1` $\rightarrow$ `V13` + `db/seed`) |
| **Mapping & Boilerplate** | MapStruct `1.5.5.Final`, Lombok |
| **Frontend Core** | React `18.3`, TypeScript `5.6`, Vite `6.0`, React Router `6.28`, Axios `1.21`, TailwindCSS `3.4` + CSS Tokens |
| **Payment & AI** | VNPay Gateway `2.1.0` (`HMAC-SHA512`, Return URL + IPN), Refund Requests & StoreCredit Wallet, AI Assistant (`/api/v1/ai/**`) |
| **Testing & Quality** | JUnit 5, Mockito, Spring MockMvc, ArchUnit `1.5.0`, Vitest `5.1`, React Testing Library `16.3`, Playwright `1.65` |
| **DevOps & API Docs** | Docker & Docker Compose, Railway ([DEPLOY_RAILWAY.md](DEPLOY_RAILWAY.md)), GitHub Actions CI ([ci.yml](.github/workflows/ci.yml)), Swagger / OpenAPI 3 (`/swagger-ui.html`, `/v3/api-docs`), Postman Collection ([postman/](postman/)) |

---

## 2. Tính năng chính

- **Khách hàng (`ROLE_USER`):**
  - Đăng ký, đăng nhập, đổi mật khẩu, quản lý sổ địa chỉ giao hàng mặc định.
  - Duyệt/tìm kiếm/lọc laptop theo thương hiệu, danh mục, RAM, SSD, khoảng giá; xem chi tiết cấu hình & biến thể SKU.
  - Giỏ hàng đồng bộ DB: hiển thị ảnh/tồn kho/trạng thái mở bán, chọn mua một phần hoặc toàn bộ giỏ hàng.
  - Checkout nguyên tử: áp dụng mã giảm giá (`preview`), lưu ghi chú giao hàng, chống tạo đơn trùng qua `Idempotency-Key` (theo từng cặp `user_id + idempotency_key` + kiểm tra giỏ hàng/payload).
  - Thanh toán **COD**, **VNPay** (tự động tạo `Payment` đồng bộ transaction, hết hạn đơn online sau 15 phút, trang xác minh `/payment/vnpay-return`), hoặc ví **StoreCredit**.
  - Theo dõi lịch sử đơn hàng (lọc trạng thái + phân trang phía server), gửi yêu cầu hủy đơn COD / yêu cầu hoàn tiền kèm ảnh minh chứng, tích & đổi điểm **Loyalty** lấy coupon cá nhân, viết đánh giá sản phẩm đã giao (`DELIVERED`).
  - Trợ lý AI tư vấn cấu hình laptop.
- **Nhân viên & Quản trị (`ROLE_STAFF`, `ROLE_ADMIN`):**
  - Dashboard tổng hợp doanh thu & số lượng đơn hàng (`GET /api/v1/staff/orders/summary`).
  - Quản lý đơn hàng: tìm kiếm theo mã đơn/tên khách & lọc trạng thái phía server, xem trạng thái thanh toán từng đơn, chuyển trạng thái theo State Machine, duyệt yêu cầu hủy đơn COD, xác nhận thu tiền COD, xử lý trả hàng (`RETURNED`) và xét duyệt yêu cầu hoàn tiền (`ADMIN`, cộng vào `StoreCredit`).
  - Quản lý danh mục, thương hiệu, sản phẩm/biến thể, tồn kho (`stock_movements`), nhà cung cấp & phiếu nhập hàng (`purchase_orders`), mã giảm giá (`coupons`), kiểm duyệt đánh giá, quản lý tài khoản & phân quyền phân cấp (`ADMIN`).

---

## 3. Cấu trúc dự án

```text
LaptopStore/
├── .github/workflows/ci.yml         # CI tự động chạy Maven verify + Postgres 17 + Vitest + Playwright
├── backend/                         # Spring Boot Modular Monolith (cổng mặc định 8081)
│   ├── src/main/java/org/akira/laptopstore/
│   │   ├── auth/                    # Đăng nhập, đăng ký, refresh token rotation
│   │   ├── user/                    # Hồ sơ cá nhân, sổ địa chỉ, quản trị người dùng
│   │   ├── catalog/                 # Sản phẩm, biến thể (SKU), ảnh, thông số, brand, category
│   │   ├── cart/                    # Giỏ hàng & chọn sản phẩm checkout
│   │   ├── order/                   # Đặt hàng, preview, state machine, scheduler hết hạn, events
│   │   ├── payment/                 # COD, VNPay Gateway 2.1.0, IPN/Return, đồng bộ vòng đời đơn
│   │   ├── promotion/               # Mã giảm giá (Coupon) & lượt sử dụng
│   │   ├── inventory/               # Khóa tồn kho & sổ cái stock_movements
│   │   ├── procurement/             # Nhà cung cấp & phiếu nhập kho
│   │   ├── review/                  # Đánh giá sản phẩm sau khi giao
│   │   ├── ai/                      # Tư vấn sản phẩm bằng AI
│   │   ├── health/                  # Ping / Health check
│   │   ├── security/, config/, exception/, common/
│   ├── src/main/resources/
│   │   ├── application.properties   # Cấu hình DB, Flyway, JWT, VNPay, AI, Swagger, Upload
│   │   └── db/migration/            # Flyway SQL migrations (V1 -> V13)
│   ├── docs/                        # Tài liệu kiến trúc (01..12) & nghiệp vụ
│   ├── docker-compose.yml           # App + PostgreSQL 17 (cổng host DB mặc định 5434)
│   └── pom.xml
├── frontend/                        # React + TypeScript + Vite SPA (cổng mặc định 5173)
│   ├── src/
│   │   ├── app/                     # Router, AuthProvider, CartProvider
│   │   ├── components/              # UI primitives, navigation, layout
│   │   ├── modules/                 # auth, catalog, cart, order, payment, review, promotion, inventory, user...
│   │   └── services/                # Axios client & JWT refresh interceptor
│   ├── tests/e2e/                   # Playwright E2E specs & mockBackend
│   └── package.json
├── postman/                         # Postman Collection & Environment chuẩn
├── zip-project.bat                  # Script nén source sạch để sao lưu/bàn giao
└── README.md
```

---

## 4. Hướng dẫn chạy dự án (Quickstart)

### Yêu cầu tiên quyết
- **Docker Desktop** (nếu chạy container) hoặc:
  - **JDK 21 / 25**, **PostgreSQL 17**, **Node.js 22+ & npm** (nếu chạy local).

### Bước 1: Khởi động Database & Backend (`http://localhost:8081`)

#### Cách A — Chạy bằng Docker Compose (Khuyên dùng)
```powershell
cd backend
Copy-Item .env.example .env   # Điền DB_PASSWORD và các biến cần thiết
docker compose up -d --build
```
> Mặc định `docker-compose.yml` ánh xạ PostgreSQL ra cổng `5434` (`DB_HOST_PORT=5434`) để tránh trùng PostgreSQL cài sẵn trên Windows (`5432`).

#### Cách B — Chạy local bằng Maven Wrapper
```powershell
cd backend
# Đảm bảo PostgreSQL đã chạy và DB_HOST/DB_PORT/DB_NAME/DB_USERNAME/DB_PASSWORD khớp backend/.env
.\mvnw.cmd spring-boot:run
```
*(Nếu muốn nạp dữ liệu mẫu catalog khi dev, cấu hình `FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/seed` trong `backend/.env`.)*

### Bước 2: Khởi động Frontend (`http://localhost:5173`)
```powershell
cd frontend
npm install
npm run dev
```

### Bước 3: Tài liệu API tương tác (Swagger UI / OpenAPI 3)
- Swagger UI: `http://localhost:8081/swagger-ui.html` (hỗ trợ nút **Authorize** để dán JWT Bearer token khi demo)
- OpenAPI JSON: `http://localhost:8081/v3/api-docs`
- Mặc định `SWAGGER_ENABLED=true` (mở `permitAll` cho `GET`/`HEAD` trên `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**`). Khi muốn khóa tài liệu API trên production, đặt biến môi trường `SWAGGER_ENABLED=false`.

---

## 5. Cấu hình thanh toán VNPay Sandbox

Trong [backend/src/main/resources/application.properties](backend/src/main/resources/application.properties), các tham số VNPay nhận qua biến môi trường (có fallback demo cho local):

```properties
VNPAY_TMN_CODE=<ma_website_sandbox_cua_ban>
VNPAY_HASH_SECRET=<chuoi_bi_mat_hmac_sha512>
VNPAY_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return
VNPAY_IPN_URL=https://<domain-hoac-ngrok>/api/v1/payments/vnpay/ipn
```

> [!NOTE]
> Khi test IPN tự động trên máy cá nhân với cổng Sandbox thật, server VNPay cần gọi được tới backend qua HTTPS công khai (ví dụ dùng `ngrok http 8081` hoặc deploy lên server có domain). Luồng `Return URL` (`http://localhost:5173/payment/vnpay-return`) chạy trực tiếp trên trình duyệt local.

---

## 6. Kiểm thử & CI/CD

### Backend (`backend/`)
```powershell
# Chạy toàn bộ Unit, WebMvc & ArchUnit tests
.\mvnw.cmd test

# Chạy kèm E2E trên PostgreSQL thật (giống CI)
.\mvnw.cmd verify -Dcart.test.jdbc-url=jdbc:postgresql://localhost:5432/laptop_store -Dcart.test.username=postgres -Dcart.test.password=postgres
```

### Frontend (`frontend/`)
```powershell
npm test              # Vitest + React Testing Library
npm run build         # Kiểm tra TypeScript (tsc -b) & Vite production bundle
npm run test:e2e      # Playwright E2E (Chromium)
```

Mọi thao tác `push` / `pull_request` lên nhánh `main` được kiểm tra tự động qua [GitHub Actions CI](.github/workflows/ci.yml).

---

## 7. Kiến trúc, Phân công nhóm & Quy tắc phát triển

- Quy trình bắt buộc theo [GEMINI.md](GEMINI.md): **TDD (RED $\rightarrow$ GREEN $\rightarrow$ REFACTOR)**.
- Tài liệu kiến trúc chi tiết nằm tại [backend/docs/architecture/](backend/docs/architecture/):
  - Tổng quan & Tầng: [01-overview.md](backend/docs/architecture/01-overview.md), [02-structure-and-layers.md](backend/docs/architecture/02-structure-and-layers.md)
  - Ownership & Allowlist phụ thuộc: [03-ownership.md](backend/docs/architecture/03-ownership.md), [04-dependencies.md](backend/docs/architecture/04-dependencies.md)
  - Dữ liệu, Luồng nghiệp vụ, API & Bảo mật: [05-data-and-consistency.md](backend/docs/architecture/05-data-and-consistency.md), [06-business-flows.md](backend/docs/architecture/06-business-flows.md), [07-api-contracts.md](backend/docs/architecture/07-api-contracts.md), [08-security.md](backend/docs/architecture/08-security.md)
  - ERD & Entity Model (25 bảng baseline + 6 bảng mở rộng V10–V13): [11-entity-model.md](backend/docs/architecture/11-entity-model.md), [12-ERD-LaptopStore.md](backend/docs/architecture/12-ERD-LaptopStore.md)
- Phân công nhóm 4 người ([phan_chia_cong_viec.md](backend/docs/phan_chia_cong_viec.md)):
  - **Owner A:** `auth`, `user`, `security`, `config`, `exception`, `common`
  - **Owner B:** `catalog`, `inventory`, `procurement`
  - **Owner C:** `cart`, `order`
  - **Owner D:** `payment`, `promotion`, `review`

### Quy tắc vàng (Golden Rules)
1. **Không gọi Repository/Entity của module khác** — giao tiếp qua Service Contract và DTO; ArchUnit sẽ chặn build nếu vi phạm.
2. **Không quan hệ JPA xuyên module** — chỉ giữ ID kiểu `Long`, ràng buộc FK đặt ở Flyway SQL.
3. **Không sửa migration Flyway đã chạy/merge** — mọi thay đổi schema luôn tạo file `V<next>__*.sql` mới.
4. **Tiền tệ dùng `BigDecimal`, thời gian dùng `Instant` (UTC).**
5. **Controller mỏng, Transaction đặt ở Service** — không gọi cổng thanh toán bên thứ ba khi đang giữ khóa DB.
