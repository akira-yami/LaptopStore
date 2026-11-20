package org.akira.laptopstore.catalog.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

/*
 * =========================================================================
 * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - VariantSnapshot]:
 * 1. Tại sao thay đổi:
 *    - Thêm trường `private Boolean active;` để phản ánh trạng thái kinh doanh thực tế
 *      (Đang bán hay Ngừng kinh doanh/Tạm ẩn) của từng biến thể laptop.
 *    - Bổ sung @NoArgsConstructor, @AllArgsConstructor đồng bộ.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Cách cũ không trả về trường `active`, UI phía Frontend Admin không biết biến thể nào
 *      đang bật hay tắt bán để hiển thị Badge (Đang bán / Ngừng bán) hoặc nút gạt tương ứng.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Cung cấp dữ liệu minh bạch, chuẩn xác cho màn hình quản trị biến thể.
 * =========================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VariantSnapshot {
    private Long id;
    private String sku, ram, storage, color, status;
    private BigDecimal price;
    private Integer quantity;
    // Trạng thái hoạt động/kinh doanh của biến thể (true: Đang bán, false: Ngừng bán)
    private Boolean active;
}

