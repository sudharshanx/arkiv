# QA Checklist

## Automated Copy Tests

Assert the default workspace includes:

- `Arkiv Context`
- `Memories`
- `Use verified memory in an agent`
- `Only selected memories enter this agent session.`
- `Copy for agent`
- `Proof details`

Assert the default workspace does not include these outside expanded proof details:

- `Proof Center`
- `Memory Space`
- `Memory entity`
- `Payload`
- `Query result`
- `Fetch + decrypt`
- `Read back from Arkiv`
- `Check again`
- `Create real memory`
- `Real wallet proof`
- `Ask with selected memories`

Assert rehearsal mode includes:

- `Local rehearsal`
- `Verified locally`
- `No Braga write`
- `No MetaMask, Braga RPC, or Arkiv transaction will be used.`

Assert rehearsal mode does not imply:

- `Stored on Braga`
- A real Braga transaction.
- Real Explorer verification.

Assert create flow copy:

- Step 1 uses `Connect wallet`.
- Step 2 uses `Create workspace`.
- Step 3 uses `Save memory`.
- Step 4 uses `Verify read-back`.
- Step 4 success includes `Memory is ready`.
- Step 4 success includes `Go to context`.
- Step 4 does not use `Check again` after success.

Assert copy toasts:

- `Ready to paste. Only selected memories were included.`
- `Proof receipt copied.`
- `Local key copied.`
- `Couldn't copy. Try again.`

Assert proof details still expose:

- `Proof receipt`
- `Workspace record`
- `Memory record`
- `Network`
- `Encrypted content`
- `Copy proof receipt`

## Browser Verification

Check these routes:

- Desktop `/app`.
- Desktop `/app?rehearsal=1`.
- Mobile `/app`.
- Mobile `/app?rehearsal=1`.

For each route, verify:

- No horizontal overflow.
- No clipped CTAs.
- No stale banned copy.
- Context copy path is visible within 5 seconds.
- Proof details are accessible without dominating the page.

## Layout Checks

Desktop:

- The workspace has only two primary columns: `Memories` and `Use verified memory in an agent`.
- The memories rail and context workbench align at the top.
- There is no large blank area under the memories rail.
- Proof is not rendered as a standalone lower-left panel.
- The context workbench owns source records and proof details.

Mobile:

- Context workbench appears before memories.
- `Copy for agent` remains near the preview.
- Proof details are collapsed by default.
- Memory rows are compact and selectable.
- Trust strip wraps cleanly.

## Functional Checks

- Selecting a memory updates the selected count.
- Clearing selection removes `Copy for agent`.
- Copying for agent shows a toast.
- Copying proof receipt shows a toast.
- Copying local key shows a toast.
- Local rehearsal can complete without MetaMask or Braga RPC.
- Local rehearsal proof receipt clearly says no Braga transaction was created.
- Real Braga mode keeps Explorer links in proof details.

## Build Checks

Run:

```bash
npm test
npm run typecheck
npm run build
```

If browser verification changes screenshots or demo assets, regenerate only the current app captures. Do not recreate Remotion demo videos; they are intentionally removed.
