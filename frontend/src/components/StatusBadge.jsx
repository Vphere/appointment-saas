const STATUS_MAP = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export default function StatusBadge({ status }) {
  const cls = STATUS_MAP[status?.toUpperCase()] || 'pending';
  return (
    <span className={`badge badge-${cls}`}>{status}</span>
  );
}
