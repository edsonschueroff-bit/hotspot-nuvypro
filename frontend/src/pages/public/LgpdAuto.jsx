// src/pages/LgpdAuto.jsx
import React, { useEffect, useState } from "react";
import { redirecionarHotspot } from "../../utils/hotspotRedirect";

export default function LgpdAuto() {
  const [dados, setDados] = useState({ cpf: "", mac: "", ip: "", email: "", nome: "", telefone: "" });
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cpf = params.get("cpf");
    const mac = params.get("mac");
    const ip = params.get("ip");
    const aceiteParam = params.get("aceite");
    const aceite = aceiteParam !== null ? (aceiteParam === "true" || aceiteParam === "1") : true;
    const email = params.get("email");
    const nome = params.get("nome");
    const telefone = params.get("telefone");
    const mikrotik_id = params.get("mikrotik_id");
    const empresa_id = params.get("empresa_id");

    setDados({ cpf: cpf || "", mac: mac || "", ip: ip || "", email: email || "", nome: nome || "", telefone: telefone || "" });

    const autenticar = async () => {
      try {
        setErro(null);
        const res = await fetch("/api/lgpd/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cpf, mac, ip, aceite, email, nome, telefone, mikrotik_id, empresa_id })
        });

        const data = await res.json();
        if (res.ok && data.gateway && data.username) {
          redirecionarHotspot(data.gateway, data.username, data.password);
        } else {
          setErro(data.message || "Erro ao autenticar automaticamente.");
        }
      } catch (err) {
        setErro("Erro de conexão ao servidor de autenticação.");
      }
    };

    const timer = setTimeout(autenticar, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center p-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {erro ? "Falha na Autenticação" : "Autenticando seu acesso..."}
        </h1>
        <p className="text-gray-600 mb-4 text-sm">
          {erro ? "Não foi possível validar suas credenciais automaticamente." : "Aguarde um momento enquanto processamos seu login."}
        </p>

        {erro ? (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {erro}
          </div>
        ) : (
          <div className="text-sm text-gray-700 space-y-1 text-left bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
            {dados.nome && <p><strong>Nome:</strong> {dados.nome}</p>}
            {dados.telefone && <p><strong>Telefone:</strong> {dados.telefone}</p>}
            {dados.cpf && <p><strong>CPF:</strong> {dados.cpf}</p>}
            {dados.email && <p><strong>Email:</strong> {dados.email}</p>}
            {dados.mac && <p><strong>MAC:</strong> {dados.mac}</p>}
            {dados.ip && <p><strong>IP:</strong> {dados.ip}</p>}
          </div>
        )}

        {erro ? (
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all"
          >
            Tentar Novamente
          </button>
        ) : (
          <div className="loader mt-4 mx-auto border-4 border-gray-200 border-t-blue-600 rounded-full w-8 h-8 animate-spin" />
        )}
      </div>
    </div>
  );
}
