package org.vaidik.appointment.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.vaidik.appointment.dto.ChangePasswordRequest;
import org.vaidik.appointment.dto.UpdateProfileRequest;
import org.vaidik.appointment.dto.UpdateProfileResponse;
import org.vaidik.appointment.dto.UserProfileDTO;
import org.vaidik.appointment.service.UserProfileService;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<UserProfileDTO> getProfile(Authentication authentication) {
        return ResponseEntity.ok(userProfileService.getProfile(authentication.getName()));
    }

    /**
     * Updates the user's profile.
     *
     * Returns {@link UpdateProfileResponse} which extends the normal profile fields
     * with an optional {@code newToken} field.  The frontend MUST replace its
     * in-memory JWT with {@code newToken} when that field is non-null (i.e. when the
     * user changed their email address), so that subsequent API requests carry the
     * correct email as the Bearer subject.
     */
    @PutMapping("/profile")
    public ResponseEntity<UpdateProfileResponse> updateProfile(
            @RequestBody UpdateProfileRequest request,
            Authentication authentication) {
        UpdateProfileResponse response =
                userProfileService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        try {
            userProfileService.changePassword(authentication.getName(), request);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully."));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}