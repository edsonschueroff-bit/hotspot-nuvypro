# NuvyCore Agent Entry — Hotspot / Nuvy Lab

This repository already contains a mature Antigravity toolkit in `.agents/`. Preserve and extend it; do not replace it with a copied central toolkit.

## Startup
1. For Nuvy Lab work, read the canonical Notion page **Nuvy Lab — Execução Atual** first:
   https://app.notion.com/p/3efe3b658b0881579fc2ff963662cbdf
2. Read `.agents/README.md`.
3. Read only the relevant files in `.agents/rules/`, `.agents/skills/` and `.agents/workflows/`.
4. Resolve the active task/acceptance criteria before editing.
5. Use one task = one branch/worktree.
6. Close with executable evidence, not only a build result.

## Precedence
1. Explicit operator approval/restriction.
2. Active canonical Notion task/current-execution page.
3. This file and Nuvy hard safety rules.
4. `.agents/` repository-local rules/skills.
5. Historical docs and legacy agent material.

## Existing duplicate agent frameworks
Both `.agents/` and `.agent/` exist. Treat `.agents/` as the current runtime candidate, but do not delete, move or bulk-merge `.agent/` until a dedicated migration audit proves equivalence.

## CLAUDE.md
The large root `CLAUDE.md` is valuable legacy architecture/context. Do not rewrite or delete it in one step. Current active Notion instructions override stale historical sections when they conflict.

## Hard safety
Never expose secrets, weaken tenant isolation, run unbounded retries, apply arbitrary browser-supplied device commands, or assume VPN handshake means a device/API is safe or homologated.

Production network, WireGuard, MikroTik, PM2/service, database, DNS, messaging, payment or other side effects require the active task's permission and explicit approval when specified.

For Nuvy Lab, preserve management/uplink and production networks; hardware/network actions must be typed, bounded, auditable, reversible where applicable, and isolated to the authorized LAB scope.
