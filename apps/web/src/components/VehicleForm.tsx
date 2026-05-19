'use client';

import { FormEvent, useState } from 'react';
import type {
  CreateVehiclePayload,
  Employee,
  Vehicle,
  VehicleFuelType,
  VehicleOwnershipType,
  VehicleStatus,
  VehicleType,
} from '@/types';
import {
  vehicleFuelLabels,
  vehicleOwnershipLabels,
  vehicleStatusLabels,
  vehicleTypeLabels,
} from '@/lib/vehicle-labels';

type VehicleFormState = {
  plate: string;
  brand: string;
  model: string;
  year: string;
  type: VehicleType;
  ownershipType: VehicleOwnershipType;
  employeeId: string;
  currentKm: string;
  fuelType: '' | VehicleFuelType;
  averageConsumption: string;
  costPerKm: string;
  status: VehicleStatus;
};

type VehicleFormProps = {
  employees: Employee[];
  error?: string;
  initialVehicle?: Vehicle | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateVehiclePayload) => Promise<void>;
  submitLabel: string;
};

const vehicleTypes = Object.keys(vehicleTypeLabels) as VehicleType[];
const ownershipTypes = Object.keys(vehicleOwnershipLabels) as VehicleOwnershipType[];
const fuelTypes = Object.keys(vehicleFuelLabels) as VehicleFuelType[];
const statuses = Object.keys(vehicleStatusLabels) as VehicleStatus[];

function toInputValue(value?: number | string | null) {
  return value === undefined || value === null ? '' : String(value);
}

function toNumberOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : Number(trimmed);
}

function createInitialState(vehicle?: Vehicle | null): VehicleFormState {
  return {
    plate: vehicle?.plate ?? '',
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    year: toInputValue(vehicle?.year),
    type: vehicle?.type ?? 'CAR',
    ownershipType: vehicle?.ownershipType ?? 'COMPANY',
    employeeId: vehicle?.employeeId ?? '',
    currentKm: toInputValue(vehicle?.currentKm),
    fuelType: vehicle?.fuelType ?? '',
    averageConsumption: toInputValue(vehicle?.averageConsumption),
    costPerKm: toInputValue(vehicle?.costPerKm),
    status: vehicle?.status ?? 'ACTIVE',
  };
}

export function VehicleForm({
  employees,
  error,
  initialVehicle,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
}: VehicleFormProps) {
  const [form, setForm] = useState(() => createInitialState(initialVehicle));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      plate: form.plate,
      brand: form.brand,
      model: form.model,
      year: toNumberOrUndefined(form.year),
      type: form.type,
      ownershipType: form.ownershipType,
      employeeId: form.employeeId || null,
      currentKm: toNumberOrUndefined(form.currentKm),
      fuelType: form.fuelType || undefined,
      averageConsumption: toNumberOrUndefined(form.averageConsumption),
      costPerKm: toNumberOrUndefined(form.costPerKm),
      status: form.status,
    });
  }

  return (
    <form className="panel form-grid" onSubmit={handleSubmit}>
      <div className="form-section">
        <div className="section-title">
          <h2>Identificacao</h2>
          <p>Dados principais usados para controle da frota e vinculo com funcionários.</p>
        </div>

        <div className="field-row">
          <label>
            Placa
            <input
              name="plate"
              onChange={(event) => setForm((current) => ({ ...current, plate: event.target.value }))}
              placeholder="ABC1D23"
              required
              value={form.plate}
            />
          </label>

          <label>
            Ano
            <input
              min="1900"
              name="year"
              onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
              placeholder="2022"
              type="number"
              value={form.year}
            />
          </label>
        </div>

        <div className="field-row">
          <label>
            Marca
            <input
              name="brand"
              onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
              placeholder="Fiat"
              required
              value={form.brand}
            />
          </label>

          <label>
            Modelo
            <input
              name="model"
              onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))}
              placeholder="Strada"
              required
              value={form.model}
            />
          </label>
        </div>

        <div className="field-row">
          <label>
            Tipo
            <select
              name="type"
              onChange={(event) =>
                setForm((current) => ({ ...current, type: event.target.value as VehicleType }))
              }
              value={form.type}
            >
              {vehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {vehicleTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              name="status"
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as VehicleStatus }))
              }
              value={form.status}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {vehicleStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div className="section-title">
          <h2>Uso e vinculo</h2>
          <p>Defina se o veículo e da empresa ou particular e associe um funcionário quando fizer sentido.</p>
        </div>

        <div className="field-row">
          <label>
            Proprietario
            <select
              name="ownershipType"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ownershipType: event.target.value as VehicleOwnershipType,
                }))
              }
              value={form.ownershipType}
            >
              {ownershipTypes.map((ownershipType) => (
                <option key={ownershipType} value={ownershipType}>
                  {vehicleOwnershipLabels[ownershipType]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Funcionário vinculado
            <select
              name="employeeId"
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              value={form.employeeId}
            >
              <option value="">Sem vinculo</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.email}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="form-section">
        <div className="section-title">
          <h2>Quilometragem e custos</h2>
          <p>Estes dados alimentam estimativas de consumo, reembolso e manutenção futura.</p>
        </div>

        <div className="field-row">
          <label>
            Km atual
            <input
              min="0"
              name="currentKm"
              onChange={(event) => setForm((current) => ({ ...current, currentKm: event.target.value }))}
              placeholder="49500"
              step="0.01"
              type="number"
              value={form.currentKm}
            />
          </label>

          <label>
            Combustível
            <select
              name="fuelType"
              onChange={(event) =>
                setForm((current) => ({ ...current, fuelType: event.target.value as '' | VehicleFuelType }))
              }
              value={form.fuelType}
            >
              <option value="">Não informado</option>
              {fuelTypes.map((fuelType) => (
                <option key={fuelType} value={fuelType}>
                  {vehicleFuelLabels[fuelType]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label>
            Consumo medio
            <input
              min="0"
              name="averageConsumption"
              onChange={(event) =>
                setForm((current) => ({ ...current, averageConsumption: event.target.value }))
              }
              placeholder="10.5"
              step="0.01"
              type="number"
              value={form.averageConsumption}
            />
          </label>

          <label>
            Custo por km
            <input
              min="0"
              name="costPerKm"
              onChange={(event) => setForm((current) => ({ ...current, costPerKm: event.target.value }))}
              placeholder="1.20"
              step="0.01"
              type="number"
              value={form.costPerKm}
            />
          </label>
        </div>
      </div>

      {error ? <div className="form-message error">{error}</div> : null}

      <div className="form-actions">
        <button className="button secondary" onClick={onCancel} type="button">
          Cancelar
        </button>
        <button className="button primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Salvando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
