# Locked Arkiv Workbench Spec

This spec is the source of truth for the next `/app` rebuild. It exists to prevent implementation bias from the previous left-rail/proof-dashboard layout.

## North Star

Arkiv should feel like a secure product workflow:

1. Create or select encrypted memory.
2. Review exactly what the agent will receive.
3. Copy for agent.
4. Inspect proof only when needed.

The UI must be understandable without knowing Braga, entities, transactions, payloads, or protocol internals.

## Required Product Model

The main workbench owns the workflow. The left memory rail is supporting navigation only.

The workbench must answer:

- What will the agent receive?
- Which memories are included?
- What should I do next?
- Is this live Braga or local rehearsal?
- Where can I inspect proof?

## Required Default States

### No Memories

- Main workbench title: `No memories yet`
- Body: `Create your first encrypted memory to make reusable context available to agents.`
- One primary CTA: `Create memory`
- No context preview blob.
- No format selector.

### Memories Exist, None Selected

- Main workbench title: `Select memories`
- Body: `Choose one or more verified memories to prepare an agent-ready context packet.`
- Main workbench must show selectable memory rows or a clear `Select memories` action.
- Left rail must not be the only place where selection is possible.
- Primary CTA must not be `Copy for agent` while disabled. The primary action is selection.

### Memory Selected

- Main workbench title: `Use verified memory in an agent`
- Show selected memory count: `1 memory selected` or `{count} memories selected`.
- Show selected-memory rows above or beside the preview.
- Show `What the agent will receive`.
- Exactly one primary CTA: `Copy for agent`.
- Secondary actions: `View sources`, `Proof details`, optional `Copy as...`.

### Copied

- Toast: `Ready to paste. Only selected memories were included.`
- Inline confirmation: `Only selected memories were included.`
- Keep `Copy for agent` available.
- `Copy proof summary` stays secondary.

### Local Rehearsal

- Banner title: `Local rehearsal`
- Banner body: `This run uses local proof data only. It does not write to Braga.`
- Proof details must say: `This proof was created locally for rehearsal. It was not written to Braga.`
- No default screen may imply Braga persistence, Braga confirmation, or explorer verification.

## Required Removals

These must not appear in the default workbench:

- `Format for`
- ChatGPT/Claude/generic logo chips above the preview
- `Proof Center`
- workflow progress cards
- raw hashes, full addresses, transaction rows, query counts
- proof as a standalone page column
- disabled `Copy for agent` as the main empty-state CTA

## Progressive Disclosure

Default UI:

- selected memories
- context preview
- copy action
- brief trust status

Proof details only:

- wallet address
- workspace record
- memory record
- network record
- encrypted content note
- read-back result
- raw proof metadata

## Visual Rules

- Maximum three visible zones: top bar, main workbench, optional memory rail/support rail.
- No more than two bordered panels in the primary workflow.
- One visually primary button per state.
- Use borders and spacing more than shadows.
- No nested cards.
- App text should use calm product language, not protocol language.
- Mobile is single-column and keeps the primary action close to the current state.

## Acceptance Checks

The rebuild is not done unless:

- The main workbench alone tells a first-time user what to do next.
- Memory selection is visible/actionable from the main workbench.
- `Format for` is absent from the default UI.
- Agent logo chips are absent above the context preview.
- Exactly one primary CTA appears in empty and selected states.
- Proof is collapsed behind `Proof details`.
- Local rehearsal copy is truthful everywhere.
- Browser desktop and mobile screenshots show no horizontal overflow or blank layout gaps.
