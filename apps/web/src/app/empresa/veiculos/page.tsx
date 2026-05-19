'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Car, Plus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { apiFetch } from '@/lib/api';
import {
  formatKm,
  formatNumber,
  vehicleFuelLabels,
  vehicleOwnershipLabels,
  vehicleStatusLabels,
  vehicleTypeLabels,
} from '@/lib/vehicle-labels';
import type { Vehicle } from '@/types';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadVehicles();
  }, []);

  function loadVehicles() {
    setIsLoading(true);
    setError('');

    apiFetch<Vehicle[]>('/company/vehicles')
      .then(setVehicles)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar veículos.'),
      )
      .finally(() => setIsLoading(false));
  }

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return vehicles.filter((vehicle) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        vehicle.plate.toLowerCase().includes(normalizedSearch) ||
        vehicle.brand.toLowerCase().includes(normalizedSearch) ||
        vehicle.model.toLowerCase().includes(normalizedSearch) ||
        (vehicle.employee?.name ?? '').toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Veículos">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Frota da empresa</h2>
            <p>Veículos próprios ou particulares usados por funcionários em campo.</p>
          </div>
          <Link className="button primary" href="/empresa/veículos/novo">
            <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
            Novo veículo
          </Link>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}
        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando veículos...
          </div>
        ) : null}

        <TableToolbar
          onSearchChange={setSearch}
          placeholder="Buscar por placa, marca, modelo ou funcionário"
          search={search}
        >
          <label className="inline-filter">
            Status
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="MAINTENANCE">Em manutenção</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>
        </TableToolbar>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Ano</th>
                <th>Tipo</th>
                <th>Proprietario</th>
                <th>Funcionário</th>
                <th>Km atual</th>
                <th>Combustível</th>
                <th>Consumo medio</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td>
                    <strong>{vehicle.plate}</strong>
                  </td>
                  <td>{vehicle.brand}</td>
                  <td>{vehicle.model}</td>
                  <td>{vehicle.year ?? '-'}</td>
                  <td>{vehicleTypeLabels[vehicle.type]}</td>
                  <td>{vehicleOwnershipLabels[vehicle.ownershipType]}</td>
                  <td>{vehicle.employee?.name ?? '-'}</td>
                  <td>{formatKm(vehicle.currentKm)}</td>
                  <td>{vehicle.fuelType ? vehicleFuelLabels[vehicle.fuelType] : '-'}</td>
                  <td>{vehicle.averageConsumption ? `${formatNumber(vehicle.averageConsumption, 2)} km/l` : '-'}</td>
                  <td>
                    <StatusBadge status={vehicleStatusLabels[vehicle.status]} />
                  </td>
                  <td>
                    <Link className="button secondary small" href={`/empresa/veículos/${vehicle.id}`}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredVehicles.length === 0 ? (
          <EmptyState
            action={
              vehicles.length === 0 ? (
                <Link className="button primary" href="/empresa/veículos/novo">
                  <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                  Novo veículo
                </Link>
              ) : undefined
            }
            icon={Car}
            title={vehicles.length === 0 ? 'Nenhum veículo cadastrado' : 'Nenhum veículo encontrado'}
            description={
              vehicles.length === 0
                ? 'Cadastre veículos da empresa ou particulares para vincular rotas, km e manutenções.'
                : 'Ajuste a busca ou o filtro de status para visualizar outros veículos.'
            }
          />
        ) : null}
      </section>
    </AppShell>
  );
}
