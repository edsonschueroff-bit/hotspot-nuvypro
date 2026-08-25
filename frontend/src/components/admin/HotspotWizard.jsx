import React, { useState, useEffect } from "react";
import axios from "axios";
import { PrimaryButton, SecondaryButton } from "@/components/ui";

const STEPS = [
  "Selecionar MikroTik",
  "Escanear Rede",
  "Interface e IP",
  "Configurar RADIUS",
  "Deploy",
];

export default function HotspotWizard({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [mikrotiks, setMikrotiks] = useState([]);
  const [selectedMikrotik, setSelectedMikrotik] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState(null);
  const [config, setConfig] = useState({
    interface: "",
    localAddress: "10.5.50.1/24",
    poolName: "hs-pool",
    poolRange: "10.5.50.2-10.5.50.254",
    radiusServerIp: "10.8.0.1",
    radiusPort: 1812,
    radiusSecret: "",
    dnsName: "",
  });

  useEffect(() => {
    if (isOpen) {
      axios.get("/api/mikrotiks").then(res => {
        setMikrotiks(Array.isArray(res.data) ? res.data : res.data.mikrotiks || []);
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleScan = async () => {
    if (!selectedMikrotik) return;
    setScanning(true);
    setScanResult(null);
    try {
      const res = await axios.get(`/api/mikrotiks/${selectedMikrotik.id}/scan`);
      setScanResult(res.data);
      if (res.data.interfaces?.length > 0) {
        setConfig(c => ({ ...c, interface: res.data.interfaces[0].name || res.data.interfaces[0].defaultName || "ether2" }));
      }
      if (res.data.pools?.length > 0) {
        setConfig(c => ({ ...c, poolName: res.data.pools[0].name, poolRange: res.data.pools[0].ranges }));
      }
    } catch (err) {
      setScanResult({ error: err.response?.data?.message || err.message });
    }
    setScanning(false);
  };

  const handleDeploy = async () => {
    if (!selectedMikrotik) return;
    setDeploying(true);
    setDeployResult(null);
    try {
      const res = await axios.post(`/api/mikrotiks/${selectedMikrotik.id}/enviar-hotspot`, config);
      setDeployResult(res.data);
    } catch (err) {
      setDeployResult({ success: false, error: err.response?.data?.message || err.message });
    }
    setDeploying(false);
  };

  if (!isOpen) return null;

  const canNext = () => {
    if (currentStep === 0) return !!selectedMikrotik;
    if (currentStep === 1) return !!scanResult && !scanResult.error;
    if (currentStep === 2) return !!config.interface;
    return true;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Wizard de Hotspot</h2>
            <p className="text-xs text-slate-500 mt-0.5">Configuração assistida e deploy automático no MikroTik</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
            title="Fechar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-6 py-3 gap-2 overflow-x-auto bg-slate-50 border-b border-slate-100 flex-shrink-0">
          {STEPS.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-all ${
                i === currentStep ? "bg-[#2563eb] text-white shadow-sm shadow-blue-500/20" :
                i < currentStep ? "bg-emerald-500 text-white" :
                "bg-slate-200 text-slate-600"
              }`}>
                {i < currentStep ? "✓" : i + 1}
              </div>
              <span className={`ml-1.5 text-xs font-semibold whitespace-nowrap ${i === currentStep ? "text-slate-900" : "text-slate-500"}`}>
                {step}
              </span>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-slate-200 mx-1.5" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-slate-700">
          {/* Step 0: Select MikroTik */}
          {currentStep === 0 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Selecione o MikroTik *
                </label>
                <select
                  value={selectedMikrotik?.id || ""}
                  onChange={(e) => {
                    const mk = mikrotiks.find(m => m.id === Number(e.target.value));
                    setSelectedMikrotik(mk || null);
                    setConfig(c => ({ ...c, radiusSecret: mk?.senha || "" }));
                  }}
                  className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                >
                  <option value="">-- Selecione o Roteador --</option>
                  {mikrotiks.map(mk => (
                    <option key={mk.id} value={mk.id}>{mk.nome || mk.ip} ({mk.ip})</option>
                  ))}
                </select>
              </div>

              {selectedMikrotik && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                  <p><strong className="text-slate-900">Endereço IP:</strong> {selectedMikrotik.ip}</p>
                  <p><strong className="text-slate-900">Porta da API:</strong> {selectedMikrotik.porta || 8728}</p>
                  <p><strong className="text-slate-900">Usuário:</strong> {selectedMikrotik.usuario || "admin"}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Scan Network */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Diagnóstico de Interfaces e Pools</h4>
                  <p className="text-xs text-slate-500">Consulte as interfaces ativas no RouterOS</p>
                </div>
                <PrimaryButton
                  onClick={handleScan}
                  loading={scanning}
                  size="sm"
                >
                  {scanning ? "Escaneando..." : "Escanear Rede"}
                </PrimaryButton>
              </div>

              {scanResult && scanResult.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium">
                  {scanResult.error}
                </div>
              )}

              {scanResult && !scanResult.error && (
                <div className="space-y-3 pt-2">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      Interfaces Detectadas ({scanResult.interfaces?.length || 0})
                    </h5>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {(scanResult.interfaces || []).map((iface, i) => (
                        <div key={i} className="px-3.5 py-2 text-xs text-slate-700 flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{iface.name || iface.defaultName}</span>
                          <span className="text-slate-500">{iface.type || "ethernet"} {iface.running === "true" ? "• UP" : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      IP Pools Detectados ({scanResult.pools?.length || 0})
                    </h5>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {(scanResult.pools || []).map((pool, i) => (
                        <div key={i} className="px-3.5 py-2 text-xs text-slate-700 flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{pool.name}</span>
                          <span className="text-slate-500 font-mono">{pool.ranges}</span>
                        </div>
                      ))}
                      {(!scanResult.pools || scanResult.pools.length === 0) && (
                        <div className="px-3.5 py-2 text-xs text-slate-400">Nenhum pool encontrado</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Interface and IP Settings */}
          {currentStep === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Interface Hotspot *</label>
                <select
                  value={config.interface}
                  onChange={(e) => setConfig({ ...config, interface: e.target.value })}
                  className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                >
                  {(scanResult?.interfaces || []).map((iface, i) => (
                    <option key={i} value={iface.name || iface.defaultName}>
                      {iface.name || iface.defaultName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Endereço Local Gateway (CIDR) *</label>
                <input
                  type="text"
                  value={config.localAddress}
                  onChange={(e) => setConfig({ ...config, localAddress: e.target.value })}
                  className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Nome do Pool</label>
                  <input
                    type="text"
                    value={config.poolName}
                    onChange={(e) => setConfig({ ...config, poolName: e.target.value })}
                    className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Range de IPs</label>
                  <input
                    type="text"
                    value={config.poolRange}
                    onChange={(e) => setConfig({ ...config, poolRange: e.target.value })}
                    className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">DNS Name (Opcional)</label>
                <input
                  type="text"
                  value={config.dnsName}
                  onChange={(e) => setConfig({ ...config, dnsName: e.target.value })}
                  className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                  placeholder="hotspot.meudominio.com"
                />
              </div>
            </div>
          )}

          {/* Step 3: RADIUS Configuration */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Configuração do Servidor FreeRADIUS</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Servidor RADIUS IP *</label>
                  <input
                    type="text"
                    value={config.radiusServerIp}
                    onChange={(e) => setConfig({ ...config, radiusServerIp: e.target.value })}
                    className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Porta de Autenticação</label>
                    <input
                      type="number"
                      value={config.radiusPort}
                      onChange={(e) => setConfig({ ...config, radiusPort: parseInt(e.target.value) || 1812 })}
                      className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Secret Compartilhado *</label>
                    <input
                      type="text"
                      value={config.radiusSecret}
                      onChange={(e) => setConfig({ ...config, radiusSecret: e.target.value })}
                      className="w-full bg-[#f1f5f9] border border-slate-300 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#2563eb] focus:border-[#2563eb]"
                      placeholder="Senha do MikroTik"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">
                O RADIUS será provisionado automaticamente no MikroTik apontando para o gateway VPN do servidor central (ex: 10.8.0.1).
              </p>
            </div>
          )}

          {/* Step 4: Deploy */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p><strong className="text-slate-900">Roteador MikroTik:</strong> {selectedMikrotik?.nome || selectedMikrotik?.ip}</p>
                <p><strong className="text-slate-900">Interface Alvo:</strong> {config.interface}</p>
                <p><strong className="text-slate-900">Endereço IP Hotspot:</strong> {config.localAddress}</p>
                <p><strong className="text-slate-900">IP Pool:</strong> {config.poolName} ({config.poolRange})</p>
                <p><strong className="text-slate-900">Servidor RADIUS:</strong> {config.radiusServerIp}:{config.radiusPort}</p>
              </div>

              {!deployResult && (
                <div className="pt-2">
                  <PrimaryButton
                    onClick={handleDeploy}
                    loading={deploying}
                    size="lg"
                    fullWidth
                  >
                    {deploying ? "Deployando configurações..." : "⚡ Iniciar Deploy no MikroTik"}
                  </PrimaryButton>
                </div>
              )}

              {deployResult && (
                <div className="mt-3 space-y-3">
                  <div className={`p-4 rounded-xl border text-xs font-bold ${
                    deployResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}>
                    {deployResult.success ? "✓ Deploy concluído com sucesso no MikroTik!" : `Erro: ${deployResult.error || "Falha no deploy"}`}
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-1 max-h-48 overflow-y-auto">
                    {(deployResult.steps || deployResult.log || []).map((item, i) => {
                      const step = typeof item === "string" ? { message: item, status: "ok" } : item;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                          <span className={`font-bold ${step.status === "ok" ? "text-emerald-600" : "text-red-600"}`}>
                            {step.status === "ok" ? "✓" : "✗"}
                          </span>
                          <span className="text-slate-700">{step.message}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
          <SecondaryButton
            onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            disabled={currentStep === 0}
            size="sm"
          >
            Voltar
          </SecondaryButton>

          <div className="flex gap-2">
            <SecondaryButton
              onClick={onClose}
              size="sm"
            >
              Fechar
            </SecondaryButton>

            {currentStep < STEPS.length - 1 && (
              <PrimaryButton
                onClick={() => setCurrentStep(s => s + 1)}
                disabled={!canNext()}
                size="sm"
              >
                Próximo Passo →
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
