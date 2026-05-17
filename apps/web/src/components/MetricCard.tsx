import type { LucideIcon } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  icon?: LucideIcon;
  tone?: 'blue' | 'green' | 'amber' | 'red';
};

export function MetricCard({ label, value, detail, icon: Icon, tone = 'blue' }: MetricCardProps) {
  return (
    <div className={`metric-card metric-card-${tone}`}>
      <div className="metric-card-head">
        <span>{label}</span>
        {Icon ? (
          <span className="metric-icon" aria-hidden="true">
            <Icon size={18} strokeWidth={2.4} />
          </span>
        ) : null}
      </div>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
