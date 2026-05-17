type StatusBadgeProps = {
  status?: string | boolean | null;
  label?: string;
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const value =
    typeof status === 'boolean'
      ? status
        ? 'ATIVO'
        : 'INATIVO'
      : status ?? 'SEM_STATUS';
  const displayValue = label ?? String(value);

  return <span className={`status-badge status-${String(value).toLowerCase()}`}>{displayValue}</span>;
}
