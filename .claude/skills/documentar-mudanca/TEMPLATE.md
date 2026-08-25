# <Titulo da Feature>

> Documento tecnico do <descricao curta em uma linha>.
>
> **Criado em:** YYYY-MM-DD
> **Migration relacionada:** `backend/migrations/<arquivo>.js` ou N/A

---

## 1. Objetivo

<Paragrafo curto: o que a feature faz, pra quem, por que.>

<Lista de garantias da feature, se houver:>
- Garantia 1
- Garantia 2

---

## 2. Arquitetura

```
<diagrama ASCII do fluxo entre componentes>
```

### Pontos importantes da arquitetura

1. <ponto 1: async vs sync, fire-and-forget, onde o erro nao bloqueia, etc.>
2. <ponto 2>

---

## 3. Schema do Banco

### Migration <numero> (`backend/migrations/<arquivo>.js`)

```sql
-- DDL completo aqui
ALTER TABLE x ADD COLUMN y ...;
CREATE TABLE z (...);
```

### Defaults e backfill

<Como valores default sao populados em registros existentes e novos. Importante: citar onde fica o constants/defaults se houver.>

---

## 4. Arquivos-chave

- `backend/src/<caminho>.js` - <o que faz>
- `backend/src/<caminho>.js` - <o que faz>
- `frontend/src/pages/<arquivo>.jsx` - <o que faz>

---

## 5. Logica / Fluxo

<Descricao passo-a-passo do fluxo end-to-end. Use listas numeradas pra cada passo. Cite arquivos:linhas quando relevante.>

### Sub-topicos se necessario

<Exemplo: tabela de variaveis suportadas, tabela de casos testados, matriz de comportamento por combinacao de flags.>

---

## 6. Configuracao (se houver UI de config)

<Screenshot ASCII do editor/toggle/formulario. Explica o que cada campo faz.>

---

## 7. Endpoints (se houver)

```
GET    /api/...   # proposito
POST   /api/...   # proposito
```

### Bodies exemplo (quando nao triviais)

```json
{
  "campo": "valor"
}
```

---

## 8. Cenarios de Uso

### 8.1. <Cenario 1 - ex: Portal Planos com Cadastro + Cartao>

```
1. Cliente faz X
2. Sistema Y
3. ...
```

### 8.2. <Cenario 2>

...

---

## 9. Gotchas

### Gotcha 1: <titulo curto>

<O que acontecia de errado>. <Por que>. <Fix aplicado>. <Como reproduzir se voltar>.

Ver codigo em `<arquivo>:<linha>`.

### Gotcha 2: <titulo>

...

---

## 10. Troubleshooting

| Sintoma | Causa provavel | Fix |
|---|---|---|
| <problema 1> | <causa> | <acao> |
| <problema 2> | <causa> | <acao> |

### Queries uteis pra debug

```sql
-- <descricao>
SELECT ... FROM ... WHERE ...;
```

---

## 11. Onde mexer se...

| Situacao | Arquivo |
|---|---|
| Adicionar X | `arquivo.js` funcao Y |
| Mudar comportamento Z | `outro.js` linha N |

---

## 12. Limitacoes Conhecidas

1. <limitacao 1> - <por que nao foi feito / como mitigar>
2. <limitacao 2>
3. <etc>

---

## 13. Changelog

### YYYY-MM-DD
- Versao inicial
- <lista das mudancas especificas feitas nesta alteracao>
