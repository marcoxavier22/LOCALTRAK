import type { RoutePoint, RouteShiftStatus, RouteVehicle } from '@/types';
import { formatKm, formatNumber } from './vehicle-labels';

export const routeStatusLabels: Record<RouteShiftStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizada',
  SYNC_PENDING: 'Sincronizacao pendente',
  ERROR: 'Erro',
};

export const trackingStatusLabels: Record<string, string> = {
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausado',
  FINISHED: 'Finalizado',
  ERROR: 'Erro',
};

export function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDuration(minutes?: number | null) {
  if (minutes === undefined || minutes === null) {
    return '-';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours <= 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}min`;
}

export function formatRouteDistance(value?: number | string | null) {
  return formatKm(value);
}

export function formatVehicleName(vehicle?: RouteVehicle | null) {
  if (!vehicle) {
    return 'Sem veículo';
  }

  return `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`;
}

export function formatCoordinate(value?: number | string | null) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return formatNumber(value, 6);
}

export function formatPointDetails(point: RoutePoint) {
  const details = [
    point.accuracy ? `precisao ${formatNumber(point.accuracy, 1)} m` : null,
    point.speed ? `vel. ${formatNumber(point.speed, 1)} m/s` : null,
    point.altitude ? `alt. ${formatNumber(point.altitude, 0)} m` : null,
    point.batteryLevel ? `bateria ${formatNumber(point.batteryLevel, 0)}%` : null,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' - ') : 'Sem metadados adicionais';
}
