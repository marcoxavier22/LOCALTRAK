'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Ban, Building2, Clock3, Plus, ShieldCheck } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';
import type { Company } from '@/types';

export default function MasterDashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiFetch<Company[]>('/master/companies')
      .then(setCompanies)
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar o dashboard.'),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const metrics = useMemo(() => {
    const active = companies.filter((company) => company.status === 'ACTIVE').length;
    const trial = companies.filter((company) => company.status === 'TRIAL').length;
    const blocked = companies.filter(
      (company) => company.status === 'BLOCKED' || company.status === 'DELINQUENT' || company.status === 'ARCHIVED',
    ).length;
    return { active, blocked, trial };
  }, [companies]);

  return (
    <AppShell allowedRoles={['MASTER_ADMIN']} eyebrow="Admin Master" title="Dashboard da plataforma">
      {error ? <div className="form-message error">{error}</div> : null}

      <section className="metrics-grid">
        <MetricCard
          detail="clientes cadastrados"
          icon={Building2}
          label="Empresas"
          value={isLoading ? '...' : companies.length}
        />
        <MetricCard
          detail="status ACTIVE"
          icon={ShieldCheck}
          label="Empresas ativas"
          tone="green"
          value={isLoading ? '...' : metrics.active}
        />
        <MetricCard
          detail="status TRIAL"
          icon={Clock3}
          label="Empresas em teste"
          tone="amber"
          value={isLoading ? '...' : metrics.trial}
        />
        <MetricCard
          detail="bloqueadas, inadimplentes ou arquivadas"
          icon={Ban}
          label="Empresas bloqueadas"
          tone="red"
          value={isLoading ? '...' : metrics.blocked}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Empresas recentes</h2>
            <p>Visao rapida dos clientes cadastrados na plataforma.</p>
          </div>
          <Link className="button secondary" href="/master/empresas">
            Ver empresas
          </Link>
        </div>

        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando empresas...
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Status</th>
                <th>Usuários</th>
                <th>Rotas</th>
              </tr>
            </thead>
            <tbody>
              {companies.slice(0, 5).map((company) => (
                <tr key={company.id}>
                  <td>
                    <strong>{company.name}</strong>
                    <span>{company.email ?? 'Sem e-mail'}</span>
                  </td>
                  <td>
                    <StatusBadge status={company.status} />
                  </td>
                  <td>{company._count?.users ?? 0}</td>
                  <td>{company._count?.routeShifts ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && companies.length === 0 ? (
          <EmptyState
            action={
              <Link className="button primary" href="/master/empresas/nova">
                <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                Criar empresa
              </Link>
            }
            icon={Building2}
            title="Nenhuma empresa cadastrada"
            description="Cadastre o primeiro cliente para liberar o painel da empresa e o acesso do administrador da frota."
          />
        ) : null}
      </section>
    </AppShell>
  );
}
