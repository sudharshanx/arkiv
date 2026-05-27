# Care Passport

**AI + Privacy hybrid for private care continuity.**

Care Passport helps people change therapists without starting over by preparing a wallet-owned, therapist-ready care packet they control.

Product promise: user-controlled care context that is owned by the wallet, decrypted locally, verified before use, and shared only through an explicit Access Grant.

Submission status:

- Deployed app URL: https://arkiv-vert.vercel.app/app
- GitHub repo: https://github.com/sudharshanx/arkiv
- Challenge form: https://forms.arkiv.network/ethns-arkiv-challenge
- Official rules: https://github.com/Arkiv-Network/arkiv-ethns-builder-challenge
- License: MIT
- Team: Sudharshan; add additional team members before submission if needed.

Challenge deadline:

- Submit by May 25, 2026 at 23:59 UTC.
- Late submissions are not accepted; the submission form timestamp is the official record.

## One-line pitch

Care Passport is the consent layer for care continuity: encrypted Reflection Entries users own, verify, review, and allow into a therapist-ready packet only when they choose.

## Judge walkthrough

1. Open the homepage and explain the hook: **Change therapists without starting over.**
2. Open `/app` and point to the user loop: **Choose -> Review -> Share -> Expire** across the Write, Grant, and Workbench tabs.
3. Write a wallet-owned Reflection Entry by connecting MetaMask on Braga, saving the local key, creating a Diary Space, and saving one encrypted entry.
4. Review the Access Grant by selecting readable Reflection Entries, confirming the therapist wallet, purpose, duration, and private/not included boundary.
5. Copy the Continuity Brief and verified receipt for the AI or care handoff.

Suggested 2-3 minute video structure:

- 0:00-0:20: Problem and product pitch.
- 0:20-0:45: Product loop: Choose -> Review -> Share -> Expire.
- 0:45-1:35: Write: MetaMask ownership, local encryption key, Diary Space, and encrypted Reflection Entry write.
- 1:35-2:10: Grant: selected entries, Access Grant review, recipient wallet, expiry, revocation state, and Braga Explorer links.
- 2:10-2:45: Workbench: therapist-ready packet, private/not included boundary, Continuity Brief, and copied verified receipt.

## Challenge fit

Theme: **AI + Privacy hybrid**

- AI: selected Reflection Entries become a Continuity Brief for ChatGPT, Claude, coding agents, or any future care assistant.
- Privacy: Diary Space details, Reflection Entry content, private tags, and Access Grant notes are encrypted before storage.
- Arkiv-native: Care Passport uses separate entity types, queryable attributes, entity relationships, wallet-owned writes, and differentiated expirations.

The published rubric weights are:

- Arkiv integration depth: 40%
- Functionality: 30%
- Design & UX: 20%
- Code quality & docs: 10%

## Judge checklist

- Unique `PROJECT_ATTRIBUTE` on every entity and every query.
- Queries use Arkiv protocol owner filtering plus the public `owner` attribute.
- Four entity types: `vault`, `encrypted_note`, `access_grant`, `memory_link`.
- Connected to Arkiv Braga testnet.
- Wallet-gated writes.
- Encrypted payloads with browser Web Crypto.
- Public attributes kept coarse and non-sensitive.
- Explicit Access Grant review before Continuity Brief export.
- Private-locked Reflection Entries stay out of the packet by default.
- No traditional database.
- The production app path uses wallet-owned records, not local sample data.
- Rehearsal is local/no Braga and must not be presented as live proof.

## Arkiv data model

Every entity and every query uses:

```ts
PROJECT_ATTRIBUTE = {
  key: "project",
  value: "arkiv-agent-notes-ethns-2026",
}
```

### `vault`

UI label: **Diary Space**

Attributes:

- `project = arkiv-agent-notes-ethns-2026`
- `entityType = vault`
- `schemaVersion = 1`
- `owner = <wallet address>`
- `status = active`
- `createdAt = <number>`
- `updatedAt = <number>`

Payload:

- AES-GCM encrypted JSON containing Diary Space title and description.

Expiration:

- 90 days on Braga.

### `encrypted_note`

UI label: **Reflection Entry**

Attributes:

- `project = arkiv-agent-notes-ethns-2026`
- `entityType = encrypted_note`
- `schemaVersion = 1`
- `vaultKey = <vault entity key>`
- `owner = <wallet address>`
- `status = active`
- `contentClass = life_event | emotion_pattern | trigger | coping_pattern | therapy_goal | relationship_context | personal_preference`
- `createdAt = <number>`
- `updatedAt = <number>`

Payload:

- AES-GCM encrypted JSON containing Reflection Entry title, body, private tags, care fields, and private-lock state.

Expiration:

- 30 days on Braga.

### `access_grant`

UI label: **Access Grant**

Attributes:

- `project = arkiv-agent-notes-ethns-2026`
- `entityType = access_grant`
- `schemaVersion = 1`
- `owner = <wallet address>`
- `vaultKey = <vault entity key>`
- `therapistWallet = <wallet address>`
- `scope = selected_packet | temporary_full_view`
- `status = active | revoked | expired`
- `createdAt = <number>`
- `expiresAt = <number>`

Payload:

- AES-GCM encrypted JSON containing the grant purpose and selected Reflection Entry keys.

Expiration:

- Matches the selected grant window.

### `memory_link`

UI label: **Reflection Relationship**

Attributes:

- `project = arkiv-agent-notes-ethns-2026`
- `entityType = memory_link`
- `schemaVersion = 1`
- `vaultKey = <vault entity key>`
- `sourceNoteKey = <note entity key>`
- `targetNoteKey = <note entity key>`
- `relationshipType = related_to | source_for | follow_up | contradicts`
- `owner = <wallet address>`
- `createdAt = <number>`

Payload:

- Optional AES-GCM encrypted JSON note about the relationship.

Expiration:

- 30 days on Braga.

## Privacy model

Arkiv is public. This app encrypts payload content only.

Wallet and passphrase have separate jobs:

- Wallet: owns the Arkiv entity and controls update/delete permissions.
- Passphrase: decrypts the encrypted payload locally in the browser.

Encrypted:

- Diary Space title and description
- Reflection Entry title
- Reflection Entry body
- Private tags
- Access Grant purpose and selected Reflection Entry keys
- Optional relationship note

Public query attributes:

- Entity type
- Owner address
- Diary Space key
- Access Grant key, therapist wallet, scope, status, and expiry
- Relationship keys and relationship type
- Coarse Reflection Entry type / content class
- Timestamps

Do not put secrets in Arkiv attributes. Attributes are intentionally visible so Arkiv can query them.

## Local development

Requirements:

- Node.js 22+
- MetaMask or another EIP-1193 browser wallet
- Braga GLM from the faucet for the wallet-owned proof path

Install and run:

```bash
npm install
npm run dev
```

Feedback loops:

```bash
npm run test
npm run typecheck
npm run build
npm run verify:local
```

Live Braga testing:

- Use `/app` for the current wallet-owned proof path.
- Confirm MetaMask is connected to Arkiv Braga Testnet and the wallet has Braga GLM from the faucet.
- Write -> Grant -> Workbench: save local key -> create Diary Space -> save encrypted Reflection Entry -> verify read-back -> review Access Grant -> copy Continuity Brief -> inspect verified receipt.
- Confirm the Diary Space, Reflection Entry, and Access Grant receipts include entity keys and Braga Explorer transaction links.
- `npm run verify:local` remains the no-wallet rehearsal check for outages; it opens `/app?rehearsal=1` and must not be treated as real Braga proof.

Routes:

- `/` homepage
- `/app` live Braga Diary Space and default testing route.
- `/app?rehearsal=1` local rehearsal path for Braga outages. It uses a synthetic wallet, local Arkiv-shaped records, and synthetic transaction IDs so the Choose -> Review -> Share -> Expire flow can be checked without MetaMask, Braga RPC, or Explorer links. Rehearsal is local/no Braga.

## How AI and care tools integrate

Care Passport does not require an AI API. It produces a Continuity Brief that any AI or care tool can consume.

Example agent-side flow:

```ts
const continuityBrief = `PASTE COPIED CARE PASSPORT CONTINUITY BRIEF HERE`;

const systemMessage = `
Use the selected Care Passport Continuity Brief as user-provided context.
Treat it as private session context only.
Do not claim access to Reflection Entries that are not included below.

${continuityBrief}
`;
```

In the live app, the user chooses which decrypted Reflection Entries to include in the Access Grant, then copies the **Continuity Brief**. The AI receives only that copied brief, not the whole wallet, not raw Arkiv ciphertext, and not unselected entries.

Braga links:

- Faucet: https://braga.hoodi.arkiv.network/faucet/
- Explorer: https://explorer.braga.hoodi.arkiv.network/
- RPC: https://braga.hoodi.arkiv.network/rpc

## Known limitations

- No AI API or care provider integration is bundled; the app exports a Continuity Brief for external tools.
- No local sample mode is shipped in the production app path.
- The local rehearsal route is only for outage testing; rehearsal is local/no Braga and does not create Arkiv entities or real Braga proof.
- Passphrase recovery is not implemented.
- Attributes are public by design.
- Braga is a testnet, so expirations are short and data should not be treated as permanent.
- Updates are modeled as new writes for the MVP.

## Team

- Sudharshan
