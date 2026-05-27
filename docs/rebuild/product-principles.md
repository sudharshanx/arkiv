# Product Principles

## Product Positioning

A vault stores data. Arkiv proves who owns the memory, who can read it, and when it is allowed into an agent.

Arkiv Context is the user-consent layer for AI memory. It is not a blockchain explorer, graph demo, or prompt demo. It is a serious product surface for private, portable AI memory that is verified before use.

## Main User Promise

Private AI memory that users own, verify, and allow into any agent only when they choose.

## Core Product Loop

```txt
Select memories -> Review what the agent receives -> Copy for agent
```

Everything in the interface should serve that loop.

## Judge Path

1. Create an encrypted memory.
2. Verify the memory can be read back.
3. Select the memory.
4. Copy for agent.
5. Open proof details only when verification evidence is needed.

The first 90 seconds should show wallet ownership, local encryption, verification, and user-approved agent access without requiring narration.

## UX Rules

- Do not make the protocol the product surface.
- Make the next action obvious in every state.
- Proof validates the action; it does not compete with the action.
- Default UI should explain value before infrastructure.
- Keep raw IDs, network records, payload language, and query counts behind `Proof details`.
- Use one primary green CTA per state.
- Keep copy short, factual, and calm.
- Local rehearsal must never imply a real Braga write, transaction, or Explorer verification.

## Scope Boundaries

- Keep the current React/Vite app.
- Keep the current green, white, and charcoal identity.
- Do not reintroduce sample or demo mode in `/app`.
- Do not add a backend or AI provider dependency.
- Keep Braga Explorer links for real network mode, but move them into proof details.
