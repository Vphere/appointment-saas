package org.vaidik.appointment.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email"),
        @Index(name = "idx_user_role", columnList = "role")
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true)
    private String email;

    private String password;
    private String phone;
    private String address;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AuthProvider provider = AuthProvider.LOCAL;

    // ── Soft-delete fields (same pattern as Business entity) ─────────────────
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deletion_reason", length = 500, columnDefinition = "TEXT")
    private String deletionReason;

    @Transient
    public boolean isDeleted() {
        return deletedAt != null;
    }
}