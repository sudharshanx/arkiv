# PRD: Care Passport

## 1. Product Summary

Care Passport is a wallet-owned encrypted diary and sharing tool. Users create encrypted private reflections, keep them with them forever, and optionally share selected context with AI agents or raw selected data with therapists.

One-line promise:

**Care Passport helps people keep private care notes encrypted forever, take them with them, and share only what they choose.**

What it is:

- A private care notes dashboard.
- A wallet-owned access control layer for personal diaries, AI-agent review, and therapist handoff.
- A proof-first Arkiv app with encrypted writes and readable receipts.

What it is not:

- Not a chatbot.
- Not a medical record system.
- Not a generic note app.
- Not a hidden technical demo.

## 2. Core User Flow

The product must read as one simple story:

`Connect wallet -> Create a private reflection -> Review selected notes -> Choose audience -> Share -> Copy care packet -> Revoke access`

Step 1: Connect wallet

- The first visible action is `Connect wallet`.
- The user should immediately see whether the wallet is connected.
- If disconnected, the UI must not hide wallet connection behind a small top-right control.

Step 2: Create a private reflection

- The user writes a reflection and encrypts it locally.
- The title `Create a private reflection` must stay readable on one line on desktop.
- The app must explain that the note is private until shared.

Step 3: Review selected notes

- The user sees which notes are selected.
- Private-locked notes stay out by default.
- The preview should show what the share packet contains, not raw network detail.

Step 4: See who has access

- The dashboard must answer this question directly.
- Show recipient wallet, audience, expiry, and revoke action in one visible section.
- If no access exists yet, show `No one has access yet`.

Step 5: Choose audience

- The sharing flow must be plain language:
  - whether the audience is an AI agent or a therapist
  - which notes are included
  - how long access lasts
- The user should not have to understand protocol vocabulary to complete it.

Step 6: Copy care packet

- The exported packet is the payoff.
- Keep `Copy care packet` as the primary export action.
- `Proof details` remains available but secondary.

Step 7: Revoke access

- The same dashboard must expose revocation.
- Revocation should be visible as a normal product action, not a buried proof-only behavior.

## 3. Screen Contract

### Home

- Brand: `Care Passport`
- Primary message: encrypted diaries, AI-agent sharing, therapist sharing, and revocation
- Main actions: `Create reflection`, `Share access`
- Use cases should be visible:
  - encrypted diaries kept forever
  - AI-agent context sharing
  - raw selected data for therapists
- Copy should explain the product without protocol jargon.

### Create Reflection

- Title: `Create a private reflection`
- Inputs: local key, note type, title, body, tags, private lock
- Primary CTA: `Save encrypted reflection`
- Secondary CTA: `Review access`

### Share Access

- Title: `Choose who can see this.`
- Inputs: recipient wallet, purpose, audience, expiry, selected notes
- Primary CTA: `Create access grant`
- Secondary CTA: `Review dashboard`
- Audience choices:
  - `AI agent context`
  - `Therapist raw data`

### Dashboard

- Title: `Access dashboard`
- Must include:
  - selected notes
  - what gets shared
  - who has access
  - proof details
- Primary CTA: `Copy care packet`

### Proof Details

- Collapsed by default.
- Shows wallet, project scope, entity keys, tx links, and encryption boundary.
- Exists for judges and debugging, not as the main UI.

## 4. Data And Access Model

The Arkiv model stays intact:

- `vault` -> Diary Space
- `encrypted_note` -> Reflection Entry
- `access_grant` -> Access Grant
- `memory_link` -> Reflection Relationship

Privacy rules:

- Wallet owns the Arkiv entity.
- Passphrase decrypts payloads locally in the browser.
- Public attributes must stay coarse.
- Private content is encrypted before storage.
- Access grant payloads include purpose and selected note keys.

## 5. Launch Acceptance Criteria

The UI is acceptable for launch only if:

- Wallet connection is visible immediately.
- The user can explain the flow in under 30 seconds.
- The app has a visible `Who has access` answer.
- The landing page shows the three supported use cases.
- The product uses one plain-language path, not three separate internal tools.
- `Proof details` is secondary and collapsed by default.
- The dashboard shows selected notes, sharing state, and revoke action.
- Desktop and mobile layouts do not overflow.
- The PRD, README, tests, and app copy all use the same product language.

## 6. Demo Script

1. Open `/app`.
2. Connect the wallet.
3. Create a private reflection.
4. Return to the dashboard and review selected notes.
5. Show who has access.
6. Choose audience: AI agent context or therapist raw data.
7. Create access grant with recipient wallet, notes, and duration.
8. Copy care packet.
9. Open `Proof details` only if proof is needed.
10. Revoke access.
