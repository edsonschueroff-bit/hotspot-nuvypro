# Hotspot - Sistema Multi-Tenant de Captive Portal WiFi

## Visao Geral

Sistema completo de gerenciamento de Hotspot WiFi com captive portal, autenticacao RADIUS, integracao MikroTik, pagamentos (Mercado Pago / EFI PIX), conformidade LGPD e Marco Civil da Internet. Arquitetura multi-tenant com isolamento por empresa.

**Servidor de producao:** glpi.forumtelecom.com.br
**Diretorio:** /var/www/hotspot

---

## Stack Tecnologica

### Backend (porta 3001)
- **Runtime:** Node.js
- **Framework:** Express 5.1.0
- **Banco de dados:** MySQL 8.0.42 (mysql2)
- **ORM:** Sequelize 6.37.7 (parcial, maioria SQL puro via mysql2)
- **Autenticacao:** JWT (jsonwebtoken 9.0.2)
- **Criptografia:** bcryptjs / bcrypt
- **MikroTik API:** node-routeros 1.6.8
- **Upload:** multer 2.0.2
- **HTTP Client:** axios
- **WhatsApp:** @wppconnect-team/wppconnect

### Frontend
- **Framework:** React 19.1.0
- **Build:** Vite 7.0.4
- **CSS:** Tailwind CSS 3.4.1
- **Roteamento:** React Router 7.7.0
- **Formularios:** React Hook Form 7.64.0 + Zod 4.1.12
- **Icones:** Lucide React, Radix UI Icons
- **HTTP:** Axios

### Infraestrutura
- **VPN:** WireGuard (wg-easy via Docker)
- **RADIUS:** FreeRADIUS (tabelas no mesmo MySQL)
- **Certificados:** /var/www/hotspot/backend/certificados/ (EFI PIX)

---

## Estrutura de Diretorios

```
/var/www/hotspot/
├── backend/
│   ├── server.js                    # Entry point Express
│   ├── db.js                        # Pool de conexao MySQL
│   ├── .env                         # Variaveis de ambiente
│   ├── package.json
│   ├── certificados/                # Certificados EFI PIX
│   ├── tokens/                      # Armazenamento de tokens
│   ├── migrations/                  # Migracoes incrementais (001-005)
│   ├── jobs/
│   │   └── estrutura.sql            # Schema completo do banco (dump)
│   ├── src/
│   │   ├── controllers/             # Logica de negocio (23+ controllers)
│   │   ├── routes/                  # Rotas da API (25+ arquivos)
│   │   ├── models/                  # Modelos Sequelize
│   │   ├── middleware/
│   │   │   ├── auth.js              # Verificacao JWT
│   │   │   ├── tenant.js            # Resolucao empresa_id
│   │   │   └── authorize.js         # Verificacao de roles
│   │   ├── jobs/                    # Background jobs
│   │   │   ├── syncConnectionLogs.js # Sync radacct -> connection_logs
│   │   │   └── verificaExpiracoes.js # Verificar planos expirados
│   │   └── utils/
│   │       ├── mikrotikClient.js    # Cliente RouterOS API
│   │       └── hotspotSetup.js      # Configuracao hotspot
│   └── routes/                      # Rotas legadas admin
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Rotas da aplicacao
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx       # Contexto de autenticacao
│   │   ├── pages/
│   │   │   ├── admin/               # Paginas do painel admin
│   │   │   ├── public/              # Paginas do captive portal
│   │   │   └── super/               # Paginas super admin
│   │   └── components/              # Componentes reutilizaveis
│   ├── dist/                        # Build de producao
│   └── vite.config.js
├── infra/
│   └── wireguard/
│       └── docker-compose.yml       # WireGuard wg-easy container
└── docs/
    └── PLAN.md                      # Plano de integracao WireGuard
```

---

## Variaveis de Ambiente

Arquivo: `/var/www/hotspot/backend/.env`

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| PORT | Porta do backend | 3001 |
| DB_HOST | Host do MySQL | 127.0.0.1 |
| DB_USER | Usuario MySQL | hotspotuser |
| DB_PASSWORD | Senha MySQL | senhaforte123 |
| DB_NAME | Nome do banco | hotspot |
| DB_PORT | Porta MySQL (opcional) | 3306 |
| JWT_SECRET | Segredo para tokens JWT | segredo_super_secreto |
| WHATSAPP_API_URL | URL da API WhatsApp | https://glpi.forumtelecom.com.br |

**Nota:** Configuracoes de pagamento (Mercado Pago, EFI) ficam no banco de dados na tabela `empresa_configs`, nao em .env.

---

## Banco de Dados

### Tabelas Principais

#### Multi-Tenant
| Tabela | Descricao |
|--------|-----------|
| `empresas` | Empresas/clientes (id, nome, slug, cnpj, email, telefone, logo_url, ativo) |
| `empresa_configs` | Config por empresa - JSON (mercadopago, efi, whatsapp) |
| `admins` | Usuarios admin (empresa_id, email, password, nome, role) |

#### Rede / Hotspot
| Tabela | Descricao |
|--------|-----------|
| `mikrotiks` | Roteadores MikroTik (empresa_id, nome, ip, usuario, senha, porta, vpn_ip, status) |
| `nas` | Clientes RADIUS NAS (empresa_id, nasname, shortname, secret) |
| `portais` | Portais captive (empresa_id, mikrotik_id, tipo, html_content, template_id, custom_css, logo_url, cores, campos_cadastro, mostrar_planos, mostrar_lgpd, url_redirect) |
| `portal_templates` | Templates reutilizaveis (nome, html_template, css_template, tipo: basico/planos/lgpd/completo) |
| `empresa_vpn_peers` | Peers WireGuard VPN (empresa_id, wg_client_id, nome) |

#### RADIUS (FreeRADIUS)
| Tabela | Descricao |
|--------|-----------|
| `radcheck` | Credenciais usuario (username, Cleartext-Password) |
| `radreply` | Respostas RADIUS (Mikrotik-Rate-Limit, Session-Timeout) |
| `radusergroup` | Mapeamento usuario-grupo |
| `radacct` | Accounting - sessoes, uso de dados, tempos |
| `radpostauth` | Log de autenticacao |
| `radgroupcheck` | Verificacao de grupo |
| `radgroupreply` | Resposta de grupo |
| `radius_users` | Registro de usuarios RADIUS (empresa_id, username, plano_id, nas_id) |

#### Usuarios e Pagamentos
| Tabela | Descricao |
|--------|-----------|
| `planos` | Planos de internet (empresa_id, nome, valor, duracao_minutos, velocidade_down/up, mikrotik_id, address_pool, shared_users) |
| `pagamentos` | Transacoes (empresa_id, plano_id, valor, status, mp_pagamento_id, mac, cpf, IP) |
| `lgpd_logins` | Registros LGPD (empresa_id, cpf, nome, telefone, aceite, mac, ip) |
| `leads` | Leads marketing (empresa_id, nome, email, telefone, cpf, mac, ip, origem, status, lgpd_aceite) |
| `connection_logs` | Logs Marco Civil (sync de radacct para compliance) |

#### Legadas (migradas para empresa_configs)
| Tabela | Descricao |
|--------|-----------|
| `config_mercadopago` | Config MP legada (public_key, access_token, client_id, client_secret) |
| `efi_config` | Config EFI legada (client_id, client_secret, chave_pix, ambiente, certificado) |

### Migracoes

Executar em ordem:
```bash
cd /var/www/hotspot/backend
node migrations/001_multi_tenant.js    # Cria empresas, empresa_configs, adiciona empresa_id em todas tabelas
node migrations/002_leads.js           # Cria tabela leads
node migrations/003_connection_logs.js # Cria tabela connection_logs
node migrations/004_portal_templates.js # Cria portal_templates, adiciona colunas em portais
node migrations/005_vpn_peers.js       # Cria empresa_vpn_peers
```

---

## Autenticacao e Autorizacao

### JWT
- Token gerado no login com `empresa_id`, `role`, `email`, `empresa_slug`
- Expiracao: 24 horas
- Armazenado no frontend em `localStorage` como `admin_token`
- Enviado no header: `Authorization: Bearer <token>`

### Roles (RBAC)
| Role | Permissoes |
|------|-----------|
| `super_admin` | Acesso total, gerencia todas empresas, pode usar header `x-empresa-id` |
| `owner` | Acesso completo da empresa |
| `manager` | Gerenciamento limitado |
| `operator` | Operacoes basicas |

### Middleware Chain
```
request -> auth.js (verifica JWT) -> tenant.js (resolve empresa_id) -> authorize(roles) -> controller
```

O middleware `tenant.js` extrai `empresa_id` do JWT. Super admin pode sobrescrever via header `x-empresa-id`.

---

## API - Endpoints

### Publicos (sem autenticacao)

```
POST   /api/auth/login                        # Login admin (email + password -> JWT)
POST   /api/admin/login                        # Login alternativo
GET    /api/hotspot-login/:mikrotikId          # Pagina login MikroTik (HTML com variaveis $(mac), $(ip))
GET    /hotspot/redirect/:mikrotikId           # Redirect captive portal
POST   /api/pagamentos/gerar                   # Gerar pagamento Mercado Pago (QR PIX)
POST   /api/pagamentos/notificacao             # Webhook Mercado Pago
GET    /api/pagamentos/status                  # Consultar status pagamento
POST   /api/lgpd/login                         # Login com consentimento LGPD
POST   /api/lgpd/cadastro                      # Cadastro LGPD
POST   /api/auth/temp-access                   # Acesso temporario
GET    /api/planos-publicos                    # Listar planos (publico)
POST   /api/registro                           # Registro nova empresa
```

### Protegidos (requerem JWT)

```
# Planos
GET/POST/PUT/DELETE   /api/planos              # CRUD planos de internet

# MikroTik
GET/POST/PUT/DELETE   /api/mikrotiks           # CRUD roteadores MikroTik

# Portais
GET/POST/PUT/DELETE   /api/portais             # CRUD portais captive
GET/POST              /api/portal-templates     # Templates de portal

# RADIUS
POST                  /api/radius/criar-usuario       # Criar usuario RADIUS
POST                  /api/radius/vincular-plano      # Vincular plano ao usuario
GET                   /api/radius/sessoes             # Sessoes ativas
GET                   /api/radius/usuarios            # Listar usuarios RADIUS
DELETE                /api/radius/usuarios/:username   # Remover usuario

# Pagamentos
GET                   /api/pagamentos                 # Listar pagamentos

# Leads
GET/POST/PUT/DELETE   /api/leads               # CRUD leads
GET                   /api/leads/export         # Exportar CSV

# Dashboard
GET                   /api/dashboard            # Estatisticas admin

# Configuracoes
GET/POST              /api/efi                  # Config EFI PIX
GET/POST              /api/config-mercadopago   # Config Mercado Pago (legada)
GET/POST              /api/empresa-configs      # Config unificada por empresa

# WireGuard VPN
GET                   /api/wireguard/status     # Status VPN
POST                  /api/wireguard/clients    # Criar peer
DELETE                /api/wireguard/clients/:id # Remover peer
GET                   /api/wireguard/clients/:id/config # Download config

# WhatsApp
POST                  /api/whatsapp             # Integracao WhatsApp

# Compliance
GET                   /api/compliance           # Logs Marco Civil
GET                   /api/compliance/export    # Exportar CSV

# Admin Users
GET/POST/PUT/DELETE   /api/admins              # Gerenciar admins

# Limpeza
GET/POST              /api/limpeza             # Jobs de limpeza de dados

# Super Admin
GET/POST/PUT/DELETE   /api/empresas            # CRUD empresas (super_admin only)
```

---

## Frontend - Paginas e Rotas

### Publicas
| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/` | Login | Login admin |
| `/planos-cliente` | PlanosCliente | Selecao de planos (Mercado Pago) |
| `/pagamento/:id` | Pagamento | Pagamento Mercado Pago |
| `/lgpd` | LgpdAuto | Consentimento LGPD automatico |
| `/cadastro` | CadastroLGPD | Formulario cadastro LGPD |
| `/planos-cliente-pix` | PlanosClientePix | Selecao planos (EFI PIX) |
| `/pagamentopix/:id` | PagamentoPix | Pagamento EFI PIX |
| `/registro` | Registro | Registro nova empresa |

### Admin (protegidas, prefixo `/admin/:empresaSlug`)
| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/admin/:slug` | Dashboard | Painel com estatisticas |
| `/admin/:slug/mikrotiks` | Mikrotiks | Gerenciar roteadores |
| `/admin/:slug/vpn` | Wireguard | Gerenciar peers VPN |
| `/admin/:slug/portais` | Portais | Gerenciar portais captive |
| `/admin/:slug/portais/:id/editor` | PortalEditor | Editor visual de portal |
| `/admin/:slug/planos` | Planos | Gerenciar planos |
| `/admin/:slug/configuracoes` | Configuracoes | Config pagamento |
| `/admin/:slug/pagamentos` | Pagamentos | Ver transacoes |
| `/admin/:slug/radius` | UsuariosRadius | Usuarios RADIUS |
| `/admin/:slug/sessoes` | Sessoes | Sessoes ativas |
| `/admin/:slug/sessoeslog` | SessoesLog | Log de sessoes |
| `/admin/:slug/lgpd` | LgpdCadastros | Cadastros LGPD |
| `/admin/:slug/leads` | Leads | Gerenciar leads |
| `/admin/:slug/compliance` | Compliance | Logs Marco Civil |
| `/admin/:slug/usuarios` | Usuarios | Gerenciar admins |

### Super Admin
| Rota | Componente | Descricao |
|------|-----------|-----------|
| `/super` | SuperDashboard | Visao geral do sistema |
| `/super/empresas` | Empresas | Gerenciar empresas |

### Protecao de Rotas
O componente `RotaPrivada` verifica autenticacao via `AuthContext`. Se nao autenticado, redireciona para `/`. O componente `AdminRedirect` redireciona `/admin` para `/admin/:empresa_slug`.

---

## Fluxos de Negocio

### Fluxo do Hotspot (usuario conectando ao WiFi)
```
1. Usuario conecta ao WiFi MikroTik
2. MikroTik redireciona para /api/hotspot-login/:mikrotikId
3. Backend serve HTML com variaveis $(mac), $(ip), $(username) substituidas
4. HTML redireciona para /hotspot/redirect/:mikrotikId
5. Portal exibido conforme configuracao (LGPD / Planos / Leads / Custom)
6. Usuario interage (consentimento LGPD, seleciona plano, preenche lead)
7. Se plano pago: pagamento processado via Mercado Pago ou EFI PIX
8. Conta RADIUS criada/ativada
9. Usuario autenticado via RADIUS no MikroTik
10. Sessao logada em radacct, sync para connection_logs
```

### Fluxo de Pagamento (Mercado Pago)
```
1. POST /api/pagamentos/gerar (plano_id, mac, cpf, ip)
2. API Mercado Pago chamada, QR Code PIX gerado
3. Pagamento salvo com status "aguardando"
4. Retorna QR Code + copia-e-cola para o frontend
5. Webhook recebido: POST /api/pagamentos/notificacao
6. Status atualizado para "aprovado"
7. Usuario autorizado no RADIUS automaticamente
```

### Fluxo de Pagamento (EFI PIX)
```
1. Similar ao Mercado Pago, mas usa certificado .pem
2. Certificados armazenados em /backend/certificados/
3. Config em empresa_configs (tipo 'efi')
```

### Multi-Tenant Isolation
```
- Toda query filtra por empresa_id
- empresa_id extraido do JWT pelo middleware tenant.js
- Super admin pode usar header x-empresa-id para trocar contexto
- Configuracoes de pagamento isoladas por empresa (empresa_configs)
- Leads, usuarios, logs isolados por empresa
```

---

## Sistema RADIUS (Detalhado)

### Arquitetura RADIUS

O sistema usa FreeRADIUS com backend MySQL. As tabelas RADIUS padrao (radcheck, radreply, radusergroup, radacct, radpostauth) coexistem com a tabela customizada `radius_users` que faz a ponte multi-tenant.

```
FreeRADIUS Server
  ├── Authentication: radcheck (credentials + limits)
  ├── Authorization: radreply (speed, timeout)
  ├── Accounting: radacct (session data)
  └── Post-Auth: radpostauth (auth logs)

Tabela Custom:
  └── radius_users (empresa_id isolation, plano_id link)
```

### Controllers RADIUS

**radiusController.js** - `/var/www/hotspot/backend/src/controllers/radiusController.js`

| Funcao | Descricao |
|--------|-----------|
| `criarUsuarioRadius` | Cria usuario RADIUS com isolamento por empresa |
| `vincularPlano` | Vincula plano ao usuario (configura velocidade, timeout, sessoes) |
| `listarUsuarios` | Lista usuarios RADIUS da empresa (join com planos e mikrotiks) |
| `deletarUsuarioRadius` | Remove usuario de TODAS as tabelas RADIUS |
| `listarSessoesAtivas` | Lista sessoes ativas (radacct WHERE acctstoptime IS NULL) |

**radiusLogsController.js** - `/var/www/hotspot/backend/src/controllers/radiusLogsController.js`

| Funcao | Descricao |
|--------|-----------|
| `listarLogs` | Logs de accounting com paginacao e filtros (username, mac, ip, datas) |
| `exportarCSV` | Exporta logs para CSV (compliance Marco Civil) |

### Endpoints RADIUS

```
# Gerenciamento de Usuarios
POST   /api/radius/criar-usuario        # Criar usuario (username + password)
POST   /api/radius/vincular-plano       # Vincular plano ao usuario
GET    /api/radius/usuarios             # Listar usuarios da empresa
DELETE /api/radius/usuarios/:username   # Deletar usuario (limpa todas tabelas)
GET    /api/radius/sessoes              # Sessoes ativas (radacct)

# Logs e Compliance
GET    /api/radius-logs                 # Logs com filtros e paginacao
GET    /api/radius-logs/export          # Exportar CSV
```

### Atributos RADIUS Utilizados

**radcheck (Autenticacao/Limites):**
| Atributo | Op | Descricao | Exemplo |
|----------|----|-----------|---------|
| `Cleartext-Password` | `:=` | Senha do usuario | "minhasenha" |
| `Max-Daily-Session` | `:=` | Tempo max diario em segundos | "3600" (60min) |
| `Simultaneous-Use` | `:=` | Conexoes simultaneas | "10" (shared_users do plano) |

**radreply (Resposta/Autorizacao):**
| Atributo | Op | Descricao | Exemplo |
|----------|----|-----------|---------|
| `Mikrotik-Rate-Limit` | `:=` | Limite de velocidade | "1M/2M" (1M up / 2M down) |
| `Session-Timeout` | `:=` | Timeout da sessao em segundos | "3600" |

### Formato de Velocidade (Rate-Limit)

**Formato:** `{velocidade_up}M/{velocidade_down}M`

| Exemplo | Upload | Download |
|---------|--------|----------|
| `1M/2M` | 1 Mbps | 2 Mbps |
| `5M/10M` | 5 Mbps | 10 Mbps |
| `10M/50M` | 10 Mbps | 50 Mbps |
| `2M/2M` | 2 Mbps (fixo PIX temporario) | 2 Mbps |

**Fonte:** Campos `velocidade_up` e `velocidade_down` da tabela `planos`.

### 4 Formas de Criar Usuario RADIUS

#### 1. Via Admin (radiusController.criarUsuarioRadius)
```
POST /api/radius/criar-usuario { username, password }
-> INSERT radcheck (Cleartext-Password)
-> INSERT radius_users (empresa_id, username)
Depois: POST /api/radius/vincular-plano { username, plano_id }
-> INSERT radcheck (Max-Daily-Session, Simultaneous-Use)
-> INSERT radreply (Mikrotik-Rate-Limit, Session-Timeout)
-> INSERT radusergroup (username, groupname=plano.id)
-> UPDATE radius_users (plano_id, nas_id)
```

#### 2. Via Pagamento Aprovado (mikrotikAPIController.liberarUsuario)
```
Webhook pagamento aprovado -> liberarUsuario()
-> Busca CPF do lgpd_logins por MAC/IP
-> Username = CPF ou MAC (se CPF nao existe)
-> Password = username
-> INSERT radcheck (Cleartext-Password, Max-Daily-Session, Simultaneous-Use)
-> INSERT radreply (Mikrotik-Rate-Limit, Session-Timeout)
-> INSERT radusergroup (plano.id)
-> INSERT radius_users (empresa_id)
-> Envia credenciais via WhatsApp (opcional)
```

#### 3. Via Acesso Temporario PIX (authTempController.gerarAcessoTemporario)
```
POST /api/auth/temp-access
-> Username = pix_e{empresaId}_{timestamp}_{random}
-> Password = username
-> Rate: 2M/2M (fixo)
-> Duracao: 300 segundos (5 min)
-> Simultaneous-Use: 1
-> Limpa usuarios pix_ expirados nao ativos
```

#### 4. Via Login LGPD (lgpdController.lgpdLogin)
```
POST /api/lgpd/login
-> Busca CPF dos lgpd_logins por MAC
-> Username = CPF ou MAC
-> Busca plano LGPD especifico da empresa
-> Limpa sessoes do dia atual antes de criar novas
-> Cria lead LGPD automaticamente
```

### Delecao de Usuario RADIUS

Ao deletar um usuario, remove de TODAS as tabelas:
```sql
DELETE FROM radcheck WHERE username = ?
DELETE FROM radreply WHERE username = ?
DELETE FROM radusergroup WHERE username = ?
DELETE FROM radpostauth WHERE username = ?
DELETE FROM radius_users WHERE username = ? AND empresa_id = ?
```

### Sessoes Ativas

**Query:**
```sql
SELECT username, callingstationid AS mac, framedipaddress AS ip,
       nasipaddress AS gateway, acctstarttime, acctsessiontime,
       acctinputoctets AS bytes_in, acctoutputoctets AS bytes_out
FROM radacct ra
JOIN radius_users ru ON ra.username = ru.username
WHERE ra.acctstoptime IS NULL AND ru.empresa_id = ?
ORDER BY ra.acctstarttime DESC
```

### Logs de Accounting (radacct)

**Campos principais consultados:**
| Campo | Descricao |
|-------|-----------|
| `radacctid` | ID unico (AUTO_INCREMENT) |
| `username` | Nome do usuario |
| `callingstationid` | MAC address do cliente |
| `framedipaddress` | IP atribuido ao cliente |
| `nasipaddress` | IP do NAS/gateway |
| `acctstarttime` | Inicio da sessao |
| `acctstoptime` | Fim da sessao (NULL = ativa) |
| `acctsessiontime` | Duracao em segundos |
| `acctinputoctets` | Bytes recebidos |
| `acctoutputoctets` | Bytes enviados |
| `acctterminatecause` | Motivo da desconexao |

### Tabela NAS

```sql
nas (id, nasname, shortname, type, ports, secret, server, community, description, empresa_id)
```
- `nasname` = IP do NAS (corresponde a `radacct.nasipaddress`)
- Usado para exibir nome amigavel nos logs
- Fallback: usa `mikrotiks.nome` se NAS nao encontrado

### CoA (Change of Authorization) e Disconnect

**Configuracao no MikroTik (via hotspotSetup.js):**
```
/radius/incoming/set accept=yes port=3799
```
- Porta 3799 padrao para CoA
- Permite RADIUS enviar pacotes de desconexao ao MikroTik

**Remocao manual de usuario (removerUsuarioPorMac):**
```
1. /ip/hotspot/user/remove    - Remove cadastro do usuario
2. /ip/hotspot/active/remove  - Desconecta sessao ativa
3. /ip/hotspot/host/remove    - Remove do cache de hosts
4. Se limparRadius=true: limpa radcheck, radreply, radusergroup, radius_users
```

### Job: syncConnectionLogs

**Arquivo:** `/var/www/hotspot/backend/src/jobs/syncConnectionLogs.js`

**Processo:**
1. Busca `last_synced_radacctid` da tabela `connection_logs_sync`
2. Query radacct WHERE `radacctid > lastId` AND `acctstoptime IS NOT NULL`
3. Join com `radius_users` (empresa_id) e `lgpd_logins` (CPF por MAC)
4. INSERT em `connection_logs` com dados de compliance
5. Atualiza `connection_logs_sync` com max radacctid processado
6. Processa em lotes de 5000 registros

### Job: verificaExpiracoes

**Arquivo:** `/var/www/hotspot/backend/jobs/verificaExpiracoes.js`

**Processo:**
1. Busca pagamentos onde `expira_em <= NOW()` AND `status = 'approved'`
2. Para cada expirado: `removerUsuarioPorMac(mac, true)` (remove do MikroTik + RADIUS)
3. Atualiza status para 'expirado'
4. Limpa usuarios temporarios `pix_*` que nao estao em sessao ativa

### Relacionamento Completo das Tabelas RADIUS

```
empresas (1) ──── (N) radius_users ──── (1) planos
                        │                      │
                        │ username              │ mikrotik_id
                        │                      │
                        ├── radcheck (N)       mikrotiks
                        │   ├── Cleartext-Password
                        │   ├── Max-Daily-Session
                        │   └── Simultaneous-Use
                        │
                        ├── radreply (N)
                        │   ├── Mikrotik-Rate-Limit
                        │   └── Session-Timeout
                        │
                        ├── radusergroup (N)
                        │   └── groupname = plano.id
                        │
                        ├── radacct (N)
                        │   └── Sessoes de accounting
                        │
                        └── radpostauth (N)
                            └── Logs de autenticacao

lgpd_logins ──(MAC)── radacct.callingstationid
                         │
                         └── connection_logs (Marco Civil compliance)

pagamentos ──(MAC)── radacct/radius cleanup (verificaExpiracoes)
```

### Acesso Temporario vs Permanente

| Tipo | Username | Senha | Velocidade | Duracao | Limpeza |
|------|----------|-------|------------|---------|---------|
| **Temporario (PIX)** | `pix_e{id}_{ts}_{rand}` | = username | 2M/2M fixo | 300s (5min) | Auto (verificaExpiracoes) |
| **Permanente (Plano)** | CPF ou MAC | = username | Conforme plano | duracao_minutos | Expiracao pagamento |
| **LGPD** | CPF ou MAC | = username | Conforme plano LGPD | duracao_minutos | Diaria (limpa sessoes do dia) |
| **Admin Manual** | Customizado | Customizada | Conforme plano vinculado | duracao_minutos | Manual |

---

## Configuracao FreeRADIUS (Servidor)

### Versao e Diretorio
- **Versao:** FreeRADIUS 3.0
- **Diretorio base:** `/etc/freeradius/3.0/`
- **Servico:** `freeradius` (ou `systemctl restart freeradius`)

### Estrutura de Arquivos FreeRADIUS

```
/etc/freeradius/3.0/
├── radiusd.conf              # Config principal do daemon
├── clients.conf              # Clientes RADIUS (localhost, NAS dinamicos via SQL)
├── dictionary                # Dicionario local (atributos customizados)
├── proxy.conf                # Config de proxy RADIUS
├── templates.conf
├── trigger.conf
├── sites-enabled/
│   ├── default -> ../sites-available/default    # Virtual server principal
│   ├── inner-tunnel -> ../sites-available/inner-tunnel
│   └── coa -> ../sites-available/coa            # CoA/Disconnect server
├── sites-available/
│   ├── default               # CUSTOMIZADO - Auth + Acct + Session + Post-Auth
│   ├── coa                   # CoA listener na porta 3799
│   ├── inner-tunnel           # Tunel interno (EAP)
│   └── ... (outros templates)
├── mods-enabled/
│   ├── sql -> ../mods-available/sql             # Modulo SQL (MySQL)
│   ├── sqlcounter             # CUSTOMIZADO - Contador diario (dailycounter)
│   ├── pap, chap, mschap     # Metodos de autenticacao
│   ├── expiration             # Verificacao de expiracao
│   ├── logintime              # Controle de horario
│   └── ... (outros modulos)
├── mods-available/
│   ├── sql                   # CUSTOMIZADO - Conexao MySQL
│   └── ... (todos modulos disponiveis)
└── mods-config/
    └── sql/main/mysql/
        ├── queries.conf       # Queries SQL para auth, acct, session
        ├── schema.sql         # Schema padrao RADIUS
        └── setup.sql          # Script de setup
```

### Virtual Server Default (sites-available/default)

**Arquivo:** `/etc/freeradius/3.0/sites-available/default`

**CUSTOMIZADO** para o sistema hotspot:

```
server default {
    listen { type = auth, ipaddr = *, port = 1812 }
    listen { type = acct, ipaddr = *, port = 1813 }

    authorize {
        preprocess
        chap
        mschap
        suffix
        sql                    # Busca credenciais no MySQL (radcheck/radreply)
        dailycounter           # Calcula tempo usado hoje (Max-Daily-Session)
        expiration             # Verifica expiracao
        logintime              # Verifica horario de login
        pap                    # Autenticacao PAP
    }

    authenticate {
        Auth-Type CHAP  { chap }
        Auth-Type MS-CHAP { mschap }
        Auth-Type PAP   { pap }
    }

    preacct {
        preprocess
        acct_unique
        suffix
        files
    }

    accounting {
        sql                    # Grava em radacct (start/interim/stop)
        exec
        attr_filter.accounting_response
    }

    session {
        sql                    # Verifica Simultaneous-Use via radacct
    }

    post-auth {
        sql                    # Grava em radpostauth
        exec
        remove_reply_message_if_eap
        Post-Auth-Type REJECT {
            attr_filter.access_reject
            sql
            update reply { Reply-Message := "Acesso negado" }
        }
    }
}
```

**Pipeline de autenticacao:**
```
Request -> preprocess -> chap -> mschap -> suffix -> sql (busca radcheck)
-> dailycounter (calcula tempo restante) -> expiration -> logintime -> pap
-> authenticate (PAP/CHAP/MS-CHAP) -> post-auth (log em radpostauth)
-> Access-Accept com radreply (Mikrotik-Rate-Limit, Session-Timeout)
```

### CoA Server (sites-available/coa)

**Arquivo:** `/etc/freeradius/3.0/sites-available/coa`

```
listen { type = coa, ipaddr = *, port = 3799, virtual_server = coa }
server coa {
    recv-coa { suffix; ok }
    send-coa { ok }
}
```

- Escuta na **porta 3799** para receber CoA e Disconnect-Request
- Habilitado via symlink em sites-enabled
- Permite desconectar usuarios remotamente

### Modulo SQL (mods-available/sql)

**Arquivo:** `/etc/freeradius/3.0/mods-available/sql`

```
sql {
    driver = "rlm_sql_mysql"
    dialect = "mysql"
    server = "localhost"
    port = 3306
    login = "hotspotuser"
    password = "senhaforte123"
    radius_db = "hotspot"

    read_clients = yes              # Le NAS da tabela 'nas' (clientes dinamicos)
    client_table = "nas"

    acct_table1 = "radacct"
    acct_table2 = "radacct"
    postauth_table = "radpostauth"
    authcheck_table = "radcheck"
    groupcheck_table = "radgroupcheck"
    authreply_table = "radreply"
    groupreply_table = "radgroupreply"
    usergroup_table = "radusergroup"

    delete_stale_sessions = yes     # Limpa sessoes orfas automaticamente

    pool {
        start = ${thread[pool].start_servers}
        min = ${thread[pool].min_spare_servers}
        max = ${thread[pool].max_servers}
        spare = ${thread[pool].max_spare_servers}
        uses = 0
        retry_delay = 30
        lifetime = 0
        idle_timeout = 60
        max_retries = 5
    }
}
```

**Pontos importantes:**
- `read_clients = yes` - NAS sao lidos da tabela `nas` no MySQL (clientes RADIUS dinamicos)
- `delete_stale_sessions = yes` - Remove sessoes orfas do radacct
- Mesmo usuario/senha do backend Node.js

### SQL Counter - Dailycounter (mods-enabled/sqlcounter)

**Arquivo:** `/etc/freeradius/3.0/mods-enabled/sqlcounter`

```
sqlcounter dailycounter {
    sql_module_instance = sql
    dialect = mysql
    counter_name = Daily-Session-Time
    check_name = Max-Daily-Session
    reply_name = Session-Timeout
    key = User-Name
    reset = daily
    cacheable = no
    query = "SELECT IFNULL(SUM(IF(acctstoptime IS NULL,
        UNIX_TIMESTAMP() - UNIX_TIMESTAMP(acctstarttime),
        acctsessiontime)), 0)
        FROM radacct
        WHERE username='%{tolower:%{%{Stripped-User-Name}:-%{User-Name}}}'
        AND DATE(acctstarttime) = CURDATE()"
}
```

**Como funciona:**
1. Soma todo o tempo usado HOJE pelo usuario (sessoes ativas + finalizadas)
2. Compara com `Max-Daily-Session` (definido em radcheck)
3. Se excedeu: **rejeita autenticacao**
4. Se nao excedeu: define `Session-Timeout` = tempo restante
5. Reset diario (meia-noite) - usuario volta a ter quota completa

**Exemplo:** Se `Max-Daily-Session = 3600` (1h) e usuario ja usou 2400s hoje:
- `Session-Timeout` sera ajustado para 1200s (20min restantes)
- Proximo login apos esgotar: **rejeitado** ate meia-noite

### Dicionario Local (dictionary)

**Arquivo:** `/etc/freeradius/3.0/dictionary`

```
ATTRIBUTE   Max-Daily-Session     3001    integer
```

- Atributo customizado `Max-Daily-Session` (ID 3001, tipo integer)
- Usado pelo `dailycounter` para controle de tempo diario
- Armazenado em `radcheck` para cada usuario

### Clients.conf

**Arquivo:** `/etc/freeradius/3.0/clients.conf`

```
client localhost {
    ipaddr = 127.0.0.1
    proto = *
    secret = testing123
    nas_type = other
}
client localhost_ipv6 {
    ipv6addr = ::1
    secret = testing123
}
```

**Nota:** Alem dos clientes estaticos (localhost), o FreeRADIUS le clientes dinamicamente da tabela `nas` no MySQL via `read_clients = yes`. Os MikroTiks sao cadastrados la pelo backend.

### Queries SQL do FreeRADIUS (queries.conf)

**Arquivo:** `/etc/freeradius/3.0/mods-config/sql/main/mysql/queries.conf`

**Autorizacao:**
- `authorize_check_query` - SELECT de radcheck por username
- `authorize_reply_query` - SELECT de radreply por username
- `group_membership_query` - SELECT de radusergroup por username
- `authorize_group_check_query` - SELECT de radgroupcheck por groupname
- `authorize_group_reply_query` - SELECT de radgroupreply por groupname

**Simultaneous-Use:**
- `simul_count_query` - COUNT de sessoes ativas em radacct (WHERE acctstoptime IS NULL)
- `simul_verify_query` - Detalhes das sessoes para verificacao

**Accounting:**
- `start` - INSERT em radacct no inicio da sessao
- `interim-update` - UPDATE radacct com dados parciais (bytes, tempo)
- `stop` - UPDATE radacct com acctstoptime e dados finais
- `accounting-on/off` - Bulk update quando NAS reinicia

**Post-Auth:**
- INSERT em radpostauth (username, password, reply, timestamp)

### Fluxo Completo RADIUS (MikroTik -> FreeRADIUS -> MySQL)

```
1. Cliente conecta ao WiFi MikroTik
2. MikroTik envia Access-Request (porta 1812) com:
   - User-Name, User-Password, Calling-Station-Id (MAC), NAS-IP-Address
3. FreeRADIUS processa em authorize:
   a. sql: SELECT radcheck WHERE username (Cleartext-Password, Max-Daily-Session, Simultaneous-Use)
   b. dailycounter: Calcula tempo usado hoje, ajusta Session-Timeout
   c. pap: Compara senha
4. Se autenticado -> Access-Accept com:
   - radreply: Mikrotik-Rate-Limit, Session-Timeout
   - Gravado em radpostauth
5. MikroTik aplica rate limit e inicia sessao
6. MikroTik envia Accounting-Start (porta 1813)
   -> INSERT em radacct
7. MikroTik envia Interim-Update periodicamente
   -> UPDATE radacct (bytes, tempo)
8. Sessao encerra (timeout, logout, admin disconnect)
   -> MikroTik envia Accounting-Stop
   -> UPDATE radacct (acctstoptime, acctterminatecause)
9. syncConnectionLogs: copia radacct -> connection_logs (compliance)
```

### Comandos Uteis FreeRADIUS

```bash
# Testar configuracao
freeradius -XC

# Rodar em modo debug (foreground)
freeradius -X

# Reiniciar servico
systemctl restart freeradius

# Ver status
systemctl status freeradius

# Testar autenticacao local
radtest usuario senha 127.0.0.1 0 testing123

# Ver logs
tail -f /var/log/freeradius/radius.log
```

---

## Integracao MikroTik

### Conexao
- Biblioteca: `node-routeros` (RouterOS API protocol)
- Porta padrao: 8728 (API sem SSL)
- Credenciais armazenadas na tabela `mikrotiks`
- Conexao via IP VPN (WireGuard) quando MikroTik atras de NAT

### Funcionalidades
- Teste de conexao ao salvar MikroTik
- Configuracao automatica do Walled Garden (liberar dominio do servidor)
- Servir pagina de login personalizada (HTML com variaveis MikroTik)
- Gerenciamento de perfis hotspot
- Monitoramento de status e usuarios ativos

### Variaveis MikroTik no HTML
- `$(mac)` - MAC address do cliente
- `$(ip)` - IP do cliente
- `$(username)` - Username
- `$(mikrotik_id)` - ID do MikroTik no sistema

### Campo `mikrotiks.end_hotspot` (IMPORTANTE)

`end_hotspot` e o destino do redirect HTTP que o frontend faz apos pagamento aprovado (`POST {end_hotspot}/login` com user/senha pra autenticar o cliente no captive portal).

**REGRA:** ao auto-configurar o hotspot via wizard (`POST /api/mikrotiks/:id/enviar-hotspot`), o `end_hotspot` deve receber o **DNS Name** configurado no Hotspot Server Profile (`config.dnsName`), nao o IP cru. Salvar o IP cru funciona em HTTP mas quebra em HTTPS porque o navegador rejeita certificado de IP. Salvando o DNS Name (que bate com o certificado SSL configurado no MikroTik) o redirect HTTPS funciona.

Fallback: se `dnsName` estiver vazio, salva o IP do `localAddress` (compat).

Ver `backend/src/routes/mikrotikRoutes.js:267-285`.

---

## WireGuard VPN

### Proposito
Permitir conexao do servidor aos MikroTiks que estao atras de NAT (IP privado). O MikroTik conecta como client VPN e recebe um IP tunelado (ex: 10.8.0.x).

### Infraestrutura
- Container Docker: `ghcr.io/wg-easy/wg-easy`
- Porta VPN: 51820/UDP
- Porta Web Management: 51821
- Config: `/var/www/hotspot/infra/wireguard/docker-compose.yml`

### Endpoints API
```
GET    /api/wireguard/status              # Status do WireGuard
POST   /api/wireguard/clients             # Criar novo peer
DELETE /api/wireguard/clients/:id          # Remover peer
GET    /api/wireguard/clients/:id/config   # Download config do peer
```

---

## Conformidade Legal

### LGPD (Lei 13.709/2018)
- Consentimento registrado na tabela `lgpd_logins`
- Campos: cpf, nome, telefone, aceite, mac, ip, timestamp
- Formulario de cadastro com termos de uso
- Leads criados automaticamente a partir de cadastros LGPD

### Marco Civil da Internet (Lei 12.965/2014)
- Logs de conexao mantidos na tabela `connection_logs`
- Sync automatico de `radacct` via job `syncConnectionLogs.js`
- Dados: usuario, MAC, IP, inicio/fim sessao, bytes transferidos, motivo desconexao
- Exportacao CSV via `/api/compliance/export`

---

## Jobs / Tarefas de Background

| Job | Arquivo | Descricao |
|-----|---------|-----------|
| Sync Logs | `src/jobs/syncConnectionLogs.js` | Sincroniza radacct -> connection_logs (Marco Civil) |
| Expiracoes | `src/jobs/verificaExpiracoes.js` | Verifica planos expirados |

**Execucao:** Manual via `node src/jobs/<arquivo>.js` ou integracao com cron.

---

## Comandos Uteis

### Backend
```bash
cd /var/www/hotspot/backend
npm start                              # Inicia servidor (porta 3001)
npx nodemon server.js                  # Inicia com hot reload
node migrations/001_multi_tenant.js    # Rodar migracao
node src/jobs/syncConnectionLogs.js    # Sync logs compliance
```

### Frontend
```bash
cd /var/www/hotspot/frontend
npm run dev                            # Dev server (Vite)
npm run build                          # Build producao (-> dist/)
npm run preview                        # Preview build
```

### WireGuard
```bash
cd /var/www/hotspot/infra/wireguard
docker compose up -d                   # Subir container
docker compose down                    # Parar container
docker compose logs -f                 # Ver logs
```

### Banco de Dados
```bash
mysql -u hotspotuser -p hotspot        # Conectar ao banco
# Schema de referencia: /var/www/hotspot/backend/jobs/estrutura.sql
```

---

## Sistema de Portais Captive & Templates

### Tipos de Portal e Funcionamento (`portais.tipo`)

| Tipo | Descricao | Fluxo |
|------|-----------|-------|
| `login` | Portal de login tradicional | Entrada para clientes que já possuem usuário/senha ou voucher no RADIUS |
| `planos` | Venda de internet (PIX / Cartão) | Multi-step: Captura de Lead (`CadastroCliente`) → Escolha de Plano (`PlanosCliente`) → Pagamento (`Pagamento`) → Liberação RADIUS |
| `lead_passivo` | LGPD / Termos de Uso | Cliente preenche Nome, Email, Telefone, CPF/Passaporte para liberação direta mediante aceite |
| `lead_ativo` | Validação via WhatsApp | Exige integração WhatsApp para envio de OTP / Link de validação antes de liberar |

### Tipos de Template (`portal_templates`)
| Tipo | Descricao |
|------|-----------|
| `basico` | Portal simples com botao de conexao |
| `planos` | Portal com exibicao de planos e precos |
| `lgpd` | Portal com consentimento LGPD |
| `completo` | LGPD + cadastro + selecao de planos (multi-step) |

### Editor Visual (WYSIWYG)
- **Componente:** `frontend/src/pages/admin/PortalEditor.jsx`
- **Armazenamento:** Configurações visuais salvas em `portais.configuracoes` / `portais.config_json` (JSON).
- **Personalização:** Imagem de fundo, logotipo, cores primárias/secundárias, opacidade, border-radius, fontes e alinhamentos.
- **Preview:** Simulação em tempo real side-by-side no editor React sem necessidade de re-build.

### Renderização Pública Dinâmica (`/p/:hash`)
- **Componente:** `frontend/src/pages/public/RenderPortal.jsx`
- **Mapeamento:** O MikroTik redireciona conexões HTTP para `/p/:hash?mac=XX:XX&ip=YY.YY&mikrotik_id=ZZ`. O hash oculta IDs sequenciais e mapeia para o ID do portal.
- **Variáveis CSS:** `RenderPortal.jsx` consome `config_json` e injeta variáveis CSS inline (`--primary-color`, `--bg-opacity`) dinamicamente.

### Auto-Login de Clientes Retornantes (`CadastroCliente.jsx`)
- Na etapa 1 do portal de planos (`CadastroCliente.jsx`), ao informar o CPF:
- O backend consulta o FreeRADIUS (`radcheck` / `radacct`) para verificar se aquele CPF possui usuário e plano ativo.
- Se o usuário tiver tempo/plano válido ativo, a etapa de cobrança é **cancelada automaticamente** e o cliente é redirecionado para a página de login do MikroTik local com as credenciais injetadas na URL, conectando-o sem atritos.

### Gotchas de Build e Cache nos Portais Públicos
- Ao alterar páginas públicas do portal (`frontend/src/pages/public/`), é **obrigatório** rodar `npm run build` na pasta `frontend`.
- Se houver cache forte do navegador/Nginx em arquivos estáticos servidos no captive portal, pode ser necessário limpar a pasta de build (`rm -rf dist`) antes de refazer a compilação.

---

## 🎨 Sistema de Design & Tokens (ReceitaNet ERP Theme)

O painel administrativo segue a identidade do **ReceitaNet ERP**:

| Token | Valor Hex | Aplicação |
|-------|-----------|-----------|
| **Content Background** | `#f1f5f9` (Slate 100) | Fundo das páginas do painel |
| **Sidebar Surface** | `#1e293b` (Dark Navy Slate) | Menu lateral (Sidebar) |
| **Sidebar Text / Active**| `#e2e8f0` / `#2563eb` | Texto do menu / Item selecionado |
| **Card & Panel Surface** | `#ffffff` | Painéis e tabelas com fundo branco puro |
| **Card Border** | `#e2e8f0` | Linhas de borda e divisores |
| **Primary Blue** | `#2563eb` (Royal Blue) | Botões primários e destaques de navegação |
| **Secondary Orange** | `#f97316` (Orange) | Accents, badges de destaque e alertas |
| **Text Primary** | `#0f172a` (Dark Slate) | Títulos e texto principal de alta legibilidade |
| **Text Secondary** | `#64748b` (Medium Slate) | Subtítulos, rótulos e textos auxiliares |
| **Border Radius** | `sm: 6px`, `md: 10px`, `lg: 14px` | Arredondamento padrão dos componentes |

---

## Convencoes do Codigo

### Backend
- Controllers em `/backend/src/controllers/` - cada um exporta funcoes
- Rotas em `/backend/src/routes/` - Express Router
- SQL puro via `db.execute()` (pool mysql2) - nao usa ORM para a maioria das queries
- Nomes de tabelas e colunas em portugues (criado_em, atualizado_em, etc.)
- Respostas JSON: `{ success: true, data: ... }` ou `{ error: "mensagem" }`

### Frontend
- Componentes React funcionais com hooks
- Tailwind CSS para estilizacao
- React Hook Form + Zod para validacao de formularios
- Axios para chamadas API
- AuthContext para estado de autenticacao global
- Rotas com parametro `:empresaSlug` para multi-tenant

### Banco de Dados
- Tabelas com `empresa_id` para isolamento multi-tenant
- Timestamps: `criado_em`, `atualizado_em` (formato MySQL TIMESTAMP)
- IDs auto-incremento INT
- Charset: utf8mb4

---

## Checkout de Cartao Mercado Pago (Server-Side)

> **Doc tecnico completo:** `docs/CHECKOUT-CARTAO-MP.md` - leia antes de mexer neste fluxo.

Pagamento por cartao de credito do portal de planos roda 100% server-side: backend tokeniza via `POST /v1/card_tokens` e cobra via `POST /v1/payments`. Sem SDK JS, sem Bricks, sem CardForm. PIX continua intacto e nao tem nada a ver com este fluxo.

### Arquivos-chave
- `backend/src/controllers/pagamentoController.js` - `gerarPagamentoCartao`, `lookupBin`, `proxyDeviceSession`, `validarAssinaturaWebhook`, `MP_ERROR_MESSAGES`
- `backend/src/routes/pagamentoRoutes.js` - rotas `/gerar-cartao`, `/mp-device-session/:tipo`, `/notificacao`
- `frontend/src/pages/public/Pagamento.jsx` - branch `metodo === "cartao"` com form completo
- `frontend/public/mp-security.js` - copia local do device fingerprint do MP, **patchada** pra usar o proxy backend

### Por que server-side?
1. **Walled garden do hotspot so libera 1 dominio confiavelmente** - SDK JS do MP carrega varios dominios e quebra no celular do cliente.
2. PCI compliance assumida no servidor (decisao consciente, sem persistir dados de cartao).

### Pipeline `gerarPagamentoCartao`
1. Validacao de input (cartao, cvv, validade, CPF, nome)
2. Buscar plano + `mpConfig` (`empresa_configs.config_json.mercadopago`)
3. Resolver `payer.email` (lead > config > placeholder)
4. **INSERT pagamento** com status `aguardando` ANTES de chamar MP -> pega `pagId` -> `external_reference=pag_${pagId}_emp_${empresaId}`
5. **BIN lookup** via `GET /v1/payment_methods/installments?bin=&amount=&public_key=` (NAO `/search` - aquele nao filtra de fato por BIN). Cache em memoria 24h.
6. **POST `/v1/card_tokens?public_key=...`** com `cardholder.identification.{type:CPF,number}` consistente com o que sera enviado depois
7. **POST `/v1/payments`** com payload reduzido (veja "Regras de payload" abaixo) + headers `Authorization`, `X-Idempotency-Key` (UUID v4 puro), `X-meli-session-id` (device session id)
8. Tratamento: `approved` -> libera RADIUS via `liberarUsuario()` + retorna `{gateway, username, password}`. `rejected` -> mensagem PT-BR mapeada. `in_process`/`pending` -> retorna pra polling no frontend.

### Device fingerprint (CRITICO - sem isso, todas as transacoes em producao caem em `cc_rejected_high_risk`)

Frontend carrega `/mp-security.js` (servido local de `frontend/public/`). O script faz POST pro endpoint `/api/pagamentos/mp-device-session/web_device` que e um **proxy backend** pra `https://api.mercadopago.com/v1/device_sessions/web_device`. Resposta popula `window.MP_DEVICE_SESSION_ID`.

No submit, frontend le essa global e envia como `device_session_id` no body. Backend repassa pro MP de duas formas redundantes:
- Header `X-meli-session-id: armor.xxx`
- Body `metadata.device_session_id: "armor.xxx"`

**O proxy `proxyDeviceSession` filtra `X-Forwarded-For` invalidos** (`::1`, IPs privados) - MP devolve 500 generico se receber XFF com IPv6 loopback ou IP de range privado.

**Refresh do `mp-security.js`** (se MP fizer release nova):
```bash
curl -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' \
     -H 'Referer: https://www.mercadopago.com.br/' \
     'https://www.mercadopago.com/v2/security.js?view=checkout' \
     -o /var/www/hotspot/frontend/public/mp-security.js
sed -i 's|https://api\.mercadopago\.com/v1/device_sessions|/api/pagamentos/mp-device-session|g' \
    /var/www/hotspot/frontend/public/mp-security.js
cd /var/www/hotspot/frontend && npm run build
```

### Regras de payload do `/v1/payments` (gravadas em sangue - NAO MEXER sem ler o doc)

| Regra | Por que |
|---|---|
| **NAO** enviar `additional_info.ip_address` | IP do hotspot e privado 10.x, antifraude marca como suspeito |
| **NAO** enviar `payer.first_name`, `payer.last_name`, `payer.identification` | MP usa o `cardholder` do token como fonte da verdade. Esses campos sao silenciosamente descartados. Divergencia gera high_risk |
| **NAO** enviar `additional_info.payer` | Mesmo motivo do anterior |
| **SIM** enviar `payment_method_id` e `issuer_id` do BIN lookup | Doc lista como obrigatorios. Sem eles MP "adivinha" e tem score pior |
| **SIM** enviar `additional_info.items[]` | Aumenta contexto pro antifraude |
| **SIM** enviar `metadata.device_session_id` + header `X-meli-session-id` | Maior fator unico de aprovacao |
| Email do pagador deve ser **real** | Placeholder/dominio fake (`@asd.com`, `@pagamento.com`) penaliza score |
| `X-Idempotency-Key` = UUID v4 **puro** | Sem prefixo, sem `_`. MP rejeita formatos `payment_xxx` |
| Mesmo CPF/nome em `cardholder` (token) e qualquer dado enviado | Consistencia evita antifraude |
| INSERT pagamento **antes** de chamar MP | Permite usar `pag_X_emp_Y` como external_reference, e webhook consegue casar mesmo se request travar |
| **SIM** enviar `notification_url` no body do `/v1/payments` (PIX **e** cartao) | Em multi-tenant com a mesma conta MP, painel global so aceita 1 URL. Sem este campo, so 1 servidor recebe webhook — outros ficam com PIX eternamente em `aguardando`. **Bug historico:** PIX foi criado sem `notification_url` e ficou anos quebrado em multi-tenant ate 2026-04-09. Cartao ja fazia certo desde sempre. |

### Configuracao por empresa

`empresa_configs.config_json` para `config_type='mercadopago'`:
```json
{
  "access_token": "APP_USR-...",
  "public_key":   "APP_USR-...",
  "email_pagador": "comprador@dominio-real.com",
  "webhook_secret": "abc123..."
}
```

`webhook_secret` e opcional - se cadastrado, ativa validacao HMAC-SHA256 do `x-signature` em `notificacaoWebhook`. Pegar no painel MP em "Webhooks > Configurar notificacoes > Segredo".

### Walled garden

`hotspotSetup.js` ja inclui (linha ~226) os dominios MP necessarios. Mas como a infra atual so libera o **primeiro dominio** confiavelmente, o `mp-security.js` foi servido localmente + proxy backend pra evitar dependencia de `api.mercadopago.com` no celular do cliente. Se um dia o walled garden suportar multiplos dominios, e seguro voltar a carregar o script direto de `https://www.mercadopago.com/v2/security.js`.

### Endpoints principais
```
POST /api/pagamentos/gerar-cartao              # publico, captive portal -> cobranca
POST /api/pagamentos/mp-device-session/:tipo   # publico, proxy device fingerprint (web_device | anonymous_device_session)
POST /api/pagamentos/notificacao               # publico, webhook MP (com validacao opcional)
GET  /api/pagamentos/status                    # publico, polling do frontend
```

### Diagnostico rapido

Quando der `cc_rejected_high_risk` em todas as transacoes:
```bash
# Inspecionar o pagamento direto na API do MP
TOKEN="APP_USR-..."
curl -sS "https://api.mercadopago.com/v1/payments/<mp_id>" \
     -H "Authorization: Bearer $TOKEN" \
     | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps({k:d.get(k) for k in ['status','status_detail','additional_info','metadata']}, indent=2))"
```

- Se `metadata.device_session_id` estiver vazio (`{}`) -> frontend nao enviou. Ver se `mp-security.js` carregou no celular (DevTools), se proxy `/api/pagamentos/mp-device-session/web_device` esta retornando 200 com `id`.
- Se `additional_info.tracking_id` mostrar `security:none` -> antifraude sem sinais. Mesmo problema.
- Se `payer.first_name`, `payer.identification` voltarem `null` -> normal, MP descarta esses campos quando voce usa `token`.

**PIX fica eternamente em `aguardando` mas cartao funciona**:
```sql
SELECT id, mp_pagamento_id, status, metodo_pagamento, criado_em
FROM pagamentos WHERE empresa_id = X ORDER BY id DESC LIMIT 20;
-- Sintoma: cartoes 'approved', PIX todos 'aguardando'
```
Causa: `gerarPagamento` (PIX) sem `notification_url` no body do `/v1/payments`. Multi-tenant com mesma conta MP -> webhook so chega no servidor da URL global do painel. Fix: ver linha do `notification_url` no `pagamentoController.js` (PIX usa o mesmo padrao do cartao desde 2026-04-09).

**Webhook MP retorna 401 misterioso (silencioso)**:
- Se `mp_id=123456` -> e o teste do botao "Simular notificacao" do painel, normal (id fake nao existe no banco). Pra testar, **Reenviar** uma notificacao real do historico.
- Se `mp_id` real e `empresa=X` -> validacao de assinatura `webhook_secret` falhou. Conferir se o secret no painel MP bate com `empresa_configs.config_json.mercadopago.webhook_secret`. Se nao for usar, removerlo: `UPDATE empresa_configs SET config_json = JSON_REMOVE(config_json, '$.webhook_secret')`.
- Logs explicitos no `notificacaoWebhook` (a partir de 2026-04-09): qualquer 401 agora loga o motivo no PM2 ao inves de retornar silencioso.

### Spec e plan
- Spec: `docs/superpowers/specs/2026-04-08-checkout-cartao-mp-rewrite-design.md`
- Plano: `docs/superpowers/plans/2026-04-08-checkout-cartao-mp-rewrite.md`

---

## Notificacao WhatsApp por Portal

> **Doc tecnico completo:** `docs/WHATSAPP-NOTIFICACOES.md`

Sistema de envio automatico de mensagens WhatsApp ao cliente quando o acesso e liberado (pagamento aprovado, LGPD, liberacao manual). Configuravel **por portal**, com template personalizavel via variaveis Mustache `{{var}}`.

### Arquitetura

```
Portal (config)              Service                        Log
───────────────              ───────                        ───
portais.whatsapp_enabled  ┐
portais.whatsapp_template ┼─> whatsappNotify              ─> whatsapp_logs
                           │   .notificarLiberacao()          (ok/erro/skipped)
mikrotikAPIController      │
.liberarUsuario()         ─┘
```

### Schema (migration 012)

| Tabela | Coluna | Proposito |
|---|---|---|
| `portais` | `whatsapp_enabled` TINYINT(1) | Liga/desliga por portal |
| `portais` | `whatsapp_template` TEXT | Template Mustache customizavel |
| `pagamentos` | `portal_id` INT | Rastreia origem do pagamento |
| `pagamentos` | `telefone` VARCHAR(20) | Backup do telefone no INSERT |
| `whatsapp_logs` | (nova tabela) | Log completo de envios |

### Arquivos-chave

- `backend/src/services/whatsappNotify.js` - service principal (template engine, lookup telefone, logger)
- `backend/src/constants/whatsappDefaults.js` - template padrao compartilhado
- `backend/src/controllers/mikrotikAPIController.js` - `liberarUsuario` chama o service
- `backend/src/controllers/portalController.js` - endpoints de preview/teste por portal
- `backend/src/controllers/whatsappController.js` - endpoints de logs (`listarLogs`, `limparLogs`)
- `frontend/src/pages/admin/PortalEditor.jsx` - aba "Notificacao WhatsApp" no editor
- `frontend/src/pages/admin/WhatsApp.jsx` - historico de envios (filtros + paginacao)

### Fluxo de envio

1. `liberarUsuario({cliente_id, portal_id, telefone, cpf, mac, ...})` e chamado apos liberar RADIUS
2. Dispara `notificarLiberacao(ctx)` de forma **assincrona** (nao bloqueia liberacao)

---

## Roadmap Estratégico (Próximas Sprints)

> Baseado na Análise Comparativa de Mercado (2026-08-15) - Foco em fechar o gap de marketing/engajamento em cima da base atual de billing.
> *Priorização: Maior ROI / Menor Esforço primeiro.*

1. **Analytics de Recorrência de Visitantes (Prioridade Alta)**
   - Agregação de dados existentes (`radacct`, `leads`, `lgpd_logins`) para visualização de: visitantes únicos, novos vs. recorrentes, heatmap de horários de pico e tempo médio de permanência (*dwell time*).
2. **Dashboard de NPS (Prioridade Média-Alta)**
   - Tela agregadora (`/admin/:slug/nps`) para a automação de NPS já existente. Exibição da nota global (Promotores vs Detratores), lista de comentários e exportação CSV. Gravação em nova tabela `nps_respostas`.
3. **Cupons e Fidelização Pós-Conexão (Prioridade Média)**
   - Geração de cupons únicos exibidos no Captive Portal após a conexão e disparados via WhatsApp, para impulsionar o ticket médio nos comércios. Requer tabelas `cupons` e `cupons_resgatados`.
4. **Login Social no Portal (Prioridade Média)**
   - Novo tipo de portal (`login_social`) integrando OAuth2 (Google, Facebook, Instagram) para estabelecimentos que oferecem WiFi gratuito (shoppings, salas de espera) sem exigir formulário de cadastro longo, caindo no fluxo `lead_passivo`.
5. **Onboarding Self-Service / Página de Produto (Prioridade Baixa-Média)**
   - Transformar a captura da landing page atual em um funil automatizado que provisiona o tenant (`status_financeiro = 'trial'`, `trial_ate = NOW() + 7 dias`) e envia credenciais ao cliente, com bloqueio automatizado pós-trial.
3. O service:
   - Busca `whatsapp_enabled` e `whatsapp_template` do portal (resolve `portal_id` via `mikrotiks.portal_id` se nao informado)
   - Se desligado ou sem template → grava `skipped` no log e retorna
   - Resolve telefone na ordem: `telefone` explicito → `cliente_id` (leads) → `cpf` (leads) → `mac` (lgpd_logins)
   - Normaliza telefone para 13 digitos (`55 + DDD 2 + numero 9`) por **comprimento**, NAO por prefixo `startsWith("55")` (DDD 55 do RS confundia)
   - Renderiza template com variaveis (`nome`, `username`, `password`, `plano`, `duracao`, `velocidade`, `login_url`, `valor`, `empresa`, `expira_em`, `cpf`)
   - Envia via `enviarMensagemDireta` (que aplica `formatarNumeroComNonoDigito` pro DDD ≤ 30 adicionar 9)
   - Grava resultado em `whatsapp_logs` (status `ok`/`erro`/`skipped`)

### Variaveis do template (Mustache)

| Variavel | Fonte | Fallback |
|---|---|---|
| `{{nome}}` | `leads.nome` | "Cliente" |
| `{{username}}` | CPF cliente ou MAC | sempre preenchido |
| `{{password}}` | mesmo do username | sempre preenchido |
| `{{plano}}` | `planos.nome` | vazio |
| `{{duracao}}` | `planos.duracao_minutos` | vazio |
| `{{velocidade}}` | `planos.velocidade_down`/`up` | vazio |
| `{{login_url}}` | URL auto-login MikroTik | vazio |
| `{{cpf}}` | CPF do cliente (nao do cartao!) | vazio |
| `{{valor}}` | `pagamentos.valor` | vazio |
| `{{empresa}}` | `empresas.nome` | vazio |
| `{{expira_em}}` | `pagamentos.expira_em` | vazio |

Variaveis nao-resolvidas viram string vazia (nunca aparece `{{foo}}` no resultado).

### Endpoints

```
POST   /api/portais/:id/whatsapp-preview   # renderiza template com vars fake
POST   /api/portais/:id/whatsapp-teste     # envia msg real pra numero informado
GET    /api/whatsapp/logs                  # listar (filtros: status, telefone, portal, datas) + paginacao
DELETE /api/whatsapp/logs?antes_de=...     # limpar logs antigos
```

### Gotchas gravados em sangue

1. **CPF do cliente ≠ CPF do titular do cartao.** Em `gerarPagamentoCartao`, `cardholderCpf` (do form) vai SO pro MP token. `clienteCpf` (do lead via `cliente_id`) e' o que vira username RADIUS, cpf do pagamento, e variavel `{{cpf}}` do template. Misturar faz a Laura receber no WhatsApp dela o CPF do pai como login (caso real que pegou a gente).

2. **Lookup de telefone NAO usa mais `mac+ip`.** Antes era `WHERE mac = ? AND ip = ?` — frageis porque mac e' aleatorio em celulares e ip e' privado do hotspot. Hoje a chave primaria e' `cliente_id` → leads.

3. **Normalizacao de telefone por COMPRIMENTO, nao por prefixo.** A detecao `startsWith("55")` confunde DDD 55 (Santa Maria/RS) com DDI 55. Regra correta:
   - 10 ou 11 digitos → DDD+numero sem DDI, prefixa "55"
   - 12 ou 13 digitos → ja tem DDI 55, retorna como esta
   - Outros → telefone invalido, skip

4. **Idempotencia do webhook MP.** O MP pode entregar o webhook 2-3 vezes. Tambem, no cartao, o direct response do `/gerar-cartao` + o webhook chegariam dobrado. A solucao: `notificacaoWebhook` captura `statusAnterior` ANTES do UPDATE, e so chama `liberarUsuario` se nao estava approved antes. Se estava, pula (`jaProcessado`). PIX polling ja tinha idempotencia via `radcheck` check. Sem isso, WhatsApp chegava dobrado.

5. **Nunca bloquear a liberacao.** Erros do WhatsApp sao capturados e viram log com status `erro`, mas o `liberarUsuario` e' chamado com `.catch(...)` no `notificarLiberacao`. O cliente sempre e' liberado mesmo com falha no WhatsApp.

6. **Template padrao compartilhado.** `backend/src/constants/whatsappDefaults.js` exporta `DEFAULT_WHATSAPP_TEMPLATE`. Usado por:
   - Migration 012 (backfill de portais existentes)
   - `empresaController.criarEmpresa` (auto-criacao dos 5 portais padrao)
   - `portalController.criarPortal` (portal custom manual)
   Nao duplicar - sempre importar do constants.

7. **Cada caminho de liberacao tem que chamar `notificarLiberacao` explicitamente — nao tem hook global.** Inicialmente so o `mikrotikAPIController.liberarUsuario` (pagamento aprovado) chamava o service. Os portais LGPD, Lead e Lead Passivo cadastravam usuario no RADIUS (ou inseriam o lead) mas **nunca disparavam WhatsApp**, mesmo com toggle ligado e template preenchido — nao aparecia nem row em `whatsapp_logs`. Corrigido em 2026-04-09 adicionando o call em `lgpdController.lgpdLogin`, `leadController.leadLogin` e `leadController.capturaPassiva`. **Regra pra novos handlers:** importar `notificarLiberacao` do service, resolver `portal_id` via `SELECT id FROM portais WHERE tipo = '<tipo>' AND empresa_id = ?`, e chamar com `.catch()` pra nao bloquear o fluxo principal.

---

## Metodos de Pagamento por Portal (Toggles PIX/Cartao)

Cada portal tipo `planos` tem dois toggles independentes no editor: **PIX ativo** e **Cartao ativo**. Salvos em `portais.configuracoes` (JSON) como `pagamento_pix_ativo` e `pagamento_cartao_ativo`.

### Logica

- **Default**: ambos ativos (check `!== false`, config vazia = ambos true)
- **Nao permite desligar os dois simultaneamente** (alert no editor)
- Frontend `Pagamento.jsx` **auto-seleciona** quando so um esta ativo (pula a tela de escolha)
- `/api/planos-publicos/:id` retorna as flags no response (JOIN via `mikrotiks.portal_id`)

### Exibicao

| pix_ativo | cartao_ativo | Comportamento no portal |
|---|---|---|
| true | true | Tela de escolha com 2 botoes (default) |
| true | false | Vai direto pro PIX |
| false | true | Vai direto pro cartao |
| false | false | **Bloqueado no editor** (pelo menos um tem que ficar ligado) |

---

## PIX Trial - Acesso Free ao Copiar PIX

> **Doc tecnico completo:** `docs/PIX-TRIAL.md`

Libera internet temporaria (default 5 min) quando o cliente clica em "Copiar codigo Pix" no portal. Sem isso, cliente fica preso no captive portal e nao consegue abrir o app do banco pra pagar.

### Arquitetura (resumo)

```
[botao Copiar PIX] → POST /api/pagamentos/pix-trial
                          ↓
       1. valida pix_trial_enabled do portal
       2. rate limit 24h por CPF (excecao: se ja pagou antes)
       3. gerarAcessoTemporario com username pixfree_eX_pY_...
       4. UPDATE pagamentos.trial_liberado_em = NOW()
       5. retorna credenciais + gateway
                          ↓
       redirecionarHotspot() → cliente tem internet
```

### Schema (migration 013)

| Tabela | Coluna | Proposito |
|---|---|---|
| `pagamentos` | `trial_liberado_em` TIMESTAMP | marca quando o trial foi disparado, usado no rate limit |
| `pagamentos` | (indice novo) | `idx_pagamentos_cpf_trial (cpf, trial_liberado_em)` |

Config do portal (em `portais.configuracoes` JSON):
- `pix_trial_enabled`: boolean - liga/desliga o trial
- `pix_trial_duracao_minutos`: numero - default 5, min 1, max 30

### Defaults centralizados

`backend/src/constants/whatsappDefaults.js` agora exporta `DEFAULT_PORTAL_PLANOS_CONFIG` alem do `DEFAULT_WHATSAPP_TEMPLATE`. Usado em:
- `empresaController.criarEmpresa` — novos portais `planos` ja vem com PIX/Cartao/Trial ligados
- Backfill one-off rodado em 2026-04-09 pros portais `planos` existentes

### Arquivos-chave

- `backend/src/controllers/pagamentoController.js` - `liberarPixTrial` (endpoint) + `gerarPagamento` estendido pra retornar `pagamento_id` interno
- `backend/src/controllers/authTempController.js` - `gerarAcessoTemporario` agora aceita `opts.duracaoSegundos` + `opts.usernamePrefix`
- `backend/src/controllers/planPublicController.js` - retorna `pix_trial_enabled` e `pix_trial_duracao_minutos` no plano
- `backend/src/constants/whatsappDefaults.js` - `DEFAULT_PORTAL_PLANOS_CONFIG`
- `frontend/src/pages/admin/PortalEditor.jsx` - sub-secao "Acesso gratis ao copiar PIX"
- `frontend/src/pages/public/Pagamento.jsx` - info box + handler do trial

### Regras do Rate Limit

1. **1 trial por CPF a cada 24h** (query por `trial_liberado_em > DATE_SUB(NOW(), INTERVAL 24 HOUR)`)
2. **Excecao**: se o ultimo trial deu em pagamento `approved`, cliente pode gerar outro (e' legitimo)
3. **Sem CPF**: bloqueia com 400. Trial exige CPF (tipicamente vem do `CadastroCliente` → `cliente_id` → `leads.cpf`)
4. Query normaliza CPF (remove `.` `-` ` `) pra evitar burla por formatacao diferente

### Gotchas gravados em sangue

1. **Frontend precisa do `pagamento_id` INTERNO** — nao confundir com `mp_pagamento_id`. O `gerarPagamento` foi estendido pra retornar `pagamento_id: insertPix.insertId` junto com `mp_pagamento_id`.
2. **Query de rate limit normaliza CPF inline** — `REPLACE(REPLACE(REPLACE(cpf,'.',''),'-',''),' ','') = ?` pra lidar com ambos os formatos (formatado e limpo) na mesma tabela.
3. **Username trial tem prefixo `pixfree_`** — diferente de `pix_e` (temp legado do `authTempController`). Evita colisao na limpeza de usuarios temp antigos.
4. **Duracao configuravel por portal** — foi necessario extender `gerarAcessoTemporario` com `opts` pra nao quebrar o fluxo legado que usa 300s hardcoded.
5. **Backfill respeita config existente** — spread `{...defaults, ...existing}` nos portais `planos` antigos garantiu que cores/titulos ja customizados nao foram sobrescritos.

---

## Fingerprint Mercado Pago (mp-security.js)

Pagamento.jsx bloqueia o formulario do cartao ate `window.MP_DEVICE_SESSION_ID` ser populado pelo script `/mp-security.js`. Sem esse fingerprint, antifraude do MP rejeita tudo como `cc_rejected_high_risk`.

### Estados (`fingerprintStatus`)

- `loading` → spinner "Preparando ambiente seguro"
- `ready` → mostra formulario do cartao
- `error` → tela de erro com [Tentar novamente] e [Usar PIX] (segundo so se PIX ativo)

### Timeout

- Poll a cada 300ms checando `window.MP_DEVICE_SESSION_ID`
- **15s max**, depois vai pra `error`
- `recarregarFingerprint()` remove script e reinjeta com cache-bust

### Safety net

O `submeterCartao` tambem valida antes de enviar. Mesmo se o form escapar a checagem visual, nao deixa processar sem fingerprint.

---

## Sistema de Atualizacao (Publish & Apply)

> **Doc tecnico completo:** `docs/SISTEMA-DE-ATUALIZACAO.md`

Distribui updates incrementais (codigo + schema) do servidor mestre pros servidores "aluno" com deteccao automatica de mudancas de arquivo (MD5) **e** de schema MySQL (colunas/indices via INFORMATION_SCHEMA). SQL DDL de ALTER/CREATE/DROP e' auto-gerado e colocado no textarea de migrations pro super admin revisar antes de publicar.

### Arquitetura (resumo)

```
[Master]                               [Aluno]
/super/publicar-atualizacao            /super/atualizar
  1. Tirar Snapshot                      1. Check: POST /api/updates/check
  2. Detectar Alteracoes                    (valida email Hotmart)
     - diff file_snapshots (MD5)         2. Apply por update_id:
     - diff schema_snapshots (JSON)         backup → download → arquivos →
     - gera SQL ALTER/CREATE               migrations → npm install → build →
  3. Publicar → updates/                   registro → PM2 restart
     update_files/update_migrations     3. Modal "Ver Logs" mostra timeline
```

### Schema

| Tabela | Migration | Lado | Proposito |
|---|---|---|---|
| `applied_updates` | 009 | ambos | Ultimo update aplicado no aluno |
| `system_backups` | 009 | ambos | Backups pre-update |
| `updates`, `update_files`, `update_migrations` | 010 | master | Pacote publicado |
| `file_snapshots` | 010 | master | MD5 baseline de arquivos |
| `schema_snapshots` | 014 | master | JSON de colunas/indices por tabela |
| `update_apply_logs` | 015 | aluno | Timeline de cada etapa do apply |

### Arquivos-chave

- `backend/src/controllers/updatePublishController.js` - publish side (scan, diff, generate DDL)
- `backend/src/controllers/systemUpdateController.js` - apply side (download, files, migrations, build, logs)
- `backend/src/routes/systemUpdateRoutes.js` - `/check`, `/apply`, `/logs` (super_admin)
- `backend/src/routes/updatePublishRoutes.js` - `/api/update-publish/*` (super_admin)
- `backend/src/routes/updateCheckRoutes.js` - `/api/updates/{check,download/:id}` (no-auth, valida email Hotmart)
- `frontend/src/pages/super/PublicarAtualizacao.jsx` - UI mestre
- `frontend/src/pages/super/AtualizarSistema.jsx` - UI aluno + modal de logs
- `/etc/nginx/sites-enabled/hotspot` - cache headers (index.html no-store, assets 1y immutable)

### Fluxo de deteccao de schema

1. `getDatabaseSchema()` le `INFORMATION_SCHEMA.COLUMNS` e `INFORMATION_SCHEMA.STATISTICS` pra cada tabela
2. Compara com `schema_snapshots` e gera `{tabelas_novas, tabelas_alteradas, tabelas_removidas}`
3. Tabelas novas: `SHOW CREATE TABLE` com rewrite pra `CREATE TABLE IF NOT EXISTS`
4. Tabelas alteradas: diff coluna-a-coluna (type+nullable+default+extra) e indice-a-indice (unique+columns), gera `ALTER TABLE ... ADD/DROP/MODIFY COLUMN`, `CREATE/DROP INDEX`
5. `flattenSchemaChangesToSql()` concatena tudo separado por `---` (formato do textarea)

### Runner de migrations (aluno)

`aplicarMigrations()` cria **conexao dedicada** (`mysql.createConnection`) com `multipleStatements: true`, roda sequencialmente **sem transacao**. Em caso de erro, reporta `Migration i/total falhou: <msg> | SQL: <preview>`.

Por que sem transacao: MySQL auto-commita DDL. `rollback` era ilusorio — nao desfazia metade aplicada.

### Logs do apply

`logApply(update_id, step, status, message)` grava em `update_apply_logs` + `console.log`. Etapas: `inicio`, `backup`, `download`, `arquivos`, `migrations`, `npm_backend`, `npm_frontend`, `build`, `registro`, `concluido`, `falha`.

Endpoint: `GET /api/system-update/logs?update_id=X` (super_admin). Frontend mostra em modal com timeline colorida.

### Gotchas gravados em sangue

1. **Nginx sem Cache-Control causava falso erro apos apply bem-sucedido** — browser ficava preso em JS antigo que interpretava o novo formato de resposta como erro. Fix: `index.html` com `no-store`, assets hasheados com `immutable 1y`.

2. **Transacao em DDL nao funciona em MySQL** — auto-commit implicito torna rollback impossivel. Runner roda fora de transacao e reporta qual statement falhou pro humano decidir correcao.

3. **Pool mysql2 nao aceita multiplos statements** por default (seguranca contra SQL injection). Runner cria conexao dedicada so pra migrations, nao usa o pool global.

4. **Response do apply precisa de `success: true, applied: true`** — frontend checa esses flags. Antes retornava `{message, update_id}` e frontend tratava como erro. Fix: adicionar esses flags explicitamente.

5. **Ordem alfabetica em tabelas novas pode quebrar FKs** — se `tabela_a` tem FK pra `tabela_z`, CREATE em ordem alfabetica falha. Nao ha resolvedor topologico. Super admin reordena SQL manualmente antes de publicar.

6. **Coluna `NOT NULL` sem `DEFAULT` em tabela com dados vai falhar no aluno** — o diff respeita fielmente o que esta no master (onde a tabela pode estar vazia). Sempre revisar SQL e adicionar DEFAULT antes de publicar.

7. **Tabelas RADIUS estao no diff** — se master e aluno tem versoes diferentes de FreeRADIUS, falsos positivos. Se virar problema, adicionar em `SCHEMA_IGNORE_TABLES` no topo do `updatePublishController.js`.

8. **Sem progress em tempo real** — `execSync` bloqueia o event loop. Logs sao persistidos e visiveis DEPOIS no modal "Ver Logs", nao em streaming.

9. **`UPDATE_SERVER_URL` no `.env` do aluno** e obrigatorio. Sem ele, `/check` retorna 500.

10. **Primeiro snapshot antes de qualquer mudanca** — se nao, o primeiro `Detectar Alteracoes` nao detecta mudancas de schema (mostra banner amarelo). Solucao: clicar em "Tirar Snapshot" uma primeira vez logo apos instalar.

---

## Hardening do Instalador (empacotar.sh + install.sh)

> **Doc tecnico completo:** `docs/INSTALADOR-HARDENING.md`

Pipeline `empacotar.sh` -> tarball -> `install.sh` num servidor limpo. O `install.sh` foi endurecido pra: (1) rodar TODAS migrations em loop, (2) detectar SSH port automatico antes do UFW, (3) servir nginx com cache headers corretos pro sistema de updates funcionar. O `estrutura.sql` foi regenerado via `mysqldump --no-data` (30 -> 41 tabelas) com seeds essenciais preservados.

### Arquitetura (resumo)

```
master ─ empacotar.sh ─> hotspot-YYYYMMDDHHMM.tar.gz
                              │
                              v
servidor novo ─ install.sh ─> [SSH detect] -> [deps] -> [estrutura.sql] ->
                              [for migrations/[0-9]*.js] -> [nginx no-store] ->
                              [ufw allow $SSH_PORT primeiro] -> [PM2 start]
```

### Arquivos-chave

- `backend/jobs/estrutura.sql` - schema completo (mysqldump fiel da master) + 7 INSERTs de seed
- `backend/jobs/estrutura.sql.bak` - backup da versao manual antiga (manter por garantia)
- `install.sh:127-145` - deteccao + prompt de SSH port
- `install.sh:406-411` - loop `for migrations/[0-9][0-9][0-9]_*.js`
- `install.sh:611-628 / 698-715` - blocos nginx VPS e Traefik (cache headers)
- `install.sh:840-862` - firewall UFW (libera $SSH_PORT antes do --enable)

### Seeds essenciais (no estrutura.sql)

| Seed | Tabela | Conteudo |
|---|---|---|
| Empresa default | `empresas` | id=1, slug=`default` |
| Super admin | `admins` | `admin@empresa.com / admin123` (bcrypt) |
| 5 portais padrao | `portais` | LGPD, Planos, Lead, Lead-Passivo, Login |
| 2 planos default | `planos` | LGPD (5min), Lead (1min) - mikrotik_id=0 com FK_CHECKS=0 |
| 4 portal_templates | `portal_templates` | Basico, Planos, Completo, Lead-Passivo |
| Sync inicial | `connection_logs_sync` | (1, 0, NOW()) |

### Gotchas gravados em sangue

1. **Sempre liberar SSH port no UFW ANTES do `ufw --force enable`.** Inversao = sessao SSH cai antes da regra ser aplicada. Tem cinto + suspensorio: se porta detectada nao for 22, libera 22 tambem.

2. **`mysqldump --no-data` mata todos os seeds.** Quando regenerar `estrutura.sql`, sempre re-anexar os 7 INSERTs do `.bak` (linhas 547-582). Sem isso, install termina sem super admin e o painel fica inacessivel.

3. **Migrations 012-015 vao falhar com "Duplicate column" no install novo** porque o schema ja esta no `estrutura.sql` regenerado. O `|| true` no loop suprime, mas polui output. Aceitar como ruido benigno ate tornar todas migrations idempotentes (`IF NOT EXISTS`).

4. **Bug pre-existente:** `lgpd_logins` nao existe na master (so `lgpd_logins_backup`), mas `whatsappNotify.js:226` ainda referencia. Nao corrigido neste hardening - feature provavelmente quebrada ha tempos sem ninguem notar.

5. **Nginx `index.html` PRECISA de `Cache-Control: no-store`** ou o sistema de updates quebra (browser preso em JS antigo apos `apply`). Ja documentado em `SISTEMA-DE-ATUALIZACAO.md` gotcha #1, mas estava faltando no install.sh ate agora.

6. **Loop de migrations pega `[0-9][0-9][0-9]_*.js`** - migrations novas tem que comecar com 3 digitos. `15_xxx.js` ou `0015_xxx.js` nao sao pegas.

---

## Redirect entre Portais (Propagacao de portal_id)

> **Doc tecnico completo:** `docs/REDIRECT-ENTRE-PORTAIS.md`

O portal `login` ("Acesso Wi-Fi") tem um link "Clique aqui" que redireciona pra outro portal (tipicamente Planos). Antes de 2026-04-09, o destino carregava configs do portal **errado** (o portal Login, vinculado ao MikroTik via `mikrotiks.portal_id`). Toggle PIX/Cartao, PIX Trial, WhatsApp template — tudo era ignorado em silencio. O fix propaga um `portal_id` explicito do redirect ate o backend.

### Arquitetura (resumo)

```
LoginHotspot (cfg.link_portal_id) ─click─>
  /planos-cliente?...&portal_id=X ─>
    /cadastro-cliente?...&portal_id=X ─>
      /pagamento/N?...&portal_id=X ─>
        Backend: planos-publicos/:id?portal_id=X (JOIN portais.id = X)
                 pagamentos/gerar       (body.portal_id -> INSERT pagamentos.portal_id)
                 pagamentos/gerar-cartao (idem)
        liberarPixTrial / notificarLiberacao herdam de pagamentos.portal_id
```

### Arquivos-chave

- `backend/src/controllers/planPublicController.js` - aceita `?portal_id=` na query
- `backend/src/controllers/pagamentoController.js` - `gerarPagamento` e `gerarPagamentoCartao` aceitam `portal_id` no body
- `frontend/src/pages/admin/PortalEditor.jsx` - select de destino salva `link_portal_id`
- `frontend/src/pages/public/LoginHotspot.jsx` - redirect anexa `portal_id`
- `frontend/src/pages/public/{PlanosCliente,CadastroCliente,Pagamento}.jsx` - capturam e propagam

### Gotchas gravados em sangue

1. **`mikrotiks.portal_id` aponta sempre pro portal de ENTRADA, nunca o de destino.** Codigo que resolve "qual portal usar" lendo dali sempre cai no errado quando ha redirect entre portais. **Regra:** sempre preferir `portal_id` explicito (request body/query) sobre `resolvePortalIdByMikrotik`.

2. **Portais Login configurados ANTES de 2026-04-09 nao tem `link_portal_id` no JSON.** O `onChange` do select agora popula os dois campos, mas configs antigas so tem `link_portal_url`. **Backfill manual obrigatorio:** abrir o portal Login no editor, reselecionar o destino no dropdown, salvar. Sem isso o redirect funciona mas sem `portal_id` na URL e cai no fallback antigo (= bug volta silenciosamente).

3. **`liberarPixTrial` e `notificarLiberacao` herdam o portal correto via `pagamentos.portal_id`** (gravado no INSERT). Nao recebem `portal_id` por parametro proprio. Se alguem mudar pra ler de outro lugar (ex: query), re-introduz o bug. **Manter a leitura via `pagamentos.portal_id`.**

4. **Novos handlers de liberacao TEM que receber e propagar `portal_id`.** Se um controller futuro chamar `liberarUsuario` sem passar `portal_id`, o WhatsApp cai no fallback `resolvePortalByMikrotik` em `whatsappNotify.js:101` — mesmo bug arquitetural. Sempre passar adiante.

5. **Caminho legado preservado.** Se `portal_id` nao vier (caminho direto MikroTik -> portal sem redirect), backend usa `mikrotiks.portal_id` como antes. Compatibilidade total.

---

## Correcoes e Historico de Bugfixes

### Correcao no Dashboard: Sessoes Ativas por MikroTik (2026-08-13)

**Arquivo:** `backend/src/controllers/dashboardController.js`

**Sintoma:** O dashboard exibia o numero de sessoes conectadas apenas em um MikroTik (ex: 13 sessoes no `RB760iGS` e 0 no `RB941-2nD`), mesmo quando havia usuarios conectados ao segundo equipamento.

**Causa Raiz:**
A query antiga fazia `LEFT JOIN radius_users r ON r.nas_id = m.id`. Isso contava o total de **usuarios cadastrados no sistema que possuiam vinculacao daquele MikroTik como NAS**, em vez de contar as **sessoes ativas conectadas em tempo real**.

**Solucao:**
A consulta no `dashboardController.js` foi corrigida para buscar as sessoes ativas reais na tabela `radacct` do FreeRADIUS (onde `acctstoptime IS NULL`), pareando pelo IP do MikroTik (`ra.nasipaddress = m.ip`), com fallback para `m.usuarios_ativos`:

```sql
SELECT
  m.nome,
  COALESCE(
    (SELECT COUNT(*)
     FROM radacct ra
     WHERE ra.nasipaddress = m.ip
       AND ra.acctstoptime IS NULL),
    m.usuarios_ativos,
    0
  ) AS conectados
FROM mikrotiks m
WHERE m.empresa_id = ?
GROUP BY m.id
```

---

### Módulo CRM & Relacionamento WhatsApp (Fase 1, Fase 2 & Fase 3)

**Objetivo:** Consolidar todos os contatos capturados pelos portais (LGPD, Leads Marketing e Pagamentos) em um painel unificado, fornecer automações de marketing acionadas por eventos via WhatsApp e disponibilizar uma Central de Atendimento (Chat em Tempo Real estilo WhatsApp Web).

**Tabelas de Banco de Dados (`016_crm_tables.js`, `017_crm_automations.js` e `018_crm_chat_messages.js`):**
1. `crm_templates`:
   - `id`, `empresa_id`, `titulo`, `mensagem`, `ativo`, `criado_em`, `atualizado_em`
2. `crm_historico_envios`:
   - `id`, `empresa_id`, `cliente_nome`, `telefone`, `mensagem`, `tipo_envio` (`manual` | `api`), `status`, `enviado_em`
3. `crm_automacoes`:
   - `id`, `empresa_id`, `tipo` (`boas_vindas` | `expiracao_aviso` | `pix_abandonado` | `retencao_ausente`), `titulo`, `mensagem`, `tempo_minutos`, `dias_ausente`, `ativo`
4. `crm_automacoes_log`:
   - `id`, `empresa_id`, `automacao_tipo`, `telefone`, `referencia_id`, `enviado_em`
5. `crm_chat_messages`:
   - `id`, `empresa_id`, `telefone`, `cliente_nome`, `direcao` (`enviada` | `recebida`), `mensagem`, `status`, `criado_em`

**Arquitetura Backend & Cron:**
- **Controller:** `/backend/src/controllers/crmController.js`
- **Rotas:** `/backend/src/routes/crmRoutes.js`
  - `/api/crm/contatos`: Lista consolidada de clientes.
  - `/api/crm/automacoes`: Configurações de marketing automático.
  - `/api/crm/chat/conversas`: Lista threads ativas de atendimento.
  - `/api/crm/chat/mensagens/:telefone`: Histórico de mensagens do chat.
  - `/api/crm/chat/enviar`: Disparo de resposta ao vivo via WhatsApp (grava em `crm_chat_messages`).
  - `/api/crm/webhook`: Rota pública de recebimento de mensagens enviadas pelos clientes (Evolution API `MESSAGES_UPSERT`).
- **Webhooks & Incompatibilidade de Collation:**
  - O webhook `/api/crm/webhook` é uma rota pública (sem auth JWT) para permitir que a Evolution API poste dados de novos eventos.
  - A função `configurarWebhookInstancia` em `whatsappController.js` configura automaticamente a URL pública (`https://${domain}/api/crm/webhook`) na Evolution API sempre que a instância está aberta.
  - As consultas SQL em `crmController.js` aplicam `CONVERT(... USING utf8mb4) COLLATE utf8mb4_unicode_ci` em operações `UNION` para harmonizar diferenças de collation entre as tabelas `leads` (`utf8mb4_unicode_ci`) e `whatsapp_logs`/`crm_chat_messages` (`utf8mb4_0900_ai_ci`).
- **Engine de Automação (`crmAutomationsJob.js`):** Executado a cada 2 minutos via `node-cron` no `server.js`.

**Interface Frontend:**
- **Página:** `/frontend/src/pages/admin/Crm.jsx` (`/admin/:slug/crm`)
- **Abas:**
  1. *Contatos Conectados:* Tabela consolidada com busca e filtros por data/origem.
  2. *Central de Atendimento (Nível 3):* Layout Web WhatsApp com lista de conversas, histórico de mensagens em tempo real, auto-polling (3s), atalhos de templates rápidos e barra de digitação.
  3. *Automações por Evento (Nível 2):* Switches liga/desliga e editores visuais de regras de tempo e mensagem.
  4. *Templates de Mensagem:* CRUD visual de modelos com ajuda de tags.
  5. *Histórico de Envios:* Audit log de todas as interações.

---

## Notas Importantes para IA

1. **Multi-tenant SEMPRE:** Toda query deve filtrar por `empresa_id`. Nunca expor dados de uma empresa para outra.

2. **SQL puro preferido:** O projeto usa `db.execute()` com mysql2 pool, nao Sequelize ORM para a maioria das operacoes. Mantenha esse padrao.

3. **Tabelas legadas:** `config_mercadopago` e `efi_config` foram migradas para `empresa_configs`. Novas features devem usar `empresa_configs`.

4. **RADIUS padrao FreeRADIUS:** As tabelas `radcheck`, `radreply`, `radusergroup`, `radacct` seguem o schema padrao do FreeRADIUS. Nao altere a estrutura dessas tabelas.

5. **Variaveis MikroTik:** O HTML servido em `/api/hotspot-login/:id` usa `$(mac)`, `$(ip)`, etc. que sao substituidas pelo MikroTik, nao pelo backend.

6. **Pagamentos via banco:** Credenciais de gateway ficam em `empresa_configs.config_json`, nao em .env.

7. **VPN necessaria:** Para acessar MikroTiks atras de NAT, o campo `vpn_ip` no registro do MikroTik contem o IP WireGuard.

8. **Compliance obrigatoria:** Logs de conexao devem ser mantidos conforme Marco Civil. O job `syncConnectionLogs.js` e critico.

9. **Frontend SPA:** O build do frontend vai para `/frontend/dist/`. Em producao, servido via Nginx ou similar.

10. **Sem sistema de filas:** Jobs rodam como scripts Node.js avulsos, sem Bull/Redis/RabbitMQ.

---

## 💰 MÓDULO FINANCEIRO SAAS (FASE 1 & 2)

### 📊 Estrutura de Tabelas
- `saas_planos`: Planos comerciais oferecidos às empresas clientes (mensalidade fixa, porcentagem/revenue share, híbrido, limites de MikroTiks e portais).
- `saas_faturas`: Faturas de mensalidades/comissões geradas por empresa (valores, vencimento, status pendente/pago/vencido/cancelado, timestamp de notificação WhatsApp).
- `empresas`: Atualizada com os campos `saas_plano_id`, `tipo_cobranca`, `valor_mensal`, `comissao_porcentagem`, `dia_vencimento`, `status_financeiro` e `trial_ate`.

### 🔌 Endpoints & Telas
- **API Backend:** 
  - `/api/saas-planos`: CRUD de planos comerciais (Super Admin).
  - `/api/saas-faturas`: Faturamento mensal, faturas avulsas, confirmação de baixa (`PUT /:id/baixa`) e notificações via WhatsApp (`POST /:id/notificar`).
  - `/api/empresas`: Gestão de empresas multi-tenant com associação de plano SaaS e status financeiro.
- **Engine Cron de Faturamento:** `saasBillingJob.js` roda a cada hora gerenciando faturas pendentes, identificando vencimentos e atualizando a inadimplência das empresas automaticamente.
- **Interface Super Admin:** 
  - Tela `/super/saas-planos` (`SaasPlanos.jsx`): Cadastro e edição de planos comerciais.
  - Tela `/super/saas-faturas` (`SaasFaturas.jsx`): Dashboard de faturamento, resumo financeiro (A Receber vs Recebido), faturas avulsas, dar baixa e cobrar via WhatsApp.
  - Tela `/super/empresas` (`Empresas.jsx`): Gestão de empresas clientes com badges e formulário financeiro completo.

---

## 🤖 Automações n8n + Evolution API + WhatsApp SaaS

> **Arquivo de workflow n8n:** `/var/www/hotspot/n8n/workflow-saas-pix.json`

Sistema de automações de alto valor usando a estrutura existente de **Evolution API** + **Backend Node.js** + **n8n**. Implementado em fases:

| Fase | Automação | Status |
|---|---|---|
| **Fase 1 (Opção A)** | Agente IA / 2ª via de PIX automática para clientes SaaS | ✅ Implementado |
| **Fase 2 (Opção B)** | Aniversariantes & Re-engajamento de visitantes ausentes | 🔲 Pendente |
| **Fase 3 (Opção C)** | Notificação WhatsApp do Dono a cada acesso pago vendido | 🔲 Pendente |
| **Fase 4 (Opção D)** | Pesquisa NPS pós-desconexão via WhatsApp | 🔲 Pendente |

---

### Fase 1 — Agente IA de 2ª Via PIX (Implementado em 2026-08-14)

#### Arquitetura

```
Cliente WhatsApp envia mensagem (ex: "preciso da 2a via do pix")
         │
         ▼
Evolution API dispara MESSAGES_UPSERT
         │
         ├── [Via n8n] Webhook → Detectar Intenção PIX (regex) →
         │                       POST /api/saas-faturas/bot/consulta-pix →
         │                       Se sucesso: envia mensagem via Evolution API
         │
         └── [Via CRM Webhook] POST /api/crm/webhook →
                                crmController.receberWebhookWhatsapp() →
                                Salva em crm_chat_messages →
                                saasBotService.processarAutoRespostaIaWhatsapp() →
                                enviarMensagemDireta() + grava em crm_chat_messages
```

**Dois caminhos de disparo coexistem:**
1. **n8n** (externo): recebe o webhook da Evolution API, filtra por regex, chama o endpoint `/api/saas-faturas/bot/consulta-pix`, e envia a resposta direto pela Evolution API.
2. **CRM Webhook** (interno): o endpoint `/api/crm/webhook` já recebe o evento, salva a mensagem no chat e dispara o bot automaticamente via `processarAutoRespostaIaWhatsapp`.

#### Arquivos-chave

| Arquivo | Propósito |
|---|---|
| `backend/src/services/saasBotService.js` | Lógica principal do bot (lookup empresa por telefone, garantir PIX, formatar resposta) |
| `backend/src/controllers/saasFaturaController.js` (`consultaPixBot`) | Endpoint público chamado pelo n8n |
| `backend/src/controllers/crmController.js` (`receberWebhookWhatsapp`) | Webhook CRM que também dispara o bot automaticamente |
| `n8n/workflow-saas-pix.json` | Template do workflow n8n (importar no n8n) |

#### Endpoint para n8n

```
POST /api/saas-faturas/bot/consulta-pix   # Público (sem auth JWT)
Body: { "telefone": "5551999999999" }
Retorna: { sucesso, empresa, fatura, pix_copia_cola, mensagem_formatada }
```

#### Fluxo do `saasBotService`

1. **Normaliza telefone** — extrai últimos 8 dígitos para comparação segura (ignora DDI/DDD)
2. **Busca empresa** — `SELECT FROM empresas WHERE RIGHT(REGEXP_REPLACE(telefone,...), 8) = ?` (excluindo slug `default`)
3. **Busca fatura pendente/vencida** — `SELECT FROM saas_faturas WHERE empresa_id = ? AND status IN ('pendente', 'vencido') ORDER BY data_vencimento ASC LIMIT 1`
4. **Garante PIX** — se `pix_copia_cola` já existe na fatura, reutiliza; senão chama `gerarPixFaturaSaas()` via Mercado Pago
5. **Formata resposta** — mensagem WhatsApp com status, valor, vencimento e chave PIX copia-e-cola
6. **Envia** — `enviarMensagemDireta()` + gravação em `crm_chat_messages` (aparece no chat CRM como "Agente IA (SaaS)")

#### Detecção de Intenção PIX (regex)

```js
/(pix|fatura|cobran[cç]a|2\s*a\s*via|segunda\s*via|boleto|pagar|mensalidade|débito|debito)/i
```

#### Workflow n8n — Configuração Necessária

O arquivo `n8n/workflow-saas-pix.json` tem **dois campos a substituir** antes de importar:

| Placeholder | Substituir por |
|---|---|
| `https://hotspot.nuvycore.online/api/saas-faturas/bot/consulta-pix` | URL real do backend |
| `https://SUA_EVOLUTION_API/message/sendText/SUA_INSTANCIA` + `SUA_API_KEY_EVOLUTION` | URL e apikey da Evolution API real |

**Pipeline do workflow:**
```
Webhook Evolution API
   → Detectar Intenção PIX (IF - regex)
      → [Sim] Consultar Fatura Hotspot API (HTTP Request)
           → Encontrou Resposta? (IF - sucesso === true)
               → [Sim] Enviar Mensagem WhatsApp (Evolution)
```

#### Gotchas gravados em sangue

1. **Busca empresa por últimos 8 dígitos do telefone** — não por número exato. Empresas podem ter telefone formatado com ou sem DDD, DDI, parênteses. `RIGHT(REGEXP_REPLACE(telefone, '[^0-9]', ''), 8) = ?` é o jeito robusto.

2. **PIX gerado sob demanda** — se a fatura não tem `pix_copia_cola`, o bot chama `gerarPixFaturaSaas()` em tempo real. Pode falhar se as credenciais MP da empresa `id=1` (Super Admin) não estiverem configuradas. Nesse caso, o bot responde sem a chave PIX mas ainda informa o cliente.

3. **Dois caminhos de disparo não se conflitam** — o webhook CRM já salva a mensagem E dispara o bot com `.catch()` (não bloqueia). Se o n8n também estiver configurado, o cliente pode receber mensagem duplicada. Recomendação: usar **apenas um dos dois** (preferir o webhook CRM interno, que já está integrado ao chat CRM).

4. **Bot só responde mensagens de clientes SaaS** — a empresa é encontrada pelo `telefone` cadastrado em `empresas`. Se o número de WhatsApp da empresa for diferente do campo `empresas.telefone`, o bot responde "empresa não encontrada".

5. **Mensagem aparece no CRM Chat como "Agente IA (SaaS)"** — qualquer resposta automática do bot é gravada em `crm_chat_messages.cliente_nome = 'Agente IA (SaaS)'` para auditoria.

---

### Captura de Leads Landing Page (`nuvycore.online`)

- **Endpoint público:** `POST /api/crm/lead-landing` (sem auth JWT).
- **Body enviado pela landing page:** `{ nome, empresa, telefone, perfil, clientes, email }`.
- **Gravação em banco:** Salva o lead em `leads` (`empresa_id = 1`, `origem = 'landing_page'`).
- **Disparo automático de WhatsApp:**
  1. Envia mensagem de confirmação ao WhatsApp do lead com boas-vindas e link da plataforma.
  2. Envia notificação instantânea para o WhatsApp de vendas/dono (`(67) 9 9255-3089`) contendo os dados completos do lead capturado.
- **Pendente Futuro (SMTP):** Integrar envio de e-mail automático (Nodemailer) tanto para o lead quanto para notificação da equipe assim que a conta de e-mail corporativo (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) for providenciada.


---

## Módulo CRM & Central de Atendimento WhatsApp

**Página frontend:** `/admin/:slug/crm` → `frontend/src/pages/admin/Crm.jsx`
**Rotas backend:** `backend/src/routes/crmRoutes.js` → `backend/src/controllers/crmController.js`
**Job automações:** `backend/src/jobs/crmAutomationsJob.js`

### Tabelas do CRM

| Tabela | Descrição |
|--------|-----------|
| `crm_templates` | Modelos de mensagem reutilizáveis (empresa_id, titulo, mensagem, ativo) |
| `crm_historico_envios` | Log de todos os disparos manuais e automáticos |
| `crm_automacoes` | Configuração das automações por empresa (tipo ENUM, mensagem, ativo, tempo_minutos, dias_ausente) |
| `crm_automacoes_log` | Log de execução — deduplicação para evitar reenvio |
| `crm_chat_messages` | Mensagens do chat ao vivo (enviadas e recebidas via webhook Evolution API) |

### Abas da Página CRM

| Aba | Função |
|-----|--------|
| **Contatos Conectados** | Lista unificada via UNION de `leads` + `pagamentos`. Filtros: período, origem. Ações: abrir chat ou disparo rápido WhatsApp. |
| **Central de Atendimento (Chat Ao Vivo)** | Chat com polling a cada 3s, auto-scroll inteligente, templates rápidos inline. Integrado ao webhook Evolution API. |
| **Automações por Evento** | 7 automações configuráveis. Toggle liga/desliga, botão salvar por card. |
| **Templates** | CRUD completo com tags dinâmicas. |
| **Histórico** | Últimos 100 disparos com tipo (API / Manual) e data/hora. |

### Automações Disponíveis — ENUM `crm_automacoes.tipo` (7 valores)

| Tipo | Trigger | Campo configurável |
|------|---------|-------------------|
| `boas_vindas` | 1° acesso (lead criado nos últimos 10 min) | — |
| `expiracao_aviso` | Sessão RADIUS prestes a vencer | `tempo_minutos` |
| `pix_abandonado` | PIX gerado mas não pago | `tempo_minutos` |
| `retencao_ausente` | Cliente sem conexão real há X dias (radacct + fallback leads) | `dias_ausente` (padrão 15) |
| `retorno_cliente` | Cliente volta após X+ dias sumido — "que bom ter você de volta!" | `dias_ausente` (padrão 3) |
| `aniversariantes` | Data nascimento = hoje (leads.data_nascimento) | — |
| `pesquisa_nps` | Sessão RADIUS encerrada entre 30–60 min atrás | — |

### Lógica `retorno_cliente` (implementada 2026-08-14)

Detecta quem conectou nos últimos 10 minutos mas cuja sessão anterior foi há mais de N dias.
Deduplicação: máximo 1 envio/dia por número via `crm_automacoes_log`.
Join: `radacct → radius_users (empresa_id) → leads` por cpf ou últimos 8 dígitos do telefone.

### `retencao_ausente` — Fonte de dados corrigida (2026-08-14)

Usava `leads.criado_em` (data do cadastro — nunca muda). Agora usa:
`COALESCE(MAX(ra.acctstarttime), MAX(l.criado_em))` — última sessão real do RADIUS com fallback.

### Webhook WhatsApp (Evolution API)

- **Rota:** `POST /api/crm/webhook` (sem auth JWT)
- **Empresa:** identificada pelo `instanceName` em `empresa_configs WHERE config_type = 'whatsapp'`
- **Fluxo:** salva em `crm_chat_messages` → dispara bot IA SaaS com `.catch()` para não bloquear

### Tags Dinâmicas nos Templates

`{nome}` `{telefone}` `{email}` `{cpf}` `{origem}` `{plano}` `{link_pix}` `{empresa}`

### Bugs Corrigidos em 2026-08-14

1. **ENUM incompleto** — `aniversariantes` e `pesquisa_nps` faltavam no ENUM → salvamento retornava 500. Corrigido via `ALTER TABLE`.
2. **`p.plano_nome` inexistente** — tabela `pagamentos` usa `nome_plano`. Causava crash no job de PIX abandonado (`ER_BAD_FIELD_ERROR`).
3. **`only_full_group_by`** — `nome` sem `MAX()` no GROUP BY de `retencao_ausente`. Corrigido com `MAX(nome)`.

---

### Correção no Sistema de Permissões por Grupo — Sidebar (2026-08-14)

**Arquivo:** `frontend/src/components/admin/AdminLayout.jsx`

**Sintoma:** Usuários com grupo "CEO" (todas permissões marcadas) não enxergavam menus como "MikroTik & VPN", "Leads & LGPD", "RADIUS & Marco Civil" e "Configurações" na sidebar.

**Causa Raiz (Bug Duplo):**
1. A verificação de permissão usava `item.key` diretamente como nome de módulo. Porém, **grupos de menu** (com subitens) têm `key` como `mikrotik_group`, `clientes_group`, `radius_group`, `configuracoes_group` — nomes que **não existem na lista `MODULOS` do backend**. Resultado: `hasPermission('mikrotik_group', 'ver')` sempre retornava `false`, escondendo o grupo inteiro.
2. Os **filhos** dentro dos grupos não tinham filtragem individual — se o grupo passasse, todos os filhos eram exibidos indiscriminadamente.

**Solução:**
- Adicionado mapa `keyToModulo` que distingue grupos de menus (verificar filhos) de itens sem módulo dedicado (sempre mostrar, ex: `crm`, `whatsapp`, `campanhas`).
- Para grupos com filhos: exibe o grupo se **ao menos 1 filho** tiver `hasPermission(módulo, 'ver')`.
- Para itens simples: verifica o módulo real correspondente.
- Adicionado mapa `childKeyToModulo` para filtrar filhos individualmente por permissão na renderização.

**Regra para novos menus:**
- Item simples com módulo RADIUS → `key` deve ser exatamente o nome do módulo (ex: `'pagamentos'`).
- Grupo de menus (com `children`) → `key` pode ser qualquer identificador, mas os `child.key` **devem** constar no `childKeyToModulo` para serem filtrados corretamente.
- Itens sem módulo RADIUS (ex: CRM, WhatsApp) → adicionar no `keyToModulo` com valor `null` para sempre exibir.

---

### Módulo de Acesso Remoto & Proxy WebFig / Winbox MikroTik (2026-08-14)

**Objetivo:** Permitir acesso remoto seguro e direto ao WebFig (interface web RouterOS) e conexão remota direta via aplicativo Winbox desktop de qualquer MikroTik online na VPN WireGuard, diretamente pelo painel administrativo ou aplicativo Winbox de fora da rede.

**Arquitetura:**

1. **Proxy Reverso WebFig HTTPS (`backend/src/services/webfigProxy.js`):**
   - Servidor proxy HTTP/WebSocket escutando na porta interna `3002`, exposto via Nginx SSL na porta `8443` (`https://hotspot.nuvycore.online:8443`).
   - Autenticação via JWT assinado com validade de 2 horas. Ao abrir com `?token=...`, define o cookie `mk_proxy_token` para que todos os assets estáticos (`/assets/*`), scripts e chamadas `/jsproxy` do RouterOS sejam roteados com transparência para `http://${vpn_ip}:80`.
   - Porta no firewall UFW: `8443/tcp`.

2. **Túneis TCP Winbox Remoto Sob Demanda (`backend/src/services/winboxProxy.js`):**
   - **Zero-Exposure por padrão:** Nenhuma porta pública de Winbox fica aberta continuamente.
   - **Abertura On-Demand:** Ao abrir o modal de "Acesso Remoto" no painel, o backend inicia o listener TCP sob demanda para aquele MikroTik específico (`20000 + último_octeto_vpn`).
   - **Heartbeat & Persistência de Sessão (Híbrido):** O frontend envia pulsos de heartbeat a cada 10 segundos enquanto o modal estiver aberto. Se o administrador conectar pelo aplicativo Winbox Desktop e fechar o navegador, o túnel detecta as conexões ativas (`activeSockets > 0`) e **mantém a conexão viva** até o usuário desconectar do Winbox.
   - **Auto-fechamento de Segurança:** Se o modal for fechado e não houver conexões ativas no Winbox por mais de 30 segundos, a porta pública é encerrada automaticamente.
   - **Botão Encerrar Manual:** O painel conta com o botão "Encerrar Acesso Agora" para trancar a porta imediatamente se desejado.

3. **Endpoints Backend (`wireguardController.js` & `wireguardRoutes.js`):**
   - `POST /api/wireguard/webfig-token`: gera o token JWT assinado para o peer selecionado.
   - `GET /api/wireguard/peer-diagnostics/:id`: realiza teste de conexão TCP em paralelo nas portas 80 (WebFig), 8291 (Winbox), 8728 (API) e 22 (SSH), medindo a latência real em ms.
   - `POST /api/wireguard/winbox-tunnel/enable`: abre/habilita a porta do Winbox sob demanda.
   - `POST /api/wireguard/winbox-tunnel/heartbeat`: renova o pulso de presença da interface web.
   - `POST /api/wireguard/winbox-tunnel/disable`: fecha a porta e encerra conexões imediatamente.
   - `GET /api/wireguard/winbox-tunnel/status/:vpnIp`: consulta se a porta está aberta e o número de conexões ativas.

4. **Interface Frontend (`Wireguard.jsx`):**
   - Botão **`🌐 Acesso Externo`** ao lado do badge `Online` de cada MikroTik na tabela de peers.
   - Modal completo de conexão remota:
     - Botão de 1-Clique **"Abrir WebFig em Nova Aba"** e campo de texto com link direto completo copiável.
     - Card de conexão Winbox Desktop com endereços públicos (`hotspot.nuvycore.online:2000X` e `179.198.123.89:2000X`), badge dinâmico de porta aberta sob demanda, monitor de sessões ativas e botão para encerrar o acesso manualmente.
     - Diagnóstico em tempo real com badges visuais de status para WebFig, Winbox, API e SSH, além de medidor de latência de ping (ms).

---

### Módulo de Analytics de Recorrência de Visitantes & Horários de Pico (2026-08-15)

**Objetivo:** Permitir aos estabelecimentos parceiros e provedores analisar a retenção de clientes, tempos médios de permanência e horários de maior fluxo para tomada de decisões comerciais.

**Arquitetura:**
1. **Backend (`analyticsController.js` & `analyticsRoutes.js`):**
   - `GET /api/analytics`: Retorna KPIs em tempo real (visitantes únicos, novos vs. recorrentes, tempo médio de conexão em minutos e total de sessões) e matriz de calor (Heatmap de 7 dias x 24 horas) baseada em `radacct` e `leads`.
   - Consulta otimizada agregando `radacct` por dia da semana e hora do dia (`DAYOFWEEK(acctstarttime)`, `HOUR(acctstarttime)`).
2. **Frontend (`Analytics.jsx` & `AdminLayout.jsx`):**
   - Painel visual com cards de métricas, gráfico de barras para Novos vs. Recorrentes, Heatmap interativo de horários de pico e botão rápido de retorno ao Dashboard principal.
   - Rota: `/admin/:empresaSlug/analytics`.

---

### Módulo de Pesquisa & Dashboard de Satisfação NPS via WhatsApp (2026-08-15)

**Objetivo:** Capturar o Net Promoter Score (NPS) de 0 a 10 diretamente dos visitantes via WhatsApp pós-conexão e consolidar a reputação do estabelecimento.

**Arquitetura:**
1. **Banco de Dados (`nps_respostas`):**
   - Tabela com `id`, `empresa_id`, `cliente_nome`, `cliente_telefone`, `nota` (0 a 10), `comentario`, `origem` e `criado_em`.
2. **Interceptação Automática no CRM Webhook (`crmController.js`):**
   - Ao receber mensagens numéricas (0 a 10) no WhatsApp de um visitante após disparo de pesquisa, o sistema salva automaticamente em `nps_respostas` e envia mensagem de agradecimento personalizada de acordo com a nota (Promotor >= 9, Neutro 7-8, Detrator <= 6).
3. **Backend (`npsController.js` & `npsRoutes.js`):**
   - `GET /api/nps`: Cálculo automático do NPS Score global (`% Promotores - % Detratores`), contadores e listagem paginada de avaliações.
4. **Frontend (`NpsDashboard.jsx`):**
   - Dashboard com termômetro de NPS (Zona de Excelência / Qualidade / Aperfeiçoamento / Crítica), gráfico de distribuição de notas e tabela de feedbacks com busca por cliente.
   - Rota: `/admin/:empresaSlug/nps`.

---

### Módulo de Login Social (Google / Facebook) no Captive Portal (2026-08-15)

**Objetivo:** Permitir autenticação rápida com 1 clique usando contas Google ou Facebook, capturando leads qualificados (nome, e-mail, foto e provedor) e liberando o acesso Wi-Fi instantaneamente.

**Arquitetura:**
1. **Banco de Dados:**
   - Adicionado tipo `'oauth'` em `empresa_configs.config_type` e template `'social'` em `portal_templates`.
   - Registro automático do portal `Login Social (Google / Facebook)` (`/portal/social`) para todas as empresas em `portais`.
2. **Backend (`socialAuthController.js` & `socialAuthRoutes.js`):**
   - `POST /api/auth/social/google`: Valida o Google ID Token / Access Token, salva o Lead na tabela `leads` (`origem = social_google`), cria/atualiza credencial RADIUS (`radcheck` / `radius_users`) e retorna credenciais com IP do gateway MikroTik para liberação instantânea.
   - `POST /api/auth/social/facebook`: Valida o Facebook Access Token via Graph API, grava o Lead (`origem = social_facebook`) e provisiona usuário no RADIUS.
   - `GET /api/auth/social/config`: Retorna Client IDs públicos para os botões do frontend.
3. **Frontend (`LoginSocial.jsx`, `ConfiguracaoSocialAuth.jsx`, `PortalEditor.jsx`):**
   - Página pública `/portal/social` com botões oficiais Google e Facebook, fallback para formulário manual e redirecionamento transparente para o gateway RouterOS.
   - Aba em **Configurações > Login Social (Google / Facebook)** com gerenciamento de chaves OAuth e gerador de script copy-paste de Walled Garden MikroTik (`*google.com`, `*googleapis.com`, `*facebook.com`, `*fbcdn.net`).

---

### Módulo de Fidelização & Cupons de Desconto no Balcão (2026-08-15)

**Objetivo:** Permitir aos estabelecimentos comerciais criar ofertas exclusivas para os visitantes do Wi-Fi e validar os vouchers diretamente no caixa físico.

**Arquitetura:**
1. **Banco de Dados (`cupons` e `cupons_resgatados`):**
   - `cupons`: Título da oferta, descrição, prefixo de código (ex: `ALMOCO`, `PROMO`), tipo de desconto (`porcentagem`, `valor_fixo`, `brinde`), regras, validade em dias e status.
   - `cupons_resgatados`: Códigos únicos anti-fraude gerados por cliente (ex: `ALMOCO-8X92`), vinculando nome, telefone, MAC e data de utilização no caixa.
2. **Backend (`cuponsController.js` & `cuponsRoutes.js`):**
   - `GET /api/cupons` & `POST /api/cupons`: CRUD de promoções com métricas de conversão.
   - `POST /api/cupons/validar`: Validador de Caixa — consulta a autenticidade do código e registra a baixa (`status = 'utilizado'`, `utilizado_em = NOW()`) em 1 clique.
   - `POST /api/cupons/gerar-publico`: Geração segura do código promocional pós-login.
   - `GET /api/cupons/resgates` & `GET /api/cupons/metricas`: Histórico de utilizações e taxa de conversão em vendas.
3. **Frontend (`Cupons.jsx` & `AdminLayout.jsx`):**
   - Interface com 3 abas: *🏷️ Ofertas & Promoções*, *⚡ Validador de Balcão (Caixa)* e *📋 Histórico de Resgates*.
   - Rota: `/admin/:empresaSlug/cupons`.

---

### Onboarding Self-Service, Trial SaaS de 7 Dias & Régua de WhatsApp (2026-08-15)

**Objetivo:** Automação completa do funil de entrada de novos clientes pelo site com 7 dias de degustação gratuita, provisionamento instantâneo e régua de notificações via WhatsApp.

**Arquitetura:**
1. **Página de Registro Público (`Registro.jsx`):**
   - Rota `/registro` com destaque de 7 dias grátis, máscaras de CNPJ/Telefone e cadastro de novas empresas.
2. **Provisionamento Instantâneo (`registroController.js`):**
   - Criação da empresa com `status_financeiro = 'trial'`, `trial_ate = DATE_ADD(NOW(), INTERVAL 7 DAY)` e `tipo_cobranca = 'fixo'`.
   - Criação do usuário administrador `owner`.
   - Geração automática de todos os **6 portais captive padrão** (`LGPD`, `Planos`, `LEAD`, `LEAD Passivo`, `Login Hotspot` e `Login Social`).
   - Disparo assíncrono de **Boas-Vindas no WhatsApp** contendo o link do painel (`/admin/{slug}`), login e a senha escolhida pelo usuário.
3. **Régua de Disparos de Expiração do Trial (`saasBillingJob.js`):**
   - Rotina diária que monitora empresas em trial:
     - **2 dias antes:** Envia WhatsApp lembrando que restam 2 dias de degustação e disponibiliza o link de assinatura.
     - **Último dia (hoje):** Alerta de encerramento do teste no WhatsApp.
     - **Pós-Trial (+7 dias):** Suspende a empresa (`status_financeiro = 'suspenso'`) e envia link para reativação imediata via PIX.
4. **Integração na Landing Page (`nuvycore.online`):**
   - Todos os CTAs principais da Landing Page (`/var/www/nuvycore/index.html`) apontam diretamente para `https://hotspot.nuvycore.online/registro`.

---

### Módulo de Login Social & Captura de Leads 1-Clique OAuth (2026-08-15)

**Objetivo:** Eliminar travamentos e caixas de diálogo nativas bloqueadas em navegadores de Captive Portal de celulares (Android/iOS Captive Portal Assistants) e reestruturar o fluxo para captura de leads 1-clique automática com integração total ao CRM e marketing.

**Arquitetura e Alterações:**
1. **Frontend (`LoginSocial.jsx`):**
   - **Remoção de `window.prompt()`:** Eliminação do uso de caixas de diálogo nativas do navegador, que retornavam `null` silenciosamente em WebViews restritas de celulares ao clicar em redes sociais.
   - **Fluxo OAuth 2.0 1-Clique Oficial:** Redirecionamento automático para `accounts.google.com` (Google) e `facebook.com` (Meta).
   - **Captura de Retorno Automática:** Leitura do `#access_token` no carregamento da página após o consentimento do cliente na rede social, disparando a validação assíncrona.
   - **Validação de Formato de Client ID:** Verificação no frontend que impede falhas se o usuário cadastrar um endereço de e-mail no campo do `google_client_id` em vez da chave API do Google Cloud (`.apps.googleusercontent.com`).
2. **Backend (`socialAuthController.js`):**
   - **Validação de Tokens OAuth:** Suporte a validação de `id_token` (`credential`) via Google TokenInfo API (`oauth2.googleapis.com/tokeninfo`) e `access_token` via Google UserInfo API (`googleapis.com/oauth2/v3/userinfo`).
   - **Validação Facebook Graph API:** Consulta direta ao endpoint `graph.facebook.com/me?fields=id,name,email,picture` usando o `access_token`.
   - **Captura Completa de Lead:** Gravação automática de `nome`, `email`, `telefone`, `mac`, `ip`, `origem` (`social_google` ou `social_facebook`) e `lgpd_aceite = 1` na tabela `leads`.
   - **Atualização de Leads Existentes:** Clientes recorrentes têm nome, e-mail e telefone atualizados automaticamente via `ON DUPLICATE KEY UPDATE`.
   - **Provisionamento RADIUS:** Limpeza de sessões anteriores e geração de credenciais RADIUS (`username = mac`, `password = mac`, plano social/LGPD) para liberação imediata da internet no MikroTik.
3. **Painel Admin (`ConfiguracaoSocialAuth.jsx`):**
   - **Validação Visual de Client ID:** Alerta instrutivo em tempo real quando um e-mail é preenchido por engano no campo de Google Client ID.
   - **Script de Walled Garden MikroTik:** Geração e cópia de comandos de liberação RouterOS para os hosts `*google.com`, `*googleapis.com`, `*gstatic.com`, `*facebook.com`, `*fbcdn.net`, `*connect.facebook.net`.

---

### Dashboard Executiva de Negócios & Marketing (2026-08-15)

**Objetivo:** Substituir a dashboard antiga focada em redes e configurações MikroTik por um Painel de Desempenho Executivo focado nos resultados do lojista (pessoas conectadas agora, leads capturados, faturamento de vendas de acesso e engajamento no WhatsApp).

**Arquitetura e Componentes:**
1. **Backend (`dashboardController.js`):**
   - **KPIs Principais:**
     - `conectados_agora`: Total de pessoas navegando no Wi-Fi em tempo real (consulta em `radacct` com `acctstoptime IS NULL` + fallback `mikrotiks.usuarios_ativos`).
     - `leads_hoje` / `leads_mes` / `leads_total`: Estatísticas da tabela `leads`.
     - `vendas_hoje` / `vendas_mes`: Faturamento bruto em R$ de planos de acesso Wi-Fi vendidos.
     - `disparos_whatsapp`: Total de automações e mensagens enviadas pelo CRM.
   - **Horários de Pico do Estabelecimento:** Agrupamento por hora (`HOUR(criado_em)`) das conexões da última semana em 24 barras para indicar o movimento do local.
   - **Canais de Captura:** Percentual de origem dos cadastros (`Google Sign-In`, `Facebook Login`, `Formulário Direto`).
   - **Tabela em Tempo Real:** Consulta aos 8 últimos visitantes cadastrados na tabela `leads`.
   - **Cupons Populares:** Consulta do total de resgates na tabela `cupons_resgatados`.

2. **Frontend (`Dashboard.jsx`):**
   - **Design System:** Compatibilidade estrita com `DESIGN.md` (cards brancos, `border-slate-200`, botões `#2563eb`).
   - **Ações Rápidas:** Atalhos de 1-clique no topo para *"Ver Leads Capturados"* e *"Criar Cupom / Promoção"*.
   - **Gráficos Visuais 24h:** Gráfico responsivo com efeito hover indicando os horários mais movimentados do estabelecimento.
   - **Últimos Clientes Conectados:** Tabela com inicial/avatar, Nome, WhatsApp/E-mail, origem colorida e data/hora.
   - **Trilha de Dicas & Novidades:** Card dinâmico em gradiente com dicas de onboarding (Conectar WhatsApp, Personalizar Portal, Criar Cupons) e anúncios de novidades do sistema (ex: Login Social 1-Clique OAuth).
   - **Persistência de Conclusão:** Botão *"✓ Entendi"* salva o ID da dica no `localStorage` (`dicas_dashboard_concluidas`), removendo a dica concluída para o usuário e exibindo parabéns ao finalizar todas.
   - **Rotas de Navegação:** Redirecionamento correto para `/admin/:slug/whatsapp`, `/admin/:slug/portais`, `/admin/:slug/cupons` e `/admin/:slug/configuracoes`.
   - **Card de Notificação de WhatsApp ao Vivo:** Exibe o número de mensagens de entrada não lidas (`direcao = 'entrada'`, `status = 'nao_lida'`), badge pulsante com alerta visual, prévia da mensagem e do remetente, e redirecionamento de 1-clique para o chat do CRM.
   - **Atualização Automática de Status (Leitura):** Ao abrir a conversa no chat do CRM (`getMensagensChat`), o sistema atualiza automaticamente o status das mensagens do cliente para `'lida'`, limpando o alerta da Dashboard em tempo real.

---

### Módulo IA Assistente de Atendimento no WhatsApp (n8n + OpenAI GPT-4o) (2026-08-15)

**Objetivo:** Permitir ao lojista configurar um assistente virtual com IA (GPT-4o) para responder dúvidas de clientes no WhatsApp 24/7, consultar dados dinâmicos da empresa (Horários, Wi-Fi, FAQs, Cupons/Promoções ativas) e suportar transbordo para atendimento humano.

**Arquitetura & Componentes:**

1. **Backend Controller (`crmIaController.js` & `crmRoutes.js`):**
   - `GET /api/crm/ia-config`: Retorna configurações cadastradas pela empresa em `empresa_configs` (`config_type = 'ia_atendimento'`).
   - `POST /api/crm/ia-config`: Salva configurações da IA (modo de resposta, delay, instrucoes de sistema, FAQs e numero de transbordo).
   - `GET /api/n8n/ia-contexto`: Endpoint público consumido pelo nó HTTP Request do n8n que compila dinamicamente o `system_prompt` para o GPT-4o contendo nome da empresa, FAQs oficiais, cupons válidos hoje e dados do visitante.

2. **Frontend UI Component (`WhatsApp.jsx` & `IaConfigTab.jsx`):**
   - **Navegação por Abas:** Alternância de 1-clique entre *📱 Conexão WhatsApp* e *🤖 IA Assistente (GPT-4o)*.
   - **Controles no Painel Admin:**
     - Toggle de ativação visual da IA (🟢 Ativa / ⚪ Desativada).
     - Cards de Seleção do Modo de Funcionamento (`sempre`, `fora_horario`, `delay` com campo de minutos de espera).
     - Alertas de Transbordo Humano (WhatsApp do Atendente/Gerente + Mensagem de Transferência).
     - Gerenciador Dinâmico de FAQs (adicionar/remover perguntas e respostas oficiais).
     - **Status do Workflow n8n:** `hotspot-ia-atendimento-v1` totalmente publicado, ativo no PostgreSQL do n8n com `activeVersionId` e `shared_workflow` registrados. As execuções no webhook `/webhook/webhook-ia-atendimento` registram `status: success` com 100% de precisão. → Contexto Hotspot API → IF Transbordo Humano → OpenAI GPT-4o-mini → Disparo WhatsApp + Alerta ao Atendente.

3. **Workflow n8n (`n8n/workflow-ia-atendimento.json`):**
   - Fluxo pronto para importação direta no n8n.
   - Nós integrados: Webhook Evolution API → Contexto Hotspot API → IF Transbordo Humano → OpenAI GPT-4o-mini → Disparo WhatsApp + Alerta ao Atendente.

---

### Proteção Anti-Abuso de Trial de 7 Dias & Acesso Remoto a MikroTiks (2026-08-16)

**1. Proteção Anti-Abuso no Cadastro (`registroController.js`):**
- **CNPJ/CPF Único:** Higienização de pontuação (`.`, `/`, `-`, espaços) e consulta à tabela `empresas`. Impede que a mesma empresa se recadastre com e-mails diferentes para renovar o trial de 7 dias.
- **WhatsApp / Telefone Único:** Comparação dos últimos dígitos do número de telefone informado na tabela `empresas`. Bloqueia reutilização de números de celular já cadastrados em testes anteriores.
- **Mensagens Amigáveis:** Retorno claro e instrutivo para o usuário entrar em contato com o suporte ou fazer login em sua conta existente.


**2. Acesso Remoto a Roteadores MikroTik via WireGuard VPN:**
- **Servidor WireGuard (`wg-easy` em Docker):** Sub-rede privada `10.8.0.0/24`.
- **Isolamento Multi-Tenant (`empresa_vpn_peers`):** Amarração obrigatória de `wg_client_id` com `empresa_id` para prevenir visualização/acesso entre empresas distintas.
- **Gerador Automático de Script RouterOS:** Produção de script de 3 linhas do RouterOS v7 (`/interface wireguard`, `/interface wireguard peers`, `/ip address`) para importação rápida em 1-clique.
- **Diagnóstico em Tempo Real (`checkPort`):** Varredura paralela das portas TCP de WebFig (80), Winbox (8291), API (8728) e SSH (22) com medição de latência em milissegundos.
- **Acesso Seguro Distribuído:** Proxy HTTPS temporário para WebFig com tokens JWT e túneis dinâmicos com controle de inatividade (*heartbeat*) para acesso direto via aplicativo Winbox.

---

### Sistema de Backup Geral Completo & Rotação (2026-08-17)

**1. Motor de Backup Comprimido (`backupService.js`):**
- **Dump MySQL:** `mysqldump` completo comprimido com `gzip` (`database_*.sql.gz`).
- **Arquivos & Configurações:** Compactação da pasta de código, workflows do n8n (`/n8n`), uploads de mídia (`/backend/uploads`) e arquivo `.env`.
- **Arquivo Único `.tar.gz`:** Armazenado no diretório seguro `/var/backups/hotspot/`.
- **Rotina Automática Diária (Cronjob):** Executada **todas as madrugadas às 03:00 AM**.
- **Política de Retenção (15 dias):** Exclusão automática de backups mais antigos que 15 dias.
- **Notificação em Tempo Real no WhatsApp:** Disparo de alerta no WhatsApp do Super Admin (`5567992553089`) informando tamanho, tempo de execução e status.

**2. Painel Super Admin Web (`/super/backups`):**
- **Download 1-Clique:** Botão para baixar arquivos `.tar.gz` diretamente para o computador.
- **Estatísticas:** Cards exibindo agendamento (03:00 AM), tempo de retenção (15 dias) e tamanho total em MB/GB.
- **Gerar Backup Agora:** Botão manual com feedback em tempo real.

---

### Suite Completa de E-mail Automation & Marketing (2026-08-17)

**Objetivo:** Implementar a suíte completa de automação de e-mails para o NuvyCore SaaS, cobrindo recuperação de senha por link seguro, boas-vindas B2B para novos provedores, boas-vindas B2C para visitantes do Wi-Fi e disparo de campanhas em massa de e-mail marketing pelo CRM.

**Arquitetura & Componentes:**

1. **Recuperação de Senha (Link Seguro):**
   - **Backend:** `POST /api/auth/solicitar-reset-senha` & `POST /api/auth/redefinir-senha` (`authController.js` e `Admin.js`).
   - **Mecanismo:** Token criptográfico temporário de 32 bytes (`crypto.randomBytes(32)`), expiração de 30 minutos (`DATE_ADD(NOW(), INTERVAL 30 MINUTE)`). Busca de usuário com `LOWER(TRIM(a.email))`.
   - **Frontend:** Rota `/redefinir-senha` no `App.jsx` com interface em `RedefinirSenha.jsx`.

2. **E-mail de Boas-Vindas B2C no Wi-Fi (Multi-Portal):**
   - **Service:** `checarEDispararEmailWifi` e `enviarEmailBoasVindasWifi` em `emailService.js`.
   - **Canais Integrados:** Form em Captive Portal Lead (`leadController.js`), LGPD (`lgpdController.js`) e Login Social Google/Facebook (`socialAuthController.js`).
   - **Configuração no Painel:** Interface visual no `PortalEditor.jsx` para ativar/desativar e configurar Assunto, Corpo e Cupom de Desconto.
   - **Regra Estrita de Exibição do Cupom:** O bloco visual de cupom de desconto só é renderizado no HTML se o campo `email_welcome_coupon` contiver um texto válido. Se estiver em branco, o e-mail é entregue limpo sem qualquer menção a cupom.

3. **Disparo em Massa de E-mail Marketing no CRM:**
   - **Backend:** `POST /api/crm/disparar-email` (`crmController.js` & `emailService.js`).
   - **Lote Inteligente:** `enviarEmailMarketingBatch` com suporte tanto a listas de e-mails em texto puro quanto objetos `{ email, nome }`.
   - **Frontend:** Botão *"✉️ Disparar E-mail Marketing"* e modal de composição na aba Contatos do `Crm.jsx`.

4. **Infraestrutura SMTP:**
   - **Servidor:** Hostinger (`smtp.hostinger.com`), porta 465 (SSL), remetente `contato@nuvycore.online`.
   - **Persistência:** Tabela `empresa_configs` (`config_type = 'backup_email'`).

---

### Atualização Multi-Vendor Gateways (Omada/UniFi), RADIUS v2 & Segurança (2026-08-17)

**Objetivo:** Expandir o NuvyCore SaaS para controlar equipamentos TP-Link Omada e Ubiquiti UniFi, modernizar a contagem do FreeRADIUS baseada em `liberado_em` e relógio do servidor, e aplicar endurecimento de segurança com rate limits e compliance LGPD.

**Arquitetura & Componentes:**

1. **Drivers Multi-Vendor (`backend/src/gateways/`):**
   - `GatewayDriver.js` (Interface base).
   - `MikrotikDriver.js` (RouterOS / RADIUS).
   - `OmadaDriver.js` (TP-Link Omada Controller API / External RADIUS).
   - `UnifiDriver.js` (Ubiquiti UniFi Controller API).
   - `index.js` (Factory `getGatewayDriver`).
   - `portalVendor.js` (Contextos de redirect e roteamento por fabricante).

2. **FreeRADIUS Cumulativo v2:**
   - Query do `sqlcounter` atualizada para filtrar sessões a partir de `radius_users.liberado_em`.
   - `queries.conf` ajustado para utilizar o relógio do servidor (`event_timestamp_epoch = %l`), prevenindo estornos por relógio incorreto no roteador.

3. **Migrações de Banco (024 a 031):**
   - `024`: `radius_users.liberado_em` + índice.
   - `025`: `connection_logs.acctuniqueid` UNIQUE + cursor `last_synced_at`.
   - `026`: Grupo *"Acesso Completo"* em `grupos_permissao` + autorrolagem de admins.
   - `027`: Colunas de controle multi-vendor em `mikrotiks` (`tipo`, `controller_url`, `omadac_id`, `api_user`, `api_pass`, `api_key`, `verify_tls`).
   - `028`: `usuario` e `senha` NULLABLE em `mikrotiks`.
   - `029`: `leads.lgpd_termo` (snapshot do termo aceito).
   - `030`: Tabela `portal_contexts` para persistência de redirects Omada/UniFi.
   - `031`: Dedup e índice UNIQUE em `radius_users.username`.

4. **Segurança & UI:**
   - Middleware `rateLimiters.js` com `express-rate-limit` (bruteforce protection).
   - Middleware `downloadToken.js` para download temporário seguro.
   - Componente `GatewayWizard.jsx` no frontend para cadastro em 3 passos.
   - Preservação total de 100% dos fluxos de e-mail de boas-vindas, backups e landing page.

---

### Dashboard Executivo Super Admin 360° & Trial Tracker (2026-08-17)

**Objetivo:** Transformar o painel do Super Admin em uma Central de Operações Executiva (NOC + SaaS ERP), permitindo o acompanhamento em tempo real de empresas clientes em período de teste (Trial Tracker), métricas de infraestrutura multi-vendor (MikroTik, Omada, UniFi), receita recorrente (MRR) e engajamento global de leads.

**Arquitetura & Componentes:**

1. **Backend API (`saasFaturaController.js`):**
   - **Endpoint:** `GET /api/saas-faturas/stats` estendido com métricas consolidadas.
   - **Trial Tracker (`empresas_trial`):** Query de busca de empresas com `status_financeiro = 'trial'`, calculando dinamicamente o campo `dias_restantes` com base em `DATEDIFF(trial_ate, NOW())`.
   - **NOC Multi-Vendor (`gateways`):** Contagem agregada de equipamentos ativos por fabricante (`mikrotik`, `omada`, `unifi`).
   - **Leads & Conexões Globais:** Contagem em tempo real de usuários online no Wi-Fi (`radacct.acctstoptime IS NULL`) e volume total de leads capturados nos últimos 30 dias.

2. **Frontend Super Dashboard (`SuperDashboard.jsx`):**
   - **Cards Executivos de KPI:** MRR (Receita Recorrente), Empresas Cadastradas (Ativas, Trial, Suspensas), Equipamentos NOC Multi-Vendor e Conexões/Leads Globais.
   - **Widget Trial Tracker (Empresas em Teste):** Grid interativo com contagem regressiva de dias restantes, barra de progresso visual do teste grátis, alertas visuais para vencimento iminente (<= 3 dias) e ação rápida para entrar no painel da empresa em 1-clique (*Impersonate Mode*).
   - **Tabela com Abas de Filtro:** Alternância instantânea entre `Todas`, `⚡ Em Teste`, `🟢 Adimplentes` e `🔴 Suspensas`.

3. **Banner Executivo no Dashboard Principal (`Dashboard.jsx`):**
   - **Inclusão Direta:** Renderização de banner exclusivo no topo do Dashboard (`/admin/:slug`) quando o usuário logado for **Super Admin**.
   - **Acesso Rápido ao SaaS:** Exibição das principais métricas de teste grátis e botão de atalho para o Painel Global Super Admin.
   - **Isolamento de Tenants:** Garante que os estabelecimentos clientes continuem visualizando apenas suas próprias métricas de Wi-Fi e leads, mantendo 100% de isolamento multi-tenant.

---

### Auditoria Visual Completa & Componentização do Tema ReceitaNet ERP (2026-08-17)

**Objetivo:** Eliminar 100% dos resíduos do tema escuro legado (dark mode/GitHub-style) e inconsistências visuais em todas as telas administrativas (`/admin/` e `/super/`), estabelecendo um Design System unificado e componentes reutilizáveis baseados no **Tema ReceitaNet ERP**.

**1. Criação dos Componentes Compartilhados (`/frontend/src/components/ui/`):**
- **`PageHeader.jsx`**: Cabeçalho de página padronizado com ícone azul (`#2563eb`), título `text-2xl font-extrabold text-slate-900`, subtítulo `text-slate-500` e slot de botões de ação (`actions`).
- **`Card.jsx`** (`CardHeader`, `CardBody`, `CardFooter`): Superfícies brancas com borda `border-slate-200`, cantos `rounded-2xl` e sombra sutil `shadow-sm`.
- **`PrimaryButton.jsx`**: Botão primário oficial em azul `#2563eb` (`hover:bg-blue-700`), cantos `rounded-xl`, sombra de foco e indicador de `loading`.
- **`SecondaryButton.jsx`**: Botões secundários com suporte a variantes `outline`, `subtle`, `ghost` e `danger`.
- **`Modal.jsx`**: Janela modal com backdrop escurecido suave (`backdrop-blur-sm`), container `rounded-2xl` e slots para cabeçalho, corpo e rodapé.
- **`StatusBadge.jsx`**: Badges semânticos com cantos `rounded-lg` e indicador de status (ponto luminoso).
- **`index.js`**: Barrel export para importação facilitada: `import { PageHeader, Card, PrimaryButton, ... } from "@/components/ui"`.

**2. Arquivos Refatorados por Severidade (20 Arquivos):**

* **Rodada 1 (Severidade ALTA - Resíduos Escuros Críticos):**
  1. `HotspotWizard.jsx`: Substituído container escuro por modal claro `rounded-2xl`, inputs `#f1f5f9` e botões primários.
  2. `ConfiguracaoMercadoPago.jsx`: Envolvido em `<Card>`, inputs claros e botões padronizados.
  3. `ConfiguracaoEfi.jsx`: Envolvido em `<Card>`, inputs do tema claro e botões primários.
  4. `AdminLayout.jsx`: Modal de suspensão de tenant e faixas de aviso migrados para o tema claro com preservação total de permissões.

* **Rodada 2 (Severidade ALTA pendentes + MÉDIA):**
  5. `pages/admin/Usuarios.jsx`: `<PageHeader>`, `<Card>`, `<PrimaryButton>`, `<SecondaryButton>` e `<Modal>`.
  6. `pages/admin/UsuariosRadius.jsx`: `<PageHeader>`, `<Card>`, `<PrimaryButton>` azul, `<SecondaryButton>` e `<Modal>`.
  7. `pages/admin/Sessoes.jsx`: `<PageHeader>`, `<Card>` e grid `max-w-7xl mx-auto`.
  8. `pages/admin/Logs.jsx`: `<PageHeader>`, tabs cápsula, caixas de erro `bg-red-50 text-red-700`.
  9. `pages/admin/Configuracoes.jsx`: `<PageHeader>`, abas cápsula, `<Modal>` e inputs claros.
  10. `pages/admin/GruposPermissao.jsx`: `<PageHeader>`, `<Card>`, `<PrimaryButton>` azul, `<SecondaryButton>` e `<Modal>`.
  11. `pages/admin/Campanhas.jsx`: Células `px-6 py-3.5`, `<PrimaryButton>`, `<StatusBadge>` e `<Modal>`.
  12. `pages/admin/CampanhaEditor.jsx`: `<PageHeader>`, `<Card>` e botões padronizados.
  13. `pages/admin/Analytics.jsx`: `<PageHeader>`, conversão de card roxo para `bg-blue-50 text-[#2563eb]`, lógica matemática preservada.
  14. `pages/super/AtualizarSistema.jsx`: Cantos de 4px migrados para `rounded-xl` e `rounded-2xl`.

* **Rodada 3 (Severidade BAIXA - Acabamento e Polimento):**
  15. `pages/admin/NpsDashboard.jsx`: `<PageHeader>`, distribuição em `<Card>`, badges de notas `rounded-lg`.
  16. `pages/super/RelatoriosSaas.jsx`: Removidos gradientes roxos/índigo para `bg-white border-slate-200` e destaque `bg-blue-50 border-blue-200`, `shadow-sm`.
  17. `pages/super/Empresas.jsx`: Padding `p-4 md:p-8`, `<PageHeader>`, `<PrimaryButton>`, cards com `shadow-sm` e badges claros.
  18. `pages/admin/Crm.jsx`: Botões azuis `#2563eb` `rounded-xl`, mantendo 100% do polling (3s), chat ao vivo e auto-scroll intocados.
  19. `pages/admin/Mikrotiks.jsx`: `<PageHeader>`, `<Card><CardBody noPadding>`, `<PrimaryButton>`, `<SecondaryButton>` e `<Modal>`.
  20. `pages/admin/Leads.jsx`: `<PageHeader>`, abas cápsula, `<Card>`, exportação CSV com `<SecondaryButton variant="outline">` e `<Modal>`.

---

### Rebranding NuvyCore, Padronização Visual & Estratégia de Planos Comercial SaaS (2026-08-17)

**1. Rebranding Completo (Forum Telecom → NuvyCore):**
- Substituição de todas as ocorrências residuais de "Forum Telecom" no frontend por "NuvyCore".
- Atualização do título da aba do browser (`NuvyCore - Gestão de Hotspot Wi-Fi SaaS`), favicon e logo (`/nuvycore.svg`).
- Limpeza dos links e rodapé no `AdminLayout.jsx`.

**2. Redesign dos Banners no Dashboard (`Dashboard.jsx`):**
- **Banner Super Admin (SaaS Tracker):** Reformulação do container escuro em gradiente azul-escuro para um card em **Branco Puro** (`bg-white border-slate-200 shadow-sm rounded-2xl p-6`), com barra superior em gradiente sutil e mini-cards de métricas em tons pastéis leves (`bg-amber-50`, `bg-emerald-50`, `bg-blue-50`, `bg-purple-50`).
- **Banner de Dicas & Novidades:** Migração do container escuro para gradiente claro suave (`from-blue-50/90 via-slate-50 to-indigo-50/90 border-blue-200`), mantendo 100% da lógica de persistência (`dicas_dashboard_concluidas`).
- **Validação de Build:** `npm run build` gerado em 7.50s com 0 erros.

**3. Estrutura Comercial & Planos SaaS NuvyCore (Implementado):**
- **Migration `024_saas_planos_oficiais.js`:** Adicionadas colunas `destaque` (TINYINT) e `recursos` (TEXT/JSON) na tabela `saas_planos`.
- **4 Planos Comerciais Oficiais:**
  1. **Plano Start (R$ 97,00/mês):** 1 Roteador MikroTik, 1 Portal Captivo, Leads & LGPD Ilimitada, Login Social Google/Facebook, Suporte via WhatsApp.
  2. **Plano Pro (R$ 197,00/mês - Mais Popular):** Até 3 Roteadores, Até 5 Portais, CRM com Automações WhatsApp, Vendas Wi-Fi com PIX Automático, E-mail Marketing, Suporte Prioritário. Destacado visualmente com badge.
  3. **Plano Enterprise (R$ 397,00/mês):** Até 10 Roteadores, Portais Ilimitados, Gestão Multi-Filiais / Franquias, Múltiplos Grupos de Permissão, Suporte VIP 24/7.
  4. **Plano Revenue Share (Comissão):** R$ 0,00 fixo + 10% sobre vendas de pacotes Wi-Fi, 5 Roteadores, 10 Portais.
- **Travas & Enforcement de Limites no Backend:**
  - `mikrotikController.js`: Bloqueio automático (`403 Forbidden`) ao tentar cadastrar novos roteadores além da cota do plano.
  - `portalController.js`: Bloqueio automático (`403 Forbidden`) ao tentar criar novos portais além da cota do plano.
  - `saasPlanoController.js`: Suporte a `destaque`, `recursos` e ordenação inteligente por preço.
  - `empresaController.js`: Retorno de `limite_mikrotiks`, `limite_portais` e `total_portais` em `listarEmpresas`.
- **Refatoração Visual de `SaasPlanos.jsx`:**
  - Migrado integralmente para o Design System ReceitaNet ERP (`PageHeader`, `Card`, `PrimaryButton`, `SecondaryButton`, `Modal`, `StatusBadge`).
  - Cards claros com destaque visual no Plano PRO (`ring-2 ring-blue-500/20`), bloco de preço destacado e checklist com ícones `✓`.
  - Modal moderno para criação e edição com campo multilinhas para benefícios e toggle de destaque.
- **Validação de Build:** `npm run build` gerado com 0 erros e Nginx/PM2 recarregados.

**4. Webhooks Outbound Hub & Integração Externa (Implementado):**
- **Migration `032_webhooks_outbound.js`:** Criadas as tabelas `empresa_webhooks` e `empresa_webhook_logs`.
- **Serviço Central & HMAC (`webhookOutboundService.js`):** Envio assíncrono não bloqueante via axios com timeout de 5s, cabeçalho de assinatura criptográfica `X-Webhook-Signature: sha256=...` (HMAC) e registro automático de logs.
- **Gatilhos Injetados:** Conexão/Cadastro de leads (`leadController.js`), validação/baixa de cupons no caixa (`cuponsController.js`) e aprovação de pagamentos PIX de vouchers (`pagamentoController.js`).
- **Interface Webhooks (`Webhooks.jsx`):** Construída com Design System ReceitaNet ERP, incluindo KPIs de volume/sucesso, botão para teste de ping em 1-clique e modal para inspeção dos últimos 50 payloads/respostas HTTP.
- **Menu & Rotas:** Rota `/admin/:empresaSlug/webhooks` registrada em `App.jsx` e item no menu lateral de `AdminLayout.jsx`.
- **Validação:** Teste automatizado ponta a ponta executado com 100% de sucesso e build Vite compilado com 0 erros.

**5. Suporte Multi-Filiais & Gestão de Redes / Franquias (Implementado):**
- **Migration `033_empresas_filiais.js`:** Adicionadas colunas `matriz_id`, `tipo_unidade` (matriz, filial, independente), `cidade`, `estado`, `endereco` e `responsavel_nome` em `empresas`.
- **Backend & Auto-Provisionamento (`filialController.js`):** Endpoints `/api/filiais` para listagem hierárquica, métricas consolidadas em tempo real, auto-vínculo de admins criadores em `admin_empresas` e criação de portal padrão.
- **Interface Visual (`Filiais.jsx`):** Construída com Design System ReceitaNet ERP, contendo 4 KPIs da rede, listagem de unidades e modal de cadastro.
- **Seletor no Header (`AdminLayout.jsx`):** Dropdown moderno de unidades com identificação 🏢 Matriz / 🏪 Filial e alternância em 1-clique.
- **Validação:** Testes automatizados executados com 100% de sucesso e build Vite concluído sem erros.

**6. Notificação de Vendas & Alertas em Tempo Real para o Dono (Implementado):**
- **Serviço Central (`ownerAlertsService.js`):** Envio assíncrono de notificações no WhatsApp (Evolution API) e Telegram Bot para vendas aprovadas de pacotes Wi-Fi, alertas de roteador/equipamento offline e resumos diários.
- **Gatilhos em Tempo Real:** Injetado em `pagamentoController.js` na aprovação e liberação imediata do PIX.
- **Configuração no Painel (`empresaConfigController.js`):** Suporte ao tipo `alertas_dono` e rota `POST /api/empresa-config/alertas-dono/testar` para validação imediata de entrega.
- **Interface Visual (`ConfiguracaoAlertasDono.jsx`):** Integrada na aba *Alertas do Proprietário* de `Configuracoes.jsx` com switches visuais e botão de teste de disparo.
- **Validação:** Mensagem real de teste disparada com sucesso via WhatsApp direto e build Vite gerado com 0 erros.

**7. PWA - Progressive Web App / Aplicativo Instalável no Celular (Implementado):**
- **Ícones Oficiais:** Gerados com sharp em 192x192, 512x512, apple-touch-icon e maskable a partir do vetor `nuvycore.svg`.
- **Manifest & Service Worker (`manifest.json` / `sw.js`):** Configurado com display standalone, tema `#2563eb`, atalhos de 1-toque (Validar Cupons, Chat/Leads e Dashboard) e estratégias de cache Stale-While-Revalidate e Network-First com suporte offline.
- **HTML Host (`index.html`):** Meta tags para iOS/Apple Web App e registro automático do Service Worker.
- **Componente de Instalação (`PwaInstallPrompt.jsx`):** Banner inteligente no padrão ReceitaNet ERP com captura do evento nativo `beforeinstallprompt` e guia passo a passo para iPhone/Safari.
- **Validação:** Endpoints testados com HTTP/2 200 OK e build Vite concluído com 0 erros.

**8. Gerador de Plaquinhas de Mesa em PDF com QR Code (Implementado):**
- **Interface & Live Preview (`GeradorPlaquinhas.jsx`):** Customizador em tempo real de SSID, senhas, frases de instrução, logotipo e cores.
- **Tipos de QR Code:** Conexão Wi-Fi Direta (WPA2/Sem Senha) e Link Direto do Portal Captivo.
- **3 Modelos Visuais:** Clean Minimalist, Modern Dark Tech e Premium Gold.
- **4 Formatos de Impressão:** A4 Cartaz, A5 Display de Mesa, Totem Acrílico 10x15cm e Mini Adesivo 7x7cm.
- **Exportação & Impressão:** Isolamento `@media print` para exportação limpa e vetorizada em PDF 300+ DPI.
- **Rotas & Menu:** Rota `/admin/:empresaSlug/plaquinhas` e menu lateral em `AdminLayout.jsx`.

**9. Arquitetura SaaS Modular e UI Consistency (Agosto 2026 - Concluído):**
- **Isolamento via Módulos:** Criação das colunas `mod_vpn`, `mod_hotspot`, etc. em `saas_planos` e injeção destas propriedades no `user` via JWT, criando um Controle de Acesso Modular.
- **Builder Financeiro:** Super Admin agora pode montar planos "A La Carte" através dos novos toggles visuais construídos no `SaasPlanos.jsx`.
- **Dynamic Sidebar UI:** Menu esconde automaticamente opções irrelevantes (`Acesso Remoto`, `Dash Hotspot`, `CRM`, `Vendas`) caso o plano SaaS atual do cliente não possua os respectivos módulos.
- **Padronização Global SaaS:** 10 telas órfãs foram empacotadas no `AdminLayout` e os links obsoletos de `⬅ Voltar` foram pulverizados, tornando o design fluidamente escalável.

**10. Suíte de Expansão Estratégica SaaS (Agosto 2026 - Concluído):**
- **Vouchers em Lote & PDV Físico Térmico (58mm/80mm):** Migration `034_vouchers_lote.js`, `voucherController.js`, `voucherRoutes.js` e interface `Vouchers.jsx`. Suporta geração em massa com códigos curtos alfanuméricos (ex: `WIFI-8X92`), provisionamento no FreeRADIUS (`radcheck`, `radreply`, `radius_users`) e impressão em mini-impressoras térmicas de cupom com QR Code individual e corte pontilhado.
- **Wi-Fi Commerce & Cardápio Digital Pós-Login:** Migration `035_cardapio_digital.js`, `cardapioController.js`, `cardapioRoutes.js`, painel `CardapioAdmin.jsx` e página mobile-first `CardapioPublico.jsx` na rota `/cardapio/:empresaSlug`. Permite fotos de produtos, destaques, cálculo automático de carrinho e envio de pedidos direto no WhatsApp do lojista.
- **Programa de Fidelidade & Gamificação de Frequência:** Migration `036_fidelidade_regras.js`, `fidelidadeController.js`, `fidelidadeRoutes.js` e interface `Fidelidade.jsx`. Contabiliza automaticamente a recorrência de visitas do visitante ao Wi-Fi e dispara cupons/brindes exclusivos no WhatsApp ao atingir metas configuradas (ex: 5ª visita).
- **Portal Captivo Multi-Idioma Automático (i18n):** Motor `i18n.js` com suporte a Português (🇧🇷), Inglês (🇺🇸) e Espanhol (🇪🇸), auto-detecção via `navigator.language` e seletor `LanguageSelector.jsx` integrado nos portais públicos.
- **Portal do Titular LGPD & Direito ao Esquecimento 1-Clique:** Migration `037_lgpd_titular_logs.js`, `lgpdTitularController.js`, `lgpdTitularRoutes.js` e interface pública `PortalTitularLgpd.jsx` (`/privacidade/:empresaSlug`). Permite ao titular validar titularidade via OTP no WhatsApp, consultar extrato de dados coletados e solicitar a anonimização/exclusão definitiva com emissão de Certificado Oficial e hash SHA-256 (Art. 18 LGPD).

---

### Roadmap de Entregas: 100% Concluído e Operacional!
Todos os itens priorizados foram implementados e validados:
1. ✅ **Webhooks Outbound Hub** (Disparos externos para CRMs)
2. ✅ **Suporte Multi-Filiais & Gestão de Redes / Franquias** (Alternância rápida de unidades)
3. ✅ **Notificação de Vendas & Alertas em Tempo Real para o Dono** (WhatsApp/Telegram)
4. ✅ **PWA (Progressive Web App)** (Aplicativo instalável no celular/desktop)
5. ✅ **Gerador de Plaquinhas de Mesa em PDF com QR Code** (Displays de mesa e totens)
6. ✅ **SaaS Modular Ocultação Flexível (Planos A La Carte)** (Construtor de Planos Super Admin e UI Sidebar Dinâmica)
7. ✅ **Vouchers em Lote & PDV Físico Térmico** (Mini-impressoras 58mm/80mm)
8. ✅ **Wi-Fi Commerce & Cardápio Digital Pós-Login** (Vitrine e pedidos no WhatsApp)
9. ✅ **Programa de Fidelidade & Gamificação** (Recompensas automáticas por visitas)
10. ✅ **Portal Captivo Multi-Idioma Automático** (🇧🇷 PT / 🇺🇸 EN / 🇪🇸 ES)
11. ✅ **Portal do Titular LGPD & Direito ao Esquecimento** (Autonomia e conformidade ANPD)
12. ✅ **Assinatura Recorrente no Cartão de Crédito & Débito Automático** (Tokenização PCI-DSS e cobrança mensal)

---

### 📋 Plano Mestre de Auditoria & QA em Tempo Real:
- O checklist completo com os 22 testes funcionais, de rede MikroTik, gateways de pagamento e stress está documentado em [`QA_AUDIT_PLAN.md`](file:///var/www/hotspot/.agents/memory/QA_AUDIT_PLAN.md).
- Ponto de parada atual: pronto para execução a partir do teste **`MTK-01`** (Autenticação via RADIUS).

---

### 📍 PONTO DE PARADA ATUAL (CHECKPOINT 20/08/2026):
1. **Módulo DRE & Inteligência Financeira (Empresas + SaaS Global Super Admin - CONCLUÍDO 20/08/2026):**
   - **Migration `043_despesas_operacionais.js`:** Tabela `despesas_operacionais` (id, empresa_id, descricao, categoria, tipo, valor, data_competencia, data_vencimento, data_pagamento, recorrente, status, observacoes).
   - **Backend & Cálculos DRE:** [`financeiroController.js`](file:///var/www/hotspot/backend/src/controllers/financeiroController.js) e [`financeiroRoutes.js`](file:///var/www/hotspot/backend/src/routes/financeiroRoutes.js) com apuração completa de:
     - Receita Bruta (Vendas Wi-Fi, Faturas SaaS, Comissões Revenue Share).
     - Deduções e Estornos.
     - Receita Líquida.
     - Custos e Despesas Operacionais por Categoria (Fixa, Variável, Pessoal, Marketing, Infraestrutura, Impostos).
     - Margem de Contribuição e Lucro Líquido do Exercício.
   - **Interfaces DRE:**
     - [`DreFinanceiro.jsx`](file:///var/www/hotspot/frontend/src/pages/admin/DreFinanceiro.jsx): DRE no nível da Empresa/Tenant com filtros de período (mês/ano), 4 KPIs, tabela estruturada, gráfico de pizza de despesas e modal para lançamento rápido de despesas operacionais.
     - [`SuperDre.jsx`](file:///var/www/hotspot/frontend/src/pages/super/SuperDre.jsx): DRE consolidado do SaaS Global com ranking de faturamento por tenant e faturamento acumulado da plataforma.
   - **Navegação & Permissões:** Registrado na sidebar [`AdminLayout.jsx`](file:///var/www/hotspot/frontend/src/components/admin/AdminLayout.jsx) com exceção de permissão `'dre': null` para acesso universal pelos administradores.

2. **Padronização Global de Botões & Design System Precision Light (CONCLUÍDO 20/08/2026):**
   - **Especificação Oficial de Botões:**
     - Raio de curvatura: `border-radius: 6px;` (`rounded-md`) — cantos elegantes e ligeiramente curvados (conforme imagem de referência do Dashboard).
     - Botão Primário: Azul Royal `#2563eb`, hover `#1d4ed8`, texto/ícones brancos, peso `font-600`, sombra sutil `shadow-2xs`.
     - Botão Secundário: Fundo branco `#ffffff`, borda fina `#e2e8f0`, texto grafite `text-slate-700`, ícone azul `#2563eb`.
     - Botão de Perigo / Cancelar: Fundo `#fef2f2`, borda `#fecaca`, texto `text-red-700`.
   - **Componente Base Reutilizável:** [`Button.jsx`](file:///var/www/hotspot/frontend/src/components/ui/Button.jsx) integrado com [`PrimaryButton.jsx`](file:///var/www/hotspot/frontend/src/components/ui/PrimaryButton.jsx) e [`SecondaryButton.jsx`](file:///var/www/hotspot/frontend/src/components/ui/SecondaryButton.jsx).
   - **Propagação Completa:** 100% dos botões em 30+ páginas e componentes (incluindo `WhatsApp.jsx`, `Mikrotiks.jsx`, `Wireguard.jsx`, `Dashboard.jsx`, `GatewayWizard.jsx`, etc.) foram auditados, convertidos e compilados com sucesso no build de produção.

3. **Correção de Tela Branca & Auditoria de Importações (CONCLUÍDO 21/08/2026):**
   - **`Planos.jsx`:** Corrigido import ausente de `PageHeader` (`import { PageHeader } from "@/components/ui"`), eliminando erro de runtime `ReferenceError: PageHeader is not defined` que causava tela branca ao acessar o menu Planos.
   - **Varredura Completa de JSX:** Executado scan automatizado em todos os componentes `.jsx` do frontend para certificar que 100% dos elementos e tags estejam importados corretamente.
   - **Robustez dos Portais Captivos Públicos:**
     - `CadastroLGPD.jsx` & `i18n.js`: Adicionados fallbacks estruturados para chaves de tradução (`footer_text`, `connecting`, etc.) em PT/EN/ES e prevenção de duplo envio.
     - `LgpdAuto.jsx`: Substituído `alert()` por interface nativa com feedback de erro amigável e tratamento robusto dos parâmetros `aceite` e `empresa_id`.
     - `Pagamento.jsx` & `PlanosCliente.jsx`: Tratamento de valores nulos em `(plano.valor || 0)` e formatação monetária em padrão brasileiro.

4. **Auditoria Completa do Sistema & Segurança (CONCLUÍDO 21/08/2026):**
   - **Passo 1 (Mercado Pago Cartão B2C):** Higienizado payload em `pagamentoController.js` removendo `additional_info.ip_address` e `payer.first_name` (enviando estritamente `payer.email`), blindando contra o erro `cc_rejected_high_risk`.
   - **Passo 2 (Isolamento Multi-Tenant):** Blindadas todas as queries, subqueries e JOINs de `cuponsController.js` e `fidelidadeController.js` com `AND empresa_id = ?` parametrizado. Corrigida coluna `codigo_unico` no registro de recompensas.
   - **Passo 3 (FreeRADIUS Integridade & Cleanup):** Auditada base do RADIUS (0 órfãos existentes para os 21 usuários ativos). Criado script transacional seguro em `backend/jobs/limpezaRadiusOrfaos.js`.
   - **Passo 4 (Workflows n8n):** Parametrizadas variáveis dinâmicas de ambiente (`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`, `HOTSPOT_API_URL`) em `n8n/workflow-saas-pix.json`.
   - **Passo 5 (Design / UI Precision Light):** Padronizados botões para `rounded-md` (6px) e paleta corporativa em `EmpresasAdmin.jsx`, `PortalEditor.jsx`, `Crm.jsx`, `SuperDashboard.jsx`, `Backups.jsx` e `PlanosCliente.jsx`.
   - **Status Geral:** Relatório consolidado em [`AUDITORIA-2026-08-21.md`](file:///var/www/hotspot/AUDITORIA-2026-08-21.md). Backend online no PM2, frontend 100% compilado e Nginx operacional.

5. **Configuração de Open Graph & Banner de Prévia para Redes Sociais (CONCLUÍDO 22/08/2026):**
   - **Banner Oficial:** Gerado e implantado `og-preview.png` (e `.jpg`) em alta resolução (1376x768 / 1200x630 padrão 300 DPI) com identidade visual Nuvy Pro Precision Light em `/var/www/nuvycore/` e `/var/www/hotspot/frontend/public/` e `dist/`.
   - **Metadados Open Graph & Twitter Card:** Injetadas tags completas nos arquivos `index.html` da Landing Page (`nuvycore.online`) e do Painel (`hotspot.nuvycore.online`).
   - **Eliminação de Imagem Legada:** Resolução definitiva da exibição residual da foto de login antiga ("SpotControl Pro") em compartilhamentos no Facebook, WhatsApp, LinkedIn e Twitter.

6. **Rebranding Oficial para "Nuvy Pro" & Higienização da Terminologia "SaaS" (CONCLUÍDO 22/08/2026):**
   - **Nome Oficial & Slogan Adotado (Opção A):** **Nuvy Pro** — *Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes*.
   - **Banco de Dados (MySQL):** Tabela `sistema_branding` atualizada (`nome_sistema = 'Nuvy Pro'`, `slogan = 'Gestão Inteligente de Wi-Fi, Marketing & Fidelização de Clientes'`, `texto_rodape = 'Tecnologia Nuvy Pro'`), sincronizando a API pública `/api/public/branding` consumida pelo frontend e landing page.
   - **Eliminação do Jargão "SaaS" nas Interfaces:**
     - `Módulo Financeiro SaaS` ➔ `Gestão da Plataforma`
     - `DRE Global SaaS` ➔ `DRE da Plataforma`
     - `Planos do SaaS` ➔ `Planos de Assinatura`
     - `Faturas & Cobranças SaaS` ➔ `Faturas & Cobranças da Plataforma`
     - `Minhas Faturas SaaS` ➔ `Minhas Faturas & Assinatura`
     - `Relatórios & BI SaaS` ➔ `Relatórios & BI Global`
   - **Propagação Completa:** Atualizados banco de dados, `brandingController.js`, `ownerAlertsService.js`, `saasBillingJob.js`, `frontend/index.html`, `manifest.json` (PWA), `BrandingContext.jsx`, `AdminLayout.jsx`, `SuperDashboard.jsx`, `SuperDre.jsx`, `SaasPlanos.jsx`, `SaasFaturas.jsx`, `RelatoriosSaas.jsx`, `Empresas.jsx`, `EmpresasAdmin.jsx`, `Login.jsx`, `Registro.jsx` e Landing Page oficial (`/var/www/nuvycore/index.html`).
   - **Status do Build:** `npm run build` gerado com 0 erros, PM2 recarregado e Nginx ativo.

8. **Otimização Visual & Consolidação de Métricas do Dashboard (CONCLUÍDO 24/08/2026):**
   - **Canais de Captura:** Consolidado e agrupado o total de leads por canal amigável (`Formulário Direto`, `Google Sign-In`, `Facebook Login`, `Captura Passiva`), eliminando linhas repetidas de origens secundárias e calculando proporções percentuais exatas.
   - **Card WhatsApp CRM:** Refinado para exibir indicador elegante (`De {Nome}` ou status de automações ativas) no lugar de texto informal cru da mensagem.
   - **Título da Tabela:** Ajustado para `Últimos Visitantes Conectados`.
   - **Ações Rápidas & NPS:** Adicionado botão de atalho `🎟️ Validar Cupom` no topo e card dinâmico de `Satisfação NPS` quando houver avaliações registradas.

9. **Modernização Completa do Módulo de Analytics & Inteligência de Tráfego (CONCLUÍDO 24/08/2026):**
   - **Design System Precision Light:** 4 KPI cards modernos com acentos coloridos, cálculo de taxa de novos vs recorrentes e total de tráfego de dados Wi-Fi em MB/GB (Download & Upload).
   - **Gráfico de Área Interativo:** Gráfico SVG de curva contínua com gradiente azul neon, gridlines e tooltips flutuantes ao passar o mouse.
   - **Mapa de Calor & Smart Insight:** Células com zoom animado no hover e caixa de recomendação automática com o dia/horário de maior pico de fluxo de clientes.
   - **Top Clientes Assíduos & Exportação:** Card de ranking dos clientes mais frequentes (visitas e tempo total) e botão `📥 Exportar CSV`.

10. **Modernização Completa do Módulo de Satisfação NPS (CONCLUÍDO 24/08/2026):**
    - **Correção da Query MySQL:** Resolvido o erro `only_full_group_by` e unificadas as collation rules com `leads`.
    - **Medidor Visual de NPS (Gauge Bar):** Barra de zona com escala colorida de -100 a +100 e indicador da zona atual (*Excelência, Qualidade, Aperfeiçoamento ou Crítica*).
    - **Cards de Distribuição:** 3 cards para Promotores (9-10), Neutros (7-8) e Detratores (0-6) com porcentagem e barras de progresso.
    - **Gráfico de Tendência & Feedbacks:** Gráfico SVG diário de respostas e tabela com estrelas, comentários e botão rápido `💬 Responder no WhatsApp` para recuperar detratores ou agradecer promotores.

1. **n8n:** ✅ Operacional (`n8n/workflow-saas-pix.json` e `workflow-ia-atendimento.json` com variáveis dinâmicas).
2. **WhatsApp / CRM:** ✅ Operacional (`whatsappNotify.js`, webhook `/api/crm/webhook` aberto).
3. **Mercado Pago (PIX + Cartão):** ✅ Operacional (payloads B2C e B2B protegidos).
4. **EFI PIX:** ❓ Não configurado (diretório `certificados/` aguardando certificados `.pem` de terceiros quando contratado).
5. **FreeRADIUS 3.0:** ✅ Operacional (sintaxe OK via `freeradius -XC`, accounting e dailycounter sincronizados).
6. **WireGuard / VPN:** ✅ Operacional (portas 51820/UDP e 51821 ativas, mapeamento Winbox 20000+X).
7. **Login Social (Google / Meta):** ✅ Operacional (`socialAuthController.js` com validação de token).
8. **SMTP / E-mail:** ⚠️ Parcial (ativo para tenant ID 1 e remetente padrão da plataforma).
9. **Multi-Vendor Drivers:** ✅ Operacional (`MikrotikDriver.js`, `OmadaDriver.js`, `UnifiDriver.js`).
10. **Webhooks Outbound Hub:** ✅ Operacional (HMAC-SHA256, eventos de leads, pagamentos e cupons).
11. **Open Graph & Social Share Preview:** ✅ Operacional (banner Nuvy Pro em 1200x630 e tags completas).
12. **Identidade Visual & Branding:** ✅ Operacional (**Nuvy Pro** — Design Precision Light).

11. **Vitrine de Planos SaaS, Assinatura 1-Clique & Auto-Desbloqueio PIX (CONCLUÍDO 25/08/2026):**
    - **Diagnóstico Resolvido:** Clientes em fim de Trial ficavam sem opção de escolher planos. Além disso, o webhook de notificação do Mercado Pago enviava `http://` gerando redirecionamento `301` no Nginx.
    - **Backend (`saasPixService.js`, `saasFaturaController.js` & `saasFaturaRoutes.js`):**
      - Endpoint `POST /api/saas-faturas/assinar-plano` provisionando faturas e PIX dinâmico Mercado Pago.
      - Leitura do `access_token` unificada na tabela `empresa_configs` (`config_type = 'mercadopago'`).
      - URL de notificação do Webhook forçada para `https://` (`https://hotspot.nuvycore.online/api/webhooks/saas-pix`).
      - Processamento do Webhook em tempo real dando baixa instantânea na fatura (`status = 'pago'`, `pago_em = NOW()`) e reativando a empresa para `status_financeiro = 'adimplente'`.
    - **Frontend (`MinhasFaturas.jsx`):**
      - Vitrine visual com os 4 Planos Oficiais (*Start R$ 97*, *Pro R$ 197*, *Enterprise R$ 397*, *Revenue Share*).
      - Live Polling a cada 4 segundos no modal PIX com auto-fechamento e comemoração de liberação imediata pós-pagamento.
      - Caixa informativa no modal destacando a liberação 100% automática pelo sistema sem necessidade de comprovante.

12. **Auditoria Geral dos 4 Pilares & Integridade de Dados (CONCLUÍDO 25/08/2026):**
    - **DRE Master (`financeiroController.js`):** Corrigido reconhecimento de `role: 'super_admin'` via helper `isSuper(req)` no JWT, permitindo visão global consolidada de faturas pagas (R$ 295,00/mês).
    - **Exclusão em Cascata (`empresaController.js`):** Implementada remoção em cascata (`admin_empresas`, `admins`, `portais`, `empresa_configs`, `mikrotiks`) ao deletar empresa, com trava de segurança contra deleção da empresa default (`slug === 'default'`) e preservação legal dos logs de auditoria Marco Civil/LGPD (`radacct`, `radcheck`).
    - **WireGuard Peer Creation (`wireguardController.js` & `Wireguard.jsx`):** Corrigido retorno do objeto do novo peer criado pelo `wg-easy`, eliminando o falso-positivo "Falha ao criar peer" e exibindo o script RouterOS imediatamente.

13. **Robô WhatsApp / CRM IA com Grounding Dinâmico de Planos (CONCLUÍDO 25/08/2026):**
    - **Backend (`crmIaController.js`):** Implementado `gerarPromptDoSistema` que consulta diretamente do MySQL:
      - Tabela `saas_planos` para atendimento Master (Start R$ 97, Pro R$ 197, Enterprise R$ 397, 7 dias grátis).
      - Tabela `planos` para estabelecimentos comerciais (pacotes de Wi-Fi vendidos no local).
      - Injeção da URL e link de cadastro oficial (`https://hotspot.nuvycore.online/cadastro`).
      - Diretrizes rígidas anti-alucinação proibindo a IA de inventar preços ou links inexistentes.

14. **Versionamento e Backup no GitHub (CONCLUÍDO 25/08/2026):**
    - Repositório oficial conectado: `git@github.com:edsonschueroff-bit/hotspot-nuvypro.git` (Branch `main`).
    - Autenticação via Deploy Key SSH e blindagem de segurança no `.gitignore` (credenciais `.env`, certificados e logs isolados).
    - Código 100% sincronizado e pronto para recuperação rápida de desastres (Disaster Recovery).

15. **Módulo de Liberação de Confiança / Promessa de Pagamento (CONCLUÍDO 25/08/2026):**
    - **Objetivo:** Permitir que clientes com faturas em atraso ou suspensas obtenham prazo extra temporário (+3 a +15 dias) para manter o Wi-Fi e painel funcionando enquanto providenciam o pagamento.
    - **Banco de Dados (MySQL):**
      - `empresas.status_financeiro` atualizado com novo enum `'liberado_confianca'`.
      - Adicionadas colunas `liberacao_confianca_ate` (DATETIME), `liberacao_confianca_qtd` (INT) e `liberacao_confianca_motivo` (VARCHAR).
      - Adicionadas colunas `liberacao_confianca_em` (DATETIME) e `liberacao_confianca_dias` (INT) em `saas_faturas`.
    - **Backend & Middleware:**
      - `tenant.js`: Permite tráfego normal caso `status_financeiro === 'liberado_confianca'` e `liberacao_confianca_ate >= NOW()`. Caso o prazo expire, rebaixa automaticamente para `'suspenso'`.
      - `saasBillingJob.js`: Suspensão automática respeita a data limite de liberação de confiança.
      - `saasFaturaController.js` & `saasFaturaRoutes.js`: Endpoints `POST /api/saas-faturas/liberacao-confianca-admin` e `POST /api/saas-faturas/solicitar-liberacao-confianca`.
      - Trava de segurança anti-abuso: Limite de 1 liberação por fatura/ciclo no auto-atendimento.
      - Disparo automático de notificação no WhatsApp do Super Admin ao acionar a liberação.
    - **Frontend & Interfaces:**
      - `AdminLayout.jsx`: Botão `🔓 Solicitar Liberação de Confiança (+3 Dias)` no modal de bloqueio e banner informativo quando ativo.
      - `MinhasFaturas.jsx`: Badge visual e card de oportunidade para ativação rápida.
      - `SaasFaturas.jsx`: Modal completo no Super Admin com seleção de dias (+3, +5, +7, +15 ou custom) e botão rápido `🔓 Liberar` na tabela.
      - `Empresas.jsx`: Opção de status `'liberado_confianca'` disponível no cadastro e gestão de empresas.

16. **Módulo Multi-Tenant SMTP / E-mail Avançado (CONCLUÍDO 26/08/2026):**
    - **Objetivo:** Permitir que cada estabelecimento/tenant configure seu próprio servidor SMTP (Hostinger, Gmail/Google Workspace, Outlook, SendGrid, Amazon SES, etc.) com remetente personalizado (`From Name`, `From Email`, `Reply-To`), teste de diagnóstico em tempo real e fallback automático para o SMTP padrão global da plataforma.
    - **Backend Service (`emailService.js`):**
      - `obterConfigEmail(empresaId)`: Consulta `empresa_configs` com `config_type = 'smtp'`. Se não configurado ou inativo, faz fallback para o SMTP global do Super Admin / `.env`.
      - `criarTransporter(empresaId, configOverride)`: Constrói transportador Nodemailer com SSL (porta 465) ou STARTTLS (porta 587).
      - `testarConexaoSmtp`: Executa `transporter.verify()` para testar credenciais e dispara e-mail de teste formatado sob demanda.
      - Injeção de `empresaId` em `enviarEmailBoasVindasWifi`, `enviarEmailMarketingBatch` e `checarEDispararEmailWifi`.
    - **Backend Endpoints (`empresaConfigController.js` & `empresaConfigRoutes.js`):**
      - Adicionado tipo `'smtp'` a `VALID_TYPES`.
      - Rota `POST /api/empresa-config/smtp/testar` com `publicApiLimiter`.
    - **Frontend & Interfaces:**
      - Componente [`ConfiguracaoSmtp.jsx`](file:///var/www/hotspot/frontend/src/components/admin/ConfiguracaoSmtp.jsx): Presets rápidos de 1-clique (Hostinger, Gmail, Outlook, SendGrid, Amazon SES), formulário com toggle de visibilidade de senha 👁️, personalização de remetente e card de teste de disparo em tempo real.
      - Aba `📧 Servidor SMTP / E-mail` adicionada em [`Configuracoes.jsx`](file:///var/www/hotspot/frontend/src/pages/admin/Configuracoes.jsx).
    - **Status do Build:** `npm run build` compilado com 0 erros (13.3s), backend hot-reloaded no PM2 e Nginx ativo.

17. **Correção de Redirecionamento & Handshake Captive Portal MikroTik (CONCLUÍDO 26/08/2026):**
    - **Diagnóstico do Erro iOS:** Ao clicar em *"Conectar à Internet"* no portal captive, o iOS CNA exibia *"A página não pode ser aberta ao iniciar a sessão no ponto de acesso porque ele não pôde se conectar ao servidor"*.
    - **Causa Raiz:** Quando o roteador MikroTik estava com o campo `end_hotspot` nulo no banco (`mikrotiks.end_hotspot IS NULL`), o backend fazia fallback utilizando o IP do próprio cliente (`ip = 10.5.50.253`), fazendo o celular enviar um POST de autenticação para seu próprio IP em vez do gateway `10.5.50.1`. Além disso, o parâmetro numérico de delay `1500` era repassado como `dstUrl`.
    - **Correções Aplicadas:**
      - **Backend (`leadController.js`, `lgpdController.js`, `socialAuthController.js`, `authTempController.js`):** Implementada resolução inteligente de gateway. Se `end_hotspot` estiver vazio, calcula automaticamente o gateway da sub-rede (`ip.replace(/\.\d+$/, '.1')` -> `10.5.50.1`), nunca retornando o IP do cliente.
      - **Banco de Dados (MySQL):** Atualizado `end_hotspot = 'http://10.5.50.1/login'` para roteadores na base.
      - **Frontend (`hotspotRedirect.js`, `CadastroLead.jsx`, `CadastroLGPD.jsx`):** Sanitizado `formatarGatewayUrl` para auto-corrigir IPs com host octet > 10 para `.1`, e sanitizado `dstUrl` para ignorar números e timeouts em ms.
18. **Auditoria QA & Correções da Fase 2 (CONCLUÍDO 26/08/2026):**
    - **Sessões Fantasmas & Janitor:** Criado [`sessionJanitorService.js`](file:///var/www/hotspot/backend/src/services/sessionJanitorService.js) e unificado o critério de sessão ativa em `dashboardController.js` e `radiusController.js` com auto-encerramento idempotente de sessões órfãs. Adicionado `Acct-Interim-Interval := 120` no `radreply`.
    - **Marco Civil / Logs de Conexão:** Corrigido conflito de collation MySQL (`COLLATE utf8mb4_unicode_ci`), filtros de 24 horas no `complianceController.js` e auto-load no `Compliance.jsx`.
    - **Padronização de Status de Pagamento:** Criado [`paymentStatus.js`](file:///var/www/hotspot/backend/src/utils/paymentStatus.js) unificando `status IN ('pago', 'approved', 'aprovado', 'CONFIRMED')` em todos os controllers (Dashboard, Filiais, Financeiro, CRM).
    - **Timezone Operacional:** Normalizado para o Horário de Brasília (`-03:00`) com `CONVERT_TZ` evitando virada prematura de dia às 21h em relatórios.
    - **Auto-Refresh & Rotas:** Adicionado polling silencioso de 15s em `Sessoes.jsx` e redirecionamento de stub em `App.jsx`.
    - **Suite de Regressão Automatizada:** 8/8 testes aprovados com 100% de sucesso (Cenários A, B, C, D, E, F, Marco Civil, Pagamentos e Multi-Tenant).

---

### 📊 Matriz Atualizada de Integrações do Sistema (Status Oficial):
1. **n8n:** ✅ Operacional (`n8n/workflow-saas-pix.json` e `workflow-ia-atendimento.json` com variáveis dinâmicas).
2. **WhatsApp / CRM:** ✅ Operacional (`whatsappNotify.js`, webhook `/api/crm/webhook` aberto).
3. **Mercado Pago (PIX + Cartão):** ✅ Operacional (payloads B2C e B2B protegidos).
4. **EFI PIX:** ❓ Não configurado (diretório `certificados/` aguardando certificados `.pem` de terceiros quando contratado).
5. **FreeRADIUS 3.0:** ✅ Operacional (sintaxe OK via `freeradius -XC`, accounting e dailycounter sincronizados).
6. **WireGuard / VPN:** ✅ Operacional (portas 51820/UDP e 51821 ativas, mapeamento Winbox 20000+X).
7. **Login Social (Google / Meta):** ✅ Operacional (`socialAuthController.js` com validação de token).
8. **SMTP / E-mail Multi-Tenant:** ✅ Operacional (servidor próprio por tenant + fallback global Hostinger).
9. **Multi-Vendor Drivers:** ✅ Operacional (`MikrotikDriver.js`, `OmadaDriver.js`, `UnifiDriver.js`).
10. **Webhooks Outbound Hub:** ✅ Operacional (HMAC-SHA256, eventos de leads, pagamentos e cupons).
11. **Open Graph & Social Share Preview:** ✅ Operacional (banner Nuvy Pro em 1200x630 e tags completas).
12. **Identidade Visual & Branding:** ✅ Operacional (**Nuvy Pro** — Design Precision Light).

---

### 🎯 PONTO DE RETOMADA FUTURA:
- **Plano Mestre de QA & Testes de Bancada/Hardware:** [`QA_AUDIT_PLAN.md`](file:///var/www/hotspot/.agents/memory/QA_AUDIT_PLAN.md) pronto para início a partir de **`MTK-01`** (Autenticação RADIUS no roteador físico).
















