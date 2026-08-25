# Plan: Enhancing Super Admin Dashboard (360° SaaS & Multi-Tenant Infrastructure NOC)

## Objective
Transform the Super Admin overview (`SuperDashboard.jsx`) into a comprehensive Executive Operations Center (NOC + SaaS ERP). This dashboard will serve strictly the Super Admin user without altering the individual tenant administration UI (`/admin/:slug`).

## Features to Implement

1. **Backend - Comprehensive Super Admin Statistics API (`GET /api/super-admin/overview`)**
   - **Empresas & SaaS Status Breakdown:**
     - Total registered companies.
     - Trial count & active trial list (with days remaining until expiration).
     - Paid/Adimplente count.
     - Overdue/Inadimplente count.
     - Suspended count.
   - **Infrastructure & Multi-Vendor Network Health:**
     - Total gateways broken down by vendor: MikroTik RouterOS, TP-Link Omada, Ubiquiti UniFi.
     - Global online vs offline equipment counters.
     - Global live active connected users across all tenants.
   - **Business & Engagement Metrics:**
     - MRR (Monthly Recurring Revenue).
     - Global leads captured this month across all tenants.
     - Recent overdue invoices requiring billing attention.

2. **Frontend - Redesigned Executive `SuperDashboard.jsx`**
   - **Top KPI Grid:**
     - MRR (Receita Recorrente)
     - Total Empresas Clientes (Com Badge de empresas ativas vs. trial vs. suspensas)
     - Empresas em Período de Teste (Trial Tracker com alerta visual)
     - Infraestrutura Global (Roteadores & Controllers Multi-Vendor)
     - Conexões em Tempo Real & Leads do Mês
   - **Section 1: Painel de Empresas em Período de Teste (Trial Tracker)**
     - Visual card list of companies currently trialing the product.
     - Progress bar showing remaining trial days (e.g. "Restam 4 dias").
     - Quick Action buttons: "Converter em Assinante", "Estender Teste", "Acessar Painel".
   - **Section 2: Infraestrutura de Redes & Multi-Vendor NOC**
     - Status cards for MikroTik 🔴, TP-Link Omada 🟣, and Ubiquiti UniFi 🔵.
     - Real-time connectivity status monitor.
   - **Section 3: Tabela Inteligente de Gestão Global de Clientes**
     - Filter tabs: `Todas`, `⚡ Em Teste (Trial)`, `🟢 Adimplentes`, `🔴 Suspensas / Inadimplentes`.
     - Direct "Impersonate / Acessar Painel" action for each company.
