const db = require("../../db");

/**
 * Gera um pagamento PIX no Mercado Pago para uma fatura SaaS.
 * @param {Object} fatura - Dados da fatura (id, valor, descricao, empresa_id)
 * @returns {Object} { pix_copia_cola, pix_qr_code }
 */
async function gerarPixFaturaSaas(fatura) {
  // 1. Obter config do Mercado Pago (Super Admin - empresa_id = 1 ou primeira encontrada em empresa_configs / env)
  let accessToken = process.env.MP_ACCESS_TOKEN;

  // Busca em empresa_configs (padrão oficial)
  try {
    const [rows] = await db.query(
      "SELECT config_json FROM empresa_configs WHERE empresa_id = 1 AND config_type = 'mercadopago' LIMIT 1"
    );
    if (rows.length > 0 && rows[0].config_json) {
      const config = typeof rows[0].config_json === 'string' ? JSON.parse(rows[0].config_json) : rows[0].config_json;
      if (config && config.access_token) {
        accessToken = config.access_token;
      }
    }
  } catch (err) {
    console.warn("Aviso ao buscar empresa_configs mercadopago SuperAdmin:", err.message);
  }

  // Fallback em empresa_configs de qualquer empresa
  if (!accessToken) {
    try {
      const [rowsFallback] = await db.query(
        "SELECT config_json FROM empresa_configs WHERE config_type = 'mercadopago' LIMIT 1"
      );
      if (rowsFallback.length > 0 && rowsFallback[0].config_json) {
        const configF = typeof rowsFallback[0].config_json === 'string' ? JSON.parse(rowsFallback[0].config_json) : rowsFallback[0].config_json;
        if (configF && configF.access_token) {
          accessToken = configF.access_token;
        }
      }
    } catch (e) {
      console.warn("Aviso fallback empresa_configs mercadopago:", e.message);
    }
  }

  // Fallback tabela legada config_mercadopago
  if (!accessToken) {
    try {
      const [rowsLeg] = await db.query(
        "SELECT access_token FROM config_mercadopago WHERE access_token IS NOT NULL AND access_token != '' LIMIT 1"
      );
      if (rowsLeg.length > 0 && rowsLeg[0].access_token) {
        accessToken = rowsLeg[0].access_token;
      }
    } catch (e) {
      console.warn("Aviso fallback config_mercadopago:", e.message);
    }
  }

  if (!accessToken) {
    throw new Error("Access Token do Mercado Pago não configurado no Super Admin");
  }

  // Buscar dados da empresa para o payer
  const [[empresa]] = await db.query(
    "SELECT nome, email FROM empresas WHERE id = ?",
    [fatura.empresa_id]
  );

  const systemDomain = process.env.SYSTEM_DOMAIN || "hotspot.nuvycore.online";
  const protocol = systemDomain.includes("localhost") || systemDomain.includes("127.0.0.1") ? "http" : "https";
  const notificationUrl = `${protocol}://${systemDomain}/api/webhooks/saas-pix`;

  const payload = {
    transaction_amount: parseFloat(fatura.valor),
    description: (fatura.descricao || `Fatura SaaS #${fatura.id}`).substring(0, 250),
    payment_method_id: "pix",
    payer: {
      email: empresa?.email || "cliente@saas.com",
      first_name: (empresa?.nome || "Cliente SaaS").substring(0, 30),
    },
    external_reference: `saas_fatura_${fatura.id}`,
    notification_url: notificationUrl
  };

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `saas_fatura_${fatura.id}_${Date.now()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Erro API Mercado Pago:", errorData);
    throw new Error(errorData.message || "Erro ao comunicar com o Mercado Pago");
  }

  const data = await response.json();
  const transactionData = data.point_of_interaction?.transaction_data;

  if (!transactionData) {
    throw new Error("Mercado Pago não retornou os dados de transação PIX");
  }

  const pix_copia_cola = transactionData.qr_code;
  const pix_qr_code = transactionData.qr_code_base64;

  // Atualizar fatura no banco de dados
  await db.execute(
    "UPDATE saas_faturas SET pix_copia_cola = ?, pix_qr_code = ?, forma_pagamento = 'pix' WHERE id = ?",
    [pix_copia_cola, pix_qr_code, fatura.id]
  );

  return { pix_copia_cola, pix_qr_code, payment_id: data.id };
}

module.exports = { gerarPixFaturaSaas };
