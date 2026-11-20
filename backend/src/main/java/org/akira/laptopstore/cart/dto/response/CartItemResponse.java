package org.akira.laptopstore.cart.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CartItemResponse {
    private Long cartItemId;          // ID dòng giỏ hàng dùng cho PATCH/DELETE
    private Long productId;           // ID sản phẩm để liên kết thẳng trang chi tiết, bỏ hack tìm theo SKU
    private Long variantId;           // ID biến thể sản phẩm
    private String productName;
    private String sku;
    private String variantName;
    private String thumbnailImage;    // Ảnh đại diện sản phẩm lấy batch từ catalog
    private Integer quantity;         // Số lượng sản phẩm trong giỏ
    private Integer availableStock;   // Tồn kho hiện khả dụng của biến thể để FE giới hạn nút +
    private boolean sellable;         // Còn đang mở bán hay đã ngừng kinh doanh/bị xóa
    private BigDecimal unitPrice;
    private BigDecimal lineTotal;

    public CartItemResponse(
            Long cartItemId,
            Long variantId,
            String productName,
            String sku,
            String variantName,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal lineTotal
    ) {
        this(cartItemId, null, variantId, productName, sku, variantName, null,
                quantity, null, true, unitPrice, lineTotal);
    }
}
