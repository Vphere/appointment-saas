package org.vaidik.appointment.entity;

/**
 * Lifecycle status of a queued outbound email (see {@link EmailOutbox}).
 *
 *  PENDING -> first attempt not made yet (or queued for retry)
 *  SENT    -> delivered successfully to the SMTP server
 *  FAILED  -> at least one attempt failed, will be retried until maxRetries
 *  DEAD    -> exhausted all retries, requires manual attention
 */

public enum EmailStatus {
    PENDING,
    SENT,
    FAILED,
    DEAD
}