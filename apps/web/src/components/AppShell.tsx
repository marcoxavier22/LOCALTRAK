'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  Car,
  Fuel,
  LayoutDashboard,
  LogOut,
  Receipt,
  Route,
  ClipboardList,
  ShieldCheck,
  Users,
  Wrench,
  Menu,
  X,
} from 'lucide-react';
import { getToken, getUser, logout } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import type { Role, User } from '@/types';

type AppShellProps = {
  allowedRoles: Role[];
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
};

const masterLinks = [
  { href: '/master/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/master/empresas', label: 'Empresas', icon: Building2 },
];

const companyLinks = [
  { href: '/empresa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/empresa/funcionarios', label: 'Funcionarios', icon: Users },
  { href: '/empresa/veiculos', label: 'Veiculos', icon: Car },
  { href: '/empresa/rotas', label: 'Rotas', icon: Route },
  { href: '/empresa/ordens', label: 'Ordens de Servico', icon: ClipboardList },
  { href: '/empresa/manutencao', label: 'Manutencao', icon: Wrench },
  { href: '/empresa/combustivel', label: 'Combustivel', icon: Fuel },
  { href: '/empresa/reembolsos', label: 'Reembolsos', icon: Receipt },
];

export function AppShell({ allowedRoles, children, title, eyebrow }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('Validando sessao...');
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied' | 'redirecting' | 'error'>('checking');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const allowedRolesKey = allowedRoles.join('|');

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (isMounted) {
        setMessage('Nao foi possivel validar a sessao. Entre novamente.');
        setStatus('error');
      }
    }, 4000);

    const token = getToken();
    const sessionUser = getUser();
    const roles = allowedRolesKey.split('|') as Role[];

    if (!token || !sessionUser) {
      window.clearTimeout(fallbackTimer);
      setMessage('Redirecionando para login...');
      setStatus('redirecting');
      router.replace('/login');
      return () => {
        isMounted = false;
      };
    }

    if (!roles.includes(sessionUser.role)) {
      window.clearTimeout(fallbackTimer);
      setUser(sessionUser);
      setStatus('denied');
      return () => {
        isMounted = false;
      };
    }

    window.clearTimeout(fallbackTimer);
    setUser(sessionUser);
    setStatus('allowed');

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
    };
  }, [allowedRolesKey, router]);

  const links = useMemo(() => {
    if (user?.role === 'MASTER_ADMIN') {
      return masterLinks;
    }

    if (user?.role === 'COMPANY_ADMIN') {
      return companyLinks;
    }

    return [];
  }, [user?.role]);

  const roleLabel =
    user?.role === 'MASTER_ADMIN'
      ? 'Admin Master'
      : user?.role === 'COMPANY_ADMIN'
        ? 'Admin da empresa'
        : 'Funcionario';

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  if (status === 'checking' || status === 'redirecting') {
    return (
      <main className="center-screen">
        <div className="loading-box">{message}</div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="center-screen">
        <section className="auth-panel">
          <span className="eyebrow">Sessao expirada</span>
          <h1>Entre novamente</h1>
          <p>{message}</p>
          <button className="button primary" onClick={handleLogout}>
            Ir para login
          </button>
        </section>
      </main>
    );
  }

  if (status === 'denied') {
    const deniedMessage =
      user?.role === 'EMPLOYEE'
        ? 'Funcionarios acessam pelo aplicativo mobile.'
        : 'Este usuario nao tem permissao para acessar esta area.';

    return (
      <main className="center-screen">
        <section className="auth-panel">
          <span className="eyebrow">Acesso restrito</span>
          <h1>Permissao insuficiente</h1>
          <p>{deniedMessage}</p>
          <button className="button primary" onClick={handleLogout}>
            Sair
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-block">
            <img alt="TrakFlow" className="brand-logo" src="/trakflow-logo.svg" />
            <div>
              <strong>TrakFlow</strong>
              <span>Gestão em Campo</span>
            </div>
          </div>
          <button
            className="mobile-menu-close"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-card">
          <ShieldCheck size={18} strokeWidth={2.4} aria-hidden="true" />
          <div>
            <strong>Ambiente seguro</strong>
            <span>Dados isolados por empresa</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacao principal">
          {links.map((link) => (
            <Link
              className={pathname === link.href ? 'nav-link active' : 'nav-link'}
              href={link.href}
              key={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <link.icon size={17} strokeWidth={2.4} aria-hidden="true" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <div className="topbar-main">
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="topbar-branding">
              <img alt="TrakFlow" className="topbar-mini-logo" src="/trakflow-logo.svg" />
            </div>
            <div className="topbar-info">
              {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
              <h1 className="topbar-title">{title}</h1>
              <p className="topbar-subtitle">
                <BarChart3 size={15} strokeWidth={2.2} aria-hidden="true" />
                Sua empresa no controle de cada rota, visita e operação em campo.
              </p>
            </div>
          </div>
          <div className="user-menu">
            <ThemeToggle />
            <div className="user-pill">
              <span>{user?.name}</span>
              <small>{roleLabel}</small>
            </div>
            <button className="button ghost icon-button logout-button" onClick={handleLogout} aria-label="Sair">
              <LogOut size={17} strokeWidth={2.4} aria-hidden="true" />
              <span className="logout-text">Sair</span>
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
