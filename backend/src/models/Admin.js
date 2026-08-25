const db = require('../../db');

const findByEmail = async (email) => {
  if (!email) return null;
  const [rows] = await db.execute(
    `SELECT a.*, e.slug AS empresa_slug, e.nome AS empresa_nome
     FROM admins a
     LEFT JOIN empresas e ON a.empresa_id = e.id
     WHERE LOWER(TRIM(a.email)) = LOWER(TRIM(?))`,
    [email]
  );
  return rows[0];
};

const findAll = async (empresa_id) => {
  if (!empresa_id) {
    const [rows] = await db.execute('SELECT id, email, nome, role, empresa_id, created_at FROM admins ORDER BY id DESC');
    return rows;
  }
  const [rows] = await db.execute(
    'SELECT id, email, nome, role, empresa_id, created_at FROM admins WHERE empresa_id = ? ORDER BY id DESC',
    [empresa_id]
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await db.execute('SELECT id, email, nome, role, empresa_id FROM admins WHERE id = ?', [id]);
  return rows[0];
};

const create = async (email, passwordHash, empresa_id, role = 'operator', nome = null) => {
  const [result] = await db.execute(
    'INSERT INTO admins (empresa_id, email, password, nome, role) VALUES (?, ?, ?, ?, ?)',
    [empresa_id, email, passwordHash, nome, role]
  );
  if (result.insertId && empresa_id) {
    await db.execute(
      'INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
      [result.insertId, empresa_id, role]
    ).catch(() => { });
  }
  return result;
};

const update = async (id, email, nome = null) => {
  await db.execute('UPDATE admins SET email = ?, nome = ? WHERE id = ?', [email, nome, id]);
};

const updatePassword = async (id, passwordHash) => {
  await db.execute("UPDATE admins SET password = ? WHERE id = ?", [passwordHash, id]);
};

const remove = async (id) => {
  await db.execute('DELETE FROM admin_empresas WHERE admin_id = ?', [id]).catch(() => { });
  await db.execute('DELETE FROM admins WHERE id = ?', [id]);
};

const getEmpresas = async (adminId, role) => {
  if (role === 'super_admin') {
    const [rows] = await db.execute(
      `SELECT e.id, e.nome, e.slug, e.cnpj, e.email, e.logo_url, 'owner' AS role,
       p.mod_vpn, p.mod_hotspot, p.permite_automacao_whatsapp, p.permite_portal_vendas, p.limite_mikrotiks, p.limite_portais
       FROM empresas e
       LEFT JOIN saas_planos p ON p.id = e.saas_plano_id
       WHERE e.ativo = 1
       ORDER BY e.nome`
    );
    return rows;
  }

  let [rows] = await db.execute(
    `SELECT e.id, e.nome, e.slug, e.cnpj, e.email, e.logo_url, ae.role,
     p.mod_vpn, p.mod_hotspot, p.permite_automacao_whatsapp, p.permite_portal_vendas, p.limite_mikrotiks, p.limite_portais
     FROM admin_empresas ae
     JOIN empresas e ON ae.empresa_id = e.id
     LEFT JOIN saas_planos p ON p.id = e.saas_plano_id
     WHERE ae.admin_id = ? AND e.ativo = 1
     ORDER BY e.nome`,
    [adminId]
  );

  // Fallback de segurança: se não encontrou vínculo em admin_empresas, busca direto pela empresa_id da tabela admins
  if (rows.length === 0) {
    const [[admin]] = await db.execute('SELECT empresa_id, role FROM admins WHERE id = ?', [adminId]);
    if (admin && admin.empresa_id) {
      const [empRows] = await db.execute(
        `SELECT e.id, e.nome, e.slug, e.cnpj, e.email, e.logo_url, ? AS role,
         p.mod_vpn, p.mod_hotspot, p.permite_automacao_whatsapp, p.permite_portal_vendas, p.limite_mikrotiks, p.limite_portais
         FROM empresas e
         LEFT JOIN saas_planos p ON p.id = e.saas_plano_id
         WHERE e.id = ? AND e.ativo = 1`,
        [admin.role || 'operator', admin.empresa_id]
      );
      if (empRows.length > 0) {
        // Auto-repara inserindo o vínculo faltante
        await db.execute(
          'INSERT INTO admin_empresas (admin_id, empresa_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)',
          [adminId, admin.empresa_id, admin.role || 'operator']
        ).catch(() => { });
        return empRows;
      }
    }
  }

  return rows;
};

module.exports = {
  findByEmail,
  findAll,
  findById,
  create,
  update,
  remove,
  updatePassword,
  getEmpresas,
};
