'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, toJsonBody } from '@/lib/api';
import type { Employee, UpdateEmployeePayload } from '@/types';

type EmployeeFormState = {
  name: string;
  phone: string;
  isActive: boolean;
};

const emptyForm: EmployeeFormState = {
  name: '',
  phone: '',
  isActive: true,
};

export default function EditEmployeePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormState>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [params.id]);

  function loadEmployee() {
    setIsLoading(true);
    setError('');

    apiFetch<Employee[]>('/company/employees')
      .then((employees) => {
        const selectedEmployee = employees.find((item) => item.id === params.id);

        if (!selectedEmployee) {
          setError('Funcionario nao encontrado nesta empresa.');
          return;
        }

        setEmployee(selectedEmployee);
        setForm({
          name: selectedEmployee.name,
          phone: selectedEmployee.phone ?? '',
          isActive: selectedEmployee.isActive ?? true,
        });
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar o funcionario.'),
      )
      .finally(() => setIsLoading(false));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    const payload: UpdateEmployeePayload = {
      name: form.name,
      phone: form.phone,
      isActive: form.isActive,
    };

    try {
      const updatedEmployee = await apiFetch<Employee>(`/company/employees/${params.id}`, {
        method: 'PATCH',
        body: toJsonBody(payload),
      });

      setEmployee(updatedEmployee);
      setForm({
        name: updatedEmployee.name,
        phone: updatedEmployee.phone ?? '',
        isActive: updatedEmployee.isActive ?? true,
      });
      setSuccess('Funcionario atualizado com sucesso.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel salvar o funcionario.');
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus() {
    if (!employee) {
      return;
    }

    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updatedEmployee = await apiFetch<Employee>(`/company/employees/${employee.id}/status`, {
        method: 'PATCH',
        body: toJsonBody({ isActive: !(employee.isActive ?? true) }),
      });

      setEmployee(updatedEmployee);
      setForm((current) => ({ ...current, isActive: updatedEmployee.isActive ?? true }));
      setSuccess((updatedEmployee.isActive ?? true) ? 'Funcionario ativado.' : 'Funcionario desativado.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel atualizar o status.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Editar funcionario">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{employee?.name ?? 'Funcionario'}</h2>
            <p>Atualize dados basicos e status de acesso ao aplicativo mobile.</p>
          </div>
          <Link className="button secondary" href="/empresa/funcionarios">
            Voltar
          </Link>
        </div>

        {isLoading ? <div className="panel-note">Carregando funcionario...</div> : null}
        {error ? <div className="form-message error">{error}</div> : null}
        {success ? <div className="form-message success">{success}</div> : null}

        {!isLoading && employee ? (
          <form className="form-grid compact" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="section-title">
                <h2>Dados do funcionario</h2>
                <p>
                  E-mail: {employee.email} · Status atual: <StatusBadge status={employee.isActive ?? true} />
                </p>
              </div>

              <label>
                Nome
                <input
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                  value={form.name}
                />
              </label>

              <label>
                Telefone
                <input
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                  value={form.phone}
                />
              </label>

              <label>
                Status
                <select
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))
                  }
                  value={String(form.isActive)}
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
            </div>

            <div className="panel-note">
              Reset de senha ainda nao foi exposto como endpoint dedicado no backend.
            </div>

            <div className="form-actions split">
              <button
                className={(employee.isActive ?? true) ? 'button danger' : 'button secondary'}
                disabled={isSaving}
                onClick={toggleStatus}
                type="button"
              >
                {(employee.isActive ?? true) ? 'Desativar funcionario' : 'Ativar funcionario'}
              </button>

              <div className="table-actions">
                <button className="button secondary" onClick={() => router.push('/empresa/funcionarios')} type="button">
                  Cancelar
                </button>
                <button className="button primary" disabled={isSaving} type="submit">
                  {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
                </button>
              </div>
            </div>
          </form>
        ) : null}
      </section>
    </AppShell>
  );
}
