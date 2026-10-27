const TONE: Record<string, string> = {
  PENDING_PAYMENT: 'bg-festival/15 text-festival-600',
  CONFIRMED: 'bg-sky/20 text-sky-600',
  PACKED: 'bg-royal/15 text-royal',
  DISPATCHED: 'bg-royal/15 text-royal',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-navy-900/10 text-navy-900/60',
  REFUNDED: 'bg-navy-900/10 text-navy-900/60',
  UNPAID: 'bg-vibrant/15 text-vibrant-600',
  ADVANCE_PAID: 'bg-festival/15 text-festival-600',
  PAID: 'bg-emerald-100 text-emerald-700',
};

/** Coloured badge for an order or payment status. */
export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider ${
        TONE[status] ?? 'bg-navy-900/10 text-navy-900/60'
      }`}
    >
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}
