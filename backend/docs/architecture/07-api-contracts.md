# Quy ước API và lỗi

Đây là API **dự kiến**, chưa có endpoint nào trong source nghiệp vụ. Owner phải chốt request/response và quyền trước khi frontend tích hợp; OpenAPI sẽ là hợp đồng chạy được khi thêm dependency/cấu hình.

## Quy ước HTTP

Prefix `/api/v1`; public GET catalog; `/me` lấy actor từ token; `/staff` cho STAFF hoặc ADMIN; `/admin` chỉ ADMIN. Resource id không phải cơ chế phân quyền. POST tạo mới trả 201 và Location nếu thích hợp; GET/PATCH thành công trả 200; DELETE không có body trả 204.

Response thành công dùng DTO trực tiếp, danh sách dùng `PageResponse<T>`. Chưa tạo `ApiResponse<T>` wrapper chỉ vì bản tài liệu cũ có tên này; nếu đổi cần thống nhất thiết kế API đồng bộ với frontend. Phân trang page từ 0, size mặc định 20, tối đa 100; sort whitelist theo endpoint. Lỗi trang/size không hợp lệ trả 400; không truyền tùy ý tên cột vào SQL.

## Endpoint nền tảng đề xuất

| Method và path | Owner | Quyền/điều kiện |
|---|---|---|
| POST `/auth/register`, `/auth/login` | auth | Public; có rate limit |
| POST `/auth/refresh`, `/auth/logout` | auth | Refresh cookie và bảo vệ CSRF phù hợp |
| GET/PATCH `/me` | user | Đã xác thực, tài khoản hoạt động |
| GET/POST `/me/addresses` | user | Đã xác thực; ownership |
| PATCH/DELETE `/me/addresses/{id}` | user | Đã xác thực; ownership |
| GET `/products`, `/products/{id}`, `/brands`, `/categories` | catalog | Public; chỉ dữ liệu đang bán |
| POST/PATCH `/admin/products` hoặc `/admin/products/{id}` | catalog | ADMIN; không chỉnh stock trong DTO |
| GET `/me/cart`; POST `/me/cart/items`; PATCH/DELETE `/me/cart/items/{id}` | cart | USER; ownership |
| POST `/me/orders` | order | USER; Idempotency-Key bắt buộc |
| GET `/me/orders`, `/me/orders/{id}` | order | USER; ownership |
| POST `/me/orders/{id}/cancel` | order | Chủ đơn. COD ở `WAITING_CONFIRMATION`, `CONFIRMED` hoặc `PACKING`; VNPay ở `PENDING_PAYMENT` |
| GET `/staff/orders`; PUT `/staff/orders/{id}/status` | order | STAFF/ADMIN; chuyển trạng thái hoặc duyệt yêu cầu hủy |
| POST `/me/orders/{id}/payment-session` | payment | USER; ownership; online payable |
| POST `/staff/orders/{id}/cod-payment` | payment | STAFF/ADMIN; DELIVERED; chống lặp |
| Provider callback path theo adapter được chốt | payment | Xác minh provider; không dựa JWT khách |
| POST `/admin/inventory/adjustments` | inventory | ADMIN; lý do bắt buộc |
| GET `/staff/inventory/movements` | inventory | STAFF/ADMIN; phân trang |
| CRUD `/admin/suppliers` | procurement | ADMIN; ngừng hoạt động nếu đã được tham chiếu |
| POST `/staff/purchase-orders`; POST `/staff/purchase-orders/{id}/receive` | procurement | STAFF/ADMIN; state/idempotency |
| CRUD `/admin/coupons`; POST `/me/coupons/preview` | promotion | ADMIN quản lý; USER xem trước |
| GET `/products/{id}/reviews`; POST `/me/reviews` | review | Public GET; USER đã mua cho POST |
| PATCH `/staff/reviews/{id}/visibility` | review | STAFF/ADMIN; lý do kiểm duyệt |
| GET `/admin/users`; PATCH `/admin/users/{id}/status`, `/roles` | user | ADMIN; ghi audit thông tin thay đổi |

Các path trong bảng đều nối với `/api/v1`; `{id}` của user roles là `/admin/users/{id}/roles`. Đây là danh sách khởi đầu, không tuyên bố đầy đủ tất cả CRUD.

## Thông tin thẻ sản phẩm

`GET /api/v1/products/search` trả trang kết quả công khai. Mỗi phần tử `content` có thể chứa `cpu` và `screenSize` từ thông số sản phẩm. `availableConfiguration` chứa `ram`, `storage` và `price` của cấu hình đang bán, còn tồn và có giá thấp nhất. Nếu không có cấu hình như vậy, trường này là `null`. `startingPrice` tiếp tục biểu thị giá thấp nhất trong các biến thể của sản phẩm.

Khi mở hộp thoại thêm vào giỏ, frontend tải cấu hình hiện tại bằng `GET /api/v1/products/{id}`. `POST /api/v1/me/cart/items` nhận `productVariantId` và `quantity` rồi kiểm tra lại trạng thái và tồn kho của cấu hình.

## Ví dụ checkout

Header `Idempotency-Key: checkout-example-001`. Request không nhận giá/tổng/userId:

```json
{
  "addressId": 15,
  "paymentMethod": "COD",
  "couponCode": "STUDENT10"
}
```

Response 201 minh họa:

```json
{
  "id": 125,
  "orderCode": "ORD-20260918-000125",
  "status": "PENDING",
  "paymentStatus": "UNPAID",
  "subtotal": 24990000,
  "discountAmount": 500000,
  "shippingFee": 0,
  "totalAmount": 24490000,
  "createdAt": "2026-09-18T10:30:00Z"
}
```

Module thanh toán quản lý `payments.status` và `payments.method`. `orders.payment_method` lưu phương thức đã chọn khi đặt hàng để kiểm tra điều kiện yêu cầu hủy COD.

Retry cùng key/payload trả order cũ với 200; cùng key khác payload trả 409. BigDecimal được serialize dạng số JSON theo contract MVP VND; frontend không dùng số do nó tính làm số tiền authoritative.

## Yêu cầu hủy đơn COD

`POST /api/v1/me/orders/{id}/cancel` nhận query `reason` tùy chọn, tối đa 500 ký tự với đơn COD. Phản hồi `200` trả chi tiết đơn với trạng thái hiện tại và `cancellationRequestReason`. Gửi lại yêu cầu đang chờ duyệt trả về lý do đã lưu. API trả `404` nếu đơn nằm ngoài quyền sở hữu và `400` nếu trạng thái chưa đủ điều kiện. Đơn VNPay ở `PENDING_PAYMENT` vẫn được hủy ngay qua endpoint này.

STAFF/ADMIN duyệt qua `PUT /api/v1/staff/orders/{id}/status` với `{"status":"CANCELLED"}`. Phản hồi `200` trả chi tiết đơn đã hủy và xóa lý do khỏi trường chờ duyệt. Lịch sử trạng thái lưu lý do của khách và ID người duyệt. API trả `409 CANCELLATION_REQUEST_PENDING` nếu cố chuyển sang bước xử lý tiếp theo trong lúc chờ duyệt.

## Yêu cầu hoàn tiền

| Method và path (sau `/api/v1`) | Quyền | Kết quả |
|---|---|---|
| GET `/me/orders/{id}/refund-request` | Chủ đơn | `200` trả yêu cầu mới nhất, `204` khi chưa có |
| POST `/me/orders/{id}/refund-request` | Chủ đơn có thanh toán `PAID` | `201` trả yêu cầu `PENDING` |
| GET `/me/refund-requests/{id}/evidence/{evidenceId}` | Chủ đơn | `200` trả ảnh riêng tư |
| GET `/admin/refund-requests` | ADMIN | `200` trả danh sách phân trang, lọc theo `status` và `orderIds` tùy chọn |
| GET `/admin/refund-requests/{id}/evidence/{evidenceId}` | ADMIN | `200` trả ảnh riêng tư |
| PUT `/admin/refund-requests/{id}/decision` | ADMIN | `200` trả yêu cầu đã duyệt hoặc đã từ chối |

Gửi yêu cầu bằng `multipart/form-data` với `reason` từ 1–1.000 ký tự và tối đa 3 phần `images` tùy chọn. Mỗi ảnh JPEG hoặc PNG có dung lượng tối đa 5 MB và 20 triệu điểm ảnh. Số tiền lấy từ thanh toán. Yêu cầu có trường `evidenceIds` để tải từng ảnh theo quyền truy cập.

Phản hồi yêu cầu có `orderStatus` để hiển thị trạng thái giao hàng. Khi đơn đã giao và yêu cầu đang chờ duyệt, quản trị viên dùng `{"approved":true,"returnOrder":true}` sau khi đã nhận lại hàng. Backend kiểm tra lại trạng thái dưới khóa, chuyển đơn sang `RETURNED`, hoàn kho và cộng StoreCredit trong cùng transaction. Sai điều kiện trả `409 REFUND_ORDER_STATUS_CHANGED`. API cập nhật trạng thái đơn thông thường trả `409 RETURN_REQUIRES_REFUND_REVIEW` nếu đích là `RETURNED`.

Duyệt yêu cầu ở các trạng thái khác bằng `{"approved":true}`. Để từ chối, dùng `{"approved":false,"note":"Lý do từ chối"}`. Hệ thống lưu người xử lý và thời điểm. Yêu cầu được cộng tiền trả `creditedToStoreCredit: true`. Gửi lại cùng quyết định trả kết quả trước đó, gửi quyết định ngược lại trả `409 REFUND_REQUEST_REVIEWED`.

API trả `409 ORDER_NOT_PAID` nếu đơn chưa thanh toán và `409 REFUND_REQUEST_EXISTS` nếu đã có yêu cầu chờ duyệt hoặc đã duyệt. Khách có thể gửi yêu cầu mới sau khi bị từ chối.

## Ví StoreCredit

`GET /api/v1/me/store-credit` trả `balance` và tối đa 20 giao dịch gần đây của tài khoản đăng nhập. Ví chưa có giao dịch trả số dư 0 và danh sách rỗng.

`POST /api/v1/me/orders` nhận thêm `paymentMethod: "STORE_CREDIT"`. Backend trừ toàn bộ `totalAmount` từ ví trong cùng transaction tạo đơn. Đơn trả trạng thái `CONFIRMED`, payment là `PAID`. Nếu số dư thiếu, API trả `409 INSUFFICIENT_STORE_CREDIT` và rollback checkout. Áp dụng `Idempotency-Key` như các phương thức thanh toán khác.

## Response lỗi thống nhất

```json
{
  "timestamp": "2026-09-18T10:31:02Z",
  "status": 409,
  "code": "INSUFFICIENT_STOCK",
  "message": "Sản phẩm không đủ tồn kho",
  "path": "/api/v1/me/orders",
  "traceId": "example-trace-id",
  "fieldErrors": []
}
```

| Status | Code điển hình | Ý nghĩa |
|---|---|---|
| 400 | VALIDATION_ERROR | Request sai hình dạng/giá trị cơ bản |
| 401 | UNAUTHENTICATED | Thiếu/sai/hết hạn credential |
| 403 | ACCESS_DENIED | Có danh tính nhưng sai role |
| 404 | RESOURCE_NOT_FOUND | Không tồn tại hoặc tài nguyên cá nhân không thuộc actor |
| 409 | INSUFFICIENT_STOCK, PRODUCT_CHANGED, INVALID_ORDER_STATE, DUPLICATE_RESOURCE, IDEMPOTENCY_CONFLICT | Xung đột dữ liệu/trạng thái |
| 422 | COUPON_NOT_APPLICABLE | Không đáp ứng điều kiện coupon |
| 429 | RATE_LIMITED | Quá tần suất |
| 500 | INTERNAL_ERROR | Lỗi ngoài dự kiến, không trả chi tiết nội bộ |

GlobalExceptionHandler map lỗi MVC; security EntryPoint/AccessDeniedHandler dùng cùng cấu trúc cho filter. Không trả raw exception, SQL, token hoặc stack trace. Mã lỗi ổn định để frontend xử lý, message cho người dùng.
