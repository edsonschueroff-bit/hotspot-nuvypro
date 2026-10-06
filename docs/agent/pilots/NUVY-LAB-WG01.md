# Pilot Context — Nuvy Lab WG-01

> Dry-run of the Nuvy Agent Operating Standard. This document does not authorize WireGuard, firewall, MikroTik or production-network changes.

- Project / module: Nuvy Lab / Sentinel
- Canonical current execution: https://app.notion.com/p/3efe3b658b0881579fc2ff963662cbdf
- Active plan: WG-01 → WG-06, with WG-01 current
- Repository: `edsonschueroff-bit/hotspot-nuvypro`
- Runtime guidance: `.agents/README.md` + relevant local rules/skills
- Production network changes authorized: NO
- WireGuard/Hotspot changes authorized: NO until task gate/evidence
- MikroTik configuration authorized: NO until model/RouterOS/port/topology and safety preconditions are confirmed

## Current architecture
Browser → Nuvy Lab server → dedicated LAB WireGuard → MikroTik bench → AX2/WS7001.

The operator PC is browser-only in the active architecture. The old Windows Agent/installer path is historical and must not become a prerequisite again.

## WG-01 objective
Inspect and confirm the real base, topology and contracts before WG-02. Reuse existing code and infrastructure where compatible.

## Safety invariants
- Do not reuse the existing Hotspot `wg0`/peers/routes as the LAB network.
- Preserve management/uplink and current production configuration.
- No arbitrary browser-supplied device commands.
- Explicit LAB port selection, preflight, idempotency and rollback are required.
- VPN handshake is not proof of API/device/homologation readiness.
- Hardware/network claims require real evidence.
- Failure/cleanup must be isolated per bench/port.

## Evidence needed to release WG-02
- separate LAB environment/addressing without conflict;
- exact MikroTik model + RouterOS + LAB port/topology;
- REST HTTPS trust/credential model validated;
- isolation and return path to AX2 demonstrated;
- no unintended change to existing Hotspot/WireGuard production services.

Until those exist, implementation may prepare contracts/UI/backend safely, but physical/network activation remains blocked.
