# Braga and Local Rehearsal Testing

Braga is the default testing path again. Use `/app` for live wallet-owned proof testing with MetaMask and funded Braga GLM.

Manual live Braga checklist:

1. Open `/app`.
2. Connect MetaMask to Arkiv Braga Testnet.
3. Save or acknowledge the local key.
4. Create a workspace.
5. Confirm the workspace transaction in MetaMask.
6. Save one encrypted memory.
7. Confirm the memory transaction in MetaMask.
8. Verify read-back.
9. Open Proof details and confirm the entity keys plus Braga Explorer links.
10. Copy agent context and copy the proof receipt.

Use local rehearsal only while Braga RPC, MetaMask writes, or Braga Explorer are unavailable.

Local rehearsal is not a fake Braga confirmation. It is a deterministic browser flow for testing the product loop:

1. Create memory.
2. Encrypt the memory in the browser with the local key.
3. Save Arkiv-shaped local records.
4. Read the encrypted record back.
5. Decrypt with the local key.
6. Select memory.
7. Copy for agent.
8. Copy proof receipt.

Run the full local rehearsal browser verification:

```bash
npm run verify:local
```

The command starts the local Vite app and headless Chrome when they are not already running, opens `/app?rehearsal=1`, drives every create step, checks the final context-copy flow, and writes screenshots to `/private/tmp`. It is a fallback verifier, not a live Braga write test.

Expected screenshots:

- `/private/tmp/arkiv-workbench-empty-desktop.png`
- `/private/tmp/arkiv-workbench-step-1-connect.png`
- `/private/tmp/arkiv-workbench-step-2-workspace.png`
- `/private/tmp/arkiv-workbench-step-3-memory.png`
- `/private/tmp/arkiv-workbench-step-4-verify.png`
- `/private/tmp/arkiv-workbench-step-4-ready.png`
- `/private/tmp/arkiv-workbench-selected-desktop.png`
- `/private/tmp/arkiv-workbench-selected-mobile.png`

Truth rules:

- The route must say `Local rehearsal`.
- It must say no Braga write was made.
- It must not show real Braga Explorer proof.
- It must not claim the memory was stored on Braga.
- It must still prove the user can create, read, select, and copy usable encrypted memory context.

Live Braga testing cannot be completed headlessly in this repo because the full path requires MetaMask approval and Braga GLM.
