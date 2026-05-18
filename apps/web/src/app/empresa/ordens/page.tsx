'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ClipboardList, PlayCircle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, toJsonBody } from '@/lib/api';
import { orderStatusLabels } from '@/lib/order-labels';
import { formatDateTime } from '@/lib/route-labels';
import { formatKm } from '@/lib/vehicle-labels';
import type { Customer, Employee, ServiceOrder, ServiceOrderStatus, Vehicle } from '@/types';

type StopDraft = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  country: string;
  addressReference: string;
  latitude: string;
  longitude: string;
  customerId?: string;
};

const emptyStop = (): StopDraft => ({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  address: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  country: 'Brasil',
  addressReference: '',
  latitude: '',
  longitude: '',
  customerId: '',
});

function buildOrdersQuery(filters: {
  employeeId: string;
  vehicleId: string;
  status: string;
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams();

  if (filters.employeeId) params.set('employeeId', filters.employeeId);
  if (filters.vehicleId) params.set('vehicleId', filters.vehicleId);
  if (filters.status) params.set('status', filters.status);
  if (filters.startDate) params.set('startDate', new Date(`${filters.startDate}T00:00:00`).toISOString());
  if (filters.endDate) params.set('endDate', new Date(`${filters.endDate}T23:59:59`).toISOString());

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function CompanyOrdersPage() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stops, setStops] = useState<StopDraft[]>([emptyStop()]);
  const [isSearchingCep, setIsSearchingCep] = useState<{ [key: number]: boolean }>({});
  const [filters, setFilters] = useState({
    employeeId: '',
    vehicleId: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(
    () => ({
      pending: orders.filter((order) => order.status === 'PENDING').length,
      inProgress: orders.filter((order) => order.status === 'IN_PROGRESS').length,
      finished: orders.filter((order) => order.status === 'FINISHED').length,
    }),
    [orders],
  );

  async function loadData() {
    setIsLoading(true);
    setError('');

    try {
      const query = buildOrdersQuery(filters);
      const [loadedOrders, loadedEmployees, loadedVehicles, loadedCustomers] = await Promise.all([
        apiFetch<ServiceOrder[]>(`/orders${query}`),
        apiFetch<Employee[]>('/company/employees'),
        apiFetch<Vehicle[]>('/company/vehicles'),
        apiFetch<Customer[]>('/company/customers').catch(() => []),
      ]);

      setOrders(loadedOrders);
      setEmployees(loadedEmployees);
      setVehicles(loadedVehicles);
      setCustomers(loadedCustomers);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar ordens de servico.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCepLookup(index: number, cep: string) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      alert('CEP inválido. Deve conter 8 dígitos.');
      return;
    }

    setIsSearchingCep((prev) => ({ ...prev, [index]: true }));

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();

      if (data.erro) {
        alert('CEP não encontrado.');
      } else {
        const formattedAddress = `${data.logradouro}, ${data.bairro} - ${data.localidade} / ${data.uf}`;
        updateStop(index, 'cep', cleanCep);
        updateStop(index, 'street', data.logradouro ?? '');
        updateStop(index, 'neighborhood', data.bairro ?? '');
        updateStop(index, 'city', data.localidade ?? '');
        updateStop(index, 'state', data.uf ?? '');
        updateStop(index, 'country', 'Brasil');
        updateStop(index, 'address', formattedAddress);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar o CEP.');
    } finally {
      setIsSearchingCep((prev) => ({ ...prev, [index]: false }));
    }
  }

  async function handleCreateOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      title: String(formData.get('title') ?? '').trim(),
      description: String(formData.get('description') ?? '').trim() || undefined,
      employeeId: String(formData.get('employeeId') ?? '') || undefined,
      vehicleId: String(formData.get('vehicleId') ?? '') || undefined,
      scheduledDate: new Date(String(formData.get('scheduledDate'))).toISOString(),
      stops: stops
        .filter((stop) => stop.address.trim())
        .map((stop, index) => ({
          customerId: stop.customerId || undefined,
          customerName: stop.customerName.trim() || undefined,
          customerEmail: stop.customerEmail.trim() || undefined,
          customerPhone: stop.customerPhone.trim() || undefined,
          address: stop.address.trim(),
          cep: stop.cep.trim() || undefined,
          street: stop.street.trim() || undefined,
          number: stop.number.trim() || undefined,
          complement: stop.complement.trim() || undefined,
          neighborhood: stop.neighborhood.trim() || undefined,
          city: stop.city.trim() || undefined,
          state: stop.state.trim() || undefined,
          country: stop.country.trim() || undefined,
          addressReference: stop.addressReference.trim() || undefined,
          visitOrder: index + 1,
        })),
    };

    try {
      await apiFetch<ServiceOrder>('/orders', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      event.currentTarget.reset();
      setStops([emptyStop()]);
      setSuccess('Ordem de servico criada.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel criar a OS.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateStop(index: number, key: keyof StopDraft, value: string) {
    setStops((current) => current.map((stop, stopIndex) => (stopIndex === index ? { ...stop, [key]: value } : stop)));
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Ordens de Servico">
      {error ? <div className="form-message error">{error}</div> : null}
      {success ? <div className="form-message success">{success}</div> : null}

      <section className="metrics-grid">
        <MetricCard icon={ClipboardList} label="OS do filtro" value={isLoading ? '...' : orders.length} detail="agenda operacional" />
        <MetricCard icon={CalendarDays} label="Pendentes" value={isLoading ? '...' : totals.pending} detail="aguardando inicio" tone="amber" />
        <MetricCard icon={PlayCircle} label="Em andamento" value={isLoading ? '...' : totals.inProgress} detail="em campo agora" tone="green" />
        <MetricCard icon={CheckCircle2} label="Finalizadas" value={isLoading ? '...' : totals.finished} detail="com odometro final" />
      </section>

      <section className="detail-grid">
        <form className="panel form-grid" onSubmit={handleCreateOrder}>
          <div className="form-section">
            <div className="section-title">
              <h2>Criar nova OS</h2>
              <p>Atribua funcionario, veiculo e enderecos da rota do dia.</p>
            </div>

            <label>
              Titulo
              <input name="title" placeholder="Instalacao cliente Zona Norte" required />
            </label>

            <label>
              Descricao
              <input name="description" placeholder="Detalhes da execucao" />
            </label>

            <div className="field-row">
              <label>
                Funcionario
                <select name="employeeId">
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
                <select name="vehicleId">
                  <option value="">Sem veiculo</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate} - {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Data de execucao
              <input name="scheduledDate" required type="datetime-local" />
            </label>
          </div>

          <div className="form-section">
            <div className="section-title">
              <h2>Endereços da rota</h2>
              <p>Busque clientes cadastrados ou consulte endereços por CEP de forma simplificada.</p>
            </div>

            {stops.map((stop, index) => (
              <div className="stop-editor" key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong>Parada {index + 1}</strong>
                  {stops.length > 1 && (
                    <button
                      type="button"
                      className="button secondary small"
                      style={{ color: '#ef4444', padding: '2px 8px' }}
                      onClick={() => setStops((current) => current.filter((_, idx) => idx !== index))}
                    >
                      Remover
                    </button>
                  )}
                </div>

                <label>
                  Vincular Cliente Cadastrado (Opcional)
                  <select
                    value={stop.customerId || ''}
                    onChange={(event) => {
                      const selectedId = event.target.value;
                      if (selectedId) {
                        const cust = customers.find((c) => c.id === selectedId);
                        if (cust) {
                          updateStop(index, 'customerId', cust.id);
                          updateStop(index, 'customerName', cust.name);
                          updateStop(index, 'customerEmail', cust.email ?? '');
                          updateStop(index, 'customerPhone', cust.phone ?? '');
                          updateStop(index, 'address', cust.address);
                          updateStop(index, 'cep', cust.cep ?? '');
                          updateStop(index, 'street', cust.street ?? '');
                          updateStop(index, 'number', cust.number ?? '');
                          updateStop(index, 'complement', cust.complement ?? '');
                          updateStop(index, 'neighborhood', cust.neighborhood ?? '');
                          updateStop(index, 'city', cust.city ?? '');
                          updateStop(index, 'state', cust.state ?? '');
                          updateStop(index, 'country', cust.country ?? 'Brasil');
                        }
                      } else {
                        updateStop(index, 'customerId', '');
                        updateStop(index, 'customerName', '');
                        updateStop(index, 'customerEmail', '');
                        updateStop(index, 'customerPhone', '');
                        updateStop(index, 'address', '');
                        updateStop(index, 'cep', '');
                        updateStop(index, 'street', '');
                        updateStop(index, 'number', '');
                        updateStop(index, 'complement', '');
                        updateStop(index, 'neighborhood', '');
                        updateStop(index, 'city', '');
                        updateStop(index, 'state', '');
                        updateStop(index, 'country', 'Brasil');
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">-- Selecione um cliente --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.address})
                      </option>
                    ))}
                  </select>
                </label>

                <div className="field-row" style={{ marginTop: '8px' }}>
                  <label style={{ flex: '1' }}>
                    Cliente / Nome do Contato
                    <input
                      value={stop.customerName}
                      onChange={(event) => updateStop(index, 'customerName', event.target.value)}
                      placeholder="Ex: Auto Posto Silva"
                    />
                  </label>

                  <label style={{ flex: '1' }}>
                    Buscar Endereço por CEP
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        placeholder="Ex: 01310-100"
                        id={`cep-${index}`}
                        maxLength={9}
                        type="text"
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => {
                          const input = document.getElementById(`cep-${index}`) as HTMLInputElement;
                          if (input) {
                            handleCepLookup(index, input.value);
                          }
                        }}
                        disabled={isSearchingCep[index]}
                      >
                        {isSearchingCep[index] ? '...' : 'Buscar'}
                      </button>
                    </div>
                  </label>
                </div>

                <label style={{ marginTop: '8px', display: 'block' }}>
                  Endereço completo
                  <input
                    required
                    value={stop.address}
                    onChange={(event) => updateStop(index, 'address', event.target.value)}
                    placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                    style={{ width: '100%' }}
                  />
                </label>

                <div className="field-row" style={{ marginTop: '8px' }}>
                  <label>
                    Rua
                    <input value={stop.street} onChange={(event) => updateStop(index, 'street', event.target.value)} />
                  </label>
                  <label>
                    Numero
                    <input value={stop.number} onChange={(event) => updateStop(index, 'number', event.target.value)} />
                  </label>
                </div>

                <div className="field-row" style={{ marginTop: '8px' }}>
                  <label>
                    Bairro
                    <input value={stop.neighborhood} onChange={(event) => updateStop(index, 'neighborhood', event.target.value)} />
                  </label>
                  <label>
                    Cidade
                    <input value={stop.city} onChange={(event) => updateStop(index, 'city', event.target.value)} />
                  </label>
                  <label>
                    UF
                    <input maxLength={2} value={stop.state} onChange={(event) => updateStop(index, 'state', event.target.value.toUpperCase())} />
                  </label>
                </div>

                <label style={{ marginTop: '8px', display: 'block' }}>
                  Referencia / observacoes do endereco
                  <input
                    value={stop.addressReference}
                    onChange={(event) => updateStop(index, 'addressReference', event.target.value)}
                    placeholder="Portao azul, entrada lateral, bloco B..."
                    style={{ width: '100%' }}
                  />
                </label>

                <details style={{ display: 'none' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#6d28d9', fontWeight: 'bold' }}>
                    Coordenadas Manuais (Opcional / Avançado)
                  </summary>
                  <div className="field-row" style={{ marginTop: '8px' }}>
                    <label>
                      Latitude
                      <input
                        value={stop.latitude}
                        onChange={(event) => updateStop(index, 'latitude', event.target.value)}
                        placeholder="Ex: -23.55052"
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        value={stop.longitude}
                        onChange={(event) => updateStop(index, 'longitude', event.target.value)}
                        placeholder="Ex: -46.633308"
                      />
                    </label>
                  </div>
                </details>
              </div>
            ))}

            <button className="button secondary" type="button" onClick={() => setStops((current) => [...current, emptyStop()])}>
              Adicionar endereço
            </button>
          </div>

          <div className="form-actions">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Criando...' : 'Criar OS'}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Filtros</h2>
              <p>Controle a agenda por funcionario, status, veiculo e data.</p>
            </div>
          </div>
          <div className="form-grid compact">
            <label>
              Funcionario
              <select onChange={(event) => setFilters((current) => ({ ...current, employeeId: event.target.value }))} value={filters.employeeId}>
                <option value="">Todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Veiculo
              <select onChange={(event) => setFilters((current) => ({ ...current, vehicleId: event.target.value }))} value={filters.vehicleId}>
                <option value="">Todos</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} value={filters.status}>
                <option value="">Todos</option>
                {Object.entries(orderStatusLabels).map(([status, label]) => (
                  <option key={status} value={status}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <label>
                Inicio
                <input onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} type="date" value={filters.startDate} />
              </label>
              <label>
                Fim
                <input onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} type="date" value={filters.endDate} />
              </label>
            </div>
            <button className="button secondary" onClick={() => void loadData()} type="button">
              Aplicar filtros
            </button>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Agenda de OS</h2>
            <p>Historico e acompanhamento das ordens atribuidas aos funcionarios.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>OS</th>
                <th>Funcionario</th>
                <th>Veiculo</th>
                <th>Data</th>
                <th>Status</th>
                <th>KM</th>
                <th>Paradas</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.title}</strong>
                    <span>{order.description ?? '-'}</span>
                  </td>
                  <td>{order.employee?.name ?? 'Sem atribuicao'}</td>
                  <td>{order.vehicle ? `${order.vehicle.plate} - ${order.vehicle.model}` : '-'}</td>
                  <td>{formatDateTime(order.scheduledDate)}</td>
                  <td>
                    <StatusBadge status={order.status} label={orderStatusLabels[order.status]} />
                  </td>
                  <td>{formatKm(order.odometerDistanceKm)}</td>
                  <td>{order.stops.length}</td>
                  <td>
                    <Link className="button secondary small" href={`/empresa/ordens/${order.id}`}>
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
              {isLoading ? (
                <tr>
                  <td colSpan={8}>Carregando OS...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {!isLoading && orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Nenhuma OS encontrada" description="Crie uma ordem de servico para iniciar a agenda de campo." />
        ) : null}
      </section>
    </AppShell>
  );
}
