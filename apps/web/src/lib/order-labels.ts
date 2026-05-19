import type { ServiceOrderStatus, ServiceOrderStopStatus } from '@/types';

export const orderStatusLabels: Record<ServiceOrderStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizada',
  CANCELED: 'Cancelada',
};

export const orderStopStatusLabels: Record<ServiceOrderStopStatus, string> = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluído',
};

export function formatOdometer(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString('pt-BR')} km` : '-';
}
