'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, CheckCircle2, Gauge, ReceiptText } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, toJsonBody } from '@/lib/api';
import { formatDateTime } from '@/lib/route-labels';
import {
  emptyReimbursementReport,
  formatCurrency,
  fuelTypeLabels,
  reimbursementPaymentStatusLabels,
} from '@/lib/fuel-labels';
import { formatKm, vehicleOwnershipLabels } from '@/lib/vehicle-labels';
import type {
  Employee,
  ReimbursementPayment,
  ReimbursementPaymentStatus,
  ReimbursementReport,
  Vehicle,
} from '@/types';

type PaymentForm = {
  employeeId: string;
  vehicleId: string;
  distanceKm: string;
  fuelCost: string;
  amount: string;
  description: string;
  paidAt: string;
  status: ReimbursementPaymentStatus;
};

const emptyPaymentForm = (): PaymentForm => ({
  employeeId: '',
  vehicleId: '',
  distanceKm: '',
  fuelCost: '',
  amount: '',
  description: '',
  paidAt: new Date().toISOString().slice(0, 10),
  status: 'PAID',
});

const paymentStatusOptions: ReimbursementPaymentStatus[] = ['PENDING', 'PAID'];

function buildReportQuery(startDate: string, endDate: string, employeeId: string, vehicleId: string) {
  const params = new URLSearchParams();

  if (startDate) {
    params.set('startDate', new Date(`${startDate}T00:00:00`).toISOString());
  }

  if (endDate) {
    params.set('endDate', new Date(`${endDate}T23:59:59`).toISOString());
  }

  if (employeeId) {
    params.set('employeeId', employeeId);
  }

  if (vehicleId) {
    params.set('vehicleId', vehicleId);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

function buildPaymentsQuery(
  startDate: string,
  endDate: string,
  employeeId: string,
  vehicleId: string,
  status: string,
) {
  const params = new URLSearchParams();

  if (startDate) {
    params.set('startDate', new Date(`${startDate}T00:00:00`).toISOString());
  }

  if (endDate) {
    params.set('endDate', new Date(`${endDate}T23:59:59`).toISOString());
  }

  if (employeeId) {
    params.set('employeeId', employeeId);
  }

  if (vehicleId) {
    params.set('vehicleId', vehicleId);
  }

  if (status) {
    params.set('status', status);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function ReimbursementsPage() {
  const [report, setReport] = useState<ReimbursementReport>(emptyReimbursementReport());
  const [payments, setPayments] = useState<ReimbursementPayment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [form, setForm] = useState<PaymentForm>(emptyPaymentForm());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  const paidTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'PAID')
        .reduce((total, payment) => total + Number(payment.amount ?? 0), 0),
    [payments],
  );

  const pendingTotal = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === 'PENDING')
        .reduce((total, payment) => total + Number(payment.amount ?? 0), 0),
    [payments],
  );

  async function loadData() {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const reportQuery = buildReportQuery(startDate, endDate, selectedEmployeeId, selectedVehicleId);
      const paymentsQuery = buildPaymentsQuery(
        startDate,
        endDate,
        selectedEmployeeId,
        selectedVehicleId,
        paymentStatus,
      );
      const reportPath = `/company/reimbursements${reportQuery}`;

      const [loadedReport, loadedPayments, loadedEmployees, loadedVehicles] = await Promise.all([
        apiFetch<ReimbursementReport>(reportPath),
        apiFetch<ReimbursementPayment[]>(`/company/reimbursements/payments${paymentsQuery}`),
        apiFetch<Employee[]>('/company/employees'),
        apiFetch<Vehicle[]>('/company/vehicles'),
      ]);

      setReport(loadedReport);
      setPayments(loadedPayments);
      setEmployees(loadedEmployees);
      setVehicles(loadedVehicles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar reembolsos.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSaving(true);

    try {
      await apiFetch<ReimbursementPayment>('/company/reimbursements/payments', {
        method: 'POST',
        body: toJsonBody({
          employeeId: form.employeeId,
          vehicleId: form.vehicleId,
          distanceKm: Number(form.distanceKm),
          fuelCost: Number(form.fuelCost),
          amount: Number(form.amount),
          description: form.description,
          paidAt: new Date(`${form.paidAt}T12:00:00`).toISOString(),
          status: form.status,
        }),
      });

      setForm(emptyPaymentForm());
      setSuccess('Reembolso registrado com sucesso.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível registrar reembolso.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Reembolsos">
      {error ? <div className="form-message error">{error}</div> : null}
      {success ? <div className="form-message success">{success}</div> : null}

      <section className="metrics-grid">
        <MetricCard
          detail="Veículos particulares"
          icon={BadgeDollarSign}
          label="Reembolso Estimado"
          value={isLoading ? '...' : formatCurrency(report.totals.totalReimbursement)}
        />
        <MetricCard
          detail={`Pendente: ${formatCurrency(pendingTotal)}`}
          icon={CheckCircle2}
          label="Total Pago"
          tone="green"
          value={isLoading ? '...' : formatCurrency(paidTotal)}
        />
        <MetricCard
          detail="Veículos particulares"
          icon={Gauge}
          label="Km Reembolsável"
          tone="amber"
          value={isLoading ? '...' : formatKm(report.totals.employeeVehicleDistanceKm)}
        />
        <MetricCard
          detail="Rotas finalizadas"
          icon={ReceiptText}
          label="Rotas"
          value={isLoading ? '...' : report.totals.routesCount}
        />
      </section>

      <section className="detail-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Registrar Pagamento</h2>
              <p>Registre reembolsos pagos a funcionários com veículo particular.</p>
            </div>
          </div>
          <form className="form-grid compact" onSubmit={handleCreatePayment}>
            <label>
              Funcionário
              <select
                onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
                required
                value={form.employeeId}
              >
                <option value="">Selecione</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Veículo
              <select
                onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
                required
                value={form.vehicleId}
              >
                <option value="">Selecione</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <label>
                Km Reembolsado
                <input
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, distanceKm: event.target.value }))}
                  required
                  step="0.001"
                  type="number"
                  value={form.distanceKm}
                />
              </label>
              <label>
                Custo de Combustível
                <input
                  min="0"
                  onChange={(event) => setForm((current) => ({ ...current, fuelCost: event.target.value }))}
                  required
                  step="0.01"
                  type="number"
                  value={form.fuelCost}
                />
              </label>
            </div>
            <div className="field-row">
              <label>
                Valor
                <input
                  min="0.01"
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  required
                  step="0.01"
                  type="number"
                  value={form.amount}
                />
              </label>
              <label>
                Data
                <input
                  onChange={(event) => setForm((current) => ({ ...current, paidAt: event.target.value }))}
                  required
                  type="date"
                  value={form.paidAt}
                />
              </label>
            </div>
            <label>
              Status
              <select
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value as ReimbursementPaymentStatus }))
                }
                value={form.status}
              >
                {paymentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {reimbursementPaymentStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descrição
              <input
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Ex.: Reembolso de maio"
                required
                value={form.description}
              />
            </label>
            <div className="form-actions">
              <button className="button primary" disabled={isSaving} type="submit">
                {isSaving ? 'Salvando...' : 'Registrar Reembolso'}
              </button>
            </div>
          </form>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Filtros</h2>
              <p>Analise estimativas, pagamentos e histórico por período.</p>
            </div>
          </div>
          <div className="form-grid compact">
            <label>
              Funcionário
              <select onChange={(event) => setSelectedEmployeeId(event.target.value)} value={selectedEmployeeId}>
                <option value="">Todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Veículo
              <select onChange={(event) => setSelectedVehicleId(event.target.value)} value={selectedVehicleId}>
                <option value="">Todos</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-row">
              <label>
                Início
                <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
              </label>
              <label>
                Fim
                <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
              </label>
            </div>
            <label>
              Status do Pagamento
              <select onChange={(event) => setPaymentStatus(event.target.value)} value={paymentStatus}>
                <option value="">Todos</option>
                {paymentStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {reimbursementPaymentStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button className="button secondary" onClick={() => void loadData()} type="button">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Pagamentos Registrados</h2>
            <p>Histórico operacional de valores pagos aos funcionários.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Veículo</th>
                <th>Data</th>
                <th>Km</th>
                <th>Custo Combustível</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.employee?.name ?? 'Funcionário'}</strong>
                    <span>{payment.employee?.email ?? '-'}</span>
                  </td>
                  <td>
                    <strong>{payment.vehicle?.plate ?? '-'}</strong>
                    <span>
                      {payment.vehicle?.brand ?? ''} {payment.vehicle?.model ?? ''}
                    </span>
                  </td>
                  <td>{formatDateTime(payment.paidAt)}</td>
                  <td>{formatKm(payment.distanceKm)}</td>
                  <td>{formatCurrency(payment.fuelCost)}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>
                    <StatusBadge status={payment.status} label={reimbursementPaymentStatusLabels[payment.status]} />
                  </td>
                  <td>{payment.description ?? '-'}</td>
                </tr>
              ))}
              {!isLoading && payments.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhum pagamento registrado no período.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Ranking por Funcionário</h2>
            <p>Ordenado pelo maior valor de reembolso estimado.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Rotas</th>
                <th>Km</th>
                <th>Custo Combustível</th>
                <th>Reembolso</th>
              </tr>
            </thead>
            <tbody>
              {report.byEmployee.map((row) => (
                <tr key={row.employee.id}>
                  <td>
                    <strong>{row.employee.name}</strong>
                    <span>{row.employee.email}</span>
                  </td>
                  <td>{row.routesCount}</td>
                  <td>{formatKm(row.totalDistanceKm)}</td>
                  <td>{formatCurrency(row.totalFuelCost)}</td>
                  <td>{formatCurrency(row.totalReimbursement)}</td>
                </tr>
              ))}
              {!isLoading && report.byEmployee.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhuma rota finalizada no período.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Rotas Consideradas</h2>
            <p>Base usada para os totais do período.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Veículo</th>
                <th>Fim</th>
                <th>Km</th>
                <th>Custo Combustível</th>
                <th>Reembolso</th>
              </tr>
            </thead>
            <tbody>
              {report.routes.map((route) => (
                <tr key={route.id}>
                  <td>
                    <strong>{route.employee.name}</strong>
                    <span>{route.employee.email}</span>
                  </td>
                  <td>
                    {route.vehicle ? (
                      <>
                        <strong>{route.vehicle.plate}</strong>
                        <span>
                          {vehicleOwnershipLabels[route.vehicle.ownershipType]} -{' '}
                          {route.vehicle.fuelType ? fuelTypeLabels[route.vehicle.fuelType] : '-'}
                        </span>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{formatDateTime(route.endedAt)}</td>
                  <td>{formatKm(route.totalDistanceKm)}</td>
                  <td>{formatCurrency(route.estimatedFuelCost)}</td>
                  <td>{formatCurrency(route.reimbursementValue)}</td>
                </tr>
              ))}
              {!isLoading && report.routes.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhuma rota finalizada no período.</td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td colSpan={6}>Carregando reembolsos...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
