const axios = require('axios');
const db = require('../../db');

/**
 * Obtém o Access Token do Mercado Pago do SuperAdmin (empresa 1).
 */
async function getSuperAdminMercadoPagoToken() {
  let accessToken = process.env.MP_ACCESS_TOKEN;

  // Em empresa_configs, o JSON gerado tem {"access_token": "..."}
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
    console.warn("[SaaS Cartão] Aviso ao buscar empresa_configs SuperAdmin:", err.message);
  }

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
      console.warn("[SaaS Cartão] Aviso fallback empresa_configs:", e.message);
    }
  }

  return accessToken;
}

/**
 * Cria um Token de Cartão Seguro no Mercado Pago caso o frontend envie os dados brutos.
 */
async function criarCardTokenGateway({ cardNumber, cardholderName, cardExpirationMonth, cardExpirationYear, securityCode, docType, docNumber }) {
  const token = await getSuperAdminMercadoPagoToken();
  if (!token) throw new Error("Gateway de pagamentos não configurado no Super Admin");

  const cleanNumber = String(cardNumber).replace(/\D/g, '');
  const cleanCvv = String(securityCode).replace(/\D/g, '');
  const cleanMonth = String(cardExpirationMonth).padStart(2, '0');
  const cleanYear = String(cardExpirationYear).length === 2 ? `20${cardExpirationYear}` : String(cardExpirationYear);

  try {
    const resp = await axios.post(
      'https://api.mercadopago.com/v1/card_tokens',
      {
        card_number: cleanNumber,
        cardholder: {
          name: cardholderName || 'CLIENTE SAAS',
          identification: {
            type: docType || 'CPF',
            number: String(docNumber || '00000000000').replace(/\D/g, '')
          }
        },
        expiration_month: parseInt(cleanMonth, 10),
        expiration_year: parseInt(cleanYear, 10),
        security_code: cleanCvv
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return resp.data.id;
  } catch (err) {
    const detail = err.response?.data?.message || err.response?.data?.cause?.[0]?.description || err.message;
    console.error('[SaaS Cartão] Erro ao criar card_token:', detail);
    throw new Error(`Falha ao tokenizar cartão: ${detail}`);
  }
}

/**
 * Processa a cobrança de uma fatura SaaS no Cartão de Crédito usando o token salvo.
 */
async function cobrarCartaoFaturaSaas(fatura, cardToken, empresa) {
  const token = await getSuperAdminMercadoPagoToken();
  if (!token) throw new Error("Gateway de pagamentos não configurado no Super Admin");

  const valor = parseFloat(fatura.valor);
  if (isNaN(valor) || valor <= 0) {
    throw new Error("Valor da fatura inválido para cobrança");
  }

  const systemDomain = process.env.SYSTEM_DOMAIN || "hotspot.nuvycore.online";
  const protocol = systemDomain.includes("localhost") || systemDomain.includes("127.0.0.1") ? "http" : "https";
  const notificationUrl = `${protocol}://${systemDomain}/api/webhooks/saas-card`;

  const payload = {
    transaction_amount: valor,
    token: cardToken,
    description: (fatura.descricao || `Mensalidade SaaS NuvyCore #${fatura.id}`).substring(0, 250),
    installments: 1,
    payment_method_id: empresa.card_brand ? empresa.card_brand.toLowerCase() : undefined,
    payer: {
      email: empresa.email || 'financeiro@empresa.com',
      first_name: (empresa.nome || 'Cliente').substring(0, 30),
      identification: {
        type: empresa.cnpj && empresa.cnpj.replace(/\D/g, '').length > 11 ? 'CNPJ' : 'CPF',
        number: empresa.cnpj ? empresa.cnpj.replace(/\D/g, '') : '00000000000'
      }
    },
    external_reference: `saas_fatura_${fatura.id}`,
    statement_descriptor: 'NUVYCORE SAAS',
    notification_url: notificationUrl
  };

  try {
    const resp = await axios.post(
      'https://api.mercadopago.com/v1/payments',
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `saas_charge_${fatura.id}_${Date.now()}`
        }
      }
    );

    const data = resp.data;
    const isApproved = data.status === 'approved';

    return {
      success: isApproved,
      status: data.status,
      statusDetail: data.status_detail,
      transacaoId: String(data.id),
      valor: data.transaction_amount,
      mensagem: isApproved ? 'Pagamento aprovado com sucesso!' : `Pagamento ${data.status}: ${data.status_detail}`
    };
  } catch (err) {
    const detail = err.response?.data?.message || err.response?.data?.cause?.[0]?.description || err.message;
    console.error('[SaaS Cartão] Erro ao processar pagamento:', detail);
    return {
      success: false,
      status: 'rejected',
      statusDetail: detail,
      mensagem: `Recusa do cartão: ${detail}`
    };
  }
}

module.exports = {
  getSuperAdminMercadoPagoToken,
  criarCardTokenGateway,
  cobrarCartaoFaturaSaas
};
