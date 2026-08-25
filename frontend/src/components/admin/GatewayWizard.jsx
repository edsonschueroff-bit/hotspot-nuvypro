import { useState } from 'react';
import { PrimaryButton, SecondaryButton } from '../ui';

export default function GatewayWizard({ onSave, onCancel, portais = [] }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nome: '',
    tipo: 'mikrotik', // 'mikrotik' | 'omada' | 'unifi'
    ip: '',
    end_hotspot: '',
    portal_id: portais[0]?.id || '',
    usuario: '',
    senha: '',
    controller_url: '',
    controller_site: 'default',
    omadac_id: '',
    api_user: '',
    api_pass: '',
    verify_tls: false
  });

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleNext = () => {
    setErro('');
    if (step === 1) {
      if (!form.nome) {
        setErro('O nome do equipamento é obrigatório.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (form.tipo === 'mikrotik') {
        if (!form.ip) {
          setErro('O endereço IP do MikroTik é obrigatório.');
          return;
        }
      } else {
        if (!form.controller_url) {
          setErro(`A URL da controladora ${form.tipo === 'omada' ? 'TP-Link Omada' : 'Ubiquiti UniFi'} é obrigatória.`);
          return;
        }
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      await onSave(form);
    } catch (err) {
      setErro(err.message || 'Erro ao salvar equipamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#e2e8f0] rounded-[14px] p-6 sm:p-7 shadow-[0_10px_25px_rgba(0,0,0,0.10)] max-w-2xl w-full mx-auto space-y-6">
      {/* Wizard Header / Steps */}
      <div className="flex items-center justify-between pb-4 border-b border-[#e2e8f0]">
        <div>
          <h2 className="text-[16px] font-700 text-slate-900">Adicionar Novo Equipamento / Gateway</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">Passo {step} de 3 — {step === 1 ? 'Selecione o Tipo' : step === 2 ? 'Configuração de Conexão' : 'Vínculo do Portal'}</p>
        </div>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s === step
                  ? 'bg-[#2563eb] text-white shadow-2xs'
                  : s < step
                  ? 'bg-[#10b981] text-white'
                  : 'bg-slate-100 text-slate-400 border border-[#e2e8f0]'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
          ))}
        </div>
      </div>

      {erro && (
        <div className="bg-[#fef2f2] border border-[#fecaca] text-red-700 text-xs p-3.5 rounded-md font-500">
          ⚠️ {erro}
        </div>
      )}

      {/* Step 1: Select Type */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Nome do Equipamento *</label>
            <input
              type="text"
              name="nome"
              value={form.nome}
              onChange={handleChange}
              placeholder="Ex: MikroTik Central, Omada Loja 1, UniFi Recepção"
              className="ds-input"
            />
          </div>

          <div>
            <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1.5">Selecione o Fabricante / Tecnologia *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'mikrotik', label: 'MikroTik RouterOS', desc: 'Conexão direta por IP / API RouterOS', icon: '🔴' },
                { id: 'omada', label: 'TP-Link Omada', desc: 'External RADIUS / API Controller', icon: '🟣' },
                { id: 'unifi', label: 'Ubiquiti UniFi', desc: 'Controller API / External Portal', icon: '🔵' }
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setForm(prev => ({ ...prev, tipo: item.id }))}
                  className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
                    form.tipo === item.id
                      ? 'bg-[#eff6ff] border-[#2563eb] ring-1 ring-[#2563eb]'
                      : 'bg-white border-[#e2e8f0] hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xl mb-1.5">{item.icon}</div>
                  <div className="font-700 text-[13px] text-slate-900 mb-0.5">{item.label}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Connection Settings */}
      {step === 2 && (
        <div className="space-y-4">
          {form.tipo === 'mikrotik' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Endereço IP do MikroTik *</label>
                  <input
                    type="text"
                    name="ip"
                    value={form.ip}
                    onChange={handleChange}
                    placeholder="192.168.88.1"
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">URL Redirecionamento Hotspot</label>
                  <input
                    type="text"
                    name="end_hotspot"
                    value={form.end_hotspot}
                    onChange={handleChange}
                    placeholder="http://192.168.88.1/login"
                    className="ds-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Usuário API (Opcional)</label>
                  <input
                    type="text"
                    name="usuario"
                    value={form.usuario}
                    onChange={handleChange}
                    placeholder="admin"
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Senha API (Opcional)</label>
                  <input
                    type="password"
                    name="senha"
                    value={form.senha}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="ds-input"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">URL da Controladora ({form.tipo === 'omada' ? 'TP-Link Omada' : 'Ubiquiti UniFi'}) *</label>
                <input
                  type="text"
                  name="controller_url"
                  value={form.controller_url}
                  onChange={handleChange}
                  placeholder={form.tipo === 'omada' ? 'https://192.168.1.100:8043' : 'https://192.168.1.100:8443'}
                  className="ds-input"
                />
              </div>

              {form.tipo === 'omada' && (
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">ID da Controladora Omada (Omadac ID)</label>
                  <input
                    type="text"
                    name="omadac_id"
                    value={form.omadac_id}
                    onChange={handleChange}
                    placeholder="Ex: 5d8a9f... ou deixar em branco"
                    className="ds-input"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Usuário de API da Controladora</label>
                  <input
                    type="text"
                    name="api_user"
                    value={form.api_user}
                    onChange={handleChange}
                    placeholder="api_admin"
                    className="ds-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Senha de API da Controladora</label>
                  <input
                    type="password"
                    name="api_pass"
                    value={form.api_pass}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="ds-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Site / Campus Name</label>
                <input
                  type="text"
                  name="controller_site"
                  value={form.controller_site}
                  onChange={handleChange}
                  placeholder="default"
                  className="ds-input"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Select Portal */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-600 text-slate-600 uppercase mb-1">Vincular a um Portal Captivo *</label>
            <select
              name="portal_id"
              value={form.portal_id}
              onChange={handleChange}
              className="ds-input bg-white"
            >
              <option value="">Nenhum portal vinculado (Usar Padrão)</option>
              {portais.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.tipo_autenticacao})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-xs text-slate-600 space-y-1">
            <span className="text-slate-900 font-bold block mb-1">📌 Resumo da Configuração:</span>
            <div>• <strong>Nome:</strong> {form.nome}</div>
            <div>• <strong>Tipo:</strong> {form.tipo.toUpperCase()}</div>
            <div>• <strong>Endereço / URL:</strong> {form.tipo === 'mikrotik' ? form.ip : form.controller_url}</div>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-[#e2e8f0]">
        <SecondaryButton
          type="button"
          onClick={step === 1 ? onCancel : () => setStep(step - 1)}
        >
          {step === 1 ? 'Cancelar' : '← Voltar'}
        </SecondaryButton>

        {step < 3 ? (
          <PrimaryButton
            type="button"
            onClick={handleNext}
          >
            Próximo Passo →
          </PrimaryButton>
        ) : (
          <PrimaryButton
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Salvando...' : '✓ Finalizar Cadastro'}
          </PrimaryButton>
        )}
      </div>
    </div>
  );
}
