import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApprovedBusinesses } from '../api/business';
import { getAverageRating } from '../api/reviews';
import Spinner from '../components/Spinner';
import './BusinessList.css';

function BusinessCard({ business, onClick }) {
  const [rating, setRating] = useState(null);

  useEffect(() => {
    getAverageRating(business.id)
      .then((res) => setRating(res.data))
      .catch(() => {});
  }, [business.id]);

  const categoryIcons = {
    salon: '💇', spa: '💆', fitness: '🏋️', medical: '🏥',
    restaurant: '🍽️', cleaning: '🧹', beauty: '💅', default: '🏪',
  };
  const icon = categoryIcons[business.category?.toLowerCase()] || categoryIcons.default;

  return (
    <div className="business-card card-hover" onClick={onClick} style={{ cursor: 'pointer' }}>
      <div className="business-card-image">
        <span>{icon}</span>
      </div>
      <div className="business-card-body">
        <h3 className="business-card-name">{business.name}</h3>
        <p className="business-card-desc">{business.description || 'Quality services for you'}</p>
        <div className="business-card-meta">
          <span className="business-card-city">📍 {business.city || business.location || 'N/A'}</span>
          <span style={{ color: '#F59E0B', fontWeight: 600 }}>
            ★ {rating ? Number(rating).toFixed(1) : '–'}
          </span>
        </div>
        <button className="btn btn-outline btn-full">View Details →</button>
      </div>
    </div>
  );
}

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getApprovedBusinesses()
      .then((res) => setBusinesses(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = businesses.filter(
    (b) =>
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.city?.toLowerCase().includes(search.toLowerCase()) ||
      b.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="page-container"><Spinner message="Loading businesses..." /></div>;

  return (
    <div className="page-container">
      <div className="page-header flex-between flex-wrap" style={{ gap: 12 }}>
        <div>
          <h1 className="page-title">Discover Businesses</h1>
          <p className="page-subtitle">{businesses.length} businesses available near you</p>
        </div>
        <input
          className="form-input"
          style={{ maxWidth: 280 }}
          placeholder="🔍 Search businesses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏙️</div>
          <h3>No businesses found</h3>
          <p>Try adjusting your search</p>
        </div>
      ) : (
        <div className="grid grid-3">
          {filtered.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              onClick={() => navigate(`/business/${b.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}