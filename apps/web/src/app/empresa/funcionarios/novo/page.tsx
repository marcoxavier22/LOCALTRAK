'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { apiFetch, toJsonBody } from '@/lib/api';
import type { CreateEmployeePayload, Employee } from '@/types';

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload: CreateEmployeePayload = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      password: String(formData.get('password') ?? ''),
      role: 'EMPLOYEE',
    };

    try {
      await apiFetch<Employee>('/company/employees', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      router.push('/empresa/funcionarios');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o funcionário.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Novo funcionário">
      <form className="panel form-grid compact" onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="section-title">
            <h2>Dados de acesso</h2>
            <p>O funcionário usara estas credenciais no aplicativo mobile.</p>
          </div>

          <label>
            Nome
            <input name="name" required placeholder="Joao Tecnico" />
          </label>

          <label>
            E-mail
            <input name="email" required type="email" placeholder="joao@empresa.com" />
          </label>

          <label>
            Telefone
            <input name="phone" placeholder="11977776666" />
          </label>

          <label>
            Senha
            <input minLength={8} name="password" required type="password" />
          </label>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}

        <div className="form-actions">
          <button className="button secondary" onClick={() => router.push('/empresa/funcionarios')} type="button">
            Cancelar
          </button>
          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Criando...' : 'Criar funcionário'}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
