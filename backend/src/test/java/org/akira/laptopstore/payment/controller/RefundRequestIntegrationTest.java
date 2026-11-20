package org.akira.laptopstore.payment.controller;

import org.akira.laptopstore.security.principal.CustomUserDetails;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@EnabledIfSystemProperty(named = "cart.test.jdbc-url", matches = ".+")
@SpringBootTest(properties = "app.ai.enabled=false")
@AutoConfigureMockMvc
class RefundRequestIntegrationTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", () -> System.getProperty("cart.test.jdbc-url"));
        properties.add("spring.datasource.username", () -> System.getProperty("cart.test.username", "postgres"));
        properties.add("spring.datasource.password", () -> System.getProperty("cart.test.password", "postgres"));
    }

    @Autowired private MockMvc mvc;
    @Autowired private JdbcTemplate jdbc;
    private CustomUserDetails owner;
    private CustomUserDetails stranger;
    private CustomUserDetails admin;
    private CustomUserDetails staff;
    private Long orderId;

    @BeforeEach
    void setUp() {
        owner = createUser("USER");
        stranger = createUser("USER");
        admin = createUser("ADMIN");
        staff = createUser("STAFF");
        orderId = jdbc.queryForObject("""
                INSERT INTO orders (user_id, order_code, status, subtotal, total_amount,
                                    recipient_name, recipient_phone, shipping_address, payment_method)
                VALUES (?, ?, 'CONFIRMED', 100000, 100000, 'Buyer', '0900000000', 'Address', 'VNPAY')
                RETURNING id
                """, Long.class, owner.getId(), UUID.randomUUID().toString());
        jdbc.update("INSERT INTO payments (order_id, method, amount, status) VALUES (?, 'VNPAY', 100000, 'PAID')",
                orderId);
    }

    @Test
    void customerSubmitsProofAndAdminCanApproveOrReject() throws Exception {
        String ownRequest = "/api/v1/me/orders/" + orderId + "/refund-request";
        mvc.perform(get(ownRequest).with(user(owner))).andExpect(status().isNoContent());
        mvc.perform(get(ownRequest).with(user(stranger))).andExpect(status().isForbidden());

        var png = image("png", "image/png");
        var jpeg = image("jpeg", "image/jpeg");
        var submitted = mvc.perform(multipart(ownRequest).file(png).file(jpeg)
                        .param("reason", " Máy giao bị lỗi ").with(user(owner)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.amount").value(100000))
                .andExpect(jsonPath("$.reason").value("Máy giao bị lỗi"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.evidenceIds.length()").value(2))
                .andReturn();
        long requestId = jsonLong(submitted, "$.id");
        long firstEvidenceId = jsonLong(submitted, "$.evidenceIds[0]");
        long secondEvidenceId = jsonLong(submitted, "$.evidenceIds[1]");
        String ownImage = "/api/v1/me/refund-requests/" + requestId + "/evidence/" + firstEvidenceId;
        String adminRequest = "/api/v1/admin/refund-requests/" + requestId;

        mvc.perform(put(adminRequest + "/decision").with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true,\"returnOrder\":true}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REFUND_ORDER_STATUS_CHANGED"));
        jdbc.update("UPDATE orders SET status = 'DELIVERED' WHERE id = ?", orderId);
        mvc.perform(put("/api/v1/staff/orders/" + orderId + "/status").with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"RETURNED\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RETURN_REQUIRES_REFUND_REVIEW"));

        mvc.perform(get(ownImage).with(user(owner)))
                .andExpect(status().isOk()).andExpect(content().contentType("image/png"))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().bytes(png.getBytes()));
        mvc.perform(get(ownImage).with(user(stranger))).andExpect(status().isForbidden());
        mvc.perform(get(adminRequest + "/evidence/" + secondEvidenceId).with(user(admin)))
                .andExpect(status().isOk()).andExpect(content().contentType("image/jpeg"))
                .andExpect(content().bytes(jpeg.getBytes()));
        mvc.perform(get(adminRequest + "/evidence/" + secondEvidenceId).with(user(staff)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/admin/refund-requests").param("status", "PENDING")
                        .param("orderIds", orderId + ",0").with(user(admin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(requestId))
                .andExpect(jsonPath("$.content[0].orderStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.content[0].reason").value("Máy giao bị lỗi"))
                .andExpect(jsonPath("$.content[0].evidenceIds.length()").value(2));

        mvc.perform(multipart(ownRequest).param("reason", "Gửi trùng").with(user(owner)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REFUND_REQUEST_EXISTS"));
        mvc.perform(put(adminRequest + "/decision").with(user(staff))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true,\"returnOrder\":true}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(adminRequest + "/decision").with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":false}"))
                .andExpect(status().isBadRequest());
        mvc.perform(put(adminRequest + "/decision").with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("""
                                {"approved":false,"note":"Cần xác minh thêm"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.orderStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.creditedToStoreCredit").value(false))
                .andExpect(jsonPath("$.reviewedByUserId").value(admin.getId()));
        mvc.perform(get("/api/v1/me/store-credit").with(user(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(0));
        mvc.perform(get(ownRequest).with(user(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reviewNote").value("Cần xác minh thêm"));

        var resubmission = mvc.perform(multipart(ownRequest).param("reason", "Bổ sung thông tin").with(user(owner)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING")).andReturn();
        long newRequestId = jsonLong(resubmission, "$.id");
        String decision = "/api/v1/admin/refund-requests/" + newRequestId + "/decision";
        mvc.perform(get("/api/v1/admin/refund-requests/" + newRequestId + "/evidence/" + firstEvidenceId).with(user(admin)))
                .andExpect(status().isNotFound());
        mvc.perform(put(decision).with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REFUND_ORDER_STATUS_CHANGED"));
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(put(decision).with(user(admin))
                            .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true,\"returnOrder\":true}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"))
                    .andExpect(jsonPath("$.orderStatus").value("RETURNED"))
                    .andExpect(jsonPath("$.creditedToStoreCredit").value(true));
        }
        mvc.perform(get("/api/v1/me/store-credit").with(user(owner)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(100000))
                .andExpect(jsonPath("$.entries.length()").value(1))
                .andExpect(jsonPath("$.entries[0].kind").value("REFUND"));
        mvc.perform(get("/api/v1/me/store-credit").with(user(stranger)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(0));
        mvc.perform(get("/api/v1/me/store-credit")).andExpect(status().isUnauthorized());
        mvc.perform(put(decision).with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":false,\"note\":\"Khác\"}"))
                .andExpect(status().isConflict());
        mvc.perform(multipart(ownRequest).param("reason", "Gửi lại").with(user(owner)))
                .andExpect(status().isConflict());
        assertEquals("PAID", jdbc.queryForObject("SELECT status FROM payments WHERE order_id = ?", String.class, orderId));
    }

    @Test
    void approvesRefundBeforeDeliveryWithoutAStockReturn() throws Exception {
        var submitted = mvc.perform(multipart("/api/v1/me/orders/" + orderId + "/refund-request")
                        .param("reason", "Hoàn tiền trước khi giao").with(user(owner)))
                .andExpect(status().isCreated()).andReturn();
        long requestId = jsonLong(submitted, "$.id");

        mvc.perform(put("/api/v1/admin/refund-requests/" + requestId + "/decision").with(user(admin))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"approved\":true}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.orderStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.creditedToStoreCredit").value(true));
    }

    @Test
    void rejectsUnpaidOrdersAndInvalidUploads() throws Exception {
        String ownRequest = "/api/v1/me/orders/" + orderId + "/refund-request";
        mvc.perform(multipart(ownRequest).param("reason", "Thử gửi").with(user(stranger)))
                .andExpect(status().isForbidden());
        mvc.perform(multipart(ownRequest).param("reason", " ").with(user(owner)))
                .andExpect(status().isBadRequest());
        var notAnImage = new MockMultipartFile("images", "proof.png", "image/png", new byte[]{1, 2, 3});
        mvc.perform(multipart(ownRequest).file(notAnImage).param("reason", "Tệp lỗi").with(user(owner)))
                .andExpect(status().isBadRequest());
        mvc.perform(get(ownRequest).with(user(owner))).andExpect(status().isNoContent());
        jdbc.update("UPDATE payments SET status = 'PENDING' WHERE order_id = ?", orderId);
        mvc.perform(multipart(ownRequest).param("reason", "Chưa thanh toán").with(user(owner)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("ORDER_NOT_PAID"));
    }

    private CustomUserDetails createUser(String role) {
        String email = UUID.randomUUID() + "@example.com";
        Long id = jdbc.queryForObject("""
                INSERT INTO users (email, password_hash, full_name, status)
                VALUES (?, 'hash', 'Refund test', 'ACTIVE') RETURNING id
                """, Long.class, email);
        return new CustomUserDetails(id, email, "unused", 0, "ACTIVE", List.of(new SimpleGrantedAuthority("ROLE_" + role)));
    }

    private MockMultipartFile image(String format, String mimeType) throws Exception {
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3, 3, BufferedImage.TYPE_INT_RGB), format, bytes);
        return new MockMultipartFile("images", "proof." + format, mimeType, bytes.toByteArray());
    }

    private long jsonLong(MvcResult result, String path) throws Exception {
        Number value = com.jayway.jsonpath.JsonPath.read(result.getResponse().getContentAsString(), path);
        return value.longValue();
    }
}
