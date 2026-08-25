require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 036: Programa de Fidelidade & Gamificação ===\n');

        // 1. Criar tabela fidelidade_regras
        console.log('1. Criando tabela fidelidade_regras...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS fidelidade_regras (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                titulo VARCHAR(150) NOT NULL,
                visitas_necessarias INT NOT NULL DEFAULT 5,
                tipo_recompensa ENUM('cupom_desconto', 'brinde', 'acesso_vip') DEFAULT 'cupom_desconto',
                cupom_id INT NULL,
                descricao_recompensa VARCHAR(255) NOT NULL,
                mensagem_whatsapp TEXT NULL,
                ativo TINYINT(1) DEFAULT 1,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_fidelidade_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                CONSTRAINT fk_fidelidade_cupom FOREIGN KEY (cupom_id) REFERENCES cupons(id) ON DELETE SET NULL,
                INDEX idx_fidelidade_empresa (empresa_id, ativo)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela fidelidade_regras criada com sucesso.');

        // 2. Criar tabela fidelidade_historico
        console.log('\n2. Criando tabela fidelidade_historico...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS fidelidade_historico (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                regra_id INT NULL,
                cliente_telefone VARCHAR(30) NOT NULL,
                cliente_nome VARCHAR(150) NULL,
                total_visitas INT DEFAULT 1,
                recompensa_concedida VARCHAR(255) NULL,
                cupom_gerado_codigo VARCHAR(50) NULL,
                notificado_whatsapp TINYINT(1) DEFAULT 0,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_fidelidade_hist_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                CONSTRAINT fk_fidelidade_hist_regra FOREIGN KEY (regra_id) REFERENCES fidelidade_regras(id) ON DELETE SET NULL,
                INDEX idx_fidelidade_hist (empresa_id, cliente_telefone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela fidelidade_historico criada com sucesso.');

        await conn.commit();
        console.log('\n=== Migration 036 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 036:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
