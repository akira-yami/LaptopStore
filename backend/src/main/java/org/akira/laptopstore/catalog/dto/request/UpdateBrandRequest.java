package org.akira.laptopstore.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/*
 * =========================================================================
 * [TẠI SAO THAY ĐỔI & BẢN CHẤT NGHIỆP VỤ - UpdateBrandRequest]:
 * 1. Tại sao thay đổi:
 *    - Bổ sung @Builder, @NoArgsConstructor, @AllArgsConstructor đồng bộ với CreateBrandRequest.
 * 2. Giữ theo cách cũ thì ảnh hưởng xấu gì:
 *    - Gây lỗi biên dịch khi viết bài test tự động do không có constructor đủ tham số.
 * 3. Xử lý theo cách mới được lợi gì:
 *    - Hỗ trợ cú pháp Builder gọn gàng, tương thích tối đa với Jackson JSON Mapper và Mockito Test.
 * =========================================================================
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateBrandRequest {

    @NotBlank(message = "Tên thương hiệu không được để rỗng")
    private String name;
    
    private String description;
}

