# Copy System

## Voice

Arkiv copy should feel calm, precise, and trustworthy.

Use:

- Short sentences.
- Concrete verbs.
- Plain labels first, technical labels only in details.
- Factual trust language.
- Clear next actions.

Avoid:

- Hype.
- Blockchain theater.
- Demo language.
- Protocol-first explanations in the default UI.
- Ambiguous status labels.

## Terminology

| Concept | Default UI term | Detail UI term |
| --- | --- | --- |
| Memory Space | Workspace | Memory Space record |
| Memory entity | Memory record | Memory entity |
| Transaction | Network record | Transaction |
| Proof Center | Proof details | Proof receipt |
| Payload | Encrypted content | Encrypted payload |
| Read back | Verification check | Read-back check |
| Previous context label | Use verified memory in an agent | Agent-ready context packet |
| Local rehearsal | Local rehearsal | Local rehearsal, no Braga write |
| Local key | Local key | Local encryption key |

Core verbs:

- `Create`
- `Verify`
- `Select`
- `Copy`
- `Unlock`
- `View`

Avoid these verbs in default UI:

- `Fetch`
- `Index`
- `Hydrate`
- `Write entity`
- `Store relationship`
- `Run query`

## Header

Product name:

```txt
Arkiv Context
```

Primary CTA:

```txt
New memory
```

Connected wallet pill:

```txt
0xA1...1111
```

Rehearsal wallet pill:

```txt
Local wallet
```

## Rehearsal Banner

Title:

```txt
Local rehearsal
```

Body:

```txt
No MetaMask, Braga RPC, or Arkiv transaction will be used. Use this mode to test the flow until Braga is available.
```

Optional return link:

```txt
Use Braga when available
```

## Empty States

No memories title:

```txt
No memories yet
```

No memories body:

```txt
Create an encrypted memory, then copy it as context for any agent.
```

No memories CTA:

```txt
Create first memory
```

No selected memories title:

```txt
Select memories
```

No selected memories body:

```txt
Choose one or more verified memories to prepare an agent-ready context packet.
```

No selected memories disabled CTA:

```txt
Copy for agent
```

No readable memories title:

```txt
No readable memories
```

No readable memories body:

```txt
This wallet has memories, but none can be decrypted in this browser.
```

No readable memories CTA:

```txt
Enter local key
```

No readable memories secondary CTA:

```txt
Create new memory
```

## Locked State

Title:

```txt
Memories are encrypted
```

Body:

```txt
Use the original local key for this browser session to read them. Arkiv cannot recover this key.
```

Primary CTA:

```txt
Enter local key
```

Secondary CTA:

```txt
Create new memory
```

## Trust Strip

Verified Braga status:

```txt
Verified
```

Verified Braga detail:

```txt
Encrypted locally. Stored on Braga. Ready to copy into an agent.
```

Verified local rehearsal status:

```txt
Verified locally
```

Verified local rehearsal detail:

```txt
Encrypted and read back in this browser. No Braga write was made.
```

Unverified status:

```txt
Not verified
```

Unverified detail:

```txt
Verify the memory before copying a proof receipt.
```

Locked status:

```txt
Key needed
```

Locked detail:

```txt
This browser needs the original local key to read these memories.
```

Trust actions:

```txt
Copy proof receipt
Proof details
Verify read-back
Enter local key
```

## Create Memory Modal

Modal title:

```txt
Create memory
```

Step 1 label and title:

```txt
Connect wallet
```

Step 1 body:

```txt
Your wallet owns the memory records. Your local key decrypts the content in this browser.
```

Step 1 CTA:

```txt
Connect MetaMask
```

Local key label:

```txt
Local encryption key
```

Local key helper:

```txt
Save this key. Arkiv cannot recover it.
```

Local key copy CTA:

```txt
Copy local key
```

Step 2 label and title:

```txt
Create workspace
```

Step 2 body:

```txt
Workspaces group memories for a project, agent, or workflow.
```

Workspace input label:

```txt
Workspace name
```

Step 2 CTA:

```txt
Create workspace
```

Step 3 label:

```txt
Save memory
```

Step 3 title:

```txt
Save encrypted memory
```

Step 3 body:

```txt
The memory content is encrypted locally before it is saved.
```

Step 3 fields:

```txt
Memory title
Memory content
Tags
```

Step 3 CTA:

```txt
Save memory
```

Step 4 label:

```txt
Verify
```

Step 4 title before success:

```txt
Verify read-back
```

Step 4 body before success:

```txt
Confirm this memory can be read and decrypted before using it as context.
```

Step 4 CTA before success:

```txt
Verify read-back
```

Step 4 retry CTA:

```txt
Try again
```

Step 4 success title:

```txt
Memory is ready
```

Step 4 success body:

```txt
The memory is unlocked, verified, and selected for this context.
```

Step 4 success primary CTA:

```txt
Go to context
```

Step 4 success secondary CTA:

```txt
Copy proof receipt
```

## Context Workbench

Panel title:

```txt
Use verified memory in an agent
```

Panel subtitle:

```txt
Only selected memories enter this agent session.
```

No-selection title:

```txt
Select memories
```

No-selection body:

```txt
Choose one or more verified memories to prepare an agent-ready context packet.
```

Preview label:

```txt
What the agent will receive
```

Selected count:

```txt
1 memory selected
{count} memories selected
```

Primary CTA:

```txt
Copy for agent
```

Secondary CTA:

```txt
View sources
```

Secondary copy menu:

```txt
Copy as
```

Secondary copy options:

```txt
ChatGPT / Claude
Coding agent
Plain text
Project brief
```

Copied inline title:

```txt
Ready to paste
```

Copied inline body:

```txt
Only selected memories were included.
```

## Source Records

Disclosure CTA closed:

```txt
View sources
```

Disclosure CTA open:

```txt
Hide sources
```

Section title:

```txt
Sources
```

Source row label:

```txt
Memory record
```

## Proof Details

Disclosure CTA:

```txt
Proof details
```

Section title:

```txt
Proof receipt
```

Labels:

```txt
Status
Network
Wallet
Workspace record
Memory record
Encrypted content
Read-back check
Network record
Explorer
Copied context
Visible proof data
```

Values:

```txt
Braga Testnet
Local rehearsal
Verified read-back
Awaiting verification
Encrypted locally before storage
Local rehearsal only. No Braga transaction was created.
{spaces} workspace, {memories} memories, {readable} readable
```

Proof CTAs:

```txt
Copy proof receipt
Open in Explorer
```

## Copy Toasts

```txt
Ready to paste. Only selected memories were included.
Proof receipt copied.
Local key copied.
Wallet address copied.
Memory record copied.
Workspace record copied.
Couldn't copy. Try again.
```

## Error States

Braga unavailable title:

```txt
Braga is unavailable
```

Braga unavailable body:

```txt
You can continue in local rehearsal mode. No Braga transaction will be created.
```

Braga unavailable CTAs:

```txt
Use local rehearsal
Try Braga again
```

MetaMask unavailable title:

```txt
MetaMask not found
```

MetaMask unavailable body:

```txt
Install MetaMask or use local rehearsal mode to test the flow.
```

MetaMask unavailable CTA:

```txt
Use local rehearsal
```

Wallet rejected title:

```txt
Connection cancelled
```

Wallet rejected body:

```txt
Connect your wallet to create wallet-owned memory records.
```

Wallet rejected CTA:

```txt
Connect wallet
```

Save failed title:

```txt
Memory was not saved
```

Save failed body:

```txt
Your encrypted memory could not be saved. Try again.
```

Save failed CTA:

```txt
Try again
```

Verify failed title:

```txt
Verification failed
```

Verify failed body:

```txt
Arkiv could not confirm this memory is readable in this session.
```

Verify failed CTA:

```txt
Try again
```

Wrong local key title:

```txt
Key does not match
```

Wrong local key body:

```txt
This key cannot decrypt the selected memories. Use the original local key for this browser session.
```

Wrong local key CTA:

```txt
Enter key again
```

No selected memories title:

```txt
No memories selected
```

No selected memories body:

```txt
Select at least one readable memory before copying context.
```

## Default UI Ban List

These should not appear in the default UI:

- `Proof Center`
- `Memory Space`
- `Memory entity`
- `Space entity`
- `Transaction hash`
- `Payload`
- `Encrypted payload`
- `Query result`
- `Indexing`
- `Fetch + decrypt`
- `Read back from Arkiv`
- `Store relationship entity`
- `Relationship entity`
- `Project scope`
- `Real wallet proof`
- `Create real memory`
- `Ask with selected memories`
- `Check again`
- `Local rehearsal tx` without explanation
- `Confirmed` as a standalone status without saying what was confirmed

Allowed only inside `Proof details`:

- `Memory Space record`
- `Memory entity`
- `Transaction`
- `Encrypted payload`
- `Query result`
- Full wallet address
- Full record IDs
- Explorer URLs
