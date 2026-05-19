'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { VehicleForm } from '@/components/VehicleForm';
import { apiFetch, toJsonBody } from '@/lib/api';
import type { CreateVehiclePayload, Employee, Vehicle } from '@/types';

export default function NewVehiclePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<Employee[]>('/company/employees')
      .then(setEmployees)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar funcionários.'),
      )
      .finally(() => setIsLoadingEmployees(false));
  }, []);

  async function handleSubmit(payload: CreateVehiclePayload) {
    setError('');
    setIsSubmitting(true);

    try {
      await apiFetch<Vehicle>('/company/vehicles', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      router.push('/empresa/veiculos');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o veículo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Novo veículo">
      {isLoadingEmployees ? <div className="panel-note">Carregando funcionários...</div> : null}
      <VehicleForm
        employees={employees}
        error={error}
        isSubmitting={isSubmitting}
        onCancel={() => router.push('/empresa/veiculos')}
        onSubmit={handleSubmit}
        submitLabel="Criar veículo"
      />
    </AppShell>
  );
}
