const path = require("path");
const fs = require("fs");
const backupService = require("../services/backupService");

// ── GET LISTAR BACKUPS ──
exports.listarBackups = async (req, res) => {
    try {
        const backups = backupService.listarBackups();

        let totalBytes = 0;
        backups.forEach(b => { totalBytes += b.tamanho_bytes; });
        const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
        const ultimoBackup = backups.length > 0 ? backups[0].criado_em : null;

        res.json({
            backups,
            total_backups: backups.length,
            espaco_ocupado_mb: totalMb,
            ultimo_backup: ultimoBackup,
            retencao_dias: 15,
            agendamento: "Todos os dias às 03:00"
        });
    } catch (err) {
        console.error("Erro ao listar backups:", err);
        res.status(500).json({ message: "Erro ao listar backups do sistema" });
    }
};

// ── POST GERAR BACKUP AGORA (MANUAL 1-CLIQUE) ──
exports.gerarBackup = async (req, res) => {
    try {
        const resultado = await backupService.executarBackupGeral({
            disparadoPor: `Manual (Usuário ID: ${req.user ? req.user.id : 'Super Admin'})`
        });

        res.json({
            message: "Backup realizado com sucesso!",
            detalhes: resultado
        });
    } catch (err) {
        console.error("Erro ao gerar backup manual:", err);
        res.status(500).json({ message: "Erro ao executar backup do sistema: " + err.message });
    }
};

// ── GET DOWNLOAD BACKUP 1-CLIQUE ──
exports.downloadBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        const safeFilename = path.basename(filename);
        const filePath = path.join(backupService.BACKUP_DIR, safeFilename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "Arquivo de backup não encontrado ou expirado." });
        }

        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (err) {
        console.error("Erro ao fazer download do backup:", err);
        res.status(500).json({ message: "Erro ao realizar download do arquivo." });
    }
};

const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, backupService.BACKUP_DIR);
    },
    filename: (req, file, cb) => {
        let safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
        if (!safeName.endsWith(".tar.gz")) {
            safeName = `backup_uploaded_${Date.now()}.tar.gz`;
        }
        cb(null, safeName);
    }
});

exports.uploadMiddleware = multer({ storage }).single("backup_file");

// ── POST UPLOAD ARQUIVO DE BACKUP (DO COMPUTADOR) ──
exports.uploadBackup = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Nenhum arquivo de backup enviado." });
        }
        res.json({
            message: "Arquivo de backup enviado com sucesso para o servidor!",
            filename: req.file.filename,
            tamanho_mb: (req.file.size / (1024 * 1024)).toFixed(2)
        });
    } catch (err) {
        console.error("Erro no upload do backup:", err);
        res.status(500).json({ message: "Erro ao realizar upload do arquivo: " + err.message });
    }
};

// ── POST RESTAURAR BACKUP ──
exports.restaurarBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        const resultado = await backupService.restaurarBackupDoArquivo(filename, {
            disparadoPor: req.user ? `Super Admin (${req.user.email || req.user.id})` : 'Super Admin'
        });

        res.json(resultado);
    } catch (err) {
        console.error("Erro ao restaurar backup:", err);
        res.status(500).json({ message: "Erro ao restaurar backup: " + err.message });
    }
};

// ── DELETE EXCLUIR BACKUP MANUALLMENTE ──
exports.excluirBackup = async (req, res) => {
    try {
        const { filename } = req.params;
        const removido = backupService.excluirBackup(filename);

        if (!removido) {
            return res.status(404).json({ message: "Arquivo de backup não encontrado." });
        }

        res.json({ message: "Arquivo de backup excluído com sucesso." });
    } catch (err) {
        console.error("Erro ao excluir backup:", err);
        res.status(500).json({ message: "Erro ao excluir o backup selecionado." });
    }
};

const emailService = require("../services/emailService");

// ── GET CONFIGURAÇÃO DE E-MAIL DE BACKUP ──
exports.getEmailConfig = async (req, res) => {
    try {
        const config = await emailService.obterConfigEmailBackup();
        res.json(config);
    } catch (err) {
        console.error("Erro ao obter configuração de e-mail de backup:", err);
        res.status(500).json({ message: "Erro ao obter configurações de e-mail." });
    }
};

// ── POST SALVAR CONFIGURAÇÃO DE E-MAIL DE BACKUP ──
exports.saveEmailConfig = async (req, res) => {
    try {
        const dados = req.body;
        await emailService.salvarConfigEmailBackup(dados);
        res.json({ message: "Configurações de e-mail de backup salvas com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar configuração de e-mail de backup:", err);
        res.status(500).json({ message: "Erro ao salvar configurações de e-mail: " + err.message });
    }
};

// ── POST TESTAR ENVIO DE E-MAIL DE BACKUP ──
exports.testEmail = async (req, res) => {
    try {
        const config = await emailService.obterConfigEmailBackup();

        if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
            return res.status(400).json({ message: "Preencha e salve o Servidor SMTP, Usuário e Senha antes de testar." });
        }

        const backups = backupService.listarBackups();
        let testFilename = "backup_teste.tar.gz";
        let testPath = "";
        let sizeMb = "0.00";

        if (backups.length > 0) {
            testFilename = backups[0].filename;
            testPath = path.join(backupService.BACKUP_DIR, testFilename);
            sizeMb = backups[0].tamanho_mb;
        }

        const enviado = await emailService.enviarBackupPorEmail({
            filename: testFilename,
            filePath: testPath,
            sizeMb,
            duracaoSec: "1.0",
            disparadoPor: "Teste Manual de Configuração de E-mail"
        });

        if (enviado) {
            res.json({ message: `E-mail de teste enviado com sucesso para ${config.email_destino}!` });
        } else {
            res.status(500).json({ message: "Falha ao enviar e-mail de teste. Verifique o host SMTP, porta, usuário e senha." });
        }
    } catch (err) {
        console.error("Erro no teste de e-mail:", err);
        res.status(500).json({ message: "Erro ao testar envio de e-mail: " + err.message });
    }
};
