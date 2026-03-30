import { useState } from 'react';
import { StarRating } from './StarRating';
import { submitReview } from '../api/reviews';

export default function ReviewModal({ appointment, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) return setError('Please select a rating');
    setLoading(true);
    setError('');
    try {
      await submitReview({
        appointmentId: appointment.id,
        businessId: appointment.businessId,
        rating,
        comment,
      });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 className="modal-title">Leave a Review ✨</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: 8 }}>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: 4 }}>
            {appointment?.businessName}
          </p>
          <p className="text-muted" style={{ fontSize: '0.8rem' }}>
            {appointment?.serviceName}
          </p>
        </div>

        <div className="form-group" style={{ marginTop: 20 }}>
          <label className="form-label">Your Rating</label>
          <StarRating value={rating} onChange={setRating} size="1.8rem" />
        </div>

        <div className="form-group">
          <label className="form-label">Your Comment</label>
          <textarea
            className="form-textarea"
            placeholder="Tell others about your experience..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : '⭐ Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
