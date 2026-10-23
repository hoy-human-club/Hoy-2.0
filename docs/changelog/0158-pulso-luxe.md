# 0158 — Pulso Luxe: the welcome, the class intention and the member card

date: 2026-10-24
version: 0.25.0
prompt: docs/prompts/0158-pulso-luxe.md

- Trigger: "make it more unique and posh". Mocked as row D on the design canvas (welcome, Ligereza class page, member card), then built.
- Decision:
  - Principle: restraint. Paper, ink and hairlines; one tone per screen; the editorial serif set like an invitation (light weight, italics, old-style figures); labels in widely tracked small capitals. Theme tokens only, so dark follows.
  - E-01: the welcome is an invitation — an italic date, "Hola, *Juliana*." in light serif, the lead line, one ink action with a sun hairline and the tour link — then the seven classes as an index (tone dot, name, italic tagline) instead of seven colour tiles.
  - C-03: "Sobre la clase" opens with the class's own intention from the brand book (`tenant/brand.ts`, joined through the modality slug), large italic, then its method and intensity note and the four keys.
  - C-28 (new) `/app/card`: the member card — new molecule `MemberCard` (D-02): deep ink, fine sun-yellow double edge, grain and breathing rings, the cream wordmark, the name and "Desde {month year}" from the account's created_at. Under it the classes left and expiry (useEntitlements), the goal streak (practiceStats; hidden without a goal) and the next class. Reached from C-25 More.
- Rejected: a member number (the data model has none); "Guardar en el teléfono" (a wallet pass needs a pass-signing integration); class glyphs (need a designer; the canvas wave is a placeholder); the tone tiles on E-01 (0157) — replaced by the index; gendered greetings ("Bienvenida").
- Checks: contrast ≥ 4.5:1 / 3:1 large on E-01, C-03 and C-28 in light and dark; times on one line; no horizontal overflow at 390 px. Hub map gains C-28 (group account).
- Files: src/components/molecule/MemberCard/{MemberCard.tsx,MemberCard.css,MemberCard.meta.ts}, src/modules/customer/pages/{MemberCardPage,blocks,ClassDetailPage,MorePage}.tsx, src/modules/customer/{pulso.css,strings.ts,specs.ts,index.ts,pages.ts}, src/hub/hubMap.data.ts, generated public/hub-map.json, public/actions.json, src/app/captureDates.ts, src/data/mediaCatalog.generated.json, docs/kanban.md.
