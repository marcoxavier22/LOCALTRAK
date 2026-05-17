'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BarChart3, Fuel, Gauge, ReceiptText } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { MetricCard } from '@/components/MetricCard';
import { apiFetch, toJsonBody } from '@/lib/api';
import {
  emptyReimbursementReport,
  formatCurrency,
  fuelTypeLabels,
} from '@/lib/fuel-labels';
import { formatKm, vehicleOwnershipLabels } from '@/lib/vehicle-labels';
import type {
  Employee,
  FuelSetting,
  ReimbursementEmployeeRow,
  ReimbursementReport,
  ReimbursementVehicleRow,
  Vehicle,
  VehicleFuelType,
} from '@/types';

const fuelTypes = Object.keys(fuelTypeLabels) as VehicleFuelType[];

function optionalNumber(formData: FormData, key: string) {
  const rawValue = String(formData.get(key) ?? '').trim();
  return rawValue === '' ? undefined : Number(rawValue);
}

function buildFuelReportQuery(filters: {
  startDate: string;
  endDate: string;
  employeeId: string;
  vehicleId: string;
}) {
  const params = new URLSearchParams();

  if (filters.startDate) {
    params.set('startDate', new Date(`${filters.startDate}T00:00:00`).toISOString());
  }

  if (filters.endDate) {
    params.set('endDate', new Date(`${filters.endDate}T23:59:59`).toISOString());
  }

  if (filters.employeeId) {
    params.set('employeeId', filters.employeeId);
  }

  if (filters.vehicleId) {
    params.set('vehicleId', filters.vehicleId);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export default function FuelPage() {
  const [settings, setSettings] = useState<FuelSetting[]>([]);
  const [report, setReport] = useState<ReimbursementReport>(emptyReimbursementReport());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError('');

    try {
      const query = buildFuelReportQuery({
        startDate,
        endDate,
        employeeId: selectedEmployeeId,
        vehicleId: selectedVehicleId,
      });
      const [loadedSettings, loadedReport, loadedEmployees, loadedVehicles] = await Promise.all([
        apiFetch<FuelSetting[]>('/company/fuel/settings'),
        apiFetch<ReimbursementReport>(`/company/reimbursements${query}`),
        apiFetch<Employee[]>('/company/employees'),
        apiFetch<Vehicle[]>('/company/vehicles'),
      ]);

      setSettings(loadedSettings);
      setReport(loadedReport);
      setEmployees(loadedEmployees);
      setVehicles(loadedVehicles);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel carregar combustivel.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      fuelType: String(formData.get('fuelType') ?? 'GASOLINE') as VehicleFuelType,
      pricePerLiter: optionalNumber(formData, 'pricePerLiter'),
      defaultCostPerKm: optionalNumber(formData, 'defaultCostPerKm'),
    };

    try {
      await apiFetch<FuelSetting>('/company/fuel/settings', {
        method: 'POST',
        body: toJsonBody(payload),
      });
      event.currentTarget.reset();
      setSuccess('Configuracao de combustivel criada.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel criar configuracao.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Combustivel">
      {error ? <div className="form-message error">{error}</div> : null}
      {success ? <div className="form-message success">{success}</div> : null}

      <section className="metrics-grid">
        <MetricCard
          detail="veiculos da empresa"
          icon={Fuel}
          label="Custo estimado"
          value={isLoading ? '...' : formatCurrency(report.totals.totalFuelCost)}
        />
        <MetricCard
          detail="periodo filtrado"
          icon={Gauge}
          label="Km frota"
          value={isLoading ? '...' : formatKm(report.totals.companyVehicleDistanceKm)}
        />
        <MetricCard
          detail="rotas finalizadas"
          icon={ReceiptText}
          label="Rotas"
          value={isLoading ? '...' : report.totals.routesCount}
        />
        <MetricCard
          detail="veiculos particulares"
          icon={BarChart3}
          label="Reembolsos"
          value={isLoading ? '...' : formatCurrency(report.totals.totalReimbursement)}
        />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Periodo de analise</h2>
            <p>Use o periodo para recalcular custo estimado por veiculo.</p>
          </div>
          <div className="table-actions">
            <label className="inline-filter">
              Funcionario
              <select onChange={(event) => setSelectedEmployeeId(event.target.value)} value={selectedEmployeeId}>
                <option value="">Todos</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-filter">
              Veiculo
              <select onChange={(event) => setSelectedVehicleId(event.target.value)} value={selectedVehicleId}>
                <option value="">Todos</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.brand} {vehicle.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-filter">
              Inicio
              <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </label>
            <label className="inline-filter">
              Fim
              <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            </label>
            <button className="button secondary" onClick={() => void loadData()} type="button">
              Aplicar
            </button>
          </div>
        </div>
      </section>

      <section className="detail-grid">
        <form className="panel form-grid" onSubmit={handleCreateSetting}>
          <div className="form-section">
            <div className="section-title">
              <h2>Nova configuracao</h2>
              <p>Cadastre valor por litro, valor por km ou ambos para cada combustivel.</p>
            </div>

            <label>
              Combustivel
              <select name="fuelType">
                {fuelTypes.map((fuelType) => (
                  <option key={fuelType} value={fuelType}>
                    {fuelTypeLabels[fuelType]}
                  </option>
                ))}
              </select>
            </label>

            <div className="field-row">
              <label>
                Valor por litro
                <input min="0" name="pricePerLiter" placeholder="5.89" step="0.001" type="number" />
              </label>
              <label>
                Valor padrao por km
                <input min="0" name="defaultCostPerKm" placeholder="1.20" step="0.001" type="number" />
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button className="button primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Salvando...' : 'Criar configuracao'}
            </button>
          </div>
        </form>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Configuracoes</h2>
              <p>Atualize valores usados nos calculos de rotas finalizadas.</p>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Combustivel</th>
                  <th>Valor litro</th>
                  <th>Valor km</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => (
                  <FuelSettingRow key={setting.id} setting={setting} onSaved={loadData} />
                ))}
                {!isLoading && settings.length === 0 ? (
                  <tr>
                    <td colSpan={4}>Nenhuma configuracao cadastrada.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Custo estimado por veiculo</h2>
            <p>Veiculos da empresa geram custo de combustivel; particulares geram reembolso.</p>
          </div>
        </div>

        <ConsumptionChart vehicles={report.byVehicle} isLoading={isLoading} />
        <VehicleCostTable vehicles={report.byVehicle} isLoading={isLoading} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Custo por funcionario</h2>
            <p>Resumo de km, custo e reembolso por colaborador no periodo.</p>
          </div>
        </div>
        <EmployeeCostTable employees={report.byEmployee} isLoading={isLoading} />
      </section>
    </AppShell>
  );
}

function FuelSettingRow({ setting, onSaved }: { setting: FuelSetting; onSaved: () => Promise<void> }) {
  const [pricePerLiter, setPricePerLiter] = useState(String(setting.pricePerLiter ?? ''));
  const [defaultCostPerKm, setDefaultCostPerKm] = useState(String(setting.defaultCostPerKm ?? ''));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);

    try {
      await apiFetch<FuelSetting>(`/company/fuel/settings/${setting.id}`, {
        method: 'PATCH',
        body: toJsonBody({
          pricePerLiter: pricePerLiter.trim() === '' ? undefined : Number(pricePerLiter),
          defaultCostPerKm: defaultCostPerKm.trim() === '' ? undefined : Number(defaultCostPerKm),
        }),
      });
      await onSaved();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <tr>
      <td>{fuelTypeLabels[setting.fuelType]}</td>
      <td>
        <input
          min="0"
          onChange={(event) => setPricePerLiter(event.target.value)}
          step="0.001"
          type="number"
          value={pricePerLiter}
        />
      </td>
      <td>
        <input
          min="0"
          onChange={(event) => setDefaultCostPerKm(event.target.value)}
          step="0.001"
          type="number"
          value={defaultCostPerKm}
        />
      </td>
      <td>
        <button className="button secondary small" disabled={isSaving} onClick={() => void handleSave()} type="button">
          {isSaving ? 'Salvando...' : 'Atualizar'}
        </button>
      </td>
    </tr>
  );
}

function VehicleCostTable({
  vehicles,
  isLoading,
}: {
  vehicles: ReimbursementVehicleRow[];
  isLoading: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Veiculo</th>
            <th>Proprietario</th>
            <th>Combustivel</th>
            <th>Rotas</th>
            <th>Km</th>
            <th>Custo estimado</th>
            <th>Reembolso</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((row) => (
            <tr key={row.vehicle.id}>
              <td>
                <strong>{row.vehicle.plate}</strong>
                <span>
                  {row.vehicle.brand} {row.vehicle.model}
                </span>
              </td>
              <td>{vehicleOwnershipLabels[row.vehicle.ownershipType]}</td>
              <td>{row.vehicle.fuelType ? fuelTypeLabels[row.vehicle.fuelType] : '-'}</td>
              <td>{row.routesCount}</td>
              <td>{formatKm(row.totalDistanceKm)}</td>
              <td>{formatCurrency(row.totalFuelCost)}</td>
              <td>{formatCurrency(row.totalReimbursement)}</td>
            </tr>
          ))}
          {!isLoading && vehicles.length === 0 ? (
            <tr>
              <td colSpan={7}>Nenhuma rota finalizada no periodo.</td>
            </tr>
          ) : null}
          {isLoading ? (
            <tr>
              <td colSpan={7}>Carregando custos...</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ConsumptionChart({
  vehicles,
  isLoading,
}: {
  vehicles: ReimbursementVehicleRow[];
  isLoading: boolean;
}) {
  const maxDistance = Math.max(...vehicles.map((row) => row.totalDistanceKm), 1);

  if (isLoading) {
    return <div className="panel-note">Carregando grafico...</div>;
  }

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <div className="chart-list">
      {vehicles.slice(0, 8).map((row) => {
        const percent = Math.max(6, Math.round((row.totalDistanceKm / maxDistance) * 100));
        return (
          <div className="chart-row" key={row.vehicle.id}>
            <div>
              <strong>{row.vehicle.plate}</strong>
              <span>{formatKm(row.totalDistanceKm)}</span>
            </div>
            <div className="chart-track" aria-hidden="true">
              <span style={{ width: `${percent}%` }} />
            </div>
            <small>{formatCurrency(row.totalFuelCost + row.totalReimbursement)}</small>
          </div>
        );
      })}
    </div>
  );
}

function EmployeeCostTable({
  employees,
  isLoading,
}: {
  employees: ReimbursementEmployeeRow[];
  isLoading: boolean;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Funcionario</th>
            <th>Rotas</th>
            <th>Km</th>
            <th>Custo combustivel</th>
            <th>Reembolso</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((row) => (
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
          {!isLoading && employees.length === 0 ? (
            <tr>
              <td colSpan={5}>Nenhuma rota finalizada no periodo.</td>
            </tr>
          ) : null}
          {isLoading ? (
            <tr>
              <td colSpan={5}>Carregando custos por funcionario...</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
