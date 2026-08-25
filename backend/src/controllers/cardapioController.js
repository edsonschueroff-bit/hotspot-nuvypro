const db = require("../../db");

// ==================== CATEGORIAS ====================

exports.listarCategorias = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [cats] = await db.query(
      `SELECT c.*, (SELECT COUNT(*) FROM cardapio_produtos WHERE categoria_id = c.id) AS total_produtos
       FROM cardapio_categorias c
       WHERE c.empresa_id = ?
       ORDER BY c.ordem ASC, c.id ASC`,
      [empresaId]
    );
    res.json(cats);
  } catch (err) {
    console.error("Erro ao listar categorias do cardápio:", err);
    res.status(500).json({ message: "Erro ao listar categorias" });
  }
};

exports.criarCategoria = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { nome, icone, ordem, ativo } = req.body;
    if (!nome) return res.status(400).json({ message: "Nome da categoria é obrigatório" });

    const [result] = await db.execute(
      `INSERT INTO cardapio_categorias (empresa_id, nome, icone, ordem, ativo)
       VALUES (?, ?, ?, ?, ?)`,
      [empresaId, nome, icone || "Utensils", parseInt(ordem, 10) || 0, ativo !== false ? 1 : 0]
    );

    res.status(201).json({ id: result.insertId, message: "Categoria criada com sucesso!" });
  } catch (err) {
    console.error("Erro ao criar categoria:", err);
    res.status(500).json({ message: "Erro ao criar categoria" });
  }
};

exports.atualizarCategoria = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    const { nome, icone, ordem, ativo } = req.body;

    await db.execute(
      `UPDATE cardapio_categorias 
       SET nome = ?, icone = ?, ordem = ?, ativo = ?
       WHERE id = ? AND empresa_id = ?`,
      [nome, icone || "Utensils", parseInt(ordem, 10) || 0, ativo ? 1 : 0, id, empresaId]
    );

    res.json({ message: "Categoria atualizada com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar categoria:", err);
    res.status(500).json({ message: "Erro ao atualizar categoria" });
  }
};

exports.deletarCategoria = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    await db.execute("DELETE FROM cardapio_categorias WHERE id = ? AND empresa_id = ?", [id, empresaId]);
    res.json({ message: "Categoria removida com sucesso!" });
  } catch (err) {
    console.error("Erro ao deletar categoria:", err);
    res.status(500).json({ message: "Erro ao deletar categoria" });
  }
};

// ==================== PRODUTOS ====================

exports.listarProdutos = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const [prods] = await db.query(
      `SELECT p.*, c.nome AS categoria_nome, c.icone AS categoria_icone
       FROM cardapio_produtos p
       LEFT JOIN cardapio_categorias c ON c.id = p.categoria_id
       WHERE p.empresa_id = ?
       ORDER BY p.destaque DESC, p.ordem ASC, p.id DESC`,
      [empresaId]
    );
    res.json(prods);
  } catch (err) {
    console.error("Erro ao listar produtos do cardápio:", err);
    res.status(500).json({ message: "Erro ao listar produtos" });
  }
};

exports.criarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const {
      categoria_id, nome, descricao, preco, preco_promocional,
      imagem_url, destaque, disponivel, ordem
    } = req.body;

    if (!nome || preco === undefined) {
      return res.status(400).json({ message: "Nome e preço do produto são obrigatórios" });
    }

    const [result] = await db.execute(
      `INSERT INTO cardapio_produtos 
       (empresa_id, categoria_id, nome, descricao, preco, preco_promocional, imagem_url, destaque, disponivel, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        empresaId,
        categoria_id || null,
        nome,
        descricao || null,
        parseFloat(preco) || 0.00,
        preco_promocional ? parseFloat(preco_promocional) : null,
        imagem_url || null,
        destaque ? 1 : 0,
        disponivel !== false ? 1 : 0,
        parseInt(ordem, 10) || 0
      ]
    );

    res.status(201).json({ id: result.insertId, message: "Produto cadastrado com sucesso!" });
  } catch (err) {
    console.error("Erro ao criar produto:", err);
    res.status(500).json({ message: "Erro ao criar produto" });
  }
};

exports.atualizarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    const {
      categoria_id, nome, descricao, preco, preco_promocional,
      imagem_url, destaque, disponivel, ordem
    } = req.body;

    await db.execute(
      `UPDATE cardapio_produtos
       SET categoria_id = ?, nome = ?, descricao = ?, preco = ?, preco_promocional = ?,
           imagem_url = ?, destaque = ?, disponivel = ?, ordem = ?
       WHERE id = ? AND empresa_id = ?`,
      [
        categoria_id || null,
        nome,
        descricao || null,
        parseFloat(preco) || 0.00,
        preco_promocional ? parseFloat(preco_promocional) : null,
        imagem_url || null,
        destaque ? 1 : 0,
        disponivel ? 1 : 0,
        parseInt(ordem, 10) || 0,
        id,
        empresaId
      ]
    );

    res.json({ message: "Produto atualizado com sucesso!" });
  } catch (err) {
    console.error("Erro ao atualizar produto:", err);
    res.status(500).json({ message: "Erro ao atualizar produto" });
  }
};

exports.deletarProduto = async (req, res) => {
  try {
    const empresaId = req.empresa_id;
    const { id } = req.params;
    await db.execute("DELETE FROM cardapio_produtos WHERE id = ? AND empresa_id = ?", [id, empresaId]);
    res.json({ message: "Produto removido com sucesso!" });
  } catch (err) {
    console.error("Erro ao deletar produto:", err);
    res.status(500).json({ message: "Erro ao deletar produto" });
  }
};

// ==================== ENDPOINT PÚBLICO / PÓS-LOGIN ====================

exports.obterCardapioPublico = async (req, res) => {
  try {
    const { empresaSlug } = req.params;
    const [[empresa]] = await db.execute(
      "SELECT id, nome, slug, logo_url, telefone FROM empresas WHERE slug = ?",
      [empresaSlug]
    );

    if (!empresa) return res.status(404).json({ message: "Empresa não encontrada" });

    const [categorias] = await db.query(
      "SELECT id, nome, icone, ordem FROM cardapio_categorias WHERE empresa_id = ? AND ativo = 1 ORDER BY ordem ASC, id ASC",
      [empresa.id]
    );

    const [produtos] = await db.query(
      `SELECT id, categoria_id, nome, descricao, preco, preco_promocional, imagem_url, destaque, ordem
       FROM cardapio_produtos
       WHERE empresa_id = ? AND disponivel = 1
       ORDER BY destaque DESC, ordem ASC, id DESC`,
      [empresa.id]
    );

    res.json({
      empresa: {
        nome: empresa.nome,
        slug: empresa.slug,
        logo_url: empresa.logo_url,
        whatsapp: empresa.telefone
      },
      categorias,
      produtos
    });
  } catch (err) {
    console.error("Erro ao obter cardápio público:", err);
    res.status(500).json({ message: "Erro ao carregar cardápio" });
  }
};
