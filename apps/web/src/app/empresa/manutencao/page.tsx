'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CircleDollarSign, Wrench } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, toJsonBody } from '@/lib/api';
import { formatDateTime } from '@/lib/route-labels';
import { formatKm } from '@/lib/vehicle-labels';
import {
  formatCurrency,
  formatRuleInterval,
  maintenanceStatusLabels,
  maintenanceTypeLabels,
} from '@/lib/maintenance-labels';
import type {
  MaintenanceAlert,
  Employee,
  MaintenanceRule,
  MaintenanceStatus,
  MaintenanceType,
  Vehicle,
  VehicleMaintenanceRecord,
} from '@/types';

const maintenanceTypes = Object.keys(maintenanceTypeLabels) as MaintenanceType[];
const recordStatuses: MaintenanceStatus[] = ['DONE', 'SCHEDULED', 'OVERDUE', 'CANCELED'];

function optionalNumber(formData: FormData, key: string) {
  const rawValue = String(formData.get(key) ?? '').trim();
  return rawValue === '' ? undefined : Number(rawValue);
}

function optionalString(formData: FormData, key: string) {
  const rawValue = String(formData.get(key) ?? '').trim();
  return rawValue === '' ? undefined : rawValue;
}

function toIsoDateTime(formData: FormData, key: string) {
  const rawValue = optionalString(formData, key);
  return rawValue ? new Date(rawValue).toISOString() : undefined;
}

function buildMaintenanceRecordsQuery(filters: {
  vehicleId: string;
  employeeId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
}) {
  const params = new URLSearchParams();

  if (filters.vehicleId) {
    params.set('vehicleId', filters.vehicleId);
  }

  if (filters.employeeId) {
    params.set('employeeId', filters.employeeId);
  }

  if (filters.type) {
    params.set('type', filters.type);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.startDate) {
    params.set('startDate', new Date(`${filters.startDate}T00:00:00`).toISOString());
  }

  if (filters.endDate) {
    params.set('endDate', new Date(`${filters.endDate}T23:59:59`).toISOString());
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function MaintenancePage() {
  const [rules, setRules] = useState<MaintenanceRule[]>([]);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<VehicleMaintenanceRecord[]>([]);
  const [history, setHistory] = useState<VehicleMaintenanceRecord[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [recordFilters, setRecordFilters] = useState({
    vehicleId: '',
    employeeId: '',
    type: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [ruleError, setRuleError] = useState('');
  const [recordError, setRecordError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedVehicleId) {
      setHistory([]);
      return;
    }

    loadHistory(selectedVehicleId);
  }, [selectedVehicleId]);

  const recordsTotalCost = useMemo(
    () => records.reduce((total, record) => total + Number(record.cost ?? 0), 0),
    [records],
  );

  async function loadData() {
    setIsLoading(true);
    setError('');

    try {
      const [loadedRules, loadedAlerts, loadedVehicles, loadedEmployees, loadedRecords] = await Promise.all([
        apiFetch<MaintenanceRule[]>('/company/maintenance/rules'),
        apiFetch<MaintenanceAlert[]>('/company/maintenance/alerts'),
        apiFetch<Vehicle[]>('/company/vehicles'),
        apiFetch<Employee[]>('/company/employees'),
        apiFetch<VehicleMaintenanceRecord[]>('/company/maintenance/records'),
      ]);

      setRules(loadedRules);
      setAlerts(loadedAlerts);
      setVehicles(loadedVehicles);
      setEmployees(loadedEmployees);
      setRecords(loadedRecords);
      setSelectedVehicleId((current) => current || loadedVehicles[0]?.id || '');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar manutenção.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadRecords() {
    setIsRecordsLoading(true);
    setError('');

    try {
      const query = buildMaintenanceRecordsQuery(recordFilters);
      const loadedRecords = await apiFetch<VehicleMaintenanceRecord[]>(`/company/maintenance/records${query}`);
      setRecords(loadedRecords);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar registros.');
    } finally {
      setIsRecordsLoading(false);
    }
  }

  async function loadHistory(vehicleId: string) {
    setIsHistoryLoading(true);

    try {
      const vehicleHistory = await apiFetch<VehicleMaintenanceRecord[]>(
        `/company/vehicles/${vehicleId}/maintenance`,
      );
      setHistory(vehicleHistory);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Não foi possível carregar histórico do veículo.',
      );
    } finally {
      setIsHistoryLoading(false);
    }
  }

  async function handleCreateRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRuleError('');
    setSuccess('');
    setIsSubmittingRule(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? ''),
      type: String(formData.get('type') ?? 'CUSTOM') as MaintenanceType,
      intervalKm: optionalNumber(formData, 'intervalKm'),
      intervalDays: optionalNumber(formData, 'intervalDays'),
      isActive: true,
    };

    try {
      await apiFetch<MaintenanceRule>('/company/maintenance/rules', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      event.currentTarget.reset();
      setSuccess('Regra de manutenção criada.');
      await loadData();
    } catch (requestError) {
      setRuleError(requestError instanceof Error ? requestError.message : 'Não foi possível criar a regra.');
    } finally {
      setIsSubmittingRule(false);
    }
  }

  async function toggleRule(rule: MaintenanceRule) {
    setError('');
    setSuccess('');

    try {
      await apiFetch<MaintenanceRule>(`/company/maintenance/rules/${rule.id}`, {
        method: 'PATCH',
        body: toJsonBody({ isActive: !rule.isActive }),
      });
      setSuccess(rule.isActive ? 'Regra desativada.' : 'Regra ativada.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar a regra.');
    }
  }

  async function handleCreateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecordError('');
    setSuccess('');
    setIsSubmittingRecord(true);

    const formData = new FormData(event.currentTarget);
    const vehicleId = String(formData.get('vehicleId') ?? '');
      const payload = {
        vehicleId,
        maintenanceRuleId: optionalString(formData, 'maintenanceRuleId'),
        type: String(formData.get('type') ?? 'CUSTOM') as MaintenanceType,
        description: String(formData.get('description') ?? '').trim(),
        performedAt: toIsoDateTime(formData, 'performedAt'),
        performedKm: optionalNumber(formData, 'performedKm'),
        cost: optionalNumber(formData, 'cost'),
      status: String(formData.get('status') ?? 'DONE') as MaintenanceStatus,
    };

    try {
      await apiFetch<VehicleMaintenanceRecord>('/company/maintenance/records', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      event.currentTarget.reset();
      setSelectedVehicleId(vehicleId);
      setSuccess('Manutenção registrada.');
      await Promise.all([loadData(), loadHistory(vehicleId), loadRecords()]);
    } catch (requestError) {
      setRecordError(
        requestError instanceof Error ? requestError.message : 'Não foi possível registrar a manutenção.',
      );
    } finally {
      setIsSubmittingRecord(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Manutenção preventiva">
      {error ? <div className="form-message error">{error}</div> : null}
      {success ? <div className="form-message success">{success}</div> : null}

      <section className="metrics-grid">
        <MetricCard
          detail="registros filtrados"
          icon={Wrench}
          label="Manutenções"
          value={isLoading ? '...' : records.length}
        />
        <MetricCard
          detail="precisam de ação"
          icon={AlertTriangle}
          label="Alertas"
          tone={alerts.length > 0 ? 'red' : 'green'}
          value={isLoading ? '...' : alerts.length}
        />
        <MetricCard
          detail="custo no filtro"
          icon={CircleDollarSign}
          label="Custo total"
          tone="amber"
          value={isLoading ? '...' : formatCurrency(recordsTotalCost)}
        />
        <MetricCard
          detail="regras ativas"
          icon={CalendarClock}
          label="Preventivas"
          value={isLoading ? '...' : rules.filter((rule) => rule.isActive).length}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Alertas</h2>
            <p>Manutenções vencidas por km atual ou por data prevista.</p>
          </div>
        </div>

        {isLoading ? <div className="panel-note">Carregando alertas...</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Regra</th>
                <th>Vencimento</th>
                <th>Motivo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>
                    <strong>{alert.vehicle.plate}</strong>
                    <span>
                      {alert.vehicle.brand} {alert.vehicle.model} - {formatKm(alert.vehicle.currentKm)}
                    </span>
                  </td>
                  <td>
                    <strong>{alert.rule.name}</strong>
                    <span>{maintenanceTypeLabels[alert.rule.type]}</span>
                  </td>
                  <td>
                    <strong>{alert.nextDueKm ? formatKm(alert.nextDueKm) : '-'}</strong>
                    <span>{alert.nextDueDate ? formatDateTime(alert.nextDueDate) : '-'}</span>
                  </td>
                  <td>
                    {alert.dueByKm ? <span>Km excedido em {formatKm(alert.overdueKm)}</span> : null}
                    {alert.dueByDate ? <span>{alert.daysOverdue} dias em atraso</span> : null}
                  </td>
                  <td>
                    <StatusBadge status="OVERDUE" label="Vencida" />
                  </td>
                </tr>
              ))}
              {!isLoading && alerts.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhum alerta de manutenção no momento.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="detail-grid">
        <form className="panel form-grid" onSubmit={handleCreateRule}>
          <div className="form-section">
            <div className="section-title">
              <h2>Criar regra</h2>
              <p>Configure manutenções recorrentes por km, por dias ou ambos.</p>
            </div>

            <label>
              Nome
              <input name="name" placeholder="Troca de oleo" required />
            </label>

            <label>
              Tipo
              <select name="type">
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {maintenanceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label>
                Intervalo km
                <input min="1" name="intervalKm" placeholder="5000" type="number" />
              </label>

              <label>
                Intervalo dias
                <input min="1" name="intervalDays" placeholder="180" type="number" />
              </label>
            </div>
          </div>

          {ruleError ? <div className="form-message error">{ruleError}</div> : null}

          <div className="form-actions">
            <button className="button primary" disabled={isSubmittingRule} type="submit">
              {isSubmittingRule ? 'Criando...' : 'Criar regra'}
            </button>
          </div>
        </form>

        <form className="panel form-grid" onSubmit={handleCreateRecord}>
          <div className="form-section">
            <div className="section-title">
              <h2>Registrar manutenção</h2>
              <p>Ao registrar, o sistema calcula a proxima manutenção com base na regra.</p>
            </div>

            <label>
              Veículo
              <select name="vehicleId" required>
                <option value="">Selecione</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Regra
              <select name="maintenanceRuleId">
                <option value="">Sem regra</option>
                {rules
                  .filter((rule) => rule.isActive)
                  .map((rule) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name} - {formatRuleInterval(rule.intervalKm, rule.intervalDays)}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Tipo de manutenção
              <select name="type" required>
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {maintenanceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Observacoes / descricao
              <input name="description" placeholder="Troca de oleo e filtro" required />
            </label>

            <div className="field-row">
              <label>
                Realizada em
                <input name="performedAt" required type="datetime-local" />
              </label>

              <label>
                Km atual do veículo
                <input min="0" name="performedKm" placeholder="50000" required type="number" />
              </label>
            </div>

            <div className="field-row">
              <label>
                Custo
                <input min="0" name="cost" placeholder="280" required step="0.01" type="number" />
              </label>

              <label>
                Status
                <select name="status" defaultValue="DONE">
                  {recordStatuses.map((status) => (
                    <option key={status} value={status}>
                      {maintenanceStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {recordError ? <div className="form-message error">{recordError}</div> : null}

          <div className="form-actions">
            <button className="button primary" disabled={isSubmittingRecord || vehicles.length === 0} type="submit">
              {isSubmittingRecord ? 'Registrando...' : 'Registrar manutenção'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Manutenções registradas</h2>
            <p>Filtre por veículo, funcionário, periodo, tipo e status.</p>
          </div>
        </div>
        <div className="table-toolbar">
          <div className="toolbar-actions">
            <label className="inline-filter">
              Veículo
              <select
                onChange={(event) => setRecordFilters((current) => ({ ...current, vehicleId: event.target.value }))}
                value={recordFilters.vehicleId}
              >
                <option value="">Todos</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-filter">
              Funcionário
              <select
                onChange={(event) => setRecordFilters((current) => ({ ...current, employeeId: event.target.value }))}
                value={recordFilters.employeeId}
              >
                <option value="">Todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="compact-filter">
              Tipo
              <select
                onChange={(event) => setRecordFilters((current) => ({ ...current, type: event.target.value }))}
                value={recordFilters.type}
              >
                <option value="">Todos</option>
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {maintenanceTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="compact-filter">
              Status
              <select
                onChange={(event) => setRecordFilters((current) => ({ ...current, status: event.target.value }))}
                value={recordFilters.status}
              >
                <option value="">Todos</option>
                {recordStatuses.map((status) => (
                  <option key={status} value={status}>
                    {maintenanceStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="compact-filter">
              Início
              <input
                onChange={(event) => setRecordFilters((current) => ({ ...current, startDate: event.target.value }))}
                type="date"
                value={recordFilters.startDate}
              />
            </label>
            <label className="compact-filter">
              Fim
              <input
                onChange={(event) => setRecordFilters((current) => ({ ...current, endDate: event.target.value }))}
                type="date"
                value={recordFilters.endDate}
              />
            </label>
            <button className="button secondary" onClick={() => void loadRecords()} type="button">
              Aplicar
            </button>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Funcionário</th>
                <th>Tipo</th>
                <th>Data</th>
                <th>Km</th>
                <th>Custo</th>
                <th>Status</th>
                <th>Descricao</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.vehicle?.plate ?? '-'}</strong>
                    <span>
                      {record.vehicle?.brand ?? ''} {record.vehicle?.model ?? ''}
                    </span>
                  </td>
                  <td>{record.vehicle?.employee?.name ?? '-'}</td>
                  <td>{maintenanceTypeLabels[record.type]}</td>
                  <td>{formatDateTime(record.performedAt)}</td>
                  <td>{record.performedKm ? formatKm(record.performedKm) : '-'}</td>
                  <td>{formatCurrency(record.cost)}</td>
                  <td>
                    <StatusBadge status={record.status} label={maintenanceStatusLabels[record.status]} />
                  </td>
                  <td>{record.description ?? '-'}</td>
                </tr>
              ))}
              {!isRecordsLoading && records.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhuma manutenção encontrada para os filtros.</td>
                </tr>
              ) : null}
              {isRecordsLoading ? (
                <tr>
                  <td colSpan={8}>Carregando registros...</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Regras cadastradas</h2>
            <p>Ative, desative e acompanhe as regras de manutenção da empresa.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Intervalo</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <strong>{rule.name}</strong>
                  </td>
                  <td>{maintenanceTypeLabels[rule.type]}</td>
                  <td>{formatRuleInterval(rule.intervalKm, rule.intervalDays)}</td>
                  <td>
                    <StatusBadge status={rule.isActive} />
                  </td>
                  <td>
                    <button className="button secondary small" onClick={() => toggleRule(rule)} type="button">
                      {rule.isActive ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && rules.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhuma regra cadastrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Histórico por veículo</h2>
            <p>Consulte registros anteriores e os proximos vencimentos calculados.</p>
          </div>
          <label className="inline-filter">
            Veículo
            <select onChange={(event) => setSelectedVehicleId(event.target.value)} value={selectedVehicleId}>
              <option value="">Selecione</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} - {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isHistoryLoading ? <div className="panel-note">Carregando histórico...</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Regra</th>
                <th>Descricao</th>
                <th>Realizada em</th>
                <th>Km</th>
                <th>Proximo km</th>
                <th>Proxima data</th>
                <th>Custo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.maintenanceRule?.name ?? 'Sem regra'}</strong>
                    <span>{record.maintenanceRule ? maintenanceTypeLabels[record.maintenanceRule.type] : '-'}</span>
                  </td>
                  <td>{record.description ?? '-'}</td>
                  <td>{formatDateTime(record.performedAt)}</td>
                  <td>{record.performedKm ? formatKm(record.performedKm) : '-'}</td>
                  <td>{record.nextDueKm ? formatKm(record.nextDueKm) : '-'}</td>
                  <td>{formatDateTime(record.nextDueDate)}</td>
                  <td>{formatCurrency(record.cost)}</td>
                  <td>
                    <StatusBadge status={record.status} label={maintenanceStatusLabels[record.status]} />
                  </td>
                </tr>
              ))}
              {!isHistoryLoading && history.length === 0 ? (
                <tr>
                  <td colSpan={8}>Nenhum registro para o veículo selecionado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
