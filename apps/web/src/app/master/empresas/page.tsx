'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Building2, Plus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { apiFetch } from '@/lib/api';
import type { Company } from '@/types';

export default function MasterCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionCompanyId, setActionCompanyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    loadCompanies();
  }, []);

  function loadCompanies() {
    setIsLoading(true);
    setError('');
    apiFetch<Company[]>('/master/companies')
      .then(setCompanies)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar empresas.'),
      )
      .finally(() => setIsLoading(false));
  }

  async function updateCompanyStatus(companyId: string, action: 'activate' | 'block') {
    setActionCompanyId(companyId);
    setError('');

    try {
      await apiFetch<Company>(`/master/companies/${companyId}/${action}`, {
        method: 'PATCH',
      });
      await loadCompanies();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel atualizar a empresa.');
    } finally {
      setActionCompanyId(null);
    }
  }

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return companies.filter((company) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        company.name.toLowerCase().includes(normalizedSearch) ||
        (company.document ?? '').toLowerCase().includes(normalizedSearch) ||
        (company.email ?? '').toLowerCase().includes(normalizedSearch);

      const matchesStatus = statusFilter === 'ALL' || company.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [companies, search, statusFilter]);

  return (
    <AppShell allowedRoles={['MASTER_ADMIN']} eyebrow="Admin Master" title="Empresas">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Clientes cadastrados</h2>
            <p>Empresas que utilizam ou testam a plataforma.</p>
          </div>
          <Link className="button primary" href="/master/empresas/nova">
            <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
            Nova empresa
          </Link>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}
        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando empresas...
          </div>
        ) : null}

        <TableToolbar
          onSearchChange={setSearch}
          placeholder="Buscar por nome, documento ou e-mail"
          search={search}
        >
          <label className="inline-filter">
            Status
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativas</option>
              <option value="TRIAL">Em teste</option>
              <option value="BLOCKED">Bloqueadas</option>
              <option value="DELINQUENT">Inadimplentes</option>
              <option value="ARCHIVED">Arquivadas</option>
            </select>
          </label>
        </TableToolbar>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Limites</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                  </td>
                  <td>{company.document ?? '-'}</td>
                  <td>{company.email ?? '-'}</td>
                  <td>{company.phone ?? '-'}</td>
                  <td>
                    <StatusBadge status={company.status} />
                  </td>
                  <td>
                    {company.maxEmployees} funcionarios / {company.maxVehicles} veiculos
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link className="button secondary small" href={`/master/empresas/${company.id}`}>
                        Ver/Editar
                      </Link>
                      <button
                        className="button danger small"
                        disabled={actionCompanyId === company.id || company.status === 'BLOCKED'}
                        onClick={() => updateCompanyStatus(company.id, 'block')}
                        type="button"
                      >
                        Bloquear
                      </button>
                      <button
                        className="button secondary small"
                        disabled={actionCompanyId === company.id || company.status === 'ACTIVE'}
                        onClick={() => updateCompanyStatus(company.id, 'activate')}
                        type="button"
                      >
                        Ativar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredCompanies.length === 0 ? (
          <EmptyState
            action={
              companies.length === 0 ? (
                <Link className="button primary" href="/master/empresas/nova">
                  <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                  Criar empresa
                </Link>
              ) : undefined
            }
            icon={Building2}
            title={companies.length === 0 ? 'Nenhuma empresa cadastrada' : 'Nenhuma empresa encontrada'}
            description={
              companies.length === 0
                ? 'Crie o primeiro cliente para comecar a operar o SaaS.'
                : 'Ajuste a busca ou o filtro de status para ver outros clientes.'
            }
          />
        ) : null}
      </section>
    </AppShell>
  );
}
