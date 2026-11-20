package org.akira.laptopstore.catalog.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBrandRequest {
    @NotBlank(message = "Tên thương hiệu không được để rỗng")
    private String name;
    
    private String description;
}
