import { useState } from 'react';

export function StarRating({ value, onChange, readonly = false, size = '1.4rem' }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star${(hovered || value) >= star ? ' filled' : ''}${!readonly ? ' interactive' : ''}`}
          style={{ fontSize: size, cursor: readonly ? 'default' : 'pointer' }}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function RatingDisplay({ rating, count }) {
  return (
    <div className="rating-display">
      <span className="rating-value">★ {rating ? Number(rating).toFixed(1) : '–'}</span>
      {count !== undefined && (
        <span className="text-muted" style={{ fontSize: '0.8rem' }}>({count} reviews)</span>
      )}
    </div>
  );
}
