require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../db');

async function migrate() {
    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        console.log('=== Migration 035: Wi-Fi Commerce & Cardápio Digital ===\n');

        // 1. Criar tabela cardapio_categorias
        console.log('1. Criando tabela cardapio_categorias...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS cardapio_categorias (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                nome VARCHAR(100) NOT NULL,
                icone VARCHAR(50) DEFAULT 'Utensils',
                ordem INT DEFAULT 0,
                ativo TINYINT(1) DEFAULT 1,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_cardapio_cat_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                INDEX idx_cardapio_cat (empresa_id, ativo, ordem)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela cardapio_categorias criada com sucesso.');

        // 2. Criar tabela cardapio_produtos
        console.log('\n2. Criando tabela cardapio_produtos...');
        await conn.execute(`
            CREATE TABLE IF NOT EXISTS cardapio_produtos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                empresa_id INT NOT NULL,
                categoria_id INT NULL,
                nome VARCHAR(150) NOT NULL,
                descricao TEXT NULL,
                preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                preco_promocional DECIMAL(10,2) NULL,
                imagem_url VARCHAR(500) NULL,
                destaque TINYINT(1) DEFAULT 0,
                disponivel TINYINT(1) DEFAULT 1,
                ordem INT DEFAULT 0,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_cardapio_prod_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
                CONSTRAINT fk_cardapio_prod_cat FOREIGN KEY (categoria_id) REFERENCES cardapio_categorias(id) ON DELETE SET NULL,
                INDEX idx_cardapio_prod (empresa_id, disponivel, destaque, ordem)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        console.log('   -> Tabela cardapio_produtos criada com sucesso.');

        await conn.commit();
        console.log('\n=== Migration 035 concluída com sucesso! ===');
    } catch (err) {
        await conn.rollback();
        console.error('Erro na migration 035:', err);
        throw err;
    } finally {
        conn.release();
        process.exit(0);
    }
}

migrate();
