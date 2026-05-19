'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Building2, Plus, Upload, Trash2, Edit, AlertCircle, CheckCircle2, Search, X, MapPin } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api';
import type { Customer, GeocodingStatus } from '@/types';
import { GoogleMapPreview } from '@/components/GoogleMapPreview';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [geocodingFilter, setGeocodingFilter] = useState('ALL');
  const [mapCustomer, setMapCustomer] = useState<Customer | null>(null);

  // Controle de Modal de CRUD
  const [isCrudModalOpen, setIsCrudModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [crudForm, setCrudForm] = useState({
    name: '',
    document: '',
    email: '',
    phone: '',
    address: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    notes: '',
    latitude: '',
    longitude: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crudError, setCrudError] = useState('');

  // Controle de Modal de Importação CSV
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
  const [importResult, setImportResult] = useState<{ total: number; imported: number; failed: number } | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  function loadCustomers() {
    setIsLoading(true);
    setError('');
    apiFetch<Customer[]>('/company/customers')
      .then(setCustomers)
      .catch((err) => {
        console.error(err);
        setError('Não foi possível carregar a lista de clientes.');
      })
      .finally(() => setIsLoading(false));
  }

  // Filtragem dos clientes em tela
  const filteredCustomers = useMemo(() => {
    const term = search.toLowerCase().trim();
    return customers.filter((c) => {
      const matchesSearch =
        !term ||
        c.name.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        c.address.toLowerCase().includes(term) ||
        (c.document && c.document.toLowerCase().includes(term));

      const matchesStatus = geocodingFilter === 'ALL' || c.geocodingStatus === geocodingFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, geocodingFilter]);

  // Abre modal para criação de novo cliente
  function handleOpenCreateModal() {
    setEditingCustomer(null);
    setCrudForm({
      name: '',
      document: '',
      email: '',
      phone: '',
      address: '',
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      country: 'Brasil',
      notes: '',
      latitude: '',
      longitude: '',
    });
    setCrudError('');
    setIsCrudModalOpen(true);
  }

  // Abre modal para edição de cliente existente
  function handleOpenEditModal(customer: Customer) {
    setEditingCustomer(customer);
    setCrudForm({
      name: customer.name,
      document: customer.document || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address,
      cep: customer.cep || '',
      street: customer.street || '',
      number: customer.number || '',
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '',
      city: customer.city || '',
      state: customer.state || '',
      country: customer.country || 'Brasil',
      notes: customer.notes || '',
      latitude: '',
      longitude: '',
    });
    setCrudError('');
    setIsCrudModalOpen(true);
  }

  // Submete formulário de criação/edição
  async function handleCrudSubmit(e: React.FormEvent) {
    e.preventDefault();
    const composedAddress = crudForm.address.trim() || [
      crudForm.street,
      crudForm.number,
      crudForm.neighborhood,
      crudForm.city,
      crudForm.state,
      crudForm.country,
    ].filter(Boolean).join(', ');

    if (!crudForm.name.trim() || !composedAddress.trim()) {
      setCrudError('Nome e Endereço são campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setCrudError('');

    const payload: any = {
      name: crudForm.name.trim(),
      document: crudForm.document.trim() || undefined,
      email: crudForm.email.trim() || undefined,
      phone: crudForm.phone.trim() || undefined,
      address: composedAddress.trim(),
      cep: crudForm.cep.trim() || undefined,
      street: crudForm.street.trim() || undefined,
      number: crudForm.number.trim() || undefined,
      complement: crudForm.complement.trim() || undefined,
      neighborhood: crudForm.neighborhood.trim() || undefined,
      city: crudForm.city.trim() || undefined,
      state: crudForm.state.trim() || undefined,
      country: crudForm.country.trim() || undefined,
      notes: crudForm.notes.trim() || undefined,
    };

    try {
      if (editingCustomer) {
        await apiFetch(`/company/customers/${editingCustomer.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/company/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsCrudModalOpen(false);
      loadCustomers();
    } catch (err: any) {
      setCrudError(err.message || 'Erro ao salvar o cliente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Exclui cliente com confirmação nativa simples
  async function handleDeleteCustomer(customer: Customer) {
    if (!confirm(`Tem certeza de que deseja remover o cliente ${customer.name}?`)) {
      return;
    }

    try {
      await apiFetch(`/company/customers/${customer.id}`, {
        method: 'DELETE',
      });
      loadCustomers();
    } catch (err: any) {
      alert(err.message || 'Erro ao remover cliente.');
    }
  }

  // --- LÓGICA DE IMPORTAÃ‡ÃƒO CSV ---

  function handleOpenImportModal() {
    setCsvFile(null);
    setCsvPreviewRows([]);
    setImportStatus('idle');
    setImportResult(null);
    setImportError('');
    setIsImportModalOpen(true);
  }

  // Detecta alteração no input de arquivo CSV
  function handleCsvFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      processCsvFile(file);
    }
  }

  // Processa o arquivo CSV cliente-side com preview.
  function processCsvFile(file: File) {
    setCsvFile(file);
    setImportStatus('parsing');
    setImportError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error('Arquivo vazio ou ilegivel.');
        }

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          throw new Error('O arquivo CSV deve conter um cabecalho e pelo menos uma linha de dados.');
        }

        const headerLine = lines[0];
        const separator = headerLine.includes(';') ? ';' : ',';
        const headers = headerLine.split(separator).map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const findHeader = (...terms: string[]) => headers.findIndex((h) => terms.some((term) => h.includes(term)));

        const nameIdx = findHeader('nome', 'name');
        const addressIdx = findHeader('endereço', 'endereço', 'address');
        const docIdx = findHeader('documento', 'cnpj', 'cpf', 'document');
        const emailIdx = findHeader('email', 'e-mail');
        const phoneIdx = findHeader('telefone', 'phone', 'tel');
        const cepIdx = findHeader('cep', 'zip', 'postal');
        const streetIdx = findHeader('street', 'logradouro', 'rua');
        const numberIdx = findHeader('number', 'número', 'número');
        const complementIdx = findHeader('complement');
        const neighborhoodIdx = findHeader('bairro', 'neighborhood');
        const cityIdx = findHeader('cidade', 'city');
        const stateIdx = headers.findIndex((h) => h.includes('estado') || h.includes('state') || h === 'uf');
        const countryIdx = findHeader('pais', 'país', 'country');
        const notesIdx = findHeader('observa', 'notes');

        if (nameIdx === -1) {
          throw new Error('O CSV deve conter obrigatoriamente a coluna "name" ou "nome".');
        }

        const parsedRows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const values = line.split(separator).map((val) => val.trim().replace(/^"|"$/g, ''));
          const structuredAddress = [
            streetIdx !== -1 ? values[streetIdx] : '',
            numberIdx !== -1 ? values[numberIdx] : '',
            neighborhoodIdx !== -1 ? values[neighborhoodIdx] : '',
            cityIdx !== -1 ? values[cityIdx] : '',
            stateIdx !== -1 ? values[stateIdx] : '',
            countryIdx !== -1 ? values[countryIdx] : '',
          ].filter(Boolean).join(', ');
          const address = addressIdx !== -1 ? values[addressIdx] : structuredAddress;

          parsedRows.push({
            name: values[nameIdx] || '',
            address,
            document: docIdx !== -1 ? values[docIdx] : '',
            email: emailIdx !== -1 ? values[emailIdx] : '',
            phone: phoneIdx !== -1 ? values[phoneIdx] : '',
            cep: cepIdx !== -1 ? values[cepIdx] : '',
            street: streetIdx !== -1 ? values[streetIdx] : '',
            number: numberIdx !== -1 ? values[numberIdx] : '',
            complement: complementIdx !== -1 ? values[complementIdx] : '',
            neighborhood: neighborhoodIdx !== -1 ? values[neighborhoodIdx] : '',
            city: cityIdx !== -1 ? values[cityIdx] : '',
            state: stateIdx !== -1 ? values[stateIdx] : '',
            country: countryIdx !== -1 ? values[countryIdx] : 'Brasil',
            notes: notesIdx !== -1 ? values[notesIdx] : '',
            isValid: Boolean(values[nameIdx] && address),
          });
        }

        if (parsedRows.length === 0) {
          throw new Error('Nenhuma linha de cliente valida foi encontrada no CSV.');
        }

        setCsvPreviewRows(parsedRows);
        setImportStatus('preview');
      } catch (err: any) {
        setImportError(err.message || 'Erro ao processar o CSV.');
        setImportStatus('error');
      }
    };

    reader.onerror = () => {
      setImportError('Erro de leitura do arquivo.');
      setImportStatus('error');
    };

    reader.readAsText(file, 'UTF-8');
  }
  // Dispara a importação final para o backend
  async function handleConfirmImport() {
    const validRows = csvPreviewRows.filter((r) => r.isValid).map((r) => ({
      name: r.name,
      address: r.address,
      document: r.document || undefined,
      email: r.email || undefined,
      phone: r.phone || undefined,
      cep: r.cep || undefined,
      street: r.street || undefined,
      number: r.number || undefined,
      complement: r.complement || undefined,
      neighborhood: r.neighborhood || undefined,
      city: r.city || undefined,
      state: r.state || undefined,
      country: r.country || undefined,
      notes: r.notes || undefined,
    }));

    if (validRows.length === 0) {
      setImportError('Nenhum registro válido para importar.');
      return;
    }

    setImportStatus('uploading');
    setImportError('');

    try {
      const res = await apiFetch<any>('/company/customers/import', {
        method: 'POST',
        body: JSON.stringify(validRows),
      });

      setImportResult({
        total: validRows.length,
        imported: res.imported || 0,
        failed: res.failed || 0,
      });
      setImportStatus('success');
      loadCustomers();
    } catch (err: any) {
      setImportError(err.message || 'Erro ao processar a importação em lote.');
      setImportStatus('error');
    }
  }

  function renderGeocodingBadge(status: GeocodingStatus) {
    switch (status) {
      case 'RESOLVED':
        return <StatusBadge status="ativo" label="Resolvido" />;
      case 'MANUAL':
        return <StatusBadge status="completed" label="Manual" />;
      case 'PENDING':
        return <StatusBadge status="pending" label="Pendente" />;
      case 'FAILED':
      default:
        return <StatusBadge status="inativo" label="Falhou" />;
    }
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Empresa" title="Clientes">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Cadastro de Clientes</h2>
            <p>Gerencie seus clientes e localize-os de forma geocodificada automática para criar Ordens de Serviço.</p>
          </div>
          <div className="action-row" style={{ display: 'flex', gap: '8px' }}>
            <button className="button secondary" onClick={handleOpenImportModal}>
              <Upload size={17} strokeWidth={2.4} aria-hidden="true" />
              Importar CSV
            </button>
            <button className="button primary" onClick={handleOpenCreateModal}>
              <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
              Novo Cliente
            </button>
          </div>
        </div>

        {error ? <div className="form-message error">{error}</div> : null}
        {isLoading ? (
          <div className="loading-row">
            <span className="loading-dot" />
            Carregando clientes...
          </div>
        ) : null}

        {/* Toolbar de Busca e Filtro */}
        <div className="table-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Buscar por nome, documento, e-mail, telefone ou endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: '40px', width: '100%' }}
            />
          </div>
          <div className="filters-box" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <label className="inline-filter" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
              Geocodificação:
              <select
                value={geocodingFilter}
                onChange={(e) => setGeocodingFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="ALL">Todos</option>
                <option value="RESOLVED">Resolvidos</option>
                <option value="MANUAL">Manuais</option>
                <option value="PENDING">Pendentes</option>
                <option value="FAILED">Falhados</option>
              </select>
            </label>
          </div>
        </div>

        {/* Tabela de Dados */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th>Endereço</th>
                <th>Coordenadas</th>
                <th>Geocodificação</th>
                <th>AçÃµes</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.document || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', fontSize: '13px' }}>
                      <span>{c.email || '-'}</span>
                      <span style={{ color: '#64748b' }}>{c.phone || ''}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.address}>
                    {c.address}
                  </td>
                  <td style={{ fontSize: '12px', color: '#64748b' }}>
                    {c.latitude && c.longitude ? `${Number(c.latitude).toFixed(5)}, ${Number(c.longitude).toFixed(5)}` : '-'}
                  </td>
                  <td>{renderGeocodingBadge(c.geocodingStatus)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="button secondary small"
                        title="Ver no Mapa"
                        onClick={() => setMapCustomer(c)}
                      >
                        <MapPin size={14} />
                      </button>
                      <button className="button secondary small" onClick={() => handleOpenEditModal(c)}>
                        <Edit size={14} />
                      </button>
                      <button className="button secondary small" style={{ color: '#ef4444' }} onClick={() => handleDeleteCustomer(c)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredCustomers.length === 0 ? (
          <EmptyState
            action={
              customers.length === 0 ? (
                <button className="button primary" onClick={handleOpenCreateModal}>
                  <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                  Novo Cliente
                </button>
              ) : undefined
            }
            icon={Building2}
            title={customers.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
            description={
              customers.length === 0
                ? 'Cadastre ou importe seus clientes para associar automaticamente endereços às suas ordens de serviço.'
                : 'Ajuste a busca ou os filtros para visualizar outros registros.'
            }
          />
        ) : null}
      </section>

      {/* MODAL CRUD (CRIAR E EDITAR) */}
      {isCrudModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsCrudModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {crudError ? <div className="form-message error" style={{ marginBottom: '16px' }}>{crudError}</div> : null}

            <form onSubmit={handleCrudSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label>
                Nome Completo *
                <input
                  type="text"
                  required
                  value={crudForm.name}
                  onChange={(e) => setCrudForm({ ...crudForm, name: e.target.value })}
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </label>

              <label>
                Documento (CPF / CNPJ)
                <input
                  type="text"
                  value={crudForm.document}
                  onChange={(e) => setCrudForm({ ...crudForm, document: e.target.value })}
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ flex: 1 }}>
                  E-mail
                  <input
                    type="email"
                    value={crudForm.email}
                    onChange={(e) => setCrudForm({ ...crudForm, email: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label style={{ flex: 1 }}>
                  Telefone
                  <input
                    type="text"
                    value={crudForm.phone}
                    onChange={(e) => setCrudForm({ ...crudForm, phone: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
              </div>

              <label>
                Endereço Completo (Rua, Número, Bairro, Cidade, Estado) *
                <input
                  type="text"
                  required
                  value={crudForm.address}
                  onChange={(e) => setCrudForm({ ...crudForm, address: e.target.value })}
                  placeholder="Ex: Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                  className="form-control"
                  style={{ width: '100%' }}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <label>
                  CEP
                  <input
                    type="text"
                    value={crudForm.cep}
                    onChange={(e) => setCrudForm({ ...crudForm, cep: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Rua / Logradouro
                  <input
                    type="text"
                    value={crudForm.street}
                    onChange={(e) => setCrudForm({ ...crudForm, street: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Número
                  <input
                    type="text"
                    value={crudForm.number}
                    onChange={(e) => setCrudForm({ ...crudForm, number: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Bairro
                  <input
                    type="text"
                    value={crudForm.neighborhood}
                    onChange={(e) => setCrudForm({ ...crudForm, neighborhood: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Cidade
                  <input
                    type="text"
                    value={crudForm.city}
                    onChange={(e) => setCrudForm({ ...crudForm, city: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  UF
                  <input
                    type="text"
                    value={crudForm.state}
                    onChange={(e) => setCrudForm({ ...crudForm, state: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Complemento
                  <input
                    type="text"
                    value={crudForm.complement}
                    onChange={(e) => setCrudForm({ ...crudForm, complement: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  Observacoes
                  <input
                    type="text"
                    value={crudForm.notes}
                    onChange={(e) => setCrudForm({ ...crudForm, notes: e.target.value })}
                    className="form-control"
                    style={{ width: '100%' }}
                  />
                </label>
              </div>

              <div style={{ display: 'none' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '8px' }}>
                  <strong>Avançado (Opcional):</strong> Insira coordenadas manuais para pular a geocodificação automática.
                </span>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ flex: 1, fontSize: '12px' }}>
                    Latitude
                    <input
                      type="text"
                      placeholder="-23.55052"
                      value={crudForm.latitude}
                      onChange={(e) => setCrudForm({ ...crudForm, latitude: e.target.value })}
                      className="form-control"
                      style={{ width: '100%', padding: '6px' }}
                    />
                  </label>
                  <label style={{ flex: 1, fontSize: '12px' }}>
                    Longitude
                    <input
                      type="text"
                      placeholder="-46.633308"
                      value={crudForm.longitude}
                      onChange={(e) => setCrudForm({ ...crudForm, longitude: e.target.value })}
                      className="form-control"
                      style={{ width: '100%', padding: '6px' }}
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="button secondary" onClick={() => setIsCrudModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="button primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÃ‡ÃƒO CSV */}
      {isImportModalOpen && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Importar Lote de Clientes (CSV)</h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} disabled={importStatus === 'uploading'}>
                <X size={20} />
              </button>
            </div>

            {importError ? <div className="form-message error" style={{ marginBottom: '16px' }}>{importError}</div> : null}

            {/* Passo 1: Seleção de Arquivo */}
            {importStatus === 'idle' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: '2px dashed #6d28d9', background: '#f5f3ff', borderRadius: '8px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <Upload size={40} style={{ color: '#6d28d9', margin: '0 auto 12px' }} />
                <strong>Clique ou arraste um arquivo CSV</strong>
                <p style={{ color: '#64748b', fontSize: '13px', marginTop: '8px' }}>
                  O arquivo deve conter cabeçalhos como: <em>Nome, Endereço, Documento, Email, Telefone</em>.
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {/* Estado de Parsing */}
            {importStatus === 'parsing' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span className="loading-dot" style={{ margin: '0 auto 12px' }} />
                <p>Lendo e processando arquivo CSV...</p>
              </div>
            )}

            {/* Passo 2: Preview da tabela de dados e validação */}
            {importStatus === 'preview' && (
              <div>
                <span style={{ fontSize: '13px', color: '#64748b', display: 'block', marginBottom: '12px' }}>
                  Abaixo está uma prévia de validação dos clientes identificados no seu arquivo. Linhas inválidas (sem nome ou endereço) serão ignoradas.
                </span>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '20px' }}>
                  <table style={{ width: '100%', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px' }}>Nome</th>
                        <th style={{ padding: '8px' }}>Endereço</th>
                        <th style={{ padding: '8px' }}>Validação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreviewRows.slice(0, 100).map((row, idx) => (
                        <tr key={idx} style={{ background: row.isValid ? 'transparent' : '#fef2f2' }}>
                          <td style={{ padding: '8px' }}>{row.name || <em style={{ color: '#ef4444' }}>Ausente</em>}</td>
                          <td style={{ padding: '8px' }}>{row.address || <em style={{ color: '#ef4444' }}>Ausente</em>}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {row.isValid ? (
                              <CheckCircle2 size={16} style={{ color: '#10b981', margin: '0 auto' }} />
                            ) : (
                              <span title="Nome e Endereço são obrigatórios" style={{ display: 'inline-block' }}>
                                <AlertCircle size={16} style={{ color: '#ef4444', margin: '0 auto' }} />
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>
                    Total identificado: {csvPreviewRows.length} | Válidos: {csvPreviewRows.filter(r => r.isValid).length}
                  </span>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="button secondary" onClick={() => setImportStatus('idle')}>
                      Trocar Arquivo
                    </button>
                    <button className="button primary" onClick={handleConfirmImport}>
                      Confirmar Importação
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Passo 3: Enviando ao backend */}
            {importStatus === 'uploading' && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <span className="loading-dot" style={{ margin: '0 auto 12px' }} />
                <p>Processando importação em lote e geocodificando endereços...</p>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Isso pode levar de alguns segundos a minutos dependendo do número de registros.</span>
              </div>
            )}

            {/* Passo 4: Sucesso da Importação */}
            {importStatus === 'success' && importResult && (
              <div style={{ textAlign: 'center', padding: '30px 20px' }}>
                <CheckCircle2 size={50} style={{ color: '#10b981', margin: '0 auto 16px' }} />
                <h4>Importação concluída com sucesso!</h4>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', margin: '20px 0', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>{importResult.total}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Registrados</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{importResult.imported}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Importados</span>
                  </div>
                  <div>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{importResult.failed}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Falhados</span>
                  </div>
                </div>
                <button className="button primary" onClick={() => setIsImportModalOpen(false)}>
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE PREVIEW DO MAPA */}
      {mapCustomer && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card, #ffffff)', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '550px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Localização de {mapCustomer.name}</h3>
              <button onClick={() => setMapCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#64748b' }}>
              <strong>Endereço: </strong>{mapCustomer.address}
            </div>
            <div style={{ minHeight: '300px', borderRadius: '8px', overflow: 'hidden' }}>
              <GoogleMapPreview
                latitude={mapCustomer.latitude}
                longitude={mapCustomer.longitude}
                address={mapCustomer.address}
                title={`Mapa - ${mapCustomer.name}`}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="button secondary" onClick={() => setMapCustomer(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

