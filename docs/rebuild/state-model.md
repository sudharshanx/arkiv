# State Model

Use this file to decide visible copy, actions, and proof visibility for each product state.

## No Memories

Visible title:

```txt
No memories yet
```

Body:

```txt
Create an encrypted memory, then copy it as context for any agent.
```

Primary CTA:

```txt
Create first memory
```

Proof visibility:

- Hidden.

Copy enabled:

- No.

## No Selection

Visible title:

```txt
Select memories
```

Body:

```txt
Choose one or more verified memories to prepare an agent-ready context packet.
```

Primary CTA:

```txt
Copy for agent
```

CTA state:

- Disabled.

Proof visibility:

- Trust strip can show current verification state.
- Full proof remains collapsed.

Copy enabled:

- No.

## Connected But Locked

Visible title:

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

Trust strip status:

```txt
Key needed
```

Trust strip detail:

```txt
This browser needs the original local key to read these memories.
```

Proof visibility:

- Collapsed.

Copy enabled:

- No.

## Verified Braga

Trust strip status:

```txt
Verified
```

Trust strip detail:

```txt
Encrypted locally. Stored on Braga. Ready to copy into an agent.
```

Visible wallet label:

```txt
Wallet
```

Actions:

```txt
Copy for agent
Copy proof receipt
Proof details
```

Proof visibility:

- Compact trust strip visible.
- Full receipt collapsed behind `Proof details`.

Copy enabled:

- Yes, when at least one readable memory is selected.

## Verified Local Rehearsal

Trust strip status:

```txt
Verified locally
```

Trust strip detail:

```txt
Encrypted and read back in this browser. No Braga write was made.
```

Visible wallet label:

```txt
Local wallet
```

Actions:

```txt
Copy for agent
Copy proof receipt
Proof details
```

Proof visibility:

- Compact trust strip visible.
- Full receipt collapsed behind `Proof details`.

Copy enabled:

- Yes, when at least one readable memory is selected.

Hard rule:

- Do not show `Stored on Braga`.
- Do not show real Explorer verification.
- Do not imply a Braga transaction was created.

## Unverified

Trust strip status:

```txt
Not verified
```

Trust strip detail:

```txt
Verify the memory before copying a proof receipt.
```

Primary CTA:

```txt
Verify read-back
```

Proof visibility:

- Trust strip visible.
- Full receipt unavailable or marked `Awaiting verification`.

Copy enabled:

- Copy for agent can be hidden until readable memories are selected.
- Proof receipt should be disabled until verification succeeds.

## Copy Success

Inline title:

```txt
Context copied
```

Inline body:

```txt
Includes only selected readable memories.
```

Toast:

```txt
Ready to paste. Only selected memories were included.
```

Secondary action:

```txt
Copy proof receipt
```

Proof visibility:

- Trust strip visible.
- Full receipt collapsed unless user opens it.

## Braga Unavailable

Title:

```txt
Braga is unavailable
```

Body:

```txt
You can continue in local rehearsal mode. No Braga transaction will be created.
```

Primary CTA:

```txt
Use local rehearsal
```

Secondary CTA:

```txt
Try Braga again
```

Proof visibility:

- Hidden until a local rehearsal or Braga verification exists.

## MetaMask Unavailable

Title:

```txt
MetaMask not found
```

Body:

```txt
Install MetaMask or use local rehearsal mode to test the flow.
```

Primary CTA:

```txt
Use local rehearsal
```

Proof visibility:

- Hidden until a local rehearsal or Braga verification exists.

## Wrong Local Key

Title:

```txt
Key does not match
```

Body:

```txt
This key cannot decrypt the selected memories. Use the original local key for this browser session.
```

Primary CTA:

```txt
Enter key again
```

Proof visibility:

- Collapsed.

Copy enabled:

- No.
