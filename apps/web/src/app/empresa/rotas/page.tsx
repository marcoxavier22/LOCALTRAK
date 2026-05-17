'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Car, MapPinned, Radio, RefreshCw, Route, Users } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { apiFetch } from '@/lib/api';
import {
  formatDateTime,
  formatDuration,
  formatRouteDistance,
  formatVehicleName,
  routeStatusLabels,
  trackingStatusLabels,
} from '@/lib/route-labels';
import type { RouteDetail, RouteShiftStatus, RouteSummary } from '@/types';

const RouteMap = dynamic(() => import('@/components/RouteMap').then((module) => module.RouteMap), {
  ssr: false,
  loading: () => <div className="route-map route-map-empty">Carregando mapa...</div>,
});

type RouteFilter = 'ALL' | RouteShiftStatus;

const filterOptions: Array<{ value: RouteFilter; label: string }> = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'PENDING', label: routeStatusLabels.PENDING },
  { value: 'IN_PROGRESS', label: routeStatusLabels.IN_PROGRESS },
  { value: 'FINISHED', label: routeStatusLabels.FINISHED },
  { value: 'SYNC_PENDING', label: routeStatusLabels.SYNC_PENDING },
  { value: 'ERROR', label: routeStatusLabels.ERROR },
];

function uniqueById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function routeDateMatches(route: RouteSummary, startDate: string, endDate: string) {
  const startedAt = new Date(route.startedAt);

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`);
    if (startedAt < start) {
      return false;
    }
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    if (startedAt > end) {
      return false;
    }
  }

  return true;
}

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

export default function CompanyRoutesPage() {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [liveRoute, setLiveRoute] = useState<RouteDetail | null>(null);
  const [selectedLiveRouteId, setSelectedLiveRouteId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RouteFilter>('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const loadRoutes = useCallback(async (silent = false) => {
    if (silent) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError('');

    try {
      const nextRoutes = await apiFetch<RouteSummary[]>('/company/routes');
      setRoutes(nextRoutes);
      const activeRoute = nextRoutes.find((route) => route.status === 'IN_PROGRESS');
      setSelectedLiveRouteId((current) => {
        if (current && nextRoutes.some((route) => route.id === current && route.status === 'IN_PROGRESS')) {
          return current;
        }

        return activeRoute?.id ?? null;
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar rotas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRoutes();
    const timer = window.setInterval(() => void loadRoutes(true), 15000);
    return () => window.clearInterval(timer);
  }, [loadRoutes]);

  useEffect(() => {
    if (!selectedLiveRouteId) {
      setLiveRoute(null);
      return;
    }

    let cancelled = false;

    async function loadLiveRoute() {
      setLiveError('');

      try {
        const route = await apiFetch<RouteDetail>(`/routes/${selectedLiveRouteId}/live`);
        if (!cancelled) {
          setLiveRoute(route);
        }
      } catch (requestError) {
        if (!cancelled) {
          setLiveError(requestError instanceof Error ? requestError.message : 'Nao foi possivel atualizar a rota ao vivo.');
        }
      }
    }

    void loadLiveRoute();
    const timer = window.setInterval(loadLiveRoute, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedLiveRouteId]);

  const activeRoutes = useMemo(() => routes.filter((route) => route.status === 'IN_PROGRESS'), [routes]);
  const finishedRoutes = useMemo(() => routes.filter((route) => route.status === 'FINISHED'), [routes]);
  const employees = useMemo(() => uniqueById(routes.map((route) => route.employee).filter(Boolean)), [routes]);
  const vehicles = useMemo(
    () => uniqueById(routes.map((route) => route.vehicle).filter((vehicle): vehicle is NonNullable<RouteSummary['vehicle']> => Boolean(vehicle))),
    [routes],
  );

  const filteredRoutes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return routes.filter((route) => {
      const vehicleText = route.vehicle
        ? `${route.vehicle.plate} ${route.vehicle.brand} ${route.vehicle.model}`
        : '';
      const matchesSearch =
        normalizedSearch.length === 0 ||
        (route.employee?.name ?? '').toLowerCase().includes(normalizedSearch) ||
        (route.employee?.email ?? '').toLowerCase().includes(normalizedSearch) ||
        vehicleText.toLowerCase().includes(normalizedSearch);
      const matchesStatus = statusFilter === 'ALL' || route.status === statusFilter;
      const matchesEmployee = employeeFilter === 'ALL' || route.employee?.id === employeeFilter;
      const matchesVehicle = vehicleFilter === 'ALL' || route.vehicle?.id === vehicleFilter;

      return matchesSearch && matchesStatus && matchesEmployee && matchesVehicle && routeDateMatches(route, startDate, endDate);
    });
  }, [employeeFilter, endDate, routes, search, startDate, statusFilter, vehicleFilter]);

  const selectedLiveSummary = routes.find((route) => route.id === selectedLiveRouteId) ?? null;
  const liveDistance = liveRoute?.liveDistanceKm ?? liveRoute?.totalDistanceKm ?? selectedLiveSummary?.totalDistanceKm;
  const liveDuration = liveRoute?.liveDurationMinutes ?? liveRoute?.totalDurationMinutes ?? selectedLiveSummary?.totalDurationMinutes;
  const liveStatus = liveRoute?.trackingStatus ?? selectedLiveSummary?.status ?? 'IN_PROGRESS';

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Rotas">
      <section className="metrics-grid">
        <MetricCard icon={Radio} label="Rotas ao vivo" value={activeRoutes.length} detail="turnos em andamento" tone="green" />
        <MetricCard icon={Route} label="Rotas finalizadas" value={finishedRoutes.length} detail="historico carregado" />
        <MetricCard icon={CalendarDays} label="Rotas listadas" value={routes.length} detail="ultimas 200 jornadas" tone="amber" />
        <MetricCard icon={Activity} label="Atualizacao" value={isRefreshing ? 'Sincronizando' : '5s'} detail="rota selecionada ao vivo" />
      </section>

      <section className="panel route-live-panel">
        <div className="panel-header">
          <div>
            <h2>Mapa em tempo real</h2>
            <p>Veja ponto inicial, ponto atual e trajeto do turno ativo selecionado.</p>
          </div>
          <button className="button secondary small" onClick={() => void loadRoutes(true)} type="button">
            <RefreshCw size={15} aria-hidden="true" />
            Atualizar
          </button>
        </div>

        {liveError ? <div className="form-message error">{liveError}</div> : null}

        <div className="route-live-grid">
          <div className="route-live-list">
            {activeRoutes.length === 0 ? (
              <EmptyState
                icon={MapPinned}
                title="Nenhuma rota em andamento"
                description="Quando um funcionario iniciar turno pelo app, ele aparecera nesta area em tempo real."
              />
            ) : (
              activeRoutes.map((route) => (
                <button
                  className={route.id === selectedLiveRouteId ? 'route-live-card active' : 'route-live-card'}
                  key={route.id}
                  onClick={() => setSelectedLiveRouteId(route.id)}
                  type="button"
                >
                  <span>
                    <strong>{route.employee?.name ?? 'Funcionario'}</strong>
                    <small>{formatVehicleName(route.vehicle)}</small>
                  </span>
                  <StatusBadge
                    status={route.id === selectedLiveRouteId ? liveStatus : route.status}
                    label={
                      route.id === selectedLiveRouteId
                        ? trackingStatusLabels[liveStatus] ?? routeStatusLabels[route.status]
                        : routeStatusLabels[route.status]
                    }
                  />
                </button>
              ))
            )}
          </div>

          <div className="route-live-map">
            <RouteMap
              compact
              currentPoint={liveRoute?.currentPoint}
              points={liveRoute?.points ?? []}
              startPoint={liveRoute?.startPoint ?? startPointFromRoute(selectedLiveSummary)}
              status={liveRoute?.status ?? selectedLiveSummary?.status}
            />
            {selectedLiveSummary ? (
              <div className="route-live-summary">
                <div>
                  <span>Funcionario</span>
                  <strong>{selectedLiveSummary.employee.name}</strong>
                </div>
                <div>
                  <span>Km parcial</span>
                  <strong>{formatRouteDistance(liveDistance)}</strong>
                </div>
                <div>
                  <span>Tempo</span>
                  <strong>{formatDuration(liveDuration)}</strong>
                </div>
                <div>
                  <span>Ultimo ponto</span>
                  <strong>{formatDateTime(liveRoute?.lastPointAt)}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Historico de rotas</h2>
            <p>Jornadas registradas pelos funcionarios, com filtros por funcionario, data e veiculo.</p>
          </div>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}
        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando rotas...
          </div>
        ) : null}

        <TableToolbar
          onSearchChange={setSearch}
          placeholder="Buscar por funcionario, e-mail ou veiculo"
          search={search}
        >
          <label className="inline-filter">
            Status
            <select onChange={(event) => setStatusFilter(event.target.value as RouteFilter)} value={statusFilter}>
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-filter">
            Funcionario
            <select onChange={(event) => setEmployeeFilter(event.target.value)} value={employeeFilter}>
              <option value="ALL">Todos</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-filter">
            Veiculo
            <select onChange={(event) => setVehicleFilter(event.target.value)} value={vehicleFilter}>
              <option value="ALL">Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-filter compact-filter">
            De
            <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
          <label className="inline-filter compact-filter">
            Ate
            <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
        </TableToolbar>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionario</th>
                <th>Veiculo</th>
                <th>Inicio</th>
                <th>Fim</th>
                <th>Duracao</th>
                <th>Km</th>
                <th>Status</th>
                <th>Pontos</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutes.map((route) => (
                <tr key={route.id}>
                  <td>
                    <strong>{route.employee?.name ?? 'Funcionario'}</strong>
                    <span>{route.employee?.email ?? '-'}</span>
                  </td>
                  <td>{formatVehicleName(route.vehicle)}</td>
                  <td>{formatDateTime(route.startedAt)}</td>
                  <td>{formatDateTime(route.endedAt)}</td>
                  <td>{formatDuration(route.totalDurationMinutes)}</td>
                  <td>{formatRouteDistance(route.totalDistanceKm)}</td>
                  <td>
                    <StatusBadge status={route.status} label={routeStatusLabels[route.status]} />
                  </td>
                  <td>{route._count?.points ?? '-'}</td>
                  <td>
                    <Link className="button secondary small" href={`/empresa/rotas/${route.id}`}>
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredRoutes.length === 0 ? (
          <EmptyState
            icon={routes.length === 0 ? MapPinned : Route}
            title={routes.length === 0 ? 'Nenhuma rota registrada' : 'Nenhuma rota encontrada'}
            description={
              routes.length === 0
                ? 'As rotas finalizadas pelo app mobile aparecerao nesta tela.'
                : 'Ajuste a busca ou os filtros para visualizar outras rotas.'
            }
          />
        ) : null}
      </section>
    </AppShell>
  );
}
