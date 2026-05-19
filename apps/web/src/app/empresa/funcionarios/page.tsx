'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { apiFetch } from '@/lib/api';
import type { Employee } from '@/types';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionEmployeeId, setActionEmployeeId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadEmployees();
  }, []);

  function loadEmployees() {
    setIsLoading(true);
    setError('');
    apiFetch<Employee[]>('/company/employees')
      .then(setEmployees)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar funcionários.'),
      )
      .finally(() => setIsLoading(false));
  }

  async function updateEmployeeStatus(employee: Employee) {
    setActionEmployeeId(employee.id);
    setError('');

    try {
      await apiFetch<Employee>(`/company/employees/${employee.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !(employee.isActive ?? true) }),
      });
      await loadEmployees();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o funcionário.');
    } finally {
      setActionEmployeeId(null);
    }
  }

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const isActive = employee.isActive ?? true;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        employee.name.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch) ||
        (employee.phone ?? '').toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'INACTIVE' && !isActive);

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Funcionários">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Equipe externa</h2>
            <p>Usuários que acessam o aplicativo mobile para registrar turnos e rotas.</p>
          </div>
          <Link className="button primary" href="/empresa/funcionários/novo">
            <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
            Novo funcionário
          </Link>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}
        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando funcionários...
          </div>
        ) : null}

        <TableToolbar
          onSearchChange={setSearch}
          placeholder="Buscar por nome, e-mail ou telefone"
          search={search}
        >
          <label className="inline-filter">
            Status
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>
        </TableToolbar>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.name}</strong>
                  </td>
                  <td>{employee.email}</td>
                  <td>{employee.phone ?? '-'}</td>
                  <td>
                    <StatusBadge status={employee.isActive ?? true} />
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link className="button secondary small" href={`/empresa/funcionários/${employee.id}`}>
                        Editar
                      </Link>
                      <button
                        className={(employee.isActive ?? true) ? 'button danger small' : 'button secondary small'}
                        disabled={actionEmployeeId === employee.id}
                        onClick={() => updateEmployeeStatus(employee)}
                        type="button"
                      >
                        {(employee.isActive ?? true) ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredEmployees.length === 0 ? (
          <EmptyState
            action={
              employees.length === 0 ? (
                <Link className="button primary" href="/empresa/funcionários/novo">
                  <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                  Novo funcionário
                </Link>
              ) : undefined
            }
            icon={Users}
            title={employees.length === 0 ? 'Nenhum funcionário cadastrado' : 'Nenhum funcionário encontrado'}
            description={
              employees.length === 0
                ? 'Cadastre tecnicos, motoristas ou entregadores para usar o aplicativo mobile.'
                : 'Ajuste a busca ou o filtro de status para visualizar outros funcionários.'
            }
          />
        ) : null}
      </section>
    </AppShell>
  );
}
