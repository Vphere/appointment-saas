export default function Spinner({ message = 'Loading...' }) {
  return (
    <div className="spinner-container" style={{ flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <p className="text-muted" style={{ fontSize: '0.875rem' }}>{message}</p>
    </div>
  );
}
