package org.akira.laptopstore.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * =========================================================================
 * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - CreateBrandRequest]:
 * 1. Tại sao thay đổi:
 *    - Bổ sung @Builder, @NoArgsConstructor, @AllArgsConstructor.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Thiếu constructor có tham số và Builder khiến mã kiểm thử (Unit test) và code khởi tạo
 *      không thể khởi tạo nhanh DTO dạng `new CreateBrandRequest("name", "desc")` hay `.builder().build()`,
 *      dẫn đến lỗi biên dịch trong test suite của dự án.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Đầy đủ constructor hỗ trợ cả serialization của Jackson (cần NoArgsConstructor)
 *      lẫn tính tiện dụng khi viết Unit Test và tích hợp code.
 * =========================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBrandRequest {

    @NotBlank(message = "Tên thương hiệu không được để rỗng")
    private String name;
    
    private String description;
}
