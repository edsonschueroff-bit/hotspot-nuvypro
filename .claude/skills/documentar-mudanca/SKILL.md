---
name: documentar-mudanca
description: Use quando o usuario confirmar que uma mudanca no projeto hotspot funcionou ("deu certo", "funcionou", "documenta", "pode documentar", "atualiza a doc"). Gera documentacao padronizada em docs/ + atualiza CLAUDE.md seguindo o mesmo padrao do docs/WHATSAPP-NOTIFICACOES.md.
---

# Documentar Mudanca no Projeto Hotspot

Use esta skill quando o usuario confirmar que uma mudanca grande funcionou e pedir pra documentar. Garante que toda doc siga o mesmo padrao, nao esqueca gotchas, e mantenha o CLAUDE.md sincronizado com o doc tecnico.

## Quando invocar

Trigger por intencao do usuario:

- "deu certo, pode documentar"
- "funcionou, atualiza a doc"
- "documenta isso no CLAUDE.md"
- "cria a doc dessa alteracao"
- "padroniza a documentacao"

Tambem invoque **proativamente** quando:

- O usuario confirmar que uma feature grande (3+ arquivos modificados) funcionou em teste real
- Uma migration foi rodada com sucesso e o fluxo novo foi validado
- Uma correcao de bug critico foi confirmada em producao/teste

Nao invoque pra mudancas triviais (tipo trocar texto de um botao, ajustar uma cor, renomear variavel).

## Fluxo da skill

### Passo 1: Coletar contexto

Antes de escrever a doc, entenda o que mudou:

1. Quais arquivos foram criados/modificados? (olhe git diff ou o proprio historico da conversa)
2. Qual problema a mudanca resolve? (pergunte se nao estiver claro na conversa)
3. Houve migration de banco? Schema novo?
4. Houve gotchas descobertos durante o debug? (bugs que pegaram a gente de surpresa — estes sao o coracao da doc)
5. Qual o fluxo end-to-end depois da mudanca?

**NAO delegue entendimento.** Se algo nao esta claro da conversa, pergunte ao usuario antes de escrever a doc.

### Passo 2: Decidir estrutura da doc

Dois formatos possiveis:

**Formato A - Feature grande (doc dedicado)**: cria `docs/<NOME-FEATURE>.md` com estrutura completa (ver template abaixo) + secao nova no `CLAUDE.md` apontando pra ele.

Use quando:
- Mudanca afeta >3 arquivos
- Introduz novo fluxo conceitual (notificacao, pagamento, sync, etc.)
- Tem schema novo no banco
- Tem >2 gotchas descobertos

**Formato B - Ajuste pontual (changelog em doc existente)**: adiciona entrada no `Changelog` de um doc ja existente (ex: `docs/CHECKOUT-CARTAO-MP.md`).

Use quando:
- Mudanca e' ajuste/correcao de fluxo ja documentado
- Nao tem schema novo
- Gotchas sao "extensao" de algo ja no doc

Pergunte ao usuario se voce nao tiver certeza qual formato aplicar.

### Passo 3: Escrever doc tecnico (Formato A)

Arquivo: `docs/<NOME-FEATURE-EM-CAIXA-ALTA>.md`

Template base — adapte as secoes conforme aplicavel, mas **mantenha a ordem** e **nunca pule Gotchas e Changelog**:

```markdown
# <Titulo da Feature>

> Documento tecnico do <descricao curta>.
>
> **Criado em:** YYYY-MM-DD
> **Migration relacionada:** <arquivo ou N/A>

---

## 1. Objetivo

<Paragrafo curto: o que a feature faz, pra quem, por que.>

<Lista de garantias da feature, se houver:>
- Garantia 1
- Garantia 2
- ...

---

## 2. Arquitetura

<Diagrama ASCII ou descricao do fluxo entre componentes>

### Pontos importantes da arquitetura
1. Ponto 1 (ex: async vs sync, fire-and-forget, etc.)
2. Ponto 2

---

## 3. Schema do Banco (se aplicavel)

### Migration <numero> (`backend/migrations/<arquivo>.js`)

\`\`\`sql
-- DDL completo aqui
\`\`\`

### Defaults e backfill

<Como valores default sao populados em registros existentes e novos>

---

## 4. Arquivos-chave

Lista simples, sem explicar o obvio:
- `backend/src/<arquivo>.js` - <o que faz>
- `frontend/src/pages/<arquivo>.jsx` - <o que faz>

---

## 5. Fluxo / Logica (conforme aplicavel)

<Descricao passo-a-passo, codigo relevante, tabelas de referencia>

---

## 6. Configuracao (se aplicavel)

<Como o usuario final configura — screenshots ASCII do editor/UI>

---

## 7. Endpoints (se aplicavel)

\`\`\`
GET    /api/... - <proposito>
POST   /api/... - <proposito>
\`\`\`

Bodies exemplo quando nao triviais.

---

## 8. Cenarios de Uso (se aplicavel)

Fluxos end-to-end de 1 ou 2 casos reais. Importante pro contexto.

---

## 9. Gotchas (OBRIGATORIO)

Esta e' a secao mais importante do doc. Aqui vao os bugs descobertos durante a implementacao que nao estao obvios no codigo. Cada gotcha deve ter:

1. **O que acontecia de errado**
2. **Por que** (causa raiz)
3. **Fix** aplicado
4. **Como reproduzir** se voltar a acontecer

Numerar os gotchas. Exemplo:

### Gotcha 1: <titulo curto>

<Descricao>. Ver codigo em `<arquivo>:<linha>`.

---

## 10. Troubleshooting (OBRIGATORIO)

Tabela de problemas comuns vs solucao:

| Sintoma | Causa provavel | Fix |
|---|---|---|
| ... | ... | ... |

Se houver query SQL util pra debug, incluir.

---

## 11. Onde mexer se... (OBRIGATORIO)

Tabela que direciona pro arquivo certo quando precisar mudar algo:

| Situacao | Arquivo |
|---|---|
| Adicionar X | `arquivo.js` funcao Y |
| ... | ... |

---

## 12. Limitacoes conhecidas (OBRIGATORIO)

Lista honesta do que nao foi feito ou tem problema conhecido. Evita que alguem futuro perca tempo tentando descobrir.

---

## 13. Changelog (OBRIGATORIO)

### YYYY-MM-DD
- Versao inicial
- <lista das mudancas especificas>
```

**Regras da escrita**:

- **Nunca** use "hoje" ou "ontem" em datas — sempre absolutas `YYYY-MM-DD`.
- **Nunca** use emoji fora de titulos/codigo (consistente com o resto da doc do projeto).
- **Sempre** referencie arquivos com caminho completo relativo ao root do projeto.
- **Sempre** inclua gotchas descobertos — e a parte mais valiosa do doc.
- **Nunca** invente informacao — se nao sabe algo, marca como `<TODO: confirmar com o usuario>` ou pergunta antes.

### Passo 4: Atualizar CLAUDE.md

Adicionar secao nova no `CLAUDE.md` **antes** de "Notas Importantes para IA", apontando pro doc tecnico:

```markdown
## <Nome da Feature>

> **Doc tecnico completo:** `docs/<NOME>.md`

<Paragrafo curto de 2-3 linhas explicando o que faz.>

### Arquitetura (resumo)

<Diagrama ASCII curto ou texto, max 10 linhas>

### Schema (se aplicavel)

| Tabela | Coluna | Proposito |
|---|---|---|
| ... | ... | ... |

### Arquivos-chave

- `caminho/arquivo.js` - proposito
- ...

### Gotchas gravados em sangue

1. **<titulo>** - frase curta do problema e fix
2. **<titulo>** - idem
...

---
```

**Mantenha a secao do CLAUDE.md curta** (30-60 linhas max). O detalhe completo fica no doc tecnico. O CLAUDE.md e' leitura rapida pra contexto.

### Passo 5: Confirmar com o usuario

Apos escrever o doc e atualizar o CLAUDE.md, mostra um resumo curto pro usuario:

```
Doc criado: docs/<NOME>.md
  - Objetivo, Arquitetura, Schema, Fluxo, 4 Gotchas, Troubleshooting
CLAUDE.md atualizado com nova secao (45 linhas)

Gaps notados (limitacoes conhecidas):
- gap 1
- gap 2
```

### Passo 6 (opcional): Memory update

Se a mudanca ensinou algo sobre COMO o usuario prefere trabalhar (convencao, decisao de arquitetura, algo que ele vai querer repetir), salve na memoria como `feedback` ou `project` memory.

Exemplos:
- "o usuario prefere centralizar defaults em `constants/`" → feedback
- "empresas sao auto-criadas com 5 portais padrao" → project (se nao estiver ja documentado)

Nao salve coisas que ja estao documentadas no codigo ou CLAUDE.md — seria redundante.

## Checklist antes de finalizar

- [ ] Doc tecnico em `docs/<NOME>.md` criado com as 13 secoes
- [ ] Gotchas documentados com causa, fix e reproducao
- [ ] Changelog com data absoluta YYYY-MM-DD
- [ ] CLAUDE.md atualizado com secao curta apontando pro doc
- [ ] Datas absolutas em todo lugar (nunca "hoje"/"ontem")
- [ ] Paths de arquivos relativos ao root `/var/www/hotspot`
- [ ] Limitacoes conhecidas listadas
- [ ] Resumo curto mostrado ao usuario ao final

## Exemplo de uso

**Usuario:** "funcionou, pode documentar"

**Voce:** invoca a skill, lista as mudancas (a partir do contexto da conversa), escreve `docs/<NOME>.md` seguindo o template, atualiza CLAUDE.md, e responde com o resumo.

## Referencias de padrao

Ja existem dois docs no padrao desta skill que servem de referencia viva:

- `docs/WHATSAPP-NOTIFICACOES.md` - exemplo completo de feature grande (14 secoes, 4 fluxos, 6 gotchas)
- `docs/CHECKOUT-CARTAO-MP.md` - outro exemplo com foco em gotchas e antifraude

Leia esses dois antes de criar o primeiro doc da sua sessao pra calibrar o tom, nivel de detalhe e estrutura.
