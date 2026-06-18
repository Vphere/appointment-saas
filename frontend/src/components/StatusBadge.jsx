// frontend/src/components/StatusBadge.jsx

const STATUS_CONFIG = {
  PENDING:                    { label: 'Pending',                   cls: 'pending'   },
  CONFIRMED:                  { label: 'Confirmed',                  cls: 'confirmed' },
  COMPLETED:                  { label: 'Completed',                  cls: 'completed' },
  CANCELLED:                  { label: 'Cancelled',                  cls: 'cancelled' },
  AWAITING_REMAINING_PAYMENT: { label: 'Awaiting Remaining Payment', cls: 'awaiting' },
  APPROVED:                   { label: 'Approved',                   cls: 'approved'  },
  REJECTED:                   { label: 'Rejected',                   cls: 'rejected'  },
};

function humanize(status) {
  if (!status) return '—';
  const key = status.toUpperCase().replace(/\s+/g, '_');
  if (STATUS_CONFIG[key]) return STATUS_CONFIG[key].label;
  // fallback: replace underscores with spaces and title-case each word
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function StatusBadge({ status }) {
  const key = status?.toUpperCase().replace(/\s+/g, '_');
  const cfg = STATUS_CONFIG[key] || { label: humanize(status), cls: 'pending' };
  return (
    <span className={`badge badge-${cfg.cls}`}>
      STATUS: {cfg.label}
    </span>
  );
}