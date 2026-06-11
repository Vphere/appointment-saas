package org.vaidik.appointment.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class CreateOrderResponse {
    private String orderId;          // Razorpay order ID
    private BigDecimal amount;       // Full service price (paise for Razorpay, rupees for display)
    private BigDecimal depositAmount;// What customer actually pays now
    private String currency;
    private String keyId;            // Frontend needs this to open checkout
    private String businessName;
    private String serviceName;
    private String customerName;
    private String customerEmail;
}