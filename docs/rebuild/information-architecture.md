# Information Architecture

## Product Frame

Visible product name:

```txt
Arkiv Context
```

Primary workspace:

```txt
Memories + Use verified memory in an agent
```

Proof is not a top-level workspace region. Proof appears as a compact trust layer inside the context workbench, with full receipt data behind `Proof details`.

## Desktop Structure

```txt
Header
Status or rehearsal banner

Workspace
  Memories rail
    Header
    Search
    Filter
    Memory rows
    Selection footer

  Context workbench
    Header
    Format selector
    Trust strip
    What the agent will receive
    Copy tray
    Sources disclosure
    Proof details disclosure
```

## Layout Requirements

- Page max width: `1180px` to `1240px`.
- Workspace grid: `minmax(300px, 360px) minmax(0, 1fr)`.
- Gap: `16px`.
- Align both columns at the top.
- Do not use a second grid row for proof or workflow progress.
- The memories rail may be sticky with `top: 92px`.
- The right context workbench owns the vertical flow.

## Memories Rail

The memories rail should include:

- Panel title: `Memories`.
- Readable memory count.
- Search input.
- Type filter.
- Selectable memory rows.
- Selected count.
- `Clear` action when any memory is selected.

Sizing:

- Min height: `520px`.
- Memory list can scroll internally using a max height near `calc(100dvh - 260px)`.
- Keep memory rows compact and scannable.

## Context Workbench

The context workbench should include:

- Panel title: `Portable agent context`.
- Panel title when memory is selected: `Use verified memory in an agent`.
- Subtitle: `Only selected memories enter this agent session.`
- Format selector.
- Trust strip.
- Preview: `What the agent will receive`.
- Primary CTA: `Copy for agent`.
- Secondary source action: `View sources`.
- Proof disclosure: `Proof details`.

The agent receipt preview should be readable and consent-oriented. It should not be visually dominated by source records, raw IDs, or proof metadata.

## Trust Strip

The trust strip lives near the top of the context workbench.

It summarizes:

- Verification state.
- Wallet state.
- Encryption state.
- Braga or local rehearsal state.
- `Copy proof receipt`.
- `Proof details`.

It should be compact. It should not look like a protocol console.

## Move Behind Disclosure

Hide these by default:

- Full wallet address.
- Memory Space record ID.
- Memory entity ID.
- Project scope.
- Transaction hashes.
- Explorer URLs.
- Encrypted payload explanation.
- Query counts.
- Local rehearsal synthetic IDs.
- Relationship creation.

## Remove Or Demote From Default UI

- Standalone `Proof Center`.
- Persistent workflow progress panel.
- Visible proof-chain diagram.
- Optional relationship creation.
- Raw proof receipt card outside the context workbench.

## Mobile Structure

Mobile order:

1. Context workbench.
2. Memories.
3. Proof details, only when expanded.

Mobile requirements:

- Keep `Copy for agent` near what the agent will receive.
- Keep proof details collapsed by default.
- Trust strip can wrap into two rows or a vertical status list.
- Memory rows become compact selectable list items.
