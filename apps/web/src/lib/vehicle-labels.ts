import type { VehicleFuelType, VehicleOwnershipType, VehicleStatus, VehicleType } from '@/types';

export const vehicleTypeLabels: Record<VehicleType, string> = {
  CAR: 'Carro',
  MOTORCYCLE: 'Moto',
  VAN: 'Van',
  TRUCK: 'Caminhao',
  PICKUP: 'Caminhonete',
  OTHER: 'Outro',
};

export const vehicleOwnershipLabels: Record<VehicleOwnershipType, string> = {
  COMPANY: 'Empresa',
  EMPLOYEE: 'Funcionário',
};

export const vehicleFuelLabels: Record<VehicleFuelType, string> = {
  GASOLINE: 'Gasolina',
  ETHANOL: 'Etanol',
  DIESEL: 'Diesel',
  FLEX: 'Flex',
  ELECTRIC: 'Eletrico',
  HYBRID: 'Hibrido',
  OTHER: 'Outro',
};

export const vehicleStatusLabels: Record<VehicleStatus, string> = {
  ACTIVE: 'Ativo',
  MAINTENANCE: 'Manutenção',
  INACTIVE: 'Inativo',
};

export function formatNumber(value?: number | string | null, digits = 2) {
  if (value === undefined || value === null || value === '') {
    return '-';
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return '-';
  }

  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(numberValue);
}

export function formatKm(value?: number | string | null) {
  return `${formatNumber(value, 2)} km`;
}
