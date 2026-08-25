const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const db = require("../../db");

const BACKUP_DIR = "/var/backups/hotspot";

// Garante que o diretório de backups exista
if (!fs.existsSync(BACKUP_DIR)) {
    try {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    } catch (e) {
        console.warn("[Backup Engine ⚠️] Não foi possível criar diretório em /var/backups/hotspot, usando fallback:", e.message);
    }
}

/**
 * Executa o backup completo (MySQL + Arquivos + n8n)
 */
async function executarBackupGeral({ disparadoPor = "Agendamento Automático" } = {}) {
    const startTime = Date.now();
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `backup_hotspot_${dateStr}.tar.gz`;
    const finalPath = path.join(BACKUP_DIR, filename);
    const tempDir = `/tmp/backup_build_${dateStr}`;

    console.log(`[Backup Engine 💾] Iniciando backup geral (${disparadoPor})...`);

    try {
        // 1. Criar pasta temporária de trabalho
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const dbUser = process.env.DB_USER || "hotspotuser";
        const dbPass = process.env.DB_PASSWORD || "";
        const dbName = process.env.DB_NAME || "hotspot";
        const dbHost = process.env.DB_HOST || "127.0.0.1";

        // 2. Exportar Dump Completo do MySQL (.sql.gz)
        const dumpPath = path.join(tempDir, `database_${dateStr}.sql.gz`);
        const mysqlDumpCmd = `mysqldump -h ${dbHost} -u ${dbUser} -p'${dbPass}' --single-transaction --routines --triggers ${dbName} | gzip > "${dumpPath}"`;

        await execPromise(mysqlDumpCmd);
        console.log(`[Backup Engine 📦] Dump do MySQL gerado com sucesso!`);

        // 3. Copiar Workflows n8n, Uploads e Arquivo de Configuração .env
        const n8nSrc = "/var/www/hotspot/n8n";
        const uploadsSrc = "/var/www/hotspot/backend/uploads";
        const envSrc = "/var/www/hotspot/backend/.env";

        if (fs.existsSync(n8nSrc)) {
            await execPromise(`cp -r "${n8nSrc}" "${tempDir}/n8n_workflows"`);
        }
        if (fs.existsSync(uploadsSrc)) {
            await execPromise(`cp -r "${uploadsSrc}" "${tempDir}/uploads"`);
        }
        if (fs.existsSync(envSrc)) {
            await execPromise(`cp "${envSrc}" "${tempDir}/.env.backup"`);
        }

        // 4. Compactar tudo em um único arquivo .tar.gz
        const tarCmd = `tar -czf "${finalPath}" -C "${tempDir}" .`;
        await execPromise(tarCmd);
        console.log(`[Backup Engine ✅] Arquivo final compactado em: ${finalPath}`);

        // 5. Limpeza da pasta temporária
        await execPromise(`rm -rf "${tempDir}"`);

        // 6. Obter tamanho do arquivo em MB/GB
        const stats = fs.statSync(finalPath);
        const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

        // 7. Executar Limpeza e Rotação Automática (Manter 15 dias)
        await rotacionarBackupsAntigos(15);

        // 8. Disparar Notificação no WhatsApp do Proprietário (NuvyCore)
        const msgWhatsapp =
            `💾 *ALERTAS DE BACKUP HOTSPOT SAAS*\n\n` +
            `✅ *Backup Geral Concluído com Sucesso!*\n\n` +
            `📂 *Arquivo:* \`${filename}\`\n` +
            `📊 *Tamanho:* ${sizeMb} MB\n` +
            `⏱️ *Tempo de Execução:* ${durationSec} segundos\n` +
            `⚙️ *Origem:* ${disparadoPor}\n` +
            `📅 *Data/Hora:* ${now.toLocaleString("pt-BR")}\n\n` +
            `_O arquivo está armazenado com segurança e disponível para download 1-clique no painel Super Admin._`;

        enviarNotificacaoWhatsapp(msgWhatsapp).catch(() => { });

        // 9. Enviar cópia do backup por e-mail (se configurado)
        try {
            const emailService = require("./emailService");
            emailService.enviarBackupPorEmail({
                filename,
                filePath: finalPath,
                sizeMb,
                duracaoSec: durationSec,
                disparadoPor
            }).catch(e => console.warn("[Backup Engine ⚠️] Aviso no envio por e-mail:", e.message));
        } catch (e) {
            console.warn("[Backup Engine ⚠️] Erro ao carregar módulo de e-mail:", e.message);
        }

        return {
            sucesso: true,
            filename,
            caminho: finalPath,
            tamanho_bytes: stats.size,
            tamanho_mb: sizeMb,
            duracao_segundos: durationSec,
            criado_em: now
        };

    } catch (err) {
        console.error(`[Backup Engine ❌] Erro ao executar backup:`, err.message);

        // Notificar falha no WhatsApp
        const msgErro =
            `🚨 *ALERTA DE FALHA NO BACKUP HOTSPOT!*\n\n` +
            `Ocorreu um erro durante a execução do backup geral automático.\n\n` +
            `❌ *Erro:* ${err.message}\n` +
            `📅 *Data/Hora:* ${now.toLocaleString("pt-BR")}\n\n` +
            `_Por favor, verifique o espaço em disco ou logs do servidor._`;

        enviarNotificacaoWhatsapp(msgErro).catch(() => { });

        // Limpeza de emergência
        if (fs.existsSync(tempDir)) {
            await execPromise(`rm -rf "${tempDir}"`).catch(() => { });
        }

        throw err;
    }
}

/**
 * Apaga backups antigos ultrapassados os dias de retenção (Padrão 15 dias)
 */
async function rotacionarBackupsAntigos(diasRetencao = 15) {
    try {
        if (!fs.existsSync(BACKUP_DIR)) return;

        const files = fs.readdirSync(BACKUP_DIR);
        const agora = Date.now();
        const limiteMs = diasRetencao * 24 * 60 * 60 * 1000;
        let deletados = 0;

        for (const file of files) {
            if (file.startsWith("backup_hotspot_") && file.endsWith(".tar.gz")) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                const idadeMs = agora - stats.mtimeMs;

                if (idadeMs > limiteMs) {
                    fs.unlinkSync(filePath);
                    deletados++;
                    console.log(`[Backup Engine 🧹] Backup antigo removido (> 15 dias): ${file}`);
                }
            }
        }

        if (deletados > 0) {
            console.log(`[Backup Engine 🧹] Rotação concluída! ${deletados} arquivo(s) antigo(s) excluído(s).`);
        }
    } catch (err) {
        console.warn(`[Backup Engine ⚠️] Aviso na rotação de backups:`, err.message);
    }
}

/**
 * Lista todos os backups armazenados no diretório (.tar.gz)
 */
function listarBackups() {
    if (!fs.existsSync(BACKUP_DIR)) return [];

    const files = fs.readdirSync(BACKUP_DIR);
    const lista = [];

    for (const file of files) {
        if (file.endsWith(".tar.gz")) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

            lista.push({
                filename: file,
                tamanho_bytes: stats.size,
                tamanho_mb: sizeMb,
                criado_em: stats.mtime
            });
        }
    }

    // Ordenar do mais recente para o mais antigo
    return lista.sort((a, b) => b.criado_em - a.criado_em);
}

/**
 * Restaura o sistema a partir de um arquivo de backup em /var/backups/hotspot
 */
async function restaurarBackupDoArquivo(filename, { disparadoPor = "Super Admin" } = {}) {
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
        throw new Error("Arquivo de backup não encontrado em disk: " + safeFilename);
    }

    const tempDir = `/tmp/restore_build_${Date.now()}`;
    console.log(`[Backup Engine 🔄] Iniciando restauração a partir do arquivo: ${safeFilename}...`);

    try {
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // 1. Extrair arquivo .tar.gz
        await execPromise(`tar -xzf "${filePath}" -C "${tempDir}"`);
        console.log(`[Backup Engine 📦] Backup descompactado na pasta temporária.`);

        const dbUser = process.env.DB_USER || "hotspotuser";
        const dbPass = process.env.DB_PASSWORD || "";
        const dbName = process.env.DB_NAME || "hotspot";
        const dbHost = process.env.DB_HOST || "127.0.0.1";

        // 2. Localizar dump do banco de dados (database.sql ou database_*.sql.gz)
        const filesExtracted = fs.readdirSync(tempDir);
        const dumpGz = filesExtracted.find(f => f.startsWith("database_") && f.endsWith(".sql.gz"));
        const dumpSql = filesExtracted.find(f => f.endsWith(".sql"));

        if (dumpGz) {
            const dumpPath = path.join(tempDir, dumpGz);
            await execPromise(`zcat "${dumpPath}" | mysql -h ${dbHost} -u ${dbUser} -p'${dbPass}' ${dbName}`);
            console.log(`[Backup Engine 🛢️] Banco de dados restaurado a partir de ${dumpGz}!`);
        } else if (dumpSql) {
            const dumpPath = path.join(tempDir, dumpSql);
            await execPromise(`mysql -h ${dbHost} -u ${dbUser} -p'${dbPass}' ${dbName} < "${dumpPath}"`);
            console.log(`[Backup Engine 🛢️] Banco de dados restaurado a partir de database.sql!`);
        } else {
            console.warn(`[Backup Engine ⚠️] Nenhum arquivo .sql ou .sql.gz encontrado no pacote de backup.`);
        }

        // 3. Restaurar workflows n8n, uploads e .env se existirem no pacote
        const n8nRest = path.join(tempDir, "n8n_workflows");
        const uploadsRest = path.join(tempDir, "uploads");
        const envRest = path.join(tempDir, ".env.backup");

        if (fs.existsSync(n8nRest)) {
            await execPromise(`cp -r "${n8nRest}/." "/var/www/hotspot/n8n/"`).catch(() => { });
        }
        if (fs.existsSync(uploadsRest)) {
            await execPromise(`cp -r "${uploadsRest}/." "/var/www/hotspot/backend/uploads/"`).catch(() => { });
        }
        if (fs.existsSync(envRest)) {
            await execPromise(`cp "${envRest}" "/var/www/hotspot/backend/.env"`).catch(() => { });
        }

        // 4. Limpeza da pasta temporária
        await execPromise(`rm -rf "${tempDir}"`);

        // 5. Notificação no WhatsApp
        const msgRest =
            `🔄 *ALERTAS DE RESTAURAÇÃO HOTSPOT SAAS*\n\n` +
            `✅ *Sistema Restaurado com Sucesso!*\n\n` +
            `📂 *Arquivo Utilizado:* \`${safeFilename}\`\n` +
            `👤 *Solicitante:* ${disparadoPor}\n` +
            `📅 *Data/Hora:* ${new Date().toLocaleString("pt-BR")}\n\n` +
            `_O servidor será reiniciado automaticamente em instantes para aplicar todas as configurações._`;

        enviarNotificacaoWhatsapp(msgRest).catch(() => { });

        // 6. Agendar reinício do PM2 em 2 segundos
        setTimeout(() => {
            console.log("[Backup Engine 🔄] Reiniciando processo PM2...");
            exec("pm2 restart all");
        }, 2000);

        return {
            sucesso: true,
            filename: safeFilename,
            mensagem: "Restauração concluída com sucesso! O servidor será reiniciado em 2 segundos."
        };

    } catch (err) {
        console.error(`[Backup Engine ❌] Erro ao restaurar backup:`, err.message);
        if (fs.existsSync(tempDir)) {
            await execPromise(`rm -rf "${tempDir}"`).catch(() => { });
        }
        throw err;
    }
}

/**
 * Deleta manualmente um backup específico
 */
function excluirBackup(filename) {
    const safeFilename = path.basename(filename);
    const filePath = path.join(BACKUP_DIR, safeFilename);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
}

/**
 * Auxiliar para notificar proprietário via WhatsApp
 */
async function enviarNotificacaoWhatsapp(mensagem) {
    try {
        const { enviarMensagemDireta } = require("../controllers/whatsappController");
        // Buscar número do WhatsApp do Super Admin
        const [[config]] = await db.query(
            `SELECT config_json FROM empresa_configs WHERE empresa_id = 1 AND config_type = 'ia_atendimento' LIMIT 1`
        );

        let telAdmin = "5567992553089"; // Telefone NuvyCore Padrão
        if (config && config.config_json) {
            const parsed = typeof config.config_json === 'string' ? JSON.parse(config.config_json) : config.config_json;
            if (parsed.transbordo_whatsapp) {
                telAdmin = parsed.transbordo_whatsapp;
            }
        }

        const telDigits = String(telAdmin).replace(/\D/g, "");
        const telFmt = telDigits.startsWith("55") ? telDigits : `55${telDigits}`;

        await enviarMensagemDireta(telFmt, mensagem, 1);
    } catch (e) {
        console.warn("[Backup Engine ⚠️] Não foi possível enviar notificação WhatsApp:", e.message);
    }
}

module.exports = {
    BACKUP_DIR,
    executarBackupGeral,
    listarBackups,
    excluirBackup,
    rotacionarBackupsAntigos,
    restaurarBackupDoArquivo
};
