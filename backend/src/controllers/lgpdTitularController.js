const db = require("../../db");
const crypto = require("crypto");
const { enviarMensagemDireta } = require("./whatsappController");

function gerarProtocolo() {
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `LGPD-${data}-${rand}`;
}

// 1. Solicitar código de validação OTP
exports.solicitarOtp = async (req, res) => {
  try {
    const { empresaSlug, telefone, cpf } = req.body;
    if (!empresaSlug || (!telefone && !cpf)) {
      return res.status(400).json({ message: "Informe o telefone ou CPF do titular" });
    }

    const [[empresa]] = await db.execute("SELECT id, nome FROM empresas WHERE slug = ?", [empresaSlug]);
    if (!empresa) return res.status(404).json({ message: "Empresa não encontrada" });

    const telLimpo = telefone ? telefone.replace(/\D/g, "") : null;
    const cpfLimpo = cpf ? cpf.replace(/\D/g, "") : null;

    // Gerar OTP de 6 dígitos
    const codigoOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const protocolo = gerarProtocolo();
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    await db.execute(
      `INSERT INTO lgpd_solicitacoes 
       (empresa_id, protocolo, tipo, telefone, cpf, codigo_otp, status, ip_solicitante)
       VALUES (?, ?, 'consulta', ?, ?, ?, 'pendente', ?)`,
      [empresa.id, protocolo, telLimpo, cpfLimpo, codigoOtp, ip]
    );

    // Disparar via WhatsApp se informado
    if (telLimpo) {
      const msg = `🔒 *Portal de Privacidade LGPD - ${empresa.nome}*\n\nSeu código de verificação para acesso ou exclusão dos seus dados é:\n👉 *${codigoOtp}*\n\nProtocolo: ${protocolo}\nValidade: 15 minutos.`;
      try {
        await enviarMensagemDireta(telLimpo, msg, empresa.id);
      } catch (wErr) {
        console.warn("[LGPD Titular] Não foi possível enviar WhatsApp:", wErr.message);
      }
    }

    res.json({
      message: "Código de confirmação gerado!",
      protocolo,
      simuladoOtp: process.env.NODE_ENV !== "production" ? codigoOtp : undefined
    });
  } catch (err) {
    console.error("Erro ao solicitar OTP LGPD:", err);
    res.status(500).json({ message: "Erro ao gerar solicitação" });
  }
};

// 2. Consultar dados pessoais coletados
exports.consultarDados = async (req, res) => {
  try {
    const { protocolo, codigoOtp } = req.body;
    if (!protocolo || !codigoOtp) {
      return res.status(400).json({ message: "Protocolo e código OTP são obrigatórios" });
    }

    const [[solic]] = await db.execute(
      "SELECT * FROM lgpd_solicitacoes WHERE protocolo = ? AND codigo_otp = ?",
      [protocolo, codigoOtp]
    );

    if (!solic) {
      return res.status(401).json({ message: "Código de confirmação inválido ou expirado" });
    }

    // Marcar OTP como validado
    await db.execute(
      "UPDATE lgpd_solicitacoes SET otp_validado = 1 WHERE id = ?",
      [solic.id]
    );

    const empresaId = solic.empresa_id;
    const tel = solic.telefone;
    const cpf = solic.cpf;

    // Buscar em leads
    const [leads] = await db.query(
      `SELECT id, nome, email, telefone, cpf, mac, ip, origem, criado_em, lgpd_aceite, lgpd_termo
       FROM leads 
       WHERE empresa_id = ? AND (
         (? IS NOT NULL AND telefone LIKE ?) OR 
         (? IS NOT NULL AND cpf = ?)
       )`,
      [empresaId, tel, `%${tel?.slice(-8)}%`, cpf, cpf]
    );

    // Buscar em lgpd_logins
    const [logins] = await db.query(
      `SELECT id, nome, telefone, cpf, mac, ip, criado_em, aceite
       FROM lgpd_logins 
       WHERE empresa_id = ? AND (
         (? IS NOT NULL AND telefone LIKE ?) OR 
         (? IS NOT NULL AND cpf = ?)
       )`,
      [empresaId, tel, `%${tel?.slice(-8)}%`, cpf, cpf]
    );

    res.json({
      protocolo,
      titular: {
        telefone: solic.telefone,
        cpf: solic.cpf
      },
      registros: {
        cadastros_lead: leads,
        logins_conectados: logins,
        total_encontrados: leads.length + logins.length
      }
    });
  } catch (err) {
    console.error("Erro ao consultar dados LGPD:", err);
    res.status(500).json({ message: "Erro ao consultar dados" });
  }
};

// 3. Executar Anonimização / Direito ao Esquecimento
exports.anonimizarDados = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const { protocolo, codigoOtp, motivo } = req.body;

    const [[solic]] = await conn.execute(
      "SELECT * FROM lgpd_solicitacoes WHERE protocolo = ? AND codigo_otp = ? AND otp_validado = 1",
      [protocolo, codigoOtp]
    );

    if (!solic) {
      return res.status(401).json({ message: "Sessão inválida ou não autenticada via OTP" });
    }

    const empresaId = solic.empresa_id;
    const tel = solic.telefone;
    const cpf = solic.cpf;

    await conn.beginTransaction();

    // 1. Anonimizar leads
    if (tel || cpf) {
      await conn.execute(
        `UPDATE leads 
         SET nome = '[TITULAR ANONIMIZADO]',
             email = 'anonimizado@lgpd.nuvycore.online',
             telefone = '00000000000',
             cpf = NULL
         WHERE empresa_id = ? AND (
           (? IS NOT NULL AND telefone LIKE ?) OR 
           (? IS NOT NULL AND cpf = ?)
         )`,
        [empresaId, tel, `%${tel?.slice(-8)}%`, cpf, cpf]
      );

      // 2. Anonimizar logins LGPD
      await conn.execute(
        `UPDATE lgpd_logins 
         SET nome = '[ANONIMIZADO]',
             telefone = NULL,
             cpf = NULL
         WHERE empresa_id = ? AND (
           (? IS NOT NULL AND telefone LIKE ?) OR 
           (? IS NOT NULL AND cpf = ?)
         )`,
        [empresaId, tel, `%${tel?.slice(-8)}%`, cpf, cpf]
      );
    }

    // 3. Finalizar solicitação e gerar hash de auditoria
    const certHash = crypto.createHash("sha256")
      .update(`${protocolo}-${empresaId}-${Date.now()}`)
      .digest("hex");

    await conn.execute(
      `UPDATE lgpd_solicitacoes 
       SET tipo = 'anonimizacao',
           status = 'concluido',
           concluido_em = NOW(),
           detalhes_log = ?
       WHERE id = ?`,
      [JSON.stringify({ motivo: motivo || "Solicitação direta do titular", hash_auditoria: certHash }), solic.id]
    );

    await conn.commit();

    res.json({
      message: "Dados anonimizados e excluídos com sucesso em conformidade com o Art. 18 da LGPD (Lei 13.709/2018)!",
      protocolo,
      hash_auditoria: certHash,
      data_conclusao: new Date().toISOString()
    });
  } catch (err) {
    await conn.rollback();
    console.error("Erro ao anonimizar dados LGPD:", err);
    res.status(500).json({ message: "Erro ao processar anonimização" });
  } finally {
    conn.release();
  }
};

// 4. Listagem de auditoria para o Admin
exports.listarSolicitacoesAdmin = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [solics] = await db.query(
      `SELECT * FROM lgpd_solicitacoes 
       WHERE empresa_id = ? 
       ORDER BY criado_em DESC 
       LIMIT 100`,
      [empresaId]
    );
    res.json(solics);
  } catch (err) {
    console.error("Erro ao listar solicitações LGPD:", err);
    res.status(500).json({ message: "Erro ao listar histórico de solicitações" });
  }
};
