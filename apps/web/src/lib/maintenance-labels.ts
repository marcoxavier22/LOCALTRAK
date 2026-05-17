import type { MaintenanceStatus, MaintenanceType } from '@/types';

export const maintenanceTypeLabels: Record<MaintenanceType, string> = {
  OIL_CHANGE: 'Troca de oleo',
  PREVENTIVE_REVIEW: 'Revisao preventiva',
  TIRES: 'Pneus',
  BRAKES: 'Freios',
  CUSTOM: 'Outro servico',
};

export const maintenanceStatusLabels: Record<MaintenanceStatus, string> = {
  DONE: 'Realizada',
  SCHEDULED: 'Agendada',
  OVERDUE: 'Vencida',
  CANCELED: 'Cancelada',
};

export function formatRuleInterval(intervalKm?: number | null, intervalDays?: number | null) {
  const parts = [];

  if (intervalKm) {
    parts.push(`${intervalKm.toLocaleString('pt-BR')} km`);
  }

  if (intervalDays) {
    parts.push(`${intervalDays} dias`);
  }

  return parts.length > 0 ? parts.join(' / ') : '-';
}

export function formatCurrency(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return '-';
  }

  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  }).format(numericValue);
}
