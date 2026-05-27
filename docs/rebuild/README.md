# Arkiv Rebuild Guide

This directory is the source of truth for rebuilding `/app` into a Stripe-quality product surface.

Arkiv Context helps users create wallet-owned encrypted memories, verify they can be read, and copy selected memories into any agent.

The core loop is:

```txt
Select memories -> Review what the agent receives -> Copy for agent
```

Proof is still Arkiv's differentiator, but it should support the core loop instead of competing with it. The default UI should feel calm, precise, trustworthy, and low-jargon. Full protocol detail remains available inside `Proof details`.

## Rebuild Docs

- [Product principles](./product-principles.md): product positioning, judge path, and non-negotiable UX rules.
- [Information architecture](./information-architecture.md): page structure, layout, hierarchy, and what moves behind disclosure.
- [Copy system](./copy-system.md): canonical UI strings, terminology, toasts, errors, and banned default UI terms.
- [Visual system](./visual-system.md): Stripe-like visual constraints, sizing, density, and component rules.
- [State model](./state-model.md): exact behavior for empty, locked, verified, copied, rehearsal, and error states.
- [QA checklist](./qa-checklist.md): copy, layout, browser, and test acceptance criteria.

## Acceptance Checklist

- Desktop `/app` has two primary columns: `Memories` and `Portable agent context`.
- There is no large blank area under the memories rail when the context panel is tall.
- `Portable agent context` is the dominant product surface after verification.
- Proof appears as a compact trust layer by default.
- Full proof data remains available and copyable through `Proof details`.
- Local rehearsal is truthful and never implies a Braga write or transaction.
- Copy actions show toast feedback.
- The next useful action is obvious in every state.
- Default UI avoids protocol-heavy labels from the ban list in [copy-system.md](./copy-system.md).
