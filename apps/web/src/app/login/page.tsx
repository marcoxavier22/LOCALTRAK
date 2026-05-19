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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        setError('Funcionários acessam pelo aplicativo mobile.');
        return;
      }

      saveSession(session);

      if (session.user.role === 'MASTER_ADMIN') {
        router.replace('/master/dashboard');
        return;
      }

      router.replace('/empresa/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível entrar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-theme-action">
        <ThemeToggle />
      </div>
      <section className="login-intro" aria-label="TrakFlow">
        <div className="login-logo">
          <img alt="TrakFlow" className="login-logo-image" src="/trakflow-logo.svg" />
          <strong>TrakFlow</strong>
        </div>
        <h2>Controle rotas, equipes externas e operações em campo em uma única plataforma.</h2>
        <p>
          A TrakFlow ajuda empresas a acompanhar veículos, organizar rotas, registrar visitas e medir a produtividade das equipes externas.
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
        <span className="eyebrow">TrakFlow</span>
        <h1>Acessar painel</h1>
        <p>Entre com seu usuário administrativo para gerenciar empresas, equipe e operação em campo.</p>

        <form autoComplete="off" className="form-stack" onSubmit={handleSubmit}>
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
