# Care Passport

Care Passport helps people keep private care notes, see who has access, and share only what they choose.

Product promise: `Care Passport keeps private care notes encrypted locally, stored on Arkiv, reviewed before sharing, and revocable at any time.`

Submission status:

- Deployed app URL: https://arkiv-vert.vercel.app/app
- GitHub repo: https://github.com/sudharshanx/arkiv
- Challenge form: https://forms.arkiv.network/ethns-arkiv-challenge
- Official rules: https://github.com/Arkiv-Network/arkiv-ethns-builder-challenge
- License: MIT
- Team: Sudharshan; add additional team members before submission if needed.

## Demo Walkthrough

Use this exact flow in the launch demo:

`Connect wallet -> Create a private reflection -> Review selected notes -> Choose audience -> Share -> Copy care packet -> Revoke access`

1. Open `/app`.
2. Connect the wallet.
3. Create a private reflection.
4. Review selected notes.
5. Choose audience: AI agent context or therapist raw data.
6. Show who has access.
7. Create access grant with recipient wallet, notes, and duration.
8. Copy care packet.
9. Open `Proof details` only if proof is needed.
10. Revoke access.

Suggested 2-3 minute structure:

- 0:00-0:20: Problem and product promise.
- 0:20-0:40: Connect wallet and create the first reflection.
- 0:40-1:20: Review selected notes and show who has access.
- 1:20-2:00: Create access grant and copy care packet.
- 2:00-2:30: Open proof details and revoke access.

## What Care Passport Is

- A wallet-owned encrypted diary that stays with the user.
- A private memory surface for personal use, AI-agent-assisted review, and direct therapist sharing.
- A proof-first Arkiv app with encrypted writes and readable receipts.

## What It Is Not

- Not a chatbot.
- Not a medical record system.
- Not a generic note-taking app.
- Not a hidden protocol demo.

## Core UX Contract

The interface should answer these questions in order:

1. Am I connected?
2. What private notes do I have?
3. What use case am I serving?
4. Who can access them?
5. What am I sharing right now?
6. How do I stop access?

## Product Screens

### Home

- Brand: `Care Passport`
- Main actions: `Create reflection`, `Share access`
- Copy should explain the product without protocol jargon.
- Use cases should be visible: encrypted diaries, AI-agent context sharing, and therapist raw-data sharing.

### Create Reflection

- Title: `Create a private reflection`
- Main action: `Save encrypted reflection`
- Secondary action: `Review access`

### Share Access

- Title: `Choose who can see this.`
- Main action: `Create access grant`
- Secondary action: `Review dashboard`
- Final audience choice:
  - `AI agent context`
  - `Therapist raw data`

### Dashboard

- Title: `Access dashboard`
- Must show selected notes, who has access, the care packet preview, and proof details.
- Primary export action: `Copy care packet`

### Proof Details

- Collapsed by default.
- Shows wallet, project scope, entity keys, transaction links, and encryption boundary.

## Arkiv Data Model

Every entity and query uses:

```ts
PROJECT_ATTRIBUTE = {
  key: "project",
  value: "arkiv-agent-notes-ethns-2026",
}
```

### `vault`

UI label: `Diary Space`

- `project = arkiv-agent-notes-ethns-2026`
- `entityType = vault`
- `schemaVersion = 1`
- `owner = <wallet address>`
- `status = active`
- `createdAt = <number>`
- `updatedAt = <number>`

Payload:

- AES-GCM encrypted JSON containing the Diary Space title and description.

Expiration:

- 90 days on Braga.

### `encrypted_note`

UI label: `Reflection Entry`

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

- AES-GCM encrypted JSON containing the reflection title, body, private tags, care fields, and private-lock state.

Expiration:

- 30 days on Braga.

### `access_grant`

UI label: `Access Grant`

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

- AES-GCM encrypted JSON containing the grant purpose and selected reflection entry keys.

Expiration:

- Matches the selected grant window.

### `memory_link`

UI label: `Reflection Relationship`

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

## Privacy Model

Arkiv is public. This app encrypts payload content only.

Wallet and passphrase have separate jobs:

- Wallet: owns the Arkiv entity and controls update/delete permissions.
- Passphrase: derives the AES-GCM key with PBKDF2-SHA256 and decrypts the encrypted payload locally in the browser.

Passphrase lifecycle:

- Create or enter the Care Passport passphrase before saving a private reflection.
- The browser derives the encryption key locally; the raw passphrase is not written to Arkiv.
- Saving encrypts the private JSON payload before Arkiv storage.
- Loading records fetches encrypted envelopes first, then decrypts readable entries locally after the passphrase is entered.
- If the passphrase is lost, private reflection text cannot be recovered. Arkiv can still prove the record exists, but it cannot decrypt the ciphertext.

Encrypted:

- Diary Space title and description
- Reflection Entry title
- Reflection Entry body
- Private tags
- Access Grant purpose and selected reflection entry keys
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

## Setup

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

Routes:

- `/` homepage
- `/app` live Braga app
- `/app?rehearsal=1` local rehearsal path for Braga outages

## AI And Care Tool Integration

Care Passport does not require an AI API. It produces two export shapes: a selected context packet for AI agents and raw selected data for therapists.

Example agent-side flow:

```ts
const carePacket = `PASTE COPIED CARE PASSPORT CARE PACKET HERE`;

const systemMessage = `
Use the selected Care Passport context packet as user-provided context.
Treat it as private session context only.
Do not claim access to Reflection Entries that are not included below.

${carePacket}
`;
```

The user chooses which decrypted Reflection Entries to include in the access grant, then picks the audience at the end. AI agents receive only the selected context packet; therapists receive the raw selected data export. Neither gets the whole wallet, raw Arkiv ciphertext, or unselected entries.

## Known Limitations

- No AI API or care provider integration is bundled; the app exports selected packets for AI agents and raw selected data for therapists.
- No local sample mode is shipped in the production app path.
- The local rehearsal route is only for outage testing; rehearsal is local/no Braga and does not create Arkiv entities or real Braga proof.
- Passphrase recovery is not implemented.
- Attributes are public by design.
- Braga is a testnet, so expirations are short and data should not be treated as permanent.
- Updates are modeled as new writes for the MVP.

## Team

- Sudharshan
