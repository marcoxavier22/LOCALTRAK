'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Car, MapPinned, Plus, Radio, Route, Users } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';
import { formatDateTime, formatRouteDistance, formatVehicleName, trackingStatusLabels } from '@/lib/route-labels';
import { formatKm } from '@/lib/vehicle-labels';
import type { Employee, RouteDetail, RouteSummary, Vehicle } from '@/types';

const RouteMap = dynamic(() => import('@/components/RouteMap').then((module) => module.RouteMap), {
  ssr: false,
  loading: () => <div className="route-map route-map-empty">Carregando mapa...</div>,
});

function startPointFromRoute(route?: RouteSummary | null) {
  if (!route?.startLatitude || !route.startLongitude) {
    return null;
  }

  return {
    latitude: route.startLatitude,
    longitude: route.startLongitude,
    recordedAt: route.startedAt,
  };
}

export default function CompanyDashboardPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [liveRoute, setLiveRoute] = useState<RouteDetail | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [loadedEmployees, loadedVehicles, loadedRoutes] = await Promise.all([
        apiFetch<Employee[]>('/company/employees'),
        apiFetch<Vehicle[]>('/company/vehicles'),
        apiFetch<RouteSummary[]>('/company/routes'),
      ]);
      setEmployees(loadedEmployees);
      setVehicles(loadedVehicles);
      setRoutes(loadedRoutes);
      const preferredRoute = loadedRoutes.find((route) => route.status === 'IN_PROGRESS') ?? loadedRoutes[0] ?? null;
      setSelectedRouteId((current) => {
        if (current && loadedRoutes.some((route) => route.id === current)) {
          return current;
        }

        return preferredRoute?.id ?? null;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar o dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    const timer = window.setInterval(() => void loadDashboard(), 15000);
    return () => window.clearInterval(timer);
  }, [loadDashboard]);

  useEffect(() => {
    if (!selectedRouteId) {
      setLiveRoute(null);
      return;
    }

    let cancelled = false;

    async function loadSelectedRoute() {
      const path = routes.find((route) => route.id === selectedRouteId)?.status === 'IN_PROGRESS' ? 'live' : 'history';
      const route = await apiFetch<RouteDetail>(`/routes/${selectedRouteId}/${path}`).catch(() => null);
      if (!cancelled) {
        setLiveRoute(route);
      }
    }

    void loadSelectedRoute();
    const timer = window.setInterval(loadSelectedRoute, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [routes, selectedRouteId]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.isActive !== false).length,
    [employees],
  );

  const activeRoutes = useMemo(() => routes.filter((route) => route.status === 'IN_PROGRESS').length, [routes]);
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;

  const monthKm = useMemo(() => {
    const now = new Date();
    return routes
      .filter((route) => {
        const endedAt = route.endedAt ? new Date(route.endedAt) : null;
        return endedAt && endedAt.getMonth() === now.getMonth() && endedAt.getFullYear() === now.getFullYear();
      })
      .reduce((total, route) => total + Number(route.totalDistanceKm ?? 0), 0);
  }, [routes]);

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Dashboard da empresa">
      {error ? <div className="form-message error">{error}</div> : null}

      <section className="metrics-grid">
        <MetricCard
          detail="cadastrados"
          icon={Users}
          label="Funcionarios"
          value={isLoading ? '...' : employees.length}
        />
        <MetricCard
          detail="aptos para uso"
          icon={MapPinned}
          label="Funcionarios ativos"
          tone="green"
          value={isLoading ? '...' : activeEmployees}
        />
        <MetricCard
          detail="turnos em andamento"
          icon={Route}
          label="Em rota agora"
          tone="amber"
          value={isLoading ? '...' : activeRoutes}
        />
        <MetricCard
          detail={`${vehicles.length} veiculos cadastrados`}
          icon={Car}
          label="Km no mes"
          value={isLoading ? '...' : formatKm(monthKm)}
        />
      </section>

      <section className="panel route-live-panel">
        <div className="panel-header">
          <div>
            <h2>Mapa operacional</h2>
            <p>Rotas em andamento atualizam a cada 5 segundos; rotas finalizadas exibem o historico gravado.</p>
          </div>
          <Link className="button secondary" href="/empresa/rotas">
            Ver rotas
          </Link>
        </div>

        <div className="route-live-grid">
          <div className="route-live-list">
            {routes.slice(0, 6).map((route) => (
              <button
                className={route.id === selectedRouteId ? 'route-live-card active' : 'route-live-card'}
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                type="button"
              >
                <span>
                  <strong>{route.employee?.name ?? 'Funcionario'}</strong>
                  <small>{formatVehicleName(route.vehicle)} - {formatDateTime(route.startedAt)}</small>
                </span>
                <StatusBadge
                  status={liveRoute?.id === route.id ? liveRoute.trackingStatus ?? route.status : route.status}
                  label={liveRoute?.id === route.id ? trackingStatusLabels[liveRoute.trackingStatus ?? route.status] ?? route.status : route.status}
                />
              </button>
            ))}
            {!isLoading && routes.length === 0 ? (
              <EmptyState
                icon={MapPinned}
                title="Nenhuma rota no mapa"
                description="Quando o app mobile registrar jornadas, elas aparecerao aqui."
              />
            ) : null}
          </div>

          <div className="route-live-map">
            <RouteMap
              compact
              currentPoint={liveRoute?.currentPoint}
              endPoint={
                selectedRoute?.endLatitude && selectedRoute.endLongitude
                  ? { latitude: selectedRoute.endLatitude, longitude: selectedRoute.endLongitude, recordedAt: selectedRoute.endedAt }
                  : null
              }
              points={liveRoute?.points ?? []}
              startPoint={liveRoute?.startPoint ?? startPointFromRoute(selectedRoute)}
              status={liveRoute?.status ?? selectedRoute?.status}
            />
            {selectedRoute ? (
              <div className="route-live-summary">
                <div>
                  <span>Selecionada</span>
                  <strong>{selectedRoute.employee?.name ?? '-'}</strong>
                </div>
                <div>
                  <span>Km</span>
                  <strong>{formatRouteDistance(liveRoute?.liveDistanceKm ?? selectedRoute.totalDistanceKm)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong className="metric-status">
                    <Radio size={14} aria-hidden="true" /> {trackingStatusLabels[liveRoute?.trackingStatus ?? selectedRoute.status] ?? selectedRoute.status}
                  </strong>
                </div>
                <div>
                  <span>Pontos</span>
                  <strong>{liveRoute?.pointsCount ?? selectedRoute._count?.points ?? 0}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Equipe recente</h2>
            <p>Funcionarios cadastrados para uso do aplicativo mobile.</p>
          </div>
          <Link className="button secondary" href="/empresa/funcionarios">
            Ver funcionarios
          </Link>
        </div>

        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando equipe...
          </div>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionario</th>
                <th>Telefone</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.slice(0, 5).map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <strong>{employee.name}</strong>
                    <span>{employee.email}</span>
                  </td>
                  <td>{employee.phone ?? '-'}</td>
                  <td>
                    <StatusBadge status={employee.isActive ?? true} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && employees.length === 0 ? (
          <EmptyState
            action={
              <Link className="button primary" href="/empresa/funcionarios/novo">
                <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                Novo funcionario
              </Link>
            }
            icon={Users}
            title="Nenhum funcionario cadastrado"
            description="Cadastre a equipe externa para liberar login no app mobile e registro de rotas."
          />
        ) : null}
      </section>
    </AppShell>
  );
}
