package org.vaidik.appointment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "brevo")
public class BrevoEmailSender implements EmailTransport {

    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    private final ObjectMapper objectMapper;

    @Value("${brevo.api-key:}")
    private String apiKey;

    @Value("${app.mail.from-address}")
    private String fromAddress;

    @Value("${app.mail.from-name:BookEase}")
    private String fromName;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public void send(String to, String subject, String html) throws Exception {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException(
                    "BREVO_API_KEY is not configured but app.mail.provider=brevo. " +
                            "Set the BREVO_API_KEY environment variable (see Brevo dashboard -> SMTP & API -> API Keys).");
        }
        if (fromAddress == null || fromAddress.isBlank()) {
            throw new IllegalStateException(
                    "MAIL_FROM_ADDRESS is not configured. Set it to a sender address verified in your Brevo account.");
        }

        Map<String, Object> payload = Map.of(
                "sender", Map.of("name", fromName, "email", fromAddress),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", html
        );

        String body = objectMapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(BREVO_API_URL))
                .header("api-key", apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new RuntimeException(
                    "Brevo API error (HTTP " + response.statusCode() + "): " + response.body());
        }
    }
}