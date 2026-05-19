'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, Clock3, MapPin, Navigation, RefreshCw, Route as RouteIcon } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';
import {
  formatCoordinate,
  formatDateTime,
  formatDuration,
  formatPointDetails,
  formatRouteDistance,
  formatVehicleName,
  routeStatusLabels,
  trackingStatusLabels,
} from '@/lib/route-labels';
import type { RouteDetail } from '@/types';

const RouteMap = dynamic(() => import('@/components/RouteMap').then((module) => module.RouteMap), {
  ssr: false,
  loading: () => <div className="route-map route-map-empty">Carregando mapa...</div>,
});

function endPointFromRoute(route: RouteDetail) {
  if (!route.endLatitude || !route.endLongitude) {
    return null;
  }

  return {
    latitude: route.endLatitude,
    longitude: route.endLongitude,
    recordedAt: route.endedAt,
  };
}

export default function CompanyRouteDetailPage() {
  const params = useParams<{ id: string }>();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRoute = useCallback(
    async (silent = false) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError('');

      try {
        const nextRoute = await apiFetch<RouteDetail>(`/routes/${params.id}/live`);
        setRoute(nextRoute);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a rota.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [params.id],
  );

  useEffect(() => {
    void loadRoute();
  }, [loadRoute]);

  useEffect(() => {
    if (route?.status !== 'IN_PROGRESS') {
      return;
    }

    const timer = window.setInterval(() => void loadRoute(true), 5000);
    return () => window.clearInterval(timer);
  }, [loadRoute, route?.status]);

  const points = route?.points ?? [];
  const latestPoints = useMemo(() => points.slice(-8).reverse(), [points]);
  const trackingStatus = route?.trackingStatus ?? route?.status ?? 'IN_PROGRESS';
  const distance = route?.liveDistanceKm ?? route?.totalDistanceKm;
  const duration = route?.liveDurationMinutes ?? route?.totalDurationMinutes;

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Detalhe da rota">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{route ? route.employee.name : 'Rota'}</h2>
            <p>{route ? `${formatDateTime(route.startedAt)} - ${formatVehicleName(route.vehicle)}` : 'Resumo da jornada em campo.'}</p>
          </div>
          <div className="table-actions">
            <button className="button secondary" disabled={isRefreshing} onClick={() => void loadRoute(true)} type="button">
              <RefreshCw size={16} aria-hidden="true" />
              {isRefreshing ? 'Atualizando' : 'Atualizar'}
            </button>
            <Link className="button secondary" href="/empresa/rotas">
              Voltar
            </Link>
          </div>
        </div>

        {isLoading ? <div className="panel-note">Carregando rota...</div> : null}
        {error ? <div className="form-message error">{error}</div> : null}
      </section>

      {route ? (
        <>
          <section className="metrics-grid">
            <MetricCard icon={RouteIcon} label="Km total" value={formatRouteDistance(distance)} detail="calculado com pontos validos" />
            <MetricCard icon={Clock3} label="Duracao" value={formatDuration(duration)} detail="tempo total ou parcial" tone="green" />
            <MetricCard icon={MapPin} label="Pontos" value={route.pointsCount ?? points.length} detail="pontos GPS recebidos" tone="amber" />
            <div className="metric-card">
              <div className="metric-card-head">
                <span>Status</span>
                <span className="metric-icon" aria-hidden="true">
                  <Activity size={18} strokeWidth={2.4} />
                </span>
              </div>
              <strong className="metric-status">
                <StatusBadge
                  status={trackingStatus}
                  label={trackingStatusLabels[trackingStatus] ?? routeStatusLabels[route.status]}
                />
              </strong>
              <small>{route.status === 'IN_PROGRESS' ? 'atualiza a cada 5 segundos' : 'jornada encerrada'}</small>
            </div>
          </section>

          <section className="panel route-detail-map-panel">
            <div className="panel-header">
              <div>
                <h2>Mapa do trajeto</h2>
                <p>Ponto inicial, percurso recebido e ponto atual ou final da rota.</p>
              </div>
            </div>
            <RouteMap
              currentPoint={route.currentPoint ?? route.latestPoint}
              endPoint={endPointFromRoute(route)}
              points={points}
              startPoint={route.startPoint}
              status={route.status}
            />
          </section>

          <section className="detail-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Funcionário</h2>
                  <p>Dados do responsavel pela rota.</p>
                </div>
              </div>
              <div className="details-list">
                <div>
                  <span>Nome</span>
                  <strong>{route.employee.name}</strong>
                </div>
                <div>
                  <span>E-mail</span>
                  <strong>{route.employee.email}</strong>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Veículo</h2>
                  <p>Veículo usado durante o turno.</p>
                </div>
              </div>
              <div className="details-list">
                <div>
                  <span>Identificacao</span>
                  <strong>{formatVehicleName(route.vehicle)}</strong>
                </div>
                <div>
                  <span>Km atual</span>
                  <strong>{route.vehicle ? formatRouteDistance(route.vehicle.currentKm) : '-'}</strong>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Periodo</h2>
                  <p>Início, fim e ultima atualizacao recebida.</p>
                </div>
              </div>
              <div className="details-list">
                <div>
                  <span>Início</span>
                  <strong>{formatDateTime(route.startedAt)}</strong>
                </div>
                <div>
                  <span>Fim</span>
                  <strong>{formatDateTime(route.endedAt)}</strong>
                </div>
                <div>
                  <span>Ultimo ponto</span>
                  <strong>{formatDateTime(route.lastPointAt)}</strong>
                </div>
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h2>Coordenadas</h2>
                  <p>Referencia inicial e posicao atual/final.</p>
                </div>
              </div>
              <div className="details-list">
                <div>
                  <span>Início</span>
                  <strong>
                    {route.startPoint
                      ? `${formatCoordinate(route.startPoint.latitude)}, ${formatCoordinate(route.startPoint.longitude)}`
                      : '-'}
                  </strong>
                </div>
                <div>
                  <span>
                    <Navigation size={13} aria-hidden="true" /> Atual
                  </span>
                  <strong>
                    {route.currentPoint
                      ? `${formatCoordinate(route.currentPoint.latitude)}, ${formatCoordinate(route.currentPoint.longitude)}`
                      : '-'}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Pontos da rota</h2>
                <p>Timeline dos pontos GPS recebidos pelo backend.</p>
              </div>
            </div>

            <div className="timeline-list">
              {latestPoints.map((point, index) => (
                <article className="timeline-item" key={point.id}>
                  <div className="timeline-marker">{points.length - index}</div>
                  <div>
                    <strong>{formatDateTime(point.recordedAt)}</strong>
                    <span>
                      Lat {formatCoordinate(point.latitude)} - Lng {formatCoordinate(point.longitude)}
                    </span>
                    <small>{formatPointDetails(point)}</small>
                  </div>
                </article>
              ))}
              {!points.length ? <div className="panel-note">Nenhum ponto recebido para esta rota.</div> : null}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
