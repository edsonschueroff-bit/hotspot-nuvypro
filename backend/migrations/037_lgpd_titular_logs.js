require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 037: Portal do Titular LGPD & Anonimização ===\n');

        // 1. Criar tabela lgpd_solicitacoes
        console.log('1. Criando tabela lgpd_solicitacoes...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS lgpd_solicitacoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                protocolo VARCHAR(64) NOT NULL UNIQUE,
                tipo ENUM('consulta', 'anonimizacao', 'exclusao', 'revogacao') NOT NULL,
                telefone VARCHAR(30) NULL,
                cpf VARCHAR(20) NULL,
                codigo_otp VARCHAR(10) NULL,
                otp_validado TINYINT(1) DEFAULT 0,
                status ENUM('pendente', 'concluido', 'rejeitado') DEFAULT 'pendente',
                ip_solicitante VARCHAR(60) NULL,
                detalhes_log JSON NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                concluido_em DATETIME NULL,
                CONSTRAINT fk_lgpd_solic_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                INDEX idx_lgpd_solic (empresa_id, protocolo),
                INDEX idx_lgpd_solic_tel (empresa_id, telefone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela lgpd_solicitacoes criada com sucesso.');

        await conn.commit();
        console.log('\n=== Migration 037 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 037:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
