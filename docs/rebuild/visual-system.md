# Visual System

## Direction

The app should feel like a Stripe-grade SaaS product:

- Quiet.
- Dense.
- Trustworthy.
- Precise.
- Built for repeated use.

It should not feel like a hackathon proof page, blockchain dashboard, or protocol debugger.

## Palette

Use:

- Near-white page background.
- White panels.
- Charcoal text.
- Muted gray secondary text.
- One restrained Arkiv green accent.
- Soft success green surfaces only for verified or copied states.
- Warm warning surface only for rehearsal or unavailable network states.

Avoid:

- Neon greens.
- Heavy gradients.
- Purple-blue AI themes.
- Large colored banners.
- Decorative background shapes.

## Typography

Use the existing font stack unless the app already has a better local standard.

Guidelines:

- App header: compact, not heroic.
- Panel titles: `15px` to `17px`, semibold.
- Body copy: `14px` to `16px`, line height `1.45` to `1.65`.
- Meta labels: `11px` to `12px`, uppercase only when sparse.
- IDs and hashes: mono or tabular figures, hidden by default.
- Do not use oversized bold labels inside app panels.

## Layout Metrics

Desktop page:

- Max width: `1180px` to `1240px`.
- Outer padding: `16px` to `24px`.
- Workspace grid: `minmax(300px, 360px) minmax(0, 1fr)`.
- Grid gap: `16px`.
- No second grid row for proof or progress.

Panels:

- Border radius: `8px`.
- Border: `1px solid` subtle neutral.
- Shadow: none or very subtle.
- Internal padding: `16px` to `20px`.
- Avoid cards inside cards.

## Component Rules

Primary buttons:

- Use green.
- One primary button per state.
- Use only for the next useful action.

Secondary buttons:

- Use white or subtle outline.
- Use for details, sources, proof, and retry actions.

Trust strip:

- Compact.
- Inline with context panel.
- Shows verification and privacy facts.
- Does not become a full card stack.

What the agent will receive:

- The most important content area after selection.
- Stable min height around `280px`.
- Readable text with enough line height.
- Should not be visually interrupted by proof metadata.

Memories rail:

- Compact rows.
- Clear selected state.
- Search and filter stay quiet.
- List scrolls internally when long.

## Anti-Patterns

Do not ship:

- A standalone `Proof Center` column or card under the memories rail.
- Large empty vertical gaps caused by CSS grid rows.
- A visible proof-chain diagram in the main workspace.
- Repeated green badges competing with CTAs.
- Long hashes in the default UI.
- Protocol copy in headers.
- A primary screen that requires technical narration to understand.
