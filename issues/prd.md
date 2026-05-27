# PRD: Arkiv Agent Notes as a Wallet-Owned AI Memory Passport

## 1. Product Summary

Arkiv Agent Notes is a wallet-owned memory layer for AI agents. Users create encrypted memories, store them as Arkiv entities, verify ownership through Braga Explorer, and export selected memories as portable context for any AI agent.

The product should feel like a serious utility, not a demo. The first version should prove one clear loop:

**Create wallet-owned memory -> Verify it on Arkiv -> Use it as portable agent context**

## 2. Product Positioning

### One-Line Product Promise

**AI memory you own. Encrypted locally. Stored on Arkiv. Used only when you choose.**

### Expanded Pitch

Arkiv Agent Notes lets users create private AI memories that are encrypted in the browser and stored as wallet-owned Arkiv records. Users can unlock memories locally, select exactly what an agent is allowed to use, and copy portable context into ChatGPT, Claude, Cursor, or any other AI tool.

### What This Is

- A private memory vault for AI agents.
- A wallet-owned data layer for portable context.
- A proof-first Arkiv application showing real entity writes, encrypted payloads, and explorer-verifiable records.

### What This Is Not

- Not a chatbot.
- Not a note-taking app.
- Not a local demo.
- Not a generic prompt builder.
- Not a backend database app.

## 3. Product Goals

- Make the vision obvious in the first 10 seconds.
- Show a complete real Arkiv workflow with wallet-owned writes.
- Make privacy and ownership legible to non-technical judges.
- Make context export feel like the product payoff.
- Keep implementation simple and robust for hackathon submission.

## 4. Target User

Primary user: AI builders and power users who want portable memory across agents.

Secondary user: hackathon judges evaluating Arkiv integration depth, functionality, UX, and code quality.

## 5. Core User Flow

### Step 1: Create

User creates a **Memory Space**, then saves an **Encrypted Memory**.

User intent:

> I want to save something my AI tools should remember, but I want to own and control it.

### Step 2: Prove

After wallet confirmation, the app shows a **Proof Receipt**.

User intent:

> I want to verify this was really written to Arkiv and owned by my wallet.

### Step 3: Use

User selects unlocked memories and copies a context packet.

User intent:

> I want to choose what an AI agent can use in this session.

## 6. Judge Demo Script

The judge should be able to verify ownership, storage, encryption boundary, and context export without reading code.

1. Open `/app`.
2. Confirm the product promise is visible: `AI memory you own. Encrypted locally. Stored on Arkiv. Used only when you choose.`
3. Click `Create wallet-owned memory`.
4. Connect MetaMask on Arkiv Braga Testnet.
5. Generate or enter a local key.
6. Create a Memory Space.
7. Confirm the app shows a Memory Space entity key and Braga Explorer transaction link.
8. Save one encrypted memory.
9. Confirm the app shows a Memory entity key and Braga Explorer transaction link.
10. Click `Load and unlock`.
11. Select the memory.
12. Copy `agent context`.
13. Open Proof Center and copy proof.

## 7. First-Run UX

### Remove

Remove all local demo/sample mode from `/app`.

Remove copy like:

- `Preview local demo`
- `Demo preview`
- `local example records`
- `demo memories`
- `sample sources`

### First Screen Layout

Single centered product panel.

Header:

- Left: `Arkiv Agent Notes`
- Right: no duplicate CTA when first-run panel is visible.

Panel label:

`WALLET-OWNED AI MEMORY`

Title:

`Create your first wallet-owned memory`

Body:

`Encrypt a memory in this browser, store it on Arkiv, then choose when to use it as portable context for any AI agent.`

Detail:

`No server database. Your wallet owns the record. The proof includes entity keys and Braga Explorer links.`

Primary CTA:

`Create wallet-owned memory`

Secondary CTA:

None in the first-run setup card.

Rationale:

- The left `How it works` rail is already visible.
- Avoid a redundant button that competes with the primary wallet action.
- Do not open sample data.

## 8. How It Works Rail

Display near first-run panel or inside the setup card.

Three compact steps:

1. **Create**  
   `Write a private memory and encrypt it locally.`

2. **Prove**  
   `Store it as a wallet-owned Arkiv entity and verify it on Braga Explorer.`

3. **Use**  
   `Select memories and copy context into any AI agent.`

UI style:

- Three horizontal tiles on desktop.
- Stacked tiles on mobile.
- Use icons, not large marketing cards.
- Keep text short.

## 9. Main App UX After Wallet Data Exists

### Layout

Three primary surfaces:

1. **Memory Space / Memory Picker**
2. **Portable Agent Context**
3. **Proof Center**

The page should communicate:

- what memories exist,
- which memories are selected,
- what context will be exported,
- what proof exists on Arkiv.

## 10. Memory Picker

### Section Title

`Wallet-owned memories`

### Subtitle

`Select the memories this agent session is allowed to use.`

### Controls

- Search input: `Search memories`
- Type filter dropdown:
  - `All types`
  - `Instruction`
  - `Preference`
  - `Fact`
  - `Scratchpad`

### Memory Row Content

Each memory row should show:

- Title
- Short body preview
- Entity key
- Type chip
- Tag chips
- Readable/locked state
- Updated timestamp

### Tag Privacy

Tag chips display decrypted tags only after the local key unlocks the memory. Locked rows should show the public content class or memory type, not private tag text.

### No Production Examples

- Do not create or display `Example Memory Space`.
- Use placeholders only.
- All displayed memories must come from the connected wallet or the current successful write session.

### Empty State

Title:

`No wallet-owned memories yet`

Body:

`Create a Memory Space and save your first encrypted memory to start building portable agent context.`

CTA:

`Create wallet-owned memory`

### Locked State

This appears when the connected wallet has encrypted memories, but the active local key cannot decrypt them.

Default UX:

- Show one recovery card, not a long list of encrypted Memory Spaces.
- Hide encrypted record metadata behind a disclosure.
- Use a warning tone, not the green success tone.

Banner copy:

`Found 1 encrypted memory in 12 wallet-owned spaces, but this local key cannot decrypt them. Enter the original key or create a new memory.`

Card title:

`Encrypted memories found`

Body:

`This wallet has encrypted memories, but the current local key cannot read them.`

Recovery card copy:

`These records belong to this wallet, but this local key cannot decrypt their private content. Enter the original local key used when they were created, or start a new memory with a new key.`

Detail:

`1 encrypted memory found in 12 wallet-owned spaces. Enter the original local key, or create a new memory with a new key.`

Primary CTA:

`Enter original key`

Secondary CTA:

`Create new memory`

Disclosure:

`Show encrypted records`

Inside the disclosure show only compact metadata:

- wallet-owned space count,
- selected Memory Space entity key,
- loaded memory count,
- status: `Still encrypted`.

Do not repeat `Encrypted Memory Space` as the main visible content for every locked row.

## 11. Portable Agent Context Panel

### Rename

Current `Ask with selected memories` should become:

Title:

`Portable agent context`

Subtitle:

`Only selected memories are included in this session.`

### Replace Draft Answer

Current `Draft answer` should become:

`Context packet preview`

### Export Mode Selector

Add a dropdown or segmented control.

Label:

`Format for`

Options:

- `Generic agent`
- `ChatGPT / Claude`
- `Cursor / coding agent`
- `Project brief`

### Behavior

The selected format changes only the wrapper text around the selected memories. It does not change stored Arkiv data.

### Copy Button

Primary CTA:

`Copy agent context`

### Consent Tray

Show above or near the copy button:

`3 selected for this session`

If none selected:

`Select at least one memory to create context.`

### Source Toggle

Rename:

- From: `Show saved sources`
- To: `Show source records`

Tooltip:

`Source records show which wallet-owned memories were included in the copied context.`

## 12. Context Copy Templates

### Generic Agent

```text
Use these user-owned memories as context for this session only.

Selected memories:
- [type] Title: Body

Source records:
- Entity: <entityKey>
```

### ChatGPT / Claude

```text
For this conversation, use the following user-owned memories as context. Do not treat them as permanent memory unless I explicitly ask.

Memories:
- [type] Title: Body
```

### Cursor / Coding Agent

```text
Project/user context for this coding session:

- [type] Title: Body

Apply this context when making implementation decisions. Do not persist it outside this session.
```

### Project Brief

```text
Project memory brief:

Relevant context:
- [type] Title: Body

Use this as background context for planning, writing, or review.
```

## 13. Proof Center

### Purpose

Proof Center makes Arkiv integration obvious and judge-verifiable without forcing users to inspect the modal.

### Placement

Show after at least one successful Memory Space or Memory write.

Also show a compact verification summary inside or directly above the portable context panel after successful load/unlock, so judges see proof before scrolling.

Compact summary copy:

`Verified on Arkiv`

`1 readable memory unlocked from 11 wallet-owned spaces.`

`Encrypted content was decrypted in this browser with the active local key.`

Compact summary actions:

- `Space tx`
- `Memory tx`
- `Copy proof`

### Title

`Proof Center`

### Subtitle

`Verify that this memory exists as a wallet-owned Arkiv record.`

### Fields

- `Wallet`
- `Project scope`
- `Memory Space entity`
- `Memory entity`
- `Encrypted payload`
- `Memory Space transaction`
- `Memory transaction`

Proof Center should show separate proof rows for the two Arkiv writes:

- Memory Space transaction
- Memory transaction

Each proof row should include:

- Entity key
- Transaction hash
- Braga Explorer link
- Status: `pending`, `confirmed`, or `failed`

### Copy

Encrypted payload row:

`Private memory content is encrypted locally before storage.`

Project scope row:

`project = arkiv-agent-notes-ethns-2026`

CTA:

- `View on Braga Explorer`
- `Copy proof`

### Local Key Guidance

Proof Center must explain where the encryption/decryption key is managed.

Local key row:

- Label: `Local key`
- If no key is active: `Enter or generate it in Step 1 before saving or unlocking memories.`
- If key is active: `Active for this browser session. Change it in Step 1 if needed.`
- Action: `Add key` or `Manage key`
- Action behavior: opens the proof wizard at Step 1.

Tooltip:

`This key encrypts new memories and decrypts loaded memories. It stays in this browser and is not your wallet password. Save it somewhere safe; losing it means encrypted content cannot be read.`

### Copy Proof Output

```text
Arkiv Agent Notes proof

App:
https://arkiv-vert.vercel.app/app

Wallet:
<wallet>

Project scope:
project = arkiv-agent-notes-ethns-2026

Memory Space:
<entityKey>

Memory Space transaction:
<explorerUrl>

Memory:
<entityKey>

Memory transaction:
<explorerUrl>

Privacy boundary:
Memory content is encrypted locally. Arkiv stores encrypted payloads and public query attributes.
```

## 14. Proof Wizard UX

### Modal Title

`Create wallet-owned memory`

### Step Labels

1. `Connect`  
   Subtitle: `Wallet + local key`

2. `Create space`  
   Subtitle: `Memory Space`

3. `Save memory`  
   Subtitle: `Encrypted Memory`

4. `Read back`  
   Subtitle: `Fetch + decrypt`

### Step 1 Copy

Title:

`Connect wallet and set local key`

Body:

`Save this local key before you continue. It encrypts new memories and is the only way to decrypt them later.`

Backup warning:

`Do not lose this key.`

`The wallet proves ownership, but this local key controls readable memory content. Arkiv cannot recover it for you.`

Backup controls:

- `Copy key`
- `Generate new key`
- `Use my own key`
- Checkbox: `I saved this key or already know it.`

Continue is disabled until wallet is connected, a local key exists, and the user confirms the key is saved or known.

Primary CTA:

`Connect MetaMask`

Continue CTA:

`Continue`

### Step 2 Copy

Title:

`Name your Memory Space`

Field:

`Memory Space name`

Placeholder:

`Product research notes`

Field:

`What is this space for?`

Placeholder:

`Context this agent should remember for future work.`

CTA:

`Create Memory Space`

Wallet waiting CTA:

`Confirm in MetaMask`

### Step 3 Copy

Title:

`Save encrypted memory`

Fields:

- `Title`
- `Memory type`
- `Memory`
- `Tags`

Placeholders:

- Title: `Prefer concise technical answers`
- Memory: `When helping with this project, explain tradeoffs clearly and keep implementation steps small.`
- Tags: `product, coding`

Memory type options:

- `Instruction`
- `Preference`
- `Fact`
- `Scratchpad`

CTA:

`Save encrypted memory`

Wallet waiting CTA:

`Confirm in MetaMask`

### Step 4 Copy

Title:

`Read back from Arkiv`

Body:

`Fetch the saved record from Arkiv and decrypt it with your local key.`

Helper:

`This is not another write. It proves the Memory exists on Arkiv and that this browser can read the private content.`

CTA:

`Fetch and decrypt`

Success title:

`Verified`

Success body:

`Your Memory Space and Memory were loaded from Arkiv and unlocked in this browser.`

Success CTAs:

- `Use this memory`
- `Copy proof`

Post-success header CTA:

`New memory`

### Transaction States

- Wrong network: `Switch to Arkiv Braga Testnet to continue.`
- Waiting for wallet: `Open MetaMask and review the Braga transaction.`
- Submitted: `Transaction submitted. Waiting for Braga confirmation.`
- Confirmed: `Confirmed on Braga. Explorer proof is ready.`
- Rejected: `Transaction rejected in MetaMask. You can retry.`
- Failed: `Braga did not confirm this transaction. Retry or check the explorer.`

## 15. Wallet Controls

### Header Wallet State

When connected, show:

`0x1234...abcd`

Dropdown or adjacent buttons:

- `Switch wallet`
- `Disconnect`

### Switch Wallet Behavior

- Calls wallet connect flow again.
- Updates active wallet address.
- Clears selected memories.
- Reloads wallet-owned Memory Spaces if possible.

### Disconnect Behavior

- Clears app-local wallet state.
- Clears active memories, selected memories, feedback, and proof state.
- Does not claim to revoke MetaMask permissions.

Disconnect helper copy:

`Disconnect clears this app session. Manage site permissions in MetaMask.`

## 16. Privacy Boundary Mini-Card

### Placement

In Proof Center or near context export.

Title:

`Privacy boundary`

Two columns:

`Encrypted locally`

- Memory title
- Memory body
- Private tags
- Relationship notes

`Public query attributes`

- Entity type
- Owner wallet
- Project scope
- Timestamps
- Memory type
- Relationship keys

Purpose:

This makes the privacy model legible without a long explanation.

## 17. Relationship Feature

Keep optional. Rename from:

`Advanced: add a relationship`

To:

`Connect memories`

Subtitle:

`Optional: link two memories so future agents can understand context relationships.`

Keep behind details/accordion. Do not make it primary.

## 18. Copy Changes Summary

Replace:

- `Create real memory` -> `Create wallet-owned memory`
- `Ask with selected memories` -> `Portable agent context`
- `Draft answer` -> `Context packet preview`
- `Copy context` -> `Copy agent context`
- `Show saved sources` -> `Show source records`
- `Real wallet proof` -> `Proof Center`
- `Demo preview` -> remove
- `Preview local demo` -> remove
- `main demo` -> `main workspace`

## 19. Acceptance Criteria

- First-run `/app` has no local demo/sample copy.
- First-run `/app` does not create or display `Example Memory Space`.
- User sees one clear primary CTA: `Create wallet-owned memory`.
- User can understand the product loop from the UI: create, prove, use.
- User can create Memory Space and Encrypted Memory.
- User can verify both Memory Space and Memory writes with proof receipts and explorer links.
- User can select memories and copy agent-ready context.
- User can change export format with a simple selector.
- User can copy proof details.
- User can switch or disconnect wallet.
- Product does not include a chatbot or AI API.
- Transaction states are clear for wrong network, waiting wallet, submitted, confirmed, rejected, and failed.
- Tests, typecheck, build, and desktop/mobile browser QA pass.

## 20. Implementation Notes

- Keep the current architecture; this is mostly UI/copy/state refinement.
- Remove or hide sample mode from the production app path.
- Reuse existing proof receipt and context export logic.
- Add small state for context export format.
- Add wallet disconnect/switch handlers.
- Avoid large visual redesign; prioritize clarity and product language.
