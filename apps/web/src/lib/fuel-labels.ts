import type { ReimbursementPaymentStatus, ReimbursementReport, VehicleFuelType } from '@/types';
import { vehicleFuelLabels } from './vehicle-labels';

export const fuelTypeLabels: Record<VehicleFuelType, string> = vehicleFuelLabels;

export const reimbursementPaymentStatusLabels: Record<ReimbursementPaymentStatus, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  CANCELED: 'Cancelado',
};

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

export function buildPeriodQuery(startDate: string, endDate: string) {
  const params = new URLSearchParams();

  if (startDate) {
    params.set('startDate', new Date(`${startDate}T00:00:00`).toISOString());
  }

  if (endDate) {
    params.set('endDate', new Date(`${endDate}T23:59:59`).toISOString());
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function emptyReimbursementReport(): ReimbursementReport {
  return {
    period: {
      startDate: null,
      endDate: null,
    },
    totals: {
      routesCount: 0,
      totalDistanceKm: 0,
      companyVehicleDistanceKm: 0,
      employeeVehicleDistanceKm: 0,
      totalFuelCost: 0,
      totalReimbursement: 0,
    },
    byEmployee: [],
    byVehicle: [],
    routes: [],
  };
}
