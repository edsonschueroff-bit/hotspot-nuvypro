require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 034: Vouchers em Lote & PDV Físico ===\n');

        // 1. Criar tabela vouchers_lotes
        console.log('1. Criando tabela vouchers_lotes...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS vouchers_lotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                plano_id INT NOT NULL,
                nome_lote VARCHAR(120) NOT NULL,
                quantidade INT NOT NULL,
                prefixo VARCHAR(10) DEFAULT 'WIFI',
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_vouchers_lotes_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                CONSTRAINT fk_vouchers_lotes_plano FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE CASCADE,
                INDEX idx_lotes_empresa (empresa_id, criado_em)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela vouchers_lotes criada com sucesso.');

        // 2. Criar tabela vouchers
        console.log('\n2. Criando tabela vouchers...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS vouchers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                lote_id INT NOT NULL,
                empresa_id INT NOT NULL,
                plano_id INT NOT NULL,
                codigo VARCHAR(50) NOT NULL,
                senha VARCHAR(50) NOT NULL,
                status ENUM('disponivel', 'utilizado', 'expirado') DEFAULT 'disponivel',
                primeiro_uso_em DATETIME NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_vouchers_lote FOREIGN KEY (lote_id) REFERENCES vouchers_lotes(id) ON DELETE CASCADE,
                CONSTRAINT fk_vouchers_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                CONSTRAINT fk_vouchers_plano FOREIGN KEY (plano_id) REFERENCES planos(id) ON DELETE CASCADE,
                UNIQUE KEY unq_voucher_codigo_empresa (empresa_id, codigo),
                INDEX idx_vouchers_status (empresa_id, status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela vouchers criada com sucesso.');

        await conn.commit();
        console.log('\n=== Migration 034 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 034:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
