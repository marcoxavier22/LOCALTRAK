'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { apiFetch, toJsonBody } from '@/lib/api';
import type { Company, CreateCompanyPayload } from '@/types';

type CreateCompanyResponse = {
  company?: Company;
  adminUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    companyId: string;
  };
  id?: string;
};

export default function NewCompanyPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: CreateCompanyPayload = {
      name: String(formData.get('name') ?? ''),
      document: String(formData.get('document') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      email: String(formData.get('email') ?? ''),
      status: String(formData.get('status') ?? 'TRIAL') as CreateCompanyPayload['status'],
      maxEmployees: Number(formData.get('maxEmployees') ?? 5),
      maxVehicles: Number(formData.get('maxVehicles') ?? 5),
      adminUser: {
        name: String(formData.get('adminUser.name') ?? ''),
        email: String(formData.get('adminUser.email') ?? ''),
        phone: String(formData.get('adminUser.phone') ?? ''),
        password: String(formData.get('adminUser.password') ?? ''),
      },
    };

    try {
      await apiFetch<CreateCompanyResponse>('/master/companies', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      router.push('/master/empresas');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel criar a empresa.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell allowedRoles={['MASTER_ADMIN']} eyebrow="Admin Master" title="Nova empresa">
      <form className="panel form-grid" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-title">
            <h2>Dados da empresa</h2>
            <p>Informacoes principais do cliente que vai usar a plataforma.</p>
          </div>

          <label>
            Nome
            <input name="name" required placeholder="Fibra Norte Telecom" />
          </label>

          <label>
            Documento
            <input name="document" placeholder="12345678000190" />
          </label>

          <label>
            Telefone
            <input name="phone" placeholder="11999990000" />
          </label>

          <label>
            E-mail da empresa
            <input name="email" type="email" placeholder="admin@fibranorte.com" />
          </label>

          <label>
            Status
            <select defaultValue="TRIAL" name="status">
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
              <input defaultValue={20} min={1} name="maxEmployees" required type="number" />
            </label>
            <label>
              Limite de veiculos
              <input defaultValue={15} min={1} name="maxVehicles" required type="number" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <div className="section-title">
            <h2>Primeiro administrador</h2>
            <p>Usuario que vai gerenciar a empresa e cadastrar a equipe.</p>
          </div>

          <label>
            Nome
            <input name="adminUser.name" required placeholder="Dono da Frota" />
          </label>

          <label>
            E-mail
            <input name="adminUser.email" required type="email" placeholder="dono@fibranorte.com" />
          </label>

          <label>
            Telefone
            <input name="adminUser.phone" placeholder="11988887777" />
          </label>

          <label>
            Senha
            <input minLength={8} name="adminUser.password" required type="password" />
          </label>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}

        <div className="form-actions">
          <button className="button secondary" onClick={() => router.push('/master/empresas')} type="button">
            Cancelar
          </button>
          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Criando...' : 'Criar empresa'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
