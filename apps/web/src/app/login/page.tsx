'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { apiFetch, toJsonBody } from '@/lib/api';
import { logout, saveSession } from '@/lib/auth';
import type { AuthResponse } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@localtrak.test');
  const [password, setPassword] = useState('ChangeMe123!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const session = await apiFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: toJsonBody({ email, password }),
      });

      if (session.user.role === 'EMPLOYEE') {
        logout();
        setError('Funcionarios acessam pelo aplicativo mobile.');
        return;
      }

      saveSession(session);

      if (session.user.role === 'MASTER_ADMIN') {
        router.replace('/master/dashboard');
        return;
      }

      router.replace('/empresa/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel entrar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-theme-action">
        <ThemeToggle />
      </div>
      <section className="login-intro" aria-label="LocalTrak Rotas">
        <div className="login-logo">
          <img alt="LocalTrak" className="login-logo-image" src="/localtrak-logo.png" />
          <strong>LocalTrak Rotas</strong>
        </div>
        <h2>Controle de rotas, jornada e frota para equipes em campo.</h2>
        <p>
          Um painel multiempresa para acompanhar funcionarios externos, quilometragem, combustivel,
          manutencao preventiva e reembolsos com isolamento por cliente.
        </p>
        <div className="login-stats">
          <div>
            <strong>GPS</strong>
            <span>Durante o turno</span>
          </div>
          <div>
            <strong>RBAC</strong>
            <span>Acesso por perfil</span>
          </div>
          <div>
            <strong>SaaS</strong>
            <span>Multiempresa</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <span className="eyebrow">LocalTrak Rotas</span>
        <h1>Acessar painel</h1>
        <p>Entre com seu usuario administrativo para gerenciar empresas, equipe e operacao.</p>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label>
            E-mail
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Senha
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <div className="form-message error">{error}</div> : null}

          <button className="button primary full" disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              'Entrando...'
            ) : (
              <>
                <LockKeyhole size={17} strokeWidth={2.4} aria-hidden="true" />
                Entrar
                <ArrowRight size={17} strokeWidth={2.4} aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="login-security">
          <ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" />
          <div>
            <strong>Ambiente protegido</strong>
            <span>Tokens JWT e isolamento por empresa.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
