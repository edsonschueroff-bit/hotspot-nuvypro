# Snippet pra inserir no CLAUDE.md

> Use esse formato pra adicionar a secao de referencia no CLAUDE.md, antes de "Notas Importantes para IA".
>
> **Regra**: secao no CLAUDE.md deve ser CURTA (30-60 linhas). Detalhe completo fica no doc tecnico. O CLAUDE.md e' leitura rapida de contexto.

```markdown
## <Nome da Feature>

> **Doc tecnico completo:** `docs/<NOME>.md`

<Paragrafo de 2-3 linhas explicando o que a feature faz.>

### Arquitetura (resumo)

```
<diagrama ASCII curto - max 8 linhas>
```

### Schema (se aplicavel)

| Tabela | Coluna | Proposito |
|---|---|---|
| `tabela_x` | `col_y` | <proposito 1 linha> |

### Arquivos-chave

- `backend/src/<arquivo>.js` - <proposito em 1 linha>
- `frontend/src/<arquivo>.jsx` - <proposito em 1 linha>

### Gotchas gravados em sangue

1. **<Titulo curto>** - frase curta do problema e fix.
2. **<Titulo curto>** - idem.
3. **<Titulo curto>** - idem.

(Max 6 gotchas no CLAUDE.md. Se tiver mais, lista os 6 mais criticos aqui e manda o leitor pro doc tecnico pros demais.)

---
```

## Depois de inserir, valide:

1. A secao nova esta ANTES de `## Notas Importantes para IA` (ultima secao do arquivo).
2. Tem separador `---` depois da nova secao.
3. Nao quebra o indice visual das outras secoes (tem linha em branco antes/depois).
4. Os arquivos-chave listados tem caminho relativo ao root `/var/www/hotspot`.
5. O link pro doc tecnico esta correto (`docs/NOME.md`).
