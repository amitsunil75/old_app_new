import { subscriptionStatus, type Subscription, daysRemaining } from '@/lib/types';

export default function StatusBadge({ sub }: { sub: Subscription }) {
  const status = subscriptionStatus(sub);
  const days = daysRemaining(sub.expires_at);

  const styles = {
    active: 'bg-emerald-100 text-emerald-700',
    expiring: 'bg-amber-100 text-amber-700',
    critical: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
    inactive: 'bg-slate-100 text-slate-600',
  };

  const labels = {
    active: `Active · ${days}d left`,
    expiring: `Expiring · ${days}d left`,
    critical: `Critical · ${days}d left`,
    expired: 'Expired',
    inactive: 'Inactive',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
