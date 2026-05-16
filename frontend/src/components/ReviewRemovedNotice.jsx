export default function ReviewRemovedNotice({ removalReason, removedAt }) {
  const date = removedAt
    ? new Date(removedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '10px',
      display: 'flex',
      gap: '10px',
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🛡️</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', marginBottom: '3px' }}>
          Review removed by admin
        </div>
        {removalReason && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>
            Reason: {removalReason}
          </div>
        )}
        {date && (
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Removed on {date}
          </div>
        )}
      </div>
    </div>
  );
}