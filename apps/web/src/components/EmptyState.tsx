import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {Icon ? (
        <span className="empty-icon" aria-hidden="true">
          <Icon size={24} strokeWidth={2.2} />
        </span>
      ) : null}
      <strong>{title}</strong>
      <p>{description}</p>
      {action ? <div className="empty-actions">{action}</div> : null}
    </div>
  );
}
