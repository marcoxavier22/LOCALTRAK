'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CalendarDays, Camera, CheckCircle2, ClipboardList, Gauge, MapPin, Save } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { GoogleMapPreview } from '@/components/GoogleMapPreview';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, toJsonBody } from '@/lib/api';
import { formatOdometer, orderStatusLabels, orderStopStatusLabels } from '@/lib/order-labels';
import { formatDateTime } from '@/lib/route-labels';
import { formatKm } from '@/lib/vehicle-labels';
import type { Employee, RoutePoint, ServiceOrder, ServiceOrderStatus, ServiceOrderTracking, Vehicle } from '@/types';

const RouteMap = dynamic(() => import('@/components/RouteMap').then((module) => module.RouteMap), {
  ssr: false,
  loading: () => <div className="route-map route-map-empty">Carregando mapa...</div>,
});

function toLocalInput(value?: string | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function buildStopMapPoints(order: ServiceOrder): RoutePoint[] {
  return order.stops
    .filter((stop) => stop.latitude && stop.longitude)
    .map((stop) => ({
      id: stop.id,
      latitude: stop.latitude ?? 0,
      longitude: stop.longitude ?? 0,
      recordedAt: stop.completedAt ?? order.scheduledDate,
    }));
}

export default function CompanyOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tracking, setTracking] = useState<ServiceOrderTracking | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [loadedOrder, loadedEmployees, loadedVehicles] = await Promise.all([
        apiFetch<ServiceOrder>(`/orders/${params.id}`),
        apiFetch<Employee[]>('/company/employees'),
        apiFetch<Vehicle[]>('/company/vehicles'),
      ]);

      setOrder(loadedOrder);
      setEmployees(loadedEmployees);
      setVehicles(loadedVehicles);
      const loadedTracking = await apiFetch<ServiceOrderTracking>(`/orders/${params.id}/tracking`);
      setTracking(loadedTracking);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar a OS.');
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (order?.status !== 'IN_PROGRESS') {
      return;
    }

    const timer = window.setInterval(async () => {
      const loadedTracking = await apiFetch<ServiceOrderTracking>(`/orders/${params.id}/tracking`).catch(() => null);
      if (loadedTracking) {
        setTracking(loadedTracking);
      }
    }, 5000);

    return () => window.clearInterval(timer);
  }, [order?.status, params.id]);

  const plannedMapPoints = useMemo(() => (order ? buildStopMapPoints(order) : []), [order]);
  const mapPoints = tracking?.points?.length ? tracking.points : plannedMapPoints;
  const completedStops = order?.stops.filter((stop) => stop.status === 'COMPLETED').length ?? 0;
  const firstStop = order?.stops[0] ?? null;

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!order) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    const formData = new FormData(event.currentTarget);
    const scheduledDate = String(formData.get('scheduledDate') ?? '');

    try {
      const updated = await apiFetch<ServiceOrder>(`/orders/${order.id}`, {
        method: 'PATCH',
        body: toJsonBody({
          title: String(formData.get('title') ?? '').trim(),
          description: String(formData.get('description') ?? '').trim() || null,
          employeeId: String(formData.get('employeeId') ?? '') || null,
          vehicleId: String(formData.get('vehicleId') ?? '') || null,
          status: String(formData.get('status') ?? order.status) as ServiceOrderStatus,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : order.scheduledDate,
          notes: String(formData.get('notes') ?? '').trim() || null,
        }),
      });

      setOrder(updated);
      setSuccess('Ordem de servico atualizada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel atualizar a OS.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Detalhe da OS">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{order?.title ?? 'Ordem de servico'}</h2>
            <p>{order ? `${formatDateTime(order.scheduledDate)} - ${order.employee?.name ?? 'sem funcionario'}` : 'Carregando dados da ordem.'}</p>
          </div>
          <div className="table-actions">
            <button className="button secondary" onClick={() => void loadOrder()} type="button">
              Atualizar
            </button>
            <Link className="button secondary" href="/empresa/ordens">
              Voltar
            </Link>
          </div>
        </div>
        {isLoading ? <div className="panel-note">Carregando OS...</div> : null}
        {error ? <div className="form-message error">{error}</div> : null}
        {success ? <div className="form-message success">{success}</div> : null}
      </section>

      {order ? (
        <>
          <section className="metrics-grid">
            <MetricCard icon={ClipboardList} label="Status" value={orderStatusLabels[order.status]} detail="situacao operacional" />
            <MetricCard icon={CheckCircle2} label="Paradas" value={`${completedStops}/${order.stops.length}`} detail="enderecos concluidos" tone="green" />
            <MetricCard icon={Gauge} label="KM odometro" value={formatKm(order.odometerDistanceKm)} detail="km final - km inicial" tone="amber" />
            <MetricCard icon={CalendarDays} label="GPS" value={formatKm(tracking?.liveDistanceKm ?? order.routeShift?.totalDistanceKm ?? 0)} detail={`${tracking?.pointsCount ?? order.routeShift?._count?.points ?? 0} pontos recebidos`} />
          </section>

          <section className="detail-grid">
            <form className="panel form-grid" key={order.id} onSubmit={handleUpdate}>
              <div className="form-section">
                <div className="section-title">
                  <h2>Editar OS</h2>
                  <p>Atualize status, atribuicao e dados basicos.</p>
                </div>
                <label>
                  Titulo
                  <input defaultValue={order.title} name="title" required />
                </label>
                <label>
                  Descricao
                  <input defaultValue={order.description ?? ''} name="description" />
                </label>
                <div className="field-row">
                  <label>
                    Funcionario
                    <select defaultValue={order.employeeId ?? ''} name="employeeId">
                      <option value="">Sem atribuicao</option>
                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Veiculo
                    <select defaultValue={order.vehicleId ?? ''} name="vehicleId">
                      <option value="">Sem veiculo</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.plate} - {vehicle.brand} {vehicle.model}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="field-row">
                  <label>
                    Status
                    <select defaultValue={order.status} name="status">
                      {Object.entries(orderStatusLabels).map(([status, label]) => (
                        <option key={status} value={status}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Data de execucao
                    <input defaultValue={toLocalInput(order.scheduledDate)} name="scheduledDate" type="datetime-local" />
                  </label>
                </div>
                <label>
                  Observacoes
                  <textarea defaultValue={order.notes ?? ''} name="notes" rows={4} />
                </label>
              </div>
              <div className="form-actions">
                <button className="button primary" disabled={isSaving} type="submit">
                  <Save size={16} aria-hidden="true" />
                  {isSaving ? 'Salvando...' : 'Salvar OS'}
                </button>
              </div>
            </form>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Odometro</h2>
                  <p>Fotos registradas pelo funcionario no app mobile.</p>
                </div>
              </div>
              <div className="details-list">
                <div>
                  <span>KM inicial</span>
                  <strong>{formatOdometer(order.initialOdometerKm)}</strong>
                </div>
                <div>
                  <span>KM final</span>
                  <strong>{formatOdometer(order.finalOdometerKm)}</strong>
                </div>
                <div>
                  <span>Inicio/Fim</span>
                  <strong>
                    {formatDateTime(order.startedAt)} - {formatDateTime(order.finishedAt)}
                  </strong>
                </div>
              </div>
              <div className="odometer-photo-grid">
                <OdometerPhoto label="Foto inicial" src={order.initialOdometerPhotoUrl} />
                <OdometerPhoto label="Foto final" src={order.finalOdometerPhotoUrl} />
              </div>
            </section>
          </section>

          <section className="panel route-detail-map-panel">
            <div className="panel-header">
              <div>
                <h2>Roteiro planejado</h2>
                <p>{tracking?.points?.length ? 'Trajeto real recebido pelo app mobile.' : 'Enderecos da OS em ordem de visita. Pontos com coordenadas aparecem no mapa.'}</p>
              </div>
              <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
            </div>
            <RouteMap
              currentPoint={tracking?.currentPoint}
              points={mapPoints}
              startPoint={tracking?.startPoint}
              status={order.status}
              waypointPoints={order.stops
                .filter((stop) => stop.latitude && stop.longitude)
                .map((stop) => ({
                  id: stop.id,
                  latitude: stop.latitude ?? 0,
                  longitude: stop.longitude ?? 0,
                  label: `${stop.visitOrder}. ${stop.customerName ?? 'Cliente'}`,
                  status: stop.status,
                }))}
            />
            <div style={{ marginTop: 16 }}>
              <GoogleMapPreview
                address={firstStop?.address}
                latitude={firstStop?.latitude}
                longitude={firstStop?.longitude}
                title="Abrir ponto principal no Google Maps"
              />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Enderecos e visitas</h2>
                <p>Controle de pontos de atendimento da OS.</p>
              </div>
            </div>
            <div className="timeline-list">
              {order.stops.map((stop) => (
                <article className="timeline-item" key={stop.id}>
                  <div className="timeline-marker">
                    <MapPin size={14} aria-hidden="true" />
                  </div>
                  <div>
                    <strong>
                      {stop.visitOrder}. {stop.customerName ?? 'Cliente'}
                    </strong>
                    <span>{stop.address}</span>
                    <small>
                      <StatusBadge status={stop.status} label={orderStopStatusLabels[stop.status]} />{' '}
                      {stop.completedAt ? `concluido em ${formatDateTime(stop.completedAt)}` : ''}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

function OdometerPhoto({ label, src }: { label: string; src?: string | null }) {
  return (
    <div className="odometer-photo-card">
      <span>
        <Camera size={14} aria-hidden="true" />
        {label}
      </span>
      {src ? <img alt={label} className="odometer-photo" src={src} /> : <strong>Sem foto registrada</strong>}
    </div>
  );
}
