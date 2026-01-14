export function getInvoiceLifecycle(inv, opts = {}) {
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const staleDraftDays = Number.isFinite(opts.staleDraftDays) ? opts.staleDraftDays : 14;
  const dueSoonDays = Number.isFinite(opts.dueSoonDays) ? opts.dueSoonDays : 7;

  const rawStatus = String(inv?.status || 'pending').toLowerCase();
  const status = rawStatus === 'pending' ? 'draft' : rawStatus;

  const createdAtMs = inv?.date ? new Date(inv.date).getTime() : 0;
  const dueAtMs = inv?.dueDate ? new Date(inv.dueDate).getTime() : 0;

  const msPerDay = 24 * 60 * 60 * 1000;
  const ageDays = createdAtMs ? Math.floor((now - createdAtMs) / msPerDay) : null;

  const isPaid = status === 'paid';
  const isDraft = status === 'draft';

  const isOverdue = !isPaid && dueAtMs && dueAtMs < now;
  const isDueSoon =
    !isPaid &&
    dueAtMs &&
    dueAtMs >= now &&
    dueAtMs <= now + dueSoonDays * msPerDay;

  const isStaleDraft = isDraft && createdAtMs && now - createdAtMs >= staleDraftDays * msPerDay;

  let computedStatus = status;
  if (isOverdue) computedStatus = 'overdue';

  const flags = {
    isDraft,
    isPaid,
    isOverdue,
    isDueSoon,
    isStaleDraft,
  };

  const labels = [];
  if (isStaleDraft) labels.push('Stale draft');
  if (isDueSoon) labels.push('Due soon');
  if (isOverdue) labels.push('Overdue');

  return {
    status,
    computedStatus,
    labels,
    ageDays,
    dueAtMs,
    createdAtMs,
    ...flags,
  };
}
