'use client';

import { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle2, ShieldAlert, FileText, Camera } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { apiFetch, toJsonBody } from '@/lib/api';

type CompanySettings = {
  id: string;
  name: string;
  requireOdometerStartPhoto: boolean;
  requireOdometerFinishPhoto: boolean;
  requireOdometerStartKm: boolean;
  requireOdometerFinishKm: boolean;
};

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  function loadSettings() {
    setIsLoading(true);
    setError('');

    apiFetch<CompanySettings>('/company/settings')
      .then((data) => {
        setSettings(data);
      })
      .catch((err) => {
        console.error(err);
        setError('Não foi possível carregar as configurações operacionais.');
      })
      .finally(() => setIsLoading(false));
  }

  async function handleSaveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const updated = await apiFetch<CompanySettings>('/company/settings', {
        method: 'PATCH',
        body: toJsonBody({
          requireOdometerStartPhoto: settings.requireOdometerStartPhoto,
          requireOdometerFinishPhoto: settings.requireOdometerFinishPhoto,
          requireOdometerStartKm: settings.requireOdometerStartKm,
          requireOdometerFinishKm: settings.requireOdometerFinishKm,
        }),
      });

      setSettings(updated);
      setSuccess('Configurações operacionais salvas com sucesso!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as configurações.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleToggle(key: keyof Omit<CompanySettings, 'id' | 'name'>) {
    if (!settings) return;
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  }

  return (
    <AppShell allowedRoles={['COMPANY_ADMIN']} eyebrow="Configurações" title="Operação">
      {error ? <div className="form-message error">{error}</div> : null}
      {success ? <div className="form-message success">{success}</div> : null}

      <div className="detail-grid">
        <form onSubmit={handleSaveSettings} className="panel form-grid" style={{ gridColumn: 'span 2' }}>
          <div className="form-section">
            <div className="section-title">
              <h2>Configurações Operacionais</h2>
              <p>Defina as regras obrigatórias que os funcionários devem seguir no aplicativo mobile ao iniciar e finalizar turnos ou ordens de serviço.</p>
            </div>

            {isLoading ? (
              <div className="loading-row" style={{ padding: '24px 0' }}>
                <span className="loading-dot" />
                Carregando configurações...
              </div>
            ) : settings ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
                
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--primary-color)', margin: 0 }}>
                    <Camera size={18} />
                    Regras de Fotos do Odômetro
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Exige que o funcionário capture uma foto legível do painel do veículo para comprovação de quilometragem.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={settings.requireOdometerStartPhoto}
                        onChange={() => handleToggle('requireOdometerStartPhoto')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '14px', display: 'block' }}>Exigir foto ao iniciar rota</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bloqueia a partida caso a foto não seja enviada.</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <input
                        type="checkbox"
                        checked={settings.requireOdometerFinishPhoto}
                        onChange={() => handleToggle('requireOdometerFinishPhoto')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '14px', display: 'block' }}>Exigir foto ao finalizar rota</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bloqueia a finalização da rota/OS caso a foto não seja enviada.</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', color: 'var(--primary-color)', margin: 0 }}>
                    <FileText size={18} />
                    Regras de Digitação de Quilometragem (KM)
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                    Exige que o funcionário insira manualmente o valor do odômetro numérico do veículo.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={settings.requireOdometerStartKm}
                        onChange={() => handleToggle('requireOdometerStartKm')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '14px', display: 'block' }}>Exigir KM numérico ao iniciar</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Obrigatório preencher a quilometragem inicial da partida.</span>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                      <input
                        type="checkbox"
                        checked={settings.requireOdometerFinishKm}
                        onChange={() => handleToggle('requireOdometerFinishKm')}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div>
                        <span style={{ fontWeight: '500', fontSize: '14px', display: 'block' }}>Exigir KM numérico ao finalizar</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Obrigatório preencher a quilometragem final da chegada.</span>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            ) : (
              <div className="loading-row">Nenhuma configuração encontrada.</div>
            )}
          </div>

          <div className="form-actions" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '8px' }}>
            <button className="button primary" disabled={isSubmitting || isLoading || !settings} type="submit">
              <Save size={18} />
              {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>

        <section className="panel" style={{ height: 'fit-content' }}>
          <div className="panel-header">
            <div>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--warning-color)' }} />
                Segurança & Auditoria
              </h2>
              <p>As configurações salvas passam a valer imediatamente para todos os funcionários em campo no app mobile.</p>
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <p><strong>Nota importante:</strong> Ativar a obrigatoriedade da foto ou do KM ajuda a prevenir fraudes no reembolso de quilometragem rodada e a manter o controle real das rotas e manutenções preventivas.</p>
            <p>A alteração dessas configurações gerará um registro correspondente na tabela de Auditoria (Logs).</p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
