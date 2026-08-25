const db = require('../../db');
const { criarCardTokenGateway, cobrarCartaoFaturaSaas } = require('../services/saasCartaoService');

function detectarBandeira(numero) {
  const clean = String(numero).replace(/\D/g, '');
  if (/^4/.test(clean)) return 'visa';
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'master';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(4011|4389|4514|4576|5041|5066|5090|6277|6362|6363|650|651|655)/.test(clean)) return 'elo';
  if (/^6062/.test(clean)) return 'hipercard';
  return 'master';
}

// 1. Obter informações seguras do cartão cadastrado
exports.getMeuCartao = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [[empresa]] = await db.query(
      `SELECT id, nome, email, cnpj, card_token, card_brand, card_last4, 
              card_holder_name, card_exp_month, card_exp_year, 
              forma_pagamento_preferida, debito_automatico_ativo 
       FROM empresas WHERE id = ?`,
      [empresaId]
    );

    if (!empresa) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    const temCartao = !!(empresa.card_token && empresa.card_last4);

    res.json({
      temCartao,
      cartao: temCartao ? {
        brand: empresa.card_brand,
        last4: empresa.card_last4,
        holderName: empresa.card_holder_name,
        expMonth: empresa.card_exp_month,
        expYear: empresa.card_exp_year,
        debitoAutomatico: empresa.debito_automatico_ativo === 1,
        formaPreferida: empresa.forma_pagamento_preferida || 'credit_card'
      } : null
    });
  } catch (err) {
    console.error("[SaaS Cartão] Erro ao buscar cartão:", err);
    res.status(500).json({ message: "Erro ao consultar cartão cadastrado" });
  }
};

// 2. Salvar / Atualizar Cartão de Crédito
exports.salvarCartao = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { cardNumber, cardholderName, cardExpirationMonth, cardExpirationYear, securityCode, docNumber, docType, debitoAutomatico } = req.body;

    if (!cardNumber || !cardholderName || !cardExpirationMonth || !cardExpirationYear || !securityCode) {
      return res.status(400).json({ message: "Preencha todos os dados do cartão de crédito" });
    }

    const cleanNum = String(cardNumber).replace(/\D/g, '');
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      return res.status(400).json({ message: "Número de cartão de crédito inválido" });
    }

    const brand = detectarBandeira(cleanNum);
    const last4 = cleanNum.slice(-4);
    const expM = parseInt(cardExpirationMonth, 10);
    const expY = parseInt(String(cardExpirationYear).length === 2 ? `20${cardExpirationYear}` : cardExpirationYear, 10);

    // Gerar token seguro no gateway
    const cardToken = await criarCardTokenGateway({
      cardNumber: cleanNum,
      cardholderName,
      cardExpirationMonth: expM,
      cardExpirationYear: expY,
      securityCode,
      docType: docType || 'CPF',
      docNumber: docNumber || '00000000000'
    });

    const isDebitoAtivo = debitoAutomatico === false ? 0 : 1;

    await db.execute(
      `UPDATE empresas 
       SET card_token = ?, card_brand = ?, card_last4 = ?, card_holder_name = ?,
           card_exp_month = ?, card_exp_year = ?, forma_pagamento_preferida = 'credit_card',
           debito_automatico_ativo = ?
       WHERE id = ?`,
      [cardToken, brand, last4, cardholderName.toUpperCase(), expM, expY, isDebitoAtivo, empresaId]
    );

    res.json({
      message: "Cartão de crédito cadastrado e tokenizado com sucesso!",
      cartao: {
        brand,
        last4,
        holderName: cardholderName.toUpperCase(),
        expMonth: expM,
        expYear: expY,
        debitoAutomatico: isDebitoAtivo === 1
      }
    });
  } catch (err) {
    console.error("[SaaS Cartão] Erro ao salvar cartão:", err);
    res.status(400).json({ message: err.message || "Erro ao tokenizar cartão de crédito" });
  }
};

// 3. Remover Cartão de Crédito
exports.removerCartao = async (req, res) => {
  try {
    const empresaId = req.empresa_id;

    await db.execute(
      `UPDATE empresas 
       SET card_token = NULL, card_brand = NULL, card_last4 = NULL, card_holder_name = NULL,
           card_exp_month = NULL, card_exp_year = NULL, forma_pagamento_preferida = 'pix',
           debito_automatico_ativo = 0
       WHERE id = ?`,
      [empresaId]
    );

    res.json({ message: "Cartão removido com sucesso. Método revertido para PIX." });
  } catch (err) {
    console.error("[SaaS Cartão] Erro ao remover cartão:", err);
    res.status(500).json({ message: "Erro ao remover cartão" });
  }
};

// 4. Alternar Débito Automático
exports.toggleDebitoAutomatico = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { ativo } = req.body;

    const valor = ativo ? 1 : 0;
    await db.execute(
      "UPDATE empresas SET debito_automatico_ativo = ? WHERE id = ?",
      [valor, empresaId]
    );

    res.json({ message: `Débito automático ${valor ? "ativado" : "desativado"} com sucesso.` });
  } catch (err) {
    console.error("[SaaS Cartão] Erro ao alternar débito:", err);
    res.status(500).json({ message: "Erro ao atualizar configuração de débito automático" });
  }
};

// 5. Pagar Fatura Imediatamente com Cartão (Cartão Salvo ou Novo)
exports.pagarFaturaComCartao = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { faturaId } = req.params;
    const { novoCartao } = req.body; // Opcional, se o cliente quiser pagar com outro cartão

    const [[fatura]] = await db.query(
      "SELECT * FROM saas_faturas WHERE id = ? AND empresa_id = ?",
      [faturaId, empresaId]
    );

    if (!fatura) {
      return res.status(404).json({ message: "Fatura não encontrada" });
    }

    if (fatura.status === 'pago') {
      return res.status(400).json({ message: "Esta fatura já foi paga" });
    }

    const [[empresa]] = await db.query(
      "SELECT * FROM empresas WHERE id = ?",
      [empresaId]
    );

    let tokenCobrar = empresa.card_token;

    // Se o cliente enviou um novo cartão para este pagamento
    if (novoCartao && novoCartao.cardNumber) {
      tokenCobrar = await criarCardTokenGateway({
        cardNumber: novoCartao.cardNumber,
        cardholderName: novoCartao.cardholderName,
        cardExpirationMonth: novoCartao.cardExpirationMonth,
        cardExpirationYear: novoCartao.cardExpirationYear,
        securityCode: novoCartao.securityCode,
        docType: novoCartao.docType || 'CPF',
        docNumber: novoCartao.docNumber || empresa.cnpj
      });
    }

    if (!tokenCobrar) {
      return res.status(400).json({ message: "Nenhum cartão cadastrado para efetuar o pagamento." });
    }

    // Processar cobrança via Gateway
    const resultado = await cobrarCartaoFaturaSaas(fatura, tokenCobrar, empresa);

    if (resultado.success) {
      // 1. Atualizar fatura como PAGO
      await db.execute(
        `UPDATE saas_faturas 
         SET status = 'pago', pago_em = NOW(), forma_pagamento = 'cartao',
             cartao_transacao_id = ?, cartao_mensagem_erro = NULL,
             tentativas_cobranca = tentativas_cobranca + 1
         WHERE id = ?`,
        [resultado.transacaoId, fatura.id]
      );

      // 2. Regularizar status financeiro da empresa
      await db.execute(
        "UPDATE empresas SET status_financeiro = 'adimplente' WHERE id = ?",
        [empresaId]
      );

      return res.json({
        success: true,
        message: "Mensalidade paga com sucesso no Cartão de Crédito!",
        transacaoId: resultado.transacaoId
      });
    } else {
      // Registrar falha na fatura
      await db.execute(
        `UPDATE saas_faturas 
         SET cartao_mensagem_erro = ?, tentativas_cobranca = tentativas_cobranca + 1
         WHERE id = ?`,
        [resultado.mensagem, fatura.id]
      );

      return res.status(400).json({
        success: false,
        message: resultado.mensagem || "Cartão não aprovado pelo emissor."
      });
    }
  } catch (err) {
    console.error("[SaaS Cartão] Erro ao pagar fatura:", err);
    res.status(500).json({ message: err.message || "Erro ao processar pagamento no cartão" });
  }
};
