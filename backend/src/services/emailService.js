const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const db = require("../../db");

/**
 * Obtém a configuração de SMTP e e-mail de destino do banco de dados ou do file .env
 */
async function obterConfigEmailBackup() {
    try {
        const [[config]] = await db.query(
            `SELECT config_json FROM empresa_configs WHERE empresa_id = 1 AND config_type = 'backup_email' LIMIT 1`
        );

        let emailDestino = process.env.BACKUP_EMAIL_DESTINO || "contato@nuvycore.online";
        let ativo = process.env.BACKUP_EMAIL_ATIVO === "true";
        let smtpHost = process.env.SMTP_HOST || "";
        let smtpPort = parseInt(process.env.SMTP_PORT || "587");
        let smtpUser = process.env.SMTP_USER || "";
        let smtpPass = process.env.SMTP_PASS || "";
        let smtpSecure = process.env.SMTP_SECURE === "true"; // true para porta 465

        if (config && config.config_json) {
            const parsed = typeof config.config_json === 'string' ? JSON.parse(config.config_json) : config.config_json;
            if (parsed.email_destino) emailDestino = parsed.email_destino;
            if (parsed.ativo !== undefined) ativo = Boolean(parsed.ativo);
            if (parsed.smtp_host) smtpHost = parsed.smtp_host;
            if (parsed.smtp_port) smtpPort = parseInt(parsed.smtp_port);
            if (parsed.smtp_user) smtpUser = parsed.smtp_user;
            if (parsed.smtp_pass) smtpPass = parsed.smtp_pass;
            if (parsed.smtp_secure !== undefined) smtpSecure = Boolean(parsed.smtp_secure);
        }

        return {
            ativo,
            email_destino: emailDestino,
            smtp_host: smtpHost,
            smtp_port: smtpPort,
            smtp_user: smtpUser,
            smtp_pass: smtpPass,
            smtp_secure: smtpSecure
        };
    } catch (err) {
        console.warn("[Email Service ⚠️] Erro ao obter configurações de e-mail:", err.message);
        return {
            ativo: false,
            email_destino: process.env.BACKUP_EMAIL_DESTINO || "contato@nuvycore.online"
        };
    }
}

/**
 * Envia o arquivo de backup (.tar.gz) por e-mail para o proprietário
 */
async function enviarBackupPorEmail({ filename, filePath, sizeMb, duracaoSec, disparadoPor }) {
    try {
        const config = await obterConfigEmailBackup();

        if (!config.ativo) {
            console.log("[Email Service 📧] Envio de e-mail de backup está desativado.");
            return false;
        }

        if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
            console.warn("[Email Service ⚠️] Dados de SMTP (Host, Usuário, Senha) não configurados. Atualize as configurações no painel.");
            return false;
        }

        const transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure, // true para 465, false para 587/outras
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        const sizeBytes = stats ? stats.size : 0;
        const maxAttachmentSize = 25 * 1024 * 1024; // Limit ~25 MB for email attachments

        const attachments = [];
        let avisoTamanho = "";

        if (stats && sizeBytes <= maxAttachmentSize) {
            attachments.push({
                filename: filename,
                path: filePath
            });
        } else {
            avisoTamanho = `<p style="color: #d97706; font-size: 12px; margin-top: 10px;">⚠️ <strong>Nota:</strong> O arquivo de backup (${sizeMb} MB) excedeu o limite padrão de anexos de e-mail (25MB). Utilize o painel Super Admin para realizar o download com 1-clique.</p>`;
        }

        const domain = process.env.SYSTEM_DOMAIN || "hotspot.nuvycore.online";
        const downloadUrl = `https://${domain}/super/backups`;

        const mailOptions = {
            from: `"NuvyCore Backup Engine" <${config.smtp_user}>`,
            to: config.email_destino,
            subject: `💾 Backup do Sistema Concluído - ${filename}`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #1e293b;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                        <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #2563eb;">
                            <h2 style="color: #0f172a; margin: 0; font-size: 20px;">🛡️ NuvyCore SaaS Backup Engine</h2>
                            <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Cópia de Segurança Automatizada do Sistema</p>
                        </div>
                        
                        <div style="padding: 20px 0;">
                            <p style="font-size: 14px; color: #334155;">Olá,</p>
                            <p style="font-size: 14px; color: #334155;">O backup completo da plataforma <strong>Hotspot SaaS</strong> foi executado com sucesso e a cópia de segurança está pronta.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
                                <tr style="background-color: #f1f5f9;">
                                    <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">📂 Arquivo:</td>
                                    <td style="padding: 10px; border: 1px solid #e2e8f0; font-family: monospace;">${filename}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">📊 Tamanho:</td>
                                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${sizeMb} MB</td>
                                </tr>
                                <tr style="background-color: #f1f5f9;">
                                    <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">⏱️ Duração:</td>
                                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${duracaoSec} segundos</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">⚙️ Origem:</td>
                                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${disparadoPor}</td>
                                </tr>
                                <tr style="background-color: #f1f5f9;">
                                    <td style="padding: 10px; font-weight: bold; border: 1px solid #e2e8f0;">📅 Data / Hora:</td>
                                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date().toLocaleString("pt-BR")}</td>
                                </tr>
                            </table>

                            ${avisoTamanho}

                            <div style="text-align: center; margin-top: 24px;">
                                <a href="${downloadUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                                    🖥️ Gerenciar e Baixar Backups no Painel
                                </a>
                            </div>
                        </div>

                        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                            Este e-mail foi gerado automaticamente pelo NuvyCore SaaS Hotspot Engine &copy; 2026.
                        </div>
                    </div>
                </div>
            `,
            attachments: attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Service 📧] E-mail de backup enviado com sucesso para ${config.email_destino}! (MessageID: ${info.messageId})`);
        return true;

    } catch (err) {
        console.error(`[Email Service ❌] Erro ao enviar e-mail de backup:`, err.message);
        return false;
    }
}

/**
 * Salva a configuração de e-mail de backup no banco de dados
 */
async function salvarConfigEmailBackup(dados) {
    const jsonStr = JSON.stringify({
        ativo: Boolean(dados.ativo),
        email_destino: dados.email_destino || "contato@nuvycore.online",
        smtp_host: dados.smtp_host || "",
        smtp_port: parseInt(dados.smtp_port || 587),
        smtp_user: dados.smtp_user || "",
        smtp_pass: dados.smtp_pass || "",
        smtp_secure: Boolean(dados.smtp_secure)
    });

    await db.query(
        `INSERT INTO empresa_configs (empresa_id, config_type, config_json)
         VALUES (1, 'backup_email', ?)
         ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)`,
        [jsonStr]
    );

    return true;
}

/**
 * Cria o transportador Nodemailer com base nas configurações ativas
 */
async function criarTransporter() {
    const config = await obterConfigEmailBackup();

    if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
        throw new Error("Configurações SMTP não preenchidas no sistema.");
    }

    return {
        transporter: nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass,
            },
            tls: {
                rejectUnauthorized: false
            }
        }),
        config
    };
}

/**
 * Envia e-mail de Redefinição / Recuperação de Senha
 */
async function enviarEmailResetSenha({ email, nome, token }) {
    try {
        const { transporter, config } = await criarTransporter();
        const domain = process.env.SYSTEM_DOMAIN || "hotspot.nuvycore.online";
        const resetUrl = `https://${domain}/redefinir-senha?token=${token}`;

        const mailOptions = {
            from: `"NuvyCore Suporte" <${config.smtp_user}>`,
            to: email,
            subject: `🔑 Recuperação de Senha - NuvyCore SaaS`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
                    <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                            <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;">🔑 Redefinição de Senha</h1>
                            <p style="color: #64748b; font-size: 13px; margin-top: 6px;">NuvyCore Hotspot Platform</p>
                        </div>

                        <div style="padding: 24px 0;">
                            <p style="font-size: 15px; color: #334155;">Olá, <strong>${nome || 'Usuário'}</strong>!</p>
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta de acesso ao NuvyCore SaaS. Para criar uma nova senha, clique no botão seguro abaixo:</p>

                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37,99,235,0.3);">
                                    🔑 Redefinir Minha Senha Agora
                                </a>
                            </div>

                            <p style="font-size: 12px; color: #d97706; background-color: #fffbe6; padding: 12px; border-radius: 8px; border: 1px solid #fef3c7;">
                                ⚠️ <strong>Atenção:</strong> Este link é temporário e expira em <strong>30 minutos</strong> por razões de segurança. Se não solicitou a alteração, ignore este e-mail.
                            </p>

                            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Ou copie e cole o link a seguir no seu navegador:<br>
                            <span style="font-family: monospace; color: #2563eb; word-break: break-all;">${resetUrl}</span></p>
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
                            Equipe NuvyCore SaaS &copy; 2026. Todos os direitos reservados.
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Email Service 📧] E-mail de reset de senha enviado para ${email}`);
        return true;
    } catch (err) {
        console.error(`[Email Service ❌] Erro ao enviar reset de senha:`, err.message);
        return false;
    }
}

/**
 * Envia e-mail de Boas-Vindas para Nova Empresa (B2B SaaS)
 */
async function enviarEmailBoasVindasEmpresa({ email, nome, empresaNome, slug }) {
    try {
        const { transporter, config } = await criarTransporter();
        const domain = process.env.SYSTEM_DOMAIN || "hotspot.nuvycore.online";
        const loginUrl = `https://${domain}/admin/${slug}`;

        const mailOptions = {
            from: `"NuvyCore SaaS" <${config.smtp_user}>`,
            to: email,
            subject: `🚀 Bem-vindo ao NuvyCore - ${empresaNome}`,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
                    <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #10b981;">
                            <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;">🎉 Sua conta está pronta!</h1>
                            <p style="color: #64748b; font-size: 13px; margin-top: 6px;">Plataforma Gestora de Wi-Fi Hotspot & CRM</p>
                        </div>

                        <div style="padding: 24px 0;">
                            <p style="font-size: 15px; color: #334155;">Olá, <strong>${nome || 'Administrador'}</strong>!</p>
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">É um prazer ter a empresa <strong>${empresaNome}</strong> conosco! Seu painel administrativo do Hotspot foi criado com sucesso.</p>

                            <div style="background-color: #f1f5f9; padding: 16px; border-radius: 10px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 13px; color: #334155;"><strong>🏢 Empresa:</strong> ${empresaNome}</p>
                                <p style="margin: 6px 0 0 0; font-size: 13px; color: #334155;"><strong>📧 E-mail de Login:</strong> ${email}</p>
                                <p style="margin: 6px 0 0 0; font-size: 13px; color: #334155;"><strong>🔗 Link de Acesso Exclusivo:</strong> <a href="${loginUrl}" style="color: #2563eb;">${loginUrl}</a></p>
                            </div>

                            <div style="text-align: center; margin: 28px 0;">
                                <a href="${loginUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
                                    🚀 Acessar Meu Painel Agora
                                </a>
                            </div>
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
                            Equipe NuvyCore SaaS &copy; 2026.
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Email Service 📧] E-mail de boas-vindas B2B enviado para ${email}`);
        return true;
    } catch (err) {
        console.error(`[Email Service ❌] Erro ao enviar boas-vindas B2B:`, err.message);
        return false;
    }
}

/**
 * Envia e-mail de Boas-Vindas para Visitante que conectou no Wi-Fi Captive Portal (B2C)
 */
async function enviarEmailBoasVindasWifi({ email, leadNome, empresaNome, portalConfig }) {
    try {
        const { transporter, config } = await criarTransporter();

        const assunto = portalConfig.email_welcome_subject || `📶 Conectado ao Wi-Fi - ${empresaNome}`;
        const mensagemCustom = portalConfig.email_welcome_body || `Obrigado por se conectar ao nosso Wi-Fi! Aproveite sua conexão de alta velocidade.`;
        const cupom = (portalConfig.email_welcome_coupon && portalConfig.email_welcome_coupon.trim().length > 0)
            ? portalConfig.email_welcome_coupon.trim()
            : null;

        let blocoCupom = "";
        if (cupom) {
            blocoCupom = `
                <div style="background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
                    <p style="color: #166534; font-size: 12px; font-weight: bold; margin: 0; text-transform: uppercase;">🎁 Seu Cupom Especial de Desconto</p>
                    <p style="color: #15803d; font-size: 24px; font-weight: 900; margin: 8px 0; font-family: monospace; letter-spacing: 2px;">${cupom}</p>
                    <p style="color: #166534; font-size: 11px; margin: 0;">Apresente este código no caixa para resgatar sua vantagem!</p>
                </div>
            `;
        }

        const mailOptions = {
            from: `"${empresaNome} Wi-Fi" <${config.smtp_user}>`,
            to: email,
            subject: assunto,
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
                    <div style="max-width: 550px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);">
                        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2563eb;">
                            <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800;">📶 Bem-vindo ao Wi-Fi</h1>
                            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">${empresaNome}</p>
                        </div>

                        <div style="padding: 24px 0;">
                            <p style="font-size: 15px; color: #334155;">Olá, <strong>${leadNome || 'Cliente'}</strong>!</p>
                            <p style="font-size: 14px; color: #475569; line-height: 1.6;">${mensagemCustom.replace(/\n/g, '<br>')}</p>

                            ${blocoCupom}
                        </div>

                        <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #94a3b8;">
                            Oferecido por ${empresaNome} &bull; Powered by NuvyCore Wi-Fi.
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`[Email Service 📧] E-mail de boas-vindas Wi-Fi enviado para ${email}`);
        return true;
    } catch (err) {
        console.error(`[Email Service ❌] Erro ao enviar e-mail Wi-Fi:`, err.message);
        return false;
    }
}

/**
 * Disparo em massa de E-mail Marketing do CRM
 */
async function enviarEmailMarketingBatch({ destinatarios, assunto, conteudoHtml, empresaNome }) {
    try {
        const { transporter, config } = await criarTransporter();
        let enviados = 0;

        for (const dest of destinatarios) {
            try {
                const targetEmail = typeof dest === 'string' ? dest : dest?.email;
                const targetNome = typeof dest === 'object' && dest?.nome ? dest.nome : 'Cliente';
                if (!targetEmail) continue;

                const htmlFinal = `
                    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
                        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
                            <div style="padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px;">
                                <h3 style="margin:0; color:#0f172a;">${empresaNome || 'NuvyCore Hotspot'}</h3>
                            </div>
                            <div style="font-size: 14px; color: #334155; line-height: 1.6;">
                                ${conteudoHtml.replace(/\{nome\}/g, targetNome)}
                            </div>
                            <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
                                Recebeu este e-mail por estar cadastrado na rede Wi-Fi de ${empresaNome || 'nosso estabelecimento'}.
                            </div>
                        </div>
                    </div>
                `;

                await transporter.sendMail({
                    from: `"${empresaNome || 'NuvyCore'}" <${config.smtp_user}>`,
                    to: targetEmail,
                    subject: assunto,
                    html: htmlFinal
                });
                enviados++;
                console.log(`[Email Marketing 📧] E-mail enviado com sucesso para ${targetEmail}`);
            } catch (errSingle) {
                console.warn(`[Email Marketing ⚠️] Falha ao enviar para ${JSON.stringify(dest)}:`, errSingle.message);
            }
        }

        return { enviados, total: destinatarios.length };
    } catch (err) {
        console.error(`[Email Marketing ❌] Erro no lote de envio:`, err.message);
        return { enviados: 0, error: err.message };
    }
}

/**
 * Verifica se a empresa possui e-mail de boas-vindas Wi-Fi ativado no portal e dispara
 */
async function checarEDispararEmailWifi(email, leadNome, empresaId, portalId = null) {
    if (!email || !empresaId) return;
    try {
        const [[empresa]] = await db.query('SELECT nome FROM empresas WHERE id = ?', [empresaId]);
        if (!empresa) return;

        let query = `SELECT * FROM portais WHERE empresa_id = ? AND email_welcome_enabled = 1`;
        const params = [empresaId];

        if (portalId) {
            query += ` AND id = ?`;
            params.push(portalId);
        }
        query += ` LIMIT 1`;

        let [[portal]] = await db.query(query, params);

        if (!portal && portalId) {
            [[portal]] = await db.query(
                `SELECT * FROM portais WHERE empresa_id = ? AND email_welcome_enabled = 1 LIMIT 1`,
                [empresaId]
            );
        }

        if (portal) {
            await enviarEmailBoasVindasWifi({
                email,
                leadNome: leadNome || 'Cliente',
                empresaNome: empresa.nome,
                portalConfig: portal
            });
        }
    } catch (err) {
        console.warn('[checarEDispararEmailWifi ⚠️]', err.message);
    }
}

module.exports = {
    obterConfigEmailBackup,
    enviarBackupPorEmail,
    salvarConfigEmailBackup,
    enviarEmailResetSenha,
    enviarEmailBoasVindasEmpresa,
    enviarEmailBoasVindasWifi,
    enviarEmailMarketingBatch,
    checarEDispararEmailWifi
};
