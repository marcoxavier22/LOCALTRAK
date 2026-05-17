'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, toJsonBody } from '@/lib/api';
import type { Company, CompanyDetail, CompanyStatus } from '@/types';

type CompanyFormState = {
  name: string;
  document: string;
  phone: string;
  email: string;
  status: CompanyStatus;
  maxEmployees: number;
  maxVehicles: number;
};

const emptyForm: CompanyFormState = {
  name: '',
  document: '',
  phone: '',
  email: '',
  status: 'TRIAL',
  maxEmployees: 5,
  maxVehicles: 5,
};

export default function CompanyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [form, setForm] = useState<CompanyFormState>(emptyForm);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCompany();
  }, [params.id]);

  function loadCompany() {
    setError('');
    setIsLoading(true);

    apiFetch<CompanyDetail>(`/master/companies/${params.id}`)
      .then((loadedCompany) => {
        setCompany(loadedCompany);
        setForm({
          name: loadedCompany.name,
          document: loadedCompany.document ?? '',
          phone: loadedCompany.phone ?? '',
          email: loadedCompany.email ?? '',
          status: loadedCompany.status,
          maxEmployees: loadedCompany.maxEmployees,
          maxVehicles: loadedCompany.maxVehicles,
        });
      })
      .catch((requestError) =>
        setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar a empresa.'),
      )
      .finally(() => setIsLoading(false));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      const updatedCompany = await apiFetch<Company>(`/master/companies/${params.id}`, {
        method: 'PATCH',
        body: toJsonBody(form),
      });

      setCompany((currentCompany) => ({
        ...(currentCompany ?? updatedCompany),
        ...updatedCompany,
      }));
      setSuccess('Empresa atualizada com sucesso.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel salvar a empresa.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateStatus(action: 'activate' | 'block') {
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      await apiFetch<Company>(`/master/companies/${params.id}/${action}`, {
        method: 'PATCH',
      });
      setSuccess(action === 'activate' ? 'Empresa ativada com sucesso.' : 'Empresa bloqueada com sucesso.');
      loadCompany();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel atualizar o status.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell allowedRoles={['MASTER_ADMIN']} eyebrow="Admin Master" title="Detalhe da empresa">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{company?.name ?? 'Empresa'}</h2>
            <p>Edite os dados principais, bloqueie ou ative o cliente.</p>
          </div>
          <Link className="button secondary" href="/master/empresas">
            Voltar
          </Link>
        </div>

        {isLoading ? <div className="panel-note">Carregando empresa...</div> : null}
        {error ? <div className="form-message error">{error}</div> : null}
        {success ? <div className="form-message success">{success}</div> : null}

        {!isLoading && company ? (
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-section">
              <div className="section-title">
                <h2>Dados basicos</h2>
                <p>Status atual: <StatusBadge status={company.status} /></p>
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
                Documento
                <input
                  onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))}
                  value={form.document}
                />
              </label>

              <label>
                E-mail
                <input
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  type="email"
                  value={form.email}
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
                    setForm((current) => ({ ...current, status: event.target.value as CompanyStatus }))
                  }
                  value={form.status}
                >
                  <option value="TRIAL">TRIAL</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DELINQUENT">DELINQUENT</option>
                  <option value="BLOCKED">BLOCKED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>

              <div className="field-row">
                <label>
                  Limite de funcionarios
                  <input
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxEmployees: Number(event.target.value) }))
                    }
                    required
                    type="number"
                    value={form.maxEmployees}
                  />
                </label>
                <label>
                  Limite de veiculos
                  <input
                    min={1}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, maxVehicles: Number(event.target.value) }))
                    }
                    required
                    type="number"
                    value={form.maxVehicles}
                  />
                </label>
              </div>
            </div>

            <div className="form-actions split">
              <div className="table-actions">
                <button
                  className="button danger"
                  disabled={isSaving || company.status === 'BLOCKED'}
                  onClick={() => updateStatus('block')}
                  type="button"
                >
                  Bloquear
                </button>
                <button
                  className="button secondary"
                  disabled={isSaving || company.status === 'ACTIVE'}
                  onClick={() => updateStatus('activate')}
                  type="button"
                >
                  Ativar
                </button>
              </div>
              <button className="button primary" disabled={isSaving} type="submit">
                {isSaving ? 'Salvando...' : 'Salvar alteracoes'}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {company?.users ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Usuarios vinculados</h2>
              <p>Usuarios retornados pelo detalhe da empresa.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {company.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.name}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <StatusBadge status={user.isActive ?? true} />
                    </td>
                  </tr>
                ))}
                {company.users.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Nenhum usuario vinculado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
