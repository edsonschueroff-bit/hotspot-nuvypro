# Plano de Implementação — IA Assistente de Atendimento no WhatsApp (n8n + Hotspot)

> **Módulo:** Automação de Atendimento ao Cliente via IA & n8n  
> **Objetivo:** Responder dúvidas frequentes de clientes no WhatsApp 24h/dia usando IA (GPT-4o), buscando contexto real do banco do Hotspot (horários, promoções, cupons, Wi-Fi) e suportando transbordo para atendimento humano no CRM.

---

## 📐 Arquitetura do Fluxo

```
[Cliente WhatsApp] ──> [Evolution API Webhook] ──> [Backend Hotspot Webhook]
                                                            │
                                                            ▼
                                                [n8n Workflow AI Agent]
                                                            │
                                                  ┌─────────┴─────────┐
                                                  │ Consulta API      │
                                                  │ /api/n8n/ia-ctx   │
                                                  └─────────┬─────────┘
                                                            │
                                                            ▼
                                                 [OpenAI / LLM Node]
                                                            │
                                                ┌───────────┴───────────┐
                                                ▼                       ▼
                                       [Enviar no WhatsApp]    [Salvar no CRM Chat]
```

---

## 📋 Fases de Desenvolvimento

### Fase 1: Backend — API de Contexto & Prompt para a IA
- [x] Criar a rota `GET /api/n8n/ia-contexto` (para consumo seguro do n8n).
- [x] Buscar dados dinâmicos da empresa: nome, horários, cupons ativos (`cupons`), planos de acesso Wi-Fi (`planos`) e configurações da IA.
- [x] Endpoint e suporte para transbordo de atendimento humano no CRM quando solicitado pelo visitante.

### Fase 2: Painel Admin — Configurações da IA Assistente
- [x] Criar aba "🤖 IA Assistente (GPT-4o)" em `/admin/:empresaSlug/whatsapp`.
- [x] Campos para o lojista:
  - Toggle: *Ativar IA Assistente no WhatsApp (Sim/Não)*.
  - Seleção do Modo de Funcionamento (*Sempre Ativo*, *Fora do Horário*, *Com Delay*).
  - Configuração de Transbordo Humano (WhatsApp do Atendente/Gerente + Mensagem de Transferência).
  - Gerenciador Dinâmico de FAQs (adicionar/remover perguntas e respostas oficiais).

### Fase 3: Workflow no n8n (`workflow-ia-atendimento.json`)
- [x] Configurar o gatilho Webhook de entrada de mensagens na Evolution API.
- [x] Adicionar nó HTTP Request para puxar o contexto da API `/api/n8n/ia-contexto`.
- [x] Adicionar nó AI Agent (OpenAI GPT-4o-mini) com System Prompt dinâmico.
- [x] Adicionar nó de decisão para checar pedido de Transbordo Humano.
- [x] Publicar e ativar o workflow no servidor n8n com 100% das execuções com status `success`.

### Fase 4: Validação & Testes
- [x] Testar busca de contexto dinâmico da empresa (FAQs, Wi-Fi, Cupons).
- [x] Testar solicitações de Transbordo Humano.
- [x] Validar gravação e alerta de mensagens no Chat do CRM.

---

## 🛠️ Entregáveis
1. Rota `/api/n8n/ia-contexto` no Backend Node.js.
2. Tela de Configuração da IA no Frontend React.
3. Arquivo JSON do Workflow para importação direta no n8n (`n8n/workflow-ia-atendimento.json`).
