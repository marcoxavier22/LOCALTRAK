'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { VehicleForm } from '@/components/VehicleForm';
import { apiFetch, toJsonBody } from '@/lib/api';
import { formatKm, vehicleStatusLabels } from '@/lib/vehicle-labels';
import type { Employee, UpdateVehiclePayload, Vehicle, VehicleStatus } from '@/types';

export default function EditVehiclePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.id]);

  function loadData() {
    setIsLoading(true);
    setError('');

    Promise.all([
      apiFetch<Vehicle>(`/company/vehicles/${params.id}`),
      apiFetch<Employee[]>('/company/employees'),
    ])
      .then(([selectedVehicle, companyEmployees]) => {
        setVehicle(selectedVehicle);
        setEmployees(companyEmployees);
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar o veiculo.'),
      )
      .finally(() => setIsLoading(false));
  }

  async function handleSubmit(payload: UpdateVehiclePayload) {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updatedVehicle = await apiFetch<Vehicle>(`/company/vehicles/${params.id}`, {
        method: 'PATCH',
        body: toJsonBody(payload),
      });

      setVehicle(updatedVehicle);
      setSuccess('Veiculo atualizado com sucesso.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel salvar o veiculo.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(status: VehicleStatus) {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updatedVehicle = await apiFetch<Vehicle>(`/company/vehicles/${params.id}/status`, {
        method: 'PATCH',
        body: toJsonBody({ status }),
      });

      setVehicle(updatedVehicle);
      setSuccess(`Status alterado para ${vehicleStatusLabels[status]}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel atualizar o status.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Editar veiculo">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{vehicle?.plate ?? 'Veiculo'}</h2>
            <p>
              {vehicle
                ? `${vehicle.brand} ${vehicle.model} - ${formatKm(vehicle.currentKm)}`
                : 'Atualize dados de cadastro, uso e status.'}
            </p>
          </div>
          <Link className="button secondary" href="/empresa/veiculos">
            Voltar
          </Link>
        </div>

        {vehicle ? (
          <div className="panel-note">
            Status atual: <StatusBadge status={vehicleStatusLabels[vehicle.status]} />
          </div>
        ) : null}
      </section>

      {isLoading ? <div className="panel-note">Carregando veiculo...</div> : null}
      {error ? <div className="form-message error">{error}</div> : null}
      {success ? <div className="form-message success">{success}</div> : null}

      {!isLoading && vehicle ? (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Status operacional</h2>
                <p>Altere rapidamente a disponibilidade do veiculo.</p>
              </div>
              <div className="table-actions">
                <button
                  className="button secondary small"
                  disabled={isSaving}
                  onClick={() => updateStatus('ACTIVE')}
                  type="button"
                >
                  Ativar
                </button>
                <button
                  className="button secondary small"
                  disabled={isSaving}
                  onClick={() => updateStatus('MAINTENANCE')}
                  type="button"
                >
                  Manutencao
                </button>
                <button
                  className="button danger small"
                  disabled={isSaving}
                  onClick={() => updateStatus('INACTIVE')}
                  type="button"
                >
                  Inativar
                </button>
              </div>
            </div>
          </section>

          <VehicleForm
            employees={employees}
            error=""
            initialVehicle={vehicle}
            isSubmitting={isSaving}
            key={`${vehicle.id}-${vehicle.updatedAt}-${vehicle.status}`}
            onCancel={() => router.push('/empresa/veiculos')}
            onSubmit={handleSubmit}
            submitLabel="Salvar alteracoes"
          />
        </>
      ) : null}
    </AppShell>
  );
}
