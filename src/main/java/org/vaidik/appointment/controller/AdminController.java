package org.vaidik.appointment.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.AdminStatsResponse;
import org.vaidik.appointment.dto.RemoveReviewRequest;
import org.vaidik.appointment.dto.ReviewResponse;
import org.vaidik.appointment.dto.UserProfileDTO;
import org.vaidik.appointment.service.AdminService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {

    private final AdminService adminService;

    // ── Dashboard Stats ──────────────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<AdminStatsResponse> getStats() {
        return ResponseEntity.ok(adminService.getAdminStats());
    }

    // ── User Management ───────────────────────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<List<UserProfileDTO>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<UserProfileDTO> updateUserRole(
            @PathVariable("id") Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(adminService.updateUserRole(id, body.get("role")));
    }

    /**
     * Soft-deletes a user. Preserves appointments, payments, reviews —
     * but cancels any PENDING/CONFIRMED/AWAITING_REMAINING_PAYMENT
     * appointments and emails the user + affected business owner(s).
     * Body: { "reason": "Violated terms of service" } (optional)
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<UserProfileDTO> deleteUser(
            @PathVariable("id") Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String reason = (body != null) ? body.get("reason") : null;
        return ResponseEntity.ok(adminService.deleteUser(id, reason));
    }

    /**
     * Restores a soft-deleted user — they can log in again immediately.
     */
    @PutMapping("/users/{id}/restore")
    public ResponseEntity<UserProfileDTO> restoreUser(@PathVariable("id") Long id) {
        return ResponseEntity.ok(adminService.restoreUser(id));
    }

    // ── Review Moderation ─────────────────────────────────────────────────────
    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewResponse>> getAllReviews() {
        return ResponseEntity.ok(adminService.getAllReviews());
    }

    // Soft-delete: marks review as removed with a reason (does NOT delete from DB)
    @PutMapping("/reviews/{id}/remove")
    public ResponseEntity<ReviewResponse> removeReview(
            @PathVariable("id") Long id, @RequestBody RemoveReviewRequest request) {
        return ResponseEntity.ok(adminService.removeReview(id, request));
    }

    // Restore a previously removed review
    @PutMapping("/reviews/{id}/restore")
    public ResponseEntity<ReviewResponse> restoreReview(@PathVariable("id") Long id) {
        return ResponseEntity.ok(adminService.restoreReview(id));
    }
}